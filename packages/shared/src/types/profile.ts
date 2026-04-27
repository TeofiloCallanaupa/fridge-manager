/**
 * User profile and notification preference types matching the Supabase schema.
 * See docs/architecture.md for the full schema definition.
 */

/** DiceBear Avataaars config stored as JSONB — rendered on demand, no image storage. */
export interface AvatarConfig {
  style: 'avataaars';
  hair: string;
  hairColor: string;
  eyes: string;
  eyeColor: string;
  skin: string;
  facialHair: string;
  accessories: string;
  clothing: string;
}

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_config: AvatarConfig | null;
  created_at: string;
  updated_at: string;
}

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

export interface PushSubscription {
  id: string;
  user_id: string;
  household_id: string;
  platform: PushPlatform;
  token: string;
  keys: Record<string, string> | null;
  created_at: string;
}
