/**
 * Notification preferences hooks.
 *
 * - useNotificationPreferences — fetch the user's notification preferences
 * - useUpdateNotificationPreference — upsert a single preference field
 * - useSendTestNotification — fire a test push via Edge Function
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { NotificationPreferences } from '@fridge-manager/shared'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Fields that can be updated on the notification_preferences table. */
export type PreferenceField = keyof Pick<
  NotificationPreferences,
  | 'halfway_enabled'
  | 'two_day_enabled'
  | 'one_day_enabled'
  | 'day_of_enabled'
  | 'post_expiration_enabled'
  | 'quiet_hours_start'
  | 'quiet_hours_end'
>

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const PREFS_KEY = 'notification-preferences'

// ---------------------------------------------------------------------------
// useNotificationPreferences — fetch
// ---------------------------------------------------------------------------

export function useNotificationPreferences(
  userId: string | undefined,
  householdId: string | undefined | null,
) {
  return useQuery({
    queryKey: [PREFS_KEY, userId, householdId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId!)
        .eq('household_id', householdId!)
        .single()

      // PGRST116 = "no rows returned" — not an error, just no prefs yet
      if (error && error.code === 'PGRST116') {
        return null
      }
      if (error) throw error
      return data as NotificationPreferences
    },
    enabled: !!userId && !!householdId,
  })
}

// ---------------------------------------------------------------------------
// useUpdateNotificationPreference — upsert
// ---------------------------------------------------------------------------

export function useUpdateNotificationPreference() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      userId,
      householdId,
      field,
      value,
    }: {
      userId: string
      householdId: string
      field: PreferenceField
      value: boolean | string | null
    }) => {
      const { data, error } = await supabase
        .from('notification_preferences')
        .upsert(
          {
            user_id: userId,
            household_id: householdId,
            [field]: value,
          },
          { onConflict: 'user_id,household_id' },
        )
        .select('*')
        .single()

      if (error) throw error
      return data as NotificationPreferences
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [PREFS_KEY, variables.userId, variables.householdId],
      })
    },
  })
}

// ---------------------------------------------------------------------------
// useSendTestNotification — Edge Function call
// ---------------------------------------------------------------------------

export function useSendTestNotification() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        'send-test-notification',
        {
          body: {
            title: '🧪 Test Notification',
            body: 'If you see this, push notifications are working! 🎉',
          },
        },
      )

      if (error) throw error
      return data as { success: boolean; devices_found: number; sent: number; failed: number }
    },
  })
}
