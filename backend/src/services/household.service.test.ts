import { describe, expect, it } from 'vitest';
import { InMemoryHouseholdRepository } from '../persistence/household.repository.memory.js';
import { HouseholdService } from './household.service.js';

describe('HouseholdService', () => {
  it('bootstraps a single household on first call', async () => {
    const repository = new InMemoryHouseholdRepository();
    const service = new HouseholdService(repository);

    const household = await service.ensureBootstrapped();
    expect(household.admin_pin_hash).toBeNull();
    expect(await repository.getSingle()).toEqual(household);
  });

  it('is idempotent: calling bootstrap again returns the same household', async () => {
    const repository = new InMemoryHouseholdRepository();
    const service = new HouseholdService(repository);

    const first = await service.ensureBootstrapped();
    const second = await service.ensureBootstrapped();

    expect(second).toEqual(first);
  });

  it('getHousehold bootstraps if not yet initialized', async () => {
    const repository = new InMemoryHouseholdRepository();
    const service = new HouseholdService(repository);

    expect(await repository.getSingle()).toBeNull();
    const household = await service.getHousehold();
    expect(household).not.toBeNull();
  });

  it('setAdminPinHash updates the stored hash and updated_at', async () => {
    const repository = new InMemoryHouseholdRepository();
    const service = new HouseholdService(repository);

    const household = await service.ensureBootstrapped();
    expect(household.admin_pin_hash).toBeNull();

    const updated = await service.setAdminPinHash(household.household_id, 'salt:hash');

    expect(updated.admin_pin_hash).toBe('salt:hash');
    expect(new Date(updated.updated_at).getTime()).toBeGreaterThanOrEqual(new Date(household.updated_at).getTime());
  });
});
