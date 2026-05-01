'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Category } from '@fridge-manager/shared'

/**
 * Fetches all categories sorted by display_order.
 * Categories are global reference data — cached aggressively.
 */
export function useCategories() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true })

      if (error) throw error
      return data as Category[]
    },
    staleTime: 30 * 60 * 1000, // 30 min — categories rarely change
  })
}
