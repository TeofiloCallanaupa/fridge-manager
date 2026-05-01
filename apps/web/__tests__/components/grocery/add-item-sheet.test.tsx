import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockInsert = vi.fn().mockReturnValue({
  select: vi.fn().mockReturnValue({
    single: vi.fn().mockResolvedValue({ data: { id: 'new-item' }, error: null }),
  }),
})

const mockSupabase = {
  from: vi.fn((table: string) => {
    if (table === 'categories') {
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [
              { id: 'cat-1', name: 'Produce', emoji: '🥬', display_order: 1, default_destination: 'fridge', has_expiration: true, created_at: '2024-01-01' },
              { id: 'cat-2', name: 'Household', emoji: '🏠', display_order: 10, default_destination: 'none', has_expiration: false, created_at: '2024-01-01' },
            ],
            error: null,
          }),
        }),
      }
    }
    if (table === 'grocery_items') {
      return { insert: mockInsert }
    }
    return { select: vi.fn() }
  }),
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
  },
}

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

import { AddItemSheet } from '../../../components/grocery/add-item-sheet'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AddItemSheet', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    householdId: 'hh-1',
    userId: 'user-1',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the form with all fields', async () => {
    render(<AddItemSheet {...defaultProps} />, { wrapper: createWrapper() })

    expect(screen.getByText('Add Item')).toBeInTheDocument()
    expect(screen.getByLabelText(/item name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/quantity/i)).toBeInTheDocument()
  })

  it('disables submit when name is empty', () => {
    render(<AddItemSheet {...defaultProps} />, { wrapper: createWrapper() })

    const submitButton = screen.getByRole('button', { name: /add to list/i })
    expect(submitButton).toBeDisabled()
  })

  it('has maxLength on name input', () => {
    render(<AddItemSheet {...defaultProps} />, { wrapper: createWrapper() })

    const nameInput = screen.getByLabelText(/item name/i)
    expect(nameInput).toHaveAttribute('maxlength', '200')
  })

  it('has maxLength on quantity input', () => {
    render(<AddItemSheet {...defaultProps} />, { wrapper: createWrapper() })

    const quantityInput = screen.getByLabelText(/quantity/i)
    expect(quantityInput).toHaveAttribute('maxlength', '50')
  })
})
