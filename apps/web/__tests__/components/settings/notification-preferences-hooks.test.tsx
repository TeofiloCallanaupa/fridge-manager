import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// ---------------------------------------------------------------------------
// Mocks via vi.hoisted
// ---------------------------------------------------------------------------

const { mockFrom, mockFunctionsInvoke } = vi.hoisted(() => {
  return {
    mockFrom: vi.fn(),
    mockFunctionsInvoke: vi.fn(),
  }
})

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: mockFrom,
    functions: { invoke: mockFunctionsInvoke },
  }),
}))

// Import AFTER mocks
import {
  useNotificationPreferences,
  useUpdateNotificationPreference,
  useSendTestNotification,
} from '../../../hooks/use-notification-preferences'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

// ---------------------------------------------------------------------------
// Tests: useNotificationPreferences
// ---------------------------------------------------------------------------

describe('useNotificationPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches preferences for user/household pair', async () => {
    const mockPrefs = {
      halfway_enabled: true,
      two_day_enabled: true,
      one_day_enabled: false,
      day_of_enabled: true,
      post_expiration_enabled: true,
      quiet_hours_start: null,
      quiet_hours_end: null,
    }

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockPrefs, error: null }),
          }),
        }),
      }),
    })

    const { result } = renderHook(
      () => useNotificationPreferences('user-1', 'hh-1'),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockPrefs)
    expect(mockFrom).toHaveBeenCalledWith('notification_preferences')
  })

  it('returns null when no preferences exist (PGRST116)', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'no rows' },
            }),
          }),
        }),
      }),
    })

    const { result } = renderHook(
      () => useNotificationPreferences('user-1', 'hh-1'),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
  })

  it('is disabled when userId is undefined', () => {
    const { result } = renderHook(
      () => useNotificationPreferences(undefined, 'hh-1'),
      { wrapper: createWrapper() },
    )

    expect(result.current.fetchStatus).toBe('idle')
  })

  it('is disabled when householdId is undefined', () => {
    const { result } = renderHook(
      () => useNotificationPreferences('user-1', undefined),
      { wrapper: createWrapper() },
    )

    expect(result.current.fetchStatus).toBe('idle')
  })

  it('throws on non-PGRST116 errors', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: '42P01', message: 'relation does not exist' },
            }),
          }),
        }),
      }),
    })

    const { result } = renderHook(
      () => useNotificationPreferences('user-1', 'hh-1'),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

// ---------------------------------------------------------------------------
// Tests: useUpdateNotificationPreference
// ---------------------------------------------------------------------------

describe('useUpdateNotificationPreference', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('upserts a single preference field', async () => {
    const mockUpsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { halfway_enabled: false }, error: null }),
      }),
    })

    mockFrom.mockReturnValue({ upsert: mockUpsert })

    const { result } = renderHook(
      () => useUpdateNotificationPreference(),
      { wrapper: createWrapper() },
    )

    result.current.mutate({
      userId: 'user-1',
      householdId: 'hh-1',
      field: 'halfway_enabled',
      value: false,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        household_id: 'hh-1',
        halfway_enabled: false,
      }),
      { onConflict: 'user_id,household_id' },
    )
  })
})

// ---------------------------------------------------------------------------
// Tests: useSendTestNotification
// ---------------------------------------------------------------------------

describe('useSendTestNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('invokes the send-test-notification Edge Function', async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: { success: true, devices_found: 1, sent: 1, failed: 0 },
      error: null,
    })

    const { result } = renderHook(
      () => useSendTestNotification(),
      { wrapper: createWrapper() },
    )

    result.current.mutate()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFunctionsInvoke).toHaveBeenCalledWith(
      'send-test-notification',
      expect.objectContaining({
        body: expect.objectContaining({ title: expect.any(String) }),
      }),
    )
  })

  it('throws on Edge Function error', async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: null,
      error: { message: 'Function not found' },
    })

    const { result } = renderHook(
      () => useSendTestNotification(),
      { wrapper: createWrapper() },
    )

    result.current.mutate()

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
