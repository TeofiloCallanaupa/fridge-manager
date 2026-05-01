import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ProfileSetupPage from '../../../app/onboarding/profile/page'
import AvatarSelectionPage from '../../../app/onboarding/avatar/page'
import HouseholdSetupPage from '../../../app/onboarding/household/page'

describe('Onboarding Components', () => {
  describe('Profile Setup Page', () => {
    it('renders the profile setup form', () => {
      render(<ProfileSetupPage />)

      expect(screen.getByText('What should we call you?')).toBeInTheDocument()
      expect(screen.getByLabelText('Display Name')).toBeInTheDocument()
      expect(screen.getByText(/Next/i)).toBeInTheDocument()
    })
  })

  describe('Avatar Selection Page', () => {
    it('renders the avatar selection grid', async () => {
      const ui = await AvatarSelectionPage()
      render(ui)

      expect(screen.getByText(/Create your avatar/i)).toBeInTheDocument()
      expect(screen.getByText(/Next Step/i)).toBeInTheDocument()
    })
  })

  describe('Household Setup Page', () => {
    it('renders the household setup form', async () => {
      const ui = await HouseholdSetupPage({ searchParams: Promise.resolve({}) })
      render(ui)

      expect(screen.getByText(/Set up your/i)).toBeInTheDocument()
      expect(screen.getByLabelText('Household Name')).toBeInTheDocument()
      expect(screen.getByText(/Complete Setup/i)).toBeInTheDocument()
    })
  })
})
