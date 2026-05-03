import React, { useState, useCallback } from 'react'
import { View, StyleSheet, Pressable } from 'react-native'
import { Text, Chip, useTheme } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import {
  formatRelativeTime,
  getOppositeReason,
  getDiscardReasonLabel,
} from '@fridge-manager/shared'
import {
  useRestoreItem,
  useChangeDiscardReason,
} from '../../hooks/use-inventory-mutations'
import type { InventoryItemWithDetails } from '../../hooks/use-inventory-items'
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

const REASON_ICON: Record<string, string> = {
  consumed: 'check-circle',
  wasted: 'delete',
  expired: 'clock-alert',
}

const REASON_COLOR: Record<string, { bg: string; text: string }> = {
  consumed: { bg: '#DCFCE7', text: '#166534' },
  wasted: { bg: '#FFDAD6', text: '#BA1A1A' },
  expired: { bg: '#FEF3C7', text: '#92400E' },
}

/**
 * Recently Removed section showing the last 20 discarded items.
 * Features:
 * - Quick Undo button on items < 1 hour old
 * - Tap card to expand correction menu (change reason / restore)
 * - Reason chips (Used / Tossed / Expired)
 */
export function RecentlyRemoved({ items, householdId }: RecentlyRemovedProps) {
  const theme = useTheme()
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
    [restoreMutation, householdId]
  )

  const handleChangeReason = useCallback(
    (itemId: string, newReason: DiscardReason) => {
      changeReasonMutation.mutate({ itemId, householdId, newReason })
      setExpandedId(null)
    },
    [changeReasonMutation, householdId]
  )

  if (items.length === 0) return null

  return (
    <View style={styles.container}>
      {/* Section header */}
      <View style={styles.sectionHeader}>
        <View>
          <Text
            variant="titleSmall"
            style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
          >
            Recently Removed
          </Text>
          <Text
            variant="labelSmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            Last 7 days
          </Text>
        </View>
      </View>

      {/* Items list */}
      {items.map((item) => {
        const emoji = item.categories?.emoji ?? '📦'
        const removedBy = item.profiles?.display_name ?? 'Unknown'
        const reasonLabel = getDiscardReasonLabel(item.discard_reason)
        const removedAt = item.discarded_at
          ? formatRelativeTime(new Date(item.discarded_at))
          : ''
        const showUndo = isWithinUndoWindow(item.discarded_at)
        const isExpanded = expandedId === item.id
        const opposite = getOppositeReason(item.discard_reason)
        const reasonColorConfig = REASON_COLOR[item.discard_reason ?? 'consumed']

        return (
          <View key={item.id}>
            {/* Main card row */}
            <Pressable
              testID={`removed-item-${item.id}`}
              onPress={() => handleToggleExpand(item.id)}
              style={({ pressed }) => [
                styles.itemCard,
                {
                  backgroundColor: theme.colors.surface,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              accessibilityLabel={`${item.name}, removed by ${removedBy}`}
              accessibilityRole="button"
            >
              {/* Leading emoji */}
              <Text style={styles.itemEmoji}>{emoji}</Text>

              {/* Center: name + metadata */}
              <View style={styles.itemContent}>
                <Text
                  variant="bodyLarge"
                  style={{ color: theme.colors.onSurface, fontWeight: '600' }}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                <View style={styles.metaRow}>
                  <MaterialCommunityIcons
                    name="account-outline"
                    size={12}
                    color={theme.colors.outline}
                  />
                  <Text variant="labelSmall" style={{ color: theme.colors.outline }}>
                    {removedBy} · {removedAt}
                  </Text>
                </View>
              </View>

              {/* Trailing: reason chip or Undo */}
              {showUndo ? (
                <Pressable
                  testID={`undo-${item.id}`}
                  onPress={() => {
                    handleRestore(item.id)
                  }}
                  style={[styles.undoButton, { backgroundColor: theme.colors.secondaryContainer }]}
                  accessibilityLabel={`Undo removal of ${item.name}`}
                  accessibilityRole="button"
                >
                  <Text
                    variant="labelMedium"
                    style={{ color: theme.colors.onSecondaryContainer, fontWeight: '600' }}
                  >
                    Undo
                  </Text>
                </Pressable>
              ) : (
                <Chip
                  compact
                  textStyle={{
                    fontSize: 11,
                    color: reasonColorConfig.text,
                    fontWeight: '600',
                  }}
                  style={{
                    backgroundColor: reasonColorConfig.bg,
                    height: 28,
                  }}
                >
                  {reasonLabel}
                </Chip>
              )}
            </Pressable>

            {/* Expanded correction panel */}
            {isExpanded && (
              <View
                style={[
                  styles.correctionPanel,
                  { backgroundColor: theme.colors.surfaceVariant },
                ]}
              >
                {/* Change reason chip */}
                <Pressable
                  testID={`change-reason-${item.id}`}
                  onPress={() => handleChangeReason(item.id, opposite.newReason)}
                  style={[styles.correctionButton, { backgroundColor: theme.colors.secondaryContainer }]}
                  accessibilityLabel={opposite.label}
                  accessibilityRole="button"
                >
                  <Text
                    variant="labelMedium"
                    style={{ color: theme.colors.onSecondaryContainer, fontWeight: '600' }}
                  >
                    {opposite.label}
                  </Text>
                </Pressable>

                {/* Restore button */}
                <Pressable
                  testID={`restore-${item.id}`}
                  onPress={() => handleRestore(item.id)}
                  style={styles.restoreButton}
                  accessibilityLabel={`Restore ${item.name} to inventory`}
                  accessibilityRole="button"
                >
                  <MaterialCommunityIcons
                    name="restore"
                    size={16}
                    color={theme.colors.primary}
                  />
                  <Text
                    variant="labelMedium"
                    style={{ color: theme.colors.primary, fontWeight: '600' }}
                  >
                    Restore to inventory
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: '700',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    marginBottom: 6,
    gap: 12,
    shadowColor: '#1A1C1B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  itemEmoji: {
    fontSize: 24,
    flexShrink: 0,
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  undoButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    flexShrink: 0,
  },
  correctionPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 52,
    marginRight: 14,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  correctionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
})
