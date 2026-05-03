import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Text, useTheme } from 'react-native-paper'
import { useNetInfo } from '@react-native-community/netinfo'

/**
 * Compact banner shown at the top of screens when the device is offline.
 * Automatically hides when connectivity is restored.
 */
export function OfflineBanner() {
  const netInfo = useNetInfo()
  const theme = useTheme()

  // Don't show when connected or while initial check is pending
  if (netInfo.isConnected !== false) {
    return null
  }

  return (
    <View style={[styles.banner, { backgroundColor: theme.colors.errorContainer }]}>
      <Text
        variant="labelSmall"
        style={{ color: theme.colors.onErrorContainer }}
      >
        📡 You're offline — changes will sync automatically
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
})
