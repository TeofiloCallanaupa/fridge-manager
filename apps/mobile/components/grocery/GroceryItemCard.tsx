import React from 'react'
import { View, StyleSheet, Pressable } from 'react-native'
import { Text, Checkbox, Chip, IconButton, useTheme } from 'react-native-paper'
import type { GroceryItemWithCategory } from '../../hooks/use-grocery-items'

type Props = {
  item: GroceryItemWithCategory
  onCheckOff: (item: GroceryItemWithCategory) => void
  onDelete: (itemId: string) => void
}

const destinationLabels: Record<string, string> = {
  fridge: 'Fridge',
  freezer: 'Freezer',
  pantry: 'Pantry',
}

const destinationIcons: Record<string, string> = {
  fridge: 'fridge-outline',
  freezer: 'snowflake',
  pantry: 'cupboard',
}

export function GroceryItemCard({ item, onCheckOff, onDelete }: Props) {
  const theme = useTheme()
  const isChecked = item.checked

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <View
        style={styles.checkboxContainer}
        accessible
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isChecked }}
      >
        <Checkbox.Android
          status={isChecked ? 'checked' : 'unchecked'}
          onPress={() => onCheckOff(item)}
          color={theme.colors.primary}
        />
      </View>

      <Pressable style={styles.content} onPress={() => onCheckOff(item)}>
        <Text
          variant="bodyLarge"
          style={[
            styles.name,
            isChecked && {
              textDecorationLine: 'line-through',
              color: theme.colors.onSurfaceDisabled,
            },
          ]}
        >
          {item.name}
        </Text>
        {item.quantity ? (
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {item.quantity}
          </Text>
        ) : null}
      </Pressable>

      {item.destination && item.destination !== 'none' && (
        <Chip
          icon={destinationIcons[item.destination]}
          compact
          mode="outlined"
          style={styles.chip}
          textStyle={styles.chipText}
        >
          {destinationLabels[item.destination]}
        </Chip>
      )}

      <IconButton
        icon="delete-outline"
        size={20}
        onPress={() => onDelete(item.id)}
        accessibilityLabel="Delete item"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingRight: 4,
    paddingLeft: 0,
    minHeight: 52,
  },
  checkboxContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 48,
  },
  content: {
    flex: 1,
    paddingVertical: 4,
  },
  name: {
    fontWeight: '500',
  },
  chip: {
    marginRight: 4,
  },
  chipText: {
    fontSize: 11,
    lineHeight: 16,
    includeFontPadding: false,
  },
})
