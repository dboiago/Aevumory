/**
 * SQLite User-Task-State Repository
 *
 * Implements the UserTaskStateRepository interface using better-sqlite3.
 */

import type Database from 'better-sqlite3';
import type { UserTaskCycleState } from '../types/task-domain.types.js';
import type { UserTaskStateRepository } from '../repositories/user-task-state.repository.js';

interface UserTaskStateRow {
  task_id: string;
  cycle_id: string;
  user_id: string;
  state: string;
  foothold_established_at: string | null;
  completed_at: string | null;
  updated_at: string;
}

const STATE_COLUMNS = `
  task_id, cycle_id, user_id, state, foothold_established_at, completed_at, updated_at
`;

export class SqliteUserTaskStateRepository implements UserTaskStateRepository {
  constructor(private readonly db: Database.Database) {}

  get(cycle_id: string, user_id: string): Promise<UserTaskCycleState | null> {
    const row = this.db
      .prepare(`SELECT ${STATE_COLUMNS} FROM user_task_states WHERE cycle_id = ? AND user_id = ?`)
      .get(cycle_id, user_id) as UserTaskStateRow | undefined;

    return Promise.resolve(row ? rowToState(row) : null);
  }

  save(state: UserTaskCycleState): Promise<void> {
    this.db
      .prepare(
        `
      INSERT INTO user_task_states (${STATE_COLUMNS})
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(cycle_id, user_id) DO UPDATE SET
        state = excluded.state,
        foothold_established_at = excluded.foothold_established_at,
        completed_at = excluded.completed_at,
        updated_at = excluded.updated_at
    `,
      )
      .run(
        state.task_id,
        state.cycle_id,
        state.user_id,
        state.state,
        state.foothold_established_at ?? null,
        state.completed_at ?? null,
        state.updated_at,
      );

    return Promise.resolve();
  }
}

function rowToState(row: UserTaskStateRow): UserTaskCycleState {
  return {
    task_id: row.task_id,
    cycle_id: row.cycle_id,
    user_id: row.user_id,
    state: row.state as UserTaskCycleState['state'],
    foothold_established_at: row.foothold_established_at ?? undefined,
    completed_at: row.completed_at ?? undefined,
    updated_at: row.updated_at,
  };
}
