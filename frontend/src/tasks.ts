export type TaskDomain = 'kinetic' | 'erudite' | 'form' | 'keeping';

export type TaskAssignment = 'individual' | 'household';

export type TaskStatus = 'pending' | 'completed';

export type TaskReward = {
  experience: number;
  credits: number;
  exceptional?: boolean;
};

export type HouseholdParticipant = {
  id: string;
  name: string;
  avatarUrl?: string;
};

export type TaskBoardItem = {
  id: string;
  title: string;
  domain: TaskDomain;
  assignment: TaskAssignment;
  responsibleUserId?: string;
  status: TaskStatus;
  dueAt?: string;
  indicators?: string[];
  reward: TaskReward;
  completionReward?: TaskReward;
  completedAt?: string;
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
      dueAt: '2026-09-02T19:00:00-04:00',
      indicators: ['Recurring'],
      reward: { experience: 18, credits: 4 },
    },
    {
      id: 'task:groceries',
      title: 'Put away groceries',
      domain: 'keeping',
      assignment: 'household',
      status: 'pending',
      dueAt: '2026-09-02T20:00:00-04:00',
      indicators: ['Priority'],
      reward: { experience: 12, credits: 3 },
    },
    {
      id: 'task:practice',
      title: 'Instrument practice',
      domain: 'erudite',
      assignment: 'individual',
      responsibleUserId: 'participant:two',
      status: 'pending',
      dueAt: '2026-09-02T18:30:00-04:00',
      reward: { experience: 25, credits: 5 },
    },
    {
      id: 'task:airport',
      title: 'Pick up Maya from the airport',
      domain: 'kinetic',
      assignment: 'household',
      status: 'pending',
      dueAt: '2026-09-04T13:00:00-04:00',
      indicators: ['Priority'],
      reward: { experience: 42, credits: 8 },
    },
    {
      id: 'task:recycling',
      title: 'Take out recycling',
      domain: 'keeping',
      assignment: 'household',
      status: 'completed',
      dueAt: '2026-09-02T18:00:00-04:00',
      indicators: ['Maintenance', 'Recurring'],
      reward: { experience: 10, credits: 2 },
      completionReward: { experience: 10, credits: 2 },
      completedAt: '2026-09-02T18:00:00-04:00',
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
