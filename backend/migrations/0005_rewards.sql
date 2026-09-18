-- Aevumory rewards catalogue & redemption persistence (Phase 4)
--
-- rewards: the administered reward catalogue (Reward domain type,
-- backend/src/types/reward.ts). Catalogue mutations are admin-gated at the
-- service/route layer, not here.
--
-- reward_redemptions: each redemption is an immutable, catalogue-linked
-- record of what was redeemed, at what price. It is NOT itself the Credit
-- accounting entry — the actual debit is a `reward_transactions` row (see
-- below), so there remains exactly one authoritative Credit ledger
-- (reward_transactions + reward_adjustments, Phase 3) rather than a second,
-- competing balance source.
--
-- reward_transactions is rebuilt (not altered in place — SQLite's ALTER
-- TABLE cannot relax an existing NOT NULL constraint) to support a new
-- 'reward_redemption' reward_event_type, which has no task/cycle/Discipline:
--   * task_id, cycle_id, primary_discipline become nullable (still populated
--     for every existing 'foothold_initiation' | 'completion' |
--     'deductive_pruning' row and every row Phase 3's TaskExecutionService
--     produces going forward — nothing about task-based rewards changes).
--   * redemption_id (nullable) links a 'reward_redemption' row back to its
--     reward_redemptions row.
-- idempotency_key remains UNIQUE, so a retried/duplicate redemption request
-- can never create a second debit for the same logical redemption — the
-- same guarantee Phase 3 already relies on for task rewards.

CREATE TABLE rewards (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'personal_leisure' | 'household' | 'experience'
  base_cost INTEGER NOT NULL,
  is_discountable INTEGER NOT NULL, -- boolean; always 0 (see reward.service.ts — no consumer/rule exists yet for non-'household' categories)
  is_active INTEGER NOT NULL -- boolean
);

CREATE TABLE reward_redemptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  reward_id TEXT NOT NULL REFERENCES rewards(id),

  base_cost INTEGER NOT NULL,
  final_cost_paid INTEGER NOT NULL,

  redeemed_at TEXT NOT NULL
);

CREATE INDEX reward_redemptions_user_idx
  ON reward_redemptions (user_id);

-- Rebuild reward_transactions (migration 0004) with task_id/cycle_id/
-- primary_discipline relaxed to nullable and a new nullable redemption_id.
-- All existing rows are copied unchanged (task-based rows keep every field
-- populated exactly as before).
CREATE TABLE reward_transactions_new (
  transaction_id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL,

  task_id TEXT REFERENCES tasks(task_id),
  cycle_id TEXT REFERENCES task_cycles(cycle_id),
  reward_event_type TEXT NOT NULL, -- 'foothold_initiation' | 'completion' | 'deductive_pruning' | 'reward_redemption'
  reward_owner_user_id TEXT,
  redemption_id TEXT REFERENCES reward_redemptions(id), -- only set for 'reward_redemption'

  primary_discipline TEXT, -- absent only for 'reward_redemption' (pure Credit debit, no Discipline)
  primary_xp REAL NOT NULL,
  secondary_yields TEXT NOT NULL, -- JSON array of { discipline, xp }
  credits_earned REAL NOT NULL, -- negative for a 'reward_redemption' debit
  care_relief TEXT, -- JSON CareReliefAward, nullable (not produced in Phase 3)

  processed_at TEXT NOT NULL
);

INSERT INTO reward_transactions_new (
  transaction_id, idempotency_key, task_id, cycle_id, reward_event_type,
  reward_owner_user_id, redemption_id, primary_discipline, primary_xp,
  secondary_yields, credits_earned, care_relief, processed_at
)
SELECT
  transaction_id, idempotency_key, task_id, cycle_id, reward_event_type,
  reward_owner_user_id, NULL, primary_discipline, primary_xp,
  secondary_yields, credits_earned, care_relief, processed_at
FROM reward_transactions;

DROP TABLE reward_transactions;
ALTER TABLE reward_transactions_new RENAME TO reward_transactions;

CREATE UNIQUE INDEX reward_transactions_idempotency_key_idx
  ON reward_transactions (idempotency_key);

