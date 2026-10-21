import type { TaskBoardItem, TaskBoardState } from './tasks';
import { taskCyclesApi } from './api-client';

export interface PruneActionInput {
  reason_code: string;
  note?: string;
  linked_task_id?: string;
  completed_by_user_id?: string;
  award_reason_yield?: boolean;
}

export type TaskBoardAction =
  | { kind: 'complete'; taskId: string }
  | { kind: 'foothold'; taskId: string }
  | { kind: 'prune'; taskId: string; input: PruneActionInput }
  | { kind: 'assign'; taskId: string; responsibleUserId?: string };

export class FixtureTaskBoardStore {
  constructor(
    private state: TaskBoardState,
    private readonly refetch?: () => Promise<TaskBoardState>,
  ) {}

  getState(): TaskBoardState {
    return structuredClone(this.state);
  }

  /** Refetches board data in place (Phase 7 polling) without discarding local-only fallback state. */
  async refresh(): Promise<TaskBoardState> {
    if (this.refetch) {
      const previous = new Map(this.state.tasks.map((item) => [item.id, item]));
      this.state = await this.refetch();
      // The board query cannot reconstruct what a completion granted
      // (cycle rows don't carry the yield), so carry the just-earned
      // reward label across refetches while the cycle stays satisfied —
      // otherwise the "5 XP · 0.5 credits" confirmation vanishes on the
      // next poll seconds after the user earns it.
      for (const item of this.state.tasks) {
        const before = previous.get(item.id);
        if (before?.completionReward && item.status === 'completed') {
          item.completionReward = before.completionReward;
          item.completedAt = item.completedAt ?? before.completedAt;
        }
        if (before?.footholdEstablished && item.status === 'pending') {
          item.footholdEstablished = true;
          item.footholdReward = before.footholdReward;
        }
      }
    }
    return this.getState();
  }

  async apply(action: TaskBoardAction): Promise<TaskBoardState> {
    const task = this.state.tasks.find((item) => item.id === action.taskId);
    if (!task) throw new Error(`Task not found: ${action.taskId}`);

    if (action.kind === 'complete') {
      // The Complete button toggles: completing a pending cycle grants
      // its reward; tapping again on a completed cycle is the household
      // "oops" undo — the backend reverses the granted reward exactly
      // and reopens the cycle (POST /api/task-cycles/:id/uncomplete,
      // deliberately not admin-gated; mistakes happen on shared devices).
      if (task.status === 'completed') {
        try {
          await taskCyclesApi.uncomplete(action.taskId);
          if (this.refetch) {
            this.state = await this.refetch();
          } else {
            task.status = 'pending';
            task.completedAt = undefined;
            task.completionReward = undefined;
          }
        } catch {
          // Leave the completed state untouched if the undo failed.
        }
        return this.getState();
      }

      try {
        const result = await taskCyclesApi.complete(action.taskId);
        const completionReward = result.transaction
          ? { experience: result.transaction.yield.primary_xp, credits: result.transaction.yield.credits_earned }
          : undefined;
        if (this.refetch) {
          this.state = await this.refetch();
          // Re-apply onto the rebuilt item — the refetch alone would wipe
          // the reward label the card is supposed to show (regression:
          // completing stopped displaying the earned XP/credits).
          const rebuilt = this.state.tasks.find((item) => item.id === action.taskId);
          if (rebuilt && result.cycle.status === 'satisfied') {
            rebuilt.status = 'completed';
            rebuilt.completedAt = result.cycle.satisfied_at;
            rebuilt.completionReward = completionReward;
          }
        } else {
          task.status = result.cycle.status === 'satisfied' ? 'completed' : task.status;
          task.completedAt = result.cycle.satisfied_at;
          task.completionReward = completionReward;
        }
      } catch {
        // Backend unreachable/rejected — do not fabricate a completed state
        // or reward for a reward-bearing action; leave the task unchanged.
      }
      return this.getState();
    }

    if (action.kind === 'foothold') {
      // Foothold initiation: the cycle stays pending, the actor earns the
      // initiation share now and the remainder on completion (backend
      // owns the split). Failure leaves the card unchanged.
      try {
        const result = await taskCyclesApi.foothold(action.taskId);
        const footholdReward = result.transaction
          ? { experience: result.transaction.yield.primary_xp, credits: result.transaction.yield.credits_earned }
          : undefined;
        if (this.refetch) {
          this.state = await this.refetch();
          const rebuilt = this.state.tasks.find((item) => item.id === action.taskId);
          if (rebuilt) { rebuilt.footholdEstablished = true; rebuilt.footholdReward = footholdReward; }
        } else {
          task.footholdEstablished = true;
          task.footholdReward = footholdReward;
        }
      } catch {
        // Leave the card unchanged if the Foothold was rejected.
      }
      return this.getState();
    }

    if (action.kind === 'prune') {
      // Resolving without completing. The cycle leaves the board either
      // way; with award_reason_yield the backend grants the actor Reason
      // XP (Deductive Pruning). Failure leaves the card unchanged so the
      // user sees it did not take.
      try {
        await taskCyclesApi.prune(action.taskId, action.input);
        if (this.refetch) this.state = await this.refetch();
        else this.state = { ...this.state, tasks: this.state.tasks.filter((item) => item.id !== action.taskId) };
      } catch {
        // Unchanged on failure.
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
