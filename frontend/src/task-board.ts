import type { TaskBoardItem, TaskBoardState } from './tasks';

export type TaskBoardAction =
  | { kind: 'complete'; taskId: string }
  | { kind: 'assign'; taskId: string; responsibleUserId?: string };

export class FixtureTaskBoardStore {
  constructor(private state: TaskBoardState) {}

  getState(): TaskBoardState {
    return structuredClone(this.state);
  }

  apply(action: TaskBoardAction): TaskBoardState {
    const task = this.state.tasks.find((item) => item.id === action.taskId);
    if (!task) throw new Error(`Task not found: ${action.taskId}`);

    if (action.kind === 'complete') {
      task.status = 'completed';
    } else {
      task.responsibleUserId = action.responsibleUserId;
      task.assignment = action.responsibleUserId ? 'individual' : 'household';
    }

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
