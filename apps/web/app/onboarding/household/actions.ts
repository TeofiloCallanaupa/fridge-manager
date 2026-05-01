'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createHousehold(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const name = formData.get('name') as string
  const timezone = formData.get('timezone') as string

  if (!name || name.trim() === '') {
    redirect('/onboarding/household?error=Household name is required')
  }

  // 1. Create the household
  const { data: household, error: householdError } = await supabase
    .from('households')
    .insert({
      name: name.trim(),
      timezone: timezone || 'America/New_York',
      created_by: user.id,
    })
    .select('id')
    .single()

  if (householdError || !household) {
    redirect(`/onboarding/household?error=${encodeURIComponent(householdError?.message || 'Failed to create household')}`)
  }

  // 2. Add the user as an owner
  const { error: memberError } = await supabase
    .from('household_members')
    .insert({
      household_id: household.id,
      user_id: user.id,
      role: 'owner',
    })

  if (memberError) {
    redirect(`/onboarding/household?error=${encodeURIComponent(memberError.message)}`)
  }

  // Fully onboarded! Redirect to home page.
  redirect('/dashboard')
}
