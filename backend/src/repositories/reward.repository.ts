import type { Reward, RewardRedemption } from '../types/reward.js';
import type { RewardTransaction } from '../types/task-domain.types.js';

/**
 * Persisted `Reward` catalogue + immutable `RewardRedemption` records
 * (FUNCTIONAL_FOUNDATION_PLAN.md Phase 4). Persistence only — catalogue
 * validation and redemption/balance rules belong in RewardService.
 *
 * Idempotency for redemption lives on the debiting `RewardTransaction`'s
 * existing, already-UNIQUE `idempotency_key` (Phase 3), not on
 * `RewardRedemption` itself — a single authoritative dedup mechanism rather
 * than a second one duplicated onto the redemption record.
 *
 * `saveRedemptionWithDebit` persists the redemption and its debiting
 * RewardTransaction together, atomically — see SqliteRewardRepository for
 * why this repository (rather than LedgerRepository) owns that write.
 */
export interface RewardRepository {
  listRewards(): Promise<Reward[]>;
  getReward(reward_id: string): Promise<Reward | null>;
  saveReward(reward: Reward): Promise<void>;

  getRedemption(redemption_id: string): Promise<RewardRedemption | null>;
  listRedemptionsForParticipant(user_id: string): Promise<RewardRedemption[]>;
  saveRedemptionWithDebit(redemption: RewardRedemption, debit: RewardTransaction): Promise<void>;
}

