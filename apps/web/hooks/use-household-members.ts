'use client'

/**
 * Hook to fetch household members with their profiles.
 * Used in the unified settings page to display the member list.
 */
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export interface HouseholdMember {
  userId: string
  displayName: string
  avatarConfig: Record<string, string> | null
  role: 'owner' | 'member'
}

export function useHouseholdMembers(householdId: string | undefined | null) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['household-members', householdId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('household_members')
        .select('user_id, role, profiles(display_name, avatar_config)')
        .eq('household_id', householdId!)

      if (error) throw error

      return (data ?? []).map((row: any) => ({
        userId: row.user_id,
        displayName: row.profiles?.display_name ?? 'Unknown',
        avatarConfig: row.profiles?.avatar_config ?? null,
        role: row.role as 'owner' | 'member',
      })) as HouseholdMember[]
    },
    enabled: !!householdId,
  })
}
