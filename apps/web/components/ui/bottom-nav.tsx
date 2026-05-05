'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ShoppingCart, Package, BarChart3 } from 'lucide-react'

const tabs = [
  { href: '/grocery', label: 'Grocery', icon: ShoppingCart },
  { href: '/inventory', label: 'Inventory', icon: Package },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
] as const

/**
 * Persistent bottom tab navigation for authenticated app pages.
 * 3 tabs: Grocery, Inventory, Analytics.
 * Settings is accessible via a gear icon in the header instead.
 */
export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 bg-surface-container border-t border-outline-variant/40"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-lg mx-auto flex items-stretch justify-around h-16">
        {tabs.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href || pathname.startsWith(`${href}/`)

          return (
            <Link
              key={href}
              href={href}
              className={`
                relative flex flex-col items-center justify-center flex-1 gap-0.5
                transition-colors duration-200
                ${isActive ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}
              `}
              aria-current={isActive ? 'page' : undefined}
              data-testid={`nav-tab-${label.toLowerCase()}`}
            >
              {/* Active indicator pill — MD3 style */}
              <span
                className={`
                  absolute top-2 w-16 h-8 rounded-full transition-all duration-300
                  ${isActive ? 'bg-primary/12 scale-100' : 'bg-transparent scale-75'}
                `}
              />
              <Icon
                className={`
                  relative z-10 transition-all duration-200
                  ${isActive ? 'w-5 h-5 stroke-[2.5]' : 'w-5 h-5 stroke-[1.8]'}
                `}
              />
              <span
                className={`
                  relative z-10 text-[11px] font-semibold tracking-wide
                  ${isActive ? 'text-primary' : 'text-on-surface-variant'}
                `}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </div>

      {/* Safe area spacer for mobile browsers */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  )
}
