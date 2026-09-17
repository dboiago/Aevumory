import type { UserTaskCycleState } from '../types/task-domain.types.js';
import type { UserTaskStateRepository } from '../repositories/user-task-state.repository.js';

function keyOf(cycle_id: string, user_id: string): string {
  return `${cycle_id}:${user_id}`;
}

export class InMemoryUserTaskStateRepository implements UserTaskStateRepository {
  private readonly states = new Map<string, UserTaskCycleState>();

  get(cycle_id: string, user_id: string): Promise<UserTaskCycleState | null> {
    return Promise.resolve(this.states.get(keyOf(cycle_id, user_id)) ?? null);
  }

  save(state: UserTaskCycleState): Promise<void> {
    this.states.set(keyOf(state.cycle_id, state.user_id), state);
    return Promise.resolve();
  }
}
