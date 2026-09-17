import type { Participant } from '../types/household.types.js';
import type { ParticipantRepository } from '../repositories/participant.repository.js';

export class InMemoryParticipantRepository implements ParticipantRepository {
  private readonly participants = new Map<string, Participant>();

  get(participant_id: string): Promise<Participant | null> {
    return Promise.resolve(this.participants.get(participant_id) ?? null);
  }

  list(household_id: string): Promise<Participant[]> {
    const participants = [...this.participants.values()]
      .filter((participant) => participant.household_id === household_id)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    return Promise.resolve(participants);
  }

  save(participant: Participant): Promise<void> {
    this.participants.set(participant.participant_id, participant);
    return Promise.resolve();
  }

  delete(participant_id: string): Promise<void> {
    this.participants.delete(participant_id);
    return Promise.resolve();
  }
}
