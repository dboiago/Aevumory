/**
 * Household Service
 *
 * Bootstraps the single Household row required by the application (structural
 * bootstrap, never seed/demo data) and mediates admin PIN state changes.
 * Bootstrap is safe to call more than once.
 */

import { randomUUID } from 'node:crypto';
import type { Household } from '../types/household.types.js';
import type { HouseholdRepository } from '../repositories/household.repository.js';

const DEFAULT_HOUSEHOLD_NAME = 'Household';

export class HouseholdService {
  constructor(private readonly householdRepository: HouseholdRepository) {}

  /** Creates the single Household row if none exists yet; otherwise returns the existing one. */
  async ensureBootstrapped(): Promise<Household> {
    const existing = await this.householdRepository.getSingle();
    if (existing) return existing;

    const now = new Date().toISOString();
    const household: Household = {
      household_id: randomUUID(),
      name: DEFAULT_HOUSEHOLD_NAME,
      admin_pin_hash: null,
      created_at: now,
      updated_at: now,
    };

    await this.householdRepository.save(household);
    return household;
  }

  /** Retrieves the household, bootstrapping it first if it does not exist yet. */
  async getHousehold(): Promise<Household> {
    return this.ensureBootstrapped();
  }

  async setAdminPinHash(household_id: string, admin_pin_hash: string): Promise<Household> {
    const household = await this.householdRepository.get(household_id);
    if (!household) throw new Error('Household not found');

    const updated: Household = {
      ...household,
      admin_pin_hash,
      updated_at: new Date().toISOString(),
    };

    await this.householdRepository.save(updated);
    return updated;
  }
}
