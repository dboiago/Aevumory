import { participantsApi, tasksApi, taskCyclesApi, type TaskDto, type TaskCycleDto } from './api-client';

export type TaskDomain = 'kinetic' | 'erudite' | 'form' | 'keeping';

export type TaskAssignment = 'individual' | 'household';

export type TaskStatus = 'pending' | 'completed';

export type TaskReward = {
  experience: number;
  credits: number;
  exceptional?: boolean;
};

export type HouseholdParticipant = {
  id: string;
  name: string;
  avatarUrl?: string;
};

export type TaskBoardItem = {
  id: string;
  /** Definition id (TaskBoardItem.id is the cycle id); used by edit/delete. */
  taskId: string;
  /** The full task definition, for pre-filling the edit form. */
  task: TaskDto;
  title: string;
  domain: TaskDomain;
  assignment: TaskAssignment;
  responsibleUserId?: string;
  status: TaskStatus;
  dueAt?: string;
  indicators?: string[];
  reward: TaskReward;
  completionReward?: TaskReward;
  completedAt?: string;
  /** Set in-session after a Foothold is established (the cycle stays
   * pending; the board query cannot reconstruct this from cycle rows). */
  footholdEstablished?: boolean;
  footholdReward?: TaskReward;
};

export type TaskBoardState = {
  participants: HouseholdParticipant[];
  tasks: TaskBoardItem[];
};

export interface TaskBoardQuery {
  getBoard(): Promise<TaskBoardState>;
}

// DisciplineTag -> TaskDomain, matching DISCIPLINE_DOMAIN_MAP in
// backend/src/types/task-domain.types.ts.
const DISCIPLINE_DOMAIN_MAP: Record<string, TaskDomain> = {
  motion: 'kinetic',
  force: 'kinetic',
  precision: 'kinetic',
  inquiry: 'erudite',
  reason: 'erudite',
  synthesis: 'erudite',
  making: 'form',
  composition: 'form',
  craft: 'form',
  care: 'keeping',
  order: 'keeping',
  renewal: 'keeping',
};

function todayWindow(): { starts_at: string; ends_at: string } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { starts_at: start.toISOString(), ends_at: end.toISOString() };
}

function cycleToBoardItem(task: TaskDto, cycle: TaskCycleDto): TaskBoardItem {
  return {
    id: cycle.cycle_id,
    taskId: task.task_id,
    task,
    title: task.title,
    domain: DISCIPLINE_DOMAIN_MAP[task.primary_discipline] ?? 'keeping',
    assignment: cycle.responsible_user_id ? 'individual' : 'household',
    responsibleUserId: cycle.responsible_user_id,
    status: cycle.status === 'satisfied' ? 'completed' : 'pending',
    // With a due time (strict window), the meaningful instant is the
    // window END (due by then), not the start of the day.
    dueAt: task.schedule.has_strict_window && task.schedule.window_end_time ? cycle.window_end : cycle.window_start,
    indicators: task.schedule.cadence_type !== 'one_off' ? ['Recurring'] : undefined,
    // Phase 2 implements Task/TaskCycle persistence only; reward attribution
    // is Phase 3 (FUNCTIONAL_FOUNDATION_PLAN.md), so no real yield exists yet.
    reward: { experience: 0, credits: 0 },
  };
}

/** Real, backend-backed Task Board query (FUNCTIONAL_FOUNDATION_PLAN.md Phase 2). */
export class ApiTaskBoardQuery implements TaskBoardQuery {
  async getBoard(): Promise<TaskBoardState> {
    const [participants, tasks] = await Promise.all([
      participantsApi.list().catch(() => []),
      this.loadTodaysTasks(),
    ]);

    return {
      participants: participants.map((participant) => ({
        id: participant.participant_id,
        name: participant.display_name,
        avatarUrl: participant.representation_ref,
      })),
      tasks,
    };
  }

  private async loadTodaysTasks(): Promise<TaskBoardItem[]> {
    try {
      const [tasks, cycles] = await Promise.all([
        tasksApi.list(),
        taskCyclesApi.listInWindow(todayWindow()),
      ]);

      const tasksById = new Map(tasks.map((task) => [task.task_id, task]));

      return cycles.reduce<TaskBoardItem[]>((items, cycle) => {
        // Resolved-without-completion cycles (pruned/superseded) are done
        // — they must not reappear on the board as pending work.
        if (cycle.status !== 'pending' && cycle.status !== 'satisfied') return items;
        const task = tasksById.get(cycle.task_id);
        if (task) items.push(cycleToBoardItem(task, cycle));
        return items;
      }, []);
    } catch {
      // Backend unreachable, or no tasks yet — represent the real empty state.
      return [];
    }
  }
}
