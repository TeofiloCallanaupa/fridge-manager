/**
 * FoodKeeper fuzzy matching utility.
 *
 * Looks up shelf-life data for a food item by matching against the
 * curated USDA FoodKeeper dataset. Returns the conservative (min)
 * shelf-life in days for the given storage location.
 *
 * Matching strategy (priority order):
 * 1. Exact name match
 * 2. Keyword substring match (keyword found in item name, or item name found in keyword)
 * 3. No match → null
 */

import type { StorageLocation } from '../types/grocery.js';
import foodkeeperData from '../data/foodkeeper.json';

/** Shape of a single entry in the FoodKeeper dataset. */
interface FoodKeeperEntry {
  name: string;
  keywords: string[];
  category: string;
  shelfLife: Partial<Record<StorageLocation, { min: number; max: number }>>;
}

const data: FoodKeeperEntry[] = foodkeeperData as FoodKeeperEntry[];

/**
 * Check if `searchTerm` appears as a whole word (or phrase) in `text`.
 * "chicken" matches "organic chicken thighs" but "meat" doesn't match "unicorn meat"
 * unless "meat" is actually a keyword for that entry.
 *
 * Uses word-boundary regex to prevent partial matches.
 */
function matchesAsWholeWord(text: string, searchTerm: string): boolean {
  // Escape regex special characters in the search term
  const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}\\b`, 'i');
  return regex.test(text);
}

/**
 * Look up the shelf life for a food item by name and storage location.
 *
 * @param itemName - The name of the food item (e.g. "Chicken Breast", "organic strawberries")
 * @param location - Storage location: 'fridge', 'freezer', or 'pantry'
 * @returns Conservative (min) shelf-life in days, or null if no match
 */
export function fuzzyMatchFoodKeeper(
  itemName: string,
  location: StorageLocation,
): number | null {
  if (!itemName || itemName.trim().length === 0) return null;

  const normalised = itemName.toLowerCase().trim();

  // 1. Exact name match (highest priority)
  const exactMatch = data.find((entry) => entry.name === normalised);
  if (exactMatch) {
    return exactMatch.shelfLife[location]?.min ?? null;
  }

  // 2. Keyword match — match whole words/phrases only
  //    A keyword matches if it appears as a complete word (or phrase) in the item name,
  //    or the item name appears as a complete word in the keyword.
  let bestMatch: FoodKeeperEntry | null = null;
  let bestScore = 0;

  for (const entry of data) {
    for (const keyword of entry.keywords) {
      if (matchesAsWholeWord(normalised, keyword) || matchesAsWholeWord(keyword, normalised)) {
        // Score by keyword length — longer matches are more specific
        const score = keyword.length;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = entry;
        }
      }
    }
  }

  if (bestMatch) {
    return bestMatch.shelfLife[location]?.min ?? null;
  }

  return null;
}
