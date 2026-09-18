/**
 * API-level tests for the Phase 5 calendar endpoints.
 *
 * Uses Fastify's inject() against a temporary SQLite database, mirroring
 * reward-api.test.ts / execution-api.test.ts. Wires the already-existing
 * temporal domain (SqliteTemporalRepository / DefaultTemporalService /
 * resolveEventOccurrences) through /api/calendar/*; no new recurrence logic
 * is tested here beyond what recurrence.resolver.test.ts already covers.
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

function eventPayload(sourceId: string, overrides: Record<string, unknown> = {}) {
  return {
    title: 'Dentist appointment',
    location: 'Main Street Dental',
    source_id: sourceId,
    timezone: 'America/Toronto',
    schedule: {
      kind: 'timed',
      local_start: '2026-09-08T14:00:00',
      local_end: '2026-09-08T15:00:00',
    },
    relevance: 'ordinary',
    significance: 'normal',
    ...overrides,
  };
}

describe('Calendar API (Phase 5)', () => {
  let dbPath: string;
  let db: Database.Database;
  let app: FastifyInstance;

  beforeEach(async () => {
    dbPath = join(tmpdir(), `aevumory-calendar-api-test-${randomBytes(4).toString('hex')}.db`);
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
    const setup = await app.inject({ method: 'POST', url: '/api/admin/pin/setup', payload: { pin: '1234' } });
    return extractCookie(setup.headers['set-cookie']);
  }

  async function getLocalSourceId(): Promise<string> {
    const response = await app.inject({ method: 'GET', url: '/api/calendar/sources' });
    const sources = response.json() as Array<{ source_id: string; kind: string }>;
    const local = sources.find((source) => source.kind === 'local');
    if (!local) throw new Error('Expected a bootstrapped local calendar source');
    return local.source_id;
  }

  // ==========================================================================
  // Calendar sources
  // ==========================================================================

  it('bootstraps exactly one local calendar source at startup', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/calendar/sources' });
    expect(response.statusCode).toBe(200);
    const sources = response.json();
    expect(sources).toHaveLength(1);
    expect(sources[0].kind).toBe('local');
    expect(sources[0].name).toBe('Aevumory');
  });

  it('allows an admin to create, retrieve, update, and delete a calendar source', async () => {
    const cookie = await authorize();

    const create = await app.inject({
      method: 'POST',
      url: '/api/calendar/sources',
      headers: { cookie },
      payload: { name: 'Extra household calendar' },
    });
    expect(create.statusCode).toBe(201);
    const created = create.json();
    expect(created.kind).toBe('local');

    const list = await app.inject({ method: 'GET', url: '/api/calendar/sources' });
    expect(list.json()).toHaveLength(2);

    const update = await app.inject({
      method: 'PATCH',
      url: `/api/calendar/sources/${created.source_id}`,
      headers: { cookie },
      payload: { name: 'Renamed calendar', enabled: false },
    });
    expect(update.statusCode).toBe(200);
    expect(update.json().name).toBe('Renamed calendar');
    expect(update.json().enabled).toBe(false);

    const remove = await app.inject({
      method: 'DELETE',
      url: `/api/calendar/sources/${created.source_id}`,
      headers: { cookie },
    });
    expect(remove.statusCode).toBe(204);

    const listAfterDelete = await app.inject({ method: 'GET', url: '/api/calendar/sources' });
    expect(listAfterDelete.json()).toHaveLength(1);
  });

  it('rejects calendar source mutations without an admin session', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/calendar/sources',
      payload: { name: 'Unauthorized calendar' },
    });
    expect(create.statusCode).toBe(401);
  });

  // ==========================================================================
  // Calendar events
  // ==========================================================================

  it('creates, retrieves, updates, and deletes a calendar event as an ordinary action', async () => {
    const sourceId = await getLocalSourceId();

    const create = await app.inject({
      method: 'POST',
      url: '/api/calendar/events',
      payload: eventPayload(sourceId),
    });
    expect(create.statusCode).toBe(201);
    const event = create.json();
    expect(event.title).toBe('Dentist appointment');
    expect(event.status).toBe('active');

    const list = await app.inject({ method: 'GET', url: '/api/calendar/events' });
    expect(list.json()).toHaveLength(1);
    expect(list.json()[0].event_id).toBe(event.event_id);

    const update = await app.inject({
      method: 'PATCH',
      url: `/api/calendar/events/${event.event_id}`,
      payload: { title: 'Dentist appointment (rescheduled)' },
    });
    expect(update.statusCode).toBe(200);
    expect(update.json().title).toBe('Dentist appointment (rescheduled)');

    const remove = await app.inject({ method: 'DELETE', url: `/api/calendar/events/${event.event_id}` });
    expect(remove.statusCode).toBe(204);

    const listAfterDelete = await app.inject({ method: 'GET', url: '/api/calendar/events' });
    expect(listAfterDelete.json()).toHaveLength(0);
  });

  it('rejects event creation referencing an unknown source', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/calendar/events',
      payload: eventPayload('does-not-exist'),
    });
    expect(response.statusCode).toBe(400);
  });

  it('returns 404 when updating a calendar event that does not exist', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/calendar/events/does-not-exist',
      payload: { title: 'Anything' },
    });
    expect(response.statusCode).toBe(404);
  });

  // ==========================================================================
  // Occurrences
  // ==========================================================================

  it('resolves occurrences for a requested window, including recurring events, through the existing temporal service', async () => {
    const sourceId = await getLocalSourceId();

    await app.inject({
      method: 'POST',
      url: '/api/calendar/events',
      payload: eventPayload(sourceId, {
        title: 'Weekly practice',
        schedule: { kind: 'timed', local_start: '2026-09-01T18:00:00', local_end: '2026-09-01T19:00:00' },
        recurrence: { frequency: 'weekly', interval: 1, by_weekday: [2] },
      }),
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/calendar/occurrences?window=2026-09-07T00:00:00Z,2026-09-16T00:00:00Z',
    });

    expect(response.statusCode).toBe(200);
    const occurrences = response.json() as Array<{ title: string; local_start_date: string }>;
    expect(occurrences.map((occurrence) => occurrence.local_start_date)).toEqual(['2026-09-08', '2026-09-15']);
    expect(occurrences.every((occurrence) => occurrence.title === 'Weekly practice')).toBe(true);
  });

  it('excludes occurrences outside the requested window', async () => {
    const sourceId = await getLocalSourceId();

    await app.inject({
      method: 'POST',
      url: '/api/calendar/events',
      payload: eventPayload(sourceId, {
        title: 'One-off appointment',
        schedule: { kind: 'timed', local_start: '2026-10-20T09:00:00', local_end: '2026-10-20T10:00:00' },
      }),
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/calendar/occurrences?window=2026-09-07T00:00:00Z,2026-09-16T00:00:00Z',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
  });

  it('rejects an occurrences request missing the window parameter', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/calendar/occurrences' });
    expect(response.statusCode).toBe(400);
  });

  // ==========================================================================
  // Persistence across sessions
  // ==========================================================================

  it('persists calendar sources and events across a server restart', async () => {
    const sourceId = await getLocalSourceId();
    const created = await app.inject({
      method: 'POST',
      url: '/api/calendar/events',
      payload: eventPayload(sourceId),
    });
    expect(created.statusCode).toBe(201);
    const eventId = created.json().event_id as string;

    // Simulate a process restart: a fresh Database connection + Fastify
    // instance against the same on-disk file, independent of the original
    // (which the outer afterEach still owns and will close as usual).
    const restartedDb = new Database(dbPath);
    const restartedApp = await createServer(restartedDb, { logger: false });

    const list = await restartedApp.inject({ method: 'GET', url: '/api/calendar/events' });
    expect(list.json()).toHaveLength(1);
    expect(list.json()[0].event_id).toBe(eventId);

    const sources = await restartedApp.inject({ method: 'GET', url: '/api/calendar/sources' });
    expect(sources.json()).toHaveLength(1);

    await restartedApp.close();
    restartedDb.close();
  });
});
