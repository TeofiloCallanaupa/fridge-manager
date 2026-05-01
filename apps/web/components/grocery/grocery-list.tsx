'use client'

import { useMemo } from 'react'
import { useGroceryItems } from '@/hooks/use-grocery-items'
import { useCategories } from '@/hooks/use-categories'
import { useRealtimeGrocery } from '@/hooks/use-realtime-grocery'
import { CategorySection } from './category-section'
import { GroceryFab } from './grocery-fab'
import { Skeleton } from '@/components/ui/skeleton'
import { ShoppingBasket } from 'lucide-react'
import type { GroceryItemWithCategory } from '@/hooks/use-grocery-items'
import type { Category } from '@fridge-manager/shared'

type GroceryListProps = {
  householdId: string
  userId: string
}

type CategoryGroup = {
  category: Pick<Category, 'id' | 'name' | 'emoji' | 'display_order'>
  items: GroceryItemWithCategory[]
}

/**
 * Main grocery list client component.
 * Groups items by category and renders them in display_order.
 */
export function GroceryList({ householdId, userId }: GroceryListProps) {
  const { data: items, isLoading: itemsLoading } = useGroceryItems(householdId)
  const { data: categories, isLoading: categoriesLoading } = useCategories()
  const { syncStatus } = useRealtimeGrocery(householdId)

  // Group items by category, sorted by display_order
  const groups = useMemo<CategoryGroup[]>(() => {
    if (!items || !categories) return []

    const groupMap = new Map<string, GroceryItemWithCategory[]>()
    for (const item of items) {
      if (!item.category_id) continue
      const existing = groupMap.get(item.category_id) || []
      existing.push(item)
      groupMap.set(item.category_id, existing)
    }

    // Build groups in category display_order
    return categories
      .filter((cat) => groupMap.has(cat.id))
      .map((cat) => ({
        category: {
          id: cat.id,
          name: cat.name,
          emoji: cat.emoji,
          display_order: cat.display_order,
        },
        items: groupMap.get(cat.id)!,
      }))
  }, [items, categories])

  const isLoading = itemsLoading || categoriesLoading
  const totalItems = items?.length ?? 0
  const totalCategories = groups.length

  return (
    <div className="bg-surface text-on-surface min-h-screen pb-32">
      {/* Top App Bar */}
      <header className="bg-surface/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="flex justify-between items-center px-8 py-6 max-w-4xl mx-auto">
          <div className="flex flex-col">
            <h1 className="font-sans tracking-tight text-2xl font-bold leading-tight text-primary">
              Grocery List
            </h1>
            <p className="text-on-secondary-container text-sm font-medium">
              {isLoading
                ? 'Loading...'
                : `${totalItems} item${totalItems !== 1 ? 's' : ''} · ${totalCategories} categor${totalCategories !== 1 ? 'ies' : 'y'}`}
            </p>
          </div>
          <SyncBadge status={syncStatus} />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 mt-4 space-y-10">
        {isLoading ? (
          <LoadingSkeleton />
        ) : groups.length === 0 ? (
          <EmptyState />
        ) : (
          groups.map((group) => (
            <CategorySection
              key={group.category.id}
              category={group.category}
              items={group.items}
              userId={userId}
              householdId={householdId}
            />
          ))
        )}
      </main>

      {/* Floating Action Button */}
      <GroceryFab householdId={householdId} userId={userId} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SyncBadge({ status }: { status: 'synced' | 'syncing' | 'error' }) {
  const config = {
    synced: {
      dotColor: 'bg-primary',
      textColor: 'text-primary',
      label: 'Synced',
      icon: 'sync',
    },
    syncing: {
      dotColor: 'bg-yellow-500',
      textColor: 'text-yellow-600',
      label: 'Syncing',
      icon: 'sync',
    },
    error: {
      dotColor: 'bg-error',
      textColor: 'text-error',
      label: 'Offline',
      icon: 'sync_problem',
    },
  }[status]

  return (
    <div
      className={`flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-full transition-colors`}
    >
      <span className={`w-2 h-2 rounded-full ${config.dotColor}`} />
      <span
        className={`text-xs font-semibold ${config.textColor} uppercase tracking-wider`}
      >
        {config.label}
      </span>
      <span
        className={`material-symbols-outlined ${config.textColor} text-lg ${
          status === 'syncing' ? 'animate-spin' : ''
        }`}
      >
        {config.icon}
      </span>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 rounded-3xl bg-primary-fixed flex items-center justify-center mb-6">
        <ShoppingBasket className="w-10 h-10 text-primary" />
      </div>
      <h2 className="text-xl font-bold text-on-surface mb-2">
        Your list is empty
      </h2>
      <p className="text-on-secondary-container text-sm max-w-xs">
        Tap the + button to add your first grocery item. Items will be grouped
        by category for easy shopping.
      </p>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-3">
          <div className="flex items-center gap-3 px-2">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <Skeleton className="h-6 w-24" />
          </div>
          {[1, 2].map((j) => (
            <Skeleton key={j} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      ))}
    </div>
  )
}
