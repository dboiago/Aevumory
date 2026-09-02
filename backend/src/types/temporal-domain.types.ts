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

// ----------------------------------------------------------------------------
// SOURCES
// ----------------------------------------------------------------------------

export type TemporalSourceKind =
  | 'local'
  | 'external';

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

// ----------------------------------------------------------------------------
// EXTERNAL LINEAGE
// ----------------------------------------------------------------------------

export interface ExternalEventIdentity {
  /** Provider identifier, such as a calendar vendor or integration name. */
  provider: string;

  /** Identifier assigned to the event by the external provider. */
  external_event_id: string;

  /**
   * Optional provider/account lineage. This is not a household participant
   * identity and must not be used as the Aevumory event identifier.
   */
  external_account_id?: string;
}

// ----------------------------------------------------------------------------
// RECURRENCE
// ----------------------------------------------------------------------------

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

  /** Inclusive recurrence boundary. */
  until?: string;
}

// ----------------------------------------------------------------------------
// HOUSEHOLD EVENT
// ----------------------------------------------------------------------------

export type HouseholdEventRelevance =
  | 'ordinary'
  | 'meaningful';

export type HouseholdEventSignificance =
  | 'low'
  | 'normal'
  | 'high';

export interface HouseholdEvent {
  event_id: string;
  source_id: string;

  title: string;
  description?: string;
  location?: string;

  /** True when the event has no meaningful time-of-day component. */
  all_day: boolean;

  /** IANA timezone identifier used to interpret local temporal values. */
  timezone: string;

  relevance: HouseholdEventRelevance;
  significance: HouseholdEventSignificance;

  recurrence?: RecurrenceRule;
  external_identity?: ExternalEventIdentity;

  created_at: string;
  updated_at: string;
}

// ----------------------------------------------------------------------------
// OCCURRENCES
// ----------------------------------------------------------------------------

export type EventOccurrenceStatus =
  | 'scheduled'
  | 'cancelled';

export interface EventOccurrence {
  occurrence_id: string;
  event_id: string;

  /** Resolved start/end instants represented as ISO 8601 timestamps. */
  starts_at: string;
  ends_at?: string;

  /** Local household date corresponding to starts_at in the event timezone. */
  local_date: string;
  timezone: string;

  /** Stable identity for a recurrence instance, when applicable. */
  recurrence_instance_key?: string;

  status: EventOccurrenceStatus;
}
