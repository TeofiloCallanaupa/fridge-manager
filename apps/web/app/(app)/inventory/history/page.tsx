import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RemovalHistoryPage } from '@/components/inventory/removal-history-page'

export const metadata = {
  title: 'Removal History — Fridge Manager',
  description: 'View your household food removal history by month — track consumed, wasted, and expired items.',
}

/**
 * Removal History page — server component shell.
 * Verifies auth + fetches household context, then renders client component.
 */
export default async function HistoryPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Prefetch household membership (server-side for fast hydration)
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
    <RemovalHistoryPage householdId={membership.household_id} />
  )
}
