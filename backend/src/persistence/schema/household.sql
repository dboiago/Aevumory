-- Aevumory household & participant persistence
--
-- Aevumory supports exactly one Household row per installation
-- (PARTICIPANT_PROFILE_SPEC.md §2). admin_pin_hash is NULL until the
-- first-run admin PIN setup flow completes.

CREATE TABLE households (
  household_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  admin_pin_hash TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE participants (
  participant_id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(household_id),
  display_name TEXT NOT NULL,
  representation_ref TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX participants_household_idx
  ON participants (household_id);
