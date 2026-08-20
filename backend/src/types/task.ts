/**
 * Core Task Interface and Type Definitions for Aevumory System
 */

export type TaskDomain = 'kinetic' | 'erudite' | 'form' | 'keeping';

export type DisciplineTag =
  | 'inquiry'
  | 'reason'
  | 'synthesis'
  | 'motion'
  | 'force'
  | 'precision'
  | 'making'
  | 'composition'
  | 'craft'
  | 'care'
  | 'order'
  | 'renewal';

export type DurationTier = 'quick' | 'moderate' | 'sustained' | 'heavy';
export type EffortType = 'physical' | 'mental' | 'balanced';
export type CognitiveLoad = 'low' | 'medium' | 'high';
export type TaskSourceType = 'core' | 'event' | 'encounter';

export type TaskState = 'active' | 'foothold_established' | 'completed';

export interface Task {
  /** Identity & Visibility */
  id: string;
  title: string;
  description?: string;
  is_hidden: boolean;               // Inquiry: Hidden in plain sight until discovered
  visible_to_user_ids?: string[];   // Inquiry: Targeted individual discovery

  /** Domain & Discipline Attribution */
  domain: TaskDomain;
  primary_discipline: DisciplineTag;
  secondary_discipline?: DisciplineTag; // Synthesis: Cross-domain yield connection

  /** Effort, Duration & Cognitive Attributes */
  duration_tier: DurationTier;
  effort_type: EffortType;
  cognitive_load: CognitiveLoad;

  /** Engine Hooks & Behavior Flags */
  supports_foothold: boolean;       // Reason: Foothold point-of-entry supported
  has_strict_window: boolean;       // Care: Checked by temporal constraint engine

  /** Yield & Execution Rules */
  base_practice_yield: number;
  max_daily_completions: number;
  cooldown_hours: number;

  /** Origin Tracking */
  source_type: TaskSourceType;
  origin_id?: string;
}

export interface TaskStateRecord {
  task_id: string;
  user_id: string;
  state: TaskState;
  foothold_reward_claimed: boolean;
  created_at: string; // ISO Timestamp
  updated_at: string; // ISO Timestamp
}
