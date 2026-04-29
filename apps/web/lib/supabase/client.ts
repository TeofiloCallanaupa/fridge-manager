import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@fridge-manager/shared'

/**
 * Create a Supabase client for use in Client Components (browser).
 *
 * Uses a singleton pattern under the hood — safe to call repeatedly.
 * The client reads auth tokens from cookies managed by the proxy.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
