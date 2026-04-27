/**
 * Category seed data and expiration color constants.
 * These match the seed data defined in docs/architecture.md.
 */

import type { ExpirationColor } from '../types/grocery.js';

/** Category seed data — the source of truth for initial categories. */
export const CATEGORY_SEED_DATA = [
  { name: 'produce',    emoji: '🥬', display_order: 1,  default_destination: 'fridge'  as const, has_expiration: true },
  { name: 'dairy',      emoji: '🥛', display_order: 2,  default_destination: 'fridge'  as const, has_expiration: true },
  { name: 'meat',       emoji: '🥩', display_order: 3,  default_destination: 'fridge'  as const, has_expiration: true },
  { name: 'bakery',     emoji: '🍞', display_order: 4,  default_destination: 'pantry'  as const, has_expiration: true },
  { name: 'frozen',     emoji: '🧊', display_order: 5,  default_destination: 'freezer' as const, has_expiration: true },
  { name: 'snacks',     emoji: '🍿', display_order: 6,  default_destination: 'pantry'  as const, has_expiration: true },
  { name: 'beverages',  emoji: '🥤', display_order: 7,  default_destination: 'fridge'  as const, has_expiration: true },
  { name: 'condiments', emoji: '🧂', display_order: 8,  default_destination: 'pantry'  as const, has_expiration: true },
  { name: 'leftovers',  emoji: '🍲', display_order: 9,  default_destination: 'fridge'  as const, has_expiration: true },
  { name: 'household',  emoji: '🧹', display_order: 10, default_destination: 'none'    as const, has_expiration: false },
] as const;

/**
 * Expiration color thresholds (in days remaining).
 *
 * >3 days  → green  (fresh)
 * 1-3 days → yellow (use soon)
 * ≤0 days  → red    (expired)
 */
export const EXPIRATION_COLORS: Record<ExpirationColor, { label: string; minDays: number; maxDays: number }> = {
  green:  { label: 'Fresh',    minDays: 4,           maxDays: Infinity },
  yellow: { label: 'Use soon', minDays: 1,           maxDays: 3 },
  red:    { label: 'Expired',  minDays: -Infinity,   maxDays: 0 },
};

/** Default shelf days by category + location (from architecture.md seed data). */
export const DEFAULT_SHELF_DAYS: Array<{ category: string; location: string; shelf_days: number | null }> = [
  { category: 'produce',    location: 'fridge',   shelf_days: 5 },
  { category: 'produce',    location: 'freezer',  shelf_days: 180 },
  { category: 'dairy',      location: 'fridge',   shelf_days: 7 },
  { category: 'dairy',      location: 'freezer',  shelf_days: 90 },
  { category: 'meat',       location: 'fridge',   shelf_days: 3 },
  { category: 'meat',       location: 'freezer',  shelf_days: 120 },
  { category: 'leftovers',  location: 'fridge',   shelf_days: 4 },
  { category: 'leftovers',  location: 'freezer',  shelf_days: 90 },
  { category: 'bakery',     location: 'pantry',   shelf_days: 7 },
  { category: 'bakery',     location: 'freezer',  shelf_days: 90 },
  { category: 'frozen',     location: 'freezer',  shelf_days: 180 },
  { category: 'snacks',     location: 'pantry',   shelf_days: 90 },
  { category: 'beverages',  location: 'fridge',   shelf_days: 14 },
  { category: 'condiments', location: 'fridge',   shelf_days: 180 },
  { category: 'condiments', location: 'pantry',   shelf_days: 365 },
  { category: 'household',  location: 'pantry',   shelf_days: null },
];
