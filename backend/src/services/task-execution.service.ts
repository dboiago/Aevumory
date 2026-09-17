/**
 * Task Execution Service
 *
 * Application-service boundary for Task→Cycle→ExecutionEvent→RewardTransaction
 * (FUNCTIONAL_FOUNDATION_PLAN.md Phase 3): completion, Foothold initiation,
 * ordinary (non-completion) cycle resolution, and administrative
 * reward-adjustment corrections. Route handlers must not talk to
 * ExecutionRepository/LedgerRepository/UserTaskStateRepository directly.
 *
 * Four distinct outcomes, deliberately not collapsed into one another:
 *   - Completion: the task was actually done; earns the (remaining) base yield.
 *   - Foothold: meaningful initiation was actually done; earns a defined
 *     partial share of the base yield (see `establishFoothold`).
 *   - Ordinary resolution (`pruneCycle`): the cycle is resolved without being
 *     completed (condition no longer applies, another action satisfied it,
 *     etc.) — recorded for provenance/audit only. Resolving a cycle is not
 *     itself an earned reward.
 *   - Future Deductive Pruning: a not-yet-implemented, domain-specific
 *     Inquiry mechanic where genuine investigative work behind a resolution
 *     may justify a bounded reward. That reward must never be inferred
 *     merely because a cycle was resolved (see `pruneCycle`).
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
import { computeBaseYield, scaleYield } from './reward-yield.engine.js';

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
   * Establishes a Foothold: an earned intermediate execution state that
   * recognises meaningful real-world initiation of a supported task when
   * full completion is not yet appropriate. It is not partial completion,
   * and it is deliberately separate from generic task-progress tracking —
   * there is no percentage/step state, only active -> foothold_established
   * -> completed (`UserTaskCycleState`). The Foothold yield is earned by
   * that real initiation; a later completion earns the remaining yield (see
   * `completeCycle`). This applies to any task with `supports_foothold ===
   * true` where the model calls for it — Foothold is a general execution
   * concept, not a medical/accommodation-specific feature.
   *
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

    const { idempotency_key, reusableExisting } = await this.resolveRewardTransactionSlot(
      task.task_id,
      cycle_id,
      cycle.responsible_user_id,
      'foothold_initiation',
    );
    if (reusableExisting) {
      return { cycle, transaction: reusableExisting, executionEvent: null, state: existingState };
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
   * Completion: the task was actually done. A cycle may transition pending
   * -> satisfied exactly once. If a Foothold was previously established for
   * the responsible/acting participant, the completion reward is the
   * remaining share of the base yield (base yield minus the already-awarded
   * Foothold share) so the total awarded across both events never exceeds
   * the task's ordinary base yield — see FUNCTIONAL_FOUNDATION_PLAN.md
   * Phase 3 report for this explicit reward-safety decision.
   */
  async completeCycle(cycle_id: string, input: CompleteCycleInput): Promise<ExecutionResult> {
    const cycle = await this.taskService.getOrMaterializeCycle(cycle_id);
    const task = await this.requireTask(cycle.task_id);

    if (cycle.status !== 'pending') throw new InvalidCycleStateError(cycle_id, `cycle status is '${cycle.status}'`);

    const reward_owner_user_id = cycle.responsible_user_id;
    const user_id = reward_owner_user_id ?? input.completed_by_user_id;
    const existingState = user_id ? await this.userTaskStateRepository.get(cycle_id, user_id) : null;

    const { idempotency_key, reusableExisting } = await this.resolveRewardTransactionSlot(
      task.task_id,
      cycle_id,
      reward_owner_user_id,
      'completion',
    );
    if (reusableExisting) {
      return { cycle, transaction: reusableExisting, executionEvent: null, state: existingState };
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
   * Ordinary (non-completion) cycle resolution (TASK_LIFECYCLE.md §6): the
   * condition no longer applies, another action already satisfied it, or
   * investigation established the work is unnecessary. This records *what
   * happened and why* as an immutable, provenance-bearing ExecutionEvent —
   * it does NOT itself earn a reward. `superseded` is the closest existing
   * CycleStatus to "work is no longer required"; no new CycleStatus literal
   * is introduced.
   *
   * A future, domain-specific Inquiry mechanic ("Deductive Pruning") may
   * award a bounded reward when the resolution reflects real investigative
   * work — but that reward must never be inferred merely because a cycle
   * was resolved, and is deliberately NOT implemented here (see
   * `computeReasonYield` in reward-yield.engine.ts, reserved/unused pending
   * that future mechanic). The `prune`/`deductively_pruned` naming is kept
   * as-is (matching the already-documented `ExecutionOutcomeType` literal in
   * task-domain.types.ts) rather than introducing a second, competing name
   * for the same generic-resolution concept.
   */
  async pruneCycle(cycle_id: string, input: PruneCycleInput): Promise<ExecutionResult> {
    const cycle = await this.taskService.getOrMaterializeCycle(cycle_id);
    const task = await this.requireTask(cycle.task_id);

    if (cycle.status !== 'pending') throw new InvalidCycleStateError(cycle_id, `cycle status is '${cycle.status}'`);

    const reward_owner_user_id = cycle.responsible_user_id;

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

    return { cycle: updatedCycle, transaction: null, executionEvent, state: null };
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

    // 'deductive_pruning' is not produced by pruneCycle today (ordinary
    // resolution earns no reward) but stays handled here so a future
    // Inquiry-mechanic transaction of that type is reversible the same way.
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

  /**
   * Resolves the idempotency key + any existing transaction to reuse for a
   * given (task, cycle, owner, event type). A matching transaction with no
   * reward adjustments against it is a genuine retry and is reused as-is. A
   * matching transaction that HAS been reversed is "used up" — that
   * generation is skipped and the next numbered generation (`${baseKey}:2`,
   * `:3`, ...) is tried, since a legitimate subsequent event (e.g.
   * re-completing after an admin reversal) must not collide with the
   * reversed transaction's key nor be mistaken for a duplicate of it. This
   * never weakens the `reward_transactions.idempotency_key` UNIQUE
   * constraint — it only ever picks a fresh, still-unused key for a
   * genuinely new logical event.
   */
  private async resolveRewardTransactionSlot(
    task_id: string,
    cycle_id: string,
    reward_owner_user_id: string | undefined,
    reward_event_type: RewardEventType,
  ): Promise<{ idempotency_key: string; reusableExisting: RewardTransaction | null }> {
    const baseKey = buildIdempotencyKey(task_id, cycle_id, reward_owner_user_id, reward_event_type);

    for (let attempt = 1; ; attempt += 1) {
      const candidateKey = attempt === 1 ? baseKey : `${baseKey}:${attempt}`;
      const existing = await this.ledgerRepository.getTransactionByIdempotencyKey(candidateKey);
      if (!existing) return { idempotency_key: candidateKey, reusableExisting: null };

      const adjustments = await this.ledgerRepository.listAdjustmentsForTransaction(existing.transaction_id);
      if (adjustments.length === 0) return { idempotency_key: candidateKey, reusableExisting: existing };
    }
  }
}
