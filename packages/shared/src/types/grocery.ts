/**
 * Grocery and inventory item types — derived from Supabase generated types.
 * Source of truth: database.ts (auto-generated from Supabase schema).
 *
 * This file adds narrower union types for enum-like columns that Supabase
 * generates as plain `string`. App code should use these types for type safety.
 */

import type { Tables } from './database.js';

// ---------------------------------------------------------------------------
// Enum-like union types (narrower than the generated `string`)
// ---------------------------------------------------------------------------

export type StorageLocation = 'fridge' | 'freezer' | 'pantry';
export type DiscardReason = 'consumed' | 'expired' | 'wasted';
export type InventorySource = 'manual' | 'grocery_checkout';
export type ExpirationSource = 'user' | 'default' | 'foodkeeper';
export type ExpirationColor = 'green' | 'yellow' | 'red';

// ---------------------------------------------------------------------------
// Row types — derived from database.ts, narrowed where needed
// ---------------------------------------------------------------------------

/** A food category (global reference data). */
export type Category = Omit<Tables<'categories'>, 'default_destination'> & {
  default_destination: 'fridge' | 'freezer' | 'pantry' | 'none' | null;
};

/** A grocery list item. */
export type GroceryItem = Omit<Tables<'grocery_items'>, 'destination'> & {
  destination: 'fridge' | 'freezer' | 'pantry' | 'none' | null;
};

/** An inventory item (in the fridge, freezer, or pantry). */
export type InventoryItem = Omit<
  Tables<'inventory_items'>,
  'location' | 'discard_reason' | 'source' | 'expiration_source'
> & {
  location: StorageLocation;
  discard_reason: DiscardReason | null;
  source: InventorySource;
  expiration_source: ExpirationSource | null;
};

/**
 * An inventory item joined with its category and adder profile.
 * Used by both web and mobile inventory UIs.
 */
export type InventoryItemWithDetails = InventoryItem & {
  categories: {
    name: string;
    emoji: string | null;
    has_expiration: boolean;
  } | null;
  profiles: {
    display_name: string | null;
  } | null;
};

/** Default shelf life by category + storage location (global reference data). */
export type DefaultShelfDays = Tables<'default_shelf_days'>;
