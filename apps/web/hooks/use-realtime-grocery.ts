'use client'

import { useEffect, useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

type SyncStatus = 'synced' | 'syncing' | 'error'

/**
 * Subscribes to Supabase Realtime changes on grocery_items
 * filtered by household_id. On any INSERT/UPDATE/DELETE,
 * invalidates the TanStack Query cache so the UI re-renders.
 *
 * Returns the current sync status for the header badge.
 */
export function useRealtimeGrocery(householdId: string | undefined) {
  const queryClient = useQueryClient()
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced')

  const invalidateGroceryItems = useCallback(() => {
    setSyncStatus('syncing')
    queryClient
      .invalidateQueries({ queryKey: ['grocery-items', householdId] })
      .then(() => setSyncStatus('synced'))
      .catch(() => setSyncStatus('error'))
  }, [queryClient, householdId])

  useEffect(() => {
    if (!householdId) return

    const supabase = createClient()
    let channel: RealtimeChannel

    channel = supabase
      .channel(`grocery-items:${householdId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'grocery_items',
          filter: `household_id=eq.${householdId}`,
        },
        () => {
          invalidateGroceryItems()
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setSyncStatus('synced')
        } else if (status === 'CHANNEL_ERROR') {
          setSyncStatus('error')
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [householdId, invalidateGroceryItems])

  return { syncStatus }
}
