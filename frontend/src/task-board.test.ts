import { describe, expect, it } from 'vitest';
import { FixtureTaskBoardStore, householdTasks, participantTasks } from './task-board';
import { FixtureTaskBoardQuery } from './tasks';

describe('task board', () => {
  it('separates individual responsibility from household tasks', async () => {
    const state = await new FixtureTaskBoardQuery().getBoard();

    expect(participantTasks(state, 'participant:one').map((task) => task.id)).toEqual([
      'task:laundry',
    ]);
    expect(householdTasks(state).map((task) => task.id)).toEqual([
      'task:groceries',
      'task:recycling',
    ]);
  });

  it('changes responsibility without changing task identity', async () => {
    const state = await new FixtureTaskBoardQuery().getBoard();
    const store = new FixtureTaskBoardStore(state);

    const updated = store.apply({
      kind: 'assign',
      taskId: 'task:groceries',
      responsibleUserId: 'participant:two',
    });

    expect(updated.tasks.find((task) => task.id === 'task:groceries')).toMatchObject({
      id: 'task:groceries',
      assignment: 'individual',
      responsibleUserId: 'participant:two',
      status: 'pending',
    });
  });

  it('completes a task without changing responsibility', async () => {
    const state = await new FixtureTaskBoardQuery().getBoard();
    const store = new FixtureTaskBoardStore(state);

    const updated = store.apply({ kind: 'complete', taskId: 'task:laundry' });

    expect(updated.tasks.find((task) => task.id === 'task:laundry')).toMatchObject({
      id: 'task:laundry',
      responsibleUserId: 'participant:one',
      status: 'completed',
    });
  });
});
