import React, { useEffect } from 'react'
import { Slot, useRouter, useSegments } from 'expo-router'
import { PaperProvider, MD3LightTheme } from 'react-native-paper'
import { AuthProvider, useAuth } from '../contexts/AuthContext'
import { View, ActivityIndicator } from 'react-native'

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#206140', // Matches --color-primary from web
    secondary: '#4c6356', // Matches --color-secondary
    tertiary: '#3f6374', // Matches --color-tertiary
  },
}

function useProtectedRoute() {
  const { user, profile, hasHousehold, isLoading } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return

    const inAuthGroup = segments[0] === '(auth)'
    const inOnboardingGroup = segments[0] === 'onboarding'
    
    // To prevent infinite loops during rendering, we check if we're already on the correct path
    // For expo-router, segments is an array like ['onboarding', 'profile']
    
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
          // Empty segments array sometimes means we're at the root, which in our case is /(app)
          // But actually we want to explicitly route to the app group
          if (segments[0] !== '(app)') {
            router.replace('/(app)')
          }
        }
      }
    }
  }, [user, profile, hasHousehold, isLoading, segments])
}

function RootLayoutNav() {
  const { isLoading } = useAuth()
  useProtectedRoute()

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
    <PaperProvider theme={theme}>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </PaperProvider>
  )
}
