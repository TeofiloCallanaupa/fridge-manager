import React, { useState, useCallback } from 'react'
import { View, StyleSheet, Pressable } from 'react-native'
import {
  Text,
  Portal,
  Modal,
  Button,
  Divider,
  useTheme,
} from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useDiscardItem, useReAddToGroceryList } from '../../hooks/use-inventory-mutations'
import type { InventoryItemWithDetails } from '../../hooks/use-inventory-items'

type DiscardSheetProps = {
  item: InventoryItemWithDetails | null
  visible: boolean
  onDismiss: () => void
  userId: string
  householdId: string
  /** Called after a successful discard + optional re-add */
  onComplete?: (action: 'consumed' | 'tossed', reAdded: boolean) => void
}

type Step = 'reason' | 'restock'

/**
 * Discard flow modal matching Stitch design:
 * 1. "What happened?" — Used it / Tossed it
 * 2. "Add to grocery list?" — Yes / No thanks
 *
 * Auto-detects expired vs wasted when "Tossed it" is chosen.
 */
export function DiscardSheet({
  item,
  visible,
  onDismiss,
  userId,
  householdId,
  onComplete,
}: DiscardSheetProps) {
  const theme = useTheme()
  const [step, setStep] = useState<Step>('reason')
  const [chosenAction, setChosenAction] = useState<'consumed' | 'tossed' | null>(null)

  const discardMutation = useDiscardItem()
  const reAddMutation = useReAddToGroceryList()

  const resetState = useCallback(() => {
    setStep('reason')
    setChosenAction(null)
  }, [])

  const handleDismiss = useCallback(() => {
    resetState()
    onDismiss()
  }, [resetState, onDismiss])

  const handleDiscard = useCallback(
    (action: 'consumed' | 'tossed') => {
      if (!item) return

      let reason: 'consumed' | 'wasted' | 'expired' = 'consumed'
      if (action === 'tossed') {
        if (item.expiration_date && new Date() > new Date(item.expiration_date)) {
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
            // Move to restock step
            setStep('restock')
          },
          onError: () => {
            handleDismiss()
          },
        }
      )
    },
    [item, householdId, discardMutation, handleDismiss]
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
              handleDismiss()
            },
            onError: () => {
              onComplete?.(chosenAction, false)
              handleDismiss()
            },
          }
        )
      } else {
        onComplete?.(chosenAction, false)
        handleDismiss()
      }
    },
    [item, chosenAction, householdId, userId, reAddMutation, onComplete, handleDismiss]
  )

  if (!item) return null

  const emoji = item.categories?.emoji ?? '📦'
  const isMutating = discardMutation.isPending || reAddMutation.isPending

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleDismiss}
        contentContainerStyle={[
          styles.modal,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        {/* Item header */}
        <View style={styles.itemHeader}>
          <Text style={styles.emoji}>{emoji}</Text>
          <Text variant="titleLarge" style={[styles.itemName, { color: theme.colors.onSurface }]}>
            {item.name}
          </Text>
          {item.quantity && (
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {item.quantity}
            </Text>
          )}
        </View>

        {step === 'reason' && (
          <>
            {/* "What happened?" */}
            <Text variant="headlineSmall" style={[styles.question, { color: theme.colors.onSurface }]}>
              What happened?
            </Text>

            {/* Used it option */}
            <Pressable
              testID="discard-used-button"
              onPress={() => handleDiscard('consumed')}
              disabled={isMutating}
              style={({ pressed }) => [
                styles.optionCard,
                {
                  backgroundColor: theme.colors.surfaceVariant,
                  opacity: pressed ? 0.8 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
              accessibilityLabel="Used it — finished, consumed, or used up"
              accessibilityRole="button"
            >
              <View style={[styles.optionIcon, { backgroundColor: '#DCFCE7' }]}>
                <MaterialCommunityIcons name="check-circle-outline" size={24} color="#166534" />
              </View>
              <View style={styles.optionText}>
                <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                  Used it
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Finished, consumed, or used up
                </Text>
              </View>
            </Pressable>

            {/* Tossed it option */}
            <Pressable
              testID="discard-tossed-button"
              onPress={() => handleDiscard('tossed')}
              disabled={isMutating}
              style={({ pressed }) => [
                styles.optionCard,
                {
                  backgroundColor: theme.colors.surfaceVariant,
                  opacity: pressed ? 0.8 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
              accessibilityLabel="Tossed it — expired, spoiled, or thrown away"
              accessibilityRole="button"
            >
              <View style={[styles.optionIcon, { backgroundColor: '#FFDAD6' }]}>
                <MaterialCommunityIcons name="delete-outline" size={24} color="#BA1A1A" />
              </View>
              <View style={styles.optionText}>
                <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                  Tossed it
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Expired, spoiled, or thrown away
                </Text>
              </View>
            </Pressable>

            {/* Cancel */}
            <Pressable
              onPress={handleDismiss}
              style={styles.cancelButton}
              accessibilityLabel="Cancel"
              accessibilityRole="button"
            >
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                Cancel
              </Text>
            </Pressable>
          </>
        )}

        {step === 'restock' && (
          <>
            {/* "Add to grocery list?" */}
            <View style={[styles.restockCard, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Text variant="titleMedium" style={[styles.restockTitle, { color: theme.colors.onSurface }]}>
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

            {/* Cancel */}
            <Pressable
              onPress={() => handleRestock(false)}
              style={styles.cancelButton}
              accessibilityLabel="Cancel"
              accessibilityRole="button"
            >
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                Cancel
              </Text>
            </Pressable>
          </>
        )}
      </Modal>
    </Portal>
  )
}

const styles = StyleSheet.create({
  modal: {
    margin: 24,
    borderRadius: 24,
    padding: 24,
  },
  itemHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  itemName: {
    fontWeight: 'bold',
    textAlign: 'center',
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
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
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
})
