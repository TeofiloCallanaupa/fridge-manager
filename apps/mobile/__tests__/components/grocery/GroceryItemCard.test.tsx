/**
 * TDD Red Phase — Tests for GroceryItemCard component
 */
import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { PaperProvider } from 'react-native-paper'
import { GroceryItemCard } from '../../../components/grocery/GroceryItemCard'
import type { GroceryItemWithCategory } from '../../../hooks/use-grocery-items'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <PaperProvider>{children}</PaperProvider>
)

const mockItem: GroceryItemWithCategory = {
  id: 'item-1',
  name: 'Chicken Breast',
  quantity: '2 lbs',
  category_id: 'cat-meat',
  destination: 'fridge',
  household_id: 'hh-1',
  added_by: 'user-1',
  checked: false,
  checked_by: null,
  checked_at: null,
  completed_at: null,
  created_at: '2026-05-01T00:00:00Z',
  updated_at: '2026-05-01T00:00:00Z',
  categories: {
    name: 'meat',
    emoji: '🥩',
    display_order: 3,
    default_destination: 'fridge' as const,
    has_expiration: true,
  },
}

describe('GroceryItemCard', () => {
  it('renders item name and quantity', () => {
    const { getByText } = render(
      <GroceryItemCard
        item={mockItem}
        onCheckOff={jest.fn()}
        onDelete={jest.fn()}
      />,
      { wrapper }
    )

    expect(getByText('Chicken Breast')).toBeTruthy()
    expect(getByText('2 lbs')).toBeTruthy()
  })

  it('renders destination badge', () => {
    const { getByText } = render(
      <GroceryItemCard
        item={mockItem}
        onCheckOff={jest.fn()}
        onDelete={jest.fn()}
      />,
      { wrapper }
    )

    expect(getByText('Fridge')).toBeTruthy()
  })

  it('does not render destination badge when destination is none', () => {
    const noneItem = { ...mockItem, destination: 'none' as const }
    const { queryByText } = render(
      <GroceryItemCard
        item={noneItem}
        onCheckOff={jest.fn()}
        onDelete={jest.fn()}
      />,
      { wrapper }
    )

    expect(queryByText('Fridge')).toBeNull()
    expect(queryByText('Freezer')).toBeNull()
    expect(queryByText('Pantry')).toBeNull()
  })

  it('calls onCheckOff when checkbox is pressed', () => {
    const onCheckOff = jest.fn()
    const { getAllByRole } = render(
      <GroceryItemCard
        item={mockItem}
        onCheckOff={onCheckOff}
        onDelete={jest.fn()}
      />,
      { wrapper }
    )

    const checkboxes = getAllByRole('checkbox')
    // Press the Checkbox.Android (inner element, not the wrapper View)
    fireEvent.press(checkboxes[checkboxes.length - 1])

    expect(onCheckOff).toHaveBeenCalledWith(mockItem)
  })

  it('calls onDelete when delete action is triggered', () => {
    const onDelete = jest.fn()
    const { getByLabelText } = render(
      <GroceryItemCard
        item={mockItem}
        onCheckOff={jest.fn()}
        onDelete={onDelete}
      />,
      { wrapper }
    )

    const deleteButton = getByLabelText('Delete item')
    fireEvent.press(deleteButton)

    expect(onDelete).toHaveBeenCalledWith('item-1')
  })

  it('shows checked state when item is checked', () => {
    const checkedItem = { ...mockItem, checked: true }
    const { getAllByRole } = render(
      <GroceryItemCard
        item={checkedItem}
        onCheckOff={jest.fn()}
        onDelete={jest.fn()}
      />,
      { wrapper }
    )

    const checkboxes = getAllByRole('checkbox')
    expect(checkboxes[0].props.accessibilityState?.checked).toBe(true)
  })
})
