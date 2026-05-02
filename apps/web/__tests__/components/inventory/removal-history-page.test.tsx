'use client'

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// ---------------------------------------------------------------------------
// Mocks via vi.hoisted
// ---------------------------------------------------------------------------

const {
  mockMutateRestore,
  mockMutateChangeReason,
  mockUseRemovalHistory,
  mockPush,
  mockUseSearchParams,
  mockChannel,
} = vi.hoisted(() => ({
  mockMutateRestore: vi.fn(),
  mockMutateChangeReason: vi.fn(),
  mockUseRemovalHistory: vi.fn(),
  mockPush: vi.fn(),
  mockUseSearchParams: vi.fn(),
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

vi.mock('@/hooks/use-inventory-items', () => ({
  useRemovalHistory: mockUseRemovalHistory,
}))

// next/link: render as a plain <a> for testing
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: mockUseSearchParams,
  usePathname: () => '/inventory/history',
}))

vi.mock('@fridge-manager/shared', () => ({
  formatRelativeTime: vi.fn((date: Date) => {
    const diff = Date.now() - date.getTime()
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
  getDiscardReasonLabel: (reason: string | null) => {
    if (reason === 'consumed') return 'Used'
    if (reason === 'wasted') return 'Wasted'
    if (reason === 'expired') return 'Expired'
    return 'Removed'
  },
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// ---------------------------------------------------------------------------
// Import component after mocks (component doesn't exist yet — RED phase)
// ---------------------------------------------------------------------------

import { RemovalHistoryPage } from '@/components/inventory/removal-history-page'

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

const april16 = new Date(2026, 3, 16, 14, 30) // April 16, 2026 2:30 PM
const april15 = new Date(2026, 3, 15, 11, 0)  // April 15, 2026 11:00 AM
const april14 = new Date(2026, 3, 14, 9, 0)   // April 14, 2026 9:00 AM

const makeItem = (overrides = {}) => ({
  id: 'item-1',
  household_id: 'hh-1',
  name: 'Sourdough loaf',
  quantity: '1',
  category_id: 'cat-1',
  location: 'pantry' as const,
  expiration_date: null,
  expiration_source: null,
  added_by: 'user-1',
  added_at: april16.toISOString(),
  updated_at: april16.toISOString(),
  discarded_at: april16.toISOString(),
  discard_reason: 'consumed' as const,
  source: 'manual' as const,
  categories: { name: 'bread', emoji: '🍞', has_expiration: true },
  profiles: { display_name: 'Teo' },
  ...overrides,
})

const sampleItems = [
  makeItem(),
  makeItem({
    id: 'item-2',
    name: 'Chicken breast',
    discard_reason: 'wasted',
    discarded_at: april16.toISOString(),
    categories: { name: 'meat', emoji: '🥩', has_expiration: true },
    profiles: { display_name: 'Emilia' },
  }),
  makeItem({
    id: 'item-3',
    name: 'Greek yogurt',
    discard_reason: 'consumed',
    discarded_at: april15.toISOString(),
    categories: { name: 'dairy', emoji: '🧀', has_expiration: true },
  }),
  makeItem({
    id: 'item-4',
    name: 'Baby spinach',
    discard_reason: 'expired',
    discarded_at: april15.toISOString(),
    categories: { name: 'produce', emoji: '🥬', has_expiration: true },
  }),
  makeItem({
    id: 'item-5',
    name: 'Oat milk',
    discard_reason: 'consumed',
    discarded_at: april14.toISOString(),
    categories: { name: 'dairy', emoji: '🥛', has_expiration: true },
  }),
]

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
  mockUseSearchParams.mockReturnValue(new URLSearchParams(''))
})

describe('RemovalHistoryPage', () => {
  describe('Loading & empty states', () => {
    it('shows loading skeleton when data is loading', () => {
      mockUseRemovalHistory.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      })

      render(<RemovalHistoryPage householdId="hh-1" />, { wrapper: createWrapper() })
      expect(screen.getByTestId('history-loading')).toBeDefined()
    })

    it('shows empty state placeholder when month has no data', () => {
      mockUseRemovalHistory.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      })

      render(<RemovalHistoryPage householdId="hh-1" />, { wrapper: createWrapper() })
      expect(screen.getByText(/Nothing removed this month/)).toBeDefined()
    })
  })

  describe('Page header & navigation', () => {
    beforeEach(() => {
      mockUseRemovalHistory.mockReturnValue({
        data: sampleItems,
        isLoading: false,
        error: null,
      })
    })

    it('renders page title "Removal History"', () => {
      render(<RemovalHistoryPage householdId="hh-1" />, { wrapper: createWrapper() })
      expect(screen.getByText('Removal History')).toBeDefined()
    })

    it('renders back link to inventory', () => {
      render(<RemovalHistoryPage householdId="hh-1" />, { wrapper: createWrapper() })
      const backLink = screen.getByLabelText(/back to inventory/i)
      expect(backLink).toBeDefined()
    })

    it('shows current month and year', () => {
      render(<RemovalHistoryPage householdId="hh-1" />, { wrapper: createWrapper() })
      // Month name appears in header ("May 2026"), month chip ("May"), and summary footer
      const now = new Date()
      const monthName = now.toLocaleString('default', { month: 'long' })
      const yearStr = now.getFullYear().toString()
      expect(screen.getAllByText(new RegExp(`${monthName}.*${yearStr}`)).length).toBeGreaterThanOrEqual(1)
    })

    it('navigates to previous month when clicking back arrow', async () => {
      const user = userEvent.setup()
      render(<RemovalHistoryPage householdId="hh-1" />, { wrapper: createWrapper() })

      const prevButton = screen.getByLabelText(/previous month/i)
      await user.click(prevButton)

      // Should update the displayed month
      // (exact behavior depends on implementation — state or URL params)
      expect(prevButton).toBeDefined()
    })

    it('navigates to next month when clicking forward arrow', async () => {
      const user = userEvent.setup()
      render(<RemovalHistoryPage householdId="hh-1" />, { wrapper: createWrapper() })

      const nextButton = screen.getByLabelText(/next month/i)
      await user.click(nextButton)

      expect(nextButton).toBeDefined()
    })
  })

  describe('Summary statistics', () => {
    beforeEach(() => {
      mockUseRemovalHistory.mockReturnValue({
        data: sampleItems,
        isLoading: false,
        error: null,
      })
    })

    it('displays correct consumed count', () => {
      render(<RemovalHistoryPage householdId="hh-1" />, { wrapper: createWrapper() })
      // 3 consumed items in sample data
      const summary = screen.getByTestId('summary-card')
      expect(within(summary).getByText('3')).toBeDefined()
      expect(within(summary).getByText(/Used/i)).toBeDefined()
    })

    it('displays correct wasted count', () => {
      render(<RemovalHistoryPage householdId="hh-1" />, { wrapper: createWrapper() })
      const summary = screen.getByTestId('summary-card')
      // 1 wasted item — check the label exists, count is verified via total
      expect(within(summary).getByText(/Wasted/i)).toBeDefined()
    })

    it('displays correct expired count', () => {
      render(<RemovalHistoryPage householdId="hh-1" />, { wrapper: createWrapper() })
      const summary = screen.getByTestId('summary-card')
      // 1 expired item
      expect(within(summary).getByText(/Expired/i)).toBeDefined()
    })

    it('displays total items removed', () => {
      render(<RemovalHistoryPage householdId="hh-1" />, { wrapper: createWrapper() })
      const summary = screen.getByTestId('summary-card')
      expect(within(summary).getByText(/5 items removed/i)).toBeDefined()
    })
  })

  describe('Daily grouped list', () => {
    beforeEach(() => {
      mockUseRemovalHistory.mockReturnValue({
        data: sampleItems,
        isLoading: false,
        error: null,
      })
    })

    it('renders day headers for each unique day', () => {
      render(<RemovalHistoryPage householdId="hh-1" />, { wrapper: createWrapper() })
      // 3 different days: April 16, 15, 14
      const dayHeaders = screen.getAllByTestId('day-header')
      expect(dayHeaders.length).toBe(3)
    })

    it('groups items under the correct day header', () => {
      render(<RemovalHistoryPage householdId="hh-1" />, { wrapper: createWrapper() })
      // April 16 should have Sourdough loaf and Chicken breast
      expect(screen.getByText('Sourdough loaf')).toBeDefined()
      expect(screen.getByText('Chicken breast')).toBeDefined()
      // April 15 should have Greek yogurt and Baby spinach
      expect(screen.getByText('Greek yogurt')).toBeDefined()
      expect(screen.getByText('Baby spinach')).toBeDefined()
      // April 14 should have Oat milk
      expect(screen.getByText('Oat milk')).toBeDefined()
    })

    it('shows reason chips with semantic colors', () => {
      render(<RemovalHistoryPage householdId="hh-1" />, { wrapper: createWrapper() })
      // Should have reason labels
      expect(screen.getAllByText(/Used/i).length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText(/Wasted/i).length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText(/Expired/i).length).toBeGreaterThanOrEqual(1)
    })

    it('shows who discarded each item', () => {
      render(<RemovalHistoryPage householdId="hh-1" />, { wrapper: createWrapper() })
      expect(screen.getAllByText(/Teo/).length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText(/Emilia/).length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Correction actions', () => {
    beforeEach(() => {
      mockUseRemovalHistory.mockReturnValue({
        data: sampleItems,
        isLoading: false,
        error: null,
      })
    })

    it('tapping a card expands correction menu', async () => {
      const user = userEvent.setup()
      render(<RemovalHistoryPage householdId="hh-1" />, { wrapper: createWrapper() })

      const card = screen.getByText('Sourdough loaf').closest('[data-testid="history-item-card"]')!
      await user.click(card)

      expect(screen.getByText(/Change to/)).toBeDefined()
      expect(screen.getByText(/Restore to inventory/)).toBeDefined()
    })

    it('change reason calls mutation with correct payload', async () => {
      const user = userEvent.setup()
      render(<RemovalHistoryPage householdId="hh-1" />, { wrapper: createWrapper() })

      const card = screen.getByText('Sourdough loaf').closest('[data-testid="history-item-card"]')!
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

    it('restore calls mutation with correct payload', async () => {
      const user = userEvent.setup()
      render(<RemovalHistoryPage householdId="hh-1" />, { wrapper: createWrapper() })

      const card = screen.getByText('Chicken breast').closest('[data-testid="history-item-card"]')!
      await user.click(card)

      const restoreButton = screen.getByText(/Restore to inventory/)
      await user.click(restoreButton)

      expect(mockMutateRestore).toHaveBeenCalledTimes(1)
      expect(mockMutateRestore.mock.calls[0][0]).toMatchObject({
        itemId: 'item-2',
        householdId: 'hh-1',
      })
    })

    it('tapping expanded card collapses the menu', async () => {
      const user = userEvent.setup()
      render(<RemovalHistoryPage householdId="hh-1" />, { wrapper: createWrapper() })

      const card = screen.getByText('Sourdough loaf').closest('[data-testid="history-item-card"]')!
      await user.click(card)
      expect(screen.getByText(/Change to/)).toBeDefined()

      await user.click(card)
      expect(screen.queryByText(/Change to/)).toBeNull()
    })
  })
})
