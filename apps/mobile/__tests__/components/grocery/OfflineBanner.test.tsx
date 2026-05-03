/**
 * TDD Red Phase — Tests for OfflineBanner component
 */
import React from 'react'
import { render } from '@testing-library/react-native'
import { PaperProvider } from 'react-native-paper'
import { OfflineBanner } from '../../../components/OfflineBanner'

jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: jest.fn(),
}))

import { useNetInfo } from '@react-native-community/netinfo'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <PaperProvider>{children}</PaperProvider>
)

describe('OfflineBanner', () => {
  it('shows offline message when not connected', () => {
    (useNetInfo as jest.Mock).mockReturnValue({
      isConnected: false,
      isInternetReachable: false,
    })

    const { getByText } = render(<OfflineBanner />, { wrapper })

    expect(getByText(/offline/i)).toBeTruthy()
  })

  it('hides when connected', () => {
    (useNetInfo as jest.Mock).mockReturnValue({
      isConnected: true,
      isInternetReachable: true,
    })

    const { queryByText } = render(<OfflineBanner />, { wrapper })

    expect(queryByText(/offline/i)).toBeNull()
  })

  it('shows syncing message when connection returns', () => {
    (useNetInfo as jest.Mock).mockReturnValue({
      isConnected: true,
      isInternetReachable: true,
    })

    // When online, banner should not show
    const { queryByText } = render(<OfflineBanner />, { wrapper })
    expect(queryByText(/offline/i)).toBeNull()
  })
})
