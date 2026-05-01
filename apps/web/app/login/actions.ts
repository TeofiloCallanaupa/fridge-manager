'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { friendlyAuthError } from '@/lib/supabase/errors'

/**
 * Sign in with email and password.
 */
export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const next = formData.get('next') as string

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    const errorUrl = `/login?error=${encodeURIComponent(friendlyAuthError(error))}${next ? `&next=${encodeURIComponent(next)}` : ''}`
    redirect(errorUrl)
  }

  revalidatePath('/', 'layout')
  redirect(next || '/dashboard')
}

/**
 * Send a magic link to the given email address.
 */
export async function loginWithMagicLink(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const next = formData.get('next') as string

  let emailRedirectTo = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`
  if (next) {
    emailRedirectTo += `?next=${encodeURIComponent(next)}`
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo,
    },
  })

  if (error) {
    const errorUrl = `/login?error=${encodeURIComponent(friendlyAuthError(error))}${next ? `&next=${encodeURIComponent(next)}` : ''}`
    redirect(errorUrl)
  }

  redirect(`/login?message=Check your email for a magic link${next ? `&next=${encodeURIComponent(next)}` : ''}`)
}
