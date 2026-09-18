/**
 * SQLite Reward Repository
 *
 * Implements the RewardRepository interface using better-sqlite3, following
 * the conventions established by SqliteParticipantRepository (upsert-style
 * `save`) and SqliteLedgerRepository (idempotency-key based dedup).
 *
 * `saveRedemptionWithDebit` also inserts into `reward_transactions` — a
 * table LedgerRepository otherwise owns — so that the redemption row and
 * its debiting RewardTransaction can be written inside a single
 * `db.transaction()` and therefore can never diverge (a failure partway
 * through leaves neither committed). better-sqlite3 transactions require
 * both statements to run synchronously inside the same closure, which is
 * only possible if one repository holds both prepared statements; the
 * `reward_transactions` INSERT is intentionally duplicated here (rather
 * than delegating to LedgerRepository.saveTransaction, a separate async
 * call that could not share this transaction) for that reason. This is the
 * only place RewardRepository writes to reward_transactions — reads and all
 * other writes (task-based reward events) remain exclusively
 * LedgerRepository's responsibility.
 */

import type Database from 'better-sqlite3';
import type { Reward, RewardCategory, RewardRedemption } from '../types/reward.js';
import type { RewardTransaction } from '../types/task-domain.types.js';
import type { RewardRepository } from '../repositories/reward.repository.js';

interface RewardRow {
  id: string;
  title: string;
  description: string | null;
  category: string;
  base_cost: number;
  is_discountable: number;
  is_active: number;
}

interface RewardRedemptionRow {
  id: string;
  user_id: string;
  reward_id: string;
  base_cost: number;
  final_cost_paid: number;
  redeemed_at: string;
}

const REWARD_COLUMNS = `
  id, title, description, category, base_cost, is_discountable, is_active
`;

const REDEMPTION_COLUMNS = `
  id, user_id, reward_id, base_cost, final_cost_paid, redeemed_at
`;

// Mirrors ledger.repository.sqlite.ts's TRANSACTION_COLUMNS exactly — see
// the file-level comment on why this repository also writes this table.
const TRANSACTION_COLUMNS = `
  transaction_id, idempotency_key, task_id, cycle_id, reward_event_type,
  reward_owner_user_id, redemption_id, primary_discipline, primary_xp,
  secondary_yields, credits_earned, care_relief, processed_at
`;

export class SqliteRewardRepository implements RewardRepository {
  constructor(private readonly db: Database.Database) {}

  listRewards(): Promise<Reward[]> {
    const rows = this.db
      .prepare(`SELECT ${REWARD_COLUMNS} FROM rewards ORDER BY title ASC`)
      .all() as RewardRow[];

    return Promise.resolve(rows.map(rowToReward));
  }

  getReward(reward_id: string): Promise<Reward | null> {
    const row = this.db
      .prepare(`SELECT ${REWARD_COLUMNS} FROM rewards WHERE id = ?`)
      .get(reward_id) as RewardRow | undefined;

    return Promise.resolve(row ? rowToReward(row) : null);
  }

  saveReward(reward: Reward): Promise<void> {
    this.db
      .prepare(
        `
      INSERT INTO rewards (${REWARD_COLUMNS})
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        category = excluded.category,
        base_cost = excluded.base_cost,
        is_discountable = excluded.is_discountable,
        is_active = excluded.is_active
    `,
      )
      .run(
        reward.id,
        reward.title,
        reward.description ?? null,
        reward.category,
        reward.base_cost,
        reward.is_discountable ? 1 : 0,
        reward.is_active ? 1 : 0,
      );

    return Promise.resolve();
  }

  getRedemption(redemption_id: string): Promise<RewardRedemption | null> {
    const row = this.db
      .prepare(`SELECT ${REDEMPTION_COLUMNS} FROM reward_redemptions WHERE id = ?`)
      .get(redemption_id) as RewardRedemptionRow | undefined;

    return Promise.resolve(row ? rowToRedemption(row) : null);
  }

  listRedemptionsForParticipant(user_id: string): Promise<RewardRedemption[]> {
    const rows = this.db
      .prepare(`SELECT ${REDEMPTION_COLUMNS} FROM reward_redemptions WHERE user_id = ? ORDER BY redeemed_at ASC`)
      .all(user_id) as RewardRedemptionRow[];

    return Promise.resolve(rows.map(rowToRedemption));
  }

  // Declared `async` (matching SqliteLedgerRepository.saveTransaction) so a
  // synchronous UNIQUE-constraint violation on idempotency_key surfaces as a
  // rejected Promise for RewardService to catch and treat as a race with an
  // identical concurrent redemption.
  async saveRedemptionWithDebit(redemption: RewardRedemption, debit: RewardTransaction): Promise<void> {
    const insertRedemption = this.db.prepare(`
      INSERT INTO reward_redemptions (${REDEMPTION_COLUMNS})
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertDebit = this.db.prepare(`
      INSERT INTO reward_transactions (${TRANSACTION_COLUMNS})
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const runAtomically = this.db.transaction(() => {
      insertRedemption.run(
        redemption.id,
        redemption.user_id,
        redemption.reward_id,
        redemption.base_cost,
        redemption.final_cost_paid,
        redemption.redeemed_at,
      );

      insertDebit.run(
        debit.transaction_id,
        debit.idempotency_key,
        debit.task_id ?? null,
        debit.cycle_id ?? null,
        debit.reward_event_type,
        debit.reward_owner_user_id ?? null,
        debit.redemption_id ?? null,
        debit.yield.primary_discipline ?? null,
        debit.yield.primary_xp,
        JSON.stringify(debit.yield.secondary_yields),
        debit.yield.credits_earned,
        debit.care_relief ? JSON.stringify(debit.care_relief) : null,
        debit.processed_at,
      );
    });

    runAtomically();
    return Promise.resolve();
  }
}

function rowToReward(row: RewardRow): Reward {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    category: row.category as RewardCategory,
    base_cost: row.base_cost,
    is_discountable: row.is_discountable === 1,
    is_active: row.is_active === 1,
  };
}

function rowToRedemption(row: RewardRedemptionRow): RewardRedemption {
  return {
    id: row.id,
    user_id: row.user_id,
    reward_id: row.reward_id,
    base_cost: row.base_cost,
    final_cost_paid: row.final_cost_paid,
    redeemed_at: row.redeemed_at,
  };
}

