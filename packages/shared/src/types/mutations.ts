/**
 * Shared mutation input types for inventory operations.
 *
 * Used by both web and mobile hooks to ensure consistent
 * mutation payloads across platforms.
 */

import type { StorageLocation, DiscardReason } from './grocery.js'

/** Input for editing an existing inventory item */
export type EditInventoryInput = {
  itemId: string
  householdId: string
  updates: {
    name?: string
    quantity?: string | null
    expiration_date?: string | null
    location?: StorageLocation
  }
}

/** Input for discarding an inventory item */
export type DiscardInput = {
  itemId: string
  householdId: string
  reason: DiscardReason
}

/** Input for restoring a discarded inventory item */
export type RestoreInput = {
  itemId: string
  householdId: string
}

/** Input for re-adding a discarded item back to the grocery list */
export type ReAddToGroceryInput = {
  name: string
  quantity: string | null
  categoryId: string
  destination: 'fridge' | 'freezer' | 'pantry' | 'none'
  householdId: string
  addedBy: string
}

/** Input for changing the discard reason on a removed item */
export type ChangeReasonInput = {
  itemId: string
  householdId: string
  newReason: DiscardReason
}
