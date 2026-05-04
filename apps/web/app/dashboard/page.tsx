import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

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
    <div className="min-h-screen bg-neutral-900 flex flex-col">
      <header className="px-6 py-4 border-b border-white/10 flex justify-between items-center">
        <h1 className="text-xl font-medium text-white">Fridge Manager</h1>
        <form action="/auth/signout" method="post">
          <button 
            type="submit" 
            className="text-white/60 hover:text-white transition-colors flex items-center gap-2"
          >
            <span className="text-sm">Sign Out</span>
          </button>
        </form>
      </header>
      
      <main className="flex-1 p-6 max-w-5xl mx-auto w-full flex flex-col gap-8 mt-12">
        <div>
          <h2 className="text-3xl font-light text-white tracking-tight">
            Welcome back, {profile?.display_name || 'Chef'}
          </h2>
          <p className="text-white/60 mt-2">
            Your dashboard is ready.
          </p>
        </div>

        <nav className="grid grid-cols-1 sm:grid-cols-3 gap-4" data-testid="dashboard-nav">
          <a
            href="/grocery"
            className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-colors group"
            data-testid="nav-grocery"
          >
            <span className="text-2xl">🛒</span>
            <h3 className="text-white font-medium mt-2">Grocery List</h3>
            <p className="text-white/50 text-sm mt-1">Manage your shopping</p>
          </a>
          <a
            href="/inventory"
            className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-colors group"
            data-testid="nav-inventory"
          >
            <span className="text-2xl">🧊</span>
            <h3 className="text-white font-medium mt-2">Inventory</h3>
            <p className="text-white/50 text-sm mt-1">Track your food</p>
          </a>
          <a
            href="/analytics"
            className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-colors group"
            data-testid="nav-analytics"
          >
            <span className="text-2xl">📊</span>
            <h3 className="text-white font-medium mt-2">Analytics</h3>
            <p className="text-white/50 text-sm mt-1">Food waste insights</p>
          </a>
        </nav>
      </main>
    </div>
  )
}
