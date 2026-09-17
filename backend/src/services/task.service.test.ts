import { describe, expect, it } from 'vitest';
import { InMemoryTaskRepository } from '../persistence/task.repository.memory.js';
import { TaskCycleNotFoundError, TaskNotFoundError, TaskService, type CreateTaskInput } from './task.service.js';

function createInput(overrides: Partial<CreateTaskInput> = {}): CreateTaskInput {
  return {
    title: 'Water plants',
    primary_discipline: 'order',
    source_type: 'core',
    created_by_user_id: 'participant-1',
    assignment: { scope: 'individual', assigned_user_id: 'participant-1', owner_id: 'participant-1' },
    schedule: {
      cadence_type: 'interval',
      series_anchor_date: '2026-01-05',
      interval_days: 7,
      delay_policy: 'none',
      has_strict_window: false,
    },
    duration_tier: 'quick',
    effort_type: 'physical',
    cognitive_load: 'low',
    ...overrides,
  };
}

describe('TaskService', () => {
  it('creates a task with a generated task_id and defaults', async () => {
    const service = new TaskService(new InMemoryTaskRepository());

    const task = await service.createTask(createInput());

    expect(task.task_id).toBeTruthy();
    expect(task.secondary_disciplines).toEqual([]);
    expect(task.supports_foothold).toBe(false);
    expect(await service.listTasks()).toEqual([task]);
  });

  it('rejects a secondary discipline that duplicates the primary discipline', async () => {
    const service = new TaskService(new InMemoryTaskRepository());

    await expect(
      service.createTask(createInput({ primary_discipline: 'order', secondary_disciplines: ['order'] })),
    ).rejects.toThrow();
  });

  it('rejects an interval schedule missing series_anchor_date', async () => {
    const service = new TaskService(new InMemoryTaskRepository());

    await expect(
      service.createTask(
        createInput({
          schedule: { cadence_type: 'interval', interval_days: 7, delay_policy: 'none', has_strict_window: false },
        }),
      ),
    ).rejects.toThrow();
  });

  it('updates a task definition', async () => {
    const service = new TaskService(new InMemoryTaskRepository());
    const task = await service.createTask(createInput());

    const updated = await service.updateTask(task.task_id, { title: 'Water all plants' });

    expect(updated.title).toBe('Water all plants');
    expect((await service.getTask(task.task_id))?.title).toBe('Water all plants');
  });

  it('throws TaskNotFoundError when updating a missing task', async () => {
    const service = new TaskService(new InMemoryTaskRepository());
    await expect(service.updateTask('missing', { title: 'x' })).rejects.toThrow(TaskNotFoundError);
  });

  it('deletes a task', async () => {
    const service = new TaskService(new InMemoryTaskRepository());
    const task = await service.createTask(createInput());

    await service.deleteTask(task.task_id);

    expect(await service.getTask(task.task_id)).toBeNull();
  });

  it('lists generated cycles across all tasks within a window', async () => {
    const service = new TaskService(new InMemoryTaskRepository());
    await service.createTask(createInput());

    const cycles = await service.listCyclesInWindow({ starts_at: '2026-01-01', ends_at: '2026-01-31' });

    expect(cycles.map((cycle) => cycle.target_date)).toEqual([
      '2026-01-05',
      '2026-01-12',
      '2026-01-19',
      '2026-01-26',
    ]);
  });

  it('rejects a window that does not end after it starts', async () => {
    const service = new TaskService(new InMemoryTaskRepository());
    await expect(
      service.listCyclesInWindow({ starts_at: '2026-01-10', ends_at: '2026-01-01' }),
    ).rejects.toThrow();
  });

  it('excludes tasks whose lifecycle has already expired', async () => {
    const service = new TaskService(new InMemoryTaskRepository());
    await service.createTask(createInput({ lifecycle: { expires_at: '2025-01-01T00:00:00Z' } }));

    const cycles = await service.listCyclesInWindow({ starts_at: '2026-01-01', ends_at: '2026-01-31' });

    expect(cycles).toEqual([]);
  });

  it('reassigns a not-yet-materialized (virtual) cycle without requiring admin authorization at the service boundary', async () => {
    const service = new TaskService(new InMemoryTaskRepository());
    const task = await service.createTask(createInput());
    const cycleId = `${task.task_id}:2026-01-05`;

    const reassigned = await service.reassignCycle(cycleId, 'participant-2');

    expect(reassigned.responsible_user_id).toBe('participant-2');
  });

  it('persists reassignment so a later window query reflects the override', async () => {
    const service = new TaskService(new InMemoryTaskRepository());
    const task = await service.createTask(createInput());
    const cycleId = `${task.task_id}:2026-01-05`;

    await service.reassignCycle(cycleId, 'participant-2');
    const cycles = await service.listCyclesInWindow({ starts_at: '2026-01-01', ends_at: '2026-01-10' });

    expect(cycles.find((cycle) => cycle.cycle_id === cycleId)?.responsible_user_id).toBe('participant-2');
  });

  it('reassigns to the household bucket by clearing responsible_user_id', async () => {
    const service = new TaskService(new InMemoryTaskRepository());
    const task = await service.createTask(createInput());
    const cycleId = `${task.task_id}:2026-01-05`;

    const reassigned = await service.reassignCycle(cycleId, undefined);

    expect(reassigned.responsible_user_id).toBeUndefined();
  });

  it('throws TaskCycleNotFoundError for a cycle referencing an unknown task', async () => {
    const service = new TaskService(new InMemoryTaskRepository());
    await expect(service.reassignCycle('missing-task:2026-01-05', 'participant-2')).rejects.toThrow(
      TaskCycleNotFoundError,
    );
  });

  it('lists only persisted cycles for a task via listPersistedCyclesForTask', async () => {
    const service = new TaskService(new InMemoryTaskRepository());
    const task = await service.createTask(createInput());

    expect(await service.listPersistedCyclesForTask(task.task_id)).toEqual([]);

    await service.reassignCycle(`${task.task_id}:2026-01-05`, 'participant-2');

    const persisted = await service.listPersistedCyclesForTask(task.task_id);
    expect(persisted).toHaveLength(1);
    expect(persisted[0].responsible_user_id).toBe('participant-2');
  });
});
