/**
 * Notification utility functions.
 *
 * - getActiveThresholds() — determines which notification types should fire for an item today
 * - isInQuietHours() — checks if current time falls within a user's quiet hours
 * - buildNotificationMessage() — generates push notification title + body text
 *
 * IMPORTANT: These functions are duplicated in the Edge Function at
 * supabase/functions/check-expiration-notifications/index.ts because Deno
 * cannot import from the shared npm package. If you change logic here,
 * update the Edge Function copy as well (and vice versa).
 */

import type { NotificationType } from '../types/notifications.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Types for the minimal item shape we need (avoids importing full DB types)
// ---------------------------------------------------------------------------

export interface NotifiableItem {
  id: string;
  name: string;
  added_at: string;
  expiration_date: string | null;
  discarded_at: string | null;
}

export interface QuietHoursPrefs {
  quiet_hours_start: string | null; // 'HH:MM' format
  quiet_hours_end: string | null;   // 'HH:MM' format
}

export interface NotificationMessage {
  title: string;
  body: string;
}

// ---------------------------------------------------------------------------
// getActiveThresholds
// ---------------------------------------------------------------------------

/**
 * Returns which notification thresholds are hit today for a given item.
 *
 * Excluded items:
 *   - null expiration_date (non-perishable)
 *   - discarded items (discarded_at is set)
 *
 * Thresholds:
 *   - halfway: today is the midpoint between added_at and expiration_date
 *   - two_day: expiration_date is exactly 2 calendar days away
 *   - one_day: expiration_date is exactly 1 calendar day away
 *   - day_of: expiration_date is today
 *   - expired: expiration_date is in the past
 */
export function getActiveThresholds(
  item: NotifiableItem,
  today: Date,
): NotificationType[] {
  // Exclude non-perishable and discarded items
  if (item.expiration_date === null) return [];
  if (item.discarded_at !== null) return [];

  const thresholds: NotificationType[] = [];

  const expirationDate = new Date(item.expiration_date);
  const addedDate = new Date(item.added_at);

  // Normalize all dates to midnight UTC for calendar-day comparison
  const todayMidnight = toMidnightUTC(today);
  const expirationMidnight = toMidnightUTC(expirationDate);
  const addedMidnight = toMidnightUTC(addedDate);

  const daysUntilExpiration = Math.round(
    (expirationMidnight.getTime() - todayMidnight.getTime()) / MS_PER_DAY,
  );

  // Expired: expiration date is in the past
  if (daysUntilExpiration < 0) {
    thresholds.push('expired');
    return thresholds; // No other thresholds apply after expiration
  }

  // Day-of: expires today
  if (daysUntilExpiration === 0) {
    thresholds.push('day_of');
  }

  // 1-day warning
  if (daysUntilExpiration === 1) {
    thresholds.push('one_day');
  }

  // 2-day warning
  if (daysUntilExpiration === 2) {
    thresholds.push('two_day');
  }

  // Halfway: today is the midpoint between added_at and expiration_date
  const totalDays = Math.round(
    (expirationMidnight.getTime() - addedMidnight.getTime()) / MS_PER_DAY,
  );
  if (totalDays > 0) {
    const halfwayDay = Math.round(totalDays / 2);
    const daysSinceAdded = Math.round(
      (todayMidnight.getTime() - addedMidnight.getTime()) / MS_PER_DAY,
    );
    if (daysSinceAdded === halfwayDay) {
      thresholds.push('halfway');
    }
  }

  return thresholds;
}

// ---------------------------------------------------------------------------
// isInQuietHours
// ---------------------------------------------------------------------------

/**
 * Checks if the current time falls within the user's quiet hours
 * in the given timezone.
 *
 * Handles overnight wrap (e.g., 22:00 → 08:00).
 * Returns false if quiet hours are null (not configured).
 */
export function isInQuietHours(
  prefs: QuietHoursPrefs,
  now: Date,
  timezone: string,
): boolean {
  if (prefs.quiet_hours_start === null || prefs.quiet_hours_end === null) {
    return false;
  }

  // Get current time in the household's timezone
  const localTime = now.toLocaleTimeString('en-US', {
    timeZone: timezone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });

  const currentMinutes = timeToMinutes(localTime);
  const startMinutes = timeToMinutes(prefs.quiet_hours_start);
  const endMinutes = timeToMinutes(prefs.quiet_hours_end);

  // Overnight wrap: start > end (e.g., 22:00 → 08:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  // Same-day range (e.g., 13:00 → 15:00)
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

// ---------------------------------------------------------------------------
// buildNotificationMessage
// ---------------------------------------------------------------------------

/**
 * Builds a push notification title and body for a given notification type.
 */
export function buildNotificationMessage(
  itemName: string,
  type: NotificationType,
  daysExpired?: number,
): NotificationMessage {
  switch (type) {
    case 'halfway':
      return {
        title: '⏳ Halfway there',
        body: `${itemName} is halfway to expiring — plan to use it soon`,
      };
    case 'two_day':
      return {
        title: '⚠️ Expiring soon',
        body: `${itemName} expires in 2 days`,
      };
    case 'one_day':
      return {
        title: '🔔 Expires tomorrow',
        body: `${itemName} expires tomorrow — use it today`,
      };
    case 'day_of':
      return {
        title: '🚨 Expires today!',
        body: `${itemName} expires today — use it or lose it`,
      };
    case 'expired': {
      const daysText = daysExpired
        ? `${daysExpired} days ago`
        : 'recently';
      return {
        title: '🗑️ Expired',
        body: `${itemName} expired ${daysText} — toss it?`,
      };
    }
    default:
      return {
        title: 'Fridge Manager',
        body: `Update about ${itemName}`,
      };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normalize a Date to midnight UTC (strips time component). */
function toMidnightUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Convert 'HH:MM' string to total minutes since midnight. */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}
