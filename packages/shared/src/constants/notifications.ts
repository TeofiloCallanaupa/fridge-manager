/**
 * Notification system constants.
 */

import type { NotificationType } from '../types/notifications.js';

/**
 * Notification threshold labels.
 * Maps each notification type to a human-readable description.
 */
export const NOTIFICATION_THRESHOLDS: Record<NotificationType, string> = {
  halfway: 'Halfway to expiration',
  two_day: '2 days until expiration',
  one_day: '1 day until expiration',
  day_of: 'Expires today',
  expired: 'Expired',
};

/** Default quiet hours (10pm - 8am). */
export const QUIET_HOURS_DEFAULT = {
  start: '22:00',
  end: '08:00',
} as const;

/**
 * Default notification preferences when no row exists yet.
 * Used as a fallback in both web and mobile settings pages.
 */
export const DEFAULT_NOTIFICATION_PREFS = {
  halfway_enabled: true,
  two_day_enabled: true,
  one_day_enabled: true,
  day_of_enabled: true,
  post_expiration_enabled: true,
  quiet_hours_start: null as string | null,
  quiet_hours_end: null as string | null,
} as const;
