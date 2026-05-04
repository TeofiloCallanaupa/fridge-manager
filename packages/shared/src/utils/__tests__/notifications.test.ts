/**
 * TDD Red Phase — Tests for notification utility functions.
 *
 * These functions will be implemented in ../notifications.ts:
 *   - getActiveThresholds(item, today) → which notification types should fire today
 *   - isInQuietHours(prefs, now, timezone) → is it currently quiet hours for this user
 *   - buildNotificationMessage(itemName, type, daysExpired?) → push notification content
 */
import { describe, it, expect } from 'vitest';
import {
  getActiveThresholds,
  isInQuietHours,
  buildNotificationMessage,
} from '../notifications.js';
import type { NotificationType } from '../../types/notifications.js';

// ---------------------------------------------------------------------------
// Helper: create a minimal inventory item for threshold tests
// ---------------------------------------------------------------------------
function makeItem(overrides: {
  added_at?: string;
  expiration_date?: string | null;
  discarded_at?: string | null;
}) {
  return {
    id: 'item-1',
    name: 'Strawberries',
    added_at: overrides.added_at ?? '2026-05-01T00:00:00Z',
    expiration_date: overrides.expiration_date ?? null,
    discarded_at: overrides.discarded_at ?? null,
  };
}

// ---------------------------------------------------------------------------
// getActiveThresholds
// ---------------------------------------------------------------------------
describe('getActiveThresholds', () => {
  it('returns "halfway" when today is the halfway point', () => {
    // Added 10 days ago, expires in 10 days → halfway is today
    const today = new Date('2026-05-11T12:00:00Z');
    const item = makeItem({
      added_at: '2026-05-01T00:00:00Z',
      expiration_date: '2026-05-21T00:00:00Z',
    });
    const result = getActiveThresholds(item, today);
    expect(result).toContain('halfway');
  });

  it('returns "two_day" when expiration is 2 days away', () => {
    const today = new Date('2026-05-09T12:00:00Z');
    const item = makeItem({
      expiration_date: '2026-05-11T00:00:00Z',
    });
    const result = getActiveThresholds(item, today);
    expect(result).toContain('two_day');
  });

  it('returns "one_day" when expiration is 1 day away', () => {
    const today = new Date('2026-05-10T12:00:00Z');
    const item = makeItem({
      expiration_date: '2026-05-11T00:00:00Z',
    });
    const result = getActiveThresholds(item, today);
    expect(result).toContain('one_day');
  });

  it('returns "day_of" when expiration is today', () => {
    const today = new Date('2026-05-11T12:00:00Z');
    const item = makeItem({
      expiration_date: '2026-05-11T00:00:00Z',
    });
    const result = getActiveThresholds(item, today);
    expect(result).toContain('day_of');
  });

  it('returns "expired" when expiration date has passed', () => {
    const today = new Date('2026-05-14T12:00:00Z');
    const item = makeItem({
      expiration_date: '2026-05-11T00:00:00Z',
    });
    const result = getActiveThresholds(item, today);
    expect(result).toContain('expired');
  });

  it('returns empty array when no thresholds are hit', () => {
    // Expires in 8 days — no threshold matches
    const today = new Date('2026-05-03T12:00:00Z');
    const item = makeItem({
      added_at: '2026-05-01T00:00:00Z',
      expiration_date: '2026-05-11T00:00:00Z',
    });
    const result = getActiveThresholds(item, today);
    expect(result).toEqual([]);
  });

  it('returns empty array for items with null expiration_date', () => {
    const today = new Date('2026-05-11T12:00:00Z');
    const item = makeItem({ expiration_date: null });
    const result = getActiveThresholds(item, today);
    expect(result).toEqual([]);
  });

  it('returns empty array for discarded items', () => {
    const today = new Date('2026-05-11T12:00:00Z');
    const item = makeItem({
      expiration_date: '2026-05-11T00:00:00Z',
      discarded_at: '2026-05-10T00:00:00Z',
    });
    const result = getActiveThresholds(item, today);
    expect(result).toEqual([]);
  });

  it('can return multiple thresholds when halfway coincides with a day threshold', () => {
    // Added 2 days ago, expires in 2 days → halfway is today AND two_day fires
    const today = new Date('2026-05-03T12:00:00Z');
    const item = makeItem({
      added_at: '2026-05-01T00:00:00Z',
      expiration_date: '2026-05-05T00:00:00Z',
    });
    const result = getActiveThresholds(item, today);
    expect(result).toContain('halfway');
    expect(result).toContain('two_day');
    expect(result.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// isInQuietHours
// ---------------------------------------------------------------------------
describe('isInQuietHours', () => {
  it('returns false when outside quiet hours (afternoon)', () => {
    const prefs = {
      quiet_hours_start: '22:00',
      quiet_hours_end: '08:00',
    };
    // 2pm in America/New_York
    const now = new Date('2026-05-11T18:00:00Z'); // 2pm ET (UTC-4)
    expect(isInQuietHours(prefs, now, 'America/New_York')).toBe(false);
  });

  it('returns true when inside quiet hours (late night)', () => {
    const prefs = {
      quiet_hours_start: '22:00',
      quiet_hours_end: '08:00',
    };
    // 11pm in America/New_York
    const now = new Date('2026-05-12T03:00:00Z'); // 11pm ET (UTC-4)
    expect(isInQuietHours(prefs, now, 'America/New_York')).toBe(true);
  });

  it('returns true when inside quiet hours (early morning)', () => {
    const prefs = {
      quiet_hours_start: '22:00',
      quiet_hours_end: '08:00',
    };
    // 6am in America/New_York
    const now = new Date('2026-05-12T10:00:00Z'); // 6am ET (UTC-4)
    expect(isInQuietHours(prefs, now, 'America/New_York')).toBe(true);
  });

  it('handles overnight wrap correctly (start > end)', () => {
    const prefs = {
      quiet_hours_start: '23:00',
      quiet_hours_end: '07:00',
    };
    // 11:30pm in America/New_York
    const now = new Date('2026-05-12T03:30:00Z'); // 11:30pm ET
    expect(isInQuietHours(prefs, now, 'America/New_York')).toBe(true);
  });

  it('returns false when quiet hours are null', () => {
    const prefs = {
      quiet_hours_start: null,
      quiet_hours_end: null,
    };
    const now = new Date('2026-05-12T03:00:00Z');
    expect(isInQuietHours(prefs, now, 'America/New_York')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// buildNotificationMessage
// ---------------------------------------------------------------------------
describe('buildNotificationMessage', () => {
  it('builds halfway message', () => {
    const msg = buildNotificationMessage('Strawberries', 'halfway');
    expect(msg.title).toBeTruthy();
    expect(msg.body).toContain('Strawberries');
    expect(msg.body).toMatch(/halfway/i);
  });

  it('builds two_day message', () => {
    const msg = buildNotificationMessage('Chicken Breast', 'two_day');
    expect(msg.title).toBeTruthy();
    expect(msg.body).toContain('Chicken Breast');
    expect(msg.body).toMatch(/2 days/i);
  });

  it('builds one_day message', () => {
    const msg = buildNotificationMessage('Milk', 'one_day');
    expect(msg.title).toBeTruthy();
    expect(msg.body).toContain('Milk');
    expect(msg.body).toMatch(/tomorrow/i);
  });

  it('builds day_of message', () => {
    const msg = buildNotificationMessage('Yogurt', 'day_of');
    expect(msg.title).toBeTruthy();
    expect(msg.body).toContain('Yogurt');
    expect(msg.body).toMatch(/today/i);
  });

  it('builds expired message with days count', () => {
    const msg = buildNotificationMessage('Pasta', 'expired', 3);
    expect(msg.title).toBeTruthy();
    expect(msg.body).toContain('Pasta');
    expect(msg.body).toMatch(/3 days/i);
  });

  it('builds expired message without days count', () => {
    const msg = buildNotificationMessage('Pasta', 'expired');
    expect(msg.title).toBeTruthy();
    expect(msg.body).toContain('Pasta');
    expect(msg.body).toMatch(/expired/i);
  });
});
