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
import { useAddGroceryItem } from '@/hooks/use-grocery-items'
import { Plus, Loader2 } from 'lucide-react'

type AddItemSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  householdId: string
  userId: string
}

const DESTINATION_OPTIONS = [
  { value: 'fridge', label: '🧊 Fridge' },
  { value: 'freezer', label: '❄️ Freezer' },
  { value: 'pantry', label: '🏠 Pantry' },
  { value: 'none', label: '✕ None' },
] as const

/**
 * Bottom sheet / slide-over for adding a new grocery item.
 * Features: name input, quantity, category picker (with emoji),
 * destination selector (auto-populated from category default).
 */
export function AddItemSheet({
  open,
  onOpenChange,
  householdId,
  userId,
}: AddItemSheetProps) {
  const { data: categories } = useCategories()
  const addItem = useAddGroceryItem()

  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [destination, setDestination] = useState<string>('fridge')

  // Auto-populate destination when category changes
  useEffect(() => {
    if (!categoryId || !categories) return
    const cat = categories.find((c) => c.id === categoryId)
    if (cat?.default_destination) {
      setDestination(cat.default_destination)
    }
  }, [categoryId, categories])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !categoryId) return

    addItem.mutate(
      {
        name: name.trim(),
        quantity: quantity.trim() || null,
        category_id: categoryId,
        destination: destination as 'fridge' | 'freezer' | 'pantry' | 'none',
        household_id: householdId,
        added_by: userId,
      },
      {
        onSuccess: () => {
          // Reset form and close sheet
          setName('')
          setQuantity('')
          setCategoryId('')
          setDestination('fridge')
          onOpenChange(false)
        },
      }
    )
  }

  const isValid = name.trim().length > 0 && categoryId.length > 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-xl font-bold text-primary">
            Add Item
          </SheetTitle>
          <SheetDescription className="text-on-secondary-container">
            Add a new item to your grocery list
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pb-6">
          {/* Item Name */}
          <div className="space-y-2">
            <label
              htmlFor="item-name"
              className="text-sm font-semibold text-on-surface"
            >
              Item name
            </label>
            <Input
              id="item-name"
              placeholder="e.g. Strawberries"
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
              htmlFor="item-quantity"
              className="text-sm font-semibold text-on-surface"
            >
              Quantity{' '}
              <span className="font-normal text-on-secondary-container">
                (optional)
              </span>
            </label>
            <Input
              id="item-quantity"
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
            <Select value={categoryId} onValueChange={(v) => v !== null && setCategoryId(v)}>
              <SelectTrigger className="h-12 rounded-xl bg-surface-container-low border-outline-variant/30">
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

          {/* Destination Selector */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-on-surface">
              Goes to
            </label>
            <Select value={destination} onValueChange={(v) => v !== null && setDestination(v)}>
              <SelectTrigger className="h-12 rounded-xl bg-surface-container-low border-outline-variant/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DESTINATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={!isValid || addItem.isPending}
            className="w-full h-12 rounded-xl forest-gradient text-white font-semibold text-base hover:opacity-90 transition-opacity"
          >
            {addItem.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Plus className="w-5 h-5 mr-2" />
                Add to List
              </>
            )}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
