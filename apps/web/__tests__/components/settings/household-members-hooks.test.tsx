import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// ---------------------------------------------------------------------------
// Mocks via vi.hoisted
// ---------------------------------------------------------------------------

const { mockFrom } = vi.hoisted(() => {
  return { mockFrom: vi.fn() }
})

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ from: mockFrom }),
}))

// Import AFTER mocks
import { useHouseholdMembers } from '../../../hooks/use-household-members'

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
// Tests
// ---------------------------------------------------------------------------

describe('useHouseholdMembers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns member list with profiles joined', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [
            {
              user_id: 'user-1',
              role: 'owner',
              profiles: {
                display_name: 'Teo',
                avatar_config: { skinColor: 'f9c9b6' },
              },
            },
            {
              user_id: 'user-2',
              role: 'member',
              profiles: {
                display_name: 'Emilia',
                avatar_config: null,
              },
            },
          ],
          error: null,
        }),
      }),
    })

    const { result } = renderHook(
      () => useHouseholdMembers('hh-1'),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveLength(2)
    expect(result.current.data![0]).toEqual({
      userId: 'user-1',
      displayName: 'Teo',
      avatarConfig: { skinColor: 'f9c9b6' },
      role: 'owner',
    })
    expect(result.current.data![1]).toEqual({
      userId: 'user-2',
      displayName: 'Emilia',
      avatarConfig: null,
      role: 'member',
    })
  })

  it('handles empty household', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    })

    const { result } = renderHook(
      () => useHouseholdMembers('hh-empty'),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })

  it('is disabled when householdId is undefined', () => {
    const { result } = renderHook(
      () => useHouseholdMembers(undefined),
      { wrapper: createWrapper() },
    )

    expect(result.current.fetchStatus).toBe('idle')
  })

  it('handles missing profile data gracefully', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [
            {
              user_id: 'user-3',
              role: 'member',
              profiles: null,
            },
          ],
          error: null,
        }),
      }),
    })

    const { result } = renderHook(
      () => useHouseholdMembers('hh-1'),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data![0].displayName).toBe('Unknown')
    expect(result.current.data![0].avatarConfig).toBeNull()
  })
})
