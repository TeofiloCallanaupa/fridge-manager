import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react-native'
import LoginScreen from '../../../app/(auth)/login'
import { supabase } from '@/lib/supabase'

describe('Mobile LoginScreen Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Default: successful sign-in
    ;(supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
  })

  it('renders the login form', () => {
    render(<LoginScreen />)
    
    expect(screen.getByText('Welcome back to your pantry')).toBeTruthy()
    expect(screen.getByTestId('login-email-input')).toBeTruthy()
    expect(screen.getByTestId('login-password-input')).toBeTruthy()
    expect(screen.getByText('Log In')).toBeTruthy()
  })

  it('calls signInWithPassword when submitting the form', async () => {
    render(<LoginScreen />)
    
    const emailInput = screen.getByTestId('login-email-input')
    const passwordInput = screen.getByTestId('login-password-input')
    const signInButton = screen.getByTestId('login-submit-button')

    fireEvent.changeText(emailInput, 'test@example.com')
    fireEvent.changeText(passwordInput, 'password123')
    fireEvent.press(signInButton)

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    })
  })
})
