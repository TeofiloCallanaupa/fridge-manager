import { OnboardingHeader } from './onboarding-header'

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="bg-[var(--color-background)] text-[var(--color-on-surface)] min-h-screen flex flex-col items-center">
      <OnboardingHeader />
      <main className="flex-1 w-full max-w-2xl px-8 pt-32 pb-40 flex flex-col">
        {children}
      </main>
    </div>
  )
}
