import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Text, Button, useTheme } from 'react-native-paper'
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
  signOut: {
    marginTop: 'auto',
  },
})
