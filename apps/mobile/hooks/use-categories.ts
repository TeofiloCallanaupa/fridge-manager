import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export type CategoryData = {
  id: string
  name: string
  emoji: string
  display_order: number
  default_destination: 'fridge' | 'freezer' | 'pantry' | 'none'
  has_expiration: boolean
}

/**
 * Fetches all categories for the add-item picker.
 * Categories rarely change, so staleTime is set very high.
 */
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, emoji, display_order, default_destination, has_expiration')
        .order('display_order', { ascending: true })

      if (error) throw error
      return (data ?? []) as CategoryData[]
    },
    staleTime: 1000 * 60 * 60, // 1 hour — categories rarely change
  })
}
