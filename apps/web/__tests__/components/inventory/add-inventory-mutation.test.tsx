'use client'

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockInsert = vi.fn()
const mockSelect = vi.fn()
const mockSingle = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: vi.fn().mockReturnValue({
      insert: mockInsert,
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: {}, error: null }),
          }),
        }),
      }),
    }),
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { useAddInventoryItem } from '@/hooks/use-inventory-mutations'

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
  mockSingle.mockResolvedValue({
    data: { id: 'new-item-1', name: 'Bananas' },
    error: null,
  })
  mockSelect.mockReturnValue({ single: mockSingle })
  mockInsert.mockReturnValue({ select: mockSelect })
})

describe('useAddInventoryItem', () => {
  it('inserts an inventory item with correct payload', async () => {
    const { queryClient, Wrapper } = createWrapper()

    const { result } = renderHook(() => useAddInventoryItem(), {
      wrapper: Wrapper,
    })

    result.current.mutate({
      name: 'Bananas',
      quantity: '1 bunch',
      categoryId: 'cat-produce',
      location: 'fridge',
      householdId: 'hh-1',
      userId: 'user-1',
      expirationDate: '2026-06-15',
    })

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledTimes(1)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Bananas',
          quantity: '1 bunch',
          category_id: 'cat-produce',
          location: 'fridge',
          household_id: 'hh-1',
          added_by: 'user-1',
          source: 'manual',
          expiration_date: '2026-06-15',
          expiration_source: 'user',
        }),
      )
    })
  })

  it('sends null expiration_date when not provided', async () => {
    const { queryClient, Wrapper } = createWrapper()

    const { result } = renderHook(() => useAddInventoryItem(), {
      wrapper: Wrapper,
    })

    result.current.mutate({
      name: 'Rice',
      quantity: null,
      categoryId: 'cat-pantry',
      location: 'pantry',
      householdId: 'hh-1',
      userId: 'user-1',
      expirationDate: null,
    })

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          expiration_date: null,
          expiration_source: null,
        }),
      )
    })
  })

  it('invalidates inventory-items cache on success', async () => {
    const { queryClient, Wrapper } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useAddInventoryItem(), {
      wrapper: Wrapper,
    })

    result.current.mutate({
      name: 'Milk',
      quantity: '1 gal',
      categoryId: 'cat-dairy',
      location: 'fridge',
      householdId: 'hh-1',
      userId: 'user-1',
      expirationDate: null,
    })

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['inventory-items', 'hh-1'],
        }),
      )
    })
  })

  it('invalidates inventory-counts cache on success', async () => {
    const { queryClient, Wrapper } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useAddInventoryItem(), {
      wrapper: Wrapper,
    })

    result.current.mutate({
      name: 'Eggs',
      quantity: '1 dozen',
      categoryId: 'cat-dairy',
      location: 'fridge',
      householdId: 'hh-1',
      userId: 'user-1',
      expirationDate: null,
    })

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['inventory-counts', 'hh-1'],
        }),
      )
    })
  })

  it('trims whitespace from name', async () => {
    const { Wrapper } = createWrapper()

    const { result } = renderHook(() => useAddInventoryItem(), {
      wrapper: Wrapper,
    })

    result.current.mutate({
      name: '  Carrots  ',
      quantity: null,
      categoryId: 'cat-produce',
      location: 'fridge',
      householdId: 'hh-1',
      userId: 'user-1',
      expirationDate: null,
    })

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Carrots' }),
      )
    })
  })

  it('rejects empty name after trimming', async () => {
    const { Wrapper } = createWrapper()

    const { result } = renderHook(() => useAddInventoryItem(), {
      wrapper: Wrapper,
    })

    result.current.mutate({
      name: '   ',
      quantity: null,
      categoryId: 'cat-produce',
      location: 'fridge',
      householdId: 'hh-1',
      userId: 'user-1',
      expirationDate: null,
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(mockInsert).not.toHaveBeenCalled()
  })
})
