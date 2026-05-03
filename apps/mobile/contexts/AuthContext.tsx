import React, { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../lib/supabase'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Profile = {
  display_name: string | null
  avatar_config: any | null
}

type AuthContextType = {
  session: Session | null
  user: User | null
  profile: Profile | null
  hasHousehold: boolean
  householdId: string | null
  isLoading: boolean
  refreshSession: () => Promise<void>
}

type CachedAuthState = {
  profile: Profile | null
  hasHousehold: boolean
  householdId: string | null
  userId: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AUTH_CACHE_KEY = '@fridge-manager/auth-cache'
const NETWORK_TIMEOUT_MS = 5000

// ---------------------------------------------------------------------------
// Cache helpers
// ---------------------------------------------------------------------------

async function loadCachedAuth(userId: string): Promise<CachedAuthState | null> {
  try {
    const raw = await AsyncStorage.getItem(AUTH_CACHE_KEY)
    if (!raw) return null
    const cached: CachedAuthState = JSON.parse(raw)
    // Only use cache if it belongs to the same user
    if (cached.userId !== userId) return null
    return cached
  } catch {
    return null
  }
}

async function persistAuthCache(state: CachedAuthState): Promise<void> {
  try {
    await AsyncStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(state))
  } catch (e) {
    console.error('[AuthCache] Failed to persist:', e)
  }
}

async function clearAuthCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(AUTH_CACHE_KEY)
  } catch (e) {
    console.error('[AuthCache] Failed to clear:', e)
  }
}

// ---------------------------------------------------------------------------
// Timeout helper — races a promise against a deadline
// ---------------------------------------------------------------------------

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timed out after ${ms}ms`))
    }, ms)

    promise.then(
      (val) => {
        clearTimeout(timer)
        resolve(val)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      }
    )
  })
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  hasHousehold: false,
  householdId: null,
  isLoading: true,
  refreshSession: async () => {},
})

export const useAuth = () => useContext(AuthContext)

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [hasHousehold, setHasHousehold] = useState(false)
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // -----------------------------------------------------------------------
  // Fetch profile + household from network (with timeout)
  // -----------------------------------------------------------------------

  const fetchProfileAndHousehold = async (
    userId: string
  ): Promise<{ profile: Profile | null; hasHousehold: boolean; householdId: string | null }> => {
    const [
      { data: profileData },
      { data: householdData }
    ] = await withTimeout(
      Promise.all([
        supabase.from('profiles').select('display_name, avatar_config').eq('id', userId).single(),
        supabase.from('household_members').select('household_id').eq('user_id', userId).limit(1),
      ]),
      NETWORK_TIMEOUT_MS
    )

    const hh = !!(householdData && (householdData as any[]).length > 0)
    const hhId = hh ? (householdData as any[])[0].household_id : null

    return { profile: profileData, hasHousehold: hh, householdId: hhId }
  }

  // -----------------------------------------------------------------------
  // Apply profile + household state and persist to cache
  // -----------------------------------------------------------------------

  const applyAndCache = (
    userId: string,
    p: Profile | null,
    hh: boolean,
    hhId: string | null
  ) => {
    setProfile(p)
    setHasHousehold(hh)
    setHouseholdId(hhId)
    persistAuthCache({ profile: p, hasHousehold: hh, householdId: hhId, userId })
  }

  // -----------------------------------------------------------------------
  // Clear all auth state (logout)
  // -----------------------------------------------------------------------

  const clearAuthState = () => {
    setProfile(null)
    setHasHousehold(false)
    setHouseholdId(null)
    clearAuthCache()
  }

  // -----------------------------------------------------------------------
  // Startup: hydrate from cache, then background-refresh from network
  // -----------------------------------------------------------------------

  const refreshSession = async () => {
    setIsLoading(true)

    const { data: { session: newSession } } = await supabase.auth.getSession()
    setSession(newSession)
    setUser(newSession?.user ?? null)

    if (newSession?.user) {
      const userId = newSession.user.id

      // 1) Hydrate from cache immediately (non-blocking)
      const cached = await loadCachedAuth(userId)
      if (cached) {
        setProfile(cached.profile)
        setHasHousehold(cached.hasHousehold)
        setHouseholdId(cached.householdId)
      }

      // Mark loading complete after cache hydration (user can see the app)
      setIsLoading(false)

      // 2) Background refresh from network
      try {
        const fresh = await fetchProfileAndHousehold(userId)
        applyAndCache(userId, fresh.profile, fresh.hasHousehold, fresh.householdId)
      } catch (e) {
        // Network failed or timed out — cached data stays in place
        console.warn('[Auth] Background refresh failed, using cached data:', e)
      }
    } else {
      clearAuthState()
      setIsLoading(false)
    }
  }

  // -----------------------------------------------------------------------
  // Mount: run initial refresh and subscribe to auth changes
  // -----------------------------------------------------------------------

  useEffect(() => {
    refreshSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession)
        setUser(newSession?.user ?? null)

        if (newSession?.user) {
          const userId = newSession.user.id

          try {
            const fresh = await fetchProfileAndHousehold(userId)
            applyAndCache(userId, fresh.profile, fresh.hasHousehold, fresh.householdId)
          } catch (e) {
            // On auth change, try cache if network fails
            const cached = await loadCachedAuth(userId)
            if (cached) {
              setProfile(cached.profile)
              setHasHousehold(cached.hasHousehold)
              setHouseholdId(cached.householdId)
            }
            console.warn('[Auth] Network fetch on auth change failed:', e)
          }
        } else {
          clearAuthState()
        }
        setIsLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ session, user, profile, hasHousehold, householdId, isLoading, refreshSession }}>
      {children}
    </AuthContext.Provider>
  )
}
