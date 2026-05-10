/**
 * Hooks for household invite management.
 *
 * - useGenerateInviteLink() — mutation to create a single-use invite link
 * - usePendingInvites()     — query to list pending invites for the household
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const inviteKeys = {
  pending: (householdId: string | null) =>
    ['pending-invites', householdId] as const,
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PendingInvite = {
  id: string
  invited_email: string | null
  status: string
  created_at: string
  expires_at: string
}

// ---------------------------------------------------------------------------
// usePendingInvites — list pending invites for the household
// ---------------------------------------------------------------------------

export function usePendingInvites(householdId: string | null | undefined) {
  return useQuery({
    queryKey: inviteKeys.pending(householdId ?? null),
    queryFn: async (): Promise<PendingInvite[]> => {
      const { data, error } = await supabase
        .from('household_invites')
        .select('id, invited_email, status, created_at, expires_at')
        .eq('household_id', householdId!)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data ?? []
    },
    enabled: !!householdId,
  })
}

// ---------------------------------------------------------------------------
// useGenerateInviteLink — create a single-use invite link
// ---------------------------------------------------------------------------

export function useGenerateInviteLink() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ householdId }: { householdId: string }) => {
      const { data, error } = await supabase.functions.invoke('send-invite', {
        body: { household_id: householdId },
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)

      return data as {
        success: boolean
        invite_id: string
        invite_url: string
        action: 'invited'
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: inviteKeys.pending(variables.householdId),
      })
    },
  })
}
