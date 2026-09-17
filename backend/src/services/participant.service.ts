/**
 * Participant Service
 *
 * Application-service boundary for creating, retrieving, updating, and
 * persisting participants. Route handlers must not talk to
 * ParticipantRepository directly.
 */

import { randomUUID } from 'node:crypto';
import type { Participant } from '../types/household.types.js';
import type { ParticipantRepository } from '../repositories/participant.repository.js';

export interface CreateParticipantInput {
  display_name: string;
  representation_ref?: string;
}

export interface UpdateParticipantInput {
  display_name?: string;
  representation_ref?: string | null;
}

export class ParticipantNotFoundError extends Error {
  constructor(participant_id: string) {
    super(`Participant not found: ${participant_id}`);
  }
}

export class ParticipantService {
  constructor(private readonly participantRepository: ParticipantRepository) {}

  list(household_id: string): Promise<Participant[]> {
    return this.participantRepository.list(household_id);
  }

  get(participant_id: string): Promise<Participant | null> {
    return this.participantRepository.get(participant_id);
  }

  async create(household_id: string, input: CreateParticipantInput): Promise<Participant> {
    const display_name = input.display_name.trim();
    if (!display_name) throw new Error('display_name is required');

    const now = new Date().toISOString();
    const participant: Participant = {
      participant_id: randomUUID(),
      household_id,
      display_name,
      representation_ref: input.representation_ref,
      created_at: now,
      updated_at: now,
    };

    await this.participantRepository.save(participant);
    return participant;
  }

  async update(participant_id: string, input: UpdateParticipantInput): Promise<Participant> {
    const existing = await this.participantRepository.get(participant_id);
    if (!existing) throw new ParticipantNotFoundError(participant_id);

    const display_name = input.display_name !== undefined ? input.display_name.trim() : existing.display_name;
    if (!display_name) throw new Error('display_name cannot be empty');

    const updated: Participant = {
      ...existing,
      display_name,
      representation_ref:
        input.representation_ref === null
          ? undefined
          : (input.representation_ref ?? existing.representation_ref),
      updated_at: new Date().toISOString(),
    };

    await this.participantRepository.save(updated);
    return updated;
  }

  async remove(participant_id: string): Promise<void> {
    await this.participantRepository.delete(participant_id);
  }
}
