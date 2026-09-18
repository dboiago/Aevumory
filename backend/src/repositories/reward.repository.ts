import type { Reward, RewardRedemption } from '../types/reward.js';

/**
 * Persisted `Reward` catalogue + immutable `RewardRedemption` records
 * (FUNCTIONAL_FOUNDATION_PLAN.md Phase 4). Persistence only — catalogue
 * validation and redemption/balance rules belong in RewardService.
 *
 * `getRedemptionByIdempotencyKey` is the idempotency guard RewardService must
 * consult before creating a new redemption, mirroring
 * `LedgerRepository.getTransactionByIdempotencyKey` (Phase 3): an identical
 * logical redemption (same reward/user/client-supplied nonce) must never
 * produce a duplicate debit.
 */
export interface RewardRepository {
  listRewards(): Promise<Reward[]>;
  getReward(reward_id: string): Promise<Reward | null>;
  saveReward(reward: Reward): Promise<void>;

  getRedemptionByIdempotencyKey(idempotency_key: string): Promise<RewardRedemption | null>;
  saveRedemption(redemption: RewardRedemption): Promise<void>;
  listRedemptionsForParticipant(user_id: string): Promise<RewardRedemption[]>;
}
