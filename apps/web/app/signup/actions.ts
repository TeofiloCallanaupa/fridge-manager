'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { friendlyAuthError } from '@/lib/supabase/errors'

/**
 * Create a new account with email and password.
 */
export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const next = formData.get('next') as string

  let emailRedirectTo = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`
  if (next) {
    emailRedirectTo += `?next=${encodeURIComponent(next)}`
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
    },
  })

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(friendlyAuthError(error))}`)
  }

  revalidatePath('/', 'layout')
  
  if (data?.session) {
    // If auto-confirm is on, we're already logged in
    redirect(next || '/dashboard')
  } else {
    redirect('/signup?message=Check your email to confirm your account')
  }
}
