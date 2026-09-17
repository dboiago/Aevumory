import type { Household } from '../types/household.types.js';

export interface HouseholdRepository {
  get(household_id: string): Promise<Household | null>;

  /** Aevumory supports exactly one Household row per installation. */
  getSingle(): Promise<Household | null>;

  save(household: Household): Promise<void>;
}
