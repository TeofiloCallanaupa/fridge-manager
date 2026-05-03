import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { calculateExpiration, fuzzyMatchFoodKeeper } from '@fridge-manager/shared'
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
  })
}

// ---------------------------------------------------------------------------
// Toggle check mutation (visual only — NO completed_at, NO inventory)
// ---------------------------------------------------------------------------

/**
 * Toggles the checked state of a grocery item.
 * - Unchecked → sets checked=true, checked_by, checked_at
 * - Checked → sets checked=false, clears checked_by/checked_at
 *
 * This does NOT set completed_at or create inventory items.
 * Use `useFinishShopping` for the batch-complete + inventory flow.
 */
export function useToggleGroceryItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      item,
      userId,
    }: {
      item: GroceryItemWithCategory
      userId: string
    }) => {
      const nowChecked = !item.checked
      const now = new Date().toISOString()

      const updatePayload = nowChecked
        ? {
            checked: true,
            checked_by: userId,
            checked_at: now,
          }
        : {
            checked: false,
            checked_by: null,
            checked_at: null,
          }

      const { error } = await supabase
        .from('grocery_items')
        .update(updatePayload)
        .eq('id', item.id)

      if (error) throw error
      return { itemId: item.id, checked: nowChecked }
    },
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ['grocery-items', variables.item.household_id],
      })

      // Snapshot for rollback
      const previousItems = queryClient.getQueryData<GroceryItemWithCategory[]>(
        ['grocery-items', variables.item.household_id]
      )

      // Optimistic toggle
      queryClient.setQueryData<GroceryItemWithCategory[]>(
        ['grocery-items', variables.item.household_id],
        (old) =>
          old?.map((i) =>
            i.id === variables.item.id
              ? { ...i, checked: !variables.item.checked }
              : i
          ) ?? []
      )

      return { previousItems }
    },
    onError: (_err, variables, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(
          ['grocery-items', variables.item.household_id],
          context.previousItems
        )
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['grocery-items', variables.item.household_id],
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Finish Shopping — batch-complete checked items + create inventory
// ---------------------------------------------------------------------------

/**
 * Batch-completes all checked grocery items:
 * 1. Fetches all checked, uncompleted items for the household
 * 2. Sets completed_at on all of them
 * 3. For each item with destination ≠ 'none': creates an inventory item
 *
 * Uses `calculateExpiration()` from packages/shared for date calculation.
 */
export function useFinishShopping() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      householdId,
      userId,
    }: {
      householdId: string
      userId: string
    }) => {
      // 1. Fetch all checked, uncompleted items
      const { data: checkedItems, error: fetchError } = await supabase
        .from('grocery_items')
        .select(`
          *,
          categories!inner (name, emoji, display_order, default_destination, has_expiration)
        `)
        .eq('household_id', householdId)
        .eq('checked', true)
        .is('completed_at', null)
        .order('created_at', { ascending: true })

      if (fetchError) throw fetchError
      if (!checkedItems || checkedItems.length === 0) {
        return { completedCount: 0 }
      }

      const now = new Date().toISOString()
      const itemIds = checkedItems.map((i: any) => i.id)

      // 2. Batch set completed_at
      const { error: updateError } = await supabase
        .from('grocery_items')
        .update({ completed_at: now })
        .in('id', itemIds)

      if (updateError) throw updateError

      // 3. Create inventory items for non-'none' destinations
      for (const item of checkedItems as GroceryItemWithCategory[]) {
        if (!item.destination || item.destination === 'none') continue

        try {
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

          const expirationDate = calculateExpiration(
            item.name,
            item.categories.has_expiration,
            loc,
            new Date(),
            defaultShelfDays,
          )

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

          if (insertError) {
            console.error(`[FinishShopping] Failed to create inventory for "${item.name}":`, insertError)
          }
        } catch (err) {
          console.error(`[FinishShopping] Error processing "${item.name}":`, err)
        }
      }

      return { completedCount: checkedItems.length }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['grocery-items', variables.householdId],
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Delete item mutation
// ---------------------------------------------------------------------------

export function useDeleteGroceryItem() {
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
    },
  })
}

// Keep backward-compatible export for any existing references
export const useCheckOffGroceryItem = useToggleGroceryItem
