/**
 * Admin Auth Service
 *
 * Implements the Functional Foundation Plan's admin PIN boundary:
 * a single shared household PIN gating corrective/configuration actions only
 * (task/reward catalog edits, participant management, adjustments) — never a
 * prerequisite for ordinary household use, and never a general account
 * system (no per-user identity, no JWT/OAuth).
 *
 * PIN hashing uses Node's built-in `node:crypto` scrypt (no new dependency:
 * bcrypt/argon2 would require adding a native module where one is not
 * otherwise needed). Sessions are opaque server-validated random tokens held
 * in memory, so no cookie-signing dependency is required either — tampering
 * simply fails the session lookup.
 */

import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import type { HouseholdService } from './household.service.js';

const SCRYPT_KEY_LENGTH = 64;
export const ADMIN_SESSION_TTL_MS = 30 * 60 * 1000;

export class AdminPinAlreadyConfiguredError extends Error {
  constructor() {
    super('Admin PIN has already been configured');
  }
}

export class AdminPinNotConfiguredError extends Error {
  constructor() {
    super('Admin PIN has not been configured yet');
  }
}

export class InvalidAdminPinError extends Error {
  constructor() {
    super('Invalid admin PIN');
  }
}

export function isValidAdminPin(pin: unknown): pin is string {
  return typeof pin === 'string' && /^\d{4,12}$/.test(pin);
}

export class AdminAuthService {
  private readonly sessions = new Map<string, number>();

  constructor(private readonly householdService: HouseholdService) {}

  async isPinConfigured(): Promise<boolean> {
    const household = await this.householdService.getHousehold();
    return household.admin_pin_hash !== null;
  }

  /** Only permitted while no PIN has been configured yet (first-run setup). */
  async setupPin(pin: string): Promise<string> {
    const household = await this.householdService.getHousehold();
    if (household.admin_pin_hash !== null) throw new AdminPinAlreadyConfiguredError();

    await this.householdService.setAdminPinHash(household.household_id, hashPin(pin));
    return this.createSession();
  }

  async verifyPin(pin: string): Promise<string> {
    const household = await this.householdService.getHousehold();
    if (household.admin_pin_hash === null) throw new AdminPinNotConfiguredError();
    if (!verifyPinHash(pin, household.admin_pin_hash)) throw new InvalidAdminPinError();

    return this.createSession();
  }

  createSession(): string {
    this.pruneExpiredSessions();
    const token = randomUUID();
    this.sessions.set(token, Date.now() + ADMIN_SESSION_TTL_MS);
    return token;
  }

  validateSession(token: string | undefined): boolean {
    if (!token) return false;
    const expiresAt = this.sessions.get(token);
    if (expiresAt === undefined) return false;
    if (expiresAt < Date.now()) {
      this.sessions.delete(token);
      return false;
    }
    return true;
  }

  private pruneExpiredSessions(): void {
    const now = Date.now();
    for (const [token, expiresAt] of this.sessions) {
      if (expiresAt < now) this.sessions.delete(token);
    }
  }
}

function hashPin(pin: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(pin, salt, SCRYPT_KEY_LENGTH);
  return `${salt.toString('hex')}:${derived.toString('hex')}`;
}

function verifyPinHash(pin: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;

  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(pin, salt, expected.length);

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
