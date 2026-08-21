/**
 * ============================================================================
 * TASK DOMAIN ARCHITECTURE
 * ============================================================================
 *
 * Flow:
 *
 *   Task Definition
 *      ↓
 *   TaskCycle
 *      ↓
 *   ExecutionEvent
 *      ↓
 *   RewardTransaction
 *      ↓
 *   The Mark
 *
 * The household display is shared. The application does not assume that
 * the participant physically interacting with the display is authenticated.
 *
 * Responsibility determines ordinary reward ownership.
 * Physical execution is recorded historically but does not automatically
 * transfer the task's reward.
 *
 * Downstream artifacts never rewrite upstream definitions.
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// DOMAINS & DISCIPLINES
// ----------------------------------------------------------------------------

export type TaskDomain =
  | 'kinetic'
  | 'erudite'
  | 'form'
  | 'keeping';

export type DisciplineTag =
  // Kinetic
  | 'motion'
  | 'force'
  | 'precision'

  // Erudite
  | 'inquiry'
  | 'reason'
  | 'synthesis'

  // Form
  | 'making'
  | 'composition'
  | 'craft'

  // Keeping
  | 'care'
  | 'order'
  | 'renewal';

export const DISCIPLINE_DOMAIN_MAP: Record<
  DisciplineTag,
  TaskDomain
> = {
  motion: 'kinetic',
  force: 'kinetic',
  precision: 'kinetic',

  inquiry: 'erudite',
  reason: 'erudite',
  synthesis: 'erudite',

  making: 'form',
  composition: 'form',
  craft: 'form',

  care: 'keeping',
  order: 'keeping',
  renewal: 'keeping',
};

// ----------------------------------------------------------------------------
// TASK ORIGIN
// ----------------------------------------------------------------------------

export type TaskSourceType =
  | 'core'
  | 'ad_hoc'
  | 'encounter'
  | 'event';

// ----------------------------------------------------------------------------
// ASSIGNMENT
// ----------------------------------------------------------------------------

export type AssignmentScope =
  | 'individual'
  | 'household';

export interface TaskAssignmentPolicy {
  /**
   * Participant responsible for ordinary task reward.
   *
   * Undefined for household/shared tasks.
   */
  assigned_user_id?: string;

  /**
   * Individual responsibility or shared household pool.
   */
  scope: AssignmentScope;

  /**
   * Participant who created/owns the task definition.
   *
   * This is administrative ownership, not reward attribution.
   */
  owner_id: string;
}

// ----------------------------------------------------------------------------
// RECURRENCE & SCHEDULING
// ----------------------------------------------------------------------------

export type CadenceType =
  | 'one_off'
  | 'interval'
  | 'calendar_anchor';

export type DelayPolicy =
  | 'none'
  | 'bounded'
  | 'flexible';

export interface SchedulePolicy {
  cadence_type: CadenceType;

  /**
   * Interval cadence.
   */
  interval_days?: number;

  /**
   * Immutable YYYY-MM-DD origin for interval series.
   */
  series_anchor_date?: string;

  /**
   * Calendar recurrence anchor.
   *
   * week:
   *   ISO weekday 1–7
   *
   * month:
   *   day of month 1–31
   */
  calendar_anchor?: {
    unit: 'week' | 'month';
    value: number;
  };

  delay_policy: DelayPolicy;

  has_strict_window: boolean;
  window_start_time?: string;
  window_end_time?: string;

  max_daily_completions?: number;
  cooldown_hours?: number;
}

// ----------------------------------------------------------------------------
// LIFECYCLE
// ----------------------------------------------------------------------------

export type ExpirationAction =
  | 'archive'
  | 'expire_quietly';

export interface LifecyclePolicy {
  expires_at?: string;
  on_expiration?: ExpirationAction;
  ttl_hours?: number;
}

export type LifecycleDisposition =
  | 'active'
  | 'archived'
  | 'expired_quietly';

// ----------------------------------------------------------------------------
// TASK DEFINITION
// ----------------------------------------------------------------------------

export interface Task {
  task_id: string;

  title: string;
  description?: string;

  primary_discipline: DisciplineTag;

  /**
   * Naturally associated additional Disciplines.
   *
   * Must not contain primary_discipline.
   *
   * Developing Synthesis may recognize a subset.
   * Synthesis Mastery can recognize all legitimate entries.
   */
  secondary_disciplines: DisciplineTag[];

  source_type: TaskSourceType;

  /**
   * Present when source_type === 'event'.
   */
  source_event_id?: string;

  created_at: string;
  created_by_user_id: string;

  assignment: TaskAssignmentPolicy;
  schedule: SchedulePolicy;
  lifecycle: LifecyclePolicy;
}

// ----------------------------------------------------------------------------
// EXECUTION STATE
// ----------------------------------------------------------------------------

export type UserTaskState =
  | 'active'
  | 'foothold_established'
  | 'completed';

// ----------------------------------------------------------------------------
// TASK CYCLE
// ----------------------------------------------------------------------------

export type CycleStatus =
  | 'pending'
  | 'satisfied'
  | 'deferred'
  | 'historical_absence'
  | 'superseded';

export interface TaskCycle {
  cycle_id: string;
  task_id: string;

  /**
   * Original scheduled target.
   * Never mutated by Precision, Order, Pause, or late completion.
   */
  target_date: string;

  window_start: string;
  window_end: string;

  window_source:
    | 'base'
    | 'precision_elastic';

  status: CycleStatus;

  /**
   * Effective responsibility for this occurrence.
   *
   * Undefined only for true household-pool tasks.
   */
  responsible_user_id?: string;

  satisfied_at?: string;
  satisfied_by_user_id?: string;
  resolved_at?: string;
}

// ----------------------------------------------------------------------------
// EXECUTION EVENT
// ----------------------------------------------------------------------------

export type ExecutionOutcomeType =
  | 'completed'
  | 'deductively_pruned';

export interface ExecutionEvent {
  execution_id: string;

  task_id: string;
  cycle_id: string;

  /**
   * Person physically performing/logging the action, when known.
   *
   * Shared-board interaction does not require this to be authenticated.
   */
  completed_by_user_id?: string;

  /**
   * Responsible participant whose task/reward is being resolved.
   */
  responsible_user_id?: string;

  completed_at: string;

  source_type: TaskSourceType;

  outcome_type: ExecutionOutcomeType;
}

// ----------------------------------------------------------------------------
// CARE RELIEF
// ----------------------------------------------------------------------------

export interface CareReliefAward {
  care_xp: number;
  bonus_credits: number;
  relieved_user_id: string;
}

// ----------------------------------------------------------------------------
// REWARD YIELD
// ----------------------------------------------------------------------------

export interface RewardYield {
  primary_discipline: DisciplineTag;
  primary_xp: number;

  secondary_yields: Array<{
    discipline: DisciplineTag;
    xp: number;
  }>;

  credits_earned: number;
}

// ----------------------------------------------------------------------------
// REWARD TRANSACTION
// ----------------------------------------------------------------------------

export interface RewardTransaction {
  transaction_id: string;

  /**
   * `${task_id}:${cycle_id}:${reward_owner_id}`
   *
   * Reward ownership is based on task responsibility, not physical executor.
   */
  idempotency_key: string;

  task_id: string;
  cycle_id: string;

  /**
   * Participant whose assigned responsibility earns the ordinary reward.
   *
   * For household-pool tasks this may be undefined until the task is moved
   * onto an individual's card.
   */
  reward_owner_user_id?: string;

  yield: RewardYield;

  care_relief?: CareReliefAward;

  processed_at: string;
}

// ----------------------------------------------------------------------------
// SUPPORTING MASTERy / MAINTENANCE RELATIONSHIP TYPES
// ----------------------------------------------------------------------------

export interface MaintenanceRelationship {
  relationship_id: string;

  /**
   * Routine upkeep task.
   */
  maintenance_task_id: string;

  /**
   * Larger reset / overhaul task whose ongoing condition is supported.
   */
  target_reset_task_id: string;

  /**
   * Consecutive maintenance completions required before Order recognition
   * is available.
   */
  required_consecutive_completions: number;

  /**
   * Maximum time over which the relationship's special recognition can remain
   * active without fresh qualifying maintenance.
   */
  max_recognition_days: number;
}

// ----------------------------------------------------------------------------
// CORRECTIVE LEDGER EVENTS
// ----------------------------------------------------------------------------

export type RewardAdjustmentReason =
  | 'admin_reversal'
  | 'invalidated_pruning'
  | 'system_correction';

export interface RewardAdjustmentTransaction {
  adjustment_id: string;

  original_transaction_id: string;

  reason: RewardAdjustmentReason;

  /**
   * Negative or positive compensating amounts.
   */
  xp_adjustments: Array<{
    discipline: DisciplineTag;
    xp_delta: number;
  }>;

  credits_delta: number;

  created_at: string;
  created_by_user_id: string;
}
