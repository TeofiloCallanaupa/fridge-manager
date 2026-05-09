/**
 * Tests for household invite hooks.
 *
 * Verifies:
 * - usePendingInvites: fetching pending invites for a household
 * - useSendInvite: sending an invite via the send-invite Edge Function
 */
import { renderHook, waitFor, act } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { supabase } from '../../lib/supabase'

// Mock supabase
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

// Import hooks after mock setup
import { usePendingInvites, useSendInvite } from '../../hooks/use-household-invite'

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

const mockPendingInvites = [
  {
    id: 'inv-1',
    invited_email: 'friend@example.com',
    status: 'pending',
    created_at: '2026-05-09T12:00:00Z',
    expires_at: '2026-05-16T12:00:00Z',
  },
  {
    id: 'inv-2',
    invited_email: 'family@example.com',
    status: 'pending',
    created_at: '2026-05-08T12:00:00Z',
    expires_at: '2026-05-15T12:00:00Z',
  },
]

// ---------------------------------------------------------------------------
// usePendingInvites
// ---------------------------------------------------------------------------

describe('usePendingInvites', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('fetches pending invites for the household', async () => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: mockPendingInvites,
        error: null,
      }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const { result } = renderHook(() => usePendingInvites('hh-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(supabase.from).toHaveBeenCalledWith('household_invites')
    expect(result.current.data).toEqual(mockPendingInvites)
    expect(result.current.data).toHaveLength(2)
  })

  it('returns empty array when no pending invites exist', async () => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const { result } = renderHook(() => usePendingInvites('hh-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })

  it('does not fetch when householdId is null', () => {
    const { result } = renderHook(() => usePendingInvites(null), {
      wrapper: createWrapper(),
    })

    expect(result.current.isFetching).toBe(false)
  })

  it('does not fetch when householdId is undefined', () => {
    const { result } = renderHook(() => usePendingInvites(undefined), {
      wrapper: createWrapper(),
    })

    expect(result.current.isFetching).toBe(false)
  })

  it('handles Supabase errors', async () => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'RLS violation' },
      }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const { result } = renderHook(() => usePendingInvites('hh-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

// ---------------------------------------------------------------------------
// useSendInvite
// ---------------------------------------------------------------------------

describe('useSendInvite', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('calls the send-invite Edge Function with email and household_id', async () => {
    ;(supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: { success: true, invite_id: 'inv-new' },
      error: null,
    })

    const { result } = renderHook(() => useSendInvite(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.mutateAsync({
        email: 'newmember@example.com',
        householdId: 'hh-1',
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(supabase.functions.invoke).toHaveBeenCalledWith('send-invite', {
      body: { email: 'newmember@example.com', household_id: 'hh-1' },
    })
  })

  it('returns success data with invite_id', async () => {
    ;(supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: { success: true, invite_id: 'inv-42' },
      error: null,
    })

    const { result } = renderHook(() => useSendInvite(), {
      wrapper: createWrapper(),
    })

    let returnData: any
    await act(async () => {
      returnData = await result.current.mutateAsync({
        email: 'test@example.com',
        householdId: 'hh-1',
      })
    })

    expect(returnData).toEqual({ success: true, invite_id: 'inv-42' })
  })

  it('throws when Edge Function returns error', async () => {
    ;(supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'Unauthorized' },
    })

    const { result } = renderHook(() => useSendInvite(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      result.current.mutate({
        email: 'test@example.com',
        householdId: 'hh-1',
      })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })

  it('throws when Edge Function returns data with error field', async () => {
    ;(supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: { error: 'Missing email or household_id' },
      error: null,
    })

    const { result } = renderHook(() => useSendInvite(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      result.current.mutate({
        email: '',
        householdId: 'hh-1',
      })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Missing email or household_id')
  })
})
