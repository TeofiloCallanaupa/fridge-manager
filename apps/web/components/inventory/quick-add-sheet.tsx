'use client'

import { useState, useEffect } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCategories } from '@/hooks/use-categories'
import { useAddInventoryItem } from '@/hooks/use-inventory-mutations'
import { Plus, Loader2 } from 'lucide-react'
import type { StorageLocation } from '@fridge-manager/shared'

type QuickAddSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  householdId: string
  userId: string
  activeLocation: StorageLocation
}

const LOCATION_OPTIONS: { value: StorageLocation; label: string }[] = [
  { value: 'fridge', label: '🧊 Fridge' },
  { value: 'freezer', label: '❄️ Freezer' },
  { value: 'pantry', label: '🗄️ Pantry' },
]

/**
 * Bottom sheet for adding an item directly to inventory
 * without going through the grocery list.
 *
 * Features:
 * - Name + quantity inputs
 * - Category picker with emoji
 * - Location pre-selected from current tab
 * - Optional expiration date
 */
export function QuickAddSheet({
  open,
  onOpenChange,
  householdId,
  userId,
  activeLocation,
}: QuickAddSheetProps) {
  const { data: categories } = useCategories()
  const addItem = useAddInventoryItem()

  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [location, setLocation] = useState<StorageLocation>(activeLocation)
  const [expirationDate, setExpirationDate] = useState('')

  // Sync location when active tab changes or sheet opens
  useEffect(() => {
    if (open) {
      setLocation(activeLocation)
    }
  }, [activeLocation, open])

  // Auto-populate location when category changes (if it has a default destination)
  useEffect(() => {
    if (!categoryId || !categories) return
    const cat = categories.find((c) => c.id === categoryId)
    if (cat?.default_destination && cat.default_destination !== 'none') {
      setLocation(cat.default_destination as StorageLocation)
    }
  }, [categoryId, categories])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !categoryId) return

    addItem.mutate(
      {
        name: name.trim(),
        quantity: quantity.trim() || null,
        categoryId,
        location,
        householdId,
        userId,
        expirationDate: expirationDate || null,
      },
      {
        onSuccess: () => {
          // Reset form and close
          setName('')
          setQuantity('')
          setCategoryId('')
          setExpirationDate('')
          setLocation(activeLocation)
          onOpenChange(false)
        },
      },
    )
  }

  const isValid = name.trim().length > 0 && categoryId.length > 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-xl font-bold text-primary">
            Quick Add
          </SheetTitle>
          <SheetDescription className="text-on-secondary-container">
            Add an item directly to your inventory
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pb-6">
          {/* Item Name */}
          <div className="space-y-2">
            <label
              htmlFor="quick-add-name"
              className="text-sm font-semibold text-on-surface"
            >
              Item name
            </label>
            <Input
              id="quick-add-name"
              placeholder="e.g. Chicken breast"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={200}
              className="h-12 rounded-xl bg-surface-container-low border-outline-variant/30 focus:ring-primary"
              autoFocus
            />
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <label
              htmlFor="quick-add-quantity"
              className="text-sm font-semibold text-on-surface"
            >
              Quantity{' '}
              <span className="font-normal text-on-secondary-container">
                (optional)
              </span>
            </label>
            <Input
              id="quick-add-quantity"
              placeholder="e.g. 2 lbs, 1 dozen, 3"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              maxLength={50}
              className="h-12 rounded-xl bg-surface-container-low border-outline-variant/30"
            />
          </div>

          {/* Category Picker */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-on-surface">
              Category
            </label>
            <Select
              value={categoryId}
              onValueChange={(v) => v !== null && setCategoryId(v)}
            >
              <SelectTrigger
                className="h-12 rounded-xl bg-surface-container-low border-outline-variant/30"
                aria-label="Category"
              >
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <span className="flex items-center gap-2">
                      <span>{cat.emoji}</span>
                      <span>{cat.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Location Selector */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-on-surface">
              Location
            </label>
            <Select
              value={location}
              onValueChange={(v) =>
                v !== null && setLocation(v as StorageLocation)
              }
            >
              <SelectTrigger
                className="h-12 rounded-xl bg-surface-container-low border-outline-variant/30"
                aria-label="Location"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOCATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Expiration Date */}
          <div className="space-y-2">
            <label
              htmlFor="quick-add-expiration"
              className="text-sm font-semibold text-on-surface"
            >
              Expiration date{' '}
              <span className="font-normal text-on-secondary-container">
                (optional)
              </span>
            </label>
            <Input
              id="quick-add-expiration"
              type="date"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
              className="h-12 rounded-xl bg-surface-container-low border-outline-variant/30"
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={!isValid || addItem.isPending}
            className="w-full h-12 rounded-xl forest-gradient text-white font-semibold text-base hover:opacity-90 transition-opacity"
            aria-label="Add to inventory"
          >
            {addItem.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Plus className="w-5 h-5 mr-2" />
                Add to Inventory
              </>
            )}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
