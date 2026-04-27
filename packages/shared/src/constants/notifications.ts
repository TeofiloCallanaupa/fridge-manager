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
