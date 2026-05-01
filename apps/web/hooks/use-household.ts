'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

/**
 * Fetches the current user's household_id from household_members.
 * Returns the first household found (single-household for now).
 */
export function useCurrentHousehold() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['current-household'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('household_members')
        .select('household_id, role, households(name, timezone)')
        .eq('user_id', user.id)
        .limit(1)
        .single()

      if (error) throw error
      return {
        householdId: data.household_id,
        role: data.role as 'owner' | 'member',
        userId: user.id,
        household: data.households as unknown as { name: string; timezone: string },
      }
    },
    staleTime: 5 * 60 * 1000, // household rarely changes
  })
}
