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
      </main>
    </div>
  )
}
