'use client'

import { useState, useCallback, useRef } from 'react'
import {
  useCheckOffGroceryItem,
  useUncheckGroceryItem,
  useDeleteGroceryItem,
} from '@/hooks/use-grocery-items'
import { Check, Trash2, MoreVertical } from 'lucide-react'
import type { GroceryItemWithCategory } from '@/hooks/use-grocery-items'

type GroceryItemCardProps = {
  item: GroceryItemWithCategory
  userId: string
  householdId: string
}

/**
 * Individual grocery item card matching the Stitch design.
 * - Unchecked: white card with editorial shadow, circle border, name/quantity
 * - Checked: faded card with filled green circle, strikethrough name, dashed border
 * - Click the circle to toggle check-off with spring animation
 * - Long-press or tap menu icon for delete (touch-accessible)
 */
export function GroceryItemCard({ item, userId, householdId }: GroceryItemCardProps) {
  const checkOff = useCheckOffGroceryItem()
  const uncheckItem = useUncheckGroceryItem()
  const deleteItem = useDeleteGroceryItem()
  const [isAnimating, setIsAnimating] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleToggle = useCallback(() => {
    if (item.checked) {
      uncheckItem.mutate({ itemId: item.id, householdId })
    } else {
      // Start animation, then fire the mutation
      setIsAnimating(true)
      setTimeout(() => {
        checkOff.mutate(
          { item, userId },
          {
            onSettled: () => {
              // Always reset animation state, whether success or failure
              setIsAnimating(false)
            },
          }
        )
      }, 300)
    }
  }, [item, userId, householdId, checkOff, uncheckItem])

  const handleDelete = useCallback(() => {
    setShowActions(false)
    deleteItem.mutate({ itemId: item.id, householdId })
  }, [item.id, householdId, deleteItem])

  // Touch-accessible: long press to reveal delete
  const handleTouchStart = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      setShowActions(true)
    }, 500)
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  if (item.checked) {
    return (
      <div
        className="bg-surface-container-lowest/60 opacity-60 rounded-2xl p-4 flex items-center justify-between border border-dashed border-outline-variant/30 transition-all duration-300"
        onClick={handleToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleToggle()}
        aria-label={`Uncheck ${item.name}`}
      >
        <div className="flex items-center gap-4">
          {/* Filled green circle with checkmark */}
          <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
            <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-on-background line-through">
              {item.name}
            </span>
            {item.quantity && (
              <span className="text-on-secondary-container text-sm">
                ({item.quantity})
              </span>
            )}
          </div>
        </div>
        <DestinationBadge destination={item.destination} />
      </div>
    )
  }

  return (
    <div
      className={`bg-surface-container-lowest editorial-shadow rounded-2xl p-4 flex items-center justify-between transition-all duration-150 active:scale-[0.98] ${
        isAnimating ? 'opacity-60 scale-[0.98]' : ''
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <div className="flex items-center gap-4">
        {/* Unchecked circle */}
        <button
          onClick={handleToggle}
          className="relative w-6 h-6 border-2 border-primary rounded-full flex items-center justify-center hover:bg-primary/10 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
          aria-label={`Check off ${item.name}`}
        >
          {isAnimating && (
            <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center animate-check-fill absolute inset-0">
              <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
            </div>
          )}
        </button>
        <div className="flex flex-col">
          <span
            className={`font-semibold text-on-background ${
              isAnimating ? 'animate-strike-through' : ''
            }`}
          >
            {item.name}
          </span>
          {item.quantity && (
            <span className="text-on-secondary-container text-sm">
              ({item.quantity})
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {showActions ? (
          <button
            onClick={handleDelete}
            className="p-1.5 rounded-full hover:bg-error-container/50 text-on-secondary-container hover:text-error transition-colors"
            aria-label={`Delete ${item.name}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        ) : (
          /* Always-visible menu icon for touch — tap to reveal delete */
          <button
            onClick={() => setShowActions(true)}
            className="p-1.5 rounded-full text-on-secondary-container/40 hover:text-on-secondary-container transition-colors md:hidden"
            aria-label={`More options for ${item.name}`}
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        )}
        <DestinationBadge destination={item.destination} />
      </div>
    </div>
  )
}

function DestinationBadge({
  destination,
}: {
  destination: string | null
}) {
  if (!destination || destination === 'none') return null

  const config: Record<string, { emoji: string; label: string; bg: string }> = {
    fridge: { emoji: '🧊', label: 'Fridge', bg: 'bg-primary-fixed/50' },
    freezer: { emoji: '❄️', label: 'Freezer', bg: 'bg-tertiary-fixed/50' },
    pantry: { emoji: '🏠', label: 'Pantry', bg: 'bg-[#fce4cc]/50' },
  }

  const c = config[destination]
  if (!c) return null

  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-full ${c.bg}`}>
      {c.emoji} {c.label}
    </span>
  )
}
