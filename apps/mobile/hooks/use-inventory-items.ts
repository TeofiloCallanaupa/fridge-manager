import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { InventoryItem, StorageLocation } from '@fridge-manager/shared'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InventoryItemWithDetails = InventoryItem & {
  categories: {
    name: string
    emoji: string | null
    has_expiration: boolean
  } | null
  profiles: {
    display_name: string | null
  } | null
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Fetches active inventory items for a household, filtered by location.
 * FEFO sort: items closest to expiry show first, then by added_at.
 */
export function useInventoryItems(
  householdId: string | undefined,
  location: StorageLocation
) {
  return useQuery({
    queryKey: ['inventory-items', householdId, location],
    queryFn: async () => {
      if (!householdId) return []

      const { data, error } = await supabase
        .from('inventory_items')
        .select(`
          *,
          categories (name, emoji, has_expiration),
          profiles:added_by (display_name)
        `)
        .eq('household_id', householdId)
        .eq('location', location)
        .is('discarded_at', null)
        .order('expiration_date', { ascending: true, nullsFirst: false })
        .order('added_at', { ascending: true })

      if (error) throw error
      return (data ?? []) as unknown as InventoryItemWithDetails[]
    },
    enabled: !!householdId,
    staleTime: 30_000,
  })
}

/**
 * Returns the count of active items per location for tab badges.
 */
export function useInventoryCounts(householdId: string | undefined) {
  return useQuery({
    queryKey: ['inventory-counts', householdId],
    queryFn: async () => {
      if (!householdId) return { fridge: 0, freezer: 0, pantry: 0 }

      const locations: StorageLocation[] = ['fridge', 'freezer', 'pantry']
      const counts: Record<StorageLocation, number> = {
        fridge: 0,
        freezer: 0,
        pantry: 0,
      }

      await Promise.all(
        locations.map(async (loc) => {
          const { count, error } = await supabase
            .from('inventory_items')
            .select('*', { count: 'exact', head: true })
            .eq('household_id', householdId!)
            .eq('location', loc)
            .is('discarded_at', null)

          if (!error && count !== null) {
            counts[loc] = count
          }
        })
      )

      return counts
    },
    enabled: !!householdId,
    staleTime: 30_000,
  })
}

/**
 * Fetches the 20 most recently removed (discarded) items for a household.
 * Scoped to the last 7 days per architecture spec.
 */
export function useRecentlyRemoved(householdId: string | undefined) {
  return useQuery({
    queryKey: ['recently-removed', householdId],
    queryFn: async () => {
      if (!householdId) return []

      const sevenDaysAgo = new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000
      ).toISOString()

      const { data, error } = await supabase
        .from('inventory_items')
        .select(`
          *,
          categories (name, emoji, has_expiration),
          profiles:added_by (display_name)
        `)
        .eq('household_id', householdId)
        .not('discarded_at', 'is', null)
        .gte('discarded_at', sevenDaysAgo)
        .order('discarded_at', { ascending: false })
        .limit(20)

      if (error) throw error
      return (data ?? []) as unknown as InventoryItemWithDetails[]
    },
    enabled: !!householdId,
    staleTime: 30_000,
  })
}
