/**
 * SQLite Task Repository - Persistence Tests
 *
 * Verifies that Task and TaskCycle data survives repository/database
 * recreation, including a reassignment override.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { randomBytes } from 'crypto';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { unlinkSync } from 'fs';
import { SqliteTaskRepository } from './task.repository.sqlite.js';
import { runMigrations } from './migrate.js';
import type { Task, TaskCycle } from '../types/task-domain.types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    task_id: 'task-1',
    title: 'Water plants',
    primary_discipline: 'order',
    secondary_disciplines: ['care'],
    source_type: 'core',
    created_at: '2026-01-01T00:00:00Z',
    created_by_user_id: 'participant-1',
    assignment: { scope: 'individual', assigned_user_id: 'participant-1', owner_id: 'participant-1' },
    schedule: {
      cadence_type: 'interval',
      series_anchor_date: '2026-01-05',
      interval_days: 7,
      delay_policy: 'none',
      has_strict_window: true,
      window_start_time: '07:00:00',
      window_end_time: '09:00:00',
    },
    lifecycle: {},
    supports_foothold: true,
    duration_tier: 'quick',
    effort_type: 'physical',
    cognitive_load: 'low',
    ...overrides,
  };
}

function makeCycle(overrides: Partial<TaskCycle> = {}): TaskCycle {
  return {
    cycle_id: 'task-1:2026-01-05',
    task_id: 'task-1',
    target_date: '2026-01-05',
    window_start: '2026-01-05T07:00:00',
    window_end: '2026-01-05T09:00:00',
    window_source: 'base',
    status: 'pending',
    responsible_user_id: 'participant-1',
    ...overrides,
  };
}

describe('SqliteTaskRepository - Persistence', () => {
  let dbPath: string;
  let migrationsDir: string;

  beforeAll(() => {
    dbPath = join(tmpdir(), `aevumory-task-test-${randomBytes(4).toString('hex')}.db`);
    migrationsDir = join(__dirname, '../../migrations');
  });

  afterAll(() => {
    try {
      unlinkSync(dbPath);
    } catch {
      // Ignore errors
    }
  });

  it('persists and retrieves a task across database sessions', async () => {
    let db = new Database(dbPath);
    runMigrations(db, migrationsDir);

    let repo = new SqliteTaskRepository(db);
    await repo.saveTask(makeTask());
    db.close();

    db = new Database(dbPath);
    repo = new SqliteTaskRepository(db);

    const retrieved = await repo.getTask('task-1');
    expect(retrieved).toEqual(makeTask());

    db.close();
  });

  it('persists a task update across database sessions', async () => {
    let db = new Database(dbPath);
    runMigrations(db, migrationsDir);

    let repo = new SqliteTaskRepository(db);
    const existing = await repo.getTask('task-1');
    if (!existing) throw new Error('expected task to exist from previous test');

    await repo.saveTask({ ...existing, title: 'Water all plants' });
    db.close();

    db = new Database(dbPath);
    repo = new SqliteTaskRepository(db);
    expect((await repo.getTask('task-1'))?.title).toBe('Water all plants');

    db.close();
  });

  it('persists and retrieves task cycles across database sessions', async () => {
    let db = new Database(dbPath);
    runMigrations(db, migrationsDir);

    let repo = new SqliteTaskRepository(db);
    await repo.saveCycle(makeCycle());
    db.close();

    db = new Database(dbPath);
    repo = new SqliteTaskRepository(db);

    const cycle = await repo.getCycle('task-1:2026-01-05');
    expect(cycle).toEqual(makeCycle());

    const listed = await repo.listCyclesForTask('task-1');
    expect(listed.map((item) => item.cycle_id)).toEqual(['task-1:2026-01-05']);

    db.close();
  });

  it('persists a cycle reassignment across database sessions', async () => {
    let db = new Database(dbPath);
    runMigrations(db, migrationsDir);

    let repo = new SqliteTaskRepository(db);
    const existing = await repo.getCycle('task-1:2026-01-05');
    if (!existing) throw new Error('expected cycle to exist from previous test');

    await repo.saveCycle({ ...existing, responsible_user_id: 'participant-2' });
    db.close();

    db = new Database(dbPath);
    repo = new SqliteTaskRepository(db);
    expect((await repo.getCycle('task-1:2026-01-05'))?.responsible_user_id).toBe('participant-2');

    db.close();
  });

  it('deleting a task also removes its cycles', async () => {
    let db = new Database(dbPath);
    runMigrations(db, migrationsDir);

    let repo = new SqliteTaskRepository(db);
    await repo.deleteTask('task-1');
    db.close();

    db = new Database(dbPath);
    repo = new SqliteTaskRepository(db);

    expect(await repo.getTask('task-1')).toBeNull();
    expect(await repo.listCyclesForTask('task-1')).toEqual([]);

    db.close();
  });
});
