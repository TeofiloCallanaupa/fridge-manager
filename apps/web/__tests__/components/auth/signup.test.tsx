import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import SignupPage from '../../../app/signup/page'

describe('SignupPage Component', () => {
  it('renders the signup form', async () => {
    // Resolve the Server Component first
    const ui = await SignupPage({ searchParams: Promise.resolve({}) })
    render(ui)

    // Verify main headings
    expect(screen.getByText('Fridge Manager')).toBeInTheDocument()
    expect(screen.getByText('Start your kitchen journal')).toBeInTheDocument()

    // Verify inputs
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument()
    expect(screen.getByLabelText('Create Password')).toBeInTheDocument()

    // Verify buttons
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send Magic Link' })).toBeInTheDocument()
  })

  it('displays error messages when passed in searchParams', async () => {
    const ui = await SignupPage({ searchParams: Promise.resolve({ error: 'Email already exists' }) })
    render(ui)

    expect(screen.getByText('Email already exists')).toBeInTheDocument()
  })

  it('displays success messages when passed in searchParams', async () => {
    const ui = await SignupPage({ searchParams: Promise.resolve({ message: 'Check your email' }) })
    render(ui)

    expect(screen.getByText('Check your email')).toBeInTheDocument()
  })
})
