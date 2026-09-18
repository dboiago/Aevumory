-- Aevumory rewards catalogue & redemption persistence (Phase 4)
--
-- rewards: the administered reward catalogue (Reward domain type,
-- backend/src/types/reward.ts). Catalogue mutations are admin-gated at the
-- service/route layer, not here.
--
-- reward_redemptions: each redemption is an immutable, self-contained
-- financial-style ledger entry. Its `final_cost_paid` IS the Credit debit —
-- there is no separate mutable balance column anywhere, and nothing here
-- decrements a stored balance. A participant's spendable Credit balance is
-- always computed at read time (RewardService.getSpendableBalance) as:
--
--   SUM(reward_transactions.credits_earned) + SUM(reward_adjustments.credits_delta)
--   - SUM(reward_redemptions.final_cost_paid)
--
-- i.e. the existing Phase 3 ledger (reward_transactions/reward_adjustments,
-- untouched by this migration) net of redemptions — the same
-- "sum multiple immutable transaction tables" pattern Phase 3 already
-- established between reward_transactions and reward_adjustments, rather
-- than forcing a redemption into the task/cycle/Discipline-shaped
-- RewardTransaction type it doesn't actually fit (a redemption has no task,
-- cycle, or Discipline). idempotency_key is UNIQUE so a retried/duplicate
-- redemption request can never create a second debit for the same logical
-- redemption (mirrors reward_transactions.idempotency_key in migration 0004).

CREATE TABLE rewards (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'personal_leisure' | 'household' | 'experience'
  base_cost INTEGER NOT NULL,
  is_discountable INTEGER NOT NULL, -- boolean; always 0 for 'household' category
  is_active INTEGER NOT NULL -- boolean
);

CREATE TABLE reward_redemptions (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL,

  user_id TEXT NOT NULL,
  reward_id TEXT NOT NULL REFERENCES rewards(id),

  base_cost INTEGER NOT NULL,
  final_cost_paid INTEGER NOT NULL,

  redeemed_at TEXT NOT NULL
);

CREATE UNIQUE INDEX reward_redemptions_idempotency_key_idx
  ON reward_redemptions (idempotency_key);

CREATE INDEX reward_redemptions_user_idx
  ON reward_redemptions (user_id);
