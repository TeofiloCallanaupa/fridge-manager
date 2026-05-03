import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { StorageLocation, DiscardReason } from '@fridge-manager/shared'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DiscardInput = {
  itemId: string
  householdId: string
  reason: DiscardReason
}

type RestoreInput = {
  itemId: string
  householdId: string
}

type ReAddToGroceryInput = {
  name: string
  quantity: string | null
  categoryId: string
  destination: 'fridge' | 'freezer' | 'pantry' | 'none'
  householdId: string
  addedBy: string
}

type ChangeReasonInput = {
  itemId: string
  householdId: string
  newReason: DiscardReason
}

// ---------------------------------------------------------------------------
// Discard mutation
// ---------------------------------------------------------------------------

/**
 * Marks an inventory item as discarded (consumed, wasted, or expired).
 * Sets discarded_at to now and the given discard_reason.
 */
export function useDiscardItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ itemId, reason }: DiscardInput) => {
      const { data, error } = await supabase
        .from('inventory_items')
        .update({
          discarded_at: new Date().toISOString(),
          discard_reason: reason,
        })
        .eq('id', itemId)
        .select()
        .single()

      if (error) throw error
      return data
    },

    onSuccess: (_data, { householdId }) => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items', householdId] })
      queryClient.invalidateQueries({ queryKey: ['inventory-counts', householdId] })
      queryClient.invalidateQueries({ queryKey: ['recently-removed', householdId] })
    },
  })
}

// ---------------------------------------------------------------------------
// Restore item mutation
// ---------------------------------------------------------------------------

/**
 * Restores a discarded item back to active inventory.
 * Clears discarded_at and discard_reason.
 */
export function useRestoreItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ itemId }: RestoreInput) => {
      const { data, error } = await supabase
        .from('inventory_items')
        .update({
          discarded_at: null,
          discard_reason: null,
        })
        .eq('id', itemId)
        .select()
        .single()

      if (error) throw error
      return data
    },

    onSuccess: (_data, { householdId }) => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items', householdId] })
      queryClient.invalidateQueries({ queryKey: ['inventory-counts', householdId] })
      queryClient.invalidateQueries({ queryKey: ['recently-removed', householdId] })
    },
  })
}

// ---------------------------------------------------------------------------
// Re-add to grocery list mutation
// ---------------------------------------------------------------------------

/**
 * Creates a new grocery_item from an inventory item's details.
 * Used when the user wants to re-buy something they've used/discarded.
 */
export function useReAddToGroceryList() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      name,
      quantity,
      categoryId,
      destination,
      householdId,
      addedBy,
    }: ReAddToGroceryInput) => {
      const { data, error } = await supabase
        .from('grocery_items')
        .insert({
          name: name.trim(),
          quantity,
          category_id: categoryId,
          destination,
          household_id: householdId,
          added_by: addedBy,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },

    onSuccess: (_data, { householdId }) => {
      queryClient.invalidateQueries({ queryKey: ['grocery-items', householdId] })
    },
  })
}

// ---------------------------------------------------------------------------
// Change discard reason mutation
// ---------------------------------------------------------------------------

/**
 * Changes the discard reason on an already-discarded item.
 * Used for corrections: "I meant to mark it as used, not tossed."
 */
export function useChangeDiscardReason() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ itemId, newReason }: ChangeReasonInput) => {
      const { data, error } = await supabase
        .from('inventory_items')
        .update({ discard_reason: newReason })
        .eq('id', itemId)
        .select()
        .single()

      if (error) throw error
      return data
    },

    onSuccess: (_data, { householdId }) => {
      queryClient.invalidateQueries({ queryKey: ['recently-removed', householdId] })
    },
  })
}
