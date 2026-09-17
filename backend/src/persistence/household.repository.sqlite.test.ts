/**
 * SQLite Household & Participant Repository - Persistence Tests
 *
 * Verifies that data stored via SqliteHouseholdRepository/SqliteParticipantRepository
 * survives process restart and database re-initialization.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { randomBytes } from 'crypto';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { unlinkSync } from 'fs';
import { SqliteHouseholdRepository } from './household.repository.sqlite.js';
import { SqliteParticipantRepository } from './participant.repository.sqlite.js';
import { runMigrations } from './migrate.js';
import type { Household, Participant } from '../types/household.types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('SqliteHouseholdRepository / SqliteParticipantRepository - Persistence', () => {
  let dbPath: string;
  let migrationsDir: string;

  beforeAll(() => {
    dbPath = join(tmpdir(), `aevumory-household-test-${randomBytes(4).toString('hex')}.db`);
    migrationsDir = join(__dirname, '../../migrations');
  });

  afterAll(() => {
    try {
      unlinkSync(dbPath);
    } catch {
      // Ignore errors
    }
  });

  it('should persist and retrieve the household across database sessions', async () => {
    let db = new Database(dbPath);
    runMigrations(db, migrationsDir);

    let repo = new SqliteHouseholdRepository(db);

    const household: Household = {
      household_id: 'household-1',
      name: 'Household',
      admin_pin_hash: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await repo.save(household);
    db.close();

    db = new Database(dbPath);
    repo = new SqliteHouseholdRepository(db);

    const retrieved = await repo.getSingle();
    expect(retrieved).not.toBeNull();
    expect(retrieved?.household_id).toBe('household-1');
    expect(retrieved?.admin_pin_hash).toBeNull();

    db.close();
  });

  it('should persist an admin_pin_hash update across database sessions', async () => {
    let db = new Database(dbPath);
    runMigrations(db, migrationsDir);

    let repo = new SqliteHouseholdRepository(db);
    const household = await repo.getSingle();
    if (!household) throw new Error('expected household to exist from previous test');

    await repo.save({ ...household, admin_pin_hash: 'salt:hash', updated_at: new Date().toISOString() });
    db.close();

    db = new Database(dbPath);
    repo = new SqliteHouseholdRepository(db);
    const retrieved = await repo.getSingle();
    expect(retrieved?.admin_pin_hash).toBe('salt:hash');

    db.close();
  });

  it('should persist and retrieve participants across database sessions', async () => {
    let db = new Database(dbPath);
    runMigrations(db, migrationsDir);

    let repo = new SqliteParticipantRepository(db);

    const participant: Participant = {
      participant_id: 'participant-1',
      household_id: 'household-1',
      display_name: 'Alex',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await repo.save(participant);
    db.close();

    db = new Database(dbPath);
    repo = new SqliteParticipantRepository(db);

    const retrieved = await repo.get('participant-1');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.display_name).toBe('Alex');

    const listed = await repo.list('household-1');
    expect(listed.map((item) => item.participant_id)).toEqual(['participant-1']);

    db.close();
  });
});
