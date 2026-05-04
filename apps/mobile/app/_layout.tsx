import React, { useEffect } from 'react'
import { Slot, useRouter, useSegments } from 'expo-router'
import { PaperProvider, MD3LightTheme } from 'react-native-paper'
import { AuthProvider, useAuth } from '../contexts/AuthContext'
import { View, ActivityIndicator, AppState, Platform } from 'react-native'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import AsyncStorage from '@react-native-async-storage/async-storage'
import NetInfo from '@react-native-community/netinfo'
import { onlineManager, focusManager } from '@tanstack/react-query'
import { queryClient } from '../lib/query-client'
import { usePushNotifications } from '../hooks/use-push-notifications'

// ---------------------------------------------------------------------------
// Offline detection — TanStack Query auto-pauses mutations when offline
// ---------------------------------------------------------------------------

onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected)
  })
})

// ---------------------------------------------------------------------------
// App focus detection — refetch on app foreground
// ---------------------------------------------------------------------------

function onAppStateChange(status: string) {
  if (Platform.OS !== 'web') {
    focusManager.setFocused(status === 'active')
  }
}

// ---------------------------------------------------------------------------
// AsyncStorage persister for query cache
// ---------------------------------------------------------------------------

const CACHE_KEY = '@fridge-manager/query-cache'
const CACHE_URL_KEY = '@fridge-manager/cache-supabase-url'

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: CACHE_KEY,
})

// Clear stale cache if the Supabase URL has changed (e.g. switching local ↔ remote)
const currentUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''
AsyncStorage.getItem(CACHE_URL_KEY).then((cachedUrl) => {
  if (cachedUrl && cachedUrl !== currentUrl) {
    console.log('[Cache] Supabase URL changed, clearing stale query cache')
    AsyncStorage.removeItem(CACHE_KEY)
    queryClient.clear()
  }
  AsyncStorage.setItem(CACHE_URL_KEY, currentUrl)
})

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#206140', // Matches --color-primary from web
    secondary: '#4c6356', // Matches --color-secondary
    tertiary: '#3f6374', // Matches --color-tertiary
  },
}

// ---------------------------------------------------------------------------
// Protected route logic
// ---------------------------------------------------------------------------

function useProtectedRoute() {
  const { user, profile, hasHousehold, isLoading } = useAuth()
  const segments = useSegments() as string[]
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return

    const inAuthGroup = segments[0] === '(auth)'
    const inOnboardingGroup = segments[0] === 'onboarding'
    
    if (!user) {
      if (!inAuthGroup) {
        router.replace('/(auth)/login')
      }
    } else {
      const hasDisplayName = !!profile?.display_name
      const hasAvatar = !!profile?.avatar_config

      if (!hasDisplayName) {
        if (segments[0] !== 'onboarding' || segments[1] !== 'profile') {
          router.replace('/onboarding/profile')
        }
      } else if (hasDisplayName && !hasAvatar) {
        if (segments[0] !== 'onboarding' || segments[1] !== 'avatar') {
          router.replace('/onboarding/avatar')
        }
      } else if (hasDisplayName && hasAvatar && !hasHousehold) {
        if (segments[0] !== 'onboarding' || segments[1] !== 'household') {
          router.replace('/onboarding/household')
        }
      } else if (hasDisplayName && hasAvatar && hasHousehold) {
        if (inAuthGroup || inOnboardingGroup || segments.length === 0) {
          if (segments[0] !== '(app)') {
            router.replace('/(app)/grocery')
          }
        }
      }
    }
  }, [user, profile, hasHousehold, isLoading, segments])
}

// ---------------------------------------------------------------------------
// Root layout
// ---------------------------------------------------------------------------

function RootLayoutNav() {
  const { isLoading } = useAuth()
  useProtectedRoute()
  usePushNotifications()

  // Subscribe to app state for focus management
  useEffect(() => {
    const subscription = AppState.addEventListener('change', onAppStateChange)
    return () => subscription.remove()
  }, [])

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    )
  }

  return <Slot />
}

export default function RootLayout() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: asyncStoragePersister,
        maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days — grocery list stays cached
      }}
    >
      <PaperProvider theme={theme}>
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </PaperProvider>
    </PersistQueryClientProvider>
  )
}
