/**
 * TDD Red Phase — Tests for useNotificationPreferences hook
 *
 * Verifies the data layer for notification preferences:
 * - Fetching preferences from Supabase
 * - Defaulting when no preferences exist
 * - Updating individual preference fields
 * - Sending test notifications via Edge Function
 */
import { renderHook, waitFor, act } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { supabase } from '../../lib/supabase'

// Mock the hook module — will be imported after mock setup
jest.mock('../../lib/supabase', () => {
  return {
    supabase: {
      from: jest.fn(),
      functions: {
        invoke: jest.fn(),
      },
    },
  }
})

// Import hook after mocks are set up
import {
  useNotificationPreferences,
  useUpdateNotificationPreference,
  useSendTestNotification,
} from '../../hooks/use-notification-preferences'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

const mockPreferences = {
  id: 'pref-1',
  user_id: 'user-1',
  household_id: 'hh-1',
  halfway_enabled: true,
  two_day_enabled: true,
  one_day_enabled: true,
  day_of_enabled: true,
  post_expiration_enabled: true,
  quiet_hours_start: null,
  quiet_hours_end: null,
  created_at: '2026-05-01T00:00:00Z',
  updated_at: '2026-05-01T00:00:00Z',
}

// ---------------------------------------------------------------------------
// useNotificationPreferences — fetch hook
// ---------------------------------------------------------------------------

describe('useNotificationPreferences', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('fetches notification preferences from Supabase', async () => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: mockPreferences,
        error: null,
      }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const { result } = renderHook(
      () => useNotificationPreferences('user-1', 'hh-1'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(supabase.from).toHaveBeenCalledWith('notification_preferences')
    expect(result.current.data).toEqual(mockPreferences)
  })

  it('returns null when no preferences exist (PGRST116)', async () => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'no rows returned' },
      }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const { result } = renderHook(
      () => useNotificationPreferences('user-1', 'hh-1'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
  })

  it('does not fetch when userId is undefined', () => {
    const { result } = renderHook(
      () => useNotificationPreferences(undefined, 'hh-1'),
      { wrapper: createWrapper() }
    )

    expect(result.current.isFetching).toBe(false)
  })

  it('does not fetch when householdId is undefined', () => {
    const { result } = renderHook(
      () => useNotificationPreferences('user-1', undefined),
      { wrapper: createWrapper() }
    )

    expect(result.current.isFetching).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// useUpdateNotificationPreference — mutation hook
// ---------------------------------------------------------------------------

describe('useUpdateNotificationPreference', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('upserts a boolean toggle field', async () => {
    const mockChain = {
      upsert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { ...mockPreferences, halfway_enabled: false },
        error: null,
      }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const { result } = renderHook(() => useUpdateNotificationPreference(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      result.current.mutate({
        userId: 'user-1',
        householdId: 'hh-1',
        field: 'halfway_enabled',
        value: false,
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(supabase.from).toHaveBeenCalledWith('notification_preferences')
    expect(mockChain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        household_id: 'hh-1',
        halfway_enabled: false,
      }),
      expect.objectContaining({
        onConflict: 'user_id,household_id',
      })
    )
  })

  it('upserts quiet hours start time', async () => {
    const mockChain = {
      upsert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { ...mockPreferences, quiet_hours_start: '22:00' },
        error: null,
      }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const { result } = renderHook(() => useUpdateNotificationPreference(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      result.current.mutate({
        userId: 'user-1',
        householdId: 'hh-1',
        field: 'quiet_hours_start',
        value: '22:00',
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockChain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        quiet_hours_start: '22:00',
      }),
      expect.anything()
    )
  })

  it('handles Supabase errors gracefully', async () => {
    const mockChain = {
      upsert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'RLS violation' },
      }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const { result } = renderHook(() => useUpdateNotificationPreference(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      result.current.mutate({
        userId: 'user-1',
        householdId: 'hh-1',
        field: 'day_of_enabled',
        value: false,
      })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

// ---------------------------------------------------------------------------
// useSendTestNotification — Edge Function call
// ---------------------------------------------------------------------------

describe('useSendTestNotification', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('calls the send-test-notification Edge Function', async () => {
    ;(supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: { success: true, devices_found: 1, sent: 1, failed: 0 },
      error: null,
    })

    const { result } = renderHook(() => useSendTestNotification(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      result.current.mutate()
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      'send-test-notification',
      expect.objectContaining({
        body: expect.objectContaining({
          title: expect.any(String),
          body: expect.any(String),
        }),
      })
    )
  })

  it('reports error when Edge Function fails', async () => {
    ;(supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'Function not found' },
    })

    const { result } = renderHook(() => useSendTestNotification(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      result.current.mutate()
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
