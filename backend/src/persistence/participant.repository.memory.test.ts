import { describe, expect, it } from 'vitest';
import { InMemoryParticipantRepository } from './participant.repository.memory.js';

describe('InMemoryParticipantRepository', () => {
  it('stores and retrieves a participant by id', async () => {
    const repository = new InMemoryParticipantRepository();

    const participant = {
      participant_id: 'participant-1',
      household_id: 'household-1',
      display_name: 'Alex',
      created_at: '2026-09-02T00:00:00Z',
      updated_at: '2026-09-02T00:00:00Z',
    };

    await repository.save(participant);
    expect(await repository.get('participant-1')).toEqual(participant);
  });

  it('lists participants for a household in creation order', async () => {
    const repository = new InMemoryParticipantRepository();

    await repository.save({
      participant_id: 'participant-2',
      household_id: 'household-1',
      display_name: 'Sam',
      created_at: '2026-09-02T01:00:00Z',
      updated_at: '2026-09-02T01:00:00Z',
    });
    await repository.save({
      participant_id: 'participant-1',
      household_id: 'household-1',
      display_name: 'Alex',
      created_at: '2026-09-02T00:00:00Z',
      updated_at: '2026-09-02T00:00:00Z',
    });
    await repository.save({
      participant_id: 'participant-3',
      household_id: 'household-2',
      display_name: 'Other household',
      created_at: '2026-09-02T00:30:00Z',
      updated_at: '2026-09-02T00:30:00Z',
    });

    const participants = await repository.list('household-1');
    expect(participants.map((participant) => participant.participant_id)).toEqual([
      'participant-1',
      'participant-2',
    ]);
  });

  it('deleting a participant removes it', async () => {
    const repository = new InMemoryParticipantRepository();

    await repository.save({
      participant_id: 'participant-1',
      household_id: 'household-1',
      display_name: 'Alex',
      created_at: '2026-09-02T00:00:00Z',
      updated_at: '2026-09-02T00:00:00Z',
    });

    await repository.delete('participant-1');
    expect(await repository.get('participant-1')).toBeNull();
  });
});
