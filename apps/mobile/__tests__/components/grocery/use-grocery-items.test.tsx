/**
 * TDD Red Phase — Tests for mobile grocery hooks
 * These tests verify the data layer for the mobile grocery list,
 * including toggle check, finish shopping, and offline mutation behavior.
 */
import { renderHook, waitFor, act } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { supabase } from '../../../lib/supabase'
import {
  useGroceryItems,
  useAddGroceryItem,
  useToggleGroceryItem,
  useFinishShopping,
  useDeleteGroceryItem,
} from '../../../hooks/use-grocery-items'

// ---------------------------------------------------------------------------
// Mock Supabase
// ---------------------------------------------------------------------------

jest.mock('../../../lib/supabase', () => {
  const mockSelect = jest.fn()
  const mockInsert = jest.fn()
  const mockUpdate = jest.fn()
  const mockDelete = jest.fn()
  const mockEq = jest.fn()
  const mockIs = jest.fn()
  const mockOrder = jest.fn()
  const mockSingle = jest.fn()

  return {
    supabase: {
      from: jest.fn(),
      auth: {
        signInWithPassword: jest.fn(),
        signUp: jest.fn(),
        getUser: jest.fn(),
      },
    },
    __mocks: {
      mockSelect,
      mockInsert,
      mockUpdate,
      mockDelete,
      mockEq,
      mockIs,
      mockOrder,
      mockSingle,
    },
  }
})

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

const mockGroceryItems = [
  {
    id: 'item-1',
    name: 'Chicken Breast',
    quantity: '2 lbs',
    category_id: 'cat-meat',
    destination: 'fridge',
    household_id: 'hh-1',
    added_by: 'user-1',
    checked: false,
    checked_by: null,
    checked_at: null,
    completed_at: null,
    created_at: '2026-05-01T00:00:00Z',
    updated_at: '2026-05-01T00:00:00Z',
    categories: {
      name: 'meat',
      emoji: '🥩',
      display_order: 3,
      default_destination: 'fridge',
      has_expiration: true,
    },
  },
  {
    id: 'item-2',
    name: 'Paper Towels',
    quantity: '1',
    category_id: 'cat-household',
    destination: 'none',
    household_id: 'hh-1',
    added_by: 'user-1',
    checked: false,
    checked_by: null,
    checked_at: null,
    completed_at: null,
    created_at: '2026-05-01T01:00:00Z',
    updated_at: '2026-05-01T01:00:00Z',
    categories: {
      name: 'household',
      emoji: '🏠',
      display_order: 10,
      default_destination: 'none',
      has_expiration: false,
    },
  },
]

// ---------------------------------------------------------------------------
// useGroceryItems — fetch hook
// ---------------------------------------------------------------------------

describe('useGroceryItems', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('fetches grocery items from Supabase grouped with categories', async () => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: mockGroceryItems, error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const { result } = renderHook(() => useGroceryItems('hh-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(supabase.from).toHaveBeenCalledWith('grocery_items')
    expect(result.current.data).toHaveLength(2)
    expect(result.current.data![0].name).toBe('Chicken Breast')
  })

  it('returns empty array when householdId is undefined', async () => {
    const { result } = renderHook(() => useGroceryItems(undefined), {
      wrapper: createWrapper(),
    })

    // Should not fetch — enabled: false
    expect(result.current.isFetching).toBe(false)
  })

  it('throws on Supabase error', async () => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'RLS violation' },
      }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const { result } = renderHook(() => useGroceryItems('hh-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

// ---------------------------------------------------------------------------
// useAddGroceryItem — validation + insert
// ---------------------------------------------------------------------------

describe('useAddGroceryItem', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('rejects empty name', async () => {
    const { result } = renderHook(() => useAddGroceryItem(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      result.current.mutate({
        name: '   ',
        quantity: null,
        category_id: 'cat-1',
        destination: 'fridge',
        household_id: 'hh-1',
        added_by: 'user-1',
      })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toContain('required')
  })

  it('rejects name exceeding 200 characters', async () => {
    const { result } = renderHook(() => useAddGroceryItem(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      result.current.mutate({
        name: 'x'.repeat(201),
        quantity: null,
        category_id: 'cat-1',
        destination: 'fridge',
        household_id: 'hh-1',
        added_by: 'user-1',
      })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toContain('200')
  })

  it('rejects invalid destination', async () => {
    const { result } = renderHook(() => useAddGroceryItem(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      result.current.mutate({
        name: 'Milk',
        quantity: null,
        category_id: 'cat-1',
        destination: 'garage' as any,
        household_id: 'hh-1',
        added_by: 'user-1',
      })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toContain('destination')
  })

  it('inserts valid item via Supabase', async () => {
    const mockChain = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'new-id', name: 'Milk' },
        error: null,
      }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const { result } = renderHook(() => useAddGroceryItem(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      result.current.mutate({
        name: 'Milk',
        quantity: '1 gallon',
        category_id: 'cat-dairy',
        destination: 'fridge',
        household_id: 'hh-1',
        added_by: 'user-1',
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Milk',
        quantity: '1 gallon',
        category_id: 'cat-dairy',
        destination: 'fridge',
      })
    )
  })
})

// ---------------------------------------------------------------------------
// useToggleGroceryItem — toggle check (NO completed_at, NO inventory)
// ---------------------------------------------------------------------------

describe('useToggleGroceryItem', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('checks an unchecked item — sets checked=true, checked_by, checked_at', async () => {
    const updateChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(updateChain)

    const { result } = renderHook(() => useToggleGroceryItem(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      result.current.mutate({
        item: mockGroceryItems[0] as any,
        userId: 'user-1',
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Should set checked=true, checked_by, checked_at
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        checked: true,
        checked_by: 'user-1',
      })
    )

    // Must NOT set completed_at
    const updateArg = updateChain.update.mock.calls[0][0]
    expect(updateArg).not.toHaveProperty('completed_at')
  })

  it('does NOT create inventory items — only toggles checked state', async () => {
    const updateChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(updateChain)

    const { result } = renderHook(() => useToggleGroceryItem(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      result.current.mutate({
        item: mockGroceryItems[0] as any,
        userId: 'user-1',
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Should only call from('grocery_items'), never from('inventory_items')
    const fromCalls = (supabase.from as jest.Mock).mock.calls.map((c: any[]) => c[0])
    expect(fromCalls).not.toContain('inventory_items')
    expect(fromCalls).not.toContain('default_shelf_days')
  })

  it('unchecks a checked item — sets checked=false, clears checked_by/checked_at', async () => {
    const updateChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(updateChain)

    const checkedItem = { ...mockGroceryItems[0], checked: true, checked_by: 'user-1', checked_at: '2026-05-01T00:00:00Z' }

    const { result } = renderHook(() => useToggleGroceryItem(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      result.current.mutate({
        item: checkedItem as any,
        userId: 'user-1',
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        checked: false,
        checked_by: null,
        checked_at: null,
      })
    )
  })
})

// ---------------------------------------------------------------------------
// useFinishShopping — batch complete + inventory creation
// ---------------------------------------------------------------------------

describe('useFinishShopping', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('batch-completes checked items and creates inventory items', async () => {
    const checkedItems = [
      { ...mockGroceryItems[0], checked: true, checked_by: 'user-1' },
    ]

    // Mock: fetch checked items
    const selectChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: checkedItems, error: null }),
    }

    // Mock: update grocery items (set completed_at)
    const updateChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockResolvedValue({ error: null }),
    }

    // Mock: shelf days lookup
    const shelfChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { shelf_days: 7 },
        error: null,
      }),
    }

    // Mock: inventory insert
    const insertChain = {
      insert: jest.fn().mockResolvedValue({ error: null }),
    }

    let callCount = 0
    ;(supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'grocery_items') {
        callCount++
        // First call = select checked items, second = update completed_at
        return callCount === 1 ? selectChain : updateChain
      }
      if (table === 'default_shelf_days') return shelfChain
      if (table === 'inventory_items') return insertChain
      return {}
    })

    const { result } = renderHook(() => useFinishShopping(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      result.current.mutate({
        householdId: 'hh-1',
        userId: 'user-1',
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Verify inventory was created
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Chicken Breast',
        location: 'fridge',
        source: 'grocery_checkout',
      })
    )
  })

  it('skips inventory creation for items with destination "none"', async () => {
    const checkedItems = [
      { ...mockGroceryItems[1], checked: true, checked_by: 'user-1' }, // Paper Towels, destination: 'none'
    ]

    const selectChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: checkedItems, error: null }),
    }

    const updateChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockResolvedValue({ error: null }),
    }

    let callCount = 0
    ;(supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'grocery_items') {
        callCount++
        return callCount === 1 ? selectChain : updateChain
      }
      return {}
    })

    const { result } = renderHook(() => useFinishShopping(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      result.current.mutate({
        householdId: 'hh-1',
        userId: 'user-1',
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Should never touch inventory_items
    const fromCalls = (supabase.from as jest.Mock).mock.calls.map((c: any[]) => c[0])
    expect(fromCalls).not.toContain('inventory_items')
  })
})

// ---------------------------------------------------------------------------
// useDeleteGroceryItem
// ---------------------------------------------------------------------------

describe('useDeleteGroceryItem', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('deletes item via Supabase', async () => {
    const deleteChain = {
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(deleteChain)

    const { result } = renderHook(() => useDeleteGroceryItem(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      result.current.mutate({ itemId: 'item-1', householdId: 'hh-1' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(supabase.from).toHaveBeenCalledWith('grocery_items')
    expect(deleteChain.delete).toHaveBeenCalled()
  })
})
