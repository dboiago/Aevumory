import type { Reward, RewardRedemption } from '../types/reward.js';
import type { RewardTransaction } from '../types/task-domain.types.js';
import type { RewardRepository } from '../repositories/reward.repository.js';
import type { LedgerRepository } from '../repositories/ledger.repository.js';

/**
 * In-memory RewardRepository, mirroring InMemoryLedgerRepository — used by
 * fast service-level unit tests (reward.service.test.ts), matching every
 * other repository pair in this codebase (memory + SQLite).
 *
 * Takes the same `LedgerRepository` instance the rest of the harness uses so
 * `saveRedemptionWithDebit` writes the debiting RewardTransaction through it
 * — there is nothing to "fail partway" for synchronous in-memory Maps, so
 * this trivially satisfies the atomicity requirement SqliteRewardRepository
 * needs a real `db.transaction()` for.
 */
export class InMemoryRewardRepository implements RewardRepository {
  private readonly rewards = new Map<string, Reward>();
  private readonly redemptions = new Map<string, RewardRedemption>();

  constructor(private readonly ledgerRepository: LedgerRepository) {}

  listRewards(): Promise<Reward[]> {
    const rewards = [...this.rewards.values()].sort((a, b) => a.title.localeCompare(b.title));
    return Promise.resolve(rewards);
  }

  getReward(reward_id: string): Promise<Reward | null> {
    return Promise.resolve(this.rewards.get(reward_id) ?? null);
  }

  saveReward(reward: Reward): Promise<void> {
    this.rewards.set(reward.id, reward);
    return Promise.resolve();
  }

  getRedemption(redemption_id: string): Promise<RewardRedemption | null> {
    return Promise.resolve(this.redemptions.get(redemption_id) ?? null);
  }

  listRedemptionsForParticipant(user_id: string): Promise<RewardRedemption[]> {
    const redemptions = [...this.redemptions.values()]
      .filter((redemption) => redemption.user_id === user_id)
      .sort((a, b) => a.redeemed_at.localeCompare(b.redeemed_at));
    return Promise.resolve(redemptions);
  }

  async saveRedemptionWithDebit(redemption: RewardRedemption, debit: RewardTransaction): Promise<void> {
    this.redemptions.set(redemption.id, redemption);
    await this.ledgerRepository.saveTransaction(debit);
  }
}
