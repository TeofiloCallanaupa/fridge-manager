/**
 * Expiration date calculation and color-coding utilities.
 *
 * Color thresholds (from architecture.md):
 *   green  = >3 days until expiration
 *   yellow = 1-3 days until expiration
 *   red    = expired (expiration_date <= today)
 *   null   = no expiration date (has_expiration = false)
 */

import type { ExpirationColor, StorageLocation } from '../types/grocery.js';

/**
 * Calculate the expiration date for an item based on its category and storage location.
 *
 * Fallback chain:
 * 1. FoodKeeper fuzzy match → conservative end of shelf life range
 * 2. default_shelf_days table (category + location)
 * 3. null (if category.has_expiration = false)
 */
export function calculateExpiration(
  _itemName: string,
  _categoryHasExpiration: boolean,
  _location: StorageLocation,
  _addedAt: Date,
  _defaultShelfDays: number | null,
): Date | null {
  // TODO: Implement — see tests for expected behavior
  throw new Error('Not implemented');
}

/**
 * Returns the number of whole days since the given date.
 * Always returns 0 for today, regardless of time.
 */
export function getDaysSince(_date: Date): number {
  // TODO: Implement
  throw new Error('Not implemented');
}

/**
 * Returns the expiration color for an inventory item.
 *   green  = >3 days remaining
 *   yellow = 1-3 days remaining
 *   red    = expired
 *   null   = no expiration date
 */
export function getExpirationColor(
  _expirationDate: Date | null,
): ExpirationColor | null {
  // TODO: Implement
  throw new Error('Not implemented');
}
