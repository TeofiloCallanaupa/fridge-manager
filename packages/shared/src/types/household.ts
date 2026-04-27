/**
 * Household and membership types matching the Supabase schema.
 * See docs/architecture.md for the full schema definition.
 */

export type HouseholdRole = 'owner' | 'member';

export type InviteStatus = 'pending' | 'accepted' | 'expired';

export interface Household {
  id: string;
  name: string;
  timezone: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id: string;
  role: HouseholdRole;
  joined_at: string;
  updated_at: string;
}

export interface HouseholdInvite {
  id: string;
  household_id: string;
  invited_by: string;
  invited_email: string;
  status: InviteStatus;
  created_at: string;
  expires_at: string;
}
