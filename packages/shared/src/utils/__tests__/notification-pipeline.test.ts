/**
 * Integration-style tests for the notification pipeline.
 *
 * These tests verify the end-to-end notification logic that the Edge Function
 * uses, including:
 *   - Deduplication rules (skip already-sent thresholds)
 *   - Threshold-to-preference field mapping
 *   - Multi-item batch processing scenarios
 *   - Edge cases around date boundaries
 */
import { describe, it, expect } from 'vitest';
import {
  getActiveThresholds,
  isInQuietHours,
  buildNotificationMessage,
} from '../notifications.js';
import type { NotifiableItem } from '../notifications.js';
import type { NotificationType } from '../../types/notifications.js';

// ---------------------------------------------------------------------------
// Helper factories
// ---------------------------------------------------------------------------

function makeItem(overrides: Partial<NotifiableItem> = {}): NotifiableItem {
  return {
    id: overrides.id ?? 'item-1',
    name: overrides.name ?? 'Test Item',
    added_at: overrides.added_at ?? '2026-05-01T00:00:00Z',
    expiration_date: 'expiration_date' in overrides ? overrides.expiration_date! : '2026-05-11T00:00:00Z',
    discarded_at: 'discarded_at' in overrides ? overrides.discarded_at! : null,
  };
}

/**
 * Maps notification types to the preference field names used in
 * notification_preferences table (mirrors Edge Function logic).
 */
function getPreferenceField(type: NotificationType): string {
  return type === 'expired' ? 'post_expiration_enabled' : `${type}_enabled`;
}

// ---------------------------------------------------------------------------
// Deduplication logic (mirrors Edge Function behavior)
// ---------------------------------------------------------------------------
describe('Notification deduplication', () => {
  it('filters out already-sent thresholds (non-expired)', () => {
    const today = new Date('2026-05-09T12:00:00Z');
    const item = makeItem({ expiration_date: '2026-05-11T00:00:00Z' });
    const thresholds = getActiveThresholds(item, today);
    expect(thresholds).toContain('two_day');

    // Simulate deduplication: 'two_day' was already sent
    const alreadySent = new Set<NotificationType>(['two_day']);
    const unsent = thresholds.filter(
      (t) => t === 'expired' || !alreadySent.has(t),
    );
    expect(unsent).toEqual([]);
  });

  it('allows expired notifications to resend (daily nag)', () => {
    const today = new Date('2026-05-14T12:00:00Z');
    const item = makeItem({ expiration_date: '2026-05-11T00:00:00Z' });
    const thresholds = getActiveThresholds(item, today);
    expect(thresholds).toContain('expired');

    // Even if 'expired' was sent before, it should NOT be filtered
    const alreadySent = new Set<NotificationType>(['expired']);
    const unsent = thresholds.filter(
      (t) => t === 'expired' || !alreadySent.has(t),
    );
    expect(unsent).toContain('expired');
  });

  it('filters all non-expired types when all were already sent', () => {
    // Item added 2 days ago, expires in 2 days → halfway + two_day
    const today = new Date('2026-05-03T12:00:00Z');
    const item = makeItem({
      added_at: '2026-05-01T00:00:00Z',
      expiration_date: '2026-05-05T00:00:00Z',
    });
    const thresholds = getActiveThresholds(item, today);
    expect(thresholds.length).toBe(2);

    // Both were already sent
    const alreadySent = new Set<NotificationType>(['halfway', 'two_day']);
    const unsent = thresholds.filter(
      (t) => t === 'expired' || !alreadySent.has(t),
    );
    expect(unsent).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Threshold → preference field mapping
// ---------------------------------------------------------------------------
describe('Threshold preference field mapping', () => {
  it.each([
    ['halfway', 'halfway_enabled'],
    ['two_day', 'two_day_enabled'],
    ['one_day', 'one_day_enabled'],
    ['day_of', 'day_of_enabled'],
    ['expired', 'post_expiration_enabled'],
  ] as [NotificationType, string][])(
    'maps %s → %s',
    (type, expectedField) => {
      expect(getPreferenceField(type)).toBe(expectedField);
    },
  );
});

// ---------------------------------------------------------------------------
// Multi-item batch processing
// ---------------------------------------------------------------------------
describe('Batch processing scenarios', () => {
  it('processes multiple items with different thresholds', () => {
    const today = new Date('2026-05-09T12:00:00Z');

    const items: NotifiableItem[] = [
      makeItem({
        id: '1',
        name: 'Milk',
        expiration_date: '2026-05-09T00:00:00Z', // day_of
      }),
      makeItem({
        id: '2',
        name: 'Chicken',
        expiration_date: '2026-05-10T00:00:00Z', // one_day
      }),
      makeItem({
        id: '3',
        name: 'Berries',
        expiration_date: '2026-05-11T00:00:00Z', // two_day
      }),
      makeItem({
        id: '4',
        name: 'Paper Towels',
        expiration_date: null, // non-perishable, skip
      }),
      makeItem({
        id: '5',
        name: 'Old Yogurt',
        expiration_date: '2026-05-07T00:00:00Z', // expired
      }),
    ];

    const results = items.map((item) => ({
      name: item.name,
      thresholds: getActiveThresholds(item, today),
    }));

    expect(results[0].thresholds).toEqual(['day_of']);
    expect(results[1].thresholds).toEqual(['one_day']);
    expect(results[2].thresholds).toEqual(['two_day']);
    expect(results[3].thresholds).toEqual([]); // non-perishable
    expect(results[4].thresholds).toEqual(['expired']);
  });

  it('skips discarded items in a batch', () => {
    const today = new Date('2026-05-09T12:00:00Z');

    const items: NotifiableItem[] = [
      makeItem({
        id: '1',
        name: 'Active Item',
        expiration_date: '2026-05-09T00:00:00Z',
      }),
      makeItem({
        id: '2',
        name: 'Tossed Item',
        expiration_date: '2026-05-09T00:00:00Z',
        discarded_at: '2026-05-08T00:00:00Z',
      }),
    ];

    const active = items.filter(
      (item) => getActiveThresholds(item, today).length > 0,
    );
    expect(active.length).toBe(1);
    expect(active[0].name).toBe('Active Item');
  });
});

// ---------------------------------------------------------------------------
// Date boundary edge cases
// ---------------------------------------------------------------------------
describe('Date boundary edge cases', () => {
  it('handles items added and expiring on the same day', () => {
    const today = new Date('2026-05-11T12:00:00Z');
    const item = makeItem({
      added_at: '2026-05-11T00:00:00Z',
      expiration_date: '2026-05-11T00:00:00Z',
    });
    const thresholds = getActiveThresholds(item, today);
    // day_of should fire; halfway is 0/0 days — totalDays = 0, so no halfway
    expect(thresholds).toContain('day_of');
    expect(thresholds).not.toContain('halfway');
  });

  it('handles items with very long shelf life (halfway works)', () => {
    const today = new Date('2026-07-01T12:00:00Z');
    const item = makeItem({
      added_at: '2026-05-01T00:00:00Z',
      expiration_date: '2026-09-01T00:00:00Z', // ~123 days
    });
    // Halfway would be ~61.5 days after added, roughly July 1
    const thresholds = getActiveThresholds(item, today);
    // Days since added: May 1 → Jul 1 = 61 days
    // Total days: May 1 → Sep 1 = 123 days
    // Halfway day: round(123/2) = 62
    // Since daysSinceAdded (61) ≠ halfwayDay (62), no halfway
    expect(thresholds).not.toContain('halfway');

    // But July 2 (62 days after) should fire halfway
    const july2 = new Date('2026-07-02T12:00:00Z');
    const thresholds2 = getActiveThresholds(item, july2);
    expect(thresholds2).toContain('halfway');
  });

  it('handles timezone-agnostic date comparison (UTC midnight normalization)', () => {
    // Item expires on May 11 — checking from various UTC times on May 9
    // All should see "2 days away" regardless of time-of-day
    const morningUTC = new Date('2026-05-09T06:00:00Z');
    const eveningUTC = new Date('2026-05-09T23:59:59Z');
    const item = makeItem({ expiration_date: '2026-05-11T00:00:00Z' });

    expect(getActiveThresholds(item, morningUTC)).toContain('two_day');
    expect(getActiveThresholds(item, eveningUTC)).toContain('two_day');
  });
});

// ---------------------------------------------------------------------------
// Quiet hours integration with notification delivery
// ---------------------------------------------------------------------------
describe('Quiet hours delivery filtering', () => {
  it('blocks notification during quiet hours', () => {
    const prefs = {
      quiet_hours_start: '22:00',
      quiet_hours_end: '08:00',
    };
    // 11pm ET
    const now = new Date('2026-05-12T03:00:00Z');
    const blocked = isInQuietHours(prefs, now, 'America/New_York');
    expect(blocked).toBe(true);
  });

  it('allows notification outside quiet hours', () => {
    const prefs = {
      quiet_hours_start: '22:00',
      quiet_hours_end: '08:00',
    };
    // 1pm ET (cron default time)
    const now = new Date('2026-05-12T17:00:00Z');
    const blocked = isInQuietHours(prefs, now, 'America/New_York');
    expect(blocked).toBe(false);
  });

  it('allows notification when no quiet hours configured', () => {
    const prefs = {
      quiet_hours_start: null,
      quiet_hours_end: null,
    };
    const now = new Date('2026-05-12T03:00:00Z');
    const blocked = isInQuietHours(prefs, now, 'America/New_York');
    expect(blocked).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Message building for all types
// ---------------------------------------------------------------------------
describe('Notification message building (all types)', () => {
  const types: NotificationType[] = ['halfway', 'two_day', 'one_day', 'day_of', 'expired'];

  it.each(types)('builds non-empty message for %s', (type) => {
    const msg = buildNotificationMessage('Test Item', type, type === 'expired' ? 5 : undefined);
    expect(msg.title.length).toBeGreaterThan(0);
    expect(msg.body.length).toBeGreaterThan(0);
    expect(msg.body).toContain('Test Item');
  });

  it('expired message includes correct day count', () => {
    const msg = buildNotificationMessage('Steak', 'expired', 7);
    expect(msg.body).toContain('7 days ago');
  });

  it('expired message uses "recently" when no day count', () => {
    const msg = buildNotificationMessage('Steak', 'expired');
    expect(msg.body).toContain('recently');
  });
});
