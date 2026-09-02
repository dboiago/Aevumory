export type TaskDomain = 'kinetic' | 'erudite' | 'form' | 'keeping';

export type TaskAssignment = 'individual' | 'household';

export type TaskStatus = 'pending' | 'completed';

export type HouseholdParticipant = {
  id: string;
  name: string;
};

export type TaskBoardItem = {
  id: string;
  title: string;
  domain: TaskDomain;
  assignment: TaskAssignment;
  responsibleUserId?: string;
  status: TaskStatus;
};

export type TaskBoardState = {
  participants: HouseholdParticipant[];
  tasks: TaskBoardItem[];
};

const fixtureState: TaskBoardState = {
  participants: [
    { id: 'participant:one', name: 'Alex' },
    { id: 'participant:two', name: 'Sam' },
  ],
  tasks: [
    {
      id: 'task:laundry',
      title: 'Fold laundry',
      domain: 'keeping',
      assignment: 'individual',
      responsibleUserId: 'participant:one',
      status: 'pending',
    },
    {
      id: 'task:groceries',
      title: 'Put away groceries',
      domain: 'keeping',
      assignment: 'household',
      status: 'pending',
    },
    {
      id: 'task:practice',
      title: 'Instrument practice',
      domain: 'erudite',
      assignment: 'individual',
      responsibleUserId: 'participant:two',
      status: 'pending',
    },
    {
      id: 'task:recycling',
      title: 'Take out recycling',
      domain: 'keeping',
      assignment: 'household',
      status: 'completed',
    },
  ],
};

export interface TaskBoardQuery {
  getBoard(): Promise<TaskBoardState>;
}

export class FixtureTaskBoardQuery implements TaskBoardQuery {
  async getBoard(): Promise<TaskBoardState> {
    return structuredClone(fixtureState);
  }
}
