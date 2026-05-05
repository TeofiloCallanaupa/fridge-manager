'use server'

import { createClient } from '@/lib/supabase/server'
import type { AvatarConfig } from '@fridge-manager/shared'

/**
 * Update profile: display name and avatar config.
 * Unlike the onboarding version, this does NOT redirect — it returns a result.
 */
export async function updateProfile(displayName: string, avatarConfig: AvatarConfig) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Validate display name
  const trimmedName = displayName.trim()
  if (trimmedName.length < 2) {
    return { error: 'Display name must be at least 2 characters' }
  }
  if (trimmedName.length > 50) {
    return { error: 'Display name must be at most 50 characters' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: trimmedName,
      avatar_config: avatarConfig as any,
    })
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
