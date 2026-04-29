'use client'

import { usePathname, useRouter } from 'next/navigation'

export function OnboardingHeader() {
  const pathname = usePathname()
  const router = useRouter()

  let step = 1
  if (pathname.includes('/avatar')) step = 2
  if (pathname.includes('/household')) step = 3

  return (
    <header className="fixed top-0 w-full z-50 bg-[#F9F9F7]/80 backdrop-blur-xl flex items-center justify-between px-8 py-6">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => router.back()}
          className="material-symbols-outlined text-[var(--color-primary-container)] p-2 hover:opacity-70 transition-opacity active:scale-95"
        >
          arrow_back
        </button>
      </div>
      <div className="flex flex-col items-end">
        <span className="text-[var(--color-on-secondary-container)] font-label text-[10px] font-bold uppercase tracking-[0.2em]">
          Setup Progress
        </span>
        <span className="text-[var(--color-primary)] font-headline text-sm font-semibold tracking-tight">
          Step {step} of 3
        </span>
      </div>
    </header>
  )
}
