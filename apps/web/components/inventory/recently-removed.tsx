'use client'

import { useState, useCallback } from 'react'
import { formatRelativeTime, getOppositeReason } from '@fridge-manager/shared'
import { useRestoreItem, useChangeDiscardReason } from '@/hooks/use-inventory-mutations'
import type { InventoryItemWithDetails } from '@/hooks/use-inventory-items'
import type { DiscardReason } from '@fridge-manager/shared'

type RecentlyRemovedProps = {
  items: InventoryItemWithDetails[]
  householdId: string
}

/** 1 hour in milliseconds — items newer than this show the quick Undo button */
const UNDO_WINDOW_MS = 60 * 60 * 1000

/**
 * Returns true if the item was discarded less than 1 hour ago.
 */
function isWithinUndoWindow(discardedAt: string | null): boolean {
  if (!discardedAt) return false
  return Date.now() - new Date(discardedAt).getTime() < UNDO_WINDOW_MS
}



/**
 * Recently Removed section showing the last 20 discarded items.
 * Shows item name, who removed it, when (relative), and reason icon.
 *
 * Features:
 * - Quick Undo button on items < 1 hour old
 * - Tap card to expand correction menu (change reason / restore)
 * - Always changeable, no time limit on corrections
 */
export function RecentlyRemoved({ items, householdId }: RecentlyRemovedProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const restoreMutation = useRestoreItem()
  const changeReasonMutation = useChangeDiscardReason()

  const handleToggleExpand = useCallback((itemId: string) => {
    setExpandedId((prev) => (prev === itemId ? null : itemId))
  }, [])

  const handleRestore = useCallback(
    (itemId: string) => {
      restoreMutation.mutate({ itemId, householdId })
      setExpandedId(null)
    },
    [restoreMutation, householdId],
  )

  const handleChangeReason = useCallback(
    (itemId: string, newReason: DiscardReason) => {
      changeReasonMutation.mutate({ itemId, householdId, newReason })
      setExpandedId(null)
    },
    [changeReasonMutation, householdId],
  )

  if (items.length === 0) return null

  return (
    <section className="mt-8" aria-labelledby="recently-removed-heading">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2
            id="recently-removed-heading"
            className="text-sm font-semibold text-foreground"
          >
            Recently Removed
          </h2>
          <span className="text-xs text-muted-foreground">Last 7 days</span>
        </div>
        <a
          href="/inventory/history"
          className="text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          aria-label="View full removal history"
        >
          View all
        </a>
      </div>

      <div className="space-y-1">
        {items.map((item) => {
          const emoji = item.categories?.emoji ?? '📦'
          const removedBy = item.profiles?.display_name ?? 'Unknown'
          const reasonIcon = item.discard_reason === 'consumed' ? '✅'
            : item.discard_reason === 'expired' ? '⏰' : '🗑️'
          const removedAt = item.discarded_at
            ? formatRelativeTime(new Date(item.discarded_at))
            : ''
          const showUndo = isWithinUndoWindow(item.discarded_at)
          const isExpanded = expandedId === item.id
          const opposite = getOppositeReason(item.discard_reason)

          return (
            <div key={item.id}>
              {/* Main card row */}
              <div
                data-testid="removed-item-card"
                className="flex items-center gap-3 py-2 px-3 rounded-lg
                           hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => handleToggleExpand(item.id)}
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                aria-label={`${item.name}, removed by ${removedBy}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleToggleExpand(item.id)
                  }
                }}
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
                    aria-label={
                      item.discard_reason === 'consumed' ? 'Used'
                      : item.discard_reason === 'expired' ? 'Expired'
                      : 'Tossed'
                    }
                  >
                    {reasonIcon}
                  </span>
                </div>

                {/* Quick Undo button — only for items < 1 hour old */}
                {showUndo && (
                  <button
                    type="button"
                    className="ml-1 px-2.5 py-1 text-xs font-medium rounded-full
                               bg-secondary text-secondary-foreground
                               hover:bg-secondary/80 transition-colors"
                    aria-label={`Undo removal of ${item.name}`}
                    onClick={(e) => {
                      e.stopPropagation() // Don't toggle expand
                      handleRestore(item.id)
                    }}
                  >
                    Undo
                  </button>
                )}
              </div>

              {/* Correction panel (expanded) */}
              {isExpanded && (
                <div
                  className="ml-10 mr-3 mb-2 py-2 px-3 rounded-lg bg-muted/30
                             flex items-center gap-3 text-xs animate-in slide-in-from-top-2"
                >
                  <button
                    type="button"
                    className="px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground
                               hover:bg-secondary/80 transition-colors font-medium"
                    onClick={() => handleChangeReason(item.id, opposite.newReason)}
                  >
                    {opposite.label}
                  </button>
                  <button
                    type="button"
                    className="text-primary hover:underline font-medium"
                    onClick={() => handleRestore(item.id)}
                  >
                    Restore to inventory
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
