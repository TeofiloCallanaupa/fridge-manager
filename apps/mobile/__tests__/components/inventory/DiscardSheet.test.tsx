import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import { PaperProvider } from 'react-native-paper'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DiscardSheet } from '../../../components/inventory/DiscardSheet'
import type { InventoryItemWithDetails } from '../../../hooks/use-inventory-items'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockDiscardMutate = jest.fn()
const mockReAddMutate = jest.fn()

jest.mock('../../../hooks/use-inventory-mutations', () => ({
  useDiscardItem: () => ({
    mutate: mockDiscardMutate,
    isPending: false,
  }),
  useReAddToGroceryList: () => ({
    mutate: mockReAddMutate,
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

const MOCK_ITEM: InventoryItemWithDetails = {
  id: 'inv-1',
  name: 'Chicken breast',
  quantity: '2 lbs',
  category_id: 'cat-meat',
  household_id: 'hh-1',
  location: 'fridge',
  added_by: 'user-1',
  added_at: new Date().toISOString(),
  expiration_date: null,
  expiration_source: null,
  source: 'grocery_checkout',
  discarded_at: null,
  discard_reason: null,
  updated_at: new Date().toISOString(),
  categories: { name: 'Meat', emoji: '🍗', has_expiration: true },
  profiles: { display_name: 'Teo' },
}

const EXPIRED_ITEM: InventoryItemWithDetails = {
  ...MOCK_ITEM,
  id: 'inv-2',
  name: 'Old milk',
  expiration_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  categories: { name: 'Dairy', emoji: '🥛', has_expiration: true },
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DiscardSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders item name and question when visible', () => {
    const { getByText } = renderWithProviders(
      <DiscardSheet
        item={MOCK_ITEM}
        visible={true}
        onDismiss={jest.fn()}
        userId="user-1"
        householdId="hh-1"
      />
    )

    expect(getByText('Chicken breast')).toBeTruthy()
    expect(getByText('What happened?')).toBeTruthy()
    expect(getByText('Used it')).toBeTruthy()
    expect(getByText('Tossed it')).toBeTruthy()
  })

  it('calls discard mutation with "consumed" when "Used it" is pressed', () => {
    const { getByTestId } = renderWithProviders(
      <DiscardSheet
        item={MOCK_ITEM}
        visible={true}
        onDismiss={jest.fn()}
        userId="user-1"
        householdId="hh-1"
      />
    )

    fireEvent.press(getByTestId('discard-used-button'))

    expect(mockDiscardMutate).toHaveBeenCalledWith(
      { itemId: 'inv-1', householdId: 'hh-1', reason: 'consumed' },
      expect.any(Object)
    )
  })

  it('calls discard mutation with "wasted" when item is not expired and "Tossed it" is pressed', () => {
    const { getByTestId } = renderWithProviders(
      <DiscardSheet
        item={MOCK_ITEM}
        visible={true}
        onDismiss={jest.fn()}
        userId="user-1"
        householdId="hh-1"
      />
    )

    fireEvent.press(getByTestId('discard-tossed-button'))

    expect(mockDiscardMutate).toHaveBeenCalledWith(
      { itemId: 'inv-1', householdId: 'hh-1', reason: 'wasted' },
      expect.any(Object)
    )
  })

  it('auto-detects "expired" reason when item is past expiration', () => {
    const { getByTestId } = renderWithProviders(
      <DiscardSheet
        item={EXPIRED_ITEM}
        visible={true}
        onDismiss={jest.fn()}
        userId="user-1"
        householdId="hh-1"
      />
    )

    fireEvent.press(getByTestId('discard-tossed-button'))

    expect(mockDiscardMutate).toHaveBeenCalledWith(
      { itemId: 'inv-2', householdId: 'hh-1', reason: 'expired' },
      expect.any(Object)
    )
  })

  it('shows restock step after successful discard', async () => {
    // Simulate successful discard by calling onSuccess
    mockDiscardMutate.mockImplementation((_input: unknown, opts: { onSuccess: () => void }) => {
      opts.onSuccess()
    })

    const { getByTestId, getByText } = renderWithProviders(
      <DiscardSheet
        item={MOCK_ITEM}
        visible={true}
        onDismiss={jest.fn()}
        userId="user-1"
        householdId="hh-1"
      />
    )

    fireEvent.press(getByTestId('discard-used-button'))

    await waitFor(() => {
      expect(getByText('Add to grocery list?')).toBeTruthy()
    })

    expect(getByTestId('restock-yes-button')).toBeTruthy()
    expect(getByTestId('restock-no-button')).toBeTruthy()
  })

  it('calls re-add mutation when "Yes, add it" is pressed', async () => {
    mockDiscardMutate.mockImplementation((_input: unknown, opts: { onSuccess: () => void }) => {
      opts.onSuccess()
    })

    const { getByTestId } = renderWithProviders(
      <DiscardSheet
        item={MOCK_ITEM}
        visible={true}
        onDismiss={jest.fn()}
        userId="user-1"
        householdId="hh-1"
      />
    )

    // Step 1: Discard
    fireEvent.press(getByTestId('discard-used-button'))

    // Step 2: Restock
    await waitFor(() => getByTestId('restock-yes-button'))
    fireEvent.press(getByTestId('restock-yes-button'))

    expect(mockReAddMutate).toHaveBeenCalledWith(
      {
        name: 'Chicken breast',
        quantity: '2 lbs',
        categoryId: 'cat-meat',
        destination: 'fridge',
        householdId: 'hh-1',
        addedBy: 'user-1',
      },
      expect.any(Object)
    )
  })

  it('dismisses without re-add when "No thanks" is pressed', async () => {
    mockDiscardMutate.mockImplementation((_input: unknown, opts: { onSuccess: () => void }) => {
      opts.onSuccess()
    })

    const onComplete = jest.fn()
    const onDismiss = jest.fn()

    const { getByTestId } = renderWithProviders(
      <DiscardSheet
        item={MOCK_ITEM}
        visible={true}
        onDismiss={onDismiss}
        userId="user-1"
        householdId="hh-1"
        onComplete={onComplete}
      />
    )

    fireEvent.press(getByTestId('discard-used-button'))
    await waitFor(() => getByTestId('restock-no-button'))
    fireEvent.press(getByTestId('restock-no-button'))

    expect(mockReAddMutate).not.toHaveBeenCalled()
    expect(onComplete).toHaveBeenCalledWith('consumed', false)
    expect(onDismiss).toHaveBeenCalled()
  })

  it('does not render when item is null', () => {
    const { queryByText } = renderWithProviders(
      <DiscardSheet
        item={null}
        visible={true}
        onDismiss={jest.fn()}
        userId="user-1"
        householdId="hh-1"
      />
    )

    expect(queryByText('What happened?')).toBeNull()
  })
})
