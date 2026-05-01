import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { InventoryList } from '@/components/inventory/inventory-list'

export const metadata = {
  title: 'Inventory — Fridge Manager',
  description: 'View items in your fridge, freezer, and pantry with color-coded expiration tracking.',
}

/**
 * Inventory page — server component shell.
 * Verifies auth + fetches household context, then renders client component.
 */
export default async function InventoryPage() {
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
    <InventoryList
      householdId={membership.household_id}
      userId={user.id}
    />
  )
}
