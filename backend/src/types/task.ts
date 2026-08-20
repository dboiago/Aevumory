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
  /** Identity & Discovery */
  id: string;
  title: string;
  description?: string;
  is_hidden: boolean;               // Inquiry: Discovered via perception[cite: 2, 4]
  visible_to_user_ids?: string[];   // Inquiry: Targeted individual discovery[cite: 2, 4]

  /** Domain & Discipline Attribution */
  domain: TaskDomain;               //[cite: 4]
  primary_discipline: DisciplineTag; //[cite: 4]
  secondary_discipline?: DisciplineTag; // Synthesis: Cross-discipline yield[cite: 2, 4]

  /** Descriptive Trait Profiles */
  duration_tier: DurationTier;      //[cite: 4]
  effort_type: EffortType;          //[cite: 4]
  cognitive_load: CognitiveLoad;    //[cite: 4]

  /** Engine Hooks & Behavioral Flags */
  supports_foothold: boolean;       // Reason: Point-of-entry enabled[cite: 2, 4]
  has_strict_window: boolean;       // Care: Evaluated by schedule engine[cite: 1, 4]
  is_major_reset?: boolean;         // Renewal: Explicit trigger requirement

  /** Yield & Execution Constraints */
  base_practice_yield: number;      //[cite: 4]
  max_daily_completions: number;    //[cite: 4]
  cooldown_hours: number;           //[cite: 4]

  /** Origin Tracking */
  source_type: TaskSourceType;      //[cite: 4]
  origin_id?: string;               //[cite: 4]
}

export interface TaskStateRecord {
  task_id: string;
  user_id: string;
  state: TaskState;
  foothold_reward_claimed: boolean;
  created_at: string; // ISO Timestamp
  updated_at: string; // ISO Timestamp
}
