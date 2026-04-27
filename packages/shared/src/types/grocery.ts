/**
 * Grocery and inventory item types matching the Supabase schema.
 * See docs/architecture.md for the full schema definition.
 */

export interface Category {
  id: string;
  name: string;
  emoji: string | null;
  display_order: number;
  default_destination: 'fridge' | 'freezer' | 'pantry' | 'none';
  has_expiration: boolean;
}

export interface GroceryItem {
  id: string;
  household_id: string;
  name: string;
  quantity: string | null;
  category_id: string;
  destination: 'fridge' | 'freezer' | 'pantry' | 'none';
  checked: boolean;
  added_by: string;
  checked_by: string | null;
  created_at: string;
  updated_at: string;
  checked_at: string | null;
  completed_at: string | null;
}

export type StorageLocation = 'fridge' | 'freezer' | 'pantry';

export type DiscardReason = 'consumed' | 'expired' | 'wasted';

export type InventorySource = 'manual' | 'grocery_checkout';

export type ExpirationSource = 'user' | 'default';

export interface InventoryItem {
  id: string;
  household_id: string;
  name: string;
  quantity: string | null;
  category_id: string;
  location: StorageLocation;
  expiration_date: string | null;
  expiration_source: ExpirationSource | null;
  added_by: string;
  added_at: string;
  updated_at: string;
  discarded_at: string | null;
  discard_reason: DiscardReason | null;
  source: InventorySource;
}

export interface DefaultShelfDays {
  id: string;
  category_id: string;
  location: StorageLocation;
  shelf_days: number;
}

export type ExpirationColor = 'green' | 'yellow' | 'red';
