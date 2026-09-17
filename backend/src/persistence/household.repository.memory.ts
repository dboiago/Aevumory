import type { Household } from '../types/household.types.js';
import type { HouseholdRepository } from '../repositories/household.repository.js';

export class InMemoryHouseholdRepository implements HouseholdRepository {
  private readonly households = new Map<string, Household>();

  get(household_id: string): Promise<Household | null> {
    return Promise.resolve(this.households.get(household_id) ?? null);
  }

  getSingle(): Promise<Household | null> {
    const [first] = [...this.households.values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
    return Promise.resolve(first ?? null);
  }

  save(household: Household): Promise<void> {
    this.households.set(household.household_id, household);
    return Promise.resolve();
  }
}
