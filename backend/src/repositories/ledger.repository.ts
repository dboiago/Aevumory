import type { RewardAdjustmentTransaction, RewardTransaction } from '../types/task-domain.types.js';

/**
 * Persisted `RewardTransaction` / `RewardAdjustmentTransaction` ledger.
 *
 * `getTransactionByIdempotencyKey` is the idempotency guard TaskExecutionService
 * must consult before creating a new transaction — an identical logical reward
 * event (same task/cycle/owner/event-type) must never produce a duplicate row
 * (FUNCTIONAL_FOUNDATION_PLAN.md Phase 3).
 */
export interface LedgerRepository {
  getTransaction(transaction_id: string): Promise<RewardTransaction | null>;
  getTransactionByIdempotencyKey(idempotency_key: string): Promise<RewardTransaction | null>;
  saveTransaction(transaction: RewardTransaction): Promise<void>;
  listTransactionsForOwner(reward_owner_user_id: string): Promise<RewardTransaction[]>;

  saveAdjustment(adjustment: RewardAdjustmentTransaction): Promise<void>;
  listAdjustmentsForTransaction(original_transaction_id: string): Promise<RewardAdjustmentTransaction[]>;
  listAdjustmentsForOwner(reward_owner_user_id: string): Promise<RewardAdjustmentTransaction[]>;
}
