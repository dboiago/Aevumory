/**
 * SQLite Reward Repository
 *
 * Implements the RewardRepository interface using better-sqlite3, following
 * the conventions established by SqliteParticipantRepository (upsert-style
 * `save`) and SqliteLedgerRepository (idempotency-key lookup, `async`
 * `saveRedemption` so a UNIQUE-constraint violation surfaces as a rejected
 * Promise rather than an uncaught synchronous throw).
 */

import type Database from 'better-sqlite3';
import type { Reward, RewardCategory, RewardRedemption } from '../types/reward.js';
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
  idempotency_key: string;
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
  id, idempotency_key, user_id, reward_id, base_cost, final_cost_paid, redeemed_at
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

  getRedemptionByIdempotencyKey(idempotency_key: string): Promise<RewardRedemption | null> {
    const row = this.db
      .prepare(`SELECT ${REDEMPTION_COLUMNS} FROM reward_redemptions WHERE idempotency_key = ?`)
      .get(idempotency_key) as RewardRedemptionRow | undefined;

    return Promise.resolve(row ? rowToRedemption(row) : null);
  }

  // Declared `async` (matching SqliteLedgerRepository.saveTransaction) so a
  // synchronous UNIQUE-constraint violation on idempotency_key (migration
  // 0005) surfaces as a rejected Promise for RewardService to catch.
  async saveRedemption(redemption: RewardRedemption): Promise<void> {
    this.db
      .prepare(
        `
      INSERT INTO reward_redemptions (${REDEMPTION_COLUMNS})
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        redemption.id,
        redemption.idempotency_key,
        redemption.user_id,
        redemption.reward_id,
        redemption.base_cost,
        redemption.final_cost_paid,
        redemption.redeemed_at,
      );

    return Promise.resolve();
  }

  listRedemptionsForParticipant(user_id: string): Promise<RewardRedemption[]> {
    const rows = this.db
      .prepare(
        `SELECT ${REDEMPTION_COLUMNS} FROM reward_redemptions WHERE user_id = ? ORDER BY redeemed_at ASC`,
      )
      .all(user_id) as RewardRedemptionRow[];

    return Promise.resolve(rows.map(rowToRedemption));
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
    idempotency_key: row.idempotency_key,
    user_id: row.user_id,
    reward_id: row.reward_id,
    base_cost: row.base_cost,
    final_cost_paid: row.final_cost_paid,
    redeemed_at: row.redeemed_at,
  };
}
