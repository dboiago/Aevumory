import { describe, expect, it } from 'vitest';
import { InMemoryUserTaskStateRepository } from './user-task-state.repository.memory.js';
import type { UserTaskCycleState } from '../types/task-domain.types.js';

function makeState(overrides: Partial<UserTaskCycleState> = {}): UserTaskCycleState {
  return {
    task_id: 'task-1',
    cycle_id: 'task-1:2026-01-05',
    user_id: 'participant-1',
    state: 'foothold_established',
    foothold_established_at: '2026-01-05T08:00:00Z',
    updated_at: '2026-01-05T08:00:00Z',
    ...overrides,
  };
}

describe('InMemoryUserTaskStateRepository', () => {
  it('returns null when no state has been recorded (implicit "active")', async () => {
    const repository = new InMemoryUserTaskStateRepository();
    expect(await repository.get('task-1:2026-01-05', 'participant-1')).toBeNull();
  });

  it('stores and retrieves state scoped to (cycle_id, user_id)', async () => {
    const repository = new InMemoryUserTaskStateRepository();
    const state = makeState();

    await repository.save(state);

    expect(await repository.get('task-1:2026-01-05', 'participant-1')).toEqual(state);
  });

  it('keeps state independent per user for the same cycle', async () => {
    const repository = new InMemoryUserTaskStateRepository();
    await repository.save(makeState({ user_id: 'participant-1' }));

    expect(await repository.get('task-1:2026-01-05', 'participant-2')).toBeNull();
  });

  it('overwrites state on repeated save (e.g. foothold_established -> completed)', async () => {
    const repository = new InMemoryUserTaskStateRepository();
    await repository.save(makeState());

    const completed = makeState({ state: 'completed', completed_at: '2026-01-06T08:00:00Z', updated_at: '2026-01-06T08:00:00Z' });
    await repository.save(completed);

    expect(await repository.get('task-1:2026-01-05', 'participant-1')).toEqual(completed);
  });
});
