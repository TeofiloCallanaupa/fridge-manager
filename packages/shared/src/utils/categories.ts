/**
 * Category lookup utilities.
 */

import { CATEGORY_SEED_DATA, DEFAULT_SHELF_DAYS } from '../constants/categories.js';

/**
 * Returns the emoji for a given category name from the seed data.
 * Returns null if the category is not found.
 */
export function getCategoryEmoji(categoryName: string): string | null {
  const category = CATEGORY_SEED_DATA.find((c) => c.name === categoryName);
  return category?.emoji ?? null;
}

/**
 * Returns the default shelf days for a category + location combination.
 * Returns null if no default exists.
 */
export function getDefaultShelfDays(
  categoryName: string,
  location: string,
): number | null {
  const entry = DEFAULT_SHELF_DAYS.find(
    (d) => d.category === categoryName && d.location === location,
  );
  return entry?.shelf_days ?? null;
}
