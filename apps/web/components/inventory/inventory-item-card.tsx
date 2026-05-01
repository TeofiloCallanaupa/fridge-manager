'use client'

import { getDaysSince } from '@fridge-manager/shared'
import { ExpirationBadge } from './expiration-badge'
import type { InventoryItemWithDetails } from '@/hooks/use-inventory-items'

type InventoryItemCardProps = {
  item: InventoryItemWithDetails
  onClick?: () => void
}

/**
 * Card for a single inventory item.
 * Shows category emoji, name, quantity, expiration badge,
 * "added X days ago", and "added by" attribution.
 */
export function InventoryItemCard({ item, onClick }: InventoryItemCardProps) {
  const daysAgo = getDaysSince(new Date(item.added_at))
  const addedByName = item.profiles?.display_name ?? 'Unknown'
  const emoji = item.categories?.emoji ?? '📦'

  const daysAgoText = daysAgo === 0
    ? 'Added today'
    : daysAgo === 1
      ? 'Added yesterday'
      : `Added ${daysAgo} days ago`

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-xl bg-card p-4 soft-shadow
                 border border-border/40 transition-all duration-200
                 hover:border-primary/30 hover:shadow-md
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                 active:scale-[0.98]"
      aria-label={`${item.name}${item.quantity ? `, ${item.quantity}` : ''}`}
    >
      {/* Top row: emoji + name + quantity + expiration badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="text-2xl flex-shrink-0" aria-hidden="true">
            {emoji}
          </span>
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground truncate text-sm">
              {item.name}
            </h3>
            {item.quantity && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {item.quantity}
              </p>
            )}
          </div>
        </div>
        <ExpirationBadge expirationDate={item.expiration_date} />
      </div>

      {/* Bottom row: added info */}
      <div className="flex items-center gap-1.5 mt-2.5 text-xs text-muted-foreground">
        <span>{daysAgoText}</span>
        <span aria-hidden="true">·</span>
        <span>by {addedByName}</span>
      </div>
    </button>
  )
}
