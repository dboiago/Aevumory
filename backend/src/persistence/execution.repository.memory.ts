import type { ExecutionEvent } from '../types/task-domain.types.js';
import type { ExecutionRepository } from '../repositories/execution.repository.js';

export class InMemoryExecutionRepository implements ExecutionRepository {
  private readonly events = new Map<string, ExecutionEvent>();

  saveExecutionEvent(event: ExecutionEvent): Promise<void> {
    this.events.set(event.execution_id, event);
    return Promise.resolve();
  }

  getExecutionEvent(execution_id: string): Promise<ExecutionEvent | null> {
    return Promise.resolve(this.events.get(execution_id) ?? null);
  }

  listExecutionEventsForCycle(cycle_id: string): Promise<ExecutionEvent[]> {
    const events = [...this.events.values()]
      .filter((event) => event.cycle_id === cycle_id)
      .sort((a, b) => a.completed_at.localeCompare(b.completed_at));
    return Promise.resolve(events);
  }
}
