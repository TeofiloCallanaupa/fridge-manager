/**
 * Component tests for InventoryItemCard
 *
 * Tests rendering of item data (name, quantity, emoji, metadata),
 * press/long-press callbacks, and edge cases (missing category, no quantity).
 */
import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { PaperProvider } from 'react-native-paper'
import { InventoryItemCard } from '../../../components/inventory/InventoryItemCard'
import type { InventoryItemWithDetails } from '@fridge-manager/shared'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <PaperProvider>{children}</PaperProvider>
)

function makeItem(
  overrides: Partial<InventoryItemWithDetails> = {}
): InventoryItemWithDetails {
  return {
    id: 'inv-1',
    name: 'Greek Yogurt',
    quantity: '32 oz',
    category_id: 'cat-dairy',
    household_id: 'hh-1',
    location: 'fridge',
    added_by: 'user-1',
    added_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    expiration_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    expiration_source: 'default',
    source: 'grocery_checkout',
    discarded_at: null,
    discard_reason: null,
    updated_at: new Date().toISOString(),
    categories: { name: 'Dairy', emoji: '🥛', has_expiration: true },
    profiles: { display_name: 'Teo' },
    ...overrides,
  }
}

describe('InventoryItemCard', () => {
  it('renders item name', () => {
    const { getByText } = render(
      <InventoryItemCard item={makeItem()} />,
      { wrapper }
    )
    expect(getByText('Greek Yogurt')).toBeTruthy()
  })

  it('renders quantity when present', () => {
    const { getByText } = render(
      <InventoryItemCard item={makeItem()} />,
      { wrapper }
    )
    expect(getByText('32 oz')).toBeTruthy()
  })

  it('does not render quantity when null', () => {
    const { queryByText } = render(
      <InventoryItemCard item={makeItem({ quantity: null })} />,
      { wrapper }
    )
    // "32 oz" should not appear
    expect(queryByText('32 oz')).toBeNull()
  })

  it('renders category emoji', () => {
    const { getByText } = render(
      <InventoryItemCard item={makeItem()} />,
      { wrapper }
    )
    expect(getByText('🥛')).toBeTruthy()
  })

  it('renders fallback emoji when category is null', () => {
    const { getByText } = render(
      <InventoryItemCard item={makeItem({ categories: null })} />,
      { wrapper }
    )
    expect(getByText('📦')).toBeTruthy()
  })

  it('renders "Added X days ago" metadata', () => {
    const { getByText } = render(
      <InventoryItemCard item={makeItem()} />,
      { wrapper }
    )
    expect(getByText(/Added 2 days ago/)).toBeTruthy()
  })

  it('renders "Added today" for items added today', () => {
    const { getByText } = render(
      <InventoryItemCard
        item={makeItem({ added_at: new Date().toISOString() })}
      />,
      { wrapper }
    )
    expect(getByText(/Added today/)).toBeTruthy()
  })

  it('renders adder display name', () => {
    const { getByText } = render(
      <InventoryItemCard item={makeItem()} />,
      { wrapper }
    )
    expect(getByText(/by Teo/)).toBeTruthy()
  })

  it('renders "Unknown" when profiles is null', () => {
    const { getByText } = render(
      <InventoryItemCard item={makeItem({ profiles: null })} />,
      { wrapper }
    )
    expect(getByText(/by Unknown/)).toBeTruthy()
  })

  it('renders expiration badge for items with expiration_date', () => {
    const { getByText } = render(
      <InventoryItemCard item={makeItem()} />,
      { wrapper }
    )
    // 5 days from now → should show "5d left" or "6d left" depending on time
    expect(getByText(/\d+d left/)).toBeTruthy()
  })

  it('calls onPress when tapped', () => {
    const onPress = jest.fn()
    const { getByLabelText } = render(
      <InventoryItemCard item={makeItem()} onPress={onPress} />,
      { wrapper }
    )
    fireEvent.press(getByLabelText('Greek Yogurt, 32 oz'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('calls onLongPress when long-pressed', () => {
    const onLongPress = jest.fn()
    const { getByLabelText } = render(
      <InventoryItemCard item={makeItem()} onLongPress={onLongPress} />,
      { wrapper }
    )
    fireEvent(getByLabelText('Greek Yogurt, 32 oz'), 'longPress')
    expect(onLongPress).toHaveBeenCalledTimes(1)
  })

  it('renders accessible label with name and quantity', () => {
    const { getByLabelText } = render(
      <InventoryItemCard item={makeItem()} />,
      { wrapper }
    )
    expect(getByLabelText('Greek Yogurt, 32 oz')).toBeTruthy()
  })

  it('renders accessible label without quantity when null', () => {
    const { getByLabelText } = render(
      <InventoryItemCard item={makeItem({ quantity: null })} />,
      { wrapper }
    )
    expect(getByLabelText('Greek Yogurt')).toBeTruthy()
  })
})
