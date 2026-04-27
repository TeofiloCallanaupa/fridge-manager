/**
 * Tests for expiration utilities.
 * TDD: These tests are written BEFORE the implementation.
 * All should FAIL initially (red phase).
 */
import { describe, it, expect } from 'vitest';
import { calculateExpiration, getDaysSince, getExpirationColor } from '../expiration.js';

describe('calculateExpiration', () => {
  const addedAt = new Date('2026-05-01');

  it('returns correct date for produce in fridge (5 day default)', () => {
    const result = calculateExpiration('strawberries', true, 'fridge', addedAt, 5);
    expect(result).toEqual(new Date('2026-05-06'));
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
