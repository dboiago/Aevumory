/**
 * SQLite Ledger Repository
 *
 * Implements the LedgerRepository interface using better-sqlite3.
 * `reward_transactions.idempotency_key` has a UNIQUE index (migration 0004);
 * `saveTransaction` relies on TaskExecutionService checking
 * `getTransactionByIdempotencyKey` first rather than on a database-level
 * upsert, since a duplicate insert here is a service-boundary logic error,
 * not a value to silently reconcile.
 */

import type Database from 'better-sqlite3';
import type {
  CareReliefAward,
  RewardAdjustmentTransaction,
  RewardTransaction,
  RewardYield,
} from '../types/task-domain.types.js';
import type { LedgerRepository } from '../repositories/ledger.repository.js';

interface RewardTransactionRow {
  transaction_id: string;
  idempotency_key: string;
  task_id: string | null;
  cycle_id: string | null;
  reward_event_type: string;
  reward_owner_user_id: string | null;
  redemption_id: string | null;
  primary_discipline: string | null;
  primary_xp: number;
  secondary_yields: string;
  credits_earned: number;
  care_relief: string | null;
  processed_at: string;
}

interface RewardAdjustmentRow {
  adjustment_id: string;
  original_transaction_id: string;
  reason: string;
  xp_adjustments: string;
  credits_delta: number;
  created_at: string;
  created_by_user_id: string;
}

const TRANSACTION_COLUMNS = `
  transaction_id, idempotency_key, task_id, cycle_id, reward_event_type,
  reward_owner_user_id, redemption_id, primary_discipline, primary_xp,
  secondary_yields, credits_earned, care_relief, processed_at
`;

const ADJUSTMENT_COLUMNS = `
  adjustment_id, original_transaction_id, reason, xp_adjustments, credits_delta,
  created_at, created_by_user_id
`;

export class SqliteLedgerRepository implements LedgerRepository {
  constructor(private readonly db: Database.Database) {}

  getTransaction(transaction_id: string): Promise<RewardTransaction | null> {
    const row = this.db
      .prepare(`SELECT ${TRANSACTION_COLUMNS} FROM reward_transactions WHERE transaction_id = ?`)
      .get(transaction_id) as RewardTransactionRow | undefined;

    return Promise.resolve(row ? rowToTransaction(row) : null);
  }

  getTransactionByIdempotencyKey(idempotency_key: string): Promise<RewardTransaction | null> {
    const row = this.db
      .prepare(`SELECT ${TRANSACTION_COLUMNS} FROM reward_transactions WHERE idempotency_key = ?`)
      .get(idempotency_key) as RewardTransactionRow | undefined;

    return Promise.resolve(row ? rowToTransaction(row) : null);
  }

  // Declared `async` (unlike this file's other methods) so that a synchronous
  // UNIQUE-constraint violation on idempotency_key (migration 0004) surfaces
  // as a rejected Promise, not an uncaught synchronous throw — callers rely
  // on this to await/catch a duplicate-transaction attempt.
  async saveTransaction(transaction: RewardTransaction): Promise<void> {
    this.db
      .prepare(
        `
      INSERT INTO reward_transactions (${TRANSACTION_COLUMNS})
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        transaction.transaction_id,
        transaction.idempotency_key,
        transaction.task_id ?? null,
        transaction.cycle_id ?? null,
        transaction.reward_event_type,
        transaction.reward_owner_user_id ?? null,
        transaction.redemption_id ?? null,
        transaction.yield.primary_discipline ?? null,
        transaction.yield.primary_xp,
        JSON.stringify(transaction.yield.secondary_yields),
        transaction.yield.credits_earned,
        transaction.care_relief ? JSON.stringify(transaction.care_relief) : null,
        transaction.processed_at,
      );

    return Promise.resolve();
  }

  listTransactionsForOwner(reward_owner_user_id: string): Promise<RewardTransaction[]> {
    const rows = this.db
      .prepare(
        `SELECT ${TRANSACTION_COLUMNS} FROM reward_transactions WHERE reward_owner_user_id = ? ORDER BY processed_at ASC`,
      )
      .all(reward_owner_user_id) as RewardTransactionRow[];

    return Promise.resolve(rows.map(rowToTransaction));
  }

  saveAdjustment(adjustment: RewardAdjustmentTransaction): Promise<void> {
    this.db
      .prepare(
        `
      INSERT INTO reward_adjustments (${ADJUSTMENT_COLUMNS})
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        adjustment.adjustment_id,
        adjustment.original_transaction_id,
        adjustment.reason,
        JSON.stringify(adjustment.xp_adjustments),
        adjustment.credits_delta,
        adjustment.created_at,
        adjustment.created_by_user_id,
      );

    return Promise.resolve();
  }

  listAdjustmentsForTransaction(original_transaction_id: string): Promise<RewardAdjustmentTransaction[]> {
    const rows = this.db
      .prepare(
        `SELECT ${ADJUSTMENT_COLUMNS} FROM reward_adjustments WHERE original_transaction_id = ? ORDER BY created_at ASC`,
      )
      .all(original_transaction_id) as RewardAdjustmentRow[];

    return Promise.resolve(rows.map(rowToAdjustment));
  }

  listAdjustmentsForOwner(reward_owner_user_id: string): Promise<RewardAdjustmentTransaction[]> {
    const rows = this.db
      .prepare(
        `
      SELECT ${ADJUSTMENT_COLUMNS.split(',').map((column) => `a.${column.trim()}`).join(', ')}
      FROM reward_adjustments a
      JOIN reward_transactions t ON t.transaction_id = a.original_transaction_id
      WHERE t.reward_owner_user_id = ?
      ORDER BY a.created_at ASC
    `,
      )
      .all(reward_owner_user_id) as RewardAdjustmentRow[];

    return Promise.resolve(rows.map(rowToAdjustment));
  }
}

function rowToTransaction(row: RewardTransactionRow): RewardTransaction {
  const yieldValue: RewardYield = {
    primary_discipline: row.primary_discipline ? (row.primary_discipline as RewardYield['primary_discipline']) : undefined,
    primary_xp: row.primary_xp,
    secondary_yields: JSON.parse(row.secondary_yields),
    credits_earned: row.credits_earned,
  };

  return {
    transaction_id: row.transaction_id,
    idempotency_key: row.idempotency_key,
    task_id: row.task_id ?? undefined,
    cycle_id: row.cycle_id ?? undefined,
    reward_event_type: row.reward_event_type as RewardTransaction['reward_event_type'],
    reward_owner_user_id: row.reward_owner_user_id ?? undefined,
    redemption_id: row.redemption_id ?? undefined,
    yield: yieldValue,
    care_relief: row.care_relief ? (JSON.parse(row.care_relief) as CareReliefAward) : undefined,
    processed_at: row.processed_at,
  };
}

function rowToAdjustment(row: RewardAdjustmentRow): RewardAdjustmentTransaction {
  return {
    adjustment_id: row.adjustment_id,
    original_transaction_id: row.original_transaction_id,
    reason: row.reason as RewardAdjustmentTransaction['reason'],
    xp_adjustments: JSON.parse(row.xp_adjustments),
    credits_delta: row.credits_delta,
    created_at: row.created_at,
    created_by_user_id: row.created_by_user_id,
  };
}
