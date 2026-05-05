import { BottomNav } from '@/components/ui/bottom-nav'

/**
 * Shared layout for authenticated app pages (grocery, inventory, analytics, dashboard).
 * Provides persistent bottom tab navigation.
 * The AppHeader is NOT here because each page has its own header style
 * (grocery has sync badge, inventory has tabs, etc.).
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen pb-20">
      {children}
      <BottomNav />
    </div>
  )
}
