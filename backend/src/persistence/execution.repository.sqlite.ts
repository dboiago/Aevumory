/**
 * SQLite Execution Repository
 *
 * Implements the ExecutionRepository interface using better-sqlite3.
 */

import type Database from 'better-sqlite3';
import type { ExecutionEvent } from '../types/task-domain.types.js';
import type { ExecutionRepository } from '../repositories/execution.repository.js';

interface ExecutionEventRow {
  execution_id: string;
  task_id: string;
  cycle_id: string;
  completed_by_user_id: string | null;
  responsible_user_id: string | null;
  completed_at: string;
  source_type: string;
  outcome_type: string;
  prune_reason_code: string | null;
  prune_note: string | null;
  prune_linked_task_id: string | null;
}

const EVENT_COLUMNS = `
  execution_id, task_id, cycle_id, completed_by_user_id, responsible_user_id,
  completed_at, source_type, outcome_type,
  prune_reason_code, prune_note, prune_linked_task_id
`;

export class SqliteExecutionRepository implements ExecutionRepository {
  constructor(private readonly db: Database.Database) {}

  saveExecutionEvent(event: ExecutionEvent): Promise<void> {
    this.db
      .prepare(
        `
      INSERT INTO execution_events (${EVENT_COLUMNS})
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        event.execution_id,
        event.task_id,
        event.cycle_id,
        event.completed_by_user_id ?? null,
        event.responsible_user_id ?? null,
        event.completed_at,
        event.source_type,
        event.outcome_type,
        event.prune_reason_code ?? null,
        event.prune_note ?? null,
        event.prune_linked_task_id ?? null,
      );

    return Promise.resolve();
  }

  getExecutionEvent(execution_id: string): Promise<ExecutionEvent | null> {
    const row = this.db
      .prepare(`SELECT ${EVENT_COLUMNS} FROM execution_events WHERE execution_id = ?`)
      .get(execution_id) as ExecutionEventRow | undefined;

    return Promise.resolve(row ? rowToEvent(row) : null);
  }

  listExecutionEventsForCycle(cycle_id: string): Promise<ExecutionEvent[]> {
    const rows = this.db
      .prepare(`SELECT ${EVENT_COLUMNS} FROM execution_events WHERE cycle_id = ? ORDER BY completed_at ASC`)
      .all(cycle_id) as ExecutionEventRow[];

    return Promise.resolve(rows.map(rowToEvent));
  }
}

function rowToEvent(row: ExecutionEventRow): ExecutionEvent {
  return {
    execution_id: row.execution_id,
    task_id: row.task_id,
    cycle_id: row.cycle_id,
    completed_by_user_id: row.completed_by_user_id ?? undefined,
    responsible_user_id: row.responsible_user_id ?? undefined,
    completed_at: row.completed_at,
    source_type: row.source_type as ExecutionEvent['source_type'],
    outcome_type: row.outcome_type as ExecutionEvent['outcome_type'],
    prune_reason_code: row.prune_reason_code ?? undefined,
    prune_note: row.prune_note ?? undefined,
    prune_linked_task_id: row.prune_linked_task_id ?? undefined,
  };
}
