import React from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LogOut, Bell, Users, ChevronRight } from 'lucide-react'

export const metadata = {
  title: 'Settings — Fridge Manager',
  description: 'Manage your profile, household, and notification preferences.',
}

export default async function SettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_config')
    .eq('id', user.id)
    .single()

  return (
    <div className="bg-surface text-on-surface min-h-screen">
      {/* Header */}
      <header className="px-6 py-5 border-b border-outline-variant/30 max-w-4xl mx-auto">
        <h1 className="text-lg font-bold text-primary tracking-tight">
          Settings
        </h1>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Profile Section */}
        <section className="space-y-1" data-testid="settings-profile">
          <h2 className="text-2xl font-bold text-on-surface tracking-tight">
            {profile?.display_name || 'Chef'}
          </h2>
          <p className="text-on-surface-variant text-sm">
            {user.email}
          </p>
        </section>

        {/* Menu */}
        <nav className="space-y-2" data-testid="settings-menu">
          <Link
            href="/settings/notifications"
            className="flex items-center gap-4 px-4 py-4 rounded-2xl bg-surface-container hover:bg-surface-container-high transition-colors group"
            data-testid="settings-notifications-row"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <span className="text-on-surface font-semibold block">Notification Preferences</span>
              <span className="text-on-surface-variant text-sm">Expiration alerts & quiet hours</span>
            </div>
            <ChevronRight className="w-5 h-5 text-on-surface-variant" />
          </Link>

          <Link
            href="/settings/household"
            className="flex items-center gap-4 px-4 py-4 rounded-2xl bg-surface-container hover:bg-surface-container-high transition-colors group"
            data-testid="settings-household-row"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <span className="text-on-surface font-semibold block">Household</span>
              <span className="text-on-surface-variant text-sm">Members & invitations</span>
            </div>
            <ChevronRight className="w-5 h-5 text-on-surface-variant" />
          </Link>
        </nav>

        {/* Sign Out */}
        <div className="pt-4">
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-full border border-outline-variant/50 text-on-surface-variant hover:text-on-surface hover:border-outline transition-colors text-sm font-medium cursor-pointer"
              data-testid="settings-signout"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
