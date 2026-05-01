'use client'

import { formatRelativeTime } from '@fridge-manager/shared'
import type { InventoryItemWithDetails } from '@/hooks/use-inventory-items'

type RecentlyRemovedProps = {
  items: InventoryItemWithDetails[]
}

/**
 * Recently Removed section showing the last 20 discarded items.
 * Shows item name, who removed it, when (relative), and reason icon.
 */
export function RecentlyRemoved({ items }: RecentlyRemovedProps) {
  if (items.length === 0) return null

  return (
    <section className="mt-8" aria-labelledby="recently-removed-heading">
      <div className="flex items-center justify-between mb-3">
        <h2
          id="recently-removed-heading"
          className="text-sm font-semibold text-foreground"
        >
          Recently Removed
        </h2>
        <button
          type="button"
          className="text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          aria-label="View full removal history"
        >
          View History
        </button>
      </div>

      <div className="space-y-1">
        {items.map((item) => {
          const emoji = item.categories?.emoji ?? '📦'
          const removedBy = item.profiles?.display_name ?? 'Unknown'
          const reasonIcon = item.discard_reason === 'consumed' ? '✅' : '🗑️'
          const removedAt = item.discarded_at
            ? formatRelativeTime(new Date(item.discarded_at))
            : ''

          return (
            <div
              key={item.id}
              className="flex items-center gap-3 py-2 px-3 rounded-lg
                         hover:bg-muted/50 transition-colors"
            >
              <span className="text-base flex-shrink-0" aria-hidden="true">
                {emoji}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">{item.name}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
                <span>{removedBy}</span>
                <span aria-hidden="true">·</span>
                <span>{removedAt}</span>
                <span
                  className="text-base"
                  aria-label={item.discard_reason === 'consumed' ? 'Used' : 'Tossed'}
                >
                  {reasonIcon}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
