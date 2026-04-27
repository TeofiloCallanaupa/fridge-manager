/**
 * Category lookup utilities.
 */

import type { Category } from '../types/grocery.js';
import { CATEGORY_SEED_DATA } from '../constants/categories.js';

/**
 * Returns the emoji for a given category name from the seed data.
 * Returns null if the category is not found.
 */
export function getCategoryEmoji(categoryName: string): string | null {
  // TODO: Implement
  throw new Error('Not implemented');
}

/**
 * Returns the default shelf days for a category + location combination.
 * Returns null if no default exists.
 */
export function getDefaultShelfDays(
  _categoryName: string,
  _location: string,
): number | null {
  // TODO: Implement
  throw new Error('Not implemented');
}
