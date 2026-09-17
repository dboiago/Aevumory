/**
 * SQLite Ledger Repository - Persistence Tests
 *
 * Verifies that RewardTransaction/RewardAdjustmentTransaction rows survive
 * repository/database recreation, and that the idempotency-key uniqueness
 * constraint is enforced at the database layer.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { randomBytes } from 'crypto';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { unlinkSync } from 'fs';
import { SqliteLedgerRepository } from './ledger.repository.sqlite.js';
import { SqliteTaskRepository } from './task.repository.sqlite.js';
import { runMigrations } from './migrate.js';
import type { RewardAdjustmentTransaction, RewardTransaction, Task, TaskCycle } from '../types/task-domain.types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    task_id: 'task-1',
    title: 'Water plants',
    primary_discipline: 'order',
    secondary_disciplines: [],
    source_type: 'core',
    created_at: '2026-01-01T00:00:00Z',
    created_by_user_id: 'participant-1',
    assignment: { scope: 'individual', assigned_user_id: 'participant-1', owner_id: 'participant-1' },
    schedule: { cadence_type: 'one_off', series_anchor_date: '2026-01-05', delay_policy: 'none', has_strict_window: false },
    lifecycle: {},
    supports_foothold: true,
    duration_tier: 'quick',
    effort_type: 'physical',
    cognitive_load: 'low',
    ...overrides,
  };
}

function makeCycle(overrides: Partial<TaskCycle> = {}): TaskCycle {
  return {
    cycle_id: 'task-1:2026-01-05',
    task_id: 'task-1',
    target_date: '2026-01-05',
    window_start: '2026-01-05T00:00:00',
    window_end: '2026-01-05T23:59:59',
    window_source: 'base',
    status: 'pending',
    responsible_user_id: 'participant-1',
    ...overrides,
  };
}

function makeTransaction(overrides: Partial<RewardTransaction> = {}): RewardTransaction {
  return {
    transaction_id: 'transaction-1',
    idempotency_key: 'task-1:task-1:2026-01-05:participant-1:completion',
    task_id: 'task-1',
    cycle_id: 'task-1:2026-01-05',
    reward_event_type: 'completion',
    reward_owner_user_id: 'participant-1',
    yield: { primary_discipline: 'order', primary_xp: 5, secondary_yields: [{ discipline: 'care', xp: 1 }], credits_earned: 0.5 },
    processed_at: '2026-01-05T08:00:00Z',
    ...overrides,
  };
}

function makeAdjustment(overrides: Partial<RewardAdjustmentTransaction> = {}): RewardAdjustmentTransaction {
  return {
    adjustment_id: 'adjustment-1',
    original_transaction_id: 'transaction-1',
    reason: 'admin_reversal',
    xp_adjustments: [{ discipline: 'order', xp_delta: -5 }],
    credits_delta: -0.5,
    created_at: '2026-01-06T08:00:00Z',
    created_by_user_id: 'admin-1',
    ...overrides,
  };
}

describe('SqliteLedgerRepository - Persistence', () => {
  let dbPath: string;
  let migrationsDir: string;

  beforeAll(async () => {
    dbPath = join(tmpdir(), `aevumory-ledger-test-${randomBytes(4).toString('hex')}.db`);
    migrationsDir = join(__dirname, '../../migrations');

    const db = new Database(dbPath);
    runMigrations(db, migrationsDir);
    const taskRepository = new SqliteTaskRepository(db);
    await taskRepository.saveTask(makeTask());
    await taskRepository.saveCycle(makeCycle());
    db.close();
  });

  afterAll(() => {
    try {
      unlinkSync(dbPath);
    } catch {
      // Ignore errors
    }
  });

  it('persists and retrieves a reward transaction across database sessions', async () => {
    let db = new Database(dbPath);
    let repo = new SqliteLedgerRepository(db);
    await repo.saveTransaction(makeTransaction());
    db.close();

    db = new Database(dbPath);
    repo = new SqliteLedgerRepository(db);

    expect(await repo.getTransaction('transaction-1')).toEqual(makeTransaction());
    expect(await repo.getTransactionByIdempotencyKey(makeTransaction().idempotency_key)).toEqual(makeTransaction());

    db.close();
  });

  it('rejects a duplicate idempotency_key at the database layer', async () => {
    const db = new Database(dbPath);
    const repo = new SqliteLedgerRepository(db);

    await expect(repo.saveTransaction(makeTransaction({ transaction_id: 'transaction-duplicate' }))).rejects.toThrow();

    db.close();
  });

  it('persists a compensating adjustment across database sessions', async () => {
    let db = new Database(dbPath);
    let repo = new SqliteLedgerRepository(db);
    await repo.saveAdjustment(makeAdjustment());
    db.close();

    db = new Database(dbPath);
    repo = new SqliteLedgerRepository(db);

    expect(await repo.listAdjustmentsForTransaction('transaction-1')).toEqual([makeAdjustment()]);
    expect(await repo.listAdjustmentsForOwner('participant-1')).toEqual([makeAdjustment()]);

    db.close();
  });
});
