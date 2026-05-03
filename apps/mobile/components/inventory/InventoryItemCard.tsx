import React from 'react'
import { View, StyleSheet, Pressable } from 'react-native'
import { Text, useTheme } from 'react-native-paper'
import { getDaysSince } from '@fridge-manager/shared'
import { ExpirationBadge } from './ExpirationBadge'
import type { InventoryItemWithDetails } from '../../hooks/use-inventory-items'

type InventoryItemCardProps = {
  item: InventoryItemWithDetails
  onPress?: () => void
  onLongPress?: () => void
}

/**
 * Inventory item card following DESIGN.md:
 * - 1.5rem (xl) border radius
 * - Tonal layering: white card on off-white background
 * - Ambient shadow
 * - Category emoji + name + quantity + expiration badge
 * - "Added X days ago · by Name" metadata row
 */
export function InventoryItemCard({
  item,
  onPress,
  onLongPress,
}: InventoryItemCardProps) {
  const theme = useTheme()
  const daysAgo = getDaysSince(new Date(item.added_at))
  const addedByName = item.profiles?.display_name ?? 'Unknown'
  const emoji = item.categories?.emoji ?? '📦'

  const daysAgoText =
    daysAgo === 0
      ? 'Added today'
      : daysAgo === 1
        ? 'Added yesterday'
        : `Added ${daysAgo} days ago`

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
      accessibilityLabel={`${item.name}${item.quantity ? `, ${item.quantity}` : ''}`}
      accessibilityRole="button"
    >
      {/* Top row: emoji + name/quantity + expiration badge */}
      <View style={styles.topRow}>
        <View style={styles.leadingContent}>
          <Text style={styles.emoji}>{emoji}</Text>
          <View style={styles.nameContainer}>
            <Text
              variant="bodyLarge"
              style={[styles.itemName, { color: theme.colors.onSurface }]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            {item.quantity && (
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant, marginTop: 1 }}
              >
                {item.quantity}
              </Text>
            )}
          </View>
        </View>
        <ExpirationBadge expirationDate={item.expiration_date} />
      </View>

      {/* Bottom row: metadata */}
      <View style={styles.metaRow}>
        <Text
          variant="labelSmall"
          style={{ color: theme.colors.outline }}
        >
          {daysAgoText} · by {addedByName}
        </Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 10,
    // Ambient shadow from DESIGN.md
    shadowColor: '#1A1C1B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  leadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  emoji: {
    fontSize: 28,
  },
  nameContainer: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    fontWeight: '600',
  },
  metaRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
})
