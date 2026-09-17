/**
 * SQLite User-Task-State Repository - Persistence Tests
 *
 * Verifies that persisted Foothold/UserTaskState rows survive
 * repository/database recreation.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { randomBytes } from 'crypto';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { unlinkSync } from 'fs';
import { SqliteUserTaskStateRepository } from './user-task-state.repository.sqlite.js';
import { SqliteTaskRepository } from './task.repository.sqlite.js';
import { runMigrations } from './migrate.js';
import type { Task, TaskCycle, UserTaskCycleState } from '../types/task-domain.types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    task_id: 'task-1',
    title: 'Water plants',
    primary_discipline: 'order',
    secondary_disciplines: [],
    source_type: 'core',
    created_at: '2026-01-01T00:00:00Z',
    created_by_user_id: 'participant-1',
    assignment: { scope: 'individual', assigned_user_id: 'participant-1', owner_id: 'participant-1' },
    schedule: { cadence_type: 'one_off', series_anchor_date: '2026-01-05', delay_policy: 'none', has_strict_window: false },
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
    window_start: '2026-01-05T00:00:00',
    window_end: '2026-01-05T23:59:59',
    window_source: 'base',
    status: 'pending',
    responsible_user_id: 'participant-1',
    ...overrides,
  };
}

function makeState(overrides: Partial<UserTaskCycleState> = {}): UserTaskCycleState {
  return {
    task_id: 'task-1',
    cycle_id: 'task-1:2026-01-05',
    user_id: 'participant-1',
    state: 'foothold_established',
    foothold_established_at: '2026-01-05T08:00:00Z',
    updated_at: '2026-01-05T08:00:00Z',
    ...overrides,
  };
}

describe('SqliteUserTaskStateRepository - Persistence', () => {
  let dbPath: string;
  let migrationsDir: string;

  beforeAll(async () => {
    dbPath = join(tmpdir(), `aevumory-user-task-state-test-${randomBytes(4).toString('hex')}.db`);
    migrationsDir = join(__dirname, '../../migrations');

    const db = new Database(dbPath);
    runMigrations(db, migrationsDir);
    const taskRepository = new SqliteTaskRepository(db);
    await taskRepository.saveTask(makeTask());
    await taskRepository.saveCycle(makeCycle());
    db.close();
  });

  afterAll(() => {
    try {
      unlinkSync(dbPath);
    } catch {
      // Ignore errors
    }
  });

  it('persists Foothold state across database sessions', async () => {
    let db = new Database(dbPath);
    let repo = new SqliteUserTaskStateRepository(db);
    await repo.save(makeState());
    db.close();

    db = new Database(dbPath);
    repo = new SqliteUserTaskStateRepository(db);

    expect(await repo.get('task-1:2026-01-05', 'participant-1')).toEqual(makeState());

    db.close();
  });

  it('persists a state transition (foothold_established -> completed) across database sessions', async () => {
    let db = new Database(dbPath);
    let repo = new SqliteUserTaskStateRepository(db);
    const completed = makeState({
      state: 'completed',
      completed_at: '2026-01-06T08:00:00Z',
      updated_at: '2026-01-06T08:00:00Z',
    });
    await repo.save(completed);
    db.close();

    db = new Database(dbPath);
    repo = new SqliteUserTaskStateRepository(db);
    expect(await repo.get('task-1:2026-01-05', 'participant-1')).toEqual(completed);

    db.close();
  });

  it('returns null for a (cycle, user) pair with no recorded state', async () => {
    const db = new Database(dbPath);
    const repo = new SqliteUserTaskStateRepository(db);
    expect(await repo.get('task-1:2026-01-05', 'participant-2')).toBeNull();
    db.close();
  });
});
