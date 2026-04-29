'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { AvatarConfig } from '@fridge-manager/shared'

export async function updateAvatarConfig(config: AvatarConfig) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_config: config as any })
    .eq('id', user.id)

  if (error) {
    throw new Error(error.message)
  }

  redirect('/onboarding/household')
}
