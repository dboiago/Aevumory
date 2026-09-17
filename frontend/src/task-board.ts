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
      // Phase 2 implements Task/TaskCycle persistence only; execution and
      // reward attribution are Phase 3 (FUNCTIONAL_FOUNDATION_PLAN.md), so
      // this toggle stays local and is not sent to the backend.
      if (task.status === 'completed') {
        task.status = 'pending';
        task.completedAt = undefined;
        task.completionReward = undefined;
      } else {
        task.status = 'completed';
        task.completedAt = new Date().toISOString();
        task.completionReward = structuredClone(task.reward);
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
