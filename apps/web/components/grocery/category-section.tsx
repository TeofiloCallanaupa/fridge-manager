'use client'

import { useMemo, useState } from 'react'
import { GroceryItemCard } from './grocery-item-card'
import { ChevronDown } from 'lucide-react'
import type { GroceryItemWithCategory } from '@/hooks/use-grocery-items'
import type { Category } from '@fridge-manager/shared'

type CategorySectionProps = {
  category: Pick<Category, 'id' | 'name' | 'emoji' | 'display_order'>
  items: GroceryItemWithCategory[]
  userId: string
  householdId: string
}

/**
 * Renders a category group with a header (emoji + name) and item cards.
 * Unchecked items appear first, checked items at the bottom.
 * Auto-collapses when all items are checked.
 */
export function CategorySection({
  category,
  items,
  userId,
  householdId,
}: CategorySectionProps) {
  const { unchecked, checked } = useMemo(() => {
    const unchecked: GroceryItemWithCategory[] = []
    const checked: GroceryItemWithCategory[] = []
    for (const item of items) {
      if (item.checked) {
        checked.push(item)
      } else {
        unchecked.push(item)
      }
    }
    return { unchecked, checked }
  }, [items])

  const allChecked = unchecked.length === 0 && checked.length > 0
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Category color mapping for the emoji background
  const emojiBackground = getCategoryColor(category.name)

  return (
    <section className="space-y-4">
      {/* Category Header */}
      <button
        className="flex items-center gap-3 px-2 w-full text-left group"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${emojiBackground}`}
        >
          {category.emoji}
        </div>
        <h2 className="text-xl font-bold tracking-tight text-on-surface flex-1">
          {category.name}
        </h2>
        {(allChecked || checked.length > 0) && (
          <div className="flex items-center gap-2">
            {checked.length > 0 && (
              <span className="text-xs font-medium text-on-secondary-container">
                {checked.length} done
              </span>
            )}
            <ChevronDown
              className={`w-5 h-5 text-on-secondary-container transition-transform duration-200 ${
                isCollapsed ? '-rotate-90' : ''
              }`}
            />
          </div>
        )}
      </button>

      {/* Items */}
      {!isCollapsed && (
        <div className="space-y-3">
          {/* Unchecked items first */}
          {unchecked.map((item) => (
            <GroceryItemCard
              key={item.id}
              item={item}
              userId={userId}
              householdId={householdId}
            />
          ))}
          {/* Checked items at the bottom */}
          {checked.map((item) => (
            <GroceryItemCard
              key={item.id}
              item={item}
              userId={userId}
              householdId={householdId}
            />
          ))}
        </div>
      )}
    </section>
  )
}

/**
 * Maps category names to their Stitch design background colors.
 */
function getCategoryColor(categoryName: string): string {
  const colorMap: Record<string, string> = {
    produce: 'bg-primary-fixed',
    dairy: 'bg-secondary-fixed',
    meat: 'bg-error-container',
    bakery: 'bg-[#fce4cc]',
    frozen: 'bg-tertiary-fixed',
    snacks: 'bg-[#fff3cc]',
    beverages: 'bg-[#d4edda]',
    condiments: 'bg-surface-container-high',
    leftovers: 'bg-[#e8d5f5]',
    household: 'bg-tertiary-fixed',
  }
  return colorMap[categoryName.toLowerCase()] ?? 'bg-surface-container-high'
}
