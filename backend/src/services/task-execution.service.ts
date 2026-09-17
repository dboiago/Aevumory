/**
 * Task Execution Service
 *
 * Application-service boundary for Task→Cycle→ExecutionEvent→RewardTransaction
 * (FUNCTIONAL_FOUNDATION_PLAN.md Phase 3): completion, Foothold initiation,
 * Deductive Pruning, and administrative reward-adjustment corrections.
 * Route handlers must not talk to ExecutionRepository/LedgerRepository/
 * UserTaskStateRepository directly.
 *
 * Idempotency: every RewardTransaction carries an `idempotency_key` of
 * `${task_id}:${cycle_id}:${reward_owner_user_id ?? 'unassigned'}:${reward_event_type}`.
 * `reward_event_type` is the discriminator that keeps a Foothold initiation
 * reward and a completion reward on the same task/cycle/owner from colliding
 * (Phase 3 planning correction). Every mutating method checks
 * `LedgerRepository.getTransactionByIdempotencyKey` before creating a new
 * transaction, so a retried request is always safe.
 *
 * Foothold state (`UserTaskCycleState`) is the single authoritative home for
 * `UserTaskState` — never inferred from ExecutionEvent or RewardTransaction
 * rows, and never stored back on `Task` (see task-domain.types.ts).
 */

import { randomUUID } from 'node:crypto';
import type {
  ExecutionEvent,
  RewardAdjustmentReason,
  RewardAdjustmentTransaction,
  RewardEventType,
  RewardTransaction,
  Task,
  TaskCycle,
  UserTaskCycleState,
} from '../types/task-domain.types.js';
import type { TaskRepository } from '../repositories/task.repository.js';
import type { ExecutionRepository } from '../repositories/execution.repository.js';
import type { LedgerRepository } from '../repositories/ledger.repository.js';
import type { UserTaskStateRepository } from '../repositories/user-task-state.repository.js';
import { REASON_ENGINE_CONFIG } from '../config/engine.config.js';
import { TaskNotFoundError, TaskService } from './task.service.js';
import { computeBaseYield, computeReasonYield, scaleYield } from './reward-yield.engine.js';

export class InvalidCycleStateError extends Error {
  constructor(cycle_id: string, reason: string) {
    super(`Task cycle ${cycle_id} is not in a valid state: ${reason}`);
  }
}

export class FootholdNotSupportedError extends Error {
  constructor(task_id: string) {
    super(`Task ${task_id} does not support Foothold`);
  }
}

export class RewardTransactionNotFoundError extends Error {
  constructor(transaction_id: string) {
    super(`Reward transaction not found: ${transaction_id}`);
  }
}

export interface CompleteCycleInput {
  completed_by_user_id?: string;
}

export interface EstablishFootholdInput {
  completed_by_user_id?: string;
}

export interface PruneCycleInput {
  reason_code: string;
  note?: string;
  linked_task_id?: string;
  completed_by_user_id?: string;
}

export interface CreateRewardAdjustmentInput {
  original_transaction_id: string;
  reason: RewardAdjustmentReason;
  xp_adjustments: Array<{ discipline: RewardAdjustmentTransaction['xp_adjustments'][number]['discipline']; xp_delta: number }>;
  credits_delta: number;
  created_by_user_id: string;
}

export interface ExecutionResult {
  cycle: TaskCycle;
  transaction: RewardTransaction | null;
  executionEvent: ExecutionEvent | null;
  state: UserTaskCycleState | null;
}

export interface ParticipantLedger {
  reward_owner_user_id: string;
  balance: number;
  transactions: RewardTransaction[];
  adjustments: RewardAdjustmentTransaction[];
}

function buildIdempotencyKey(
  task_id: string,
  cycle_id: string,
  reward_owner_user_id: string | undefined,
  reward_event_type: RewardEventType,
): string {
  return `${task_id}:${cycle_id}:${reward_owner_user_id ?? 'unassigned'}:${reward_event_type}`;
}

export class TaskExecutionService {
  constructor(
    private readonly taskService: TaskService,
    private readonly taskRepository: TaskRepository,
    private readonly executionRepository: ExecutionRepository,
    private readonly ledgerRepository: LedgerRepository,
    private readonly userTaskStateRepository: UserTaskStateRepository,
  ) {}

  /**
   * TASK_LIFECYCLE.md §2: a task instance may receive exactly one initiation
   * reward during its active lifecycle. Repeating this action once Foothold
   * is already established (or the cycle is already completed) is an
   * idempotent no-op — no new state row or transaction is created.
   */
  async establishFoothold(cycle_id: string, input: EstablishFootholdInput): Promise<ExecutionResult> {
    const cycle = await this.taskService.getOrMaterializeCycle(cycle_id);
    const task = await this.requireTask(cycle.task_id);

    if (!task.supports_foothold) throw new FootholdNotSupportedError(task.task_id);
    if (cycle.status !== 'pending') throw new InvalidCycleStateError(cycle_id, `cycle status is '${cycle.status}'`);

    const user_id = cycle.responsible_user_id ?? input.completed_by_user_id;
    if (!user_id) {
      throw new Error('A responsible or acting participant is required to establish a Foothold');
    }

    const existingState = await this.userTaskStateRepository.get(cycle_id, user_id);
    if (existingState && existingState.state !== 'active') {
      // Already footheld or completed — Foothold initiation reward is single-award-per-lifecycle.
      return { cycle, transaction: null, executionEvent: null, state: existingState };
    }

    const idempotency_key = buildIdempotencyKey(task.task_id, cycle_id, user_id, 'foothold_initiation');
    const existingTransaction = await this.ledgerRepository.getTransactionByIdempotencyKey(idempotency_key);
    if (existingTransaction) {
      return { cycle, transaction: existingTransaction, executionEvent: null, state: existingState };
    }

    const baseYield = computeBaseYield(task);
    const footholdYield = scaleYield(baseYield, REASON_ENGINE_CONFIG.foothold_initiation_yield_ratio);

    const transaction: RewardTransaction = {
      transaction_id: randomUUID(),
      idempotency_key,
      task_id: task.task_id,
      cycle_id,
      reward_event_type: 'foothold_initiation',
      reward_owner_user_id: cycle.responsible_user_id,
      yield: footholdYield,
      processed_at: new Date().toISOString(),
    };
    await this.ledgerRepository.saveTransaction(transaction);

    const now = new Date().toISOString();
    const state: UserTaskCycleState = {
      task_id: task.task_id,
      cycle_id,
      user_id,
      state: 'foothold_established',
      foothold_established_at: now,
      updated_at: now,
    };
    await this.userTaskStateRepository.save(state);

    return { cycle, transaction, executionEvent: null, state };
  }

  /**
   * Completion never repeats: a cycle may transition pending -> satisfied
   * exactly once. If a Foothold was previously established for the
   * responsible/acting participant, the completion reward is the remaining
   * share of the base yield (base yield minus the already-awarded Foothold
   * share) so the total awarded across both events never exceeds the task's
   * ordinary base yield — see FUNCTIONAL_FOUNDATION_PLAN.md Phase 3 report
   * for this explicit reward-safety decision.
   */
  async completeCycle(cycle_id: string, input: CompleteCycleInput): Promise<ExecutionResult> {
    const cycle = await this.taskService.getOrMaterializeCycle(cycle_id);
    const task = await this.requireTask(cycle.task_id);

    if (cycle.status !== 'pending') throw new InvalidCycleStateError(cycle_id, `cycle status is '${cycle.status}'`);

    const reward_owner_user_id = cycle.responsible_user_id;
    const user_id = reward_owner_user_id ?? input.completed_by_user_id;
    const existingState = user_id ? await this.userTaskStateRepository.get(cycle_id, user_id) : null;

    const idempotency_key = buildIdempotencyKey(task.task_id, cycle_id, reward_owner_user_id, 'completion');
    const existingTransaction = await this.ledgerRepository.getTransactionByIdempotencyKey(idempotency_key);
    if (existingTransaction) {
      return { cycle, transaction: existingTransaction, executionEvent: null, state: existingState };
    }

    const baseYield = computeBaseYield(task);
    const completionYield = existingState?.state === 'foothold_established'
      ? scaleYield(baseYield, 1 - REASON_ENGINE_CONFIG.foothold_initiation_yield_ratio)
      : baseYield;

    const transaction: RewardTransaction = {
      transaction_id: randomUUID(),
      idempotency_key,
      task_id: task.task_id,
      cycle_id,
      reward_event_type: 'completion',
      reward_owner_user_id,
      yield: completionYield,
      processed_at: new Date().toISOString(),
    };
    await this.ledgerRepository.saveTransaction(transaction);

    const now = new Date().toISOString();
    const executionEvent: ExecutionEvent = {
      execution_id: randomUUID(),
      task_id: task.task_id,
      cycle_id,
      completed_by_user_id: input.completed_by_user_id,
      responsible_user_id: reward_owner_user_id,
      completed_at: now,
      source_type: task.source_type,
      outcome_type: 'completed',
    };
    await this.executionRepository.saveExecutionEvent(executionEvent);

    const updatedCycle: TaskCycle = {
      ...cycle,
      status: 'satisfied',
      satisfied_at: now,
      satisfied_by_user_id: input.completed_by_user_id ?? reward_owner_user_id,
      resolved_at: now,
    };
    await this.taskRepository.saveCycle(updatedCycle);

    let state: UserTaskCycleState | null = existingState;
    if (user_id) {
      state = {
        task_id: task.task_id,
        cycle_id,
        user_id,
        state: 'completed',
        foothold_established_at: existingState?.foothold_established_at,
        completed_at: now,
        updated_at: now,
      };
      await this.userTaskStateRepository.save(state);
    }

    return { cycle: updatedCycle, transaction, executionEvent, state };
  }

  /**
   * Deductive Pruning (TASK_LIFECYCLE.md §6): an alternative execution
   * outcome, not a deletion. Reuses the task's own base-yield magnitude (its
   * only documented measure of "burden") attributed to the `reason`
   * Discipline with zero Credits, since the physical work did not occur.
   * `superseded` is the closest existing CycleStatus to "work is no longer
   * required" — no new CycleStatus literal is introduced.
   */
  async pruneCycle(cycle_id: string, input: PruneCycleInput): Promise<ExecutionResult> {
    const cycle = await this.taskService.getOrMaterializeCycle(cycle_id);
    const task = await this.requireTask(cycle.task_id);

    if (cycle.status !== 'pending') throw new InvalidCycleStateError(cycle_id, `cycle status is '${cycle.status}'`);

    const reward_owner_user_id = cycle.responsible_user_id;
    const idempotency_key = buildIdempotencyKey(task.task_id, cycle_id, reward_owner_user_id, 'deductive_pruning');
    const existingTransaction = await this.ledgerRepository.getTransactionByIdempotencyKey(idempotency_key);
    if (existingTransaction) {
      return { cycle, transaction: existingTransaction, executionEvent: null, state: null };
    }

    const transaction: RewardTransaction = {
      transaction_id: randomUUID(),
      idempotency_key,
      task_id: task.task_id,
      cycle_id,
      reward_event_type: 'deductive_pruning',
      reward_owner_user_id,
      yield: computeReasonYield(task),
      processed_at: new Date().toISOString(),
    };
    await this.ledgerRepository.saveTransaction(transaction);

    const now = new Date().toISOString();
    const executionEvent: ExecutionEvent = {
      execution_id: randomUUID(),
      task_id: task.task_id,
      cycle_id,
      completed_by_user_id: input.completed_by_user_id,
      responsible_user_id: reward_owner_user_id,
      completed_at: now,
      source_type: task.source_type,
      outcome_type: 'deductively_pruned',
      prune_reason_code: input.reason_code,
      prune_note: input.note,
      prune_linked_task_id: input.linked_task_id,
    };
    await this.executionRepository.saveExecutionEvent(executionEvent);

    const updatedCycle: TaskCycle = { ...cycle, status: 'superseded', resolved_at: now };
    await this.taskRepository.saveCycle(updatedCycle);

    return { cycle: updatedCycle, transaction, executionEvent, state: null };
  }

  /**
   * Admin-only corrective action (CORE_BASELINE.md §6: "Corrective
   * Transactions"). Historical transactions are never edited — this only
   * ever appends a compensating row — but a completion/pruning reversal
   * reopens its cycle, and any related Foothold state resets to 'active', so
   * the participant cannot retain the reversed reward and also collect a
   * fresh one for the same already-rewarded action.
   */
  async createRewardAdjustment(input: CreateRewardAdjustmentInput): Promise<{
    adjustment: RewardAdjustmentTransaction;
    cycle: TaskCycle | null;
  }> {
    const original = await this.ledgerRepository.getTransaction(input.original_transaction_id);
    if (!original) throw new RewardTransactionNotFoundError(input.original_transaction_id);

    const adjustment: RewardAdjustmentTransaction = {
      adjustment_id: randomUUID(),
      original_transaction_id: input.original_transaction_id,
      reason: input.reason,
      xp_adjustments: input.xp_adjustments,
      credits_delta: input.credits_delta,
      created_at: new Date().toISOString(),
      created_by_user_id: input.created_by_user_id,
    };
    await this.ledgerRepository.saveAdjustment(adjustment);

    const cycle = await this.taskRepository.getCycle(original.cycle_id);
    if (!cycle) return { adjustment, cycle: null };

    if (original.reward_event_type === 'completion' || original.reward_event_type === 'deductive_pruning') {
      const reopened: TaskCycle = {
        ...cycle,
        status: 'pending',
        satisfied_at: undefined,
        satisfied_by_user_id: undefined,
        resolved_at: undefined,
      };
      await this.taskRepository.saveCycle(reopened);

      if (original.reward_owner_user_id) {
        await this.resetUserTaskState(original.task_id, original.cycle_id, original.reward_owner_user_id);
      }

      return { adjustment, cycle: reopened };
    }

    if (original.reward_event_type === 'foothold_initiation' && original.reward_owner_user_id) {
      await this.resetUserTaskState(original.task_id, original.cycle_id, original.reward_owner_user_id);
    }

    return { adjustment, cycle };
  }

  async getParticipantLedger(reward_owner_user_id: string): Promise<ParticipantLedger> {
    const [transactions, adjustments] = await Promise.all([
      this.ledgerRepository.listTransactionsForOwner(reward_owner_user_id),
      this.ledgerRepository.listAdjustmentsForOwner(reward_owner_user_id),
    ]);

    const balance =
      transactions.reduce((sum, transaction) => sum + transaction.yield.credits_earned, 0) +
      adjustments.reduce((sum, adjustment) => sum + adjustment.credits_delta, 0);

    return { reward_owner_user_id, balance, transactions, adjustments };
  }

  private async resetUserTaskState(task_id: string, cycle_id: string, user_id: string): Promise<void> {
    const existing = await this.userTaskStateRepository.get(cycle_id, user_id);
    if (!existing || existing.state === 'active') return;

    await this.userTaskStateRepository.save({
      task_id,
      cycle_id,
      user_id,
      state: 'active',
      foothold_established_at: undefined,
      completed_at: undefined,
      updated_at: new Date().toISOString(),
    });
  }

  private async requireTask(task_id: string): Promise<Task> {
    const task = await this.taskService.getTask(task_id);
    if (!task) throw new TaskNotFoundError(task_id);
    return task;
  }
}
