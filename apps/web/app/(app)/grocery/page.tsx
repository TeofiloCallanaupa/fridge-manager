import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { GroceryList } from '@/components/grocery/grocery-list'

export const metadata = {
  title: 'Grocery List — Fridge Manager',
  description: 'Your shared household grocery list, grouped by category with real-time sync.',
}

/**
 * Grocery list page — server component shell.
 * Verifies auth + fetches household context, then renders client component.
 */
export default async function GroceryPage() {
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
    // User hasn't joined a household yet — redirect to onboarding
    redirect('/onboarding/household')
  }

  return (
    <GroceryList
      householdId={membership.household_id}
      userId={user.id}
    />
  )
}
