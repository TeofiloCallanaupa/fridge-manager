'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

/**
 * Subscribes to Supabase Realtime changes on inventory_items for a household.
 * Invalidates TanStack Query cache on any INSERT, UPDATE, or DELETE.
 */
export function useRealtimeInventory(householdId: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`inventory:${householdId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_items',
          filter: `household_id=eq.${householdId}`,
        },
        () => {
          // Invalidate all inventory-related queries
          queryClient.invalidateQueries({ queryKey: ['inventory-items', householdId] })
          queryClient.invalidateQueries({ queryKey: ['inventory-counts', householdId] })
          queryClient.invalidateQueries({ queryKey: ['recently-removed', householdId] })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [householdId, queryClient])
}
