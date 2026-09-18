import { describe, expect, it } from 'vitest';
import { InMemoryRewardRepository } from './reward.repository.memory.js';
import { InMemoryLedgerRepository } from './ledger.repository.memory.js';
import type { Reward, RewardRedemption } from '../types/reward.js';
import type { RewardTransaction } from '../types/task-domain.types.js';

function makeReward(overrides: Partial<Reward> = {}): Reward {
  return {
    id: 'reward-1',
    title: 'Movie night',
    description: 'Pick the movie',
    category: 'experience',
    base_cost: 5,
    is_discountable: false,
    is_active: true,
    ...overrides,
  };
}

function makeRedemption(overrides: Partial<RewardRedemption> = {}): RewardRedemption {
  return {
    id: 'redemption-1',
    user_id: 'participant-1',
    reward_id: 'reward-1',
    base_cost: 5,
    final_cost_paid: 5,
    redeemed_at: '2026-01-05T08:00:00Z',
    ...overrides,
  };
}

function makeDebit(overrides: Partial<RewardTransaction> = {}): RewardTransaction {
  return {
    transaction_id: 'transaction-1',
    idempotency_key: 'reward-1:participant-1:nonce-1',
    reward_event_type: 'reward_redemption',
    reward_owner_user_id: 'participant-1',
    redemption_id: 'redemption-1',
    yield: { primary_xp: 0, secondary_yields: [], credits_earned: -5 },
    processed_at: '2026-01-05T08:00:00Z',
    ...overrides,
  };
}

describe('InMemoryRewardRepository', () => {
  it('stores and retrieves a reward by id, and lists rewards sorted by title', async () => {
    const repository = new InMemoryRewardRepository(new InMemoryLedgerRepository());
    await repository.saveReward(makeReward({ id: 'reward-2', title: 'Zzz nap' }));
    await repository.saveReward(makeReward({ id: 'reward-1', title: 'Movie night' }));

    expect(await repository.getReward('reward-1')).toEqual(makeReward());
    expect((await repository.listRewards()).map((reward) => reward.id)).toEqual(['reward-1', 'reward-2']);
  });

  it('returns null for an unknown reward', async () => {
    const repository = new InMemoryRewardRepository(new InMemoryLedgerRepository());
    expect(await repository.getReward('missing')).toBeNull();
  });

  it('updates a reward in place on a second save (same id)', async () => {
    const repository = new InMemoryRewardRepository(new InMemoryLedgerRepository());
    await repository.saveReward(makeReward());
    await repository.saveReward(makeReward({ base_cost: 8 }));

    expect((await repository.getReward('reward-1'))?.base_cost).toBe(8);
  });

  it('saves a redemption and its debit atomically, both retrievable afterward', async () => {
    const ledgerRepository = new InMemoryLedgerRepository();
    const repository = new InMemoryRewardRepository(ledgerRepository);
    const redemption = makeRedemption();
    const debit = makeDebit();

    await repository.saveRedemptionWithDebit(redemption, debit);

    expect(await repository.getRedemption('redemption-1')).toEqual(redemption);
    expect(await ledgerRepository.getTransactionByIdempotencyKey(debit.idempotency_key)).toEqual(debit);
  });

  it('lists redemptions for a participant, sorted by redemption time', async () => {
    const repository = new InMemoryRewardRepository(new InMemoryLedgerRepository());
    await repository.saveRedemptionWithDebit(
      makeRedemption({ id: 'redemption-2', redeemed_at: '2026-01-06T08:00:00Z' }),
      makeDebit({ transaction_id: 'transaction-2', idempotency_key: 'reward-1:participant-1:nonce-2', redemption_id: 'redemption-2' }),
    );
    await repository.saveRedemptionWithDebit(
      makeRedemption({ id: 'redemption-1', redeemed_at: '2026-01-05T08:00:00Z' }),
      makeDebit(),
    );

    const redemptions = await repository.listRedemptionsForParticipant('participant-1');
    expect(redemptions.map((redemption) => redemption.id)).toEqual(['redemption-1', 'redemption-2']);
  });
});
