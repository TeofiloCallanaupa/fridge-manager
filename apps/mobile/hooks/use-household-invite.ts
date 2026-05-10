/**
 * Hooks for household invite management.
 *
 * - useSendInvite()    — mutation to invite a member via the send-invite Edge Function
 * - usePendingInvites() — query to list pending invites for the household
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
  invited_email: string
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
// useSendInvite — send an invitation via the Edge Function
// ---------------------------------------------------------------------------

export function useSendInvite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      email,
      householdId,
    }: {
      email: string
      householdId: string
    }) => {
      const { data, error } = await supabase.functions.invoke('send-invite', {
        body: { email, household_id: householdId },
      })

      if (error) throw error

      // The Edge Function returns { success, invite_id, action } or { error }
      if (data?.error) {
        throw new Error(data.error)
      }

      return data as { success: boolean; invite_id?: string; invite_url?: string; action: 'invited' | 'resent' | 'added_directly'; message?: string }
    },
    onSuccess: (_data, variables) => {
      // Invalidate pending invites so the list refreshes
      queryClient.invalidateQueries({
        queryKey: inviteKeys.pending(variables.householdId),
      })
      // If user was added directly, also refresh the members list
      queryClient.invalidateQueries({
        queryKey: ['household-members'],
      })
    },
  })
}

// ---------------------------------------------------------------------------
// useResendInvite — resend a pending invite
// ---------------------------------------------------------------------------

export function useResendInvite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      email,
      householdId,
    }: {
      email: string
      householdId: string
    }) => {
      const { data, error } = await supabase.functions.invoke('send-invite', {
        body: { email, household_id: householdId },
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)

      return data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: inviteKeys.pending(variables.householdId),
      })
    },
  })
}
