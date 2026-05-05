'use client'

import Link from 'next/link'
import { Settings } from 'lucide-react'

/**
 * Minimal app header with brand name and settings gear.
 * Displayed on all authenticated app pages.
 */
export function AppHeader() {
  return (
    <header className="bg-surface/80 backdrop-blur-xl sticky top-0 z-40 border-b border-outline-variant/30">
      <div className="flex justify-between items-center px-6 py-4 max-w-4xl mx-auto">
        <span className="text-lg font-bold text-primary tracking-tight">
          Fridge Manager
        </span>
        <Link
          href="/dashboard"
          className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
          aria-label="Settings"
          data-testid="header-settings"
        >
          <Settings className="w-5 h-5" />
        </Link>
      </div>
    </header>
  )
}
