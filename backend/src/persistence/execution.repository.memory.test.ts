import { describe, expect, it } from 'vitest';
import { InMemoryExecutionRepository } from './execution.repository.memory.js';
import type { ExecutionEvent } from '../types/task-domain.types.js';

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

describe('InMemoryExecutionRepository', () => {
  it('stores and retrieves an execution event by id', async () => {
    const repository = new InMemoryExecutionRepository();
    const event = makeEvent();

    await repository.saveExecutionEvent(event);

    expect(await repository.getExecutionEvent('execution-1')).toEqual(event);
  });

  it('returns null for an unknown execution event', async () => {
    const repository = new InMemoryExecutionRepository();
    expect(await repository.getExecutionEvent('missing')).toBeNull();
  });

  it('lists execution events for a cycle, oldest first', async () => {
    const repository = new InMemoryExecutionRepository();
    await repository.saveExecutionEvent(makeEvent({ execution_id: 'execution-2', completed_at: '2026-01-05T09:00:00Z' }));
    await repository.saveExecutionEvent(makeEvent({ execution_id: 'execution-1', completed_at: '2026-01-05T08:00:00Z' }));

    const events = await repository.listExecutionEventsForCycle('task-1:2026-01-05');

    expect(events.map((event) => event.execution_id)).toEqual(['execution-1', 'execution-2']);
  });

  it('preserves deductive-pruning provenance fields', async () => {
    const repository = new InMemoryExecutionRepository();
    const event = makeEvent({
      outcome_type: 'deductively_pruned',
      prune_reason_code: 'external_event_resolved',
      prune_note: 'Neighbour already mowed the lawn',
      prune_linked_task_id: 'task-2',
    });

    await repository.saveExecutionEvent(event);

    expect(await repository.getExecutionEvent('execution-1')).toEqual(event);
  });
});
