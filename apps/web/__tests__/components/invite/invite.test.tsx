import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import InvitePage from '../../../app/invite/[token]/page'
import * as navigation from 'next/navigation'

describe('InvitePage Component', () => {
  it('renders the invite acceptance form when the invite is valid and user is logged in', async () => {
    // We already mocked the Supabase JS admin client to return a valid invite in vitest.setup.ts
    const ui = await InvitePage({ params: Promise.resolve({ token: 'test-token' }) })
    render(ui)

    expect(screen.getByText('Join Household')).toBeInTheDocument()
    expect(screen.getByText('Test Household')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Accept Invitation' })).toBeInTheDocument()
  })
})
