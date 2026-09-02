-- Aevumory temporal persistence
--
-- These tables store household temporal truth. Event Horizon presentation state
-- does not belong here.

CREATE TABLE temporal_sources (
  source_id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('local', 'external')),
  name TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  sync_status TEXT NOT NULL CHECK (
    sync_status IN ('never_synced', 'syncing', 'synced', 'degraded', 'error')
  ),
  last_synced_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE household_events (
  event_id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES temporal_sources(source_id),
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled')),
  timezone TEXT NOT NULL,

  schedule_kind TEXT NOT NULL CHECK (schedule_kind IN ('timed', 'all_day')),
  local_start TEXT,
  local_end TEXT,
  local_start_date TEXT,
  local_end_date TEXT,
  CHECK (
    (schedule_kind = 'timed'
      AND local_start IS NOT NULL
      AND local_end IS NOT NULL
      AND local_start_date IS NULL
      AND local_end_date IS NULL)
    OR
    (schedule_kind = 'all_day'
      AND local_start IS NULL
      AND local_end IS NULL
      AND local_start_date IS NOT NULL
      AND local_end_date IS NOT NULL)
  ),

  relevance TEXT NOT NULL CHECK (relevance IN ('ordinary', 'meaningful')),
  significance TEXT NOT NULL CHECK (significance IN ('low', 'normal', 'high')),
  recurrence_json TEXT,

  -- Null for local events. For external events this is a normalized,
  -- provider-scoped identity such as provider:account:event-id.
  external_identity_key TEXT,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  UNIQUE (source_id, external_identity_key)
);

CREATE TABLE event_occurrences (
  occurrence_id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES household_events(event_id),
  starts_at TEXT,
  ends_at TEXT,
  local_start_date TEXT NOT NULL,
  local_end_date TEXT NOT NULL,
  timezone TEXT NOT NULL,
  recurrence_instance_key TEXT,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'cancelled')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (
    (starts_at IS NOT NULL AND ends_at IS NOT NULL)
    OR
    (starts_at IS NULL AND ends_at IS NULL)
  )
);

CREATE UNIQUE INDEX event_occurrences_recurrence_key_idx
  ON event_occurrences (event_id, recurrence_instance_key)
  WHERE recurrence_instance_key IS NOT NULL;

CREATE INDEX event_occurrences_time_idx
  ON event_occurrences (starts_at, ends_at);

CREATE INDEX event_occurrences_local_date_idx
  ON event_occurrences (local_start_date, local_end_date);

CREATE INDEX household_events_source_idx
  ON household_events (source_id);
