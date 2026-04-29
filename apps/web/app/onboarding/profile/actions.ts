'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function updateDisplayName(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const displayName = formData.get('display_name') as string

  if (!displayName || displayName.trim() === '') {
    redirect('/onboarding/profile?error=Display name is required')
  }

  const { error } = await supabase
    .from('profiles')
    .update({ display_name: displayName.trim() })
    .eq('id', user.id)

  if (error) {
    redirect(`/onboarding/profile?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/onboarding/avatar')
}
