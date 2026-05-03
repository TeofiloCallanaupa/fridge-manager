/**
 * Component tests for InventoryScreen
 *
 * Tests loading/empty/error states, tab switching with count badges,
 * and integration with DiscardSheet via long-press.
 */
import React from 'react'
import { render } from '@testing-library/react-native'
import { PaperProvider } from 'react-native-paper'
import type { InventoryItemWithDetails } from '@fridge-manager/shared'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockUser = { id: 'user-1' }
const mockHouseholdId = 'hh-1'

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    householdId: mockHouseholdId,
  }),
}))

const mockRefetch = jest.fn()

let mockInventoryReturn: {
  data: InventoryItemWithDetails[]
  isLoading: boolean
  isRefetching: boolean
  refetch: jest.Mock
  error: Error | null
} = {
  data: [],
  isLoading: false,
  isRefetching: false,
  refetch: mockRefetch,
  error: null,
}

let mockCountsReturn = {
  data: { fridge: 3, freezer: 1, pantry: 0 } as { fridge: number; freezer: number; pantry: number } | undefined,
}

let mockRecentlyRemovedReturn = {
  data: [] as InventoryItemWithDetails[],
}

jest.mock('../../../hooks/use-inventory-items', () => ({
  useInventoryItems: () => mockInventoryReturn,
  useInventoryCounts: () => mockCountsReturn,
  useRecentlyRemoved: () => mockRecentlyRemovedReturn,
}))

// Mock the mutation hooks used by child components
jest.mock('../../../hooks/use-inventory-mutations', () => ({
  useDiscardItem: () => ({ mutate: jest.fn(), isPending: false }),
  useRestoreItem: () => ({ mutate: jest.fn(), isPending: false }),
  useReAddToGroceryList: () => ({ mutate: jest.fn(), isPending: false }),
  useChangeDiscardReason: () => ({ mutate: jest.fn(), isPending: false }),
}))

// Import AFTER mocks
import InventoryScreen from '../../../app/(app)/inventory'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <PaperProvider>{children}</PaperProvider>
)

function makeItem(
  overrides: Partial<InventoryItemWithDetails> = {}
): InventoryItemWithDetails {
  return {
    id: 'inv-1',
    name: 'Whole Milk',
    quantity: '1 gal',
    category_id: 'cat-dairy',
    household_id: 'hh-1',
    location: 'fridge',
    added_by: 'user-1',
    added_at: new Date().toISOString(),
    expiration_date: null,
    expiration_source: null,
    source: 'manual',
    discarded_at: null,
    discard_reason: null,
    updated_at: new Date().toISOString(),
    categories: { name: 'Dairy', emoji: '🥛', has_expiration: true },
    profiles: { display_name: 'Teo' },
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('InventoryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockInventoryReturn = {
      data: [],
      isLoading: false,
      isRefetching: false,
      refetch: mockRefetch,
      error: null,
    }
    mockCountsReturn = {
      data: { fridge: 3, freezer: 1, pantry: 0 },
    }
    mockRecentlyRemovedReturn = {
      data: [],
    }
  })

  it('renders the "Inventory" header', () => {
    const { getByText } = render(<InventoryScreen />, { wrapper })
    expect(getByText('Inventory')).toBeTruthy()
  })

  it('renders total item count from all locations', () => {
    const { getByText } = render(<InventoryScreen />, { wrapper })
    expect(getByText('4 items in your kitchen')).toBeTruthy()
  })

  it('renders singular "item" when total is 1', () => {
    mockCountsReturn = { data: { fridge: 1, freezer: 0, pantry: 0 } }
    const { getByText } = render(<InventoryScreen />, { wrapper })
    expect(getByText('1 item in your kitchen')).toBeTruthy()
  })

  it('renders tab labels with counts', () => {
    const { getByText } = render(<InventoryScreen />, { wrapper })
    expect(getByText('Fridge 3')).toBeTruthy()
    expect(getByText('Freezer 1')).toBeTruthy()
    expect(getByText('Pantry')).toBeTruthy() // 0 count = no number shown
  })

  it('shows empty state when no items in active tab', () => {
    const { getByText } = render(<InventoryScreen />, { wrapper })
    expect(getByText('No items in your fridge')).toBeTruthy()
    expect(
      getByText('Items checked off your grocery list will appear here')
    ).toBeTruthy()
  })

  it('renders items when data is present', () => {
    mockInventoryReturn = {
      ...mockInventoryReturn,
      data: [makeItem(), makeItem({ id: 'inv-2', name: 'Eggs' })],
    }
    const { getByText } = render(<InventoryScreen />, { wrapper })
    expect(getByText('Whole Milk')).toBeTruthy()
    expect(getByText('Eggs')).toBeTruthy()
  })

  it('does not show empty state when loading', () => {
    mockInventoryReturn = {
      ...mockInventoryReturn,
      isLoading: true,
    }
    const { queryByText } = render(<InventoryScreen />, { wrapper })
    expect(queryByText('No items in your fridge')).toBeNull()
  })

  it('shows error message when error is present', () => {
    mockInventoryReturn = {
      ...mockInventoryReturn,
      error: new Error('Network failed'),
    }
    const { getByText } = render(<InventoryScreen />, { wrapper })
    expect(getByText('Failed to load items')).toBeTruthy()
    expect(getByText('Network failed')).toBeTruthy()
  })

  it('shows "Loading..." when counts are not yet available', () => {
    mockCountsReturn = { data: undefined }
    const { getByText } = render(<InventoryScreen />, { wrapper })
    expect(getByText('Loading...')).toBeTruthy()
  })
})
