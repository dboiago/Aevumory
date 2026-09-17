/**
 * SQLite Execution Repository - Persistence Tests
 *
 * Verifies that ExecutionEvent data survives repository/database recreation.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { randomBytes } from 'crypto';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { unlinkSync } from 'fs';
import { SqliteExecutionRepository } from './execution.repository.sqlite.js';
import { SqliteTaskRepository } from './task.repository.sqlite.js';
import { runMigrations } from './migrate.js';
import type { ExecutionEvent, Task, TaskCycle } from '../types/task-domain.types.js';

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

function makeEvent(overrides: Partial<ExecutionEvent> = {}): ExecutionEvent {
  return {
    execution_id: 'execution-1',
    task_id: 'task-1',
    cycle_id: 'task-1:2026-01-05',
    completed_by_user_id: 'participant-1',
    responsible_user_id: 'participant-1',
    completed_at: '2026-01-05T08:00:00Z',
    source_type: 'core',
    outcome_type: 'completed',
    ...overrides,
  };
}

describe('SqliteExecutionRepository - Persistence', () => {
  let dbPath: string;
  let migrationsDir: string;

  beforeAll(async () => {
    dbPath = join(tmpdir(), `aevumory-execution-test-${randomBytes(4).toString('hex')}.db`);
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

  it('persists and retrieves an execution event across database sessions', async () => {
    let db = new Database(dbPath);
    let repo = new SqliteExecutionRepository(db);
    await repo.saveExecutionEvent(makeEvent());
    db.close();

    db = new Database(dbPath);
    repo = new SqliteExecutionRepository(db);

    expect(await repo.getExecutionEvent('execution-1')).toEqual(makeEvent());
    expect((await repo.listExecutionEventsForCycle('task-1:2026-01-05')).map((event) => event.execution_id)).toEqual([
      'execution-1',
    ]);

    db.close();
  });

  it('persists deductive-pruning provenance fields across database sessions', async () => {
    let db = new Database(dbPath);
    let repo = new SqliteExecutionRepository(db);
    const pruned = makeEvent({
      execution_id: 'execution-2',
      outcome_type: 'deductively_pruned',
      prune_reason_code: 'external_event_resolved',
      prune_note: 'Resolved externally',
      prune_linked_task_id: undefined,
    });
    await repo.saveExecutionEvent(pruned);
    db.close();

    db = new Database(dbPath);
    repo = new SqliteExecutionRepository(db);
    expect(await repo.getExecutionEvent('execution-2')).toEqual(pruned);

    db.close();
  });
});
