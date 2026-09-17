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
 * Reserved for a future, domain-specific Inquiry mechanic ("Deductive
 * Pruning": investigative work that establishes a task is unnecessary —
 * TASK_LIFECYCLE.md §6, PROGRESSION_SPEC.md §12). NOT currently called by
 * `TaskExecutionService.pruneCycle` — ordinary non-completion resolution is
 * not an earned reward, and that future reward must never be inferred
 * merely because a cycle was resolved. Kept here, unused, as the shape a
 * future bounded Inquiry reward would reuse: the avoided task's own
 * base-yield magnitude (its only documented measure of "burden"), attributed
 * to the `reason` Discipline instead of the task's own primary Discipline,
 * with zero Credits since "the physical work did not occur".
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
