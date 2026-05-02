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
  mockMutateAddItem,
  mockAddItemIsPending,
} = vi.hoisted(() => ({
  mockMutateAddItem: vi.fn(),
  mockAddItemIsPending: { value: false },
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'new-item-1' }, error: null }),
        }),
      }),
    }),
  }),
}))

vi.mock('@/hooks/use-categories', () => ({
  useCategories: () => ({
    data: [
      {
        id: 'cat-produce',
        name: 'Produce',
        emoji: '🥬',
        display_order: 1,
        has_expiration: true,
        default_destination: 'fridge',
      },
      {
        id: 'cat-dairy',
        name: 'Dairy',
        emoji: '🥛',
        display_order: 2,
        has_expiration: true,
        default_destination: 'fridge',
      },
      {
        id: 'cat-frozen',
        name: 'Frozen',
        emoji: '🧊',
        display_order: 3,
        has_expiration: true,
        default_destination: 'freezer',
      },
    ],
    isLoading: false,
  }),
}))

vi.mock('@/hooks/use-inventory-mutations', () => ({
  useAddInventoryItem: () => ({
    mutate: mockMutateAddItem,
    isPending: mockAddItemIsPending.value,
  }),
  useEditInventoryItem: () => ({ mutate: vi.fn(), isPending: false }),
  useDiscardItem: () => ({ mutate: vi.fn(), isPending: false }),
  useReAddToGroceryList: () => ({ mutate: vi.fn(), isPending: false }),
  usePurchaseHistoryCount: () => ({ data: 0 }),
  useRestoreItem: () => ({ mutate: vi.fn(), isPending: false }),
  useChangeDiscardReason: () => ({ mutate: vi.fn(), isPending: false }),
}))

vi.mock('@fridge-manager/shared', () => ({
  formatRelativeTime: vi.fn(() => '2 hours ago'),
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

import { QuickAddSheet } from '@/components/inventory/quick-add-sheet'

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

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  householdId: 'hh-1',
  userId: 'user-1',
  activeLocation: 'fridge' as const,
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
  mockAddItemIsPending.value = false
})

describe('QuickAddSheet', () => {
  // -----------------------------------------------------------------------
  // Rendering
  // -----------------------------------------------------------------------

  it('renders the sheet with title and form fields', () => {
    render(<QuickAddSheet {...defaultProps} />, { wrapper: createWrapper() })

    expect(screen.getByText('Quick Add')).toBeDefined()
    expect(screen.getByLabelText(/item name/i)).toBeDefined()
    expect(screen.getByLabelText(/quantity/i)).toBeDefined()
  })

  it('renders category picker with options', async () => {
    const user = userEvent.setup()
    render(<QuickAddSheet {...defaultProps} />, { wrapper: createWrapper() })

    // Open category selector
    const categoryTrigger = screen.getByRole('combobox', { name: /category/i })
    await user.click(categoryTrigger)

    // All categories should be listed
    await expect(screen.getByText('Produce')).toBeDefined()
    await expect(screen.getByText('Dairy')).toBeDefined()
    await expect(screen.getByText('Frozen')).toBeDefined()
  })

  it('renders location selector with fridge/freezer/pantry', async () => {
    const user = userEvent.setup()
    render(<QuickAddSheet {...defaultProps} />, { wrapper: createWrapper() })

    const locationTrigger = screen.getByRole('combobox', { name: /location/i })
    await user.click(locationTrigger)

    await expect(screen.getByText(/Fridge/)).toBeDefined()
    await expect(screen.getByText(/Freezer/)).toBeDefined()
    await expect(screen.getByText(/Pantry/)).toBeDefined()
  })

  it('pre-selects the active location from inventory tab', () => {
    render(
      <QuickAddSheet {...defaultProps} activeLocation="freezer" />,
      { wrapper: createWrapper() },
    )

    // The location selector should reflect the active tab's location
    const locationTrigger = screen.getByRole('combobox', { name: /location/i })
    // SelectValue renders the option's value text, which contains 'Freezer' in the label
    expect(locationTrigger.textContent?.toLowerCase()).toContain('freezer')
  })

  it('renders expiration date input', () => {
    render(<QuickAddSheet {...defaultProps} />, { wrapper: createWrapper() })

    expect(screen.getByLabelText(/expiration/i)).toBeDefined()
  })

  // -----------------------------------------------------------------------
  // Form validation
  // -----------------------------------------------------------------------

  it('disables submit button when name is empty', () => {
    render(<QuickAddSheet {...defaultProps} />, { wrapper: createWrapper() })

    const submitButton = screen.getByRole('button', { name: /add to inventory/i })
    expect(submitButton).toHaveProperty('disabled', true)
  })

  it('disables submit button when category is not selected', async () => {
    const user = userEvent.setup()
    render(<QuickAddSheet {...defaultProps} />, { wrapper: createWrapper() })

    // Type a name but don't pick a category
    await user.type(screen.getByLabelText(/item name/i), 'Bananas')

    const submitButton = screen.getByRole('button', { name: /add to inventory/i })
    expect(submitButton).toHaveProperty('disabled', true)
  })

  it('enables submit button when name and category are filled', async () => {
    const user = userEvent.setup()
    render(<QuickAddSheet {...defaultProps} />, { wrapper: createWrapper() })

    // Fill name
    await user.type(screen.getByLabelText(/item name/i), 'Bananas')

    // Pick category
    const categoryTrigger = screen.getByRole('combobox', { name: /category/i })
    await user.click(categoryTrigger)
    await user.click(screen.getByText('Produce'))

    const submitButton = screen.getByRole('button', { name: /add to inventory/i })
    expect(submitButton).toHaveProperty('disabled', false)
  })

  it('enforces maxLength on name input (200 chars)', () => {
    render(<QuickAddSheet {...defaultProps} />, { wrapper: createWrapper() })

    const nameInput = screen.getByLabelText(/item name/i)
    expect(nameInput.getAttribute('maxLength')).toBe('200')
  })

  it('enforces maxLength on quantity input (50 chars)', () => {
    render(<QuickAddSheet {...defaultProps} />, { wrapper: createWrapper() })

    const qtyInput = screen.getByLabelText(/quantity/i)
    expect(qtyInput.getAttribute('maxLength')).toBe('50')
  })

  // -----------------------------------------------------------------------
  // Submission
  // -----------------------------------------------------------------------

  it('calls addItem mutation with correct payload on submit', async () => {
    const user = userEvent.setup()
    render(<QuickAddSheet {...defaultProps} />, { wrapper: createWrapper() })

    // Fill form
    await user.type(screen.getByLabelText(/item name/i), 'Strawberries')
    await user.type(screen.getByLabelText(/quantity/i), '1 lb')

    // Pick category
    const categoryTrigger = screen.getByRole('combobox', { name: /category/i })
    await user.click(categoryTrigger)
    await user.click(screen.getByText('Produce'))

    // Submit
    const submitButton = screen.getByRole('button', { name: /add to inventory/i })
    await user.click(submitButton)

    expect(mockMutateAddItem).toHaveBeenCalledTimes(1)
    expect(mockMutateAddItem.mock.calls[0][0]).toMatchObject({
      name: 'Strawberries',
      quantity: '1 lb',
      categoryId: 'cat-produce',
      location: 'fridge',
      householdId: 'hh-1',
      userId: 'user-1',
    })
  })

  it('sends null quantity when quantity field is empty', async () => {
    const user = userEvent.setup()
    render(<QuickAddSheet {...defaultProps} />, { wrapper: createWrapper() })

    await user.type(screen.getByLabelText(/item name/i), 'Milk')

    const categoryTrigger = screen.getByRole('combobox', { name: /category/i })
    await user.click(categoryTrigger)
    await user.click(screen.getByText('Dairy'))

    const submitButton = screen.getByRole('button', { name: /add to inventory/i })
    await user.click(submitButton)

    expect(mockMutateAddItem.mock.calls[0][0]).toMatchObject({
      name: 'Milk',
      quantity: null,
    })
  })

  it('includes expiration date in payload when set', async () => {
    const user = userEvent.setup()
    render(<QuickAddSheet {...defaultProps} />, { wrapper: createWrapper() })

    await user.type(screen.getByLabelText(/item name/i), 'Yogurt')

    const categoryTrigger = screen.getByRole('combobox', { name: /category/i })
    await user.click(categoryTrigger)
    await user.click(screen.getByText('Dairy'))

    // Set expiration date
    const expirationInput = screen.getByLabelText(/expiration/i)
    await user.type(expirationInput, '2026-06-15')

    const submitButton = screen.getByRole('button', { name: /add to inventory/i })
    await user.click(submitButton)

    expect(mockMutateAddItem.mock.calls[0][0]).toMatchObject({
      expirationDate: '2026-06-15',
    })
  })

  it('sends null expiration when date field is empty', async () => {
    const user = userEvent.setup()
    render(<QuickAddSheet {...defaultProps} />, { wrapper: createWrapper() })

    await user.type(screen.getByLabelText(/item name/i), 'Lettuce')

    const categoryTrigger = screen.getByRole('combobox', { name: /category/i })
    await user.click(categoryTrigger)
    await user.click(screen.getByText('Produce'))

    const submitButton = screen.getByRole('button', { name: /add to inventory/i })
    await user.click(submitButton)

    expect(mockMutateAddItem.mock.calls[0][0]).toMatchObject({
      expirationDate: null,
    })
  })

  it('trims whitespace from name before submitting', async () => {
    const user = userEvent.setup()
    render(<QuickAddSheet {...defaultProps} />, { wrapper: createWrapper() })

    await user.type(screen.getByLabelText(/item name/i), '  Apples  ')

    const categoryTrigger = screen.getByRole('combobox', { name: /category/i })
    await user.click(categoryTrigger)
    await user.click(screen.getByText('Produce'))

    const submitButton = screen.getByRole('button', { name: /add to inventory/i })
    await user.click(submitButton)

    expect(mockMutateAddItem.mock.calls[0][0].name).toBe('Apples')
  })

  // -----------------------------------------------------------------------
  // Pending state
  // -----------------------------------------------------------------------

  it('disables submit button while mutation is pending', () => {
    mockAddItemIsPending.value = true
    render(<QuickAddSheet {...defaultProps} />, { wrapper: createWrapper() })

    const submitButton = screen.getByRole('button', { name: /add to inventory/i })
    expect(submitButton).toHaveProperty('disabled', true)
  })

  // -----------------------------------------------------------------------
  // Sheet closing
  // -----------------------------------------------------------------------

  it('does not render form when open is false', () => {
    render(
      <QuickAddSheet {...defaultProps} open={false} />,
      { wrapper: createWrapper() },
    )

    expect(screen.queryByText('Quick Add')).toBeNull()
  })
})
