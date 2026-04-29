import type { AuthError } from '@supabase/supabase-js'

/**
 * Map raw Supabase Auth error messages to user-friendly messages.
 *
 * Supabase returns technical strings like "email rate limit exceeded"
 * which are confusing for end users. This function translates known
 * error patterns into helpful, actionable messages.
 *
 * Unknown errors are returned with a generic fallback — we never
 * expose raw error internals to the user.
 */
export function friendlyAuthError(error: AuthError): string {
  const msg = error.message.toLowerCase()

  // Rate limiting
  if (msg.includes('rate limit')) {
    return 'Too many attempts. Please wait a few minutes and try again.'
  }

  // Invalid credentials
  if (msg.includes('invalid login credentials')) {
    return 'Incorrect email or password.'
  }

  // User not found (magic link to non-existent account)
  if (msg.includes('user not found') || msg.includes('no user found')) {
    return 'No account found with that email. Please sign up first.'
  }

  // Email not confirmed
  if (msg.includes('email not confirmed')) {
    return 'Please check your email and confirm your account before logging in.'
  }

  // Signup — user already exists
  if (
    msg.includes('user already registered') ||
    msg.includes('already been registered')
  ) {
    return 'An account with this email already exists. Try logging in instead.'
  }

  // Weak password
  if (msg.includes('password')) {
    return 'Password must be at least 6 characters.'
  }

  // Invalid email
  if (msg.includes('valid email') || msg.includes('invalid email')) {
    return 'Please enter a valid email address.'
  }

  // Database error (e.g. trigger failure)
  if (msg.includes('database error')) {
    return 'Something went wrong creating your account. Please try again.'
  }

  // Generic fallback — never expose raw error text
  return 'Something went wrong. Please try again.'
}
