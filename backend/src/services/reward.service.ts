/**
 * Reward Service
 *
 * Application-service boundary for the Reward catalogue and redemption
 * (FUNCTIONAL_FOUNDATION_PLAN.md Phase 4). Route handlers must not talk to
 * RewardRepository/LedgerRepository directly.
 *
 * Catalogue mutations (create/update) are admin-gated at the route level.
 * Redemption is an ordinary participant action.
 *
 * Redemption never decrements a stored balance. A redemption row IS the
 * Credit debit — its `final_cost_paid` is the only record of the debit, and
 * it is written exactly once (see `redeemReward`), so there is no
 * multi-step ledger write that could partially fail: the debit and the
 * redemption record are the same atomic insert. Spendable balance is always
 * derived at read time from the existing Phase 3 ledger (RewardTransaction
 * + RewardAdjustmentTransaction) net of redemptions — see
 * `getSpendableBalance`.
 */

import { randomUUID } from 'node:crypto';
import type { Reward, RewardCategory, RewardRedemption } from '../types/reward.js';
import type { RewardRepository } from '../repositories/reward.repository.js';
import type { LedgerRepository } from '../repositories/ledger.repository.js';

const REWARD_CATEGORIES: RewardCategory[] = ['personal_leisure', 'household', 'experience'];

export class RewardNotFoundError extends Error {
  constructor(reward_id: string) {
    super(`Reward not found: ${reward_id}`);
  }
}

export class RewardInactiveError extends Error {
  constructor(reward_id: string) {
    super(`Reward is not active: ${reward_id}`);
  }
}

export class InsufficientCreditsError extends Error {
  constructor(reward_id: string) {
    super(`Insufficient Credit balance to redeem reward: ${reward_id}`);
  }
}

export interface CreateRewardInput {
  title: string;
  description?: string;
  category: RewardCategory;
  base_cost: number;
  is_discountable?: boolean;
  is_active?: boolean;
}

export interface UpdateRewardInput {
  title?: string;
  description?: string | null;
  category?: RewardCategory;
  base_cost?: number;
  is_discountable?: boolean;
  is_active?: boolean;
}

export interface RedeemRewardInput {
  user_id: string;
  idempotency_key: string;
}

export interface RedeemRewardResult {
  redemption: RewardRedemption;
  balance: number;
}

function validateRewardFields(input: { title?: string; category?: RewardCategory; base_cost?: number }): void {
  if (input.title !== undefined && !input.title.trim()) {
    throw new Error('title must not be empty');
  }
  if (input.category !== undefined && !REWARD_CATEGORIES.includes(input.category)) {
    throw new Error(`category must be one of: ${REWARD_CATEGORIES.join(', ')}`);
  }
  if (input.base_cost !== undefined && (!Number.isInteger(input.base_cost) || input.base_cost <= 0)) {
    throw new Error('base_cost must be a positive integer');
  }
}

/** `is_discountable` is explicitly false for 'household' rewards (reward.ts). */
function resolveIsDiscountable(category: RewardCategory, requested: boolean | undefined): boolean {
  if (category === 'household') return false;
  return requested ?? true;
}

export class RewardService {
  constructor(
    private readonly rewardRepository: RewardRepository,
    private readonly ledgerRepository: LedgerRepository,
  ) {}

  listRewards(): Promise<Reward[]> {
    return this.rewardRepository.listRewards();
  }

  async createReward(input: CreateRewardInput): Promise<Reward> {
    validateRewardFields(input);

    const reward: Reward = {
      id: randomUUID(),
      title: input.title,
      description: input.description,
      category: input.category,
      base_cost: input.base_cost,
      is_discountable: resolveIsDiscountable(input.category, input.is_discountable),
      is_active: input.is_active ?? true,
    };

    await this.rewardRepository.saveReward(reward);
    return reward;
  }

  async updateReward(reward_id: string, input: UpdateRewardInput): Promise<Reward> {
    const existing = await this.rewardRepository.getReward(reward_id);
    if (!existing) throw new RewardNotFoundError(reward_id);

    validateRewardFields(input);

    const category = input.category ?? existing.category;
    const updated: Reward = {
      ...existing,
      title: input.title ?? existing.title,
      description: input.description === null ? undefined : (input.description ?? existing.description),
      category,
      base_cost: input.base_cost ?? existing.base_cost,
      is_discountable: resolveIsDiscountable(category, input.is_discountable ?? existing.is_discountable),
      is_active: input.is_active ?? existing.is_active,
    };

    await this.rewardRepository.saveReward(updated);
    return updated;
  }

  /**
   * Spendable Credit balance: the existing Phase 3 ledger (earned yields +
   * admin adjustments) net of everything already redeemed. Never a stored,
   * mutable balance field.
   */
  async getSpendableBalance(user_id: string): Promise<number> {
    const [transactions, adjustments, redemptions] = await Promise.all([
      this.ledgerRepository.listTransactionsForOwner(user_id),
      this.ledgerRepository.listAdjustmentsForOwner(user_id),
      this.rewardRepository.listRedemptionsForParticipant(user_id),
    ]);

    const earned = transactions.reduce((sum, transaction) => sum + transaction.yield.credits_earned, 0);
    const adjusted = adjustments.reduce((sum, adjustment) => sum + adjustment.credits_delta, 0);
    const redeemed = redemptions.reduce((sum, redemption) => sum + redemption.final_cost_paid, 0);

    return earned + adjusted - redeemed;
  }

  async redeemReward(reward_id: string, input: RedeemRewardInput): Promise<RedeemRewardResult> {
    const reward = await this.rewardRepository.getReward(reward_id);
    if (!reward) throw new RewardNotFoundError(reward_id);
    if (!reward.is_active) throw new RewardInactiveError(reward_id);

    const idempotency_key = `${reward_id}:${input.user_id}:${input.idempotency_key}`;

    const existing = await this.rewardRepository.getRedemptionByIdempotencyKey(idempotency_key);
    if (existing) {
      return { redemption: existing, balance: await this.getSpendableBalance(input.user_id) };
    }

    const balance = await this.getSpendableBalance(input.user_id);
    if (balance < reward.base_cost) throw new InsufficientCreditsError(reward_id);

    const redemption: RewardRedemption = {
      id: randomUUID(),
      idempotency_key,
      user_id: input.user_id,
      reward_id,
      base_cost: reward.base_cost,
      final_cost_paid: reward.base_cost,
      redeemed_at: new Date().toISOString(),
    };

    try {
      await this.rewardRepository.saveRedemption(redemption);
    } catch (error) {
      // A concurrent request for the same logical redemption may have won
      // the race and already inserted this idempotency_key (UNIQUE index,
      // migration 0005) — treat that as the idempotent result rather than a
      // failure, mirroring TaskExecutionService's tolerance for the
      // equivalent race on reward_transactions.idempotency_key.
      const raced = await this.rewardRepository.getRedemptionByIdempotencyKey(idempotency_key);
      if (raced) return { redemption: raced, balance: await this.getSpendableBalance(input.user_id) };
      throw error;
    }

    return { redemption, balance: balance - redemption.final_cost_paid };
  }
}
