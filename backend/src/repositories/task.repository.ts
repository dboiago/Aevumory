import type { Task, TaskCycle } from '../types/task-domain.types.js';

/**
 * Aevumory supports exactly one Household per installation, so Task carries
 * no household_id (matches HouseholdRepository/ParticipantRepository).
 *
 * TaskCycle rows are only persisted once materialized (created, or an
 * override such as reassignment applied) — see TaskService.listCyclesInWindow,
 * which mirrors DefaultTemporalService.listOccurrencesInWindow's
 * generated/persisted merge pattern.
 */
export interface TaskRepository {
  getTask(task_id: string): Promise<Task | null>;
  listTasks(): Promise<Task[]>;
  saveTask(task: Task): Promise<void>;
  deleteTask(task_id: string): Promise<void>;

  getCycle(cycle_id: string): Promise<TaskCycle | null>;
  listCyclesForTask(task_id: string): Promise<TaskCycle[]>;
  saveCycle(cycle: TaskCycle): Promise<void>;
}
