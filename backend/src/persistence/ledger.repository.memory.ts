import type { RewardAdjustmentTransaction, RewardTransaction } from '../types/task-domain.types.js';
import type { LedgerRepository } from '../repositories/ledger.repository.js';

export class InMemoryLedgerRepository implements LedgerRepository {
  private readonly transactions = new Map<string, RewardTransaction>();
  private readonly adjustments = new Map<string, RewardAdjustmentTransaction>();

  getTransaction(transaction_id: string): Promise<RewardTransaction | null> {
    return Promise.resolve(this.transactions.get(transaction_id) ?? null);
  }

  getTransactionByIdempotencyKey(idempotency_key: string): Promise<RewardTransaction | null> {
    for (const transaction of this.transactions.values()) {
      if (transaction.idempotency_key === idempotency_key) return Promise.resolve(transaction);
    }
    return Promise.resolve(null);
  }

  saveTransaction(transaction: RewardTransaction): Promise<void> {
    this.transactions.set(transaction.transaction_id, transaction);
    return Promise.resolve();
  }

  listTransactionsForOwner(reward_owner_user_id: string): Promise<RewardTransaction[]> {
    const transactions = [...this.transactions.values()]
      .filter((transaction) => transaction.reward_owner_user_id === reward_owner_user_id)
      .sort((a, b) => a.processed_at.localeCompare(b.processed_at));
    return Promise.resolve(transactions);
  }

  saveAdjustment(adjustment: RewardAdjustmentTransaction): Promise<void> {
    this.adjustments.set(adjustment.adjustment_id, adjustment);
    return Promise.resolve();
  }

  listAdjustmentsForTransaction(original_transaction_id: string): Promise<RewardAdjustmentTransaction[]> {
    const adjustments = [...this.adjustments.values()]
      .filter((adjustment) => adjustment.original_transaction_id === original_transaction_id)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    return Promise.resolve(adjustments);
  }

  async listAdjustmentsForOwner(reward_owner_user_id: string): Promise<RewardAdjustmentTransaction[]> {
    const ownedTransactionIds = new Set(
      (await this.listTransactionsForOwner(reward_owner_user_id)).map((transaction) => transaction.transaction_id),
    );
    const adjustments = [...this.adjustments.values()]
      .filter((adjustment) => ownedTransactionIds.has(adjustment.original_transaction_id))
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    return adjustments;
  }
}
