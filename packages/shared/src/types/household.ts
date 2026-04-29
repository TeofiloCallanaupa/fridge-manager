/**
 * Household and membership types — derived from Supabase generated types.
 * Source of truth: database.ts (auto-generated from Supabase schema).
 */

import type { Tables } from './database.js';

// ---------------------------------------------------------------------------
// Enum-like union types (narrower than the generated `string`)
// ---------------------------------------------------------------------------

export type HouseholdRole = 'owner' | 'member';
export type InviteStatus = 'pending' | 'accepted' | 'expired';

// ---------------------------------------------------------------------------
// Row types — derived from database.ts, narrowed where needed
// ---------------------------------------------------------------------------

/** A household (apartment, house, etc.). */
export type Household = Tables<'households'>;

/** A user ↔ household membership. */
export type HouseholdMember = Omit<Tables<'household_members'>, 'role'> & {
  role: HouseholdRole;
};

/** An invite to join a household. */
export type HouseholdInvite = Omit<Tables<'household_invites'>, 'status'> & {
  status: InviteStatus;
};
