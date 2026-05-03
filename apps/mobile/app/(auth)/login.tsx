import React, { useState } from 'react'
import { View, StyleSheet, Platform, Alert, ScrollView, TouchableOpacity } from 'react-native'
import { Text, TextInput, ActivityIndicator } from 'react-native-paper'
import { Link } from 'expo-router'
import { supabase } from '../../lib/supabase'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function signInWithEmail() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      Alert.alert('Sign In Failed', error.message)
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
          <Text style={styles.tagText}>DIGITAL PANTRY</Text>
        </View>
        <Text style={styles.title}>Welcome back to your pantry</Text>
        <Text style={styles.subtitle}>
          Curating freshness and flavor starts with knowing what you have.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Email Address</Text>
          <View style={styles.inputContainer}>
            <TextInput
              testID="login-email-input"
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
          <View style={styles.labelRow}>
            <Text style={styles.label}>Password</Text>
            <Text style={styles.forgotPassword}>Forgot Password?</Text>
          </View>
          <View style={styles.inputContainer}>
            <TextInput
              testID="login-password-input"
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
          testID="login-submit-button"
          style={styles.primaryButton} 
          onPress={signInWithEmail} 
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.primaryButtonText}>Log In</Text>
          )}
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or continue with magic link</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.formGroup}>
          <View style={styles.inputContainer}>
            <TextInput
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

        <TouchableOpacity 
          style={styles.secondaryButton} 
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>Send Magic Link</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>New to Fridge Manager? </Text>
          <Link href="/(auth)/signup" asChild>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Create account</Text>
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
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    color: '#5e6572',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  forgotPassword: {
    color: '#5e6572',
    fontSize: 13,
    fontWeight: '500',
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e3e1',
  },
  dividerText: {
    color: '#707972',
    paddingHorizontal: 16,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  secondaryButton: {
    backgroundColor: '#e8e8e6',
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#1a1c1b',
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
