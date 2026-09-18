import { describe, expect, it } from 'vitest';
import { InMemoryTaskRepository } from '../persistence/task.repository.memory.js';
import { InMemoryExecutionRepository } from '../persistence/execution.repository.memory.js';
import { InMemoryLedgerRepository } from '../persistence/ledger.repository.memory.js';
import { InMemoryUserTaskStateRepository } from '../persistence/user-task-state.repository.memory.js';
import { InMemoryRewardRepository } from '../persistence/reward.repository.memory.js';
import { TaskService, type CreateTaskInput } from './task.service.js';
import { TaskExecutionService } from './task-execution.service.js';
import {
  InsufficientCreditsError,
  RewardInactiveError,
  RewardNotFoundError,
  RewardService,
  type CreateRewardInput,
} from './reward.service.js';

function createTaskInput(overrides: Partial<CreateTaskInput> = {}): CreateTaskInput {
  return {
    title: 'Deep clean kitchen',
    primary_discipline: 'order',
    source_type: 'core',
    created_by_user_id: 'participant-1',
    assignment: { scope: 'individual', assigned_user_id: 'participant-1', owner_id: 'participant-1' },
    schedule: { cadence_type: 'one_off', series_anchor_date: '2026-01-05', delay_policy: 'none', has_strict_window: false },
    supports_foothold: false,
    duration_tier: 'heavy', // 60 minutes -> 6.0 Credits
    effort_type: 'physical',
    cognitive_load: 'low',
    ...overrides,
  };
}

function rewardInput(overrides: Partial<CreateRewardInput> = {}): CreateRewardInput {
  return {
    title: 'Movie night',
    description: 'Pick the movie',
    category: 'experience',
    base_cost: 5,
    ...overrides,
  };
}

function makeHarness() {
  const taskRepository = new InMemoryTaskRepository();
  const executionRepository = new InMemoryExecutionRepository();
  const ledgerRepository = new InMemoryLedgerRepository();
  const userTaskStateRepository = new InMemoryUserTaskStateRepository();
  const rewardRepository = new InMemoryRewardRepository(ledgerRepository);

  const taskService = new TaskService(taskRepository);
  const taskExecutionService = new TaskExecutionService(
    taskService,
    taskRepository,
    executionRepository,
    ledgerRepository,
    userTaskStateRepository,
  );
  const rewardService = new RewardService(rewardRepository, ledgerRepository, taskExecutionService);

  return { taskService, taskExecutionService, rewardService, rewardRepository, ledgerRepository };
}

async function earnCredits(harness: ReturnType<typeof makeHarness>, userId: string, overrides: Partial<CreateTaskInput> = {}) {
  const task = await harness.taskService.createTask(
    createTaskInput({ assignment: { scope: 'individual', assigned_user_id: userId, owner_id: userId }, ...overrides }),
  );
  const cycleId = `${task.task_id}:2026-01-05`;
  const result = await harness.taskExecutionService.completeCycle(cycleId, { completed_by_user_id: userId });
  return result.transaction!.yield.credits_earned;
}

describe('RewardService — catalogue', () => {
  it('creates a reward with is_active defaulted true and is_discountable always false', async () => {
    const { rewardService } = makeHarness();
    const reward = await rewardService.createReward(rewardInput());

    expect(reward.is_active).toBe(true);
    expect(reward.is_discountable).toBe(false);
  });

  it('rejects creating a reward with an empty title or non-positive base_cost', async () => {
    const { rewardService } = makeHarness();
    await expect(rewardService.createReward(rewardInput({ title: '  ' }))).rejects.toThrow();
    await expect(rewardService.createReward(rewardInput({ base_cost: 0 }))).rejects.toThrow();
  });

  it('updates a reward, preserving fields that were not provided', async () => {
    const { rewardService } = makeHarness();
    const reward = await rewardService.createReward(rewardInput());

    const updated = await rewardService.updateReward(reward.id, { base_cost: 8 });
    expect(updated.base_cost).toBe(8);
    expect(updated.title).toBe(reward.title);
  });

  it('throws RewardNotFoundError when updating a reward that does not exist', async () => {
    const { rewardService } = makeHarness();
    await expect(rewardService.updateReward('missing', { base_cost: 1 })).rejects.toThrow(RewardNotFoundError);
  });
});

describe('RewardService — redemption', () => {
  it('redeems an affordable reward, producing a matching debit reflected in the ledger balance', async () => {
    const harness = makeHarness();
    const earned = await earnCredits(harness, 'participant-1');
    const reward = await harness.rewardService.createReward(rewardInput({ base_cost: 5 }));

    const result = await harness.rewardService.redeemReward(reward.id, {
      user_id: 'participant-1',
      idempotency_key: 'nonce-1',
    });

    expect(result.redemption.final_cost_paid).toBe(5);
    expect(result.balance).toBe(earned - 5);

    const ledger = await harness.taskExecutionService.getParticipantLedger('participant-1');
    expect(ledger.balance).toBe(earned - 5);
    const debit = ledger.transactions.find((transaction) => transaction.reward_event_type === 'reward_redemption');
    expect(debit?.yield.credits_earned).toBe(-5);
    expect(debit?.redemption_id).toBe(result.redemption.id);
  });

  it('does not attribute any Discipline XP to a redemption debit', async () => {
    const harness = makeHarness();
    await earnCredits(harness, 'participant-1');
    const reward = await harness.rewardService.createReward(rewardInput({ base_cost: 5 }));
    await harness.rewardService.redeemReward(reward.id, { user_id: 'participant-1', idempotency_key: 'nonce-1' });

    const ledger = await harness.taskExecutionService.getParticipantLedger('participant-1');
    const debit = ledger.transactions.find((transaction) => transaction.reward_event_type === 'reward_redemption');
    expect(debit?.yield.primary_discipline).toBeUndefined();
    expect(debit?.yield.primary_xp).toBe(0);
  });

  it('rejects redemption when the balance is insufficient, creating neither a redemption nor a debit', async () => {
    const harness = makeHarness();
    const earned = await earnCredits(harness, 'participant-1');
    const reward = await harness.rewardService.createReward(rewardInput({ base_cost: 100 }));

    await expect(
      harness.rewardService.redeemReward(reward.id, { user_id: 'participant-1', idempotency_key: 'nonce-1' }),
    ).rejects.toThrow(InsufficientCreditsError);

    const ledger = await harness.taskExecutionService.getParticipantLedger('participant-1');
    expect(ledger.balance).toBe(earned);
    expect(ledger.transactions.some((transaction) => transaction.reward_event_type === 'reward_redemption')).toBe(false);
    expect(await harness.rewardRepository.listRedemptionsForParticipant('participant-1')).toHaveLength(0);
  });

  it('rejects redeeming an inactive reward', async () => {
    const harness = makeHarness();
    await earnCredits(harness, 'participant-1');
    const reward = await harness.rewardService.createReward(rewardInput({ base_cost: 5, is_active: false }));

    await expect(
      harness.rewardService.redeemReward(reward.id, { user_id: 'participant-1', idempotency_key: 'nonce-1' }),
    ).rejects.toThrow(RewardInactiveError);
  });

  it('rejects redeeming a reward that does not exist', async () => {
    const harness = makeHarness();
    await expect(
      harness.rewardService.redeemReward('missing', { user_id: 'participant-1', idempotency_key: 'nonce-1' }),
    ).rejects.toThrow(RewardNotFoundError);
  });

  it('leaves the stored reward catalogue unchanged by redemption', async () => {
    const harness = makeHarness();
    await earnCredits(harness, 'participant-1');
    const reward = await harness.rewardService.createReward(rewardInput({ base_cost: 5 }));

    await harness.rewardService.redeemReward(reward.id, { user_id: 'participant-1', idempotency_key: 'nonce-1' });

    const stored = await harness.rewardRepository.getReward(reward.id);
    expect(stored).toEqual(reward);
  });

  it('does not create a duplicate debit for a repeated request with the same idempotency key', async () => {
    const harness = makeHarness();
    const earned = await earnCredits(harness, 'participant-1');
    const reward = await harness.rewardService.createReward(rewardInput({ base_cost: 5 }));

    const first = await harness.rewardService.redeemReward(reward.id, { user_id: 'participant-1', idempotency_key: 'nonce-1' });
    const second = await harness.rewardService.redeemReward(reward.id, { user_id: 'participant-1', idempotency_key: 'nonce-1' });

    expect(second.redemption.id).toBe(first.redemption.id);
    expect(second.balance).toBe(earned - 5);

    const ledger = await harness.taskExecutionService.getParticipantLedger('participant-1');
    const debits = ledger.transactions.filter((transaction) => transaction.reward_event_type === 'reward_redemption');
    expect(debits).toHaveLength(1);
  });

  it('allows a later, separate redemption of the same reward with a new idempotency key', async () => {
    const harness = makeHarness();
    const earned = await earnCredits(harness, 'participant-1', { duration_tier: 'heavy' }); // 6.0 credits, redeem twice at 3 each
    const reward = await harness.rewardService.createReward(rewardInput({ base_cost: 3 }));

    const first = await harness.rewardService.redeemReward(reward.id, { user_id: 'participant-1', idempotency_key: 'nonce-1' });
    const second = await harness.rewardService.redeemReward(reward.id, { user_id: 'participant-1', idempotency_key: 'nonce-2' });

    expect(second.redemption.id).not.toBe(first.redemption.id);
    expect(second.balance).toBe(earned - 6);
  });
});
