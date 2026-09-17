/**
 * SQLite Household Repository
 *
 * Implements the HouseholdRepository interface using better-sqlite3.
 * Aevumory supports exactly one Household row per installation.
 */

import type Database from 'better-sqlite3';
import type { Household } from '../types/household.types.js';
import type { HouseholdRepository } from '../repositories/household.repository.js';

interface HouseholdRow {
  household_id: string;
  name: string;
  admin_pin_hash: string | null;
  created_at: string;
  updated_at: string;
}

export class SqliteHouseholdRepository implements HouseholdRepository {
  constructor(private readonly db: Database.Database) {}

  get(household_id: string): Promise<Household | null> {
    const row = this.db
      .prepare(
        `
      SELECT household_id, name, admin_pin_hash, created_at, updated_at
      FROM households
      WHERE household_id = ?
    `,
      )
      .get(household_id) as HouseholdRow | undefined;

    return Promise.resolve(row ? rowToHousehold(row) : null);
  }

  getSingle(): Promise<Household | null> {
    const row = this.db
      .prepare(
        `
      SELECT household_id, name, admin_pin_hash, created_at, updated_at
      FROM households
      ORDER BY created_at ASC
      LIMIT 1
    `,
      )
      .get() as HouseholdRow | undefined;

    return Promise.resolve(row ? rowToHousehold(row) : null);
  }

  save(household: Household): Promise<void> {
    this.db
      .prepare(
        `
      INSERT INTO households (household_id, name, admin_pin_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(household_id) DO UPDATE SET
        name = excluded.name,
        admin_pin_hash = excluded.admin_pin_hash,
        updated_at = excluded.updated_at
    `,
      )
      .run(
        household.household_id,
        household.name,
        household.admin_pin_hash,
        household.created_at,
        household.updated_at,
      );

    return Promise.resolve();
  }
}

function rowToHousehold(row: HouseholdRow): Household {
  return {
    household_id: row.household_id,
    name: row.name,
    admin_pin_hash: row.admin_pin_hash,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
