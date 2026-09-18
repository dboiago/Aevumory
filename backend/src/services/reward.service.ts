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
 * Redemption produces two things, committed atomically
 * (RewardRepository.saveRedemptionWithDebit): an immutable `RewardRedemption`
 * (what was redeemed, at what price) and an immutable debiting
 * `RewardTransaction` with `reward_event_type: 'reward_redemption'` against
 * the SAME Phase 3 ledger used for task rewards. There is exactly one
 * authoritative Credit ledger — spendable balance is always
 * `TaskExecutionService.getParticipantLedger(user_id).balance`, unchanged by
 * this phase, now simply inclusive of redemption debits too. Nothing here
 * maintains a second, parallel balance.
 */

import { randomUUID } from 'node:crypto';
import type { Reward, RewardCategory, RewardRedemption } from '../types/reward.js';
import type { RewardTransaction } from '../types/task-domain.types.js';
import type { RewardRepository } from '../repositories/reward.repository.js';
import type { LedgerRepository } from '../repositories/ledger.repository.js';
import type { TaskExecutionService } from './task-execution.service.js';

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
  is_active?: boolean;
}

export interface UpdateRewardInput {
  title?: string;
  description?: string | null;
  category?: RewardCategory;
  base_cost?: number;
  is_active?: boolean;
}

export interface RedeemRewardInput {
  user_id: string;
  /** Client-supplied nonce distinguishing this redemption attempt from a later, separate one for the same reward/participant. */
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

export class RewardService {
  constructor(
    private readonly rewardRepository: RewardRepository,
    private readonly ledgerRepository: LedgerRepository,
    private readonly taskExecutionService: TaskExecutionService,
  ) {}

  listRewards(): Promise<Reward[]> {
    return this.rewardRepository.listRewards();
  }

  /** Redemption history for the Participant Profile (FUNCTIONAL_FOUNDATION_PLAN.md Phase 7). */
  listRedemptionsForParticipant(user_id: string): Promise<RewardRedemption[]> {
    return this.rewardRepository.listRedemptionsForParticipant(user_id);
  }

  async createReward(input: CreateRewardInput): Promise<Reward> {
    validateRewardFields(input);

    const reward: Reward = {
      id: randomUUID(),
      title: input.title,
      description: input.description,
      category: input.category,
      base_cost: input.base_cost,
      // No consumer exists for `is_discountable` yet (the Renewal discount
      // engine is out of scope — FUNCTIONAL_FOUNDATION_PLAN.md Phase 4 scope
      // boundary), and the domain only documents one rule for it ("false
      // for 'household'"). Rather than inventing a default for the other
      // categories, every reward is created non-discountable; this needs
      // human/product review once that engine exists.
      is_discountable: false,
      is_active: input.is_active ?? true,
    };

    await this.rewardRepository.saveReward(reward);
    return reward;
  }

  async updateReward(reward_id: string, input: UpdateRewardInput): Promise<Reward> {
    const existing = await this.rewardRepository.getReward(reward_id);
    if (!existing) throw new RewardNotFoundError(reward_id);

    validateRewardFields(input);

    const updated: Reward = {
      ...existing,
      title: input.title ?? existing.title,
      description: input.description === null ? undefined : (input.description ?? existing.description),
      category: input.category ?? existing.category,
      base_cost: input.base_cost ?? existing.base_cost,
      is_active: input.is_active ?? existing.is_active,
    };

    await this.rewardRepository.saveReward(updated);
    return updated;
  }

  /** The existing Phase 3 ledger balance — the single authoritative spendable Credit figure, now inclusive of redemption debits. */
  async getSpendableBalance(user_id: string): Promise<number> {
    return (await this.taskExecutionService.getParticipantLedger(user_id)).balance;
  }

  async redeemReward(reward_id: string, input: RedeemRewardInput): Promise<RedeemRewardResult> {
    const reward = await this.rewardRepository.getReward(reward_id);
    if (!reward) throw new RewardNotFoundError(reward_id);
    if (!reward.is_active) throw new RewardInactiveError(reward_id);

    // No task/cycle to key off of (unlike Phase 3 events) — reward_id +
    // participant + a client-supplied nonce is the logical redemption
    // identity, so the same reward can still be redeemed again later.
    const idempotency_key = `${reward_id}:${input.user_id}:${input.idempotency_key}`;

    const existingDebit = await this.ledgerRepository.getTransactionByIdempotencyKey(idempotency_key);
    if (existingDebit) {
      return this.replayResult(existingDebit, input.user_id);
    }

    const balance = await this.getSpendableBalance(input.user_id);
    if (balance < reward.base_cost) throw new InsufficientCreditsError(reward_id);

    const redemption: RewardRedemption = {
      id: randomUUID(),
      user_id: input.user_id,
      reward_id,
      base_cost: reward.base_cost,
      final_cost_paid: reward.base_cost,
      redeemed_at: new Date().toISOString(),
    };

    const debit: RewardTransaction = {
      transaction_id: randomUUID(),
      idempotency_key,
      reward_event_type: 'reward_redemption',
      reward_owner_user_id: input.user_id,
      redemption_id: redemption.id,
      yield: { primary_xp: 0, secondary_yields: [], credits_earned: -redemption.final_cost_paid },
      processed_at: redemption.redeemed_at,
    };

    try {
      await this.rewardRepository.saveRedemptionWithDebit(redemption, debit);
    } catch (error) {
      // Raced with an identical concurrent request; the other request's
      // atomic write already committed both rows under this idempotency_key
      // (UNIQUE index on reward_transactions.idempotency_key, migration
      // 0004) — treat that as the idempotent result rather than a failure,
      // mirroring TaskExecutionService's tolerance for the equivalent race.
      const raced = await this.ledgerRepository.getTransactionByIdempotencyKey(idempotency_key);
      if (raced) return this.replayResult(raced, input.user_id);
      throw error;
    }

    return { redemption, balance: await this.getSpendableBalance(input.user_id) };
  }

  private async replayResult(debit: RewardTransaction, user_id: string): Promise<RedeemRewardResult> {
    const redemption = debit.redemption_id ? await this.rewardRepository.getRedemption(debit.redemption_id) : null;
    if (!redemption) throw new Error(`Redemption debit ${debit.transaction_id} has no corresponding RewardRedemption`);
    return { redemption, balance: await this.getSpendableBalance(user_id) };
  }
}

