import { describe, expect, it } from 'vitest';
import { InMemoryHouseholdRepository } from './household.repository.memory.js';

describe('InMemoryHouseholdRepository', () => {
  it('stores and retrieves a household by id', async () => {
    const repository = new InMemoryHouseholdRepository();

    const household = {
      household_id: 'household-1',
      name: 'Household',
      admin_pin_hash: null,
      created_at: '2026-09-02T00:00:00Z',
      updated_at: '2026-09-02T00:00:00Z',
    };

    await repository.save(household);
    expect(await repository.get('household-1')).toEqual(household);
  });

  it('getSingle returns the earliest-created household when multiple exist', async () => {
    const repository = new InMemoryHouseholdRepository();

    await repository.save({
      household_id: 'household-2',
      name: 'Second',
      admin_pin_hash: null,
      created_at: '2026-09-02T01:00:00Z',
      updated_at: '2026-09-02T01:00:00Z',
    });
    await repository.save({
      household_id: 'household-1',
      name: 'First',
      admin_pin_hash: null,
      created_at: '2026-09-02T00:00:00Z',
      updated_at: '2026-09-02T00:00:00Z',
    });

    expect((await repository.getSingle())?.household_id).toBe('household-1');
  });

  it('returns null when no household exists', async () => {
    const repository = new InMemoryHouseholdRepository();
    expect(await repository.getSingle()).toBeNull();
  });
});
