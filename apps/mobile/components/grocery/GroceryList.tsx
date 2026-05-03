import React, { useMemo } from 'react'
import { View, SectionList, StyleSheet, RefreshControl } from 'react-native'
import { Text, useTheme, Divider } from 'react-native-paper'
import { GroceryItemCard } from './GroceryItemCard'
import type { GroceryItemWithCategory } from '../../hooks/use-grocery-items'

type Props = {
  items: GroceryItemWithCategory[]
  isLoading: boolean
  isRefetching: boolean
  onRefresh: () => void
  onCheckOff: (item: GroceryItemWithCategory) => void
  onDelete: (itemId: string) => void
}

type Section = {
  title: string
  emoji: string
  data: GroceryItemWithCategory[]
}

export function GroceryList({
  items,
  isLoading,
  isRefetching,
  onRefresh,
  onCheckOff,
  onDelete,
}: Props) {
  const theme = useTheme()

  // Group items by category, sorted by display_order
  const sections: Section[] = useMemo(() => {
    const grouped = new Map<string, Section>()

    for (const item of items) {
      const key = item.category_id
      if (!grouped.has(key)) {
        grouped.set(key, {
          title: item.categories.name,
          emoji: item.categories.emoji ?? '',
          data: [],
        })
      }
      grouped.get(key)!.data.push(item)
    }

    // Sort sections by display_order (use first item in each section)
    // Within each section, sort unchecked first, checked last
    return Array.from(grouped.values())
      .sort((a, b) => {
        const orderA = a.data[0]?.categories.display_order ?? 0
        const orderB = b.data[0]?.categories.display_order ?? 0
        return orderA - orderB
      })
      .map((section) => ({
        ...section,
        data: [...section.data].sort((a, b) => {
          if (a.checked === b.checked) return 0
          return a.checked ? 1 : -1
        }),
      }))
  }, [items])

  if (!isLoading && items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text variant="headlineMedium" style={{ textAlign: 'center' }}>
          🛒
        </Text>
        <Text
          variant="titleMedium"
          style={{ textAlign: 'center', color: theme.colors.onSurfaceVariant }}
        >
          Your grocery list is empty
        </Text>
        <Text
          variant="bodyMedium"
          style={{ textAlign: 'center', color: theme.colors.onSurfaceVariant }}
        >
          Tap + to add items
        </Text>
      </View>
    )
  }

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <GroceryItemCard
          item={item}
          onCheckOff={onCheckOff}
          onDelete={onDelete}
        />
      )}
      renderSectionHeader={({ section }) => (
        <View
          style={[
            styles.sectionHeader,
            { backgroundColor: theme.colors.surfaceVariant },
          ]}
        >
          <Text variant="titleSmall" style={{ fontWeight: 'bold' }}>
            {section.emoji} {section.title}
          </Text>
          <Text
            variant="labelSmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {section.data.length} item{section.data.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}
      ItemSeparatorComponent={() => <Divider />}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={onRefresh}
          colors={[theme.colors.primary]}
          tintColor={theme.colors.primary}
        />
      }
      contentContainerStyle={styles.listContent}
      stickySectionHeadersEnabled
    />
  )
}

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  listContent: {
    paddingBottom: 80, // Space for FAB
  },
})
