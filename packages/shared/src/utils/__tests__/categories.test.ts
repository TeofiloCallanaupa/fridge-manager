/**
 * Tests for category utilities and constants.
 * TDD: These tests are written BEFORE the implementation.
 * All should FAIL initially (red phase).
 */
import { describe, it, expect } from 'vitest';
import { CATEGORY_SEED_DATA } from '../../constants/categories.js';
import { getCategoryEmoji } from '../categories.js';

describe('CATEGORY_SEED_DATA', () => {
  it('has 10 categories', () => {
    expect(CATEGORY_SEED_DATA).toHaveLength(10);
  });

  it('each category has required fields', () => {
    for (const category of CATEGORY_SEED_DATA) {
      expect(category).toHaveProperty('name');
      expect(category).toHaveProperty('emoji');
      expect(category).toHaveProperty('display_order');
      expect(category).toHaveProperty('default_destination');
      expect(category).toHaveProperty('has_expiration');
    }
  });

  it('household category has no expiration', () => {
    const household = CATEGORY_SEED_DATA.find((c) => c.name === 'household');
    expect(household).toBeDefined();
    expect(household!.has_expiration).toBe(false);
    expect(household!.default_destination).toBe('none');
  });

  it('categories are in correct display order', () => {
    const orders = CATEGORY_SEED_DATA.map((c) => c.display_order);
    const sorted = [...orders].sort((a, b) => a - b);
    expect(orders).toEqual(sorted);
  });
});

describe('getCategoryEmoji', () => {
  it('returns correct emoji for produce', () => {
    expect(getCategoryEmoji('produce')).toBe('🥬');
  });

  it('returns correct emoji for dairy', () => {
    expect(getCategoryEmoji('dairy')).toBe('🥛');
  });

  it('returns null for unknown category', () => {
    expect(getCategoryEmoji('nonexistent')).toBeNull();
  });
});
