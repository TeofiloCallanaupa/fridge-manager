import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react-native'
import LoginScreen from '../../../app/(auth)/login'
import { supabase } from '@/lib/supabase'

describe('Mobile LoginScreen Component', () => {
  it('renders the login form', () => {
    render(<LoginScreen />)
    
    expect(screen.getByText('Welcome back to your kitchen')).toBeTruthy()
    expect(screen.getByPlaceholderText('Email address')).toBeTruthy()
    expect(screen.getByPlaceholderText('Password')).toBeTruthy()
    expect(screen.getByText('Sign in')).toBeTruthy()
  })

  it('calls signInWithPassword when submitting the form', async () => {
    render(<LoginScreen />)
    
    const emailInput = screen.getByPlaceholderText('Email address')
    const passwordInput = screen.getByPlaceholderText('Password')
    const signInButton = screen.getByText('Sign in')

    fireEvent.changeText(emailInput, 'test@example.com')
    fireEvent.changeText(passwordInput, 'password123')
    fireEvent.press(signInButton)

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    })
  })
})
