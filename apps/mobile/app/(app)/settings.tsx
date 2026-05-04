import React from 'react'
import { View, StyleSheet, Pressable } from 'react-native'
import { Text, Button, useTheme } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

export default function SettingsScreen() {
  const theme = useTheme()
  const { user, profile } = useAuth()

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineMedium" style={{ fontWeight: 'bold' }}>
        Settings
      </Text>

      <View style={styles.section}>
        <Text variant="titleMedium">{profile?.display_name}</Text>
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          {user?.email}
        </Text>
      </View>

      {/* Menu items */}
      <View style={styles.menu}>
        <Pressable
          testID="settings-notifications-row"
          style={({ pressed }) => [
            styles.menuRow,
            {
              backgroundColor: pressed
                ? theme.colors.surfaceVariant
                : 'transparent',
            },
          ]}
          onPress={() => router.push('/(app)/notifications')}
        >
          <MaterialCommunityIcons
            name="bell-outline"
            size={22}
            color={theme.colors.onSurface}
            style={styles.menuIcon}
          />
          <Text variant="bodyLarge" style={styles.menuLabel}>
            Notifications
          </Text>
          <MaterialCommunityIcons
            name="chevron-right"
            size={22}
            color={theme.colors.onSurfaceVariant}
          />
        </Pressable>

        <Pressable
          testID="settings-analytics-row"
          style={({ pressed }) => [
            styles.menuRow,
            {
              backgroundColor: pressed
                ? theme.colors.surfaceVariant
                : 'transparent',
            },
          ]}
          onPress={() => router.push('/(app)/analytics')}
        >
          <MaterialCommunityIcons
            name="chart-line"
            size={22}
            color={theme.colors.onSurface}
            style={styles.menuIcon}
          />
          <Text variant="bodyLarge" style={styles.menuLabel}>
            Analytics
          </Text>
          <MaterialCommunityIcons
            name="chevron-right"
            size={22}
            color={theme.colors.onSurfaceVariant}
          />
        </Pressable>
      </View>

      <Button mode="outlined" onPress={signOut} style={styles.signOut}>
        Sign Out
      </Button>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 24,
  },
  section: {
    gap: 4,
  },
  menu: {
    gap: 4,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  menuIcon: {
    marginRight: 14,
  },
  menuLabel: {
    flex: 1,
  },
  signOut: {
    marginTop: 'auto',
  },
})
