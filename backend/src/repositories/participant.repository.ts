import type { Participant } from '../types/household.types.js';

export interface ParticipantRepository {
  get(participant_id: string): Promise<Participant | null>;
  list(household_id: string): Promise<Participant[]>;
  save(participant: Participant): Promise<void>;
  delete(participant_id: string): Promise<void>;
}
