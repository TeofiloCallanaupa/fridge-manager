'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  useInventoryItems,
  useInventoryCounts,
  useRecentlyRemoved,
} from '@/hooks/use-inventory-items'
import { useRealtimeInventory } from '@/hooks/use-realtime-inventory'
import { InventoryItemCard } from './inventory-item-card'
import { RecentlyRemoved } from './recently-removed'
import { ItemDetailSheet } from './item-detail-sheet'
import { QuickAddSheet } from './quick-add-sheet'
import { Plus } from 'lucide-react'
import type { StorageLocation } from '@fridge-manager/shared'

type InventoryListProps = {
  householdId: string
  userId: string
}

const TABS: { value: StorageLocation; label: string; emoji: string }[] = [
  { value: 'fridge', label: 'Fridge', emoji: '🧊' },
  { value: 'freezer', label: 'Freezer', emoji: '❄️' },
  { value: 'pantry', label: 'Pantry', emoji: '🗄️' },
]

/**
 * Main inventory list with tabbed location switching.
 * Shows active items with FEFO sorting and a Recently Removed section.
 */
export function InventoryList({ householdId, userId }: InventoryListProps) {
  const [activeTab, setActiveTab] = useState<StorageLocation>('fridge')
  const [selectedItem, setSelectedItem] = useState<import('@/hooks/use-inventory-items').InventoryItemWithDetails | null>(null)
  const [showQuickAdd, setShowQuickAdd] = useState(false)

  // Subscribe to realtime changes
  useRealtimeInventory(householdId)

  // Fetch counts for tab badges
  const { data: counts } = useInventoryCounts(householdId)

  // Fetch items for the active tab
  const {
    data: items,
    isLoading,
    error,
  } = useInventoryItems(householdId, activeTab)

  // Fetch recently removed
  const { data: recentlyRemoved } = useRecentlyRemoved(householdId)

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Inventory
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {counts
            ? `${(counts.fridge + counts.freezer + counts.pantry)} items in your kitchen`
            : 'Loading...'}
        </p>
      </div>

      {/* Location tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as StorageLocation)}
      >
        <TabsList className="w-full grid grid-cols-3 mb-4">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="text-sm gap-1.5"
              aria-label={`${tab.label} tab${counts ? ` — ${counts[tab.value]} items` : ''}`}
            >
              <span aria-hidden="true">{tab.emoji}</span>
              {tab.label}
              {counts && counts[tab.value] > 0 && (
                <span className="ml-1 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                  {counts[tab.value]}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            {/* Loading state */}
            {isLoading && activeTab === tab.value && (
              <div className="space-y-3" aria-label="Loading inventory items">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-[88px] w-full rounded-xl" />
                ))}
              </div>
            )}

            {/* Error state */}
            {error && activeTab === tab.value && (
              <div
                className="text-center py-12 text-destructive"
                role="alert"
              >
                <p className="text-sm font-medium">Failed to load items</p>
                <p className="text-xs mt-1 text-muted-foreground">
                  {error.message}
                </p>
              </div>
            )}

            {/* Empty state */}
            {!isLoading && !error && items?.length === 0 && activeTab === tab.value && (
              <div className="text-center py-16" aria-label={`No items in ${tab.label}`}>
                <span className="text-4xl block mb-3" aria-hidden="true">
                  {tab.emoji}
                </span>
                <p className="text-sm font-medium text-foreground">
                  No items in your {tab.label.toLowerCase()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Items checked off your grocery list will appear here
                </p>
              </div>
            )}

            {/* Items list */}
            {!isLoading && !error && items && items.length > 0 && activeTab === tab.value && (
              <div className="space-y-3">
                {items.map((item) => (
                  <InventoryItemCard
                    key={item.id}
                    item={item}
                    onClick={() => setSelectedItem(item)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Recently Removed section */}
      {recentlyRemoved && recentlyRemoved.length > 0 && (
        <RecentlyRemoved items={recentlyRemoved} householdId={householdId} />
      )}

      {/* Item Detail Sheet */}
      <ItemDetailSheet
        item={selectedItem}
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        userId={userId}
        householdId={householdId}
      />

      {/* Quick Add Sheet */}
      <QuickAddSheet
        open={showQuickAdd}
        onOpenChange={setShowQuickAdd}
        householdId={householdId}
        userId={userId}
        activeLocation={activeTab}
      />

      {/* Floating Action Button */}
      <Button
        onClick={() => setShowQuickAdd(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full forest-gradient shadow-lg hover:shadow-xl hover:opacity-90 transition-all z-50"
        aria-label="Quick add item"
      >
        <Plus className="w-6 h-6 text-white" />
      </Button>
    </div>
  )
}
