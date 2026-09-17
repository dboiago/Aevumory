/**
 * API-level tests for the Phase 3 execution/reward endpoints.
 *
 * Uses Fastify's inject() against a temporary SQLite database, mirroring
 * task-api.test.ts.
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

function taskPayload(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Water plants',
    primary_discipline: 'order',
    source_type: 'core',
    created_by_user_id: 'participant-1',
    assignment: { scope: 'individual', assigned_user_id: 'participant-1', owner_id: 'participant-1' },
    schedule: {
      cadence_type: 'one_off',
      series_anchor_date: '2026-01-05',
      delay_policy: 'none',
      has_strict_window: false,
    },
    supports_foothold: false,
    duration_tier: 'quick',
    effort_type: 'physical',
    cognitive_load: 'low',
    ...overrides,
  };
}

describe('Execution & Reward API (Phase 3)', () => {
  let dbPath: string;
  let db: Database.Database;
  let app: FastifyInstance;

  beforeEach(async () => {
    dbPath = join(tmpdir(), `aevumory-execution-api-test-${randomBytes(4).toString('hex')}.db`);
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

  async function createTask(cookie: string, overrides: Record<string, unknown> = {}): Promise<string> {
    const create = await app.inject({
      method: 'POST',
      url: '/api/tasks',
      headers: { cookie },
      payload: taskPayload(overrides),
    });
    expect(create.statusCode).toBe(201);
    return create.json().task_id as string;
  }

  it('completes a pending cycle and returns the reward transaction', async () => {
    const cookie = await authorize();
    const taskId = await createTask(cookie);
    const cycleId = `${taskId}:2026-01-05`;

    const response = await app.inject({
      method: 'POST',
      url: `/api/task-cycles/${cycleId}/complete`,
      payload: { completed_by_user_id: 'participant-1' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.cycle.status).toBe('satisfied');
    expect(body.transaction.reward_event_type).toBe('completion');
    expect(body.transaction.yield).toEqual({
      primary_discipline: 'order',
      primary_xp: 5,
      secondary_yields: [],
      credits_earned: 0.5,
    });
  });

  it('does not require an admin session to complete a cycle (ordinary household action)', async () => {
    const cookie = await authorize();
    const taskId = await createTask(cookie);
    const cycleId = `${taskId}:2026-01-05`;

    const response = await app.inject({ method: 'POST', url: `/api/task-cycles/${cycleId}/complete` });
    expect(response.statusCode).toBe(200);
  });

  it('rejects completing an already-satisfied cycle', async () => {
    const cookie = await authorize();
    const taskId = await createTask(cookie);
    const cycleId = `${taskId}:2026-01-05`;

    await app.inject({ method: 'POST', url: `/api/task-cycles/${cycleId}/complete` });
    const second = await app.inject({ method: 'POST', url: `/api/task-cycles/${cycleId}/complete` });

    expect(second.statusCode).toBe(409);
  });

  it('establishes a Foothold and later completes with the remaining reward share', async () => {
    const cookie = await authorize();
    const taskId = await createTask(cookie, { supports_foothold: true });
    const cycleId = `${taskId}:2026-01-05`;

    const foothold = await app.inject({ method: 'POST', url: `/api/task-cycles/${cycleId}/foothold` });
    expect(foothold.statusCode).toBe(200);
    expect(foothold.json().transaction.reward_event_type).toBe('foothold_initiation');

    const repeated = await app.inject({ method: 'POST', url: `/api/task-cycles/${cycleId}/foothold` });
    expect(repeated.json().transaction).toBeNull();

    const completion = await app.inject({ method: 'POST', url: `/api/task-cycles/${cycleId}/complete` });
    expect(completion.statusCode).toBe(200);
    expect(completion.json().transaction.reward_event_type).toBe('completion');
  });

  it('rejects establishing a Foothold on a task that does not support it', async () => {
    const cookie = await authorize();
    const taskId = await createTask(cookie, { supports_foothold: false });
    const cycleId = `${taskId}:2026-01-05`;

    const response = await app.inject({ method: 'POST', url: `/api/task-cycles/${cycleId}/foothold` });
    expect(response.statusCode).toBe(409);
  });

  it('prunes a pending cycle with a reason code', async () => {
    const cookie = await authorize();
    const taskId = await createTask(cookie);
    const cycleId = `${taskId}:2026-01-05`;

    const response = await app.inject({
      method: 'POST',
      url: `/api/task-cycles/${cycleId}/prune`,
      payload: { reason_code: 'external_event_resolved' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().cycle.status).toBe('superseded');
  });

  it('requires reason_code to prune a cycle', async () => {
    const cookie = await authorize();
    const taskId = await createTask(cookie);
    const cycleId = `${taskId}:2026-01-05`;

    const response = await app.inject({ method: 'POST', url: `/api/task-cycles/${cycleId}/prune`, payload: {} });
    expect(response.statusCode).toBe(400);
  });

  it('rejects reward-adjustment creation without an admin session', async () => {
    const cookie = await authorize();
    const taskId = await createTask(cookie);
    const cycleId = `${taskId}:2026-01-05`;
    const completion = await app.inject({ method: 'POST', url: `/api/task-cycles/${cycleId}/complete` });
    const transactionId = completion.json().transaction.transaction_id as string;

    const response = await app.inject({
      method: 'POST',
      url: '/api/reward-adjustments',
      payload: {
        original_transaction_id: transactionId,
        reason: 'admin_reversal',
        xp_adjustments: [{ discipline: 'order', xp_delta: -5 }],
        credits_delta: -0.5,
        created_by_user_id: 'admin-1',
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it('creates a reward adjustment once authorized and reopens the reversed cycle', async () => {
    const cookie = await authorize();
    const taskId = await createTask(cookie);
    const cycleId = `${taskId}:2026-01-05`;
    const completion = await app.inject({ method: 'POST', url: `/api/task-cycles/${cycleId}/complete` });
    const transactionId = completion.json().transaction.transaction_id as string;

    const response = await app.inject({
      method: 'POST',
      url: '/api/reward-adjustments',
      headers: { cookie },
      payload: {
        original_transaction_id: transactionId,
        reason: 'admin_reversal',
        xp_adjustments: [{ discipline: 'order', xp_delta: -5 }],
        credits_delta: -0.5,
        created_by_user_id: 'admin-1',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().cycle.status).toBe('pending');
  });

  it('returns a participant ledger with balance and transaction history', async () => {
    const cookie = await authorize();
    const taskId = await createTask(cookie);
    const cycleId = `${taskId}:2026-01-05`;
    await app.inject({ method: 'POST', url: `/api/task-cycles/${cycleId}/complete` });

    const response = await app.inject({ method: 'GET', url: '/api/participants/participant-1/ledger' });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.balance).toBe(0.5);
    expect(body.transactions).toHaveLength(1);
  });

  it('returns per-Discipline progression for a participant', async () => {
    const cookie = await authorize();
    const taskId = await createTask(cookie, { primary_discipline: 'motion' });
    const cycleId = `${taskId}:2026-01-05`;
    await app.inject({ method: 'POST', url: `/api/task-cycles/${cycleId}/complete` });

    const response = await app.inject({ method: 'GET', url: '/api/participants/participant-1/progression' });

    expect(response.statusCode).toBe(200);
    const body = response.json() as Array<{ discipline: string; cumulative_xp: number }>;
    expect(body).toHaveLength(12);
    expect(body.find((entry) => entry.discipline === 'motion')?.cumulative_xp).toBe(5);
  });
});
