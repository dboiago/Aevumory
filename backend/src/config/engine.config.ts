/**
 * System Tuning Parameters & Configuration Constants for Aevumory Engine
 */

export const RENEWAL_ENGINE_CONFIG = {
  /** Duration of the mental recovery window in hours */
  recovery_window_hours: 24,
  /** Discount multiplier applied to personal reward costs (0.25 = 25% discount) */
  reward_cost_reduction: 0.25,
  /** Maximum concurrent active recovery windows permitted */
  max_active_windows: 1,
} as const;

export const ORDER_ENGINE_CONFIG = {
  /** Completion count threshold that triggers the Order Clear Slate yield bonus */
  order_clear_slate_threshold: 4,
} as const;

export const REASON_ENGINE_CONFIG = {
  /** Proportion of base practice yield awarded upon establishing a Foothold */
  foothold_initiation_yield_ratio: 0.35,
} as const;

export const FORCE_ENGINE_CONFIG = {
  /** Maximum number of physical recovery rest days that can be banked */
  max_banked_recovery_days: 3,
} as const;

export const MOTION_ENGINE_CONFIG = {
  /** Base momentum yield multiplier increment per kinetic task completed on the same day */
  momentum_stack_step: 0.10,
  /** Maximum momentum stack multiplier ceiling */
  max_momentum_multiplier: 1.50,
} as const;
