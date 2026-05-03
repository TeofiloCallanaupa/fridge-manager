import React from 'react'
import { StyleSheet } from 'react-native'
import { FAB, useTheme } from 'react-native-paper'

type Props = {
  onPress: () => void
}

export function GroceryFAB({ onPress }: Props) {
  const theme = useTheme()

  return (
    <FAB
      icon="plus"
      onPress={onPress}
      style={[styles.fab, { backgroundColor: theme.colors.primary }]}
      color={theme.colors.onPrimary}
      accessibilityLabel="Add grocery item"
    />
  )
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
})
