'use client'

import { useState, useCallback, useMemo } from 'react'
import { formatRelativeTime } from '@fridge-manager/shared'
import { useRestoreItem, useChangeDiscardReason } from '@/hooks/use-inventory-mutations'
import { useRemovalHistory } from '@/hooks/use-inventory-items'
import { useHousehold } from '@/hooks/use-household'
import type { InventoryItemWithDetails } from '@/hooks/use-inventory-items'
import type { DiscardReason } from '@fridge-manager/shared'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the opposite discard reason for the toggle button.
 * consumed ↔ wasted (we don't toggle to 'expired' since that's auto-detected)
 */
function getOppositeReason(reason: DiscardReason | null): {
  label: string
  newReason: DiscardReason
} {
  if (reason === 'consumed') {
    return { label: 'Change to Tossed', newReason: 'wasted' }
  }
  return { label: 'Change to Used', newReason: 'consumed' }
}

/** Format a date as a readable day header: "Wednesday, April 16" */
function formatDayHeader(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

/** Get the date key for grouping: "2026-04-16" */
function getDateKey(isoString: string): string {
  return isoString.split('T')[0]
}

/** Map discard_reason to a display chip */
function getReasonChip(reason: DiscardReason | null) {
  switch (reason) {
    case 'consumed':
      return { label: 'Used', className: 'bg-[#AFF1C6] text-[#002111]' }
    case 'wasted':
      return { label: 'Wasted', className: 'bg-[#F59E0B] text-white' }
    case 'expired':
      return { label: 'Expired', className: 'bg-[#FFDAD6] text-[#93000A]' }
    default:
      return { label: 'Removed', className: 'bg-muted text-muted-foreground' }
  }
}

/** Group items by date key, preserving order */
function groupByDay(
  items: InventoryItemWithDetails[],
): { dateKey: string; date: Date; items: InventoryItemWithDetails[] }[] {
  const groups = new Map<string, InventoryItemWithDetails[]>()

  for (const item of items) {
    if (!item.discarded_at) continue
    const key = getDateKey(item.discarded_at)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(item)
  }

  return Array.from(groups.entries()).map(([key, groupItems]) => ({
    dateKey: key,
    date: new Date(key + 'T00:00:00'),
    items: groupItems,
  }))
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function RemovalHistoryPage() {
  const household = useHousehold()
  const householdId = household?.id ?? ''

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1) // 1-indexed

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const restoreMutation = useRestoreItem()
  const changeReasonMutation = useChangeDiscardReason()

  const { data: items, isLoading } = useRemovalHistory(householdId, year, month)

  // Summary counts
  const summary = useMemo(() => {
    if (!items) return { consumed: 0, wasted: 0, expired: 0, total: 0 }
    return {
      consumed: items.filter((i) => i.discard_reason === 'consumed').length,
      wasted: items.filter((i) => i.discard_reason === 'wasted').length,
      expired: items.filter((i) => i.discard_reason === 'expired').length,
      total: items.length,
    }
  }, [items])

  // Group by day
  const dayGroups = useMemo(() => groupByDay(items ?? []), [items])

  // Month navigation
  const goToPrevMonth = useCallback(() => {
    if (month === 1) {
      setMonth(12)
      setYear((y) => y - 1)
    } else {
      setMonth((m) => m - 1)
    }
  }, [month])

  const goToNextMonth = useCallback(() => {
    if (month === 12) {
      setMonth(1)
      setYear((y) => y + 1)
    } else {
      setMonth((m) => m + 1)
    }
  }, [month])

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

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-[#F9F9F7]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#F9F9F7]/95 backdrop-blur-sm px-6 pt-6 pb-4">
        <a
          href="/inventory"
          className="text-sm text-[#3B7A57] hover:underline inline-flex items-center gap-1"
          aria-label="Back to inventory"
        >
          ← Inventory
        </a>
        <h1 className="text-xl font-semibold text-[#1A1C1B] mt-2">
          Removal History
        </h1>

        {/* Month/Year navigation */}
        <div className="flex items-center gap-3 mt-3">
          <button
            type="button"
            onClick={goToPrevMonth}
            className="p-1.5 rounded-full hover:bg-[#EEEEEC] transition-colors"
            aria-label="Previous month"
          >
            ◀
          </button>
          <span className="text-sm font-medium text-[#1A1C1B]">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button
            type="button"
            onClick={goToNextMonth}
            className="p-1.5 rounded-full hover:bg-[#EEEEEC] transition-colors"
            aria-label="Next month"
          >
            ▶
          </button>
        </div>
      </header>

      <main className="px-6 pb-24">
        {/* Loading state */}
        {isLoading && (
          <div data-testid="history-loading" className="space-y-4 mt-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 rounded-xl bg-[#EEEEEC] animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && (!items || items.length === 0) && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-lg font-semibold text-[#1A1C1B] mt-4">
              Nothing removed this month
            </p>
            <p className="text-sm text-[#5E6572] mt-1">
              Your inventory stayed intact! 🎉
            </p>
          </div>
        )}

        {/* Summary card */}
        {!isLoading && items && items.length > 0 && (
          <>
            <div
              data-testid="summary-card"
              className="mt-4 p-5 rounded-xl bg-white"
              style={{
                boxShadow: '0px 12px 32px rgba(26, 28, 27, 0.06)',
              }}
            >
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#3B7A57] font-mono">
                    {summary.consumed}
                  </p>
                  <p className="text-xs text-[#5E6572] mt-1">Used</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#F59E0B] font-mono">
                    {summary.wasted}
                  </p>
                  <p className="text-xs text-[#5E6572] mt-1">Wasted</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#EF4444] font-mono">
                    {summary.expired}
                  </p>
                  <p className="text-xs text-[#5E6572] mt-1">Expired</p>
                </div>
              </div>
              <p className="text-xs text-[#707972] mt-3">
                {summary.total} items removed
              </p>
            </div>

            {/* Daily groups */}
            <div className="mt-6 space-y-6">
              {dayGroups.map((group) => (
                <div key={group.dateKey}>
                  {/* Day header */}
                  <p
                    data-testid="day-header"
                    className="text-xs font-medium text-[#5E6572] uppercase tracking-wide px-1 mb-2"
                  >
                    {formatDayHeader(group.date)}
                  </p>

                  {/* Items for this day */}
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const emoji = item.categories?.emoji ?? '📦'
                      const removedBy = item.profiles?.display_name ?? 'Unknown'
                      const removedAt = item.discarded_at
                        ? formatRelativeTime(new Date(item.discarded_at))
                        : ''
                      const chip = getReasonChip(item.discard_reason)
                      const isExpanded = expandedId === item.id
                      const opposite = getOppositeReason(item.discard_reason)

                      return (
                        <div key={item.id}>
                          <div
                            data-testid="history-item-card"
                            className="flex items-center gap-3 py-2.5 px-3 rounded-xl
                                       bg-white hover:bg-[#F4F4F2] transition-colors cursor-pointer"
                            onClick={() => handleToggleExpand(item.id)}
                            role="button"
                            tabIndex={0}
                            aria-expanded={isExpanded}
                            aria-label={`${item.name}, ${chip.label}, by ${removedBy}`}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                handleToggleExpand(item.id)
                              }
                            }}
                          >
                            <span className="text-lg flex-shrink-0" aria-hidden="true">
                              {emoji}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[#1A1C1B] truncate">
                                {item.name}
                              </p>
                              <p className="text-xs text-[#707972]">
                                by {removedBy} · {removedAt}
                              </p>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${chip.className}`}
                            >
                              {chip.label}
                            </span>
                          </div>

                          {/* Correction panel */}
                          {isExpanded && (
                            <div
                              className="ml-10 mr-3 mb-2 py-2 px-3 rounded-lg bg-[#F4F4F2]
                                         flex items-center gap-3 text-xs"
                            >
                              <button
                                type="button"
                                className="px-2.5 py-1 rounded-full bg-[#DCE2F3] text-[#5E6572]
                                           hover:bg-[#C0C7D6] transition-colors font-medium"
                                onClick={() =>
                                  handleChangeReason(item.id, opposite.newReason)
                                }
                              >
                                {opposite.label}
                              </button>
                              <button
                                type="button"
                                className="text-[#3B7A57] hover:underline font-medium"
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
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
