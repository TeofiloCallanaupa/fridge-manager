/**
 * TDD Red Phase — Tests for useAnalytics hooks
 *
 * Verifies the data layer for the analytics dashboard:
 * - Fetching summary stats
 * - Fetching monthly trends
 * - Fetching category waste breakdown
 */
import { renderHook, waitFor } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { supabase } from '../../lib/supabase'

jest.mock('../../lib/supabase', () => {
  return {
    supabase: {
      from: jest.fn(),
      rpc: jest.fn(),
    },
  }
})

import {
  useAnalyticsSummary,
  useMonthlyTrends,
  useCategoryWaste,
} from '../../hooks/use-analytics'

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

// ---------------------------------------------------------------------------
// Mock data — inventory_items with discard info
// ---------------------------------------------------------------------------

const mockInventoryItems = [
  // Consumed items
  { id: '1', discard_reason: 'consumed', discarded_at: '2026-05-01T10:00:00Z', added_at: '2026-04-25T10:00:00Z', category_id: 'cat-produce', categories: { name: 'produce', emoji: '🥬' } },
  { id: '2', discard_reason: 'consumed', discarded_at: '2026-05-02T10:00:00Z', added_at: '2026-04-28T10:00:00Z', category_id: 'cat-dairy', categories: { name: 'dairy', emoji: '🧀' } },
  { id: '3', discard_reason: 'consumed', discarded_at: '2026-05-03T10:00:00Z', added_at: '2026-04-30T10:00:00Z', category_id: 'cat-meat', categories: { name: 'meat', emoji: '🥩' } },
  // Wasted items
  { id: '4', discard_reason: 'wasted', discarded_at: '2026-05-01T10:00:00Z', added_at: '2026-04-20T10:00:00Z', category_id: 'cat-dairy', categories: { name: 'dairy', emoji: '🧀' } },
  { id: '5', discard_reason: 'expired', discarded_at: '2026-05-02T10:00:00Z', added_at: '2026-04-15T10:00:00Z', category_id: 'cat-produce', categories: { name: 'produce', emoji: '🥬' } },
]

const mockGroceryItems = [
  { completed_at: '2026-05-01T10:00:00Z' },
  { completed_at: '2026-05-01T10:00:00Z' },
  { completed_at: '2026-05-03T10:00:00Z' },
]

// ---------------------------------------------------------------------------
// useAnalyticsSummary
// ---------------------------------------------------------------------------

describe('useAnalyticsSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('calculates summary stats from inventory and grocery data', async () => {
    const inventoryChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      gte: jest.fn().mockResolvedValue({
        data: mockInventoryItems,
        error: null,
      }),
    }

    const groceryChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      gte: jest.fn().mockResolvedValue({
        data: mockGroceryItems,
        error: null,
      }),
    }

    let callCount = 0
    ;(supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'inventory_items') return inventoryChain
      if (table === 'grocery_items') return groceryChain
      return {}
    })

    const { result } = renderHook(
      () => useAnalyticsSummary('hh-1'),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const summary = result.current.data!
    expect(summary.itemsConsumed).toBe(3)
    expect(summary.itemsWasted).toBe(2)
    expect(summary.wasteRate).toBeCloseTo(40, 0) // 2/(3+2) = 40%
    expect(summary.topWastedCategory).toEqual(
      expect.objectContaining({ category: 'dairy' }) // dairy + produce each have 1, dairy comes first alphabetically or by order
    )
    expect(summary.shoppingTrips).toBe(2) // 2 distinct dates
    // streakWeeks is calculated from 6-month trend data
    // All mock data is in one month with 40% waste rate (>10%), so streak = 0
    expect(summary.streakWeeks).toBe(0)
  })

  it('does not fetch when householdId is undefined', () => {
    const { result } = renderHook(
      () => useAnalyticsSummary(undefined),
      { wrapper: createWrapper() },
    )

    expect(result.current.isFetching).toBe(false)
  })

  it('returns empty summary when no discarded items', async () => {
    const inventoryChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      gte: jest.fn().mockResolvedValue({ data: [], error: null }),
    }
    const groceryChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      gte: jest.fn().mockResolvedValue({ data: [], error: null }),
    }

    ;(supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'inventory_items') return inventoryChain
      if (table === 'grocery_items') return groceryChain
      return {}
    })

    const { result } = renderHook(
      () => useAnalyticsSummary('hh-1'),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data!.wasteRate).toBe(0)
    expect(result.current.data!.itemsConsumed).toBe(0)
    expect(result.current.data!.itemsWasted).toBe(0)
    expect(result.current.data!.topWastedCategory).toBeNull()
    expect(result.current.data!.streakWeeks).toBe(0) // no data = 0 streak
  })

  it('calculates streak weeks from low-waste trend data', async () => {
    // Trend data: 3 months of low waste (< 10%)
    const lowWasteTrendItems = [
      // March — 1 wasted, 20 consumed = 4.8% ✓
      ...Array.from({ length: 20 }, (_, i) => ({
        id: `c-mar-${i}`, discard_reason: 'consumed',
        discarded_at: '2026-03-15T10:00:00Z', added_at: '2026-03-01T10:00:00Z',
        category_id: 'cat-produce', categories: { name: 'produce', emoji: '🥬' },
      })),
      { id: 'w-mar-1', discard_reason: 'wasted',
        discarded_at: '2026-03-20T10:00:00Z', added_at: '2026-03-01T10:00:00Z',
        category_id: 'cat-dairy', categories: { name: 'dairy', emoji: '🧀' },
      },
      // April — 0 wasted, 15 consumed = 0% ✓
      ...Array.from({ length: 15 }, (_, i) => ({
        id: `c-apr-${i}`, discard_reason: 'consumed',
        discarded_at: '2026-04-15T10:00:00Z', added_at: '2026-04-01T10:00:00Z',
        category_id: 'cat-produce', categories: { name: 'produce', emoji: '🥬' },
      })),
      // May — 1 wasted, 18 consumed = 5.3% ✓
      ...Array.from({ length: 18 }, (_, i) => ({
        id: `c-may-${i}`, discard_reason: 'consumed',
        discarded_at: '2026-05-10T10:00:00Z', added_at: '2026-05-01T10:00:00Z',
        category_id: 'cat-produce', categories: { name: 'produce', emoji: '🥬' },
      })),
      { id: 'w-may-1', discard_reason: 'expired',
        discarded_at: '2026-05-05T10:00:00Z', added_at: '2026-04-20T10:00:00Z',
        category_id: 'cat-dairy', categories: { name: 'dairy', emoji: '🧀' },
      },
    ]

    const inventoryChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      gte: jest.fn().mockResolvedValue({
        data: lowWasteTrendItems,
        error: null,
      }),
    }
    const groceryChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      gte: jest.fn().mockResolvedValue({ data: [], error: null }),
    }

    ;(supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'inventory_items') return inventoryChain
      if (table === 'grocery_items') return groceryChain
      return {}
    })

    const { result } = renderHook(
      () => useAnalyticsSummary('hh-1'),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // 3 consecutive low-waste months × 4 weeks = 12
    expect(result.current.data!.streakWeeks).toBe(12)
  })
})

// ---------------------------------------------------------------------------
// useCategoryWaste
// ---------------------------------------------------------------------------

describe('useCategoryWaste', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('groups wasted items by category', async () => {
    const wastedItems = [
      { category_id: 'cat-dairy', discard_reason: 'wasted', categories: { name: 'dairy', emoji: '🧀' } },
      { category_id: 'cat-dairy', discard_reason: 'expired', categories: { name: 'dairy', emoji: '🧀' } },
      { category_id: 'cat-produce', discard_reason: 'wasted', categories: { name: 'produce', emoji: '🥬' } },
    ]

    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      gte: jest.fn().mockResolvedValue({ data: wastedItems, error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(chain)

    const { result } = renderHook(
      () => useCategoryWaste('hh-1'),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const categories = result.current.data!
    expect(categories).toHaveLength(2)
    // Sorted descending by count
    expect(categories[0]).toEqual(
      expect.objectContaining({ category: 'dairy', count: 2 }),
    )
    expect(categories[1]).toEqual(
      expect.objectContaining({ category: 'produce', count: 1 }),
    )
  })
})
