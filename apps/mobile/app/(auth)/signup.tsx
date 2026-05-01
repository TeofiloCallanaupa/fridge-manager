import React, { useState } from 'react'
import { View, StyleSheet, Platform, Alert, ScrollView, TouchableOpacity } from 'react-native'
import { Text, TextInput, ActivityIndicator } from 'react-native-paper'
import { Link } from 'expo-router'
import { supabase } from '../../lib/supabase'

export default function SignupScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function signUpWithEmail() {
    setLoading(true)
    const {
      data: { session },
      error,
    } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      Alert.alert('Sign Up Failed', error.message)
    } else if (!session) {
      Alert.alert('Check your inbox', 'Please check your email to verify your account.')
    }
    setLoading(false)
  }

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      {/* Top Navigation */}
      <View style={styles.topNav}>
        <Text style={styles.navTitle}>Fridge Manager</Text>
      </View>

      <View style={styles.heroSection}>
        <View style={styles.tag}>
          <Text style={styles.tagText}>JOIN NOW</Text>
        </View>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>
          Join Fridge Manager to start saving time and reducing waste.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Email Address</Text>
          <View style={styles.inputContainer}>
            <TextInput
              onChangeText={setEmail}
              value={email}
              placeholder="hello@kitchen.com"
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
              underlineColor="transparent"
              activeUnderlineColor="transparent"
              placeholderTextColor="#707972"
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputContainer}>
            <TextInput
              onChangeText={setPassword}
              value={password}
              secureTextEntry
              autoCapitalize="none"
              style={styles.input}
              underlineColor="transparent"
              activeUnderlineColor="transparent"
              placeholderTextColor="#707972"
              placeholder="••••••••"
            />
          </View>
        </View>

        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={signUpWithEmail} 
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.primaryButtonText}>Sign Up</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Log in</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f7',
  },
  scrollContent: {
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  navTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#3b7a57',
    letterSpacing: -0.5,
  },
  heroSection: {
    marginBottom: 32,
  },
  tag: {
    backgroundColor: '#aff1c6',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 16,
  },
  tagText: {
    color: '#0a5132',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1a1c1b',
    lineHeight: 40,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    color: '#5e6572',
    lineHeight: 26,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 2,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    color: '#5e6572',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    backgroundColor: '#e2e3e1',
    borderRadius: 24,
    overflow: 'hidden',
  },
  input: {
    backgroundColor: 'transparent',
    paddingHorizontal: 8,
    height: 56,
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: '#206140',
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#206140',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#f4f4f2',
  },
  footerText: {
    color: '#5e6572',
    fontSize: 14,
  },
  footerLink: {
    color: '#206140',
    fontSize: 14,
    fontWeight: 'bold',
  },
})
