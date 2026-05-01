import React, { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type Profile = {
  display_name: string | null
  avatar_config: any | null
}

type AuthContextType = {
  session: Session | null
  user: User | null
  profile: Profile | null
  hasHousehold: boolean
  isLoading: boolean
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  hasHousehold: false,
  isLoading: true,
  refreshSession: async () => {},
})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [hasHousehold, setHasHousehold] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const fetchProfileAndHousehold = async (userId: string) => {
    try {
      const [
        { data: profileData },
        { data: householdData }
      ] = await Promise.all([
        supabase.from('profiles').select('display_name, avatar_config').eq('id', userId).single(),
        supabase.from('household_members').select('household_id').eq('user_id', userId).limit(1)
      ])

      setProfile(profileData)
      setHasHousehold(householdData && householdData.length > 0)
    } catch (e) {
      console.error('Error fetching user data:', e)
    }
  }

  const refreshSession = async () => {
    setIsLoading(true)
    const { data: { session: newSession } } = await supabase.auth.getSession()
    setSession(newSession)
    setUser(newSession?.user ?? null)
    
    if (newSession?.user) {
      await fetchProfileAndHousehold(newSession.user.id)
    } else {
      setProfile(null)
      setHasHousehold(false)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    refreshSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession)
        setUser(newSession?.user ?? null)
        
        if (newSession?.user) {
          await fetchProfileAndHousehold(newSession.user.id)
        } else {
          setProfile(null)
          setHasHousehold(false)
        }
        setIsLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ session, user, profile, hasHousehold, isLoading, refreshSession }}>
      {children}
    </AuthContext.Provider>
  )
}
