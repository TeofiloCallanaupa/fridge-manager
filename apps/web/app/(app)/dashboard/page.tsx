import React from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ShoppingCart, Package, BarChart3, LogOut } from 'lucide-react'

export const metadata = {
  title: 'Dashboard — Fridge Manager',
  description: 'Your household dashboard with quick access to grocery, inventory, and analytics.',
}

export default async function DashboardPage() {
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
      <header className="px-6 py-5 border-b border-outline-variant/30 flex justify-between items-center max-w-4xl mx-auto">
        <h1 className="text-lg font-bold text-primary tracking-tight">
          Fridge Manager
        </h1>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="text-on-surface-variant hover:text-on-surface transition-colors flex items-center gap-2 text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </form>
      </header>

      {/* Welcome */}
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-on-surface tracking-tight">
            Welcome back, {profile?.display_name || 'Chef'} 👋
          </h2>
          <p className="text-on-surface-variant mt-1 text-sm">
            What would you like to do today?
          </p>
        </div>

        {/* Quick access cards */}
        <nav className="grid grid-cols-1 sm:grid-cols-3 gap-4" data-testid="dashboard-nav">
          <Link
            href="/grocery"
            className="bg-surface-container border border-outline-variant/30 rounded-2xl p-5 hover:bg-surface-container-high transition-colors group"
            data-testid="nav-grocery"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <ShoppingCart className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-on-surface font-semibold">Grocery List</h3>
            <p className="text-on-surface-variant text-sm mt-1">Manage your shopping</p>
          </Link>
          <Link
            href="/inventory"
            className="bg-surface-container border border-outline-variant/30 rounded-2xl p-5 hover:bg-surface-container-high transition-colors group"
            data-testid="nav-inventory"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-on-surface font-semibold">Inventory</h3>
            <p className="text-on-surface-variant text-sm mt-1">Track your food</p>
          </Link>
          <Link
            href="/analytics"
            className="bg-surface-container border border-outline-variant/30 rounded-2xl p-5 hover:bg-surface-container-high transition-colors group"
            data-testid="nav-analytics"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-on-surface font-semibold">Analytics</h3>
            <p className="text-on-surface-variant text-sm mt-1">Food waste insights</p>
          </Link>
        </nav>
      </main>
    </div>
  )
}
