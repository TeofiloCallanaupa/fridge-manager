/**
 * User profile types — derived from Supabase generated types.
 * Source of truth: database.ts (auto-generated from Supabase schema).
 *
 * NotificationPreferences and PushSubscription are defined here manually
 * because their tables haven't been created yet (Phase 4 migration).
 */

import type { Tables } from './database.js';

// ---------------------------------------------------------------------------
// Row types — derived from database.ts
// ---------------------------------------------------------------------------

/** User profile (auto-created on signup via trigger). */
export type Profile = Tables<'profiles'>;

// ---------------------------------------------------------------------------
// Application-level types (not in database.ts yet)
// ---------------------------------------------------------------------------


/** Notification preferences — per user per household (Phase 4 table). */
export interface NotificationPreferences {
  id: string;
  user_id: string;
  household_id: string;
  halfway_enabled: boolean;
  two_day_enabled: boolean;
  one_day_enabled: boolean;
  day_of_enabled: boolean;
  post_expiration_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  created_at: string;
  updated_at: string;
}

export type PushPlatform = 'android' | 'web';

/** Push notification subscription — per device per household (Phase 4 table). */
export interface PushSubscription {
  id: string;
  user_id: string;
  household_id: string;
  platform: PushPlatform;
  token: string;
  keys: Record<string, string> | null;
  created_at: string;
}
