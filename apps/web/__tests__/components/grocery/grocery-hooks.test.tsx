import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// ---------------------------------------------------------------------------
// All mocks via vi.hoisted — ensures they exist before vi.mock hoisting
// ---------------------------------------------------------------------------

const {
  mockInsert,
  mockUpdate,
  mockDelete,
  mockShelfSelect,
  mockFrom,
  mockToast,
} = vi.hoisted(() => {
  const insert = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: { id: 'new-item-1' },
        error: null,
      }),
    }),
  })

  const update = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  })

  const del = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  })

  const shelfSelect = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { shelf_days: 7 },
          error: null,
        }),
      }),
    }),
  })

  // No inline implementation — keeps the mock loosely typed so
  // mockImplementation() accepts any return shape in individual tests.
  // Default behavior is set via restoreDefaultMockFrom() in beforeEach.
  const from = vi.fn()

  const toast = { error: vi.fn(), success: vi.fn() }

  return {
    mockInsert: insert,
    mockUpdate: update,
    mockDelete: del,
    mockShelfSelect: shelfSelect,
    mockFrom: from,
    mockToast: toast,
  }
})

vi.mock('sonner', () => ({
  toast: mockToast,
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ from: mockFrom }),
}))

// Import AFTER mocks
import {
  useAddGroceryItem,
  useCheckOffGroceryItem,
  useDeleteGroceryItem,
} from '../../../hooks/use-grocery-items'
import type { GroceryItemWithCategory } from '../../../hooks/use-grocery-items'

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

function makeItem(overrides: Partial<GroceryItemWithCategory> = {}): GroceryItemWithCategory {
  return {
    id: 'item-1',
    name: 'Test Item',
    quantity: '1',
    category_id: 'cat-1',
    destination: 'fridge',
    household_id: 'hh-1',
    added_by: 'user-1',
    checked: false,
    checked_by: null,
    checked_at: null,
    completed_at: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    categories: {
      name: 'Produce',
      emoji: '🥬',
      display_order: 1,
      default_destination: 'fridge',
      has_expiration: true,
    },
    ...overrides,
  }
}

/**
 * Restores mockFrom to its default implementation after tests that override it.
 */
function restoreDefaultMockFrom() {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'grocery_items') {
      return {
        insert: mockInsert,
        update: mockUpdate,
        delete: mockDelete,
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      }
    }
    if (table === 'default_shelf_days') {
      return { select: mockShelfSelect }
    }
    if (table === 'inventory_items') {
      return { insert: vi.fn().mockResolvedValue({ error: null }) }
    }
    return { select: vi.fn() }
  })
}

// ---------------------------------------------------------------------------
// Tests: Input Validation
// ---------------------------------------------------------------------------

describe('useAddGroceryItem validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    restoreDefaultMockFrom()
  })

  it('rejects empty item name', async () => {
    const { result } = renderHook(() => useAddGroceryItem(), { wrapper: createWrapper() })

    result.current.mutate({
      name: '   ',
      quantity: null,
      category_id: 'cat-1',
      destination: 'fridge',
      household_id: 'hh-1',
      added_by: 'user-1',
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(mockToast.error).toHaveBeenCalledWith(
      'Failed to add item',
      expect.objectContaining({ description: 'Item name is required' })
    )
  })

  it('rejects name exceeding 200 characters', async () => {
    const { result } = renderHook(() => useAddGroceryItem(), { wrapper: createWrapper() })

    result.current.mutate({
      name: 'A'.repeat(201),
      quantity: null,
      category_id: 'cat-1',
      destination: 'fridge',
      household_id: 'hh-1',
      added_by: 'user-1',
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(mockToast.error).toHaveBeenCalledWith(
      'Failed to add item',
      expect.objectContaining({ description: expect.stringContaining('200') })
    )
  })

  it('rejects quantity exceeding 50 characters', async () => {
    const { result } = renderHook(() => useAddGroceryItem(), { wrapper: createWrapper() })

    result.current.mutate({
      name: 'Valid Name',
      quantity: 'Q'.repeat(51),
      category_id: 'cat-1',
      destination: 'fridge',
      household_id: 'hh-1',
      added_by: 'user-1',
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(mockToast.error).toHaveBeenCalledWith(
      'Failed to add item',
      expect.objectContaining({ description: expect.stringContaining('50') })
    )
  })

  it('rejects invalid destination', async () => {
    const { result } = renderHook(() => useAddGroceryItem(), { wrapper: createWrapper() })

    result.current.mutate({
      name: 'Valid Name',
      quantity: null,
      category_id: 'cat-1',
      destination: 'basement' as 'fridge',
      household_id: 'hh-1',
      added_by: 'user-1',
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(mockToast.error).toHaveBeenCalledWith(
      'Failed to add item',
      expect.objectContaining({ description: 'Invalid destination' })
    )
  })

  it('accepts valid input and calls supabase insert', async () => {
    const { result } = renderHook(() => useAddGroceryItem(), { wrapper: createWrapper() })

    result.current.mutate({
      name: 'Strawberries',
      quantity: '2 lbs',
      category_id: 'cat-1',
      destination: 'fridge',
      household_id: 'hh-1',
      added_by: 'user-1',
    })

    await waitFor(() => {
      expect(result.current.isSuccess || result.current.isError).toBe(true)
    })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Strawberries',
        quantity: '2 lbs',
        destination: 'fridge',
      })
    )
  })
})

// ---------------------------------------------------------------------------
// Tests: Check-off / Checkout flow
// ---------------------------------------------------------------------------

describe('useCheckOffGroceryItem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    restoreDefaultMockFrom()
  })

  it('marks grocery item as checked on success', async () => {
    const { result } = renderHook(() => useCheckOffGroceryItem(), { wrapper: createWrapper() })
    const item = makeItem()

    result.current.mutate({ item, userId: 'user-1' })

    await waitFor(() => {
      expect(result.current.isSuccess || result.current.isError).toBe(true)
    })

    // Should have called update on grocery_items
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        checked: true,
        checked_by: 'user-1',
      })
    )
  })

  it('does NOT create inventory item when destination is none', async () => {
    const inventoryInsert = vi.fn().mockResolvedValue({ error: null })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'grocery_items') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }
      }
      if (table === 'inventory_items') {
        return { insert: inventoryInsert }
      }
      return { select: vi.fn() }
    })

    const { result } = renderHook(() => useCheckOffGroceryItem(), { wrapper: createWrapper() })
    const item = makeItem({ destination: 'none' })

    result.current.mutate({ item, userId: 'user-1' })

    await waitFor(() => {
      expect(result.current.isSuccess || result.current.isError).toBe(true)
    })

    // inventory_items insert should NOT have been called
    expect(inventoryInsert).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Tests: Delete
// ---------------------------------------------------------------------------

describe('useDeleteGroceryItem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    restoreDefaultMockFrom()
  })

  it('calls supabase delete and shows success toast', async () => {
    const { result } = renderHook(() => useDeleteGroceryItem(), { wrapper: createWrapper() })

    result.current.mutate({ itemId: 'item-1', householdId: 'hh-1' })

    await waitFor(() => {
      expect(result.current.isSuccess || result.current.isError).toBe(true)
    })

    expect(mockDelete).toHaveBeenCalled()
    expect(mockToast.success).toHaveBeenCalledWith('Item removed')
  })
})

// ---------------------------------------------------------------------------
// Tests: expiration_source in checkout flow (regression for Phase 4.8 bug)
//
// Before migration 009, the CHECK constraint only allowed 'user' | 'default'.
// Writing 'foodkeeper' would cause a Postgres constraint violation at runtime.
// These tests verify the correct source is written for different items.
// ---------------------------------------------------------------------------

describe('useCheckOffGroceryItem expiration_source', () => {
  let inventoryInsert: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()

    inventoryInsert = vi.fn().mockResolvedValue({ error: null })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'grocery_items') {
        return {
          update: mockUpdate,
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        }
      }
      if (table === 'default_shelf_days') {
        return { select: mockShelfSelect }
      }
      if (table === 'inventory_items') {
        return { insert: inventoryInsert }
      }
      return { select: vi.fn() }
    })
  })

  it('sets expiration_source to "foodkeeper" for FoodKeeper-matched items', async () => {
    // "Chicken Breast" matches FoodKeeper data → should get 'foodkeeper' source
    const { result } = renderHook(() => useCheckOffGroceryItem(), { wrapper: createWrapper() })
    const item = makeItem({
      name: 'Chicken Breast',
      destination: 'fridge',
      categories: {
        name: 'Meat',
        emoji: '🥩',
        display_order: 3,
        default_destination: 'fridge',
        has_expiration: true,
      },
    })

    result.current.mutate({ item, userId: 'user-1' })

    await waitFor(() => {
      expect(result.current.isSuccess || result.current.isError).toBe(true)
    })

    expect(inventoryInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        expiration_source: 'foodkeeper',
        source: 'grocery_checkout',
      })
    )
  })

  it('sets expiration_source to "default" when no FoodKeeper match', async () => {
    // "Artisanal Acai Spread" has no FoodKeeper match → falls back to category default
    const { result } = renderHook(() => useCheckOffGroceryItem(), { wrapper: createWrapper() })
    const item = makeItem({
      name: 'Artisanal Acai Spread',
      destination: 'fridge',
      categories: {
        name: 'Condiments',
        emoji: '🧂',
        display_order: 8,
        default_destination: 'pantry',
        has_expiration: true,
      },
    })

    result.current.mutate({ item, userId: 'user-1' })

    await waitFor(() => {
      expect(result.current.isSuccess || result.current.isError).toBe(true)
    })

    expect(inventoryInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        expiration_source: 'default',
        source: 'grocery_checkout',
      })
    )
  })

  it('sets expiration_source to null for non-expiring categories', async () => {
    // Household items: has_expiration = false → null expiration
    const { result } = renderHook(() => useCheckOffGroceryItem(), { wrapper: createWrapper() })
    const item = makeItem({
      name: 'Paper Towels',
      destination: 'pantry',
      categories: {
        name: 'Household',
        emoji: '🧹',
        display_order: 10,
        default_destination: 'none',
        has_expiration: false,
      },
    })

    result.current.mutate({ item, userId: 'user-1' })

    await waitFor(() => {
      expect(inventoryInsert).toHaveBeenCalled()
    })

    expect(inventoryInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        expiration_date: null,
        expiration_source: null,
        source: 'grocery_checkout',
      })
    )
  })

  it('sets expiration_source to "foodkeeper" for common produce items', async () => {
    // "Strawberries" is in FoodKeeper — regression test for the original Phase 4.8 bug
    const { result } = renderHook(() => useCheckOffGroceryItem(), { wrapper: createWrapper() })
    const item = makeItem({
      name: 'Strawberries',
      destination: 'fridge',
    })

    result.current.mutate({ item, userId: 'user-1' })

    await waitFor(() => {
      expect(inventoryInsert).toHaveBeenCalled()
    })

    expect(inventoryInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        expiration_source: 'foodkeeper',
      })
    )
  })
})


