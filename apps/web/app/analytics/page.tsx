import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AnalyticsDashboard } from '@/components/analytics/analytics-dashboard'

export const metadata = {
  title: 'Analytics — Fridge Manager',
  description: 'View your food waste insights, consumption trends, and shopping patterns.',
}

/**
 * Analytics page — server component shell.
 * Verifies auth + fetches household context, then renders client component.
 */
export default async function AnalyticsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!membership) {
    redirect('/onboarding/household')
  }

  return (
    <AnalyticsDashboard
      householdId={membership.household_id}
      userId={user.id}
    />
  )
}
