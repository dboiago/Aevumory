-- Aevumory task & task-cycle persistence
--
-- task-domain.types.ts is the sole authoritative Task/TaskCycle shape
-- (see FUNCTIONAL_FOUNDATION_PLAN.md Phase 2). Aevumory supports exactly one
-- Household per installation, so tasks carry no household_id (matches
-- households/participants). TaskCycle rows are only persisted once
-- materialized (created, or an override such as reassignment applied);
-- otherwise occurrences are generated on demand by task-cycle.resolver.ts.

CREATE TABLE tasks (
  task_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,

  primary_discipline TEXT NOT NULL,
  secondary_disciplines TEXT NOT NULL, -- JSON array of DisciplineTag

  source_type TEXT NOT NULL,
  source_event_id TEXT,

  created_at TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,

  -- TaskAssignmentPolicy
  assignment_scope TEXT NOT NULL,
  assigned_user_id TEXT,
  owner_id TEXT NOT NULL,

  -- SchedulePolicy
  schedule_cadence_type TEXT NOT NULL,
  schedule_interval_days INTEGER,
  schedule_series_anchor_date TEXT,
  schedule_calendar_anchor_unit TEXT,
  schedule_calendar_anchor_value INTEGER,
  schedule_delay_policy TEXT NOT NULL,
  schedule_has_strict_window INTEGER NOT NULL,
  schedule_window_start_time TEXT,
  schedule_window_end_time TEXT,
  schedule_max_daily_completions INTEGER,
  schedule_cooldown_hours INTEGER,

  -- LifecyclePolicy
  lifecycle_expires_at TEXT,
  lifecycle_on_expiration TEXT,
  lifecycle_ttl_hours INTEGER,

  -- Reconciled from the superseded task.ts (descriptive metadata only)
  supports_foothold INTEGER NOT NULL,
  duration_tier TEXT NOT NULL,
  effort_type TEXT NOT NULL,
  cognitive_load TEXT NOT NULL
);

CREATE TABLE task_cycles (
  cycle_id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(task_id),

  -- Original scheduled target. Never mutated by Precision, Order, Pause, or
  -- late completion (TASK_LIFECYCLE.md §3/§4).
  target_date TEXT NOT NULL,

  window_start TEXT NOT NULL,
  window_end TEXT NOT NULL,
  window_source TEXT NOT NULL,

  status TEXT NOT NULL,
  responsible_user_id TEXT,

  satisfied_at TEXT,
  satisfied_by_user_id TEXT,
  resolved_at TEXT
);

CREATE INDEX task_cycles_task_idx
  ON task_cycles (task_id);
