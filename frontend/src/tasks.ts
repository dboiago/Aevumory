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
    { id: 'participant:alex', name: 'Alex' },
    { id: 'participant:sam', name: 'Sam' },
    { id: 'participant:jordan', name: 'Jordan' },
    { id: 'participant:kait', name: 'Kait' },
    { id: 'participant:frank', name: 'Frank' },
    { id: 'participant:sue', name: 'Sue' },
    { id: 'participant:maya', name: 'Maya' },
    { id: 'participant:liam', name: 'Liam' },
  ],
  tasks: [
    {
      id: 'task:alex-laundry',
      title: 'Fold laundry',
      domain: 'keeping',
      assignment: 'individual',
      responsibleUserId: 'participant:alex',
      status: 'pending',
      dueAt: '2026-09-02T19:00:00-04:00',
      indicators: ['Recurring'],
      reward: { experience: 18, credits: 4 },
    },
    {
      id: 'task:jordan-practice',
      title: 'Instrument practice',
      domain: 'erudite',
      assignment: 'individual',
      responsibleUserId: 'participant:jordan',
      status: 'pending',
      dueAt: '2026-09-02T18:30:00-04:00',
      reward: { experience: 25, credits: 5 },
    },
    {
      id: 'task:jordan-room',
      title: 'Tidy bedroom',
      domain: 'keeping',
      assignment: 'individual',
      responsibleUserId: 'participant:jordan',
      status: 'pending',
      dueAt: '2026-09-02T19:15:00-04:00',
      reward: { experience: 15, credits: 3 },
    },
    {
      id: 'task:jordan-dishes',
      title: 'Load dishwasher',
      domain: 'keeping',
      assignment: 'individual',
      responsibleUserId: 'participant:jordan',
      status: 'pending',
      dueAt: '2026-09-02T20:00:00-04:00',
      reward: { experience: 12, credits: 3 },
    },
    {
      id: 'task:jordan-reading',
      title: 'Read for 20 minutes',
      domain: 'erudite',
      assignment: 'individual',
      responsibleUserId: 'participant:jordan',
      status: 'pending',
      dueAt: '2026-09-02T20:30:00-04:00',
      reward: { experience: 20, credits: 4 },
    },
    {
      id: 'task:jordan-bag',
      title: 'Pack school bag',
      domain: 'keeping',
      assignment: 'individual',
      responsibleUserId: 'participant:jordan',
      status: 'pending',
      dueAt: '2026-09-02T21:00:00-04:00',
      reward: { experience: 10, credits: 2 },
    },
    {
      id: 'task:kait-table',
      title: 'Set the table',
      domain: 'keeping',
      assignment: 'individual',
      responsibleUserId: 'participant:kait',
      status: 'pending',
      dueAt: '2026-09-02T18:45:00-04:00',
      reward: { experience: 12, credits: 2 },
    },
    {
      id: 'task:kait-lunch',
      title: 'Pack tomorrow’s lunch',
      domain: 'keeping',
      assignment: 'individual',
      responsibleUserId: 'participant:kait',
      status: 'pending',
      dueAt: '2026-09-02T20:30:00-04:00',
      reward: { experience: 14, credits: 3 },
    },
    {
      id: 'task:frank-recycling',
      title: 'Take out recycling',
      domain: 'keeping',
      assignment: 'individual',
      responsibleUserId: 'participant:frank',
      status: 'pending',
      dueAt: '2026-09-02T18:15:00-04:00',
      indicators: ['Recurring'],
      reward: { experience: 10, credits: 2 },
    },
    {
      id: 'task:maya-homework',
      title: 'Finish homework',
      domain: 'erudite',
      assignment: 'individual',
      responsibleUserId: 'participant:maya',
      status: 'pending',
      dueAt: '2026-09-02T19:30:00-04:00',
      reward: { experience: 20, credits: 4 },
    },
    {
      id: 'task:maya-laundry',
      title: 'Put away clean clothes',
      domain: 'keeping',
      assignment: 'individual',
      responsibleUserId: 'participant:maya',
      status: 'pending',
      dueAt: '2026-09-02T20:00:00-04:00',
      reward: { experience: 12, credits: 2 },
    },
    {
      id: 'task:maya-desk',
      title: 'Clear desk',
      domain: 'keeping',
      assignment: 'individual',
      responsibleUserId: 'participant:maya',
      status: 'pending',
      dueAt: '2026-09-02T20:15:00-04:00',
      reward: { experience: 10, credits: 2 },
    },
    {
      id: 'task:maya-practice',
      title: 'Practice piano',
      domain: 'erudite',
      assignment: 'individual',
      responsibleUserId: 'participant:maya',
      status: 'pending',
      dueAt: '2026-09-02T20:45:00-04:00',
      reward: { experience: 22, credits: 4 },
    },
    {
      id: 'task:liam-shoes',
      title: 'Put away shoes',
      domain: 'keeping',
      assignment: 'individual',
      responsibleUserId: 'participant:liam',
      status: 'pending',
      dueAt: '2026-09-02T18:30:00-04:00',
      reward: { experience: 8, credits: 1 },
    },
    {
      id: 'task:liam-books',
      title: 'Put books away',
      domain: 'keeping',
      assignment: 'individual',
      responsibleUserId: 'participant:liam',
      status: 'pending',
      dueAt: '2026-09-02T19:00:00-04:00',
      reward: { experience: 8, credits: 1 },
    },
    {
      id: 'task:liam-coat',
      title: 'Hang up coat',
      domain: 'keeping',
      assignment: 'individual',
      responsibleUserId: 'participant:liam',
      status: 'pending',
      dueAt: '2026-09-02T19:15:00-04:00',
      reward: { experience: 8, credits: 1 },
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
      id: 'task:kitchen',
      title: 'Reset the kitchen',
      domain: 'keeping',
      assignment: 'household',
      status: 'pending',
      dueAt: '2026-09-02T20:30:00-04:00',
      reward: { experience: 18, credits: 4 },
    },
    {
      id: 'task:calendar',
      title: 'Check tomorrow’s schedule',
      domain: 'form',
      assignment: 'household',
      status: 'pending',
      dueAt: '2026-09-02T21:00:00-04:00',
      reward: { experience: 10, credits: 2 },
    },
    {
      id: 'task:recycling-completed',
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
