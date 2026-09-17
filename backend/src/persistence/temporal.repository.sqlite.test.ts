/**
 * SQLite Temporal Repository - Persistence Tests
 *
 * Verifies that data stored via SqliteTemporalRepository survives
 * process restart and database re-initialization.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { randomBytes } from 'crypto';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { unlinkSync } from 'fs';
import { SqliteTemporalRepository } from './temporal.repository.sqlite';
import { runMigrations } from './migrate';
import type { TemporalSource, HouseholdEvent } from '../types/temporal-domain.types';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('SqliteTemporalRepository - Persistence', () => {
  let dbPath: string;
  let migrationsDir: string;

  beforeAll(() => {
    // Use a temporary file for testing
    dbPath = join(tmpdir(), `aevumory-test-${randomBytes(4).toString('hex')}.db`);
    // Resolve migrations directory relative to this file
    migrationsDir = join(__dirname, '../../migrations');
  });

  afterAll(() => {
    // Clean up the test database file
    try {
      unlinkSync(dbPath);
    } catch {
      // Ignore errors
    }
  });

  it('should persist and retrieve temporal sources across database sessions', async () => {
    // Session 1: Create database, run migrations, save data
    let db = new Database(dbPath);
    runMigrations(db, migrationsDir);

    let repo = new SqliteTemporalRepository(db);

    const source: TemporalSource = {
      source_id: 'local-1',
      kind: 'local',
      name: 'Household Events',
      enabled: true,
      sync_status: 'synced',
      last_synced_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await repo.saveSource(source);
    db.close();

    // Session 2: Open same database file, verify data exists
    db = new Database(dbPath);
    repo = new SqliteTemporalRepository(db);

    const retrieved = await repo.getSource('local-1');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.source_id).toBe('local-1');
    expect(retrieved?.name).toBe('Household Events');
    expect(retrieved?.enabled).toBe(true);

    db.close();
  });

  it('should persist and retrieve household events across database sessions', async () => {
    // Session 1: Create database, run migrations, save event
    let db = new Database(dbPath);
    runMigrations(db, migrationsDir);

    let repo = new SqliteTemporalRepository(db);

    // First create the source
    const source: TemporalSource = {
      source_id: 'local-events',
      kind: 'local',
      name: 'Household Events',
      enabled: true,
      sync_status: 'synced',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await repo.saveSource(source);

    // Now save an event
    const event: HouseholdEvent = {
      event_id: 'event-1',
      source_id: 'local-events',
      title: 'Team Meeting',
      description: 'Weekly sync',
      status: 'active',
      timezone: 'America/New_York',
      relevance: 'meaningful',
      significance: 'normal',
      schedule: {
        kind: 'timed',
        local_start: '2026-10-01T14:00:00',
        local_end: '2026-10-01T15:00:00',
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await repo.saveEvent(event);
    db.close();

    // Session 2: Open same database file, verify event exists
    db = new Database(dbPath);
    repo = new SqliteTemporalRepository(db);

    const retrieved = await repo.getEvent('event-1');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.event_id).toBe('event-1');
    expect(retrieved?.title).toBe('Team Meeting');
    expect(retrieved?.description).toBe('Weekly sync');
    expect(retrieved?.relevance).toBe('meaningful');
    expect(retrieved?.schedule.kind).toBe('timed');

    db.close();
  });

  it('should handle concurrent data correctly after restart', async () => {
    // Session 1: Save multiple sources
    let db = new Database(dbPath);
    runMigrations(db, migrationsDir);

    let repo = new SqliteTemporalRepository(db);

    const sources = [
      {
        source_id: 'source-1',
        kind: 'local' as const,
        name: 'Local Events',
        enabled: true,
        sync_status: 'synced' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        source_id: 'source-2',
        kind: 'external' as const,
        name: 'Google Calendar',
        enabled: false,
        sync_status: 'error' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    for (const source of sources) {
      await repo.saveSource(source);
    }

    db.close();

    // Session 2: Verify both sources exist
    db = new Database(dbPath);
    repo = new SqliteTemporalRepository(db);

    const retrieved = await repo.listEvents(); // This should not error even though we saved sources
    expect(Array.isArray(retrieved)).toBe(true);

    const source1 = await repo.getSource('source-1');
    const source2 = await repo.getSource('source-2');

    expect(source1?.name).toBe('Local Events');
    expect(source2?.name).toBe('Google Calendar');
    expect(source2?.enabled).toBe(false);

    db.close();
  });
});
