'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { AddItemSheet } from './add-item-sheet'

type GroceryFabProps = {
  householdId: string
  userId: string
}

/**
 * Floating action button matching the Stitch design.
 * Fixed bottom-right, green gradient, plus icon.
 * Opens the AddItemSheet on click.
 */
export function GroceryFab({ householdId, userId }: GroceryFabProps) {
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setSheetOpen(true)}
        className="fixed bottom-8 right-8 w-14 h-14 forest-gradient text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-all duration-200 z-50 hover:shadow-3xl hover:scale-105"
        aria-label="Add grocery item"
      >
        <Plus className="w-7 h-7" strokeWidth={2.5} />
      </button>

      <AddItemSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        householdId={householdId}
        userId={userId}
      />
    </>
  )
}
