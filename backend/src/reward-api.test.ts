/**
 * API-level tests for the Phase 4 rewards catalogue/redemption endpoints.
 *
 * Uses Fastify's inject() against a temporary SQLite database, mirroring
 * execution-api.test.ts.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { randomBytes, randomUUID } from 'crypto';
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

function rewardPayload(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Movie night',
    description: 'Pick the movie for family night',
    category: 'experience',
    base_cost: 5,
    ...overrides,
  };
}

function taskPayload(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Deep clean kitchen',
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
    duration_tier: 'heavy', // 60 min -> 6.0 credits earned on completion
    effort_type: 'physical',
    cognitive_load: 'low',
    ...overrides,
  };
}

describe('Rewards API (Phase 4)', () => {
  let dbPath: string;
  let db: Database.Database;
  let app: FastifyInstance;

  beforeEach(async () => {
    dbPath = join(tmpdir(), `aevumory-rewards-api-test-${randomBytes(4).toString('hex')}.db`);
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

  async function createReward(cookie: string, overrides: Record<string, unknown> = {}): Promise<{ id: string; base_cost: number }> {
    const create = await app.inject({
      method: 'POST',
      url: '/api/rewards',
      headers: { cookie },
      payload: rewardPayload(overrides),
    });
    expect(create.statusCode).toBe(201);
    return create.json();
  }

  async function earnCredits(cookie: string, userId: string, overrides: Record<string, unknown> = {}): Promise<number> {
    const create = await app.inject({
      method: 'POST',
      url: '/api/tasks',
      headers: { cookie },
      payload: taskPayload({ assignment: { scope: 'individual', assigned_user_id: userId, owner_id: userId }, ...overrides }),
    });
    expect(create.statusCode).toBe(201);
    const taskId = create.json().task_id as string;
    const cycleId = `${taskId}:2026-01-05`;

    const completion = await app.inject({ method: 'POST', url: `/api/task-cycles/${cycleId}/complete` });
    expect(completion.statusCode).toBe(200);
    return completion.json().transaction.yield.credits_earned as number;
  }

  it('lists rewards', async () => {
    const cookie = await authorize();
    await createReward(cookie);

    const response = await app.inject({ method: 'GET', url: '/api/rewards' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveLength(1);
    expect(response.json()[0].title).toBe('Movie night');
  });

  it('allows an admin to create a reward', async () => {
    const cookie = await authorize();
    const reward = await createReward(cookie);
    expect(reward.base_cost).toBe(5);
  });

  it('rejects reward creation without an admin session', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/rewards', payload: rewardPayload() });
    expect(response.statusCode).toBe(401);
  });

  it('allows an admin to update a reward', async () => {
    const cookie = await authorize();
    const reward = await createReward(cookie);

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/rewards/${reward.id}`,
      headers: { cookie },
      payload: { base_cost: 8, title: 'Movie night (double feature)' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().base_cost).toBe(8);
    expect(response.json().title).toBe('Movie night (double feature)');
  });

  it('rejects reward updates without an admin session', async () => {
    const cookie = await authorize();
    const reward = await createReward(cookie);

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/rewards/${reward.id}`,
      payload: { base_cost: 8 },
    });

    expect(response.statusCode).toBe(401);
  });

  it('redeems an affordable reward and persists the redemption', async () => {
    const cookie = await authorize();
    const userId = 'participant-1';
    const earned = await earnCredits(cookie, userId);
    const reward = await createReward(cookie, { base_cost: 5 });

    const response = await app.inject({
      method: 'POST',
      url: `/api/rewards/${reward.id}/redeem`,
      payload: { user_id: userId, idempotency_key: randomUUID() },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.redemption.reward_id).toBe(reward.id);
    expect(body.redemption.user_id).toBe(userId);
    expect(body.redemption.final_cost_paid).toBe(5);
    expect(body.balance).toBe(earned - 5);
  });

  it('creates the correct Credit debit as a RewardTransaction, reflected in the existing Phase 3 ledger', async () => {
    const cookie = await authorize();
    const userId = 'participant-2';
    const earned = await earnCredits(cookie, userId);
    const reward = await createReward(cookie, { base_cost: 5 });

    const redeem = await app.inject({
      method: 'POST',
      url: `/api/rewards/${reward.id}/redeem`,
      payload: { user_id: userId, idempotency_key: randomUUID() },
    });
    const redemptionId = redeem.json().redemption.id as string;

    const ledgerResponse = await app.inject({ method: 'GET', url: `/api/participants/${userId}/ledger` });
    expect(ledgerResponse.statusCode).toBe(200);
    const ledger = ledgerResponse.json();
    expect(ledger.balance).toBe(earned - 5);

    const debit = ledger.transactions.find((transaction: { reward_event_type: string }) => transaction.reward_event_type === 'reward_redemption');
    expect(debit).toBeDefined();
    expect(debit.yield.credits_earned).toBe(-5);
    expect(debit.redemption_id).toBe(redemptionId);
    expect(debit.task_id).toBeUndefined();
    expect(debit.cycle_id).toBeUndefined();
  });

  it('does not attribute redemption Credits to any Discipline XP (progression unaffected)', async () => {
    const cookie = await authorize();
    const userId = 'participant-2b';
    await earnCredits(cookie, userId);
    const reward = await createReward(cookie, { base_cost: 5 });

    const before = await app.inject({ method: 'GET', url: `/api/participants/${userId}/progression` });

    await app.inject({
      method: 'POST',
      url: `/api/rewards/${reward.id}/redeem`,
      payload: { user_id: userId, idempotency_key: randomUUID() },
    });

    const after = await app.inject({ method: 'GET', url: `/api/participants/${userId}/progression` });
    expect(after.json()).toEqual(before.json());
  });

  it('rejects redemption when the balance is insufficient, creating no redemption or debit', async () => {
    const cookie = await authorize();
    const userId = 'participant-3';
    const earned = await earnCredits(cookie, userId); // 6.0 credits
    const reward = await createReward(cookie, { base_cost: 100 });

    const response = await app.inject({
      method: 'POST',
      url: `/api/rewards/${reward.id}/redeem`,
      payload: { user_id: userId, idempotency_key: randomUUID() },
    });

    expect(response.statusCode).toBe(409);

    const ledgerResponse = await app.inject({ method: 'GET', url: `/api/participants/${userId}/ledger` });
    const ledger = ledgerResponse.json();
    expect(ledger.balance).toBe(earned);
    expect(ledger.transactions.some((transaction: { reward_event_type: string }) => transaction.reward_event_type === 'reward_redemption')).toBe(false);
  });

  it('leaves the stored reward catalogue unchanged by redemption', async () => {
    const cookie = await authorize();
    const userId = 'participant-4';
    await earnCredits(cookie, userId);
    const reward = await createReward(cookie, { base_cost: 5 });

    await app.inject({
      method: 'POST',
      url: `/api/rewards/${reward.id}/redeem`,
      payload: { user_id: userId, idempotency_key: randomUUID() },
    });

    const rewardsResponse = await app.inject({ method: 'GET', url: '/api/rewards' });
    const stored = rewardsResponse.json().find((item: { id: string }) => item.id === reward.id);
    expect(stored.base_cost).toBe(5);
    expect(stored.is_active).toBe(true);
  });

  it('does not create a duplicate debit for a repeated/retried redemption', async () => {
    const cookie = await authorize();
    const userId = 'participant-5';
    const earned = await earnCredits(cookie, userId);
    const reward = await createReward(cookie, { base_cost: 5 });
    const idempotency_key = randomUUID();

    const first = await app.inject({
      method: 'POST',
      url: `/api/rewards/${reward.id}/redeem`,
      payload: { user_id: userId, idempotency_key },
    });
    const second = await app.inject({
      method: 'POST',
      url: `/api/rewards/${reward.id}/redeem`,
      payload: { user_id: userId, idempotency_key },
    });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(second.json().redemption.id).toBe(first.json().redemption.id);

    const ledgerResponse = await app.inject({ method: 'GET', url: `/api/participants/${userId}/ledger` });
    const ledger = ledgerResponse.json();
    expect(ledger.balance).toBe(earned - 5);
    const debits = ledger.transactions.filter((transaction: { reward_event_type: string }) => transaction.reward_event_type === 'reward_redemption');
    expect(debits).toHaveLength(1);
  });

  it('allows a later, separate redemption of the same reward with a new idempotency key', async () => {
    const cookie = await authorize();
    const userId = 'participant-6';
    const earned = await earnCredits(cookie, userId); // 6.0 credits
    const reward = await createReward(cookie, { base_cost: 3 });

    const first = await app.inject({
      method: 'POST',
      url: `/api/rewards/${reward.id}/redeem`,
      payload: { user_id: userId, idempotency_key: randomUUID() },
    });
    const second = await app.inject({
      method: 'POST',
      url: `/api/rewards/${reward.id}/redeem`,
      payload: { user_id: userId, idempotency_key: randomUUID() },
    });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(second.json().redemption.id).not.toBe(first.json().redemption.id);
    expect(second.json().balance).toBe(earned - 6);
  });

  it('rejects redeeming a reward that does not exist', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/rewards/does-not-exist/redeem',
      payload: { user_id: 'participant-1', idempotency_key: randomUUID() },
    });

    expect(response.statusCode).toBe(404);
  });
});
