-- Aevumory execution & reward persistence (Phase 3)
--
-- Adds:
--   * user_task_states  -- persisted home for UserTaskState/Foothold state,
--     scoped to (cycle_id, user_id). A missing row means the implicit
--     initial state, 'active'. This is a Phase 3 planning-gap resolution:
--     the plan named execution_events/reward_transactions/reward_adjustments
--     but not a persisted home for Foothold state (see
--     FUNCTIONAL_FOUNDATION_PLAN.md Phase 3). Deliberately NOT a column on
--     tasks (that would make Foothold global instead of per cycle/user) and
--     NOT inferred from execution_events/reward_transactions.
--   * execution_events  -- ExecutionEvent: completed | deductively_pruned.
--   * reward_transactions -- RewardTransaction ledger. idempotency_key is
--     UNIQUE so a retried/duplicate request can never mint a second reward
--     for the same logical event; reward_event_type is the explicit
--     discriminator distinguishing a Foothold initiation reward from a
--     completion reward on the same task/cycle/owner (they would otherwise
--     collide on task_id+cycle_id+reward_owner_id alone).
--   * reward_adjustments -- immutable compensating corrections
--     (RewardAdjustmentTransaction); historical reward_transactions rows are
--     never edited or deleted.

CREATE TABLE user_task_states (
  task_id TEXT NOT NULL REFERENCES tasks(task_id),
  cycle_id TEXT NOT NULL REFERENCES task_cycles(cycle_id),
  user_id TEXT NOT NULL,

  state TEXT NOT NULL, -- 'foothold_established' | 'completed' ('active' is the implicit absence of a row)

  foothold_established_at TEXT,
  completed_at TEXT,
  updated_at TEXT NOT NULL,

  PRIMARY KEY (cycle_id, user_id)
);

CREATE INDEX user_task_states_task_idx
  ON user_task_states (task_id);

CREATE TABLE execution_events (
  execution_id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(task_id),
  cycle_id TEXT NOT NULL REFERENCES task_cycles(cycle_id),

  completed_by_user_id TEXT,
  responsible_user_id TEXT,

  completed_at TEXT NOT NULL,
  source_type TEXT NOT NULL,
  outcome_type TEXT NOT NULL, -- 'completed' | 'deductively_pruned'

  -- Deductive Pruning provenance only (TASK_LIFECYCLE.md §6)
  prune_reason_code TEXT,
  prune_note TEXT,
  prune_linked_task_id TEXT
);

CREATE INDEX execution_events_cycle_idx
  ON execution_events (cycle_id);

CREATE TABLE reward_transactions (
  transaction_id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL,

  task_id TEXT NOT NULL REFERENCES tasks(task_id),
  cycle_id TEXT NOT NULL REFERENCES task_cycles(cycle_id),
  reward_event_type TEXT NOT NULL, -- 'foothold_initiation' | 'completion' | 'deductive_pruning'
  reward_owner_user_id TEXT,

  primary_discipline TEXT NOT NULL,
  primary_xp REAL NOT NULL,
  secondary_yields TEXT NOT NULL, -- JSON array of { discipline, xp }
  credits_earned REAL NOT NULL,
  care_relief TEXT, -- JSON CareReliefAward, nullable (not produced in Phase 3)

  processed_at TEXT NOT NULL
);

CREATE UNIQUE INDEX reward_transactions_idempotency_key_idx
  ON reward_transactions (idempotency_key);

CREATE INDEX reward_transactions_owner_idx
  ON reward_transactions (reward_owner_user_id);

CREATE TABLE reward_adjustments (
  adjustment_id TEXT PRIMARY KEY,
  original_transaction_id TEXT NOT NULL REFERENCES reward_transactions(transaction_id),

  reason TEXT NOT NULL, -- 'admin_reversal' | 'invalidated_pruning' | 'system_correction'
  xp_adjustments TEXT NOT NULL, -- JSON array of { discipline, xp_delta }
  credits_delta REAL NOT NULL,

  created_at TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL
);

CREATE INDEX reward_adjustments_original_transaction_idx
  ON reward_adjustments (original_transaction_id);
