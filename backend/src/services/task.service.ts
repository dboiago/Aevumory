/**
 * Task Service
 *
 * Application-service boundary for Task definition CRUD, cycle listing/window
 * retrieval, and cycle reassignment. Route handlers must not talk to
 * TaskRepository directly. Task definition mutations are admin-gated at the
 * route level; reassignCycle is an ordinary household action and must not be
 * gated there (CORE_BASELINE.md §2: "Task Reassignment ... is an ordinary
 * household action, not a separate game mode").
 */

import { randomUUID } from 'node:crypto';
import type {
  DisciplineTag,
  CognitiveLoad,
  DurationTier,
  EffortType,
  LifecyclePolicy,
  SchedulePolicy,
  Task,
  TaskAssignmentPolicy,
  TaskCycle,
  TaskSourceType,
} from '../types/task-domain.types.js';
import type { TaskRepository } from '../repositories/task.repository.js';
import {
  resolveTaskCycles,
  validateSchedulePolicy,
  type CycleResolutionWindow,
} from './task-cycle.resolver.js';

export interface CreateTaskInput {
  title: string;
  description?: string;
  primary_discipline: DisciplineTag;
  secondary_disciplines?: DisciplineTag[];
  source_type: TaskSourceType;
  source_event_id?: string;
  created_by_user_id: string;
  assignment: TaskAssignmentPolicy;
  schedule: SchedulePolicy;
  lifecycle?: LifecyclePolicy;
  supports_foothold?: boolean;
  duration_tier: DurationTier;
  effort_type: EffortType;
  cognitive_load: CognitiveLoad;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  primary_discipline?: DisciplineTag;
  secondary_disciplines?: DisciplineTag[];
  assignment?: TaskAssignmentPolicy;
  schedule?: SchedulePolicy;
  lifecycle?: LifecyclePolicy;
  supports_foothold?: boolean;
  duration_tier?: DurationTier;
  effort_type?: EffortType;
  cognitive_load?: CognitiveLoad;
}

export class TaskNotFoundError extends Error {
  constructor(task_id: string) {
    super(`Task not found: ${task_id}`);
  }
}

export class TaskCycleNotFoundError extends Error {
  constructor(cycle_id: string) {
    super(`Task cycle not found: ${cycle_id}`);
  }
}

export class TaskService {
  constructor(private readonly repository: TaskRepository) {}

  listTasks(): Promise<Task[]> {
    return this.repository.listTasks();
  }

  getTask(task_id: string): Promise<Task | null> {
    return this.repository.getTask(task_id);
  }

  async createTask(input: CreateTaskInput): Promise<Task> {
    const title = input.title.trim();
    if (!title) throw new Error('title is required');

    const secondary_disciplines = input.secondary_disciplines ?? [];
    if (secondary_disciplines.includes(input.primary_discipline)) {
      throw new Error('secondary_disciplines must not contain primary_discipline');
    }

    validateSchedulePolicy(input.schedule);

    const now = new Date().toISOString();
    const task: Task = {
      task_id: randomUUID(),
      title,
      description: input.description,
      primary_discipline: input.primary_discipline,
      secondary_disciplines,
      source_type: input.source_type,
      source_event_id: input.source_event_id,
      created_at: now,
      created_by_user_id: input.created_by_user_id,
      assignment: input.assignment,
      schedule: input.schedule,
      lifecycle: input.lifecycle ?? {},
      supports_foothold: input.supports_foothold ?? false,
      duration_tier: input.duration_tier,
      effort_type: input.effort_type,
      cognitive_load: input.cognitive_load,
    };

    await this.repository.saveTask(task);
    return task;
  }

  async updateTask(task_id: string, input: UpdateTaskInput): Promise<Task> {
    const existing = await this.repository.getTask(task_id);
    if (!existing) throw new TaskNotFoundError(task_id);

    const title = input.title !== undefined ? input.title.trim() : existing.title;
    if (!title) throw new Error('title cannot be empty');

    const primary_discipline = input.primary_discipline ?? existing.primary_discipline;
    const secondary_disciplines = input.secondary_disciplines ?? existing.secondary_disciplines;
    if (secondary_disciplines.includes(primary_discipline)) {
      throw new Error('secondary_disciplines must not contain primary_discipline');
    }

    const schedule = input.schedule ?? existing.schedule;
    validateSchedulePolicy(schedule);

    const updated: Task = {
      ...existing,
      title,
      description: input.description === null ? undefined : (input.description ?? existing.description),
      primary_discipline,
      secondary_disciplines,
      assignment: input.assignment ?? existing.assignment,
      schedule,
      lifecycle: input.lifecycle ?? existing.lifecycle,
      supports_foothold: input.supports_foothold ?? existing.supports_foothold,
      duration_tier: input.duration_tier ?? existing.duration_tier,
      effort_type: input.effort_type ?? existing.effort_type,
      cognitive_load: input.cognitive_load ?? existing.cognitive_load,
    };

    await this.repository.saveTask(updated);
    return updated;
  }

  async deleteTask(task_id: string): Promise<void> {
    await this.repository.deleteTask(task_id);
  }

  /** Persisted (materialized) cycles only — used by GET /api/tasks/:id/cycles. */
  async listPersistedCyclesForTask(task_id: string): Promise<TaskCycle[]> {
    const task = await this.repository.getTask(task_id);
    if (!task) throw new TaskNotFoundError(task_id);
    return this.repository.listCyclesForTask(task_id);
  }

  /**
   * Generated (virtual) cycles across all active tasks for a window, with any
   * persisted overrides (e.g. a reassignment) taking precedence — mirrors
   * DefaultTemporalService.listOccurrencesInWindow's generated/persisted merge.
   */
  async listCyclesInWindow(window: CycleResolutionWindow): Promise<TaskCycle[]> {
    if (new Date(window.ends_at).getTime() <= new Date(window.starts_at).getTime()) {
      throw new Error('Cycle window must end after it starts');
    }

    const tasks = await this.repository.listTasks();
    const now = new Date().toISOString();
    const results: TaskCycle[] = [];

    for (const task of tasks) {
      if (isTaskExpired(task, now)) continue;

      const generated = resolveTaskCycles(task, window);
      if (generated.length === 0) continue;

      const persisted = await this.repository.listCyclesForTask(task.task_id);
      const persistedById = new Map(persisted.map((cycle) => [cycle.cycle_id, cycle]));

      for (const cycle of generated) {
        results.push(persistedById.get(cycle.cycle_id) ?? cycle);
      }
    }

    return results.sort(
      (a, b) => a.target_date.localeCompare(b.target_date) || a.cycle_id.localeCompare(b.cycle_id),
    );
  }

  /** Ordinary household action — dragging a task to a participant or the household bucket. */
  async reassignCycle(cycle_id: string, responsible_user_id: string | undefined): Promise<TaskCycle> {
    const cycle = await this.getOrMaterializeCycle(cycle_id);
    const updated: TaskCycle = { ...cycle, responsible_user_id };
    await this.repository.saveCycle(updated);
    return updated;
  }

  /**
   * Returns the persisted cycle if one already exists, otherwise materializes
   * (persists) the generated/virtual cycle so a caller can attach further
   * state to a real row — shared by reassignCycle and, as of Phase 3,
   * TaskExecutionService (completion/Foothold/pruning all need a persisted
   * TaskCycle to transition, per FUNCTIONAL_FOUNDATION_PLAN.md Phase 3: "Do
   * not duplicate the Phase 2 cycle-resolution logic").
   */
  async getOrMaterializeCycle(cycle_id: string): Promise<TaskCycle> {
    const existing = await this.repository.getCycle(cycle_id);
    if (existing) return existing;

    const [task_id, target_date] = cycle_id.split(':');
    const task = task_id && target_date ? await this.repository.getTask(task_id) : null;
    if (!task) throw new TaskCycleNotFoundError(cycle_id);

    const [generated] = resolveTaskCycles(task, { starts_at: target_date, ends_at: target_date });
    if (!generated) throw new TaskCycleNotFoundError(cycle_id);

    await this.repository.saveCycle(generated);
    return generated;
  }
}

function isTaskExpired(task: Task, nowIso: string): boolean {
  return task.lifecycle.expires_at !== undefined && task.lifecycle.expires_at <= nowIso;
}
