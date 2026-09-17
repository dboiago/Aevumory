/**
 * API-level tests for the Phase 2 Task/TaskCycle endpoints.
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

const taskPayload = {
  title: 'Water plants',
  primary_discipline: 'order',
  source_type: 'core',
  created_by_user_id: 'participant-1',
  assignment: { scope: 'individual', assigned_user_id: 'participant-1', owner_id: 'participant-1' },
  schedule: {
    cadence_type: 'interval',
    series_anchor_date: '2026-01-05',
    interval_days: 7,
    delay_policy: 'none',
    has_strict_window: false,
  },
  duration_tier: 'quick',
  effort_type: 'physical',
  cognitive_load: 'low',
};

describe('Task/TaskCycle API', () => {
  let dbPath: string;
  let db: Database.Database;
  let app: FastifyInstance;

  beforeEach(async () => {
    dbPath = join(tmpdir(), `aevumory-task-api-test-${randomBytes(4).toString('hex')}.db`);
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

  async function authorize(): Promise<string> {
    const setup = await app.inject({
      method: 'POST',
      url: '/api/admin/pin/setup',
      payload: { pin: '1234' },
    });
    return extractCookie(setup.headers['set-cookie']);
  }

  it('allows unauthenticated task reads', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/tasks' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
  });

  it('rejects task creation without an admin session', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/tasks', payload: taskPayload });
    expect(response.statusCode).toBe(401);
  });

  it('creates, reads, updates, and deletes a task once authorized', async () => {
    const cookie = await authorize();

    const create = await app.inject({
      method: 'POST',
      url: '/api/tasks',
      headers: { cookie },
      payload: taskPayload,
    });
    expect(create.statusCode).toBe(201);
    const taskId = create.json().task_id as string;

    const list = await app.inject({ method: 'GET', url: '/api/tasks' });
    expect(list.json()).toHaveLength(1);

    const update = await app.inject({
      method: 'PATCH',
      url: `/api/tasks/${taskId}`,
      headers: { cookie },
      payload: { title: 'Water all plants' },
    });
    expect(update.statusCode).toBe(200);
    expect(update.json().title).toBe('Water all plants');

    const remove = await app.inject({
      method: 'DELETE',
      url: `/api/tasks/${taskId}`,
      headers: { cookie },
    });
    expect(remove.statusCode).toBe(204);

    const afterDelete = await app.inject({ method: 'GET', url: '/api/tasks' });
    expect(afterDelete.json()).toEqual([]);
  });

  it('rejects task update/delete without an admin session', async () => {
    const cookie = await authorize();
    const create = await app.inject({
      method: 'POST',
      url: '/api/tasks',
      headers: { cookie },
      payload: taskPayload,
    });
    const taskId = create.json().task_id as string;

    const update = await app.inject({ method: 'PATCH', url: `/api/tasks/${taskId}`, payload: { title: 'x' } });
    expect(update.statusCode).toBe(401);

    const remove = await app.inject({ method: 'DELETE', url: `/api/tasks/${taskId}` });
    expect(remove.statusCode).toBe(401);
  });

  it('allows unauthenticated cycle-window retrieval and resolves recurring cycles', async () => {
    const cookie = await authorize();
    await app.inject({ method: 'POST', url: '/api/tasks', headers: { cookie }, payload: taskPayload });

    const response = await app.inject({
      method: 'GET',
      url: `/api/task-cycles?window=${encodeURIComponent('2026-01-01,2026-01-31')}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().map((cycle: { target_date: string }) => cycle.target_date)).toEqual([
      '2026-01-05',
      '2026-01-12',
      '2026-01-19',
      '2026-01-26',
    ]);
  });

  it('rejects a cycle-window request missing the window query parameter', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/task-cycles' });
    expect(response.statusCode).toBe(400);
  });

  it('allows unauthenticated reads of a task\'s persisted cycles', async () => {
    const cookie = await authorize();
    const create = await app.inject({ method: 'POST', url: '/api/tasks', headers: { cookie }, payload: taskPayload });
    const taskId = create.json().task_id as string;

    const response = await app.inject({ method: 'GET', url: `/api/tasks/${taskId}/cycles` });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
  });

  it('reassigns a task cycle without requiring admin authentication', async () => {
    const cookie = await authorize();
    const create = await app.inject({ method: 'POST', url: '/api/tasks', headers: { cookie }, payload: taskPayload });
    const taskId = create.json().task_id as string;
    const cycleId = `${taskId}:2026-01-05`;

    const assign = await app.inject({
      method: 'POST',
      url: `/api/task-cycles/${cycleId}/assign`,
      payload: { responsible_user_id: 'participant-2' },
    });

    expect(assign.statusCode).toBe(200);
    expect(assign.json().responsible_user_id).toBe('participant-2');

    const persisted = await app.inject({ method: 'GET', url: `/api/tasks/${taskId}/cycles` });
    expect(persisted.json()).toHaveLength(1);
    expect(persisted.json()[0].responsible_user_id).toBe('participant-2');
  });

  it('reassigns a task cycle to the household bucket by omitting responsible_user_id', async () => {
    const cookie = await authorize();
    const create = await app.inject({ method: 'POST', url: '/api/tasks', headers: { cookie }, payload: taskPayload });
    const taskId = create.json().task_id as string;
    const cycleId = `${taskId}:2026-01-05`;

    const assign = await app.inject({
      method: 'POST',
      url: `/api/task-cycles/${cycleId}/assign`,
      payload: {},
    });

    expect(assign.statusCode).toBe(200);
    expect(assign.json().responsible_user_id).toBeUndefined();
  });

  it('returns 404 when reassigning a cycle for an unknown task', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/task-cycles/missing-task:2026-01-05/assign',
      payload: { responsible_user_id: 'participant-2' },
    });
    expect(response.statusCode).toBe(404);
  });

  it('keeps working for existing Phase 0/1 endpoints', async () => {
    const household = await app.inject({ method: 'GET', url: '/api/household' });
    expect(household.statusCode).toBe(200);

    const participants = await app.inject({ method: 'GET', url: '/api/participants' });
    expect(participants.statusCode).toBe(200);
  });
});
