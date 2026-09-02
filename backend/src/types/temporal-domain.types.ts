/**
 * ============================================================================
 * TEMPORAL DOMAIN
 * ============================================================================
 *
 * Aevumory owns the household temporal model.
 * External calendar providers are sources, not domain entities.
 *
 * Event identity is distinct from an occurrence. A recurring event therefore
 * has one HouseholdEvent and many EventOccurrences.
 *
 * Presentation state does not belong here. In particular, Event Horizon
 * placement, opacity, animation, emphasis, and other composition state are
 * deliberately absent from this model.
 * ============================================================================
 */

import type { EventSchedule } from './event-schedule.types';

export type TemporalSourceKind = 'local' | 'external';

export type TemporalSyncStatus =
  | 'never_synced'
  | 'syncing'
  | 'synced'
  | 'degraded'
  | 'error';

export interface TemporalSource {
  source_id: string;
  kind: TemporalSourceKind;
  name: string;
  enabled: boolean;
  sync_status: TemporalSyncStatus;
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ExternalEventIdentity {
  /** Provider identifier, such as a calendar vendor or integration name. */
  provider: string;

  /** Identifier assigned to the event by the external provider. */
  external_event_id: string;

  /** Optional provider/account lineage. */
  external_account_id?: string;
}

export type RecurrenceFrequency =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly';

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number;

  /** ISO weekday values, 1 = Monday through 7 = Sunday. */
  by_weekday?: number[];

  /** Calendar day 1–31 where applicable. */
  by_month_day?: number;

  /** Inclusive recurrence boundary, represented as a local calendar date. */
  until?: string;
}

export type HouseholdEventRelevance = 'ordinary' | 'meaningful';

export type HouseholdEventSignificance = 'low' | 'normal' | 'high';

export type HouseholdEventStatus = 'active' | 'cancelled';

export interface HouseholdEvent {
  event_id: string;
  source_id: string;

  title: string;
  description?: string;
  location?: string;
  status: HouseholdEventStatus;

  /** IANA timezone used for local temporal interpretation and recurrence. */
  timezone: string;

  relevance: HouseholdEventRelevance;
  significance: HouseholdEventSignificance;

  /** The temporal anchor from which occurrences are resolved. */
  schedule: EventSchedule;

  recurrence?: RecurrenceRule;
  external_identity?: ExternalEventIdentity;

  created_at: string;
  updated_at: string;
}

export type EventOccurrenceStatus = 'scheduled' | 'cancelled';

export interface EventOccurrence {
  occurrence_id: string;
  event_id: string;

  /** Required for timed occurrences; omitted for all-day occurrences. */
  starts_at?: string;
  ends_at?: string;

  /** Inclusive start date in the event timezone. */
  local_start_date: string;

  /** Exclusive end date for all-day events; same date as start for timed events. */
  local_end_date: string;

  timezone: string;

  /** Stable identity for a recurrence instance, when applicable. */
  recurrence_instance_key?: string;

  status: EventOccurrenceStatus;
  created_at: string;
  updated_at: string;
}
