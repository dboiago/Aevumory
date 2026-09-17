import { describe, expect, it } from 'vitest';
import { InMemoryParticipantRepository } from '../persistence/participant.repository.memory.js';
import { ParticipantNotFoundError, ParticipantService } from './participant.service.js';

describe('ParticipantService', () => {
  it('creates a participant with a stable persistent identity', async () => {
    const repository = new InMemoryParticipantRepository();
    const service = new ParticipantService(repository);

    const participant = await service.create('household-1', { display_name: 'Alex' });

    expect(participant.participant_id).toBeTruthy();
    expect(participant.household_id).toBe('household-1');
    expect(await repository.get(participant.participant_id)).toEqual(participant);
  });

  it('rejects an empty display name', async () => {
    const repository = new InMemoryParticipantRepository();
    const service = new ParticipantService(repository);

    await expect(service.create('household-1', { display_name: '   ' })).rejects.toThrow(
      'display_name is required',
    );
  });

  it('lists participants for a household', async () => {
    const repository = new InMemoryParticipantRepository();
    const service = new ParticipantService(repository);

    await service.create('household-1', { display_name: 'Alex' });
    await service.create('household-1', { display_name: 'Sam' });

    const participants = await service.list('household-1');
    expect(participants.map((participant) => participant.display_name)).toEqual(['Alex', 'Sam']);
  });

  it('updates a participant display name and representation_ref', async () => {
    const repository = new InMemoryParticipantRepository();
    const service = new ParticipantService(repository);

    const created = await service.create('household-1', { display_name: 'Alex' });
    expect(created.display_name).toBe('Alex');

    const updated = await service.update(created.participant_id, {
      display_name: 'Alexandra',
      representation_ref: 'avatar-2',
    });

    expect(updated.display_name).toBe('Alexandra');
    expect(updated.representation_ref).toBe('avatar-2');
    expect(new Date(updated.updated_at).getTime()).toBeGreaterThanOrEqual(new Date(created.updated_at).getTime());
  });

  it('throws ParticipantNotFoundError when updating a missing participant', async () => {
    const repository = new InMemoryParticipantRepository();
    const service = new ParticipantService(repository);

    await expect(service.update('missing', { display_name: 'X' })).rejects.toBeInstanceOf(
      ParticipantNotFoundError,
    );
  });

  it('removes a participant', async () => {
    const repository = new InMemoryParticipantRepository();
    const service = new ParticipantService(repository);

    const created = await service.create('household-1', { display_name: 'Alex' });
    await service.remove(created.participant_id);

    expect(await repository.get(created.participant_id)).toBeNull();
  });
});
