import React, { useState } from 'react'
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Alert } from 'react-native'
import { Text, Button, useTheme } from 'react-native-paper'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { buildAvatarUrl, DEFAULT_AVATAR_CONFIG } from '@fridge-manager/shared'

const SKIN_COLORS = ['f9c9b6', 'f8d25c', 'ffdfbf', 'c0aede', 'd1d4f9', 'ffd5dc']
const HAIR_COLORS = ['000000', '4a3123', 'a56b46', 'e8b877', 'b55239', 'e2e2e2']
const CLOTHING_COLORS = ['1e1e1e', '00b159', '5bc0de', '44c585', '428bca', 'ae0001', 'ffc425', 'transparent']

export default function AvatarScreen() {
  const { user, refreshSession } = useAuth()
  const [config, setConfig] = useState(DEFAULT_AVATAR_CONFIG)
  const [loading, setLoading] = useState(false)
  const theme = useTheme()

  const randomize = () => {
    setConfig({
      ...config,
      seed: Math.random().toString(36).substring(7),
      skinColor: SKIN_COLORS[Math.floor(Math.random() * SKIN_COLORS.length)],
      hairColor: HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)],
      clothingColor: CLOTHING_COLORS[Math.floor(Math.random() * CLOTHING_COLORS.length)],
    })
  }

  async function saveAvatar() {
    if (!user) return

    setLoading(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        avatar_config: config,
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
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="headlineLarge" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
            Create your avatar
          </Text>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
            Personalize your digital chef.
          </Text>
        </View>

        <View style={styles.avatarContainer}>
          <View style={styles.avatarBackground}>
            <Image 
              source={{ uri: buildAvatarUrl(config) }} 
              style={styles.avatarImage} 
              resizeMode="contain"
            />
          </View>
          <Button 
            mode="outlined" 
            onPress={randomize} 
            icon="dice-multiple"
            style={styles.randomButton}
          >
            Randomize Avatar
          </Button>
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={saveAvatar}
          loading={loading}
          disabled={loading}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Next Step
        </Button>
      </View>
    </View>
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
  avatarContainer: {
    alignItems: 'center',
    gap: 24,
  },
  avatarBackground: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#f0f4f2',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 160,
    height: 160,
  },
  randomButton: {
    borderRadius: 20,
  },
  footer: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  button: {
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
})
