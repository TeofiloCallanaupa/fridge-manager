import React, { useState, useCallback } from 'react'
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
} from 'react-native'
import {
  Text,
  SegmentedButtons,
  ActivityIndicator,
  Snackbar,
  useTheme,
} from 'react-native-paper'
import { OfflineBanner } from '../../components/OfflineBanner'
import { InventoryItemCard } from '../../components/inventory/InventoryItemCard'
import { DiscardSheet } from '../../components/inventory/DiscardSheet'
import { RecentlyRemoved } from '../../components/inventory/RecentlyRemoved'
import {
  useInventoryItems,
  useInventoryCounts,
  useRecentlyRemoved,
} from '../../hooks/use-inventory-items'
import { useAuth } from '../../contexts/AuthContext'
import type { StorageLocation } from '@fridge-manager/shared'
import type { InventoryItemWithDetails } from '../../hooks/use-inventory-items'

const TABS: { value: StorageLocation; label: string; icon: string }[] = [
  { value: 'fridge', label: 'Fridge', icon: 'fridge-outline' },
  { value: 'freezer', label: 'Freezer', icon: 'snowflake' },
  { value: 'pantry', label: 'Pantry', icon: 'cabinet' },
]

export default function InventoryScreen() {
  const theme = useTheme()
  const { user, householdId } = useAuth()
  const [activeTab, setActiveTab] = useState<StorageLocation>('fridge')
  const [discardItem, setDiscardItem] = useState<InventoryItemWithDetails | null>(null)
  const [snackMessage, setSnackMessage] = useState<string | null>(null)

  const { data: counts } = useInventoryCounts(householdId ?? undefined)
  const { data: recentlyRemoved = [] } = useRecentlyRemoved(householdId ?? undefined)

  const {
    data: items = [],
    isLoading,
    isRefetching,
    refetch,
    error,
  } = useInventoryItems(householdId ?? undefined, activeTab)

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value as StorageLocation)
  }, [])

  const totalItems = counts
    ? counts.fridge + counts.freezer + counts.pantry
    : 0

  const handleLongPress = useCallback(
    (item: InventoryItemWithDetails) => {
      setDiscardItem(item)
    },
    []
  )

  const handleDiscardComplete = useCallback(
    (action: 'consumed' | 'tossed', reAdded: boolean) => {
      const actionLabel = action === 'consumed' ? 'Marked as used' : 'Marked as tossed'
      const restockLabel = reAdded ? ' · Added to grocery list' : ''
      setSnackMessage(`${actionLabel}${restockLabel}`)
    },
    []
  )

  const renderItem = useCallback(
    ({ item }: { item: InventoryItemWithDetails }) => (
      <InventoryItemCard
        item={item}
        onPress={() => {
          // Item detail sheet — will be built later
        }}
        onLongPress={() => handleLongPress(item)}
      />
    ),
    [handleLongPress]
  )

  const renderEmpty = useCallback(() => {
    if (isLoading) return null

    const tab = TABS.find((t) => t.value === activeTab)
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>
          {activeTab === 'fridge' ? '🧊' : activeTab === 'freezer' ? '❄️' : '🗄️'}
        </Text>
        <Text
          variant="bodyLarge"
          style={[styles.emptyTitle, { color: theme.colors.onSurface }]}
        >
          No items in your {tab?.label.toLowerCase()}
        </Text>
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}
        >
          Items checked off your grocery list will appear here
        </Text>
      </View>
    )
  }, [isLoading, activeTab, theme])

  const renderFooter = useCallback(() => {
    if (recentlyRemoved.length === 0 || !householdId) return null
    return (
      <RecentlyRemoved items={recentlyRemoved} householdId={householdId} />
    )
  }, [recentlyRemoved, householdId])

  // Build segmented button values with counts
  const segmentedButtons = TABS.map((tab) => ({
    value: tab.value,
    label: counts && counts[tab.value] > 0
      ? `${tab.label} ${counts[tab.value]}`
      : tab.label,
    icon: tab.icon,
    accessibilityLabel: `${tab.label} tab${counts ? ` — ${counts[tab.value]} items` : ''}`,
  }))

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <OfflineBanner />

      {/* Header */}
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Inventory
        </Text>
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          {counts
            ? `${totalItems} item${totalItems !== 1 ? 's' : ''} in your kitchen`
            : 'Loading...'}
        </Text>
      </View>

      {/* Location tabs */}
      <View style={styles.tabContainer}>
        <SegmentedButtons
          value={activeTab}
          onValueChange={handleTabChange}
          buttons={segmentedButtons}
          density="medium"
          style={styles.segmentedButtons}
        />
      </View>

      {/* Loading state */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <View style={styles.errorContainer}>
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.error, textAlign: 'center' }}
          >
            Failed to load items
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
          >
            {error.message}
          </Text>
        </View>
      )}

      {/* Items list + Recently Removed */}
      {!isLoading && !error && (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
              tintColor={theme.colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Discard flow modal */}
      <DiscardSheet
        item={discardItem}
        visible={!!discardItem}
        onDismiss={() => setDiscardItem(null)}
        userId={user?.id ?? ''}
        householdId={householdId ?? ''}
        onComplete={handleDiscardComplete}
      />

      {/* Feedback snackbar */}
      <Snackbar
        visible={!!snackMessage}
        onDismiss={() => setSnackMessage(null)}
        duration={3000}
      >
        {snackMessage ?? ''}
      </Snackbar>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontWeight: 'bold',
  },
  tabContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  segmentedButtons: {
    borderRadius: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  listContent: {
    paddingTop: 4,
    paddingBottom: 24,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
})
