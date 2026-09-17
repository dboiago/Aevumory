import { describe, expect, it } from 'vitest';
import { InMemoryLedgerRepository } from './ledger.repository.memory.js';
import type { RewardAdjustmentTransaction, RewardTransaction } from '../types/task-domain.types.js';

function makeTransaction(overrides: Partial<RewardTransaction> = {}): RewardTransaction {
  return {
    transaction_id: 'transaction-1',
    idempotency_key: 'task-1:task-1:2026-01-05:participant-1:completion',
    task_id: 'task-1',
    cycle_id: 'task-1:2026-01-05',
    reward_event_type: 'completion',
    reward_owner_user_id: 'participant-1',
    yield: { primary_discipline: 'order', primary_xp: 5, secondary_yields: [], credits_earned: 0.5 },
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

describe('InMemoryLedgerRepository', () => {
  it('stores and retrieves a transaction by id and by idempotency key', async () => {
    const repository = new InMemoryLedgerRepository();
    const transaction = makeTransaction();

    await repository.saveTransaction(transaction);

    expect(await repository.getTransaction('transaction-1')).toEqual(transaction);
    expect(await repository.getTransactionByIdempotencyKey(transaction.idempotency_key)).toEqual(transaction);
  });

  it('returns null for an unknown idempotency key', async () => {
    const repository = new InMemoryLedgerRepository();
    expect(await repository.getTransactionByIdempotencyKey('missing')).toBeNull();
  });

  it('distinguishes a foothold-initiation transaction from a completion transaction on the same cycle/owner', async () => {
    const repository = new InMemoryLedgerRepository();
    const foothold = makeTransaction({
      transaction_id: 'transaction-foothold',
      idempotency_key: 'task-1:task-1:2026-01-05:participant-1:foothold_initiation',
      reward_event_type: 'foothold_initiation',
    });
    const completion = makeTransaction();

    await repository.saveTransaction(foothold);
    await repository.saveTransaction(completion);

    const owned = await repository.listTransactionsForOwner('participant-1');
    expect(owned.map((transaction) => transaction.transaction_id).sort()).toEqual(['transaction-1', 'transaction-foothold']);
  });

  it('lists adjustments for a given original transaction', async () => {
    const repository = new InMemoryLedgerRepository();
    await repository.saveTransaction(makeTransaction());
    await repository.saveAdjustment(makeAdjustment());

    expect(await repository.listAdjustmentsForTransaction('transaction-1')).toEqual([makeAdjustment()]);
  });

  it('lists adjustments for a participant via their owned transactions', async () => {
    const repository = new InMemoryLedgerRepository();
    await repository.saveTransaction(makeTransaction({ reward_owner_user_id: 'participant-1' }));
    await repository.saveAdjustment(makeAdjustment());

    expect(await repository.listAdjustmentsForOwner('participant-1')).toEqual([makeAdjustment()]);
    expect(await repository.listAdjustmentsForOwner('participant-2')).toEqual([]);
  });
});
