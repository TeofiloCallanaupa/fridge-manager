import React from 'react'
import { View, StyleSheet, ScrollView } from 'react-native'
import { Text, Card, Button, useTheme } from 'react-native-paper'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

export default function DashboardScreen() {
  const { user, profile } = useAuth()
  const theme = useTheme()

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={{ fontWeight: 'bold' }}>
          Welcome, {profile?.display_name || user?.email}
        </Text>
      </View>

      <Card style={styles.card} mode="outlined">
        <Card.Content>
          <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 16 }}>Dashboard</Text>
          <Text variant="bodyMedium">
            Your items and lists will appear here soon.
          </Text>
        </Card.Content>
        <Card.Actions>
          <Button onPress={signOut}>Sign Out</Button>
        </Card.Actions>
      </Card>

    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 24,
    gap: 24,
  },
  header: {
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#fff',
  },
})
