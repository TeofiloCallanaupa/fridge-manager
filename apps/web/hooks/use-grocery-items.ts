'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { calculateExpiration, fuzzyMatchFoodKeeper } from '@fridge-manager/shared'
import { toast } from 'sonner'
import type { GroceryItem, Category } from '@fridge-manager/shared'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GroceryItemWithCategory = GroceryItem & {
  categories: Pick<Category, 'name' | 'emoji' | 'display_order' | 'default_destination' | 'has_expiration'>
}

type AddGroceryItemInput = {
  name: string
  quantity: string | null
  category_id: string
  destination: 'fridge' | 'freezer' | 'pantry' | 'none'
  household_id: string
  added_by: string
}

/** Max length for item name to prevent abuse */
const MAX_NAME_LENGTH = 200
/** Max length for quantity field */
const MAX_QUANTITY_LENGTH = 50
/** Valid destination values */
const VALID_DESTINATIONS = new Set(['fridge', 'freezer', 'pantry', 'none'])

// ---------------------------------------------------------------------------
// Fetch hook
// ---------------------------------------------------------------------------

/**
 * Fetches active grocery items (not yet completed) for a household,
 * joined with categories for grouping and sorting.
 */
export function useGroceryItems(householdId: string | undefined) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['grocery-items', householdId],
    queryFn: async () => {
      if (!householdId) return []

      const { data, error } = await supabase
        .from('grocery_items')
        .select(`
          *,
          categories!inner (name, emoji, display_order, default_destination, has_expiration)
        `)
        .eq('household_id', householdId)
        .is('completed_at', null)
        .order('created_at', { ascending: true })

      if (error) throw error
      return (data ?? []) as GroceryItemWithCategory[]
    },
    enabled: !!householdId,
  })
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateAddInput(input: AddGroceryItemInput): string | null {
  if (!input.name.trim()) return 'Item name is required'
  if (input.name.length > MAX_NAME_LENGTH) return `Name must be under ${MAX_NAME_LENGTH} characters`
  if (input.quantity && input.quantity.length > MAX_QUANTITY_LENGTH) {
    return `Quantity must be under ${MAX_QUANTITY_LENGTH} characters`
  }
  if (!VALID_DESTINATIONS.has(input.destination)) return 'Invalid destination'
  return null
}

// ---------------------------------------------------------------------------
// Add item mutation
// ---------------------------------------------------------------------------

export function useAddGroceryItem() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: AddGroceryItemInput) => {
      const validationError = validateAddInput(input)
      if (validationError) throw new Error(validationError)

      const { data, error } = await supabase
        .from('grocery_items')
        .insert({
          name: input.name.trim(),
          quantity: input.quantity?.trim() || null,
          category_id: input.category_id,
          destination: input.destination,
          household_id: input.household_id,
          added_by: input.added_by,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['grocery-items', variables.household_id],
      })
    },
    onError: (error) => {
      toast.error('Failed to add item', {
        description: error instanceof Error ? error.message : 'Please try again',
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Check-off mutation (checkout flow)
// ---------------------------------------------------------------------------

/**
 * Checks off a grocery item:
 * 1. Marks the grocery item as checked + completed
 * 2. If destination !== 'none': creates an inventory_item with auto-calculated expiration
 * 3. If destination === 'none': just marks complete (household items like paper towels)
 *
 * Uses `calculateExpiration()` from packages/shared for date calculation.
 * If inventory creation fails, rolls back the grocery item to unchecked state.
 */
export function useCheckOffGroceryItem() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      item,
      userId,
    }: {
      item: GroceryItemWithCategory
      userId: string
    }) => {
      const now = new Date().toISOString()

      // 1. Mark grocery item as checked + completed
      const { error: updateError } = await supabase
        .from('grocery_items')
        .update({
          checked: true,
          checked_by: userId,
          checked_at: now,
          completed_at: now,
        })
        .eq('id', item.id)

      if (updateError) throw updateError

      // 2. If destination is not 'none', create an inventory item
      if (item.destination && item.destination !== 'none') {
        try {
          // Look up default shelf days for this category + location
          let defaultShelfDays: number | null = null

          if (item.categories.has_expiration) {
            const { data: shelfData } = await supabase
              .from('default_shelf_days')
              .select('shelf_days')
              .eq('category_id', item.category_id)
              .eq('location', item.destination)
              .single()

            defaultShelfDays = shelfData?.shelf_days ?? null
          }

          const loc = item.destination as 'fridge' | 'freezer' | 'pantry'

          // Use shared utility for expiration calculation (FoodKeeper → default)
          const expirationDate = calculateExpiration(
            item.name,
            item.categories.has_expiration,
            loc,
            new Date(),
            defaultShelfDays,
          )

          // Detect which tier provided the expiration
          let expirationSource: string | null = null
          if (expirationDate) {
            const foodKeeperMatch = fuzzyMatchFoodKeeper(item.name, loc)
            expirationSource = foodKeeperMatch !== null ? 'foodkeeper' : 'default'
          }

          const { error: insertError } = await supabase
            .from('inventory_items')
            .insert({
              name: item.name,
              quantity: item.quantity,
              category_id: item.category_id,
              location: loc,
              household_id: item.household_id,
              added_by: userId,
              expiration_date: expirationDate
                ? expirationDate.toISOString().split('T')[0]
                : null,
              expiration_source: expirationSource,
              source: 'grocery_checkout',
            })

          if (insertError) throw insertError
        } catch (inventoryError) {
          // Rollback: revert grocery item to unchecked state
          await supabase
            .from('grocery_items')
            .update({
              checked: false,
              checked_by: null,
              checked_at: null,
              completed_at: null,
            })
            .eq('id', item.id)

          throw inventoryError
        }
      }

      return { itemId: item.id }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['grocery-items', variables.item.household_id],
      })
    },
    onError: (error) => {
      toast.error('Failed to check off item', {
        description: error instanceof Error ? error.message : 'Please try again',
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Uncheck mutation (undo)
// ---------------------------------------------------------------------------

export function useUncheckGroceryItem() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      itemId,
      householdId,
    }: {
      itemId: string
      householdId: string
    }) => {
      const { error } = await supabase
        .from('grocery_items')
        .update({
          checked: false,
          checked_by: null,
          checked_at: null,
          completed_at: null,
        })
        .eq('id', itemId)

      if (error) throw error
      return { itemId }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['grocery-items', variables.householdId],
      })
    },
    onError: (error) => {
      toast.error('Failed to uncheck item', {
        description: error instanceof Error ? error.message : 'Please try again',
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Delete item mutation
// ---------------------------------------------------------------------------

export function useDeleteGroceryItem() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      itemId,
      householdId,
    }: {
      itemId: string
      householdId: string
    }) => {
      const { error } = await supabase
        .from('grocery_items')
        .delete()
        .eq('id', itemId)

      if (error) throw error
      return { itemId }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['grocery-items', variables.householdId],
      })
      toast.success('Item removed')
    },
    onError: (error) => {
      toast.error('Failed to delete item', {
        description: error instanceof Error ? error.message : 'Please try again',
      })
    },
  })
}
