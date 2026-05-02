'use client'

import { useState, useCallback } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ExpirationBadge } from './expiration-badge'
import {
  useEditInventoryItem,
  useDiscardItem,
  useReAddToGroceryList,
  usePurchaseHistoryCount,
} from '@/hooks/use-inventory-mutations'
import {
  getDaysSince,
  formatPurchaseHistory,
} from '@fridge-manager/shared'
import type { InventoryItemWithDetails } from '@/hooks/use-inventory-items'
import type { StorageLocation } from '@fridge-manager/shared'
import {
  Pencil,
  Check,
  Trash2,
  ShoppingCart,
  X,
  MapPin,
  Clock,
  User,
  Package,
} from 'lucide-react'
import { toast } from 'sonner'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ItemDetailSheetProps = {
  item: InventoryItemWithDetails | null
  open: boolean
  onClose: () => void
  userId: string
  householdId: string
}

const LOCATION_CONFIG: Record<StorageLocation, { emoji: string; label: string; bg: string }> = {
  fridge: { emoji: '🧊', label: 'Fridge', bg: 'bg-blue-100 text-blue-800' },
  freezer: { emoji: '❄️', label: 'Freezer', bg: 'bg-cyan-100 text-cyan-800' },
  pantry: { emoji: '🗄️', label: 'Pantry', bg: 'bg-amber-100 text-amber-800' },
}

const LOCATIONS: StorageLocation[] = ['fridge', 'freezer', 'pantry']

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ItemDetailSheet({
  item,
  open,
  onClose,
  userId,
  householdId,
}: ItemDetailSheetProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editQuantity, setEditQuantity] = useState('')
  const [editLocation, setEditLocation] = useState<StorageLocation>('fridge')
  const [editExpiration, setEditExpiration] = useState('')

  const editMutation = useEditInventoryItem()
  const discardMutation = useDiscardItem()
  const reAddMutation = useReAddToGroceryList()

  const { data: purchaseCount } = usePurchaseHistoryCount(
    householdId,
    item?.name ?? '',
    open && !!item,
  )

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleStartEdit = useCallback(() => {
    if (!item) return
    setEditName(item.name)
    setEditQuantity(item.quantity ?? '')
    setEditLocation(item.location)
    setEditExpiration(item.expiration_date?.split('T')[0] ?? '')
    setIsEditing(true)
  }, [item])

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false)
  }, [])

  const handleSaveEdit = useCallback(() => {
    if (!item) return

    const updates: Record<string, string | null> = {}
    const trimmedName = editName.trim()
    if (trimmedName && trimmedName !== item.name) updates.name = trimmedName
    if (editQuantity !== (item.quantity ?? '')) {
      updates.quantity = editQuantity || null
    }
    if (editLocation !== item.location) updates.location = editLocation
    if (editExpiration !== (item.expiration_date?.split('T')[0] ?? '')) {
      updates.expiration_date = editExpiration || null
    }

    if (Object.keys(updates).length === 0) {
      setIsEditing(false)
      return
    }

    editMutation.mutate(
      { itemId: item.id, householdId, updates },
      {
        onSuccess: () => {
          setIsEditing(false)
        },
      },
    )
  }, [item, editName, editQuantity, editLocation, editExpiration, householdId, editMutation])

  const handleDiscard = useCallback(
    (type: 'consumed' | 'tossed') => {
      if (!item) return

      let reason: 'consumed' | 'wasted' | 'expired' = 'consumed'
      if (type === 'tossed') {
        // Auto-detect expired vs wasted based on expiration date
        if (item.expiration_date && new Date() > new Date(item.expiration_date)) {
          reason = 'expired'
        } else {
          reason = 'wasted'
        }
      }

      discardMutation.mutate(
        { itemId: item.id, householdId, reason },
        {
          onSuccess: () => {
            const label = type === 'consumed' ? 'Marked as used' : 'Marked as tossed'
            toast.success(label, {
              action: {
                label: 'Add to grocery list',
                onClick: () => {
                  if (!item.category_id) return
                  reAddMutation.mutate({
                    name: item.name,
                    quantity: item.quantity,
                    categoryId: item.category_id,
                    destination: item.location,
                    householdId,
                    addedBy: userId,
                  })
                },
              },
            })
            onClose()
          },
        },
      )
    },
    [item, householdId, userId, discardMutation, reAddMutation, onClose],
  )

  const handleReAdd = useCallback(() => {
    if (!item || !item.category_id) return
    reAddMutation.mutate({
      name: item.name,
      quantity: item.quantity,
      categoryId: item.category_id,
      destination: item.location,
      householdId,
      addedBy: userId,
    })
  }, [item, householdId, userId, reAddMutation])

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setIsEditing(false)
        onClose()
      }
    },
    [onClose],
  )

  if (!item) return null

  const daysAgo = getDaysSince(new Date(item.added_at))
  const addedByName = item.profiles?.display_name ?? 'Unknown'
  const emoji = item.categories?.emoji ?? '📦'
  const categoryName = item.categories?.name ?? 'Other'
  const locationConfig = LOCATION_CONFIG[item.location]

  const daysAgoText =
    daysAgo === 0
      ? 'Added today'
      : daysAgo === 1
        ? 'Added yesterday'
        : `Added ${daysAgo} days ago`

  const isMutating =
    editMutation.isPending || discardMutation.isPending || reAddMutation.isPending

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl max-h-[85vh] overflow-y-auto pb-safe"
        aria-label={`Details for ${item.name}`}
      >
        <SheetHeader className="pb-2">
          <div className="flex items-start gap-3">
            <span className="text-4xl" aria-hidden="true">
              {emoji}
            </span>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg font-bold truncate">
                {item.name}
              </SheetTitle>
              <SheetDescription className="flex items-center gap-2 mt-0.5">
                <span className="capitalize">{categoryName}</span>
                {item.quantity && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{item.quantity}</span>
                  </>
                )}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Info section */}
        <div className="px-4 space-y-3">
          {/* Location */}
          <div className="flex items-center gap-2.5 text-sm">
            <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <Badge variant="outline" className={locationConfig.bg}>
              {locationConfig.emoji} {locationConfig.label}
            </Badge>
          </div>

          {/* Expiration */}
          {item.expiration_date && (
            <div className="flex items-center gap-2.5 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <ExpirationBadge expirationDate={item.expiration_date} />
            </div>
          )}

          {/* Added info */}
          <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <User className="w-4 h-4 flex-shrink-0" />
            <span>
              {daysAgoText} by {addedByName}
            </span>
          </div>

          {/* Purchase history */}
          <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <Package className="w-4 h-4 flex-shrink-0" />
            <span>
              {purchaseCount !== undefined
                ? formatPurchaseHistory(purchaseCount)
                : 'Loading...'}
            </span>
          </div>
        </div>

        {/* Edit mode */}
        {isEditing && (
          <div
            className="px-4 pt-4 space-y-3 border-t border-border mt-4"
            role="form"
            aria-label="Edit item"
          >
            <div>
              <label
                htmlFor="edit-item-name"
                className="text-xs font-medium text-muted-foreground"
              >
                Name
              </label>
              <Input
                id="edit-item-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={200}
                className="mt-1"
              />
            </div>
            <div>
              <label
                htmlFor="edit-item-quantity"
                className="text-xs font-medium text-muted-foreground"
              >
                Quantity
              </label>
              <Input
                id="edit-item-quantity"
                value={editQuantity}
                onChange={(e) => setEditQuantity(e.target.value)}
                maxLength={50}
                placeholder="e.g. 2 lbs"
                className="mt-1"
              />
            </div>
            <div>
              <label
                htmlFor="edit-item-expiration"
                className="text-xs font-medium text-muted-foreground"
              >
                Expiration Date
              </label>
              <Input
                id="edit-item-expiration"
                type="date"
                value={editExpiration}
                onChange={(e) => setEditExpiration(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground block mb-1.5">
                Location
              </span>
              <div className="flex gap-2">
                {LOCATIONS.map((loc) => {
                  const config = LOCATION_CONFIG[loc]
                  return (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setEditLocation(loc)}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all
                        ${
                          editLocation === loc
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      aria-pressed={editLocation === loc}
                      aria-label={`${config.label} location`}
                    >
                      {config.emoji} {config.label}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelEdit}
                className="flex-1"
                disabled={editMutation.isPending}
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEdit}
                className="flex-1"
                disabled={editMutation.isPending || !editName.trim()}
              >
                <Check className="w-4 h-4 mr-1" />
                {editMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        )}

        {/* Actions footer */}
        {!isEditing && (
          <SheetFooter className="grid grid-cols-2 gap-2 pt-4 border-t border-border mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleStartEdit}
              disabled={isMutating}
              aria-label="Edit item"
            >
              <Pencil className="w-4 h-4 mr-1.5" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReAdd}
              disabled={isMutating}
              aria-label="Add to grocery list"
            >
              <ShoppingCart className="w-4 h-4 mr-1.5" />
              Add to List
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleDiscard('consumed')}
              disabled={isMutating}
              className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
              aria-label="Mark as used"
            >
              <Check className="w-4 h-4 mr-1.5" />
              {discardMutation.isPending ? 'Removing...' : 'Used it'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleDiscard('tossed')}
              disabled={isMutating}
              className="bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
              aria-label="Mark as tossed"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              {discardMutation.isPending ? 'Removing...' : 'Tossed it'}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}
