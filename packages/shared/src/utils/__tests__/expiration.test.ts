/**
 * Tests for expiration utilities.
 * TDD: These tests are written BEFORE the implementation.
 * All should FAIL initially (red phase).
 */
import { describe, it, expect } from 'vitest';
import { calculateExpiration, getDaysSince, getExpirationColor } from '../expiration.js';

describe('calculateExpiration', () => {
  const addedAt = new Date('2026-05-01');

  it('returns FoodKeeper date for produce in fridge when matched', () => {
    // "strawberries" matches FoodKeeper (min=3 days), which takes priority over default (5 days)
    const result = calculateExpiration('strawberries', true, 'fridge', addedAt, 5);
    expect(result).toEqual(new Date('2026-05-04')); // 3 days from FoodKeeper, not 5
  });

  it('returns null for household items (has_expiration = false)', () => {
    const result = calculateExpiration('paper towels', false, 'pantry', addedAt, null);
    expect(result).toBeNull();
  });

  it('falls back to default shelf days when provided', () => {
    const result = calculateExpiration('unknown-item', true, 'fridge', addedAt, 7);
    expect(result).toEqual(new Date('2026-05-08'));
  });

  it('returns null when has_expiration is true but no default shelf days', () => {
    const result = calculateExpiration('mystery item', true, 'pantry', addedAt, null);
    expect(result).toBeNull();
  });
});

describe('getDaysSince', () => {
  it('returns 0 for today', () => {
    const today = new Date();
    expect(getDaysSince(today)).toBe(0);
  });

  it('returns correct count for past dates', () => {
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    expect(getDaysSince(fiveDaysAgo)).toBe(5);
  });

  it('returns correct count for 1 day ago', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(getDaysSince(yesterday)).toBe(1);
  });
});

describe('getExpirationColor', () => {
  const today = new Date();

  function daysFromNow(days: number): Date {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d;
  }

  it('returns green for >3 days remaining', () => {
    expect(getExpirationColor(daysFromNow(5))).toBe('green');
  });

  it('returns yellow for 1-3 days remaining', () => {
    expect(getExpirationColor(daysFromNow(2))).toBe('yellow');
  });

  it('returns yellow for exactly 3 days remaining', () => {
    expect(getExpirationColor(daysFromNow(3))).toBe('yellow');
  });

  it('returns red for expired items', () => {
    expect(getExpirationColor(daysFromNow(-1))).toBe('red');
  });

  it('returns red for items expiring today', () => {
    expect(getExpirationColor(today)).toBe('red');
  });

  it('returns null for items without expiration date', () => {
    expect(getExpirationColor(null)).toBeNull();
  });
});

describe('calculateExpiration with FoodKeeper integration', () => {
  const addedAt = new Date('2026-05-01');

  it('uses FoodKeeper data when item name matches (Tier 1 priority)', () => {
    // "chicken breast" has FoodKeeper data: fridge min=1 day
    // Even though defaultShelfDays=3 (meat default), FoodKeeper should win
    const result = calculateExpiration('chicken breast', true, 'fridge', addedAt, 3);
    // FoodKeeper says 1 day for chicken breast in fridge
    expect(result).toEqual(new Date('2026-05-02'));
  });

  it('falls back to defaultShelfDays when no FoodKeeper match (Tier 2)', () => {
    // "mystery casserole" won't match any FoodKeeper entry
    const result = calculateExpiration('mystery casserole', true, 'fridge', addedAt, 4);
    // Should use the defaultShelfDays (4 days)
    expect(result).toEqual(new Date('2026-05-05'));
  });

  it('still returns null for non-expiring categories regardless of FoodKeeper', () => {
    // Even if "paper towels" somehow matched FoodKeeper, has_expiration=false wins
    const result = calculateExpiration('paper towels', false, 'pantry', addedAt, null);
    expect(result).toBeNull();
  });
});
