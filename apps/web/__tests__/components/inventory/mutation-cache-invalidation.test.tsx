'use client'

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockFrom = vi.fn()
const mockUpdate = vi.fn()
const mockEq = vi.fn()
const mockSelect = vi.fn()
const mockSingle = vi.fn()
const mockNot = vi.fn()
const mockGte = vi.fn()
const mockLt = vi.fn()
const mockOrder = vi.fn()
const mockLimit = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// ---------------------------------------------------------------------------
// Import hooks after mocks
// ---------------------------------------------------------------------------

import {
  useRestoreItem,
  useChangeDiscardReason,
} from '@/hooks/use-inventory-mutations'

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
  return {
    queryClient,
    Wrapper: function Wrapper({ children }: { children: React.ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      )
    },
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()

  // Default chain: from().update().eq().select().single()
  mockSingle.mockResolvedValue({ data: { id: 'item-1' }, error: null })
  mockSelect.mockReturnValue({ single: mockSingle })
  mockEq.mockReturnValue({ select: mockSelect })
  mockUpdate.mockReturnValue({ eq: mockEq })
  mockFrom.mockReturnValue({ update: mockUpdate })
})

describe('useRestoreItem — cache invalidation', () => {
  it('invalidates removal-history cache on success', async () => {
    const { queryClient, Wrapper } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useRestoreItem(), {
      wrapper: Wrapper,
    })

    result.current.mutate({ itemId: 'item-1', householdId: 'hh-1' })

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['removal-history', 'hh-1'],
        }),
      )
    })
  })

  it('invalidates inventory-items cache on success', async () => {
    const { queryClient, Wrapper } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useRestoreItem(), {
      wrapper: Wrapper,
    })

    result.current.mutate({ itemId: 'item-1', householdId: 'hh-1' })

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['inventory-items', 'hh-1'],
        }),
      )
    })
  })

  it('invalidates recently-removed cache on success', async () => {
    const { queryClient, Wrapper } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useRestoreItem(), {
      wrapper: Wrapper,
    })

    result.current.mutate({ itemId: 'item-1', householdId: 'hh-1' })

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['recently-removed', 'hh-1'],
        }),
      )
    })
  })

  it('invalidates inventory-counts cache on success', async () => {
    const { queryClient, Wrapper } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useRestoreItem(), {
      wrapper: Wrapper,
    })

    result.current.mutate({ itemId: 'item-1', householdId: 'hh-1' })

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['inventory-counts', 'hh-1'],
        }),
      )
    })
  })
})

describe('useChangeDiscardReason — cache invalidation', () => {
  it('invalidates removal-history cache on success', async () => {
    const { queryClient, Wrapper } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useChangeDiscardReason(), {
      wrapper: Wrapper,
    })

    result.current.mutate({
      itemId: 'item-1',
      householdId: 'hh-1',
      newReason: 'wasted',
    })

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['removal-history', 'hh-1'],
        }),
      )
    })
  })

  it('invalidates recently-removed cache on success', async () => {
    const { queryClient, Wrapper } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useChangeDiscardReason(), {
      wrapper: Wrapper,
    })

    result.current.mutate({
      itemId: 'item-1',
      householdId: 'hh-1',
      newReason: 'consumed',
    })

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['recently-removed', 'hh-1'],
        }),
      )
    })
  })
})
