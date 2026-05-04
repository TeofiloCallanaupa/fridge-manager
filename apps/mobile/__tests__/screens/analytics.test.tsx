/**
 * TDD Red Phase — Tests for AnalyticsScreen component
 */
import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PaperProvider } from 'react-native-paper'

// Mock Victory Native (Skia won't be available in test environment)
jest.mock('victory-native', () => ({
  CartesianChart: ({ children }: any) => children,
  Bar: () => null,
  Line: () => null,
  useChartPressState: () => ({ state: { isActive: false } }),
}))

const mockSummary = {
  wasteRate: 11,
  itemsConsumed: 47,
  itemsWasted: 8,
  topWastedCategory: { category: 'dairy', emoji: '🧀', count: 4 },
  shoppingTrips: 6,
  avgShelfLifeDays: 4.2,
  streakWeeks: 3,
}

const mockCategoryWaste = [
  { category: 'dairy', emoji: '🧀', count: 4 },
  { category: 'produce', emoji: '🥬', count: 3 },
  { category: 'meat', emoji: '🥩', count: 1 },
]

const mockTrends = [
  { month: '2026-01', consumed: 40, wasted: 15, wasteRate: 27.3 },
  { month: '2026-02', consumed: 50, wasted: 3, wasteRate: 5.7 },
  { month: '2026-03', consumed: 45, wasted: 2, wasteRate: 4.3 },
  { month: '2026-04', consumed: 48, wasted: 4, wasteRate: 7.7 },
  { month: '2026-05', consumed: 47, wasted: 8, wasteRate: 14.5 },
]

jest.mock('../../hooks/use-analytics', () => ({
  useAnalyticsSummary: jest.fn(() => ({
    data: mockSummary,
    isLoading: false,
    isSuccess: true,
  })),
  useMonthlyTrends: jest.fn(() => ({
    data: mockTrends,
    isLoading: false,
  })),
  useCategoryWaste: jest.fn(() => ({
    data: mockCategoryWaste,
    isLoading: false,
  })),
}))

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: { id: 'user-1' },
    householdId: 'hh-1',
  })),
}))

jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
}))

// @ts-expect-error — Expo Router route group path; Jest resolves at runtime
import AnalyticsScreen from '../../app/(app)/analytics'
import { useAnalyticsSummary } from '../../hooks/use-analytics'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <PaperProvider>
        <AnalyticsScreen />
      </PaperProvider>
    </QueryClientProvider>,
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AnalyticsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the header', () => {
    const { getByText } = renderScreen()
    expect(getByText('Analytics')).toBeTruthy()
  })

  it('renders tab selector with At a Glance and Charts', () => {
    const { getByText } = renderScreen()
    expect(getByText('At a Glance')).toBeTruthy()
    expect(getByText('Charts')).toBeTruthy()
  })

  it('renders stat cards on At a Glance tab', () => {
    const { getByText } = renderScreen()
    expect(getByText('11%')).toBeTruthy()
    expect(getByText('47')).toBeTruthy()
    expect(getByText('8')).toBeTruthy()
    expect(getByText('Dairy')).toBeTruthy()
    expect(getByText('6')).toBeTruthy()
    expect(getByText('4.2')).toBeTruthy()
  })

  it('renders streak banner', () => {
    const { getByText } = renderScreen()
    expect(getByText(/3 week/i)).toBeTruthy()
  })

  it('shows loading state', () => {
    ;(useAnalyticsSummary as jest.Mock).mockReturnValue({
      data: null,
      isLoading: true,
      isSuccess: false,
    })

    const { getByTestId } = renderScreen()
    expect(getByTestId('loading-indicator')).toBeTruthy()
  })

  it('renders the At a Glance tab by default with stat values', () => {
    // Restore mock after loading test changed it
    ;(useAnalyticsSummary as jest.Mock).mockReturnValue({
      data: mockSummary,
      isLoading: false,
      isSuccess: true,
    })

    const { getByText } = renderScreen()
    // Default tab shows stat card values
    expect(getByText('47')).toBeTruthy() // consumed count
    expect(getByText('items used')).toBeTruthy()
  })
})
