'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { InventoryItemWithDetails } from '@/hooks/use-inventory-items'
import type { StorageLocation, DiscardReason } from '@fridge-manager/shared'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EditInventoryInput = {
  itemId: string
  householdId: string
  updates: {
    name?: string
    quantity?: string | null
    expiration_date?: string | null
    location?: StorageLocation
  }
}

type DiscardInput = {
  itemId: string
  householdId: string
  reason: DiscardReason
}

type ReAddToGroceryInput = {
  name: string
  quantity: string | null
  categoryId: string
  destination: 'fridge' | 'freezer' | 'pantry' | 'none'
  householdId: string
  addedBy: string
}

/** Max length for item name */
const MAX_NAME_LENGTH = 200
/** Max length for quantity */
const MAX_QUANTITY_LENGTH = 50

// ---------------------------------------------------------------------------
// Purchase history query
// ---------------------------------------------------------------------------

/**
 * Counts completed grocery items with the same name in this household.
 * Used to display "Bought X times before" in the detail sheet.
 */
export function usePurchaseHistoryCount(
  householdId: string,
  itemName: string,
  enabled = true,
) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['purchase-history', householdId, itemName],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('grocery_items')
        .select('*', { count: 'exact', head: true })
        .eq('household_id', householdId)
        .ilike('name', itemName)
        .not('completed_at', 'is', null)

      if (error) throw error
      return count ?? 0
    },
    enabled,
    staleTime: 60_000,
  })
}

// ---------------------------------------------------------------------------
// Edit mutation
// ---------------------------------------------------------------------------

/**
 * Updates an inventory item's name, quantity, expiration, or location.
 * Uses optimistic update with rollback on failure.
 */
export function useEditInventoryItem() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ itemId, updates }: EditInventoryInput) => {
      // Client-side validation
      if (updates.name !== undefined) {
        const trimmed = updates.name.trim()
        if (!trimmed) throw new Error('Item name cannot be empty')
        if (trimmed.length > MAX_NAME_LENGTH) {
          throw new Error(`Item name must be under ${MAX_NAME_LENGTH} characters`)
        }
        updates.name = trimmed
      }
      if (updates.quantity !== undefined && updates.quantity !== null) {
        if (updates.quantity.length > MAX_QUANTITY_LENGTH) {
          throw new Error(`Quantity must be under ${MAX_QUANTITY_LENGTH} characters`)
        }
      }

      const { data, error } = await supabase
        .from('inventory_items')
        .update(updates)
        .eq('id', itemId)
        .select()
        .single()

      if (error) throw error
      return data
    },

    onMutate: async ({ itemId, householdId, updates }) => {
      // Cancel outgoing fetches
      await queryClient.cancelQueries({ queryKey: ['inventory-items', householdId] })

      // Snapshot previous data for all locations
      const locations: StorageLocation[] = ['fridge', 'freezer', 'pantry']
      const snapshots: Record<string, InventoryItemWithDetails[] | undefined> = {}

      for (const loc of locations) {
        const key = ['inventory-items', householdId, loc]
        snapshots[loc] = queryClient.getQueryData<InventoryItemWithDetails[]>(key)

        queryClient.setQueryData<InventoryItemWithDetails[]>(key, (old) =>
          old?.map((item) =>
            item.id === itemId ? { ...item, ...updates } : item
          )
        )
      }

      return { snapshots }
    },

    onError: (_err, { householdId }, context) => {
      // Rollback
      if (context?.snapshots) {
        const locations: StorageLocation[] = ['fridge', 'freezer', 'pantry']
        for (const loc of locations) {
          if (context.snapshots[loc]) {
            queryClient.setQueryData(
              ['inventory-items', householdId, loc],
              context.snapshots[loc]
            )
          }
        }
      }
      toast.error('Failed to update item')
    },

    onSuccess: (_data, { householdId }) => {
      // Invalidate to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['inventory-items', householdId] })
      queryClient.invalidateQueries({ queryKey: ['inventory-counts', householdId] })
      toast.success('Item updated')
    },
  })
}

// ---------------------------------------------------------------------------
// Discard mutation
// ---------------------------------------------------------------------------

/**
 * Marks an inventory item as discarded (consumed, wasted, or expired).
 * Sets discarded_at to now and the given discard_reason.
 */
export function useDiscardItem() {
  const supabase = createClient()
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

    onError: () => {
      toast.error('Failed to remove item')
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
  const supabase = createClient()
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
      toast.success('Added to grocery list')
    },

    onError: () => {
      toast.error('Failed to add to grocery list')
    },
  })
}

// ---------------------------------------------------------------------------
// Restore item mutation
// ---------------------------------------------------------------------------

type RestoreInput = {
  itemId: string
  householdId: string
}

/**
 * Restores a discarded item back to active inventory.
 * Clears discarded_at and discard_reason.
 */
export function useRestoreItem() {
  const supabase = createClient()
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
      queryClient.invalidateQueries({ queryKey: ['removal-history', householdId] })
      toast.success('Item restored to inventory')
    },

    onError: () => {
      toast.error('Failed to restore item')
    },
  })
}

// ---------------------------------------------------------------------------
// Change discard reason mutation
// ---------------------------------------------------------------------------

type ChangeReasonInput = {
  itemId: string
  householdId: string
  newReason: DiscardReason
}

/**
 * Changes the discard reason on an already-discarded item.
 * Used for corrections: "I meant to mark it as used, not tossed."
 */
export function useChangeDiscardReason() {
  const supabase = createClient()
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
      queryClient.invalidateQueries({ queryKey: ['removal-history', householdId] })
      toast.success('Reason updated')
    },

    onError: () => {
      toast.error('Failed to update reason')
    },
  })
}

