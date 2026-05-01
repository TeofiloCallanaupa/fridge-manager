import React, { useState } from 'react'
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native'
import { Text, TextInput, Button, useTheme } from 'react-native-paper'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

export default function ProfileScreen() {
  const { user, refreshSession } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const theme = useTheme()

  async function saveProfile() {
    if (!displayName.trim()) {
      Alert.alert('Required', 'Please enter a display name')
      return
    }

    if (!user) return

    setLoading(true)
    let timezone = 'UTC'
    try {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    } catch (e) {
      // fallback
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim(),
        timezone,
      })
      .eq('id', user.id)

    if (error) {
      Alert.alert('Error', error.message)
      setLoading(false)
    } else {
      await refreshSession() // This will trigger redirection to the next step
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="headlineLarge" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
            Let's get to know you
          </Text>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
            What should we call you in the kitchen?
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            label="Display Name"
            onChangeText={setDisplayName}
            value={displayName}
            placeholder="Chef Gordon"
            mode="outlined"
            style={styles.input}
            autoFocus
          />
          <Button
            mode="contained"
            onPress={saveProfile}
            loading={loading}
            disabled={loading || !displayName.trim()}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            Continue
          </Button>
        </View>
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
    justifyContent: 'center',
  },
  header: {
    marginBottom: 48,
  },
  form: {
    gap: 24,
  },
  input: {
    backgroundColor: '#fff',
  },
  button: {
    marginTop: 8,
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
})
