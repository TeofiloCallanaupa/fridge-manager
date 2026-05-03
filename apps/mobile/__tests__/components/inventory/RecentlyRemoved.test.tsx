import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { PaperProvider } from 'react-native-paper'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RecentlyRemoved } from '../../../components/inventory/RecentlyRemoved'
import type { InventoryItemWithDetails } from '../../../hooks/use-inventory-items'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockRestoreMutate = jest.fn()
const mockChangeReasonMutate = jest.fn()

jest.mock('../../../hooks/use-inventory-mutations', () => ({
  useRestoreItem: () => ({
    mutate: mockRestoreMutate,
    isPending: false,
  }),
  useChangeDiscardReason: () => ({
    mutate: mockChangeReasonMutate,
    isPending: false,
  }),
}))

jest.mock('../../../lib/supabase', () => ({
  supabase: {},
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = createQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <PaperProvider>{ui}</PaperProvider>
    </QueryClientProvider>
  )
}

const NOW = Date.now()

/** Item discarded 30 minutes ago — should show Undo */
const RECENT_ITEM: InventoryItemWithDetails = {
  id: 'inv-recent',
  name: 'Greek yogurt',
  quantity: '1 container',
  category_id: 'cat-dairy',
  household_id: 'hh-1',
  location: 'fridge',
  added_by: 'user-1',
  added_at: new Date(NOW - 3 * 24 * 60 * 60 * 1000).toISOString(),
  expiration_date: null,
  expiration_source: null,
  source: 'grocery_checkout',
  discarded_at: new Date(NOW - 30 * 60 * 1000).toISOString(), // 30 min ago
  discard_reason: 'consumed',
  updated_at: new Date(NOW - 30 * 60 * 1000).toISOString(),
  categories: { name: 'Dairy', emoji: '🥛', has_expiration: true },
  profiles: { display_name: 'Emilia' },
}

/** Item discarded 3 hours ago — should NOT show Undo */
const OLD_ITEM: InventoryItemWithDetails = {
  id: 'inv-old',
  name: 'Leftover pasta',
  quantity: null,
  category_id: 'cat-prepared',
  household_id: 'hh-1',
  location: 'fridge',
  added_by: 'user-2',
  added_at: new Date(NOW - 5 * 24 * 60 * 60 * 1000).toISOString(),
  expiration_date: null,
  expiration_source: null,
  source: 'manual',
  discarded_at: new Date(NOW - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
  discard_reason: 'wasted',
  updated_at: new Date(NOW - 3 * 60 * 60 * 1000).toISOString(),
  categories: { name: 'Prepared', emoji: '🍝', has_expiration: true },
  profiles: { display_name: 'Teo' },
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RecentlyRemoved', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders section header and item names', () => {
    const { getByText } = renderWithProviders(
      <RecentlyRemoved items={[RECENT_ITEM, OLD_ITEM]} householdId="hh-1" />
    )

    expect(getByText('Recently Removed')).toBeTruthy()
    expect(getByText('Last 7 days')).toBeTruthy()
    expect(getByText('Greek yogurt')).toBeTruthy()
    expect(getByText('Leftover pasta')).toBeTruthy()
  })

  it('returns null when items array is empty', () => {
    const { queryByText } = renderWithProviders(
      <RecentlyRemoved items={[]} householdId="hh-1" />
    )

    expect(queryByText('Recently Removed')).toBeNull()
  })

  it('shows Undo button for items discarded < 1 hour ago', () => {
    const { getByTestId, queryByTestId } = renderWithProviders(
      <RecentlyRemoved items={[RECENT_ITEM, OLD_ITEM]} householdId="hh-1" />
    )

    // Recent item should have Undo
    expect(getByTestId(`undo-${RECENT_ITEM.id}`)).toBeTruthy()
    // Old item should NOT have Undo
    expect(queryByTestId(`undo-${OLD_ITEM.id}`)).toBeNull()
  })

  it('calls restore mutation when Undo is pressed', () => {
    const { getByTestId } = renderWithProviders(
      <RecentlyRemoved items={[RECENT_ITEM]} householdId="hh-1" />
    )

    fireEvent.press(getByTestId(`undo-${RECENT_ITEM.id}`))

    expect(mockRestoreMutate).toHaveBeenCalledWith({
      itemId: RECENT_ITEM.id,
      householdId: 'hh-1',
    })
  })

  it('shows correction panel when item card is tapped', () => {
    const { getByTestId } = renderWithProviders(
      <RecentlyRemoved items={[OLD_ITEM]} householdId="hh-1" />
    )

    // Tap the item card to expand
    fireEvent.press(getByTestId(`removed-item-${OLD_ITEM.id}`))

    // Correction buttons should appear
    expect(getByTestId(`change-reason-${OLD_ITEM.id}`)).toBeTruthy()
    expect(getByTestId(`restore-${OLD_ITEM.id}`)).toBeTruthy()
  })

  it('calls change reason mutation from correction panel', () => {
    const { getByTestId } = renderWithProviders(
      <RecentlyRemoved items={[OLD_ITEM]} householdId="hh-1" />
    )

    // Expand
    fireEvent.press(getByTestId(`removed-item-${OLD_ITEM.id}`))
    // Change reason (wasted → consumed)
    fireEvent.press(getByTestId(`change-reason-${OLD_ITEM.id}`))

    expect(mockChangeReasonMutate).toHaveBeenCalledWith({
      itemId: OLD_ITEM.id,
      householdId: 'hh-1',
      newReason: 'consumed', // getOppositeReason('wasted') → 'consumed'
    })
  })

  it('calls restore mutation from correction panel', () => {
    const { getByTestId } = renderWithProviders(
      <RecentlyRemoved items={[OLD_ITEM]} householdId="hh-1" />
    )

    // Expand
    fireEvent.press(getByTestId(`removed-item-${OLD_ITEM.id}`))
    // Restore
    fireEvent.press(getByTestId(`restore-${OLD_ITEM.id}`))

    expect(mockRestoreMutate).toHaveBeenCalledWith({
      itemId: OLD_ITEM.id,
      householdId: 'hh-1',
    })
  })

  it('collapses correction panel when tapped again', () => {
    const { getByTestId, queryByTestId } = renderWithProviders(
      <RecentlyRemoved items={[OLD_ITEM]} householdId="hh-1" />
    )

    // Expand
    fireEvent.press(getByTestId(`removed-item-${OLD_ITEM.id}`))
    expect(getByTestId(`restore-${OLD_ITEM.id}`)).toBeTruthy()

    // Collapse
    fireEvent.press(getByTestId(`removed-item-${OLD_ITEM.id}`))
    expect(queryByTestId(`restore-${OLD_ITEM.id}`)).toBeNull()
  })
})
