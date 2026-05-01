import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// ---------------------------------------------------------------------------
// All mocks via vi.hoisted
// ---------------------------------------------------------------------------

const {
  mockSelect,
  mockFrom,
  mockChannel,
} = vi.hoisted(() => {
  const select = vi.fn()
  const from = vi.fn()
  const channel = vi.fn()

  return {
    mockSelect: select,
    mockFrom: from,
    mockChannel: channel,
  }
})

// Mock Supabase client
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
  formatRelativeTime: vi.fn(() => '2 hours ago'),
}))

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }
}

// Default mock behavior for Supabase .from() chains
function restoreDefaultMockFrom() {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'inventory_items') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                }),
              }),
              // For count queries
              head: undefined,
            }),
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
            not: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }
    }
    return { select: vi.fn() }
  })
}

// Import components after mocks
import { ExpirationBadge } from '@/components/inventory/expiration-badge'
import { InventoryItemCard } from '@/components/inventory/inventory-item-card'
import { RecentlyRemoved } from '@/components/inventory/recently-removed'

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const now = new Date()
const threeDaysFromNow = new Date(now.getTime() + 3 * 86400000)
const oneDayFromNow = new Date(now.getTime() + 1 * 86400000)
const twoDaysAgo = new Date(now.getTime() - 2 * 86400000)
const fiveDaysFromNow = new Date(now.getTime() + 5 * 86400000)

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
  restoreDefaultMockFrom()
})

describe('ExpirationBadge', () => {
  it('renders green badge for >3 days remaining', () => {
    render(<ExpirationBadge expirationDate={fiveDaysFromNow.toISOString().split('T')[0]} />)
    const badge = screen.getByText(/days left/)
    expect(badge).toBeDefined()
    expect(badge.className).toContain('emerald')
  })

  it('renders yellow badge for 1-3 days remaining', () => {
    render(<ExpirationBadge expirationDate={oneDayFromNow.toISOString().split('T')[0]} />)
    const badge = screen.getByText(/day/)
    expect(badge).toBeDefined()
    expect(badge.className).toContain('amber')
  })

  it('renders red badge for expired items', () => {
    render(<ExpirationBadge expirationDate={twoDaysAgo.toISOString().split('T')[0]} />)
    const badge = screen.getByText(/Expired/)
    expect(badge).toBeDefined()
    expect(badge.className).toContain('red')
  })

  it('renders nothing when expirationDate is null', () => {
    const { container } = render(<ExpirationBadge expirationDate={null} />)
    expect(container.innerHTML).toBe('')
  })
})

describe('InventoryItemCard', () => {
  it('renders item name, quantity, and category emoji', () => {
    render(<InventoryItemCard item={makeItem()} />, { wrapper: createWrapper() })
    expect(screen.getByText('Chicken breast')).toBeDefined()
    expect(screen.getByText('2 lbs')).toBeDefined()
    expect(screen.getByText('🥩')).toBeDefined()
  })

  it('renders "Added today" for items added today', () => {
    render(<InventoryItemCard item={makeItem()} />, { wrapper: createWrapper() })
    expect(screen.getByText('Added today')).toBeDefined()
  })

  it('renders "by [name]" attribution', () => {
    render(<InventoryItemCard item={makeItem()} />, { wrapper: createWrapper() })
    expect(screen.getByText('by Teo')).toBeDefined()
  })

  it('renders expiration badge', () => {
    render(<InventoryItemCard item={makeItem()} />, { wrapper: createWrapper() })
    // Should show a badge with days info via aria-label
    const badge = screen.getByLabelText(/Expiration:/)
    expect(badge).toBeDefined()
  })

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<InventoryItemCard item={makeItem()} onClick={onClick} />, { wrapper: createWrapper() })

    await user.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('has an aria-label', () => {
    render(<InventoryItemCard item={makeItem()} />, { wrapper: createWrapper() })
    const button = screen.getByRole('button')
    expect(button.getAttribute('aria-label')).toContain('Chicken breast')
  })

  it('renders fallback emoji when category is null', () => {
    render(
      <InventoryItemCard item={makeItem({ categories: null })} />,
      { wrapper: createWrapper() }
    )
    expect(screen.getByText('📦')).toBeDefined()
  })
})

describe('RecentlyRemoved', () => {
  it('renders nothing when list is empty', () => {
    const { container } = render(<RecentlyRemoved items={[]} />, { wrapper: createWrapper() })
    expect(container.innerHTML).toBe('')
  })

  it('renders section heading', () => {
    const items = [makeItem({ discarded_at: now.toISOString(), discard_reason: 'consumed' })]
    render(<RecentlyRemoved items={items} />, { wrapper: createWrapper() })
    expect(screen.getByText('Recently Removed')).toBeDefined()
  })

  it('shows consumed icon for consumed items', () => {
    const items = [makeItem({ discarded_at: now.toISOString(), discard_reason: 'consumed' })]
    render(<RecentlyRemoved items={items} />, { wrapper: createWrapper() })
    expect(screen.getByText('✅')).toBeDefined()
  })

  it('shows tossed icon for wasted items', () => {
    const items = [makeItem({ discarded_at: now.toISOString(), discard_reason: 'wasted' })]
    render(<RecentlyRemoved items={items} />, { wrapper: createWrapper() })
    expect(screen.getByText('🗑️')).toBeDefined()
  })

  it('shows "View History" link', () => {
    const items = [makeItem({ discarded_at: now.toISOString(), discard_reason: 'consumed' })]
    render(<RecentlyRemoved items={items} />, { wrapper: createWrapper() })
    expect(screen.getByText('View History')).toBeDefined()
  })

  it('shows relative time for removal', () => {
    const items = [makeItem({ discarded_at: now.toISOString(), discard_reason: 'consumed' })]
    render(<RecentlyRemoved items={items} />, { wrapper: createWrapper() })
    expect(screen.getByText('2 hours ago')).toBeDefined()
  })
})
