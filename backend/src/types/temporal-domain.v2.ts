import type { EventSchedule } from './event-schedule.types';

export type TemporalSourceKind = 'local' | 'external';
export type TemporalSyncStatus = 'never_synced' | 'syncing' | 'synced' | 'degraded' | 'error';

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
  provider: string;
  external_event_id: string;
  external_account_id?: string;
}

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number;
  by_weekday?: number[];
  by_month_day?: number;
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
  timezone: string;
  relevance: HouseholdEventRelevance;
  significance: HouseholdEventSignificance;
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
  starts_at?: string;
  ends_at?: string;
  local_start_date: string;
  local_end_date: string;
  timezone: string;
  recurrence_instance_key?: string;
  status: EventOccurrenceStatus;
  created_at: string;
  updated_at: string;
}
