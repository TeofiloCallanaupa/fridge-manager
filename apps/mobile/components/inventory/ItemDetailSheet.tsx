import React, { useState, useCallback, useEffect } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native'
import {
  Text,
  Portal,
  Modal,
  Button,
  TextInput,
  Divider,
  useTheme,
} from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { getDaysSince } from '@fridge-manager/shared'
import type { StorageLocation } from '@fridge-manager/shared'
import type { InventoryItemWithDetails } from '../../hooks/use-inventory-items'
import {
  useEditInventoryItem,
  useDiscardItem,
  useReAddToGroceryList,
} from '../../hooks/use-inventory-mutations'
import { ExpirationBadge } from './ExpirationBadge'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ItemDetailSheetProps = {
  item: InventoryItemWithDetails | null
  visible: boolean
  onDismiss: () => void
  userId: string
  householdId: string
  /** Called after a successful discard + optional re-add */
  onComplete?: (action: 'consumed' | 'tossed', reAdded: boolean) => void
}

type ViewMode = 'detail' | 'edit' | 'discard' | 'restock'

const LOCATION_CONFIG: Record<
  StorageLocation,
  { emoji: string; label: string; icon: string }
> = {
  fridge: { emoji: '🧊', label: 'Fridge', icon: 'fridge-outline' },
  freezer: { emoji: '❄️', label: 'Freezer', icon: 'snowflake' },
  pantry: { emoji: '🗄️', label: 'Pantry', icon: 'cabinet' },
}

const LOCATIONS: StorageLocation[] = ['fridge', 'freezer', 'pantry']

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Full item detail + edit sheet for mobile.
 * - Default: shows item details (name, quantity, location, expiration, added-by)
 * - Edit mode: inline form to update name, quantity, expiration, location
 * - Discard mode: Used it / Tossed it flow (reuses existing DiscardSheet logic)
 */
export function ItemDetailSheet({
  item,
  visible,
  onDismiss,
  userId,
  householdId,
  onComplete,
}: ItemDetailSheetProps) {
  const theme = useTheme()
  const [mode, setMode] = useState<ViewMode>('detail')

  // Edit form state
  const [editName, setEditName] = useState('')
  const [editQuantity, setEditQuantity] = useState('')
  const [editLocation, setEditLocation] = useState<StorageLocation>('fridge')
  const [editExpiration, setEditExpiration] = useState('')

  // Discard flow state
  const [chosenAction, setChosenAction] = useState<'consumed' | 'tossed' | null>(null)

  const editMutation = useEditInventoryItem()
  const discardMutation = useDiscardItem()
  const reAddMutation = useReAddToGroceryList()

  // Reset state when sheet opens/closes or item changes
  useEffect(() => {
    if (!visible) {
      setMode('detail')
      setChosenAction(null)
    }
  }, [visible])

  // -------------------------------------------------------------------------
  // Edit handlers
  // -------------------------------------------------------------------------

  const handleStartEdit = useCallback(() => {
    if (!item) return
    setEditName(item.name)
    setEditQuantity(item.quantity ?? '')
    setEditLocation(item.location)
    setEditExpiration(item.expiration_date?.split('T')[0] ?? '')
    setMode('edit')
  }, [item])

  const handleCancelEdit = useCallback(() => {
    setMode('detail')
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

    const currentExpDate = item.expiration_date?.split('T')[0] ?? ''
    if (editExpiration !== currentExpDate) {
      updates.expiration_date = editExpiration || null
    }

    if (Object.keys(updates).length === 0) {
      setMode('detail')
      return
    }

    editMutation.mutate(
      { itemId: item.id, householdId, updates },
      {
        onSuccess: () => {
          setMode('detail')
        },
      }
    )
  }, [item, editName, editQuantity, editLocation, editExpiration, householdId, editMutation])



  // -------------------------------------------------------------------------
  // Discard handlers
  // -------------------------------------------------------------------------

  const handleDiscard = useCallback(
    (action: 'consumed' | 'tossed') => {
      if (!item) return

      let reason: 'consumed' | 'wasted' | 'expired' = 'consumed'
      if (action === 'tossed') {
        if (
          item.expiration_date &&
          new Date() > new Date(item.expiration_date)
        ) {
          reason = 'expired'
        } else {
          reason = 'wasted'
        }
      }

      setChosenAction(action)

      discardMutation.mutate(
        { itemId: item.id, householdId, reason },
        {
          onSuccess: () => {
            setMode('restock')
          },
          onError: () => {
            onDismiss()
          },
        }
      )
    },
    [item, householdId, discardMutation, onDismiss]
  )

  const handleRestock = useCallback(
    (addToList: boolean) => {
      if (!item || !chosenAction) return

      if (addToList && item.category_id) {
        reAddMutation.mutate(
          {
            name: item.name,
            quantity: item.quantity,
            categoryId: item.category_id,
            destination: item.location,
            householdId,
            addedBy: userId,
          },
          {
            onSuccess: () => {
              onComplete?.(chosenAction, true)
              onDismiss()
            },
            onError: () => {
              onComplete?.(chosenAction, false)
              onDismiss()
            },
          }
        )
      } else {
        onComplete?.(chosenAction, false)
        onDismiss()
      }
    },
    [item, chosenAction, householdId, userId, reAddMutation, onComplete, onDismiss]
  )

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (!item) return null

  const emoji = item.categories?.emoji ?? '📦'
  const categoryName = item.categories?.name ?? 'Other'
  const addedByName = item.profiles?.display_name ?? 'Unknown'
  const daysAgo = getDaysSince(new Date(item.added_at))
  const locationConfig = LOCATION_CONFIG[item.location]
  const isMutating =
    editMutation.isPending || discardMutation.isPending || reAddMutation.isPending

  const daysAgoText =
    daysAgo === 0
      ? 'Added today'
      : daysAgo === 1
        ? 'Added yesterday'
        : `Added ${daysAgo} days ago`

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.modal,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Item header */}
          <View style={styles.itemHeader}>
            <Text style={styles.emoji}>{emoji}</Text>
            <Text
              variant="titleLarge"
              style={[styles.itemName, { color: theme.colors.onSurface }]}
            >
              {item.name}
            </Text>
            {item.quantity && (
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                {item.quantity}
              </Text>
            )}
          </View>

          {/* ---- DETAIL VIEW ---- */}
          {mode === 'detail' && (
            <>
              <View style={styles.detailSection}>
                {/* Location */}
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons
                    name={locationConfig.icon as any}
                    size={20}
                    color={theme.colors.onSurfaceVariant}
                  />
                  <Text
                    variant="bodyMedium"
                    style={{ color: theme.colors.onSurface }}
                  >
                    {locationConfig.emoji} {locationConfig.label}
                  </Text>
                </View>

                {/* Category */}
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons
                    name="tag-outline"
                    size={20}
                    color={theme.colors.onSurfaceVariant}
                  />
                  <Text
                    variant="bodyMedium"
                    style={{ color: theme.colors.onSurface }}
                  >
                    {categoryName}
                  </Text>
                </View>

                {/* Expiration */}
                {item.expiration_date && (
                  <View style={styles.detailRow}>
                    <MaterialCommunityIcons
                      name="clock-outline"
                      size={20}
                      color={theme.colors.onSurfaceVariant}
                    />
                    <ExpirationBadge expirationDate={item.expiration_date} />
                  </View>
                )}

                {/* Added info */}
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons
                    name="account-outline"
                    size={20}
                    color={theme.colors.onSurfaceVariant}
                  />
                  <Text
                    variant="bodyMedium"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    {daysAgoText} by {addedByName}
                  </Text>
                </View>
              </View>

              <Divider style={styles.divider} />

              {/* Action buttons */}
              <View style={styles.actionGrid}>
                {/* Edit */}
                <Pressable
                  testID="detail-edit-button"
                  onPress={handleStartEdit}
                  disabled={isMutating}
                  style={({ pressed }) => [
                    styles.actionCard,
                    {
                      backgroundColor: theme.colors.surfaceVariant,
                      opacity: pressed ? 0.8 : isMutating ? 0.5 : 1,
                    },
                  ]}
                  accessibilityLabel="Edit item details"
                  accessibilityRole="button"
                >
                  <MaterialCommunityIcons
                    name="pencil-outline"
                    size={22}
                    color={theme.colors.primary}
                  />
                  <Text
                    variant="labelMedium"
                    style={{ color: theme.colors.onSurface, marginTop: 4 }}
                  >
                    Edit
                  </Text>
                </Pressable>

                {/* Used it */}
                <Pressable
                  testID="detail-used-button"
                  onPress={() => handleDiscard('consumed')}
                  disabled={isMutating}
                  style={({ pressed }) => [
                    styles.actionCard,
                    {
                      backgroundColor: '#DCFCE7',
                      opacity: pressed ? 0.8 : isMutating ? 0.5 : 1,
                    },
                  ]}
                  accessibilityLabel="Mark as used"
                  accessibilityRole="button"
                >
                  <MaterialCommunityIcons
                    name="check-circle-outline"
                    size={22}
                    color="#166534"
                  />
                  <Text
                    variant="labelMedium"
                    style={{ color: '#166534', marginTop: 4 }}
                  >
                    Used it
                  </Text>
                </Pressable>

                {/* Tossed it */}
                <Pressable
                  testID="detail-tossed-button"
                  onPress={() => handleDiscard('tossed')}
                  disabled={isMutating}
                  style={({ pressed }) => [
                    styles.actionCard,
                    {
                      backgroundColor: '#FFDAD6',
                      opacity: pressed ? 0.8 : isMutating ? 0.5 : 1,
                    },
                  ]}
                  accessibilityLabel="Mark as tossed"
                  accessibilityRole="button"
                >
                  <MaterialCommunityIcons
                    name="delete-outline"
                    size={22}
                    color="#BA1A1A"
                  />
                  <Text
                    variant="labelMedium"
                    style={{ color: '#BA1A1A', marginTop: 4 }}
                  >
                    Tossed it
                  </Text>
                </Pressable>
              </View>
            </>
          )}

          {/* ---- EDIT VIEW ---- */}
          {mode === 'edit' && (
            <View style={styles.editSection}>
              <Text
                variant="titleMedium"
                style={[styles.editTitle, { color: theme.colors.onSurface }]}
              >
                Edit Item
              </Text>

              {/* Name */}
              <TextInput
                testID="edit-item-name"
                label="Name"
                value={editName}
                onChangeText={setEditName}
                maxLength={200}
                mode="outlined"
                style={styles.input}
              />

              {/* Quantity */}
              <TextInput
                testID="edit-item-quantity"
                label="Quantity"
                value={editQuantity}
                onChangeText={setEditQuantity}
                maxLength={50}
                placeholder="e.g. 2 lbs"
                mode="outlined"
                style={styles.input}
              />

              {/* Expiration Date */}
              <TextInput
                testID="edit-item-expiration"
                label="Expiration Date"
                value={editExpiration}
                onChangeText={setEditExpiration}
                placeholder="YYYY-MM-DD"
                mode="outlined"
                style={styles.input}
                right={
                  editExpiration ? (
                    <TextInput.Icon
                      icon="close-circle"
                      onPress={() => setEditExpiration('')}
                      forceTextInputFocus={false}
                    />
                  ) : undefined
                }
                left={<TextInput.Icon icon="calendar" />}
              />

              {/* Location */}
              <Text
                variant="labelMedium"
                style={{
                  color: theme.colors.onSurfaceVariant,
                  marginBottom: 8,
                  marginTop: 12,
                }}
              >
                Location
              </Text>
              <View style={styles.locationRow}>
                {LOCATIONS.map((loc) => {
                  const config = LOCATION_CONFIG[loc]
                  const isSelected = editLocation === loc
                  return (
                    <Pressable
                      key={loc}
                      testID={`edit-location-${loc}`}
                      onPress={() => setEditLocation(loc)}
                      style={[
                        styles.locationChip,
                        {
                          backgroundColor: isSelected
                            ? theme.colors.primaryContainer
                            : theme.colors.surfaceVariant,
                          borderColor: isSelected
                            ? theme.colors.primary
                            : 'transparent',
                          borderWidth: isSelected ? 1.5 : 0,
                        },
                      ]}
                      accessibilityLabel={`${config.label} location`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                    >
                      <Text style={styles.locationEmoji}>{config.emoji}</Text>
                      <Text
                        variant="labelMedium"
                        style={{
                          color: isSelected
                            ? theme.colors.onPrimaryContainer
                            : theme.colors.onSurfaceVariant,
                          fontWeight: isSelected ? '600' : '400',
                        }}
                      >
                        {config.label}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>

              {/* Save / Cancel */}
              <View style={styles.editActions}>
                <Button
                  testID="edit-cancel-button"
                  mode="outlined"
                  onPress={handleCancelEdit}
                  disabled={editMutation.isPending}
                  style={styles.editButton}
                >
                  Cancel
                </Button>
                <Button
                  testID="edit-save-button"
                  mode="contained"
                  onPress={handleSaveEdit}
                  loading={editMutation.isPending}
                  disabled={editMutation.isPending || !editName.trim()}
                  style={styles.editButton}
                >
                  Save
                </Button>
              </View>

              {editMutation.isError && (
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.error, textAlign: 'center', marginTop: 8 }}
                >
                  {editMutation.error?.message ?? 'Failed to update item'}
                </Text>
              )}
            </View>
          )}

          {/* ---- DISCARD: reason step ---- */}
          {mode === 'discard' && (
            <>
              <Text
                variant="headlineSmall"
                style={[styles.question, { color: theme.colors.onSurface }]}
              >
                What happened?
              </Text>

              <Pressable
                testID="discard-used-button"
                onPress={() => handleDiscard('consumed')}
                disabled={isMutating}
                style={({ pressed }) => [
                  styles.optionCard,
                  {
                    backgroundColor: theme.colors.surfaceVariant,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                accessibilityLabel="Used it — finished, consumed, or used up"
                accessibilityRole="button"
              >
                <View style={[styles.optionIcon, { backgroundColor: '#DCFCE7' }]}>
                  <MaterialCommunityIcons
                    name="check-circle-outline"
                    size={24}
                    color="#166534"
                  />
                </View>
                <View style={styles.optionText}>
                  <Text
                    variant="titleMedium"
                    style={{ color: theme.colors.onSurface, fontWeight: '600' }}
                  >
                    Used it
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    Finished, consumed, or used up
                  </Text>
                </View>
              </Pressable>

              <Pressable
                testID="discard-tossed-button"
                onPress={() => handleDiscard('tossed')}
                disabled={isMutating}
                style={({ pressed }) => [
                  styles.optionCard,
                  {
                    backgroundColor: theme.colors.surfaceVariant,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                accessibilityLabel="Tossed it — expired, spoiled, or thrown away"
                accessibilityRole="button"
              >
                <View style={[styles.optionIcon, { backgroundColor: '#FFDAD6' }]}>
                  <MaterialCommunityIcons
                    name="delete-outline"
                    size={24}
                    color="#BA1A1A"
                  />
                </View>
                <View style={styles.optionText}>
                  <Text
                    variant="titleMedium"
                    style={{ color: theme.colors.onSurface, fontWeight: '600' }}
                  >
                    Tossed it
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    Expired, spoiled, or thrown away
                  </Text>
                </View>
              </Pressable>
            </>
          )}

          {/* ---- RESTOCK step ---- */}
          {mode === 'restock' && (
            <View
              style={[
                styles.restockCard,
                { backgroundColor: theme.colors.surfaceVariant },
              ]}
            >
              <Text
                variant="titleMedium"
                style={[styles.restockTitle, { color: theme.colors.onSurface }]}
              >
                Add to grocery list?
              </Text>

              <Button
                testID="restock-yes-button"
                mode="contained"
                onPress={() => handleRestock(true)}
                loading={reAddMutation.isPending}
                disabled={isMutating}
                style={styles.restockYes}
                contentStyle={styles.restockButtonContent}
              >
                Yes, add it
              </Button>

              <Button
                testID="restock-no-button"
                mode="text"
                onPress={() => handleRestock(false)}
                disabled={isMutating}
                style={styles.restockNo}
              >
                No thanks
              </Button>
            </View>
          )}

          {/* Cancel / Close */}
          {(mode === 'detail' || mode === 'discard') && (
            <Pressable
              onPress={onDismiss}
              style={styles.cancelButton}
              accessibilityLabel="Close"
              accessibilityRole="button"
            >
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                Close
              </Text>
            </Pressable>
          )}
        </ScrollView>
      </Modal>
    </Portal>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  modal: {
    margin: 24,
    borderRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  itemHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  itemName: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  detailSection: {
    gap: 12,
    marginBottom: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 4,
  },
  divider: {
    marginVertical: 16,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  actionCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  editSection: {
    marginTop: 4,
  },
  editTitle: {
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  locationChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  locationEmoji: {
    fontSize: 16,
  },
  editActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  editButton: {
    flex: 1,
    borderRadius: 24,
  },
  question: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    gap: 16,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
  },
  restockCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 8,
  },
  restockTitle: {
    fontWeight: '600',
    marginBottom: 16,
  },
  restockYes: {
    borderRadius: 24,
    width: '100%',
    marginBottom: 8,
  },
  restockButtonContent: {
    paddingVertical: 4,
  },
  restockNo: {
    width: '100%',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
})
