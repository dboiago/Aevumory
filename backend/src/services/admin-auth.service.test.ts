import { describe, expect, it } from 'vitest';
import { InMemoryHouseholdRepository } from '../persistence/household.repository.memory.js';
import { HouseholdService } from './household.service.js';
import {
  AdminAuthService,
  AdminPinAlreadyConfiguredError,
  AdminPinNotConfiguredError,
  InvalidAdminPinError,
  isValidAdminPin,
} from './admin-auth.service.js';

function buildService() {
  const householdRepository = new InMemoryHouseholdRepository();
  const householdService = new HouseholdService(householdRepository);
  const adminAuthService = new AdminAuthService(householdService);
  return { householdRepository, householdService, adminAuthService };
}

describe('isValidAdminPin', () => {
  it('accepts 4-12 digit numeric PINs', () => {
    expect(isValidAdminPin('1234')).toBe(true);
    expect(isValidAdminPin('123456789012')).toBe(true);
  });

  it('rejects short, non-numeric, or oversized PINs', () => {
    expect(isValidAdminPin('123')).toBe(false);
    expect(isValidAdminPin('12a4')).toBe(false);
    expect(isValidAdminPin('1234567890123')).toBe(false);
    expect(isValidAdminPin(undefined)).toBe(false);
  });
});

describe('AdminAuthService', () => {
  it('reports the PIN as unconfigured before setup', async () => {
    const { adminAuthService } = buildService();
    expect(await adminAuthService.isPinConfigured()).toBe(false);
  });

  it('does not store the PIN in plaintext', async () => {
    const { householdRepository, adminAuthService } = buildService();
    await adminAuthService.setupPin('1234');

    const household = await householdRepository.getSingle();
    expect(household?.admin_pin_hash).not.toBeNull();
    expect(household?.admin_pin_hash).not.toBe('1234');
    expect(household?.admin_pin_hash).toContain(':');
  });

  it('setupPin issues a session token that validates', async () => {
    const { adminAuthService } = buildService();
    const token = await adminAuthService.setupPin('1234');
    expect(adminAuthService.validateSession(token)).toBe(true);
  });

  it('rejects a second setupPin call once a PIN is configured', async () => {
    const { adminAuthService } = buildService();
    await adminAuthService.setupPin('1234');

    await expect(adminAuthService.setupPin('5678')).rejects.toBeInstanceOf(
      AdminPinAlreadyConfiguredError,
    );
  });

  it('verifyPin rejects before a PIN has been configured', async () => {
    const { adminAuthService } = buildService();
    await expect(adminAuthService.verifyPin('1234')).rejects.toBeInstanceOf(
      AdminPinNotConfiguredError,
    );
  });

  it('verifyPin succeeds with the correct PIN and fails with an incorrect one', async () => {
    const { adminAuthService } = buildService();
    await adminAuthService.setupPin('1234');

    const token = await adminAuthService.verifyPin('1234');
    expect(adminAuthService.validateSession(token)).toBe(true);

    await expect(adminAuthService.verifyPin('0000')).rejects.toBeInstanceOf(InvalidAdminPinError);
  });

  it('validateSession rejects unknown or missing tokens', async () => {
    const { adminAuthService } = buildService();
    expect(adminAuthService.validateSession('unknown-token')).toBe(false);
    expect(adminAuthService.validateSession(undefined)).toBe(false);
  });
});
