/**
 * Reward Yield Engine
 *
 * Pure functions computing `RewardYield` from a Task's descriptive metadata,
 * per the base yield anchor documented in CORE_BASELINE.md §3/§7 and
 * PROGRESSION_SPEC.md §1: `1 Base XP ≈ 1 minute`, `10 minutes = 1.0 Credit`.
 *
 * Phase 3 implements only the base (non-modified) yield. Discipline modifier
 * engines (Motion, Care, Order, Renewal, Synthesis, exceptional outcomes,
 * etc.) are explicitly out of scope (FUNCTIONAL_FOUNDATION_PLAN.md Phase 3
 * scope boundary) — `applyModifiers` is the documented no-op extension point
 * left for a later phase to implement against, so callers do not need to
 * change when a real modifier pipeline eventually lands. `secondary_yields`
 * stays empty because attributing secondary Discipline XP is Synthesis's
 * job (PROGRESSION_SPEC.md §11), which is also out of scope for Phase 3.
 */

import { TASK_YIELD_ENGINE_CONFIG } from '../config/engine.config.js';
import type { RewardYield, Task } from '../types/task-domain.types.js';

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Base yield for ordinary task completion, attributed to the task's own primary Discipline. */
export function computeBaseYield(task: Task): RewardYield {
  const minutes = TASK_YIELD_ENGINE_CONFIG.duration_tier_base_minutes[task.duration_tier];

  return {
    primary_discipline: task.primary_discipline,
    primary_xp: minutes,
    secondary_yields: [],
    credits_earned: roundToOneDecimal(minutes / 10),
  };
}

/**
 * Deductive Pruning yield (TASK_LIFECYCLE.md §6, PROGRESSION_SPEC.md §12):
 * "Reason Experience is derived from the burden of the task being avoided"
 * — reuses the task's own base-yield magnitude (its only documented measure
 * of "burden") but attributes it to the `reason` Discipline instead of the
 * task's own primary Discipline, and earns no Credits, since "the physical
 * work did not occur". A dedicated Reason burden-scaling curve is a future
 * Discipline-mastery modifier and is not implemented here.
 */
export function computeReasonYield(task: Task): RewardYield {
  const base = computeBaseYield(task);
  return {
    primary_discipline: 'reason',
    primary_xp: base.primary_xp,
    secondary_yields: [],
    credits_earned: 0,
  };
}

/** Scales every numeric component of a yield by a fixed ratio (e.g. Foothold initiation vs. remaining completion share). */
export function scaleYield(source: RewardYield, ratio: number): RewardYield {
  return {
    primary_discipline: source.primary_discipline,
    primary_xp: roundToOneDecimal(source.primary_xp * ratio),
    secondary_yields: source.secondary_yields.map((secondary) => ({
      discipline: secondary.discipline,
      xp: roundToOneDecimal(secondary.xp * ratio),
    })),
    credits_earned: roundToOneDecimal(source.credits_earned * ratio),
  };
}

/**
 * No-op extension point for future Discipline modifier engines (Motion,
 * Care, Order, Renewal, exceptional outcomes, etc.) — explicitly deferred
 * past Phase 3 (FUNCTIONAL_FOUNDATION_PLAN.md Phase 3 scope boundary).
 */
export function applyModifiers(baseYield: RewardYield, _context?: unknown): RewardYield {
  return baseYield;
}
