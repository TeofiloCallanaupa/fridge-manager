import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock the Supabase client
const mockSupabase = {
  from: vi.fn(),
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: 'user-1' } },
    }),
  },
  channel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn((cb) => { cb?.('SUBSCRIBED'); return { unsubscribe: vi.fn() } }),
  })),
  removeChannel: vi.fn(),
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

// Import components AFTER mocks are set up
import { GroceryList } from '../../../components/grocery/grocery-list'
import { CategorySection } from '../../../components/grocery/category-section'
import type { GroceryItemWithCategory } from '../../../hooks/use-grocery-items'
import type { Category } from '@fridge-manager/shared'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

const mockCategories: Category[] = [
  {
    id: 'cat-produce',
    name: 'Produce',
    emoji: '🥬',
    display_order: 1,
    default_destination: 'fridge',
    has_expiration: true,

  },
  {
    id: 'cat-dairy',
    name: 'Dairy',
    emoji: '🥛',
    display_order: 2,
    default_destination: 'fridge',
    has_expiration: true,

  },
  {
    id: 'cat-household',
    name: 'Household',
    emoji: '🏠',
    display_order: 10,
    default_destination: 'none',
    has_expiration: false,

  },
]

function makeItem(overrides: Partial<GroceryItemWithCategory> = {}): GroceryItemWithCategory {
  return {
    id: 'item-1',
    name: 'Strawberries',
    quantity: '1 lb',
    category_id: 'cat-produce',
    destination: 'fridge',
    household_id: 'hh-1',
    added_by: 'user-1',
    checked: false,
    checked_by: null,
    checked_at: null,
    completed_at: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    categories: {
      name: 'Produce',
      emoji: '🥬',
      display_order: 1,
      default_destination: 'fridge',
      has_expiration: true,
    },
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests: CategorySection
// ---------------------------------------------------------------------------

describe('CategorySection', () => {
  const category = { id: 'cat-produce', name: 'Produce', emoji: '🥬', display_order: 1 }

  it('renders category header with emoji and name', () => {
    const items = [makeItem()]
    render(
      <CategorySection
        category={category}
        items={items}
        userId="user-1"
        householdId="hh-1"
      />,
      { wrapper: createWrapper() }
    )

    expect(screen.getByText('🥬')).toBeInTheDocument()
    expect(screen.getByText('Produce')).toBeInTheDocument()
  })

  it('shows unchecked items before checked items', () => {
    const items = [
      makeItem({ id: 'checked-1', name: 'Checked Apple', checked: true }),
      makeItem({ id: 'unchecked-1', name: 'Unchecked Banana', checked: false }),
    ]

    render(
      <CategorySection
        category={category}
        items={items}
        userId="user-1"
        householdId="hh-1"
      />,
      { wrapper: createWrapper() }
    )

    const names = screen.getAllByText(/Checked Apple|Unchecked Banana/)
    // Unchecked should appear before checked
    expect(names[0]).toHaveTextContent('Unchecked Banana')
    expect(names[1]).toHaveTextContent('Checked Apple')
  })

  it('shows done count when items are checked', () => {
    const items = [
      makeItem({ id: '1', name: 'Apple', checked: true }),
      makeItem({ id: '2', name: 'Banana', checked: false }),
    ]

    render(
      <CategorySection
        category={category}
        items={items}
        userId="user-1"
        householdId="hh-1"
      />,
      { wrapper: createWrapper() }
    )

    expect(screen.getByText('1 done')).toBeInTheDocument()
  })

  it('collapses when header is clicked', () => {
    const items = [makeItem({ name: 'Strawberries' })]

    render(
      <CategorySection
        category={category}
        items={items}
        userId="user-1"
        householdId="hh-1"
      />,
      { wrapper: createWrapper() }
    )

    // Initially visible
    expect(screen.getByText('Strawberries')).toBeInTheDocument()

    // Click header to collapse
    fireEvent.click(screen.getByRole('button', { name: /Produce/i }))

    // Items should be hidden
    expect(screen.queryByText('Strawberries')).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Tests: GroceryList (integration with hooks)
// ---------------------------------------------------------------------------

describe('GroceryList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading skeleton initially', () => {
    // Mock to hang (never resolve) for loading state
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue(new Promise(() => {})),
          }),
        }),
        order: vi.fn().mockReturnValue(new Promise(() => {})),
      }),
    })

    render(<GroceryList householdId="hh-1" userId="user-1" />, {
      wrapper: createWrapper(),
    })

    // Skeleton should be visible
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders empty state when no items', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'grocery_items') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        }
      }
      if (table === 'categories') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockCategories, error: null }),
          }),
        }
      }
      return { select: vi.fn() }
    })

    render(<GroceryList householdId="hh-1" userId="user-1" />, {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(screen.getByText('Your list is empty')).toBeInTheDocument()
    })
  })
})
