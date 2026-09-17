import type { ExecutionEvent } from '../types/task-domain.types.js';

/**
 * Persisted `ExecutionEvent` records — created through TaskExecutionService,
 * never written to directly by routes (FUNCTIONAL_FOUNDATION_PLAN.md Phase 3).
 */
export interface ExecutionRepository {
  saveExecutionEvent(event: ExecutionEvent): Promise<void>;
  getExecutionEvent(execution_id: string): Promise<ExecutionEvent | null>;
  listExecutionEventsForCycle(cycle_id: string): Promise<ExecutionEvent[]>;
}
