import type { TaskBoardItem, TaskBoardState } from './tasks';
import { taskCyclesApi } from './api-client';

export type TaskBoardAction =
  | { kind: 'complete'; taskId: string }
  | { kind: 'assign'; taskId: string; responsibleUserId?: string };

export class FixtureTaskBoardStore {
  constructor(
    private state: TaskBoardState,
    private readonly refetch?: () => Promise<TaskBoardState>,
  ) {}

  getState(): TaskBoardState {
    return structuredClone(this.state);
  }

  async apply(action: TaskBoardAction): Promise<TaskBoardState> {
    const task = this.state.tasks.find((item) => item.id === action.taskId);
    if (!task) throw new Error(`Task not found: ${action.taskId}`);

    if (action.kind === 'complete') {
      // Phase 3 owns real, persisted, reward-bearing completion
      // (FUNCTIONAL_FOUNDATION_PLAN.md) — there is no "uncomplete" concept,
      // so a cycle already showing as completed is a no-op here rather than
      // a local toggle. The backend is authoritative for the reward value.
      if (task.status === 'completed') {
        return this.getState();
      }

      try {
        const result = await taskCyclesApi.complete(action.taskId);
        task.status = result.cycle.status === 'satisfied' ? 'completed' : task.status;
        task.completedAt = result.cycle.satisfied_at;
        task.completionReward = result.transaction
          ? { experience: result.transaction.yield.primary_xp, credits: result.transaction.yield.credits_earned }
          : undefined;
        if (this.refetch) this.state = await this.refetch();
      } catch {
        // Backend unreachable/rejected — do not fabricate a completed state
        // or reward for a reward-bearing action; leave the task unchanged.
      }
      return this.getState();
    }

    // Ordinary household action — POST /api/task-cycles/:id/assign requires
    // no admin authentication (CORE_BASELINE.md §2: "Task Reassignment").
    try {
      await taskCyclesApi.assign(action.taskId, action.responsibleUserId);
      if (this.refetch) {
        this.state = await this.refetch();
        return this.getState();
      }
    } catch {
      // Backend unreachable; fall back to a local-only update.
    }

    task.responsibleUserId = action.responsibleUserId;
    task.assignment = action.responsibleUserId ? 'individual' : 'household';
    return this.getState();
  }
}

export function participantTasks(state: TaskBoardState, participantId: string): TaskBoardItem[] {
  return state.tasks.filter(
    (task) => task.assignment === 'individual' && task.responsibleUserId === participantId,
  );
}

export function householdTasks(state: TaskBoardState): TaskBoardItem[] {
  return state.tasks.filter((task) => task.assignment === 'household');
}
