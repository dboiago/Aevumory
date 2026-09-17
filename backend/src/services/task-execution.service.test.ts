import { describe, expect, it } from 'vitest';
import { InMemoryTaskRepository } from '../persistence/task.repository.memory.js';
import { InMemoryExecutionRepository } from '../persistence/execution.repository.memory.js';
import { InMemoryLedgerRepository } from '../persistence/ledger.repository.memory.js';
import { InMemoryUserTaskStateRepository } from '../persistence/user-task-state.repository.memory.js';
import { TaskService, type CreateTaskInput } from './task.service.js';
import {
  FootholdNotSupportedError,
  InvalidCycleStateError,
  TaskExecutionService,
} from './task-execution.service.js';

function createTaskInput(overrides: Partial<CreateTaskInput> = {}): CreateTaskInput {
  return {
    title: 'Water plants',
    primary_discipline: 'order',
    source_type: 'core',
    created_by_user_id: 'participant-1',
    assignment: { scope: 'individual', assigned_user_id: 'participant-1', owner_id: 'participant-1' },
    schedule: { cadence_type: 'one_off', series_anchor_date: '2026-01-05', delay_policy: 'none', has_strict_window: false },
    supports_foothold: false,
    duration_tier: 'quick', // 5 minutes -> 5 XP, 0.5 Credits
    effort_type: 'physical',
    cognitive_load: 'low',
    ...overrides,
  };
}

function makeHarness() {
  const taskRepository = new InMemoryTaskRepository();
  const executionRepository = new InMemoryExecutionRepository();
  const ledgerRepository = new InMemoryLedgerRepository();
  const userTaskStateRepository = new InMemoryUserTaskStateRepository();
  const taskService = new TaskService(taskRepository);
  const executionService = new TaskExecutionService(
    taskService,
    taskRepository,
    executionRepository,
    ledgerRepository,
    userTaskStateRepository,
  );
  return { taskRepository, executionRepository, ledgerRepository, userTaskStateRepository, taskService, executionService };
}

describe('TaskExecutionService — completion', () => {
  it('completes a valid pending cycle, persisting the cycle transition and an execution event', async () => {
    const { taskService, executionService, taskRepository, executionRepository } = makeHarness();
    const task = await taskService.createTask(createTaskInput());
    const cycleId = `${task.task_id}:2026-01-05`;

    const result = await executionService.completeCycle(cycleId, { completed_by_user_id: 'participant-1' });

    expect(result.cycle.status).toBe('satisfied');
    expect(result.cycle.satisfied_at).toBeTruthy();
    expect(result.cycle.resolved_at).toBeTruthy();

    const persistedCycle = await taskRepository.getCycle(cycleId);
    expect(persistedCycle?.status).toBe('satisfied');

    expect(result.executionEvent?.outcome_type).toBe('completed');
    const events = await executionRepository.listExecutionEventsForCycle(cycleId);
    expect(events).toHaveLength(1);
  });

  it('attributes the ordinary reward to the responsible participant regardless of who physically completed it', async () => {
    const { taskService, executionService } = makeHarness();
    const task = await taskService.createTask(createTaskInput());
    const cycleId = `${task.task_id}:2026-01-05`;

    const result = await executionService.completeCycle(cycleId, { completed_by_user_id: 'participant-2' });

    expect(result.transaction?.reward_owner_user_id).toBe('participant-1');
    expect(result.executionEvent?.completed_by_user_id).toBe('participant-2');
    expect(result.executionEvent?.responsible_user_id).toBe('participant-1');
  });

  it('computes the completion reward from backend configuration (duration_tier base yield), never a task-supplied amount', async () => {
    const { taskService, executionService } = makeHarness();
    const task = await taskService.createTask(createTaskInput({ duration_tier: 'quick', primary_discipline: 'order' }));
    const cycleId = `${task.task_id}:2026-01-05`;

    const result = await executionService.completeCycle(cycleId, {});

    expect(result.transaction?.yield).toEqual({
      primary_discipline: 'order',
      primary_xp: 5,
      secondary_yields: [],
      credits_earned: 0.5,
    });
  });

  it('rejects completing a cycle that is not pending', async () => {
    const { taskService, executionService } = makeHarness();
    const task = await taskService.createTask(createTaskInput());
    const cycleId = `${task.task_id}:2026-01-05`;
    await executionService.completeCycle(cycleId, {});

    await expect(executionService.completeCycle(cycleId, {})).rejects.toThrow(InvalidCycleStateError);
  });

  it('never creates a second completion transaction once a cycle is already satisfied', async () => {
    const { taskService, executionService, ledgerRepository } = makeHarness();
    const task = await taskService.createTask(createTaskInput());
    const cycleId = `${task.task_id}:2026-01-05`;

    await executionService.completeCycle(cycleId, {});
    await expect(executionService.completeCycle(cycleId, {})).rejects.toThrow(InvalidCycleStateError);

    const transactions = await ledgerRepository.listTransactionsForOwner('participant-1');
    expect(transactions.filter((transaction) => transaction.reward_event_type === 'completion')).toHaveLength(1);
  });
});

describe('TaskExecutionService — Foothold', () => {
  it('establishes a Foothold for a task that supports it on a pending cycle', async () => {
    const { taskService, executionService } = makeHarness();
    const task = await taskService.createTask(createTaskInput({ supports_foothold: true }));
    const cycleId = `${task.task_id}:2026-01-05`;

    const result = await executionService.establishFoothold(cycleId, { completed_by_user_id: 'participant-1' });

    expect(result.state?.state).toBe('foothold_established');
    expect(result.cycle.status).toBe('pending'); // Foothold never represents partial completion
    expect(result.transaction?.reward_event_type).toBe('foothold_initiation');
  });

  it('rejects establishing a Foothold on a task that does not support it', async () => {
    const { taskService, executionService } = makeHarness();
    const task = await taskService.createTask(createTaskInput({ supports_foothold: false }));
    const cycleId = `${task.task_id}:2026-01-05`;

    await expect(executionService.establishFoothold(cycleId, {})).rejects.toThrow(FootholdNotSupportedError);
  });

  it('awards only a ratio of the base yield for Foothold initiation (engine.config.ts REASON_ENGINE_CONFIG)', async () => {
    const { taskService, executionService } = makeHarness();
    const task = await taskService.createTask(
      createTaskInput({ supports_foothold: true, duration_tier: 'quick', primary_discipline: 'order' }),
    );
    const cycleId = `${task.task_id}:2026-01-05`;

    const result = await executionService.establishFoothold(cycleId, {});

    // quick = 5 base XP * 0.35 ratio = 1.75 -> rounds to 1.8; 0.5 credits * 0.35 = 0.175 -> 0.2
    expect(result.transaction?.yield.primary_xp).toBe(1.8);
    expect(result.transaction?.yield.credits_earned).toBe(0.2);
  });

  it('does not repeatedly generate the initiation reward on repeated Foothold establishment (idempotent)', async () => {
    const { taskService, executionService, ledgerRepository } = makeHarness();
    const task = await taskService.createTask(createTaskInput({ supports_foothold: true }));
    const cycleId = `${task.task_id}:2026-01-05`;

    const first = await executionService.establishFoothold(cycleId, {});
    const second = await executionService.establishFoothold(cycleId, {});

    expect(second.transaction).toBeNull();
    expect(second.state?.state).toBe('foothold_established');

    const allForOwner = await ledgerRepository.listTransactionsForOwner('participant-1');
    expect(allForOwner.filter((transaction) => transaction.reward_event_type === 'foothold_initiation')).toHaveLength(1);
    expect(first.transaction).not.toBeNull();
  });

  it('awards the remaining share of the base yield on completion after a Foothold was established, so the total never exceeds the base yield', async () => {
    const { taskService, executionService } = makeHarness();
    const task = await taskService.createTask(
      createTaskInput({ supports_foothold: true, duration_tier: 'quick', primary_discipline: 'order' }),
    );
    const cycleId = `${task.task_id}:2026-01-05`;

    await executionService.establishFoothold(cycleId, {}); // 1.8 XP / 0.2 credits
    const completion = await executionService.completeCycle(cycleId, {});

    // Remaining share: 5 * (1 - 0.35) = 3.25 -> 3.3 XP; 0.5 * 0.65 = 0.325 -> 0.3 credits
    expect(completion.transaction?.yield.primary_xp).toBe(3.3);
    expect(completion.transaction?.yield.credits_earned).toBe(0.3);
  });

  it('distinguishes the Foothold-initiation transaction from the completion transaction on the same task/cycle/owner', async () => {
    const { taskService, executionService, ledgerRepository } = makeHarness();
    const task = await taskService.createTask(createTaskInput({ supports_foothold: true }));
    const cycleId = `${task.task_id}:2026-01-05`;

    const foothold = await executionService.establishFoothold(cycleId, {});
    const completion = await executionService.completeCycle(cycleId, {});

    expect(foothold.transaction?.idempotency_key).not.toBe(completion.transaction?.idempotency_key);
    const transactions = await ledgerRepository.listTransactionsForOwner('participant-1');
    expect(transactions).toHaveLength(2);
  });
});

describe('TaskExecutionService — Deductive Pruning', () => {
  it('records a deductively_pruned execution event and supersedes the cycle', async () => {
    const { taskService, executionService, taskRepository } = makeHarness();
    const task = await taskService.createTask(createTaskInput());
    const cycleId = `${task.task_id}:2026-01-05`;

    const result = await executionService.pruneCycle(cycleId, { reason_code: 'external_event_resolved', note: 'done elsewhere' });

    expect(result.executionEvent?.outcome_type).toBe('deductively_pruned');
    expect(result.executionEvent?.prune_reason_code).toBe('external_event_resolved');
    expect((await taskRepository.getCycle(cycleId))?.status).toBe('superseded');
  });

  it('awards Reason Discipline XP with zero Credits, not the task\'s own primary Discipline reward', async () => {
    const { taskService, executionService } = makeHarness();
    const task = await taskService.createTask(createTaskInput({ primary_discipline: 'motion' }));
    const cycleId = `${task.task_id}:2026-01-05`;

    const result = await executionService.pruneCycle(cycleId, { reason_code: 'condition_no_longer_exists' });

    expect(result.transaction?.yield.primary_discipline).toBe('reason');
    expect(result.transaction?.yield.credits_earned).toBe(0);
  });

  it('rejects pruning a cycle that is not pending', async () => {
    const { taskService, executionService } = makeHarness();
    const task = await taskService.createTask(createTaskInput());
    const cycleId = `${task.task_id}:2026-01-05`;
    await executionService.completeCycle(cycleId, {});

    await expect(executionService.pruneCycle(cycleId, { reason_code: 'x' })).rejects.toThrow(InvalidCycleStateError);
  });
});

describe('TaskExecutionService — reward adjustments (corrective reversal)', () => {
  it('reverses a completion, reopening the cycle without editing the original transaction', async () => {
    const { taskService, executionService, taskRepository } = makeHarness();
    const task = await taskService.createTask(createTaskInput());
    const cycleId = `${task.task_id}:2026-01-05`;
    const completion = await executionService.completeCycle(cycleId, {});

    const { adjustment, cycle } = await executionService.createRewardAdjustment({
      original_transaction_id: completion.transaction!.transaction_id,
      reason: 'admin_reversal',
      xp_adjustments: [{ discipline: 'order', xp_delta: -5 }],
      credits_delta: -0.5,
      created_by_user_id: 'admin-1',
    });

    expect(adjustment.original_transaction_id).toBe(completion.transaction!.transaction_id);
    expect(cycle?.status).toBe('pending');
    expect((await taskRepository.getCycle(cycleId))?.status).toBe('pending');
  });

  it('allows legitimate re-completion after a reversal (does not double-collide on idempotency)', async () => {
    const { taskService, executionService } = makeHarness();
    const task = await taskService.createTask(createTaskInput());
    const cycleId = `${task.task_id}:2026-01-05`;
    const completion = await executionService.completeCycle(cycleId, {});

    await executionService.createRewardAdjustment({
      original_transaction_id: completion.transaction!.transaction_id,
      reason: 'invalidated_pruning',
      xp_adjustments: [{ discipline: 'order', xp_delta: -5 }],
      credits_delta: -0.5,
      created_by_user_id: 'admin-1',
    });

    const secondCompletion = await executionService.completeCycle(cycleId, {});
    expect(secondCompletion.transaction?.transaction_id).not.toBe(completion.transaction?.transaction_id);
    expect(secondCompletion.transaction?.idempotency_key).not.toBe(completion.transaction?.idempotency_key);
    expect(secondCompletion.transaction?.idempotency_key).toBe(`${completion.transaction?.idempotency_key}:2`);
  });

  it('resets Foothold state to active on reversal so a fresh Foothold can be legitimately re-earned', async () => {
    const { taskService, executionService, userTaskStateRepository } = makeHarness();
    const task = await taskService.createTask(createTaskInput({ supports_foothold: true }));
    const cycleId = `${task.task_id}:2026-01-05`;
    const foothold = await executionService.establishFoothold(cycleId, {});

    await executionService.createRewardAdjustment({
      original_transaction_id: foothold.transaction!.transaction_id,
      reason: 'admin_reversal',
      xp_adjustments: [{ discipline: 'order', xp_delta: -2 }],
      credits_delta: -0.2,
      created_by_user_id: 'admin-1',
    });

    expect((await userTaskStateRepository.get(cycleId, 'participant-1'))?.state).toBe('active');

    const secondFoothold = await executionService.establishFoothold(cycleId, {});
    expect(secondFoothold.transaction).not.toBeNull();
    expect(secondFoothold.transaction?.transaction_id).not.toBe(foothold.transaction?.transaction_id);
    expect(secondFoothold.transaction?.idempotency_key).toBe(`${foothold.transaction?.idempotency_key}:2`);
  });
});

describe('TaskExecutionService — participant ledger', () => {
  it('computes a participant balance as the sum of transaction credits plus adjustment deltas', async () => {
    const { taskService, executionService } = makeHarness();
    const task = await taskService.createTask(createTaskInput({ duration_tier: 'quick' }));
    const cycleId = `${task.task_id}:2026-01-05`;
    const completion = await executionService.completeCycle(cycleId, {});

    await executionService.createRewardAdjustment({
      original_transaction_id: completion.transaction!.transaction_id,
      reason: 'system_correction',
      xp_adjustments: [{ discipline: 'order', xp_delta: -1 }],
      credits_delta: -0.1,
      created_by_user_id: 'admin-1',
    });

    const ledger = await executionService.getParticipantLedger('participant-1');
    expect(ledger.balance).toBeCloseTo(0.4);
    expect(ledger.transactions).toHaveLength(1);
    expect(ledger.adjustments).toHaveLength(1);
  });
});
