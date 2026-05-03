import React from 'react'
import { render, screen, act, waitFor } from '@testing-library/react-native'
import { Text } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { AuthProvider, useAuth } from '../../contexts/AuthContext'

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const CACHE_KEY = '@fridge-manager/auth-cache'

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01',
}

const mockSession = {
  access_token: 'mock-token',
  refresh_token: 'mock-refresh',
  expires_in: 3600,
  token_type: 'bearer',
  user: mockUser,
}

const mockProfile = {
  display_name: 'Test User',
  avatar_config: { color: '#ff0000' },
}

const mockHouseholdData = [{ household_id: 'household-456' }]

const cachedAuthState = {
  profile: mockProfile,
  hasHousehold: true,
  householdId: 'household-456',
  userId: 'user-123',
}

// A test component that renders auth state for assertions
function AuthStateDisplay() {
  const { user, profile, hasHousehold, householdId, isLoading } = useAuth()
  return (
    <>
      <Text testID="loading">{String(isLoading)}</Text>
      <Text testID="user">{user?.id ?? 'null'}</Text>
      <Text testID="profile">{profile?.display_name ?? 'null'}</Text>
      <Text testID="hasHousehold">{String(hasHousehold)}</Text>
      <Text testID="householdId">{householdId ?? 'null'}</Text>
    </>
  )
}

// ---------------------------------------------------------------------------
// Supabase mock control
// ---------------------------------------------------------------------------

let mockGetSession: jest.Mock
let mockOnAuthStateChange: jest.Mock
let mockProfileQuery: jest.Mock
let mockHouseholdQuery: jest.Mock
let authChangeCallback: ((event: string, session: any) => void) | null = null

jest.mock('@/lib/supabase', () => {
  mockGetSession = jest.fn()
  mockOnAuthStateChange = jest.fn()
  mockProfileQuery = jest.fn()
  mockHouseholdQuery = jest.fn()

  return {
    supabase: {
      auth: {
        getSession: mockGetSession,
        onAuthStateChange: mockOnAuthStateChange,
        signInWithPassword: jest.fn(),
        signUp: jest.fn(),
        getUser: jest.fn(),
      },
      from: jest.fn((table: string) => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() =>
              table === 'profiles'
                ? mockProfileQuery()
                : mockHouseholdQuery()
            ),
            limit: jest.fn(() =>
              table === 'household_members'
                ? mockHouseholdQuery()
                : mockProfileQuery()
            ),
          })),
        })),
      })),
    },
  }
})

// ---------------------------------------------------------------------------
// Setup & teardown
// ---------------------------------------------------------------------------

beforeEach(async () => {
  await AsyncStorage.clear()
  authChangeCallback = null

  // Default: no session (logged out)
  mockGetSession.mockResolvedValue({
    data: { session: null },
  })

  // Capture the auth state change callback
  mockOnAuthStateChange.mockImplementation((cb: any) => {
    authChangeCallback = cb
    return { data: { subscription: { unsubscribe: jest.fn() } } }
  })

  // Default: network calls succeed with empty data
  mockProfileQuery.mockResolvedValue({ data: null, error: null })
  mockHouseholdQuery.mockResolvedValue({ data: [], error: null })
})

afterEach(() => {
  jest.restoreAllMocks()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Offline Auth Resilience', () => {
  describe('Cache hydration on startup', () => {
    it('hydrates profile from AsyncStorage cache and sets isLoading=false without network', async () => {
      // Pre-populate the cache as if user was previously logged in
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cachedAuthState))

      // Simulate: getSession returns a session (from local storage)
      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
      })

      // Simulate: network calls hang forever (offline)
      mockProfileQuery.mockReturnValue(new Promise(() => {})) // never resolves
      mockHouseholdQuery.mockReturnValue(new Promise(() => {}))

      render(
        <AuthProvider>
          <AuthStateDisplay />
        </AuthProvider>
      )

      // Should have hydrated from cache — isLoading should be false
      await waitFor(() => {
        expect(screen.getByTestId('loading').props.children).toBe('false')
      })

      // Profile should come from cache
      expect(screen.getByTestId('profile').props.children).toBe('Test User')
      expect(screen.getByTestId('hasHousehold').props.children).toBe('true')
      expect(screen.getByTestId('householdId').props.children).toBe('household-456')
    })

    it('shows login screen (no profile) when no cache and no session', async () => {
      // No cache, no session
      mockGetSession.mockResolvedValue({
        data: { session: null },
      })

      render(
        <AuthProvider>
          <AuthStateDisplay />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading').props.children).toBe('false')
      })

      expect(screen.getByTestId('user').props.children).toBe('null')
      expect(screen.getByTestId('profile').props.children).toBe('null')
    })
  })

  describe('Background network refresh', () => {
    it('updates profile from network after cache hydration', async () => {
      // Cache has old profile
      const oldCache = {
        ...cachedAuthState,
        profile: { display_name: 'Old Name', avatar_config: null },
      }
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(oldCache))

      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
      })

      // Network returns updated profile
      mockProfileQuery.mockResolvedValue({
        data: { display_name: 'Updated Name', avatar_config: { color: '#00ff00' } },
        error: null,
      })
      mockHouseholdQuery.mockResolvedValue({
        data: [{ household_id: 'household-789' }],
        error: null,
      })

      render(
        <AuthProvider>
          <AuthStateDisplay />
        </AuthProvider>
      )

      // Wait for background refresh to complete
      await waitFor(() => {
        expect(screen.getByTestId('profile').props.children).toBe('Updated Name')
      })

      // Cache should be updated with new data
      const updatedCache = JSON.parse(
        (await AsyncStorage.getItem(CACHE_KEY)) ?? '{}'
      )
      expect(updatedCache.profile.display_name).toBe('Updated Name')
      expect(updatedCache.householdId).toBe('household-789')
    })
  })

  describe('Network failure handling', () => {
    it('falls back to cached data when network calls throw', async () => {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cachedAuthState))

      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
      })

      // Network calls throw (offline)
      mockProfileQuery.mockRejectedValue(new Error('Network request failed'))
      mockHouseholdQuery.mockRejectedValue(new Error('Network request failed'))

      render(
        <AuthProvider>
          <AuthStateDisplay />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading').props.children).toBe('false')
      })

      // Should still show cached data
      expect(screen.getByTestId('profile').props.children).toBe('Test User')
      expect(screen.getByTestId('hasHousehold').props.children).toBe('true')
    })

    it('times out network calls after timeout period instead of hanging', async () => {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cachedAuthState))

      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
      })

      // Network calls hang forever
      mockProfileQuery.mockReturnValue(new Promise(() => {}))
      mockHouseholdQuery.mockReturnValue(new Promise(() => {}))

      render(
        <AuthProvider>
          <AuthStateDisplay />
        </AuthProvider>
      )

      // Should immediately have cached data (not hanging)
      await waitFor(() => {
        expect(screen.getByTestId('loading').props.children).toBe('false')
      })

      expect(screen.getByTestId('profile').props.children).toBe('Test User')
    })
  })

  describe('Cache lifecycle', () => {
    it('clears cached profile when user logs out', async () => {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cachedAuthState))

      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
      })
      mockProfileQuery.mockResolvedValue({ data: mockProfile, error: null })
      mockHouseholdQuery.mockResolvedValue({ data: mockHouseholdData, error: null })

      render(
        <AuthProvider>
          <AuthStateDisplay />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading').props.children).toBe('false')
      })

      // Simulate logout via auth state change
      await act(async () => {
        authChangeCallback?.('SIGNED_OUT', null)
      })

      await waitFor(() => {
        expect(screen.getByTestId('user').props.children).toBe('null')
        expect(screen.getByTestId('profile').props.children).toBe('null')
      })

      // Cache should be cleared
      const cache = await AsyncStorage.getItem(CACHE_KEY)
      expect(cache).toBeNull()
    })

    it('persists auth state to cache after successful network fetch', async () => {
      // No cache initially
      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
      })

      mockProfileQuery.mockResolvedValue({ data: mockProfile, error: null })
      mockHouseholdQuery.mockResolvedValue({ data: mockHouseholdData, error: null })

      render(
        <AuthProvider>
          <AuthStateDisplay />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('profile').props.children).toBe('Test User')
      })

      // Verify cache was written
      const cache = JSON.parse(
        (await AsyncStorage.getItem(CACHE_KEY)) ?? '{}'
      )
      expect(cache.profile.display_name).toBe('Test User')
      expect(cache.hasHousehold).toBe(true)
      expect(cache.householdId).toBe('household-456')
      expect(cache.userId).toBe('user-123')
    })
  })
})
