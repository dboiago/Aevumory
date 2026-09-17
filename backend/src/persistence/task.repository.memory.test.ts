import { describe, expect, it } from 'vitest';
import { InMemoryTaskRepository } from './task.repository.memory.js';
import type { Task, TaskCycle } from '../types/task-domain.types.js';

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
    supports_foothold: false,
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
    ...overrides,
  };
}

describe('InMemoryTaskRepository', () => {
  it('stores and retrieves a task by id', async () => {
    const repository = new InMemoryTaskRepository();
    const task = makeTask();

    await repository.saveTask(task);

    expect(await repository.getTask('task-1')).toEqual(task);
    expect(await repository.listTasks()).toEqual([task]);
  });

  it('returns null for an unknown task', async () => {
    const repository = new InMemoryTaskRepository();
    expect(await repository.getTask('missing')).toBeNull();
  });

  it('deletes a task and its associated cycles', async () => {
    const repository = new InMemoryTaskRepository();
    await repository.saveTask(makeTask());
    await repository.saveCycle(makeCycle());

    await repository.deleteTask('task-1');

    expect(await repository.getTask('task-1')).toBeNull();
    expect(await repository.listCyclesForTask('task-1')).toEqual([]);
  });

  it('stores and lists cycles for a task in target_date order', async () => {
    const repository = new InMemoryTaskRepository();
    await repository.saveCycle(makeCycle({ cycle_id: 'task-1:2026-01-12', target_date: '2026-01-12' }));
    await repository.saveCycle(makeCycle({ cycle_id: 'task-1:2026-01-05', target_date: '2026-01-05' }));

    const cycles = await repository.listCyclesForTask('task-1');

    expect(cycles.map((cycle) => cycle.target_date)).toEqual(['2026-01-05', '2026-01-12']);
  });

  it('persists cycle updates such as reassignment', async () => {
    const repository = new InMemoryTaskRepository();
    await repository.saveCycle(makeCycle());

    await repository.saveCycle(makeCycle({ responsible_user_id: 'participant-2' }));

    const cycle = await repository.getCycle('task-1:2026-01-05');
    expect(cycle?.responsible_user_id).toBe('participant-2');
  });
});
