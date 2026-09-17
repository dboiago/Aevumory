/**
 * SQLite Participant Repository
 *
 * Implements the ParticipantRepository interface using better-sqlite3.
 */

import type Database from 'better-sqlite3';
import type { Participant } from '../types/household.types.js';
import type { ParticipantRepository } from '../repositories/participant.repository.js';

interface ParticipantRow {
  participant_id: string;
  household_id: string;
  display_name: string;
  representation_ref: string | null;
  created_at: string;
  updated_at: string;
}

export class SqliteParticipantRepository implements ParticipantRepository {
  constructor(private readonly db: Database.Database) {}

  get(participant_id: string): Promise<Participant | null> {
    const row = this.db
      .prepare(
        `
      SELECT participant_id, household_id, display_name, representation_ref, created_at, updated_at
      FROM participants
      WHERE participant_id = ?
    `,
      )
      .get(participant_id) as ParticipantRow | undefined;

    return Promise.resolve(row ? rowToParticipant(row) : null);
  }

  list(household_id: string): Promise<Participant[]> {
    const rows = this.db
      .prepare(
        `
      SELECT participant_id, household_id, display_name, representation_ref, created_at, updated_at
      FROM participants
      WHERE household_id = ?
      ORDER BY created_at ASC
    `,
      )
      .all(household_id) as ParticipantRow[];

    return Promise.resolve(rows.map(rowToParticipant));
  }

  save(participant: Participant): Promise<void> {
    this.db
      .prepare(
        `
      INSERT INTO participants (participant_id, household_id, display_name, representation_ref, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(participant_id) DO UPDATE SET
        display_name = excluded.display_name,
        representation_ref = excluded.representation_ref,
        updated_at = excluded.updated_at
    `,
      )
      .run(
        participant.participant_id,
        participant.household_id,
        participant.display_name,
        participant.representation_ref ?? null,
        participant.created_at,
        participant.updated_at,
      );

    return Promise.resolve();
  }

  delete(participant_id: string): Promise<void> {
    this.db.prepare('DELETE FROM participants WHERE participant_id = ?').run(participant_id);
    return Promise.resolve();
  }
}

function rowToParticipant(row: ParticipantRow): Participant {
  return {
    participant_id: row.participant_id,
    household_id: row.household_id,
    display_name: row.display_name,
    representation_ref: row.representation_ref ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
