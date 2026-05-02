import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// ---------------------------------------------------------------------------
// Mocks via vi.hoisted
// ---------------------------------------------------------------------------

const {
  mockFrom,
  mockChannel,
  mockMutateEdit,
  mockMutateDiscard,
  mockMutateReAdd,
} = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockChannel: vi.fn(),
  mockMutateEdit: vi.fn(),
  mockMutateDiscard: vi.fn(),
  mockMutateReAdd: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: mockFrom,
    channel: mockChannel.mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
    removeChannel: vi.fn(),
  }),
}))

// Mock the mutations hook — unit tests for this component test rendering + user interactions,
// not the actual Supabase calls.
vi.mock('@/hooks/use-inventory-mutations', () => ({
  useEditInventoryItem: () => ({
    mutate: mockMutateEdit,
    isPending: false,
  }),
  useDiscardItem: () => ({
    mutate: mockMutateDiscard,
    isPending: false,
  }),
  useReAddToGroceryList: () => ({
    mutate: mockMutateReAdd,
    isPending: false,
  }),
  usePurchaseHistoryCount: () => ({
    data: 5,
  }),
}))

// Mock shared utils
vi.mock('@fridge-manager/shared', () => ({
  getExpirationColor: vi.fn((date: Date | null) => {
    if (date === null) return null
    const diffMs = date.getTime() - Date.now()
    const days = Math.ceil(diffMs / 86400000)
    if (days <= 0) return 'red'
    if (days <= 3) return 'yellow'
    return 'green'
  }),
  getDaysSince: vi.fn((date: Date) => {
    return Math.floor((Date.now() - date.getTime()) / 86400000)
  }),
  formatPurchaseHistory: vi.fn((count: number) => {
    if (count <= 0) return 'No purchase history'
    if (count === 1) return 'Bought once before'
    return `Bought ${count} times before`
  }),
  formatRelativeTime: vi.fn(() => '2 hours ago'),
  getOppositeReason: (reason: string | null) => {
    if (reason === 'consumed') return { label: 'Change to Tossed', newReason: 'wasted' }
    return { label: 'Change to Used', newReason: 'consumed' }
  },
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// ---------------------------------------------------------------------------
// Import component after mocks
// ---------------------------------------------------------------------------

import { ItemDetailSheet } from '@/components/inventory/item-detail-sheet'

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
const threeDaysFromNow = new Date(now.getTime() + 3 * 86400000)
const twoDaysAgo = new Date(now.getTime() - 2 * 86400000)

const makeItem = (overrides = {}) => ({
  id: 'item-1',
  household_id: 'hh-1',
  name: 'Chicken breast',
  quantity: '2 lbs',
  category_id: 'cat-1',
  location: 'fridge' as const,
  expiration_date: threeDaysFromNow.toISOString().split('T')[0],
  expiration_source: 'default' as const,
  added_by: 'user-1',
  added_at: now.toISOString(),
  updated_at: now.toISOString(),
  discarded_at: null,
  discard_reason: null,
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

describe('ItemDetailSheet', () => {
  const defaultProps = {
    item: makeItem(),
    open: true,
    onClose: vi.fn(),
    userId: 'user-1',
    householdId: 'hh-1',
  }

  it('renders item name and category emoji', () => {
    render(<ItemDetailSheet {...defaultProps} />, { wrapper: createWrapper() })
    expect(screen.getByText('Chicken breast')).toBeDefined()
    expect(screen.getByText('🥩')).toBeDefined()
  })

  it('renders category name and quantity in description', () => {
    render(<ItemDetailSheet {...defaultProps} />, { wrapper: createWrapper() })
    expect(screen.getByText('meat')).toBeDefined()
    expect(screen.getByText('2 lbs')).toBeDefined()
  })

  it('renders location badge', () => {
    render(<ItemDetailSheet {...defaultProps} />, { wrapper: createWrapper() })
    expect(screen.getByText(/Fridge/)).toBeDefined()
  })

  it('renders expiration badge', () => {
    render(<ItemDetailSheet {...defaultProps} />, { wrapper: createWrapper() })
    const badge = screen.getByLabelText(/Expiration:/)
    expect(badge).toBeDefined()
  })

  it('renders "Added today" for recent items', () => {
    render(<ItemDetailSheet {...defaultProps} />, { wrapper: createWrapper() })
    expect(screen.getByText(/Added today by Teo/)).toBeDefined()
  })

  it('renders purchase history', () => {
    render(<ItemDetailSheet {...defaultProps} />, { wrapper: createWrapper() })
    expect(screen.getByText('Bought 5 times before')).toBeDefined()
  })

  it('renders all 4 action buttons', () => {
    render(<ItemDetailSheet {...defaultProps} />, { wrapper: createWrapper() })
    expect(screen.getByLabelText('Edit item')).toBeDefined()
    expect(screen.getByLabelText('Add to grocery list')).toBeDefined()
    expect(screen.getByLabelText('Mark as used')).toBeDefined()
    expect(screen.getByLabelText('Mark as tossed')).toBeDefined()
  })

  it('returns null when item is null', () => {
    const { container } = render(
      <ItemDetailSheet {...defaultProps} item={null} />,
      { wrapper: createWrapper() }
    )
    // Sheet should not render meaningful content
    expect(container.querySelector('[data-slot="sheet-content"]')).toBeNull()
  })

  describe('Edit mode', () => {
    it('shows edit form when Edit button is clicked', async () => {
      const user = userEvent.setup()
      render(<ItemDetailSheet {...defaultProps} />, { wrapper: createWrapper() })

      await user.click(screen.getByLabelText('Edit item'))

      expect(screen.getByLabelText('Name')).toBeDefined()
      expect(screen.getByLabelText('Quantity')).toBeDefined()
      expect(screen.getByLabelText('Expiration Date')).toBeDefined()
    })

    it('pre-fills edit form with current values', async () => {
      const user = userEvent.setup()
      render(<ItemDetailSheet {...defaultProps} />, { wrapper: createWrapper() })

      await user.click(screen.getByLabelText('Edit item'))

      const nameInput = screen.getByLabelText('Name') as HTMLInputElement
      expect(nameInput.value).toBe('Chicken breast')

      const qtyInput = screen.getByLabelText('Quantity') as HTMLInputElement
      expect(qtyInput.value).toBe('2 lbs')
    })

    it('calls edit mutation on Save', async () => {
      const user = userEvent.setup()
      render(<ItemDetailSheet {...defaultProps} />, { wrapper: createWrapper() })

      await user.click(screen.getByLabelText('Edit item'))

      // Change name
      const nameInput = screen.getByLabelText('Name')
      await user.clear(nameInput)
      await user.type(nameInput, 'Salmon fillet')

      await user.click(screen.getByText('Save'))

      expect(mockMutateEdit).toHaveBeenCalledTimes(1)
      expect(mockMutateEdit.mock.calls[0][0]).toMatchObject({
        itemId: 'item-1',
        householdId: 'hh-1',
        updates: expect.objectContaining({ name: 'Salmon fillet' }),
      })
    })

    it('hides edit form on Cancel', async () => {
      const user = userEvent.setup()
      render(<ItemDetailSheet {...defaultProps} />, { wrapper: createWrapper() })

      await user.click(screen.getByLabelText('Edit item'))
      expect(screen.getByLabelText('Name')).toBeDefined()

      await user.click(screen.getByText('Cancel'))
      expect(screen.queryByLabelText('Name')).toBeNull()
    })
  })

  describe('Discard actions', () => {
    it('"Used it" calls discard with reason consumed', async () => {
      const user = userEvent.setup()
      render(<ItemDetailSheet {...defaultProps} />, { wrapper: createWrapper() })

      await user.click(screen.getByLabelText('Mark as used'))

      expect(mockMutateDiscard).toHaveBeenCalledTimes(1)
      expect(mockMutateDiscard.mock.calls[0][0]).toMatchObject({
        itemId: 'item-1',
        householdId: 'hh-1',
        reason: 'consumed',
      })
    })

    it('"Tossed it" with non-expired item sets reason wasted', async () => {
      const user = userEvent.setup()
      render(<ItemDetailSheet {...defaultProps} />, { wrapper: createWrapper() })

      await user.click(screen.getByLabelText('Mark as tossed'))

      expect(mockMutateDiscard).toHaveBeenCalledTimes(1)
      expect(mockMutateDiscard.mock.calls[0][0]).toMatchObject({
        reason: 'wasted',
      })
    })

    it('"Tossed it" with expired item auto-detects reason expired', async () => {
      const user = userEvent.setup()
      const expiredItem = makeItem({
        expiration_date: twoDaysAgo.toISOString().split('T')[0],
      })
      render(
        <ItemDetailSheet {...defaultProps} item={expiredItem} />,
        { wrapper: createWrapper() }
      )

      await user.click(screen.getByLabelText('Mark as tossed'))

      expect(mockMutateDiscard).toHaveBeenCalledTimes(1)
      expect(mockMutateDiscard.mock.calls[0][0]).toMatchObject({
        reason: 'expired',
      })
    })
  })

  describe('Add to grocery list', () => {
    it('calls reAdd mutation when Add to List is clicked', async () => {
      const user = userEvent.setup()
      render(<ItemDetailSheet {...defaultProps} />, { wrapper: createWrapper() })

      await user.click(screen.getByLabelText('Add to grocery list'))

      expect(mockMutateReAdd).toHaveBeenCalledTimes(1)
      expect(mockMutateReAdd.mock.calls[0][0]).toMatchObject({
        name: 'Chicken breast',
        quantity: '2 lbs',
        categoryId: 'cat-1',
        destination: 'fridge',
        householdId: 'hh-1',
        addedBy: 'user-1',
      })
    })
  })
})
