/**
 * Tests for notification preferences within the Settings screen.
 *
 * Verifies the notification UI renders correctly and interactions trigger hooks.
 * The notification preferences are part of the unified SettingsScreen
 * (not a standalone screen).
 */
import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PaperProvider } from 'react-native-paper'

// Mock the hooks
const mockUpdateMutate = jest.fn()
const mockTestMutate = jest.fn()
const mockPrefsData = {
  id: 'pref-1',
  user_id: 'user-1',
  household_id: 'hh-1',
  halfway_enabled: true,
  two_day_enabled: true,
  one_day_enabled: false,
  day_of_enabled: true,
  post_expiration_enabled: true,
  quiet_hours_start: null,
  quiet_hours_end: null,
  created_at: '2026-05-01T00:00:00Z',
  updated_at: '2026-05-01T00:00:00Z',
}

jest.mock('../../hooks/use-notification-preferences', () => ({
  useNotificationPreferences: jest.fn(() => ({
    data: mockPrefsData,
    isLoading: false,
    isSuccess: true,
  })),
  useUpdateNotificationPreference: jest.fn(() => ({
    mutate: mockUpdateMutate,
    isPending: false,
  })),
  useSendTestNotification: jest.fn(() => ({
    mutate: mockTestMutate,
    isPending: false,
    isSuccess: false,
    data: null,
  })),
}))

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: { id: 'user-1' },
    householdId: 'hh-1',
    profile: { display_name: 'Test User', avatar_config: null },
  })),
}))

jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
}))

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { name: 'Test House' }, error: null }),
    }),
    auth: {
      signOut: jest.fn(),
    },
  },
}))

import SettingsScreen from '../../app/(app)/settings'

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
        <SettingsScreen />
      </PaperProvider>
    </QueryClientProvider>
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Settings — Notification Preferences', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the Notification Preferences section header', () => {
    const { getByText } = renderScreen()
    expect(getByText('Notification Preferences')).toBeTruthy()
  })

  it('renders all 5 expiration alert rows', () => {
    const { getByText } = renderScreen()
    expect(getByText('Halfway')).toBeTruthy()
    expect(getByText('2-Day Warning')).toBeTruthy()
    expect(getByText('1-Day Warning')).toBeTruthy()
    expect(getByText('Day Of')).toBeTruthy()
    expect(getByText('Expired')).toBeTruthy()
  })

  it('renders quiet hours toggle', () => {
    const { getByText } = renderScreen()
    expect(getByText('Enable Quiet Hours')).toBeTruthy()
  })

  it('renders test notification button', () => {
    const { getByText } = renderScreen()
    expect(getByText(/Send Test Notification/)).toBeTruthy()
  })

  it('toggles a preference when switch is pressed', () => {
    const { getByTestId } = renderScreen()

    // Toggle "halfway_enabled" (currently true → should set to false)
    const toggle = getByTestId('toggle-halfway_enabled')
    fireEvent(toggle, 'valueChange', false)

    expect(mockUpdateMutate).toHaveBeenCalledWith({
      userId: 'user-1',
      householdId: 'hh-1',
      field: 'halfway_enabled',
      value: false,
    })
  })

  it('calls sendTestNotification when button pressed', () => {
    const { getByTestId } = renderScreen()

    fireEvent.press(getByTestId('test-notification-button'))

    expect(mockTestMutate).toHaveBeenCalled()
  })
})
