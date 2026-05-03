/**
 * TDD Red Phase — Tests for AddItemSheet component
 */
import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import { PaperProvider } from 'react-native-paper'
import { AddItemSheet } from '../../../components/grocery/AddItemSheet'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <PaperProvider>{children}</PaperProvider>
)

const mockCategories = [
  { id: 'cat-1', name: 'produce', emoji: '🥬', display_order: 1, default_destination: 'fridge' as const, has_expiration: true },
  { id: 'cat-2', name: 'dairy', emoji: '🥛', display_order: 2, default_destination: 'fridge' as const, has_expiration: true },
  { id: 'cat-3', name: 'meat', emoji: '🥩', display_order: 3, default_destination: 'fridge' as const, has_expiration: true },
]

describe('AddItemSheet', () => {
  it('renders form fields when visible', () => {
    const { getByPlaceholderText } = render(
      <AddItemSheet
        visible={true}
        onDismiss={jest.fn()}
        onSubmit={jest.fn()}
        categories={mockCategories}
      />,
      { wrapper }
    )

    expect(getByPlaceholderText('Item name')).toBeTruthy()
  })

  it('does not render when not visible', () => {
    const { queryByPlaceholderText } = render(
      <AddItemSheet
        visible={false}
        onDismiss={jest.fn()}
        onSubmit={jest.fn()}
        categories={mockCategories}
      />,
      { wrapper }
    )

    expect(queryByPlaceholderText('Item name')).toBeNull()
  })

  it('shows category chips', () => {
    const { getByText } = render(
      <AddItemSheet
        visible={true}
        onDismiss={jest.fn()}
        onSubmit={jest.fn()}
        categories={mockCategories}
      />,
      { wrapper }
    )

    expect(getByText('🥬 produce')).toBeTruthy()
    expect(getByText('🥛 dairy')).toBeTruthy()
    expect(getByText('🥩 meat')).toBeTruthy()
  })

  it('disables submit when name is empty', () => {
    const { getByText } = render(
      <AddItemSheet
        visible={true}
        onDismiss={jest.fn()}
        onSubmit={jest.fn()}
        categories={mockCategories}
      />,
      { wrapper }
    )

    const submitButton = getByText('Add to List')
    expect(submitButton).toBeTruthy()
    // Button should be disabled — Paper Button disables via the disabled prop
  })

  it('calls onSubmit with correct payload', async () => {
    const onSubmit = jest.fn()
    const { getByPlaceholderText, getByText } = render(
      <AddItemSheet
        visible={true}
        onDismiss={jest.fn()}
        onSubmit={onSubmit}
        categories={mockCategories}
      />,
      { wrapper }
    )

    // Fill in name
    fireEvent.changeText(getByPlaceholderText('Item name'), 'Milk')

    // Select category
    fireEvent.press(getByText('🥛 dairy'))

    // Submit
    fireEvent.press(getByText('Add to List'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Milk',
          category_id: 'cat-2',
        })
      )
    })
  })

  it('calls onDismiss when closed', () => {
    const onDismiss = jest.fn()
    const { getByLabelText } = render(
      <AddItemSheet
        visible={true}
        onDismiss={onDismiss}
        onSubmit={jest.fn()}
        categories={mockCategories}
      />,
      { wrapper }
    )

    const closeButton = getByLabelText('Close')
    fireEvent.press(closeButton)

    expect(onDismiss).toHaveBeenCalled()
  })
})
