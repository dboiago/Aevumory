import { participantsApi, rewardsApi, rewardsBalanceApi, type ParticipantDto, type RewardDto } from './api-client';

export type RewardCategory = 'personal_leisure' | 'household' | 'experience';

export interface RewardsState {
  participants: ParticipantDto[];
  rewards: RewardDto[];
}

export interface RewardsQuery {
  getState(): Promise<RewardsState>;
}

/**
 * Real, backend-backed Rewards query (FUNCTIONAL_FOUNDATION_PLAN.md Phase
 * 4) — matches ApiTaskBoardQuery in tasks.ts. There is no fixture/demo
 * reward data; a fresh household legitimately has none yet.
 */
export class ApiRewardsQuery implements RewardsQuery {
  async getState(): Promise<RewardsState> {
    const [participants, rewards] = await Promise.all([
      participantsApi.list().catch(() => []),
      rewardsApi.list().catch(() => []),
    ]);

    return { participants, rewards };
  }
}

export async function getParticipantBalance(participantId: string): Promise<number> {
  const result = await rewardsBalanceApi.get(participantId);
  return result.balance;
}
