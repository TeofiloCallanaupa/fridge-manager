import React, { useState } from 'react'
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { Text, TextInput, Button, useTheme, Card } from 'react-native-paper'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

export default function HouseholdScreen() {
  const { user, refreshSession } = useAuth()
  const [householdName, setHouseholdName] = useState('')
  const [inviteToken, setInviteToken] = useState('')
  const [loading, setLoading] = useState(false)
  const theme = useTheme()

  async function createHousehold() {
    if (!householdName.trim()) {
      Alert.alert('Required', 'Please enter a household name')
      return
    }

    if (!user) return

    setLoading(true)
    const { data: household, error: createError } = await supabase
      .from('households')
      .insert({
        name: householdName.trim(),
        created_by: user.id,
      })
      .select()
      .single()

    if (createError) {
      Alert.alert('Error', createError.message)
      setLoading(false)
      return
    }

    const { error: memberError } = await supabase
      .from('household_members')
      .insert({
        household_id: household.id,
        user_id: user.id,
        role: 'owner',
      })

    if (memberError) {
      Alert.alert('Error', memberError.message)
      setLoading(false)
    } else {
      await refreshSession()
    }
  }

  async function joinHousehold() {
    if (!inviteToken.trim()) {
      Alert.alert('Required', 'Please enter an invite code')
      return
    }

    Alert.alert('Not implemented', 'Join via invite token from mobile will be supported soon.')
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="headlineLarge" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
            Join a Household
          </Text>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
            Create a new space or join an existing one
          </Text>
        </View>

        <Card style={styles.card} mode="outlined">
          <Card.Content style={styles.cardContent}>
            <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>Create New Household</Text>
            <TextInput
              label="Household Name"
              onChangeText={setHouseholdName}
              value={householdName}
              placeholder="The Smith Kitchen"
              mode="outlined"
              style={styles.input}
            />
            <Button
              mode="contained"
              onPress={createHousehold}
              loading={loading}
              disabled={loading || !householdName.trim()}
              style={styles.button}
            >
              Create Household
            </Button>
          </Card.Content>
        </Card>

        <View style={styles.divider}>
          <View style={styles.line} />
          <Text variant="bodySmall" style={{ color: theme.colors.outline, marginHorizontal: 8 }}>OR</Text>
          <View style={styles.line} />
        </View>

        <Card style={styles.card} mode="outlined">
          <Card.Content style={styles.cardContent}>
            <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>Have an invite code?</Text>
            <TextInput
              label="Invite Code"
              onChangeText={setInviteToken}
              value={inviteToken}
              placeholder="Paste code here"
              mode="outlined"
              style={styles.input}
            />
            <Button
              mode="outlined"
              onPress={joinHousehold}
              disabled={loading || !inviteToken.trim()}
              style={styles.button}
            >
              Join Household
            </Button>
          </Card.Content>
        </Card>

      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    marginBottom: 32,
  },
  card: {
    backgroundColor: '#fff',
  },
  cardContent: {
    gap: 16,
  },
  input: {
    backgroundColor: '#fff',
  },
  button: {
    marginTop: 8,
    borderRadius: 8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 32,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#eee',
  },
})
