/**
 * SQLite Task Repository
 *
 * Implements the TaskRepository interface using better-sqlite3.
 */

import type Database from 'better-sqlite3';
import type { Task, TaskCycle } from '../types/task-domain.types.js';
import type { TaskRepository } from '../repositories/task.repository.js';

interface TaskRow {
  task_id: string;
  title: string;
  description: string | null;
  primary_discipline: string;
  secondary_disciplines: string;
  source_type: string;
  source_event_id: string | null;
  created_at: string;
  created_by_user_id: string;
  assignment_scope: string;
  assigned_user_id: string | null;
  owner_id: string;
  schedule_cadence_type: string;
  schedule_interval_days: number | null;
  schedule_series_anchor_date: string | null;
  schedule_calendar_anchor_unit: string | null;
  schedule_calendar_anchor_value: number | null;
  schedule_delay_policy: string;
  schedule_has_strict_window: number;
  schedule_window_start_time: string | null;
  schedule_window_end_time: string | null;
  schedule_max_daily_completions: number | null;
  schedule_cooldown_hours: number | null;
  lifecycle_expires_at: string | null;
  lifecycle_on_expiration: string | null;
  lifecycle_ttl_hours: number | null;
  supports_foothold: number;
  duration_tier: string;
  effort_type: string;
  cognitive_load: string;
}

interface TaskCycleRow {
  cycle_id: string;
  task_id: string;
  target_date: string;
  window_start: string;
  window_end: string;
  window_source: string;
  status: string;
  responsible_user_id: string | null;
  satisfied_at: string | null;
  satisfied_by_user_id: string | null;
  resolved_at: string | null;
}

const TASK_COLUMNS = `
  task_id, title, description, primary_discipline, secondary_disciplines,
  source_type, source_event_id, created_at, created_by_user_id,
  assignment_scope, assigned_user_id, owner_id,
  schedule_cadence_type, schedule_interval_days, schedule_series_anchor_date,
  schedule_calendar_anchor_unit, schedule_calendar_anchor_value, schedule_delay_policy,
  schedule_has_strict_window, schedule_window_start_time, schedule_window_end_time,
  schedule_max_daily_completions, schedule_cooldown_hours,
  lifecycle_expires_at, lifecycle_on_expiration, lifecycle_ttl_hours,
  supports_foothold, duration_tier, effort_type, cognitive_load
`;

const CYCLE_COLUMNS = `
  cycle_id, task_id, target_date, window_start, window_end, window_source,
  status, responsible_user_id, satisfied_at, satisfied_by_user_id, resolved_at
`;

export class SqliteTaskRepository implements TaskRepository {
  constructor(private readonly db: Database.Database) {}

  getTask(task_id: string): Promise<Task | null> {
    const row = this.db
      .prepare(`SELECT ${TASK_COLUMNS} FROM tasks WHERE task_id = ?`)
      .get(task_id) as TaskRow | undefined;

    return Promise.resolve(row ? rowToTask(row) : null);
  }

  listTasks(): Promise<Task[]> {
    const rows = this.db
      .prepare(`SELECT ${TASK_COLUMNS} FROM tasks ORDER BY created_at ASC`)
      .all() as TaskRow[];

    return Promise.resolve(rows.map(rowToTask));
  }

  saveTask(task: Task): Promise<void> {
    this.db
      .prepare(
        `
      INSERT INTO tasks (${TASK_COLUMNS})
      VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?
      )
      ON CONFLICT(task_id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        primary_discipline = excluded.primary_discipline,
        secondary_disciplines = excluded.secondary_disciplines,
        source_type = excluded.source_type,
        source_event_id = excluded.source_event_id,
        assignment_scope = excluded.assignment_scope,
        assigned_user_id = excluded.assigned_user_id,
        owner_id = excluded.owner_id,
        schedule_cadence_type = excluded.schedule_cadence_type,
        schedule_interval_days = excluded.schedule_interval_days,
        schedule_series_anchor_date = excluded.schedule_series_anchor_date,
        schedule_calendar_anchor_unit = excluded.schedule_calendar_anchor_unit,
        schedule_calendar_anchor_value = excluded.schedule_calendar_anchor_value,
        schedule_delay_policy = excluded.schedule_delay_policy,
        schedule_has_strict_window = excluded.schedule_has_strict_window,
        schedule_window_start_time = excluded.schedule_window_start_time,
        schedule_window_end_time = excluded.schedule_window_end_time,
        schedule_max_daily_completions = excluded.schedule_max_daily_completions,
        schedule_cooldown_hours = excluded.schedule_cooldown_hours,
        lifecycle_expires_at = excluded.lifecycle_expires_at,
        lifecycle_on_expiration = excluded.lifecycle_on_expiration,
        lifecycle_ttl_hours = excluded.lifecycle_ttl_hours,
        supports_foothold = excluded.supports_foothold,
        duration_tier = excluded.duration_tier,
        effort_type = excluded.effort_type,
        cognitive_load = excluded.cognitive_load
    `,
      )
      .run(
        task.task_id,
        task.title,
        task.description ?? null,
        task.primary_discipline,
        JSON.stringify(task.secondary_disciplines),
        task.source_type,
        task.source_event_id ?? null,
        task.created_at,
        task.created_by_user_id,
        task.assignment.scope,
        task.assignment.assigned_user_id ?? null,
        task.assignment.owner_id,
        task.schedule.cadence_type,
        task.schedule.interval_days ?? null,
        task.schedule.series_anchor_date ?? null,
        task.schedule.calendar_anchor?.unit ?? null,
        task.schedule.calendar_anchor?.value ?? null,
        task.schedule.delay_policy,
        task.schedule.has_strict_window ? 1 : 0,
        task.schedule.window_start_time ?? null,
        task.schedule.window_end_time ?? null,
        task.schedule.max_daily_completions ?? null,
        task.schedule.cooldown_hours ?? null,
        task.lifecycle.expires_at ?? null,
        task.lifecycle.on_expiration ?? null,
        task.lifecycle.ttl_hours ?? null,
        task.supports_foothold ? 1 : 0,
        task.duration_tier,
        task.effort_type,
        task.cognitive_load,
      );

    return Promise.resolve();
  }

  deleteTask(task_id: string): Promise<void> {
    // task_cycles.task_id references tasks(task_id) — delete the child rows
    // first so this doesn't trip a foreign key constraint.
    this.db.prepare('DELETE FROM task_cycles WHERE task_id = ?').run(task_id);
    this.db.prepare('DELETE FROM tasks WHERE task_id = ?').run(task_id);
    return Promise.resolve();
  }

  getCycle(cycle_id: string): Promise<TaskCycle | null> {
    const row = this.db
      .prepare(`SELECT ${CYCLE_COLUMNS} FROM task_cycles WHERE cycle_id = ?`)
      .get(cycle_id) as TaskCycleRow | undefined;

    return Promise.resolve(row ? rowToCycle(row) : null);
  }

  listCyclesForTask(task_id: string): Promise<TaskCycle[]> {
    const rows = this.db
      .prepare(`SELECT ${CYCLE_COLUMNS} FROM task_cycles WHERE task_id = ? ORDER BY target_date ASC`)
      .all(task_id) as TaskCycleRow[];

    return Promise.resolve(rows.map(rowToCycle));
  }

  saveCycle(cycle: TaskCycle): Promise<void> {
    this.db
      .prepare(
        `
      INSERT INTO task_cycles (${CYCLE_COLUMNS})
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(cycle_id) DO UPDATE SET
        target_date = excluded.target_date,
        window_start = excluded.window_start,
        window_end = excluded.window_end,
        window_source = excluded.window_source,
        status = excluded.status,
        responsible_user_id = excluded.responsible_user_id,
        satisfied_at = excluded.satisfied_at,
        satisfied_by_user_id = excluded.satisfied_by_user_id,
        resolved_at = excluded.resolved_at
    `,
      )
      .run(
        cycle.cycle_id,
        cycle.task_id,
        cycle.target_date,
        cycle.window_start,
        cycle.window_end,
        cycle.window_source,
        cycle.status,
        cycle.responsible_user_id ?? null,
        cycle.satisfied_at ?? null,
        cycle.satisfied_by_user_id ?? null,
        cycle.resolved_at ?? null,
      );

    return Promise.resolve();
  }
}

function rowToTask(row: TaskRow): Task {
  return {
    task_id: row.task_id,
    title: row.title,
    description: row.description ?? undefined,
    primary_discipline: row.primary_discipline as Task['primary_discipline'],
    secondary_disciplines: JSON.parse(row.secondary_disciplines),
    source_type: row.source_type as Task['source_type'],
    source_event_id: row.source_event_id ?? undefined,
    created_at: row.created_at,
    created_by_user_id: row.created_by_user_id,
    assignment: {
      scope: row.assignment_scope as Task['assignment']['scope'],
      assigned_user_id: row.assigned_user_id ?? undefined,
      owner_id: row.owner_id,
    },
    schedule: {
      cadence_type: row.schedule_cadence_type as Task['schedule']['cadence_type'],
      interval_days: row.schedule_interval_days ?? undefined,
      series_anchor_date: row.schedule_series_anchor_date ?? undefined,
      calendar_anchor:
        row.schedule_calendar_anchor_unit !== null && row.schedule_calendar_anchor_value !== null
          ? {
              unit: row.schedule_calendar_anchor_unit as 'week' | 'month',
              value: row.schedule_calendar_anchor_value,
            }
          : undefined,
      delay_policy: row.schedule_delay_policy as Task['schedule']['delay_policy'],
      has_strict_window: row.schedule_has_strict_window === 1,
      window_start_time: row.schedule_window_start_time ?? undefined,
      window_end_time: row.schedule_window_end_time ?? undefined,
      max_daily_completions: row.schedule_max_daily_completions ?? undefined,
      cooldown_hours: row.schedule_cooldown_hours ?? undefined,
    },
    lifecycle: {
      expires_at: row.lifecycle_expires_at ?? undefined,
      on_expiration: (row.lifecycle_on_expiration as Task['lifecycle']['on_expiration']) ?? undefined,
      ttl_hours: row.lifecycle_ttl_hours ?? undefined,
    },
    supports_foothold: row.supports_foothold === 1,
    duration_tier: row.duration_tier as Task['duration_tier'],
    effort_type: row.effort_type as Task['effort_type'],
    cognitive_load: row.cognitive_load as Task['cognitive_load'],
  };
}

function rowToCycle(row: TaskCycleRow): TaskCycle {
  return {
    cycle_id: row.cycle_id,
    task_id: row.task_id,
    target_date: row.target_date,
    window_start: row.window_start,
    window_end: row.window_end,
    window_source: row.window_source as TaskCycle['window_source'],
    status: row.status as TaskCycle['status'],
    responsible_user_id: row.responsible_user_id ?? undefined,
    satisfied_at: row.satisfied_at ?? undefined,
    satisfied_by_user_id: row.satisfied_by_user_id ?? undefined,
    resolved_at: row.resolved_at ?? undefined,
  };
}
