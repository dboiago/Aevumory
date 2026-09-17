import type { UserTaskCycleState } from '../types/task-domain.types.js';

/**
 * Persisted per-(cycle, user) `UserTaskState` — the authoritative home for
 * Foothold state (FUNCTIONAL_FOUNDATION_PLAN.md Phase 3 planning
 * correction). Absence of a row means the implicit initial state, `'active'`.
 */
export interface UserTaskStateRepository {
  get(cycle_id: string, user_id: string): Promise<UserTaskCycleState | null>;
  save(state: UserTaskCycleState): Promise<void>;
}
