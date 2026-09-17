/**
 * ============================================================================
 * HOUSEHOLD DOMAIN
 * ============================================================================
 *
 * Aevumory supports exactly one Household per installation (see
 * `PARTICIPANT_PROFILE_SPEC.md` §2). A Participant is a persistent household
 * identity; the minimal model intentionally excludes relationships,
 * permissions, and any field without a concrete consumer.
 * ============================================================================
 */

export interface Household {
  household_id: string;
  name: string;

  /** Null until the first-run admin PIN setup flow completes. */
  admin_pin_hash: string | null;

  created_at: string;
  updated_at: string;
}

export interface Participant {
  participant_id: string;
  household_id: string;
  display_name: string;

  /** Optional visual representation reference (e.g. an image path or initial-based fallback key). */
  representation_ref?: string;

  created_at: string;
  updated_at: string;
}
