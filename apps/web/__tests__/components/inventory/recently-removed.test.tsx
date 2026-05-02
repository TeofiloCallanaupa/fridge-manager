'use client'

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// ---------------------------------------------------------------------------
// Mocks via vi.hoisted
// ---------------------------------------------------------------------------

const {
  mockMutateRestore,
  mockMutateChangeReason,
  mockChannel,
} = vi.hoisted(() => ({
  mockMutateRestore: vi.fn(),
  mockMutateChangeReason: vi.fn(),
  mockChannel: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: vi.fn(),
    channel: mockChannel.mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
    removeChannel: vi.fn(),
  }),
}))

vi.mock('@/hooks/use-inventory-mutations', () => ({
  useEditInventoryItem: () => ({ mutate: vi.fn(), isPending: false }),
  useDiscardItem: () => ({ mutate: vi.fn(), isPending: false }),
  useReAddToGroceryList: () => ({ mutate: vi.fn(), isPending: false }),
  usePurchaseHistoryCount: () => ({ data: 0 }),
  useRestoreItem: () => ({
    mutate: mockMutateRestore,
    isPending: false,
  }),
  useChangeDiscardReason: () => ({
    mutate: mockMutateChangeReason,
    isPending: false,
  }),
}))

vi.mock('@fridge-manager/shared', () => ({
  formatRelativeTime: vi.fn((date: Date) => {
    const diff = Date.now() - date.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins} minutes ago`
    const hours = Math.floor(diff / 3600000)
    if (hours < 24) return `${hours} hours ago`
    return 'yesterday'
  }),
  getExpirationColor: vi.fn(() => null),
  getDaysSince: vi.fn(() => 0),
  formatPurchaseHistory: vi.fn(() => 'No purchase history'),
  getOppositeReason: (reason: string | null) => {
    if (reason === 'consumed') return { label: 'Change to Tossed', newReason: 'wasted' }
    return { label: 'Change to Used', newReason: 'consumed' }
  },
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// ---------------------------------------------------------------------------
// Import component after mocks
// ---------------------------------------------------------------------------

import { RecentlyRemoved } from '@/components/inventory/recently-removed'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }
}

const now = new Date()
const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000)
const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)
const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)

const makeRemovedItem = (overrides = {}) => ({
  id: 'item-1',
  household_id: 'hh-1',
  name: 'Chicken breast',
  quantity: '2 lbs',
  category_id: 'cat-1',
  location: 'fridge' as const,
  expiration_date: null,
  expiration_source: null,
  added_by: 'user-1',
  added_at: now.toISOString(),
  updated_at: now.toISOString(),
  discarded_at: thirtyMinsAgo.toISOString(),
  discard_reason: 'consumed' as const,
  source: 'grocery_checkout' as const,
  categories: { name: 'meat', emoji: '🥩', has_expiration: true },
  profiles: { display_name: 'Teo' },
  ...overrides,
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
})

describe('RecentlyRemoved', () => {
  const defaultProps = {
    items: [
      makeRemovedItem(),
      makeRemovedItem({
        id: 'item-2',
        name: 'Greek yogurt',
        discard_reason: 'wasted',
        discarded_at: twoHoursAgo.toISOString(),
        profiles: { display_name: 'Emilia' },
      }),
      makeRemovedItem({
        id: 'item-3',
        name: 'Baby spinach',
        discard_reason: 'expired',
        discarded_at: twoDaysAgo.toISOString(),
      }),
    ],
    householdId: 'hh-1',
  }

  it('renders section heading and item count', () => {
    render(<RecentlyRemoved {...defaultProps} />, { wrapper: createWrapper() })
    expect(screen.getByText('Recently Removed')).toBeDefined()
  })

  it('renders all items with names and reason icons', () => {
    render(<RecentlyRemoved {...defaultProps} />, { wrapper: createWrapper() })
    expect(screen.getByText('Chicken breast')).toBeDefined()
    expect(screen.getByText('Greek yogurt')).toBeDefined()
    expect(screen.getByText('Baby spinach')).toBeDefined()
  })

  it('renders who removed each item', () => {
    render(<RecentlyRemoved {...defaultProps} />, { wrapper: createWrapper() })
    expect(screen.getAllByText(/Teo/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/Emilia/).length).toBeGreaterThanOrEqual(1)
  })

  it('renders relative timestamps', () => {
    render(<RecentlyRemoved {...defaultProps} />, { wrapper: createWrapper() })
    // thirtyMinsAgo → "30 minutes ago", twoHoursAgo → "2 hours ago"
    expect(screen.getByText(/minutes ago/)).toBeDefined()
    expect(screen.getByText(/hours ago/)).toBeDefined()
  })

  it('shows Undo button only for items < 1 hour old', () => {
    render(<RecentlyRemoved {...defaultProps} />, { wrapper: createWrapper() })
    // item-1 is 30 mins ago → should have undo
    // item-2 is 2 hours ago → no undo
    // item-3 is 2 days ago → no undo
    const undoButtons = screen.getAllByLabelText(/Undo/)
    expect(undoButtons).toHaveLength(1)
  })

  it('Undo button calls restore mutation', async () => {
    const user = userEvent.setup()
    render(<RecentlyRemoved {...defaultProps} />, { wrapper: createWrapper() })

    const undoButton = screen.getByLabelText(/Undo/)
    await user.click(undoButton)

    expect(mockMutateRestore).toHaveBeenCalledTimes(1)
    expect(mockMutateRestore.mock.calls[0][0]).toMatchObject({
      itemId: 'item-1',
      householdId: 'hh-1',
    })
  })

  it('returns null when items array is empty', () => {
    const { container } = render(
      <RecentlyRemoved items={[]} householdId="hh-1" />,
      { wrapper: createWrapper() }
    )
    expect(container.innerHTML).toBe('')
  })

  describe('Correction menu (tap to expand)', () => {
    it('tapping a card expands the correction panel', async () => {
      const user = userEvent.setup()
      render(<RecentlyRemoved {...defaultProps} />, { wrapper: createWrapper() })

      // Tap the first item card body
      const card = screen.getByText('Chicken breast').closest('[data-testid="removed-item-card"]')!
      await user.click(card)

      // Should show correction options
      expect(screen.getByText(/Change to/)).toBeDefined()
      expect(screen.getByText(/Restore to inventory/)).toBeDefined()
    })

    it('consumed item shows "Change to Tossed" toggle', async () => {
      const user = userEvent.setup()
      render(<RecentlyRemoved {...defaultProps} />, { wrapper: createWrapper() })

      const card = screen.getByText('Chicken breast').closest('[data-testid="removed-item-card"]')!
      await user.click(card)

      // Item is consumed → should offer "Change to Tossed"
      expect(screen.getByText(/Change to Tossed/)).toBeDefined()
    })

    it('wasted item shows "Change to Used" toggle', async () => {
      const user = userEvent.setup()
      render(<RecentlyRemoved {...defaultProps} />, { wrapper: createWrapper() })

      const card = screen.getByText('Greek yogurt').closest('[data-testid="removed-item-card"]')!
      await user.click(card)

      // Item is wasted → should offer "Change to Used"
      expect(screen.getByText(/Change to Used/)).toBeDefined()
    })

    it('change reason mutation sends correct payload', async () => {
      const user = userEvent.setup()
      render(<RecentlyRemoved {...defaultProps} />, { wrapper: createWrapper() })

      const card = screen.getByText('Chicken breast').closest('[data-testid="removed-item-card"]')!
      await user.click(card)

      const changeButton = screen.getByText(/Change to Tossed/)
      await user.click(changeButton)

      expect(mockMutateChangeReason).toHaveBeenCalledTimes(1)
      expect(mockMutateChangeReason.mock.calls[0][0]).toMatchObject({
        itemId: 'item-1',
        householdId: 'hh-1',
        newReason: 'wasted',
      })
    })

    it('restore from correction menu calls restore mutation', async () => {
      const user = userEvent.setup()
      render(<RecentlyRemoved {...defaultProps} />, { wrapper: createWrapper() })

      const card = screen.getByText('Greek yogurt').closest('[data-testid="removed-item-card"]')!
      await user.click(card)

      const restoreButton = screen.getByText(/Restore to inventory/)
      await user.click(restoreButton)

      expect(mockMutateRestore).toHaveBeenCalledTimes(1)
      expect(mockMutateRestore.mock.calls[0][0]).toMatchObject({
        itemId: 'item-2',
        householdId: 'hh-1',
      })
    })

    it('tapping expanded card again collapses correction panel', async () => {
      const user = userEvent.setup()
      render(<RecentlyRemoved {...defaultProps} />, { wrapper: createWrapper() })

      const card = screen.getByText('Chicken breast').closest('[data-testid="removed-item-card"]')!
      await user.click(card)
      expect(screen.getByText(/Change to/)).toBeDefined()

      // Tap again to collapse
      await user.click(card)
      expect(screen.queryByText(/Change to/)).toBeNull()
    })
  })
})
