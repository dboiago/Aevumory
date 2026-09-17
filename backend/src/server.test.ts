/**
 * API-level tests for the Phase 1 Household/Participant/Admin endpoints.
 *
 * Uses Fastify's inject() against a temporary SQLite database, so these
 * exercise real routing + service wiring without opening a network port.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { randomBytes } from 'crypto';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { unlinkSync } from 'fs';
import type { FastifyInstance } from 'fastify';
import { createServer } from './server.js';
import { runMigrations } from './persistence/migrate.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function extractCookie(setCookieHeader: string | string[] | undefined): string {
  const raw = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  if (!raw) throw new Error('Expected a set-cookie header');
  return raw.split(';')[0];
}

describe('Household/Participant/Admin API', () => {
  let dbPath: string;
  let db: Database.Database;
  let app: FastifyInstance;

  beforeEach(async () => {
    dbPath = join(tmpdir(), `aevumory-api-test-${randomBytes(4).toString('hex')}.db`);
    db = new Database(dbPath);
    const migrationsDir = join(__dirname, '../migrations');
    runMigrations(db, migrationsDir);
    app = await createServer(db, { logger: false });
  });

  afterEach(async () => {
    await app.close();
    db.close();
    try {
      unlinkSync(dbPath);
    } catch {
      // Ignore errors
    }
  });

  it('reports the application as uninitialized (no admin PIN) before setup', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/household' });
    expect(response.statusCode).toBe(200);
    expect(response.json().admin_pin_set).toBe(false);
  });

  it('allows ordinary household/participant reads without admin auth', async () => {
    const household = await app.inject({ method: 'GET', url: '/api/household' });
    expect(household.statusCode).toBe(200);

    const participants = await app.inject({ method: 'GET', url: '/api/participants' });
    expect(participants.statusCode).toBe(200);
    expect(participants.json()).toEqual([]);
  });

  it('rejects participant creation without an admin session', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/participants',
      payload: { display_name: 'Alex' },
    });
    expect(response.statusCode).toBe(401);
  });

  it('rejects admin session login before a PIN has been configured', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/session',
      payload: { pin: '1234' },
    });
    expect(response.statusCode).toBe(409);
  });

  it('sets up the admin PIN once and authorizes the current session immediately', async () => {
    const setup = await app.inject({
      method: 'POST',
      url: '/api/admin/pin/setup',
      payload: { pin: '1234' },
    });
    expect(setup.statusCode).toBe(200);
    const cookie = extractCookie(setup.headers['set-cookie']);

    const secondSetup = await app.inject({
      method: 'POST',
      url: '/api/admin/pin/setup',
      payload: { pin: '5678' },
    });
    expect(secondSetup.statusCode).toBe(409);

    const create = await app.inject({
      method: 'POST',
      url: '/api/participants',
      headers: { cookie },
      payload: { display_name: 'Alex' },
    });
    expect(create.statusCode).toBe(201);
    expect(create.json().display_name).toBe('Alex');
  });

  it('supports create, update, and retrieval of participants once authorized', async () => {
    const setup = await app.inject({
      method: 'POST',
      url: '/api/admin/pin/setup',
      payload: { pin: '1234' },
    });
    const cookie = extractCookie(setup.headers['set-cookie']);

    const create = await app.inject({
      method: 'POST',
      url: '/api/participants',
      headers: { cookie },
      payload: { display_name: 'Alex' },
    });
    const participantId = create.json().participant_id as string;

    const update = await app.inject({
      method: 'PATCH',
      url: `/api/participants/${participantId}`,
      headers: { cookie },
      payload: { display_name: 'Alexandra' },
    });
    expect(update.statusCode).toBe(200);
    expect(update.json().display_name).toBe('Alexandra');

    const list = await app.inject({ method: 'GET', url: '/api/participants' });
    expect(list.json()).toHaveLength(1);
    expect(list.json()[0].display_name).toBe('Alexandra');
  });

  it('re-authorizes admin actions via /api/admin/session using the configured PIN', async () => {
    await app.inject({ method: 'POST', url: '/api/admin/pin/setup', payload: { pin: '1234' } });

    const wrongPin = await app.inject({
      method: 'POST',
      url: '/api/admin/session',
      payload: { pin: '0000' },
    });
    expect(wrongPin.statusCode).toBe(401);

    const session = await app.inject({
      method: 'POST',
      url: '/api/admin/session',
      payload: { pin: '1234' },
    });
    expect(session.statusCode).toBe(200);
    const cookie = extractCookie(session.headers['set-cookie']);

    const create = await app.inject({
      method: 'POST',
      url: '/api/participants',
      headers: { cookie },
      payload: { display_name: 'Sam' },
    });
    expect(create.statusCode).toBe(201);
  });

  it('keeps working for existing Phase 0 temporal endpoints', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/temporal/sources' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
  });
});
