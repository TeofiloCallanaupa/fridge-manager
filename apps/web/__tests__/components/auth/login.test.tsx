import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import LoginPage from '../../../app/login/page'

describe('LoginPage Component', () => {
  it('renders the login form', async () => {
    // Resolve the Server Component first
    const ui = await LoginPage({ searchParams: Promise.resolve({}) })
    render(ui)

    // Verify main headings
    expect(screen.getByText('Fridge Manager')).toBeInTheDocument()
    expect(screen.getByText('Welcome back to your pantry')).toBeInTheDocument()

    // Verify inputs
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()

    // Verify buttons
    expect(screen.getByRole('button', { name: 'Log In' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send Magic Link' })).toBeInTheDocument()
  })

  it('displays error messages when passed in searchParams', async () => {
    const ui = await LoginPage({ searchParams: Promise.resolve({ error: 'Invalid credentials' }) })
    render(ui)

    expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
  })

  it('displays success messages when passed in searchParams', async () => {
    const ui = await LoginPage({ searchParams: Promise.resolve({ message: 'Check your email' }) })
    render(ui)

    expect(screen.getByText('Check your email')).toBeInTheDocument()
  })
})
