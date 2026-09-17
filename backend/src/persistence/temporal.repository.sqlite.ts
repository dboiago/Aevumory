/**
 * SQLite Temporal Repository
 *
 * Implements the TemporalRepository interface using better-sqlite3.
 * Queries are direct SQL statements with parameter binding for safety.
 */

import type Database from 'better-sqlite3';
import type {
  EventOccurrence,
  HouseholdEvent,
  TemporalSource,
} from '../types/temporal-domain.types';
import type {
  OccurrenceQuery,
  TemporalEventQuery,
  TemporalRepository,
} from '../repositories/temporal.repository';
import type { EventSchedule } from '../types/event-schedule.types.js';

export class SqliteTemporalRepository implements TemporalRepository {
  constructor(private readonly db: Database.Database) {}

  // ============================================================================
  // Sources
  // ============================================================================

  getSource(source_id: string): Promise<TemporalSource | null> {
    const row = this.db
      .prepare(
        `
      SELECT
        source_id,
        kind,
        name,
        enabled,
        sync_status,
        last_synced_at,
        created_at,
        updated_at
      FROM temporal_sources
      WHERE source_id = ?
    `,
      )
      .get(source_id) as any;

    if (!row) return Promise.resolve(null);

    return Promise.resolve({
      source_id: row.source_id,
      kind: row.kind,
      name: row.name,
      enabled: row.enabled === 1,
      sync_status: row.sync_status,
      last_synced_at: row.last_synced_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
  }

  saveSource(source: TemporalSource): Promise<void> {
    this.db
      .prepare(
        `
      INSERT INTO temporal_sources
        (source_id, kind, name, enabled, sync_status, last_synced_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(source_id) DO UPDATE SET
        kind = excluded.kind,
        name = excluded.name,
        enabled = excluded.enabled,
        sync_status = excluded.sync_status,
        last_synced_at = excluded.last_synced_at,
        updated_at = excluded.updated_at
    `,
      )
      .run(
        source.source_id,
        source.kind,
        source.name,
        source.enabled ? 1 : 0,
        source.sync_status,
        source.last_synced_at ?? null,
        source.created_at,
        source.updated_at,
      );

    return Promise.resolve();
  }

  // ============================================================================
  // Events
  // ============================================================================

  getEvent(event_id: string): Promise<HouseholdEvent | null> {
    const row = this.db
      .prepare(
        `
      SELECT
        event_id,
        source_id,
        title,
        description,
        location,
        status,
        timezone,
        schedule_kind,
        local_start,
        local_end,
        local_start_date,
        local_end_date,
        relevance,
        significance,
        recurrence_json,
        external_identity_key,
        created_at,
        updated_at
      FROM household_events
      WHERE event_id = ?
    `,
      )
      .get(event_id) as any;

    if (!row) return Promise.resolve(null);

    return Promise.resolve(this._rowToHouseholdEvent(row));
  }

  listEvents(query: TemporalEventQuery = {}): Promise<HouseholdEvent[]> {
    let sql = `
      SELECT
        event_id,
        source_id,
        title,
        description,
        location,
        status,
        timezone,
        schedule_kind,
        local_start,
        local_end,
        local_start_date,
        local_end_date,
        relevance,
        significance,
        recurrence_json,
        external_identity_key,
        created_at,
        updated_at
      FROM household_events
      WHERE 1=1
    `;

    const params: any[] = [];

    if (query.source_id) {
      sql += ` AND source_id = ?`;
      params.push(query.source_id);
    }

    if (query.status) {
      sql += ` AND status = ?`;
      params.push(query.status);
    }

    const rows = this.db.prepare(sql).all(...params) as any[];

    return Promise.resolve(rows.map((row) => this._rowToHouseholdEvent(row)));
  }

  saveEvent(event: HouseholdEvent): Promise<void> {
    this.db
      .prepare(
        `
      INSERT INTO household_events (
        event_id,
        source_id,
        title,
        description,
        location,
        status,
        timezone,
        schedule_kind,
        local_start,
        local_end,
        local_start_date,
        local_end_date,
        relevance,
        significance,
        recurrence_json,
        external_identity_key,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(event_id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        location = excluded.location,
        status = excluded.status,
        timezone = excluded.timezone,
        schedule_kind = excluded.schedule_kind,
        local_start = excluded.local_start,
        local_end = excluded.local_end,
        local_start_date = excluded.local_start_date,
        local_end_date = excluded.local_end_date,
        relevance = excluded.relevance,
        significance = excluded.significance,
        recurrence_json = excluded.recurrence_json,
        external_identity_key = excluded.external_identity_key,
        updated_at = excluded.updated_at
    `,
      )
      .run(
        event.event_id,
        event.source_id,
        event.title,
        event.description ?? null,
        event.location ?? null,
        event.status,
        event.timezone,
        event.schedule.kind,
        event.schedule.kind === 'timed' ? event.schedule.local_start : null,
        event.schedule.kind === 'timed' ? event.schedule.local_end : null,
        event.schedule.kind === 'all_day' ? event.schedule.local_start_date : null,
        event.schedule.kind === 'all_day' ? event.schedule.local_end_date : null,
        event.relevance,
        event.significance,
        event.recurrence ? JSON.stringify(event.recurrence) : null,
        event.external_identity ? `${event.external_identity.provider}:${event.external_identity.external_event_id}` : null,
        event.created_at,
        event.updated_at,
      );

    return Promise.resolve();
  }

  deleteEvent(event_id: string): Promise<void> {
    this.db.prepare('DELETE FROM household_events WHERE event_id = ?').run(event_id);
    this.db.prepare('DELETE FROM event_occurrences WHERE event_id = ?').run(event_id);

    return Promise.resolve();
  }

  // ============================================================================
  // Occurrences
  // ============================================================================

  getOccurrence(occurrence_id: string): Promise<EventOccurrence | null> {
    const row = this.db
      .prepare(
        `
      SELECT
        occurrence_id,
        event_id,
        starts_at,
        ends_at,
        local_start_date,
        local_end_date,
        timezone,
        recurrence_instance_key,
        status,
        created_at,
        updated_at
      FROM event_occurrences
      WHERE occurrence_id = ?
    `,
      )
      .get(occurrence_id) as any;

    if (!row) return Promise.resolve(null);

    return Promise.resolve(this._rowToEventOccurrence(row));
  }

  async listOccurrences(query: OccurrenceQuery = {}): Promise<EventOccurrence[]> {
    let sql = `
      SELECT
        occurrence_id,
        event_id,
        starts_at,
        ends_at,
        local_start_date,
        local_end_date,
        timezone,
        recurrence_instance_key,
        status,
        created_at,
        updated_at
      FROM event_occurrences
      WHERE 1=1
    `;

    const params: any[] = [];

    if (query.event_id) {
      sql += ` AND event_id = ?`;
      params.push(query.event_id);
    }

    if (!query.include_cancelled) {
      sql += ` AND status != ?`;
      params.push('cancelled');
    }

    if (query.starts_before) {
      sql += ` AND (starts_at IS NULL OR starts_at < ?)`;
      params.push(query.starts_before);
    }

    if (query.ends_after) {
      sql += ` AND (ends_at IS NULL OR ends_at > ?)`;
      params.push(query.ends_after);
    }

    let rows = this.db.prepare(sql).all(...params) as any[];

    // Filter by source_id if provided (requires joining through event)
    if (query.source_id) {
      const eventIds = new Set<string>();
      const eventRows = this.db
        .prepare(
          `
        SELECT event_id FROM household_events
        WHERE source_id = ?
      `,
        )
        .all(query.source_id) as any[];

      for (const row of eventRows) {
        eventIds.add(row.event_id);
      }

      rows = rows.filter((row) => eventIds.has(row.event_id));
    }

    return rows.map((row) => this._rowToEventOccurrence(row));
  }

  saveOccurrence(occurrence: EventOccurrence): Promise<void> {
    this.db
      .prepare(
        `
      INSERT INTO event_occurrences (
        occurrence_id,
        event_id,
        starts_at,
        ends_at,
        local_start_date,
        local_end_date,
        timezone,
        recurrence_instance_key,
        status,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(occurrence_id) DO UPDATE SET
        starts_at = excluded.starts_at,
        ends_at = excluded.ends_at,
        local_start_date = excluded.local_start_date,
        local_end_date = excluded.local_end_date,
        timezone = excluded.timezone,
        recurrence_instance_key = excluded.recurrence_instance_key,
        status = excluded.status,
        updated_at = excluded.updated_at
    `,
      )
      .run(
        occurrence.occurrence_id,
        occurrence.event_id,
        occurrence.starts_at ?? null,
        occurrence.ends_at ?? null,
        occurrence.local_start_date,
        occurrence.local_end_date,
        occurrence.timezone,
        occurrence.recurrence_instance_key ?? null,
        occurrence.status,
        occurrence.created_at,
        occurrence.updated_at,
      );

    return Promise.resolve();
  }

  deleteOccurrence(occurrence_id: string): Promise<void> {
    this.db.prepare('DELETE FROM event_occurrences WHERE occurrence_id = ?').run(occurrence_id);

    return Promise.resolve();
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private _rowToHouseholdEvent(row: any): HouseholdEvent {
    let schedule: EventSchedule;

    if (row.schedule_kind === 'timed') {
      schedule = {
        kind: 'timed',
        local_start: row.local_start,
        local_end: row.local_end,
      };
    } else {
      schedule = {
        kind: 'all_day',
        local_start_date: row.local_start_date,
        local_end_date: row.local_end_date,
      };
    }

    return {
      event_id: row.event_id,
      source_id: row.source_id,
      title: row.title,
      description: row.description,
      location: row.location,
      status: row.status,
      timezone: row.timezone,
      relevance: row.relevance,
      significance: row.significance,
      schedule,
      recurrence: row.recurrence_json ? JSON.parse(row.recurrence_json) : undefined,
      external_identity: row.external_identity_key
        ? this._parseExternalIdentityKey(row.external_identity_key)
        : undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private _rowToEventOccurrence(row: any): EventOccurrence {
    return {
      occurrence_id: row.occurrence_id,
      event_id: row.event_id,
      starts_at: row.starts_at,
      ends_at: row.ends_at,
      local_start_date: row.local_start_date,
      local_end_date: row.local_end_date,
      timezone: row.timezone,
      recurrence_instance_key: row.recurrence_instance_key,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private _parseExternalIdentityKey(key: string) {
    const [provider, external_event_id, external_account_id] = key.split(':');
    return {
      provider,
      external_event_id,
      ...(external_account_id ? { external_account_id } : {}),
    };
  }
}
