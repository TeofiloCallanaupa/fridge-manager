/**
 * Hooks for household invite management (web).
 *
 * - useSendInvite()     — mutation to invite a member via the send-invite Edge Function
 * - useResendInvite()   — mutation to resend a pending invite
 * - usePendingInvites() — query to list pending invites for the household
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

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
// usePendingInvites
// ---------------------------------------------------------------------------

export function usePendingInvites(householdId: string | null | undefined) {
  const supabase = createClient()

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
// useSendInvite
// ---------------------------------------------------------------------------

export function useSendInvite() {
  const supabase = createClient()
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

      return data as {
        success: boolean
        invite_id?: string
        invite_url?: string
        action: 'invited' | 'resent' | 'added_directly'
        message?: string
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: inviteKeys.pending(variables.householdId),
      })
      queryClient.invalidateQueries({
        queryKey: ['household-members'],
      })
    },
  })
}

// ---------------------------------------------------------------------------
// useResendInvite
// ---------------------------------------------------------------------------

export function useResendInvite() {
  const supabase = createClient()
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
