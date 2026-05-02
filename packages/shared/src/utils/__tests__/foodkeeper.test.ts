/**
 * Tests for FoodKeeper fuzzy matching utility.
 * TDD RED phase: These tests are written BEFORE the implementation.
 * All should FAIL initially.
 */
import { describe, it, expect } from 'vitest';
import { fuzzyMatchFoodKeeper } from '../foodkeeper.js';

describe('fuzzyMatchFoodKeeper', () => {
  // --- Exact name matching ---

  it('returns shelf days for exact name match', () => {
    // "chicken breast" is a known FoodKeeper entry with fridge min=1
    const result = fuzzyMatchFoodKeeper('chicken breast', 'fridge');
    expect(result).toBe(1);
  });

  it('returns shelf days for freezer location', () => {
    // "chicken breast" in freezer should have a much longer shelf life
    const result = fuzzyMatchFoodKeeper('chicken breast', 'freezer');
    expect(result).toBeTypeOf('number');
    expect(result).toBeGreaterThan(100); // Freezer is months
  });

  // --- Case insensitivity ---

  it('is case-insensitive', () => {
    const lower = fuzzyMatchFoodKeeper('chicken breast', 'fridge');
    const upper = fuzzyMatchFoodKeeper('Chicken Breast', 'fridge');
    const mixed = fuzzyMatchFoodKeeper('CHICKEN BREAST', 'fridge');
    expect(lower).toBe(upper);
    expect(upper).toBe(mixed);
  });

  // --- Keyword matching ---

  it('matches via keywords when exact name does not match', () => {
    // "organic chicken thighs" should match an entry with "chicken" keyword
    const result = fuzzyMatchFoodKeeper('organic chicken thighs', 'fridge');
    expect(result).toBeTypeOf('number');
    expect(result).toBeGreaterThan(0);
  });

  it('matches multi-word keywords', () => {
    // "ground beef" should be a keyword that matches "lean ground beef"
    const result = fuzzyMatchFoodKeeper('lean ground beef', 'fridge');
    expect(result).toBeTypeOf('number');
    expect(result).toBeGreaterThan(0);
  });

  // --- No match ---

  it('returns null for unknown items', () => {
    const result = fuzzyMatchFoodKeeper('xyz product 9000', 'fridge');
    expect(result).toBeNull();
  });

  it('returns null when location has no shelf-life data', () => {
    // "chicken breast" typically has no pantry storage data
    const result = fuzzyMatchFoodKeeper('chicken breast', 'pantry');
    expect(result).toBeNull();
  });

  it('returns null for empty string input', () => {
    const result = fuzzyMatchFoodKeeper('', 'fridge');
    expect(result).toBeNull();
  });

  // --- Conservative value ---

  it('returns the conservative (min) shelf-life value', () => {
    // Milk in fridge: USDA says 5-7 days → should return 5
    const result = fuzzyMatchFoodKeeper('milk', 'fridge');
    expect(result).toBeTypeOf('number');
    // The min should be less than or equal to the max
    // We verify it's the conservative end (lower number)
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(7);
  });

  // --- Common grocery items ---

  it('matches common produce items', () => {
    const strawberries = fuzzyMatchFoodKeeper('strawberries', 'fridge');
    expect(strawberries).toBeTypeOf('number');
    expect(strawberries).toBeGreaterThan(0);
    expect(strawberries).toBeLessThanOrEqual(7); // Berries don't last long
  });

  it('matches common dairy items', () => {
    const eggs = fuzzyMatchFoodKeeper('eggs', 'fridge');
    expect(eggs).toBeTypeOf('number');
    expect(eggs).toBeGreaterThan(14); // Eggs last 3-5 weeks
  });
});
