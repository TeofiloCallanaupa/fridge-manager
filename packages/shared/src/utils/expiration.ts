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
import { fuzzyMatchFoodKeeper } from './foodkeeper.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Calculate the expiration date for an item based on its category and storage location.
 *
 * Fallback chain:
 * 1. FoodKeeper fuzzy match → conservative end of shelf life range
 * 2. default_shelf_days table (category + location)
 * 3. null (if category.has_expiration = false)
 */
export function calculateExpiration(
  itemName: string,
  categoryHasExpiration: boolean,
  location: StorageLocation,
  addedAt: Date,
  defaultShelfDays: number | null,
): Date | null {
  if (!categoryHasExpiration) return null;

  // Tier 1: FoodKeeper fuzzy match
  const foodKeeperDays = fuzzyMatchFoodKeeper(itemName, location);
  if (foodKeeperDays !== null) {
    const expiration = new Date(addedAt);
    expiration.setDate(expiration.getDate() + foodKeeperDays);
    return expiration;
  }

  // Tier 2: Category default shelf days
  if (defaultShelfDays === null) return null;

  const expiration = new Date(addedAt);
  expiration.setDate(expiration.getDate() + defaultShelfDays);
  return expiration;
}

/**
 * Returns the number of whole days since the given date.
 * Always returns 0 for today, regardless of time.
 */
export function getDaysSince(date: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / MS_PER_DAY);
}

/**
 * Returns the expiration color for an inventory item.
 *   green  = >3 days remaining
 *   yellow = 1-3 days remaining
 *   red    = expired or expiring today
 *   null   = no expiration date
 */
export function getExpirationColor(
  expirationDate: Date | null,
): ExpirationColor | null {
  if (expirationDate === null) return null;

  const now = new Date();
  const diffMs = expirationDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / MS_PER_DAY);

  if (daysRemaining <= 0) return 'red';
  if (daysRemaining <= 3) return 'yellow';
  return 'green';
}
