/**
 * Unified Settings screen — consolidates profile, notification preferences,
 * household management, and sign-out into a single scrollable page.
 *
 * Replaces the old settings page + standalone notifications.tsx.
 */
import React, { useCallback, useState } from 'react'
import { View, ScrollView, StyleSheet, Keyboard } from 'react-native'
import {
  Text,
  Switch,
  Button,
  ActivityIndicator,
  TextInput,
  useTheme,
} from 'react-native-paper'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  useNotificationPreferences,
  useUpdateNotificationPreference,
  useSendTestNotification,
  type PreferenceField,
} from '../../hooks/use-notification-preferences'
import { useQuery } from '@tanstack/react-query'
import { QUIET_HOURS_DEFAULT, DEFAULT_NOTIFICATION_PREFS, buildAvatarUrl } from '@fridge-manager/shared'
import { Image } from 'react-native'
import { useSendInvite, usePendingInvites } from '../../hooks/use-household-invite'

// ---------------------------------------------------------------------------
// Alert row config
// ---------------------------------------------------------------------------

type AlertRow = {
  field: PreferenceField
  emoji: string
  label: string
  description: string
}

const ALERT_ROWS: AlertRow[] = [
  { field: 'halfway_enabled', emoji: '⏳', label: 'Halfway', description: 'Midpoint of shelf life' },
  { field: 'two_day_enabled', emoji: '⚠️', label: '2-Day Warning', description: 'Two days before expiration' },
  { field: 'one_day_enabled', emoji: '🔔', label: '1-Day Warning', description: 'Day before expiration' },
  { field: 'day_of_enabled', emoji: '🚨', label: 'Day Of', description: 'On the expiration date' },
  { field: 'post_expiration_enabled', emoji: '🗑️', label: 'Expired', description: 'Daily expired reminders' },
]



function formatTime(time: string | null): string {
  if (!time) return '—'
  const [hours, minutes] = time.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SettingsScreen() {
  const theme = useTheme()
  const { user, profile, householdId } = useAuth()

  // Invite state
  const [showInviteInput, setShowInviteInput] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteFeedback, setInviteFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const sendInvite = useSendInvite()
  const { data: pendingInvites } = usePendingInvites(householdId)

  // Notification preferences
  const { data: prefs, isLoading: prefsLoading } = useNotificationPreferences(
    user?.id,
    householdId,
  )
  const updatePref = useUpdateNotificationPreference()
  const sendTest = useSendTestNotification()

  const currentPrefs = prefs ?? DEFAULT_NOTIFICATION_PREFS

  // Household members
  const { data: members } = useQuery({
    queryKey: ['household-members-mobile', householdId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('household_members')
        .select('user_id, role, profiles(display_name, avatar_config)')
        .eq('household_id', householdId!)

      if (error) throw error
      return (data ?? []).map((row: any) => ({
        userId: row.user_id,
        displayName: row.profiles?.display_name ?? 'Unknown',
        avatarConfig: row.profiles?.avatar_config ?? null,
        role: row.role as 'owner' | 'member',
      }))
    },
    enabled: !!householdId,
  })

  // Household name
  const { data: household } = useQuery({
    queryKey: ['household-name-mobile', householdId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('households')
        .select('name')
        .eq('id', householdId!)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!householdId,
  })

  const handleToggle = useCallback(
    (field: PreferenceField, value: boolean) => {
      if (!user?.id || !householdId) return
      updatePref.mutate({ userId: user.id, householdId, field, value })
    },
    [user?.id, householdId, updatePref],
  )

  const handleQuietHoursToggle = useCallback(
    (enabled: boolean) => {
      if (!user?.id || !householdId) return
      if (enabled) {
        updatePref.mutate({ userId: user.id, householdId, field: 'quiet_hours_start', value: QUIET_HOURS_DEFAULT.start })
        updatePref.mutate({ userId: user.id, householdId, field: 'quiet_hours_end', value: QUIET_HOURS_DEFAULT.end })
      } else {
        updatePref.mutate({ userId: user.id, householdId, field: 'quiet_hours_start', value: null })
        updatePref.mutate({ userId: user.id, householdId, field: 'quiet_hours_end', value: null })
      }
    },
    [user?.id, householdId, updatePref],
  )

  const quietHoursEnabled =
    currentPrefs.quiet_hours_start !== null &&
    currentPrefs.quiet_hours_end !== null

  const handleSendInvite = useCallback(async () => {
    if (!inviteEmail.trim() || !householdId) return

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(inviteEmail.trim())) {
      setInviteFeedback({ type: 'error', message: 'Please enter a valid email address' })
      return
    }

    setInviteFeedback(null)
    Keyboard.dismiss()

    try {
      await sendInvite.mutateAsync({ email: inviteEmail.trim(), householdId })
      setInviteFeedback({ type: 'success', message: `Invite sent to ${inviteEmail.trim()}!` })
      setInviteEmail('')
      // Auto-collapse after a short delay
      setTimeout(() => {
        setShowInviteInput(false)
        setInviteFeedback(null)
      }, 2500)
    } catch (err: any) {
      setInviteFeedback({ type: 'error', message: err.message || 'Failed to send invite' })
    }
  }, [inviteEmail, householdId, sendInvite])

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text variant="headlineMedium" style={{ fontWeight: 'bold', marginBottom: 20 }}>
        Settings
      </Text>

      {/* ================================================================
          Profile Section
      ================================================================= */}
      <View
        testID="settings-profile"
        style={[styles.profileCard, { backgroundColor: theme.colors.surfaceVariant + '33' }]}
      >
        {profile?.avatar_config ? (
          <Image
            source={{ uri: buildAvatarUrl(profile.avatar_config as any) }}
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: theme.colors.primary + '20' }]}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.colors.primary }}>
              {(profile?.display_name ?? 'C').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.profileText}>
          <Text variant="titleMedium" style={{ fontWeight: '600' }}>
            {profile?.display_name ?? 'Chef'}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {user?.email}
          </Text>
        </View>
      </View>

      {/* ================================================================
          Notification Preferences
      ================================================================= */}
      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Notification Preferences
        </Text>
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}
        >
          Choose which alerts you receive
        </Text>

        {prefsLoading ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          <>
            <View style={[styles.card, { backgroundColor: theme.colors.surfaceVariant + '33' }]}>
              {ALERT_ROWS.map((row, index) => (
                <View key={row.field}>
                  <View style={styles.row} testID={`alert-row-${row.field}`}>
                    <Text style={styles.emoji}>{row.emoji}</Text>
                    <View style={styles.rowText}>
                      <Text variant="bodyLarge" style={styles.rowLabel}>{row.label}</Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        {row.description}
                      </Text>
                    </View>
                    <Switch
                      testID={`toggle-${row.field}`}
                      value={currentPrefs[row.field as keyof typeof currentPrefs] as boolean}
                      onValueChange={(value) => handleToggle(row.field, value)}
                      color={theme.colors.primary}
                    />
                  </View>
                  {index < ALERT_ROWS.length - 1 && <View style={styles.rowSpacer} />}
                </View>
              ))}
            </View>

            {/* Quiet Hours */}
            <View style={[styles.card, { backgroundColor: theme.colors.surfaceVariant + '33', marginTop: 12 }]}>
              <View style={styles.row}>
                <View style={styles.rowText}>
                  <Text variant="bodyLarge" style={styles.rowLabel}>Enable Quiet Hours</Text>
                </View>
                <Switch
                  testID="toggle-quiet-hours"
                  value={quietHoursEnabled}
                  onValueChange={handleQuietHoursToggle}
                  color={theme.colors.primary}
                />
              </View>
              {quietHoursEnabled && (
                <>
                  <View style={styles.timeRow}>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>Start</Text>
                    <Text variant="bodyMedium" style={styles.timeValue}>{formatTime(currentPrefs.quiet_hours_start)}</Text>
                  </View>
                  <View style={styles.timeRow}>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>End</Text>
                    <Text variant="bodyMedium" style={styles.timeValue}>{formatTime(currentPrefs.quiet_hours_end)}</Text>
                  </View>
                </>
              )}
            </View>

            {/* Test notification */}
            <Button
              testID="test-notification-button"
              mode="outlined"
              onPress={() => sendTest.mutate()}
              loading={sendTest.isPending}
              icon="test-tube"
              style={styles.testButton}
              textColor={theme.colors.primary}
            >
              {sendTest.isSuccess ? '✅ Sent!' : 'Send Test Notification'}
            </Button>
          </>
        )}
      </View>

      {/* ================================================================
          Household
      ================================================================= */}
      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Household
        </Text>

        <View style={[styles.card, { backgroundColor: theme.colors.surfaceVariant + '33' }]}>
          <Text variant="bodyLarge" style={{ fontWeight: '600', marginBottom: 12 }}>
            {household?.name ?? 'Your Kitchen'}
          </Text>

          {members?.map((member) => (
            <View key={member.userId} style={styles.memberRow} testID={`member-${member.userId}`}>
              {member.avatarConfig ? (
                <Image
                  source={{ uri: buildAvatarUrl(member.avatarConfig as any) }}
                  style={styles.memberAvatar}
                />
              ) : (
                <View style={[styles.memberAvatar, styles.avatarPlaceholder, { backgroundColor: theme.colors.primary + '20' }]}>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.colors.primary }}>
                    {member.displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text variant="bodyMedium" style={{ flex: 1, fontWeight: '500' }}>
                {member.displayName}
              </Text>
              <View style={[
                styles.roleBadge,
                { backgroundColor: member.role === 'owner' ? theme.colors.primary + '20' : theme.colors.surfaceVariant },
              ]}>
                <Text
                  variant="labelSmall"
                  style={{
                    color: member.role === 'owner' ? theme.colors.primary : theme.colors.onSurfaceVariant,
                    fontWeight: '600',
                  }}
                >
                  {member.role === 'owner' ? 'Owner' : 'Member'}
                </Text>
              </View>
            </View>
          ))}

          {/* Pending invites */}
          {pendingInvites && pendingInvites.length > 0 && (
            <>
              <View style={styles.pendingDivider} />
              <Text
                variant="labelMedium"
                style={{ color: theme.colors.onSurfaceVariant, marginBottom: 6, marginTop: 4 }}
              >
                Pending Invites
              </Text>
              {pendingInvites.map((invite) => (
                <View key={invite.id} style={styles.memberRow} testID={`pending-${invite.id}`}>
                  <View style={[styles.memberAvatar, styles.avatarPlaceholder, { backgroundColor: '#F59E0B20' }]}>
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#F59E0B' }}>✉</Text>
                  </View>
                  <Text
                    variant="bodyMedium"
                    style={{ flex: 1, fontWeight: '500', color: theme.colors.onSurfaceVariant }}
                    numberOfLines={1}
                  >
                    {invite.invited_email}
                  </Text>
                  <View style={[styles.roleBadge, { backgroundColor: '#F59E0B20' }]}>
                    <Text
                      variant="labelSmall"
                      style={{ color: '#F59E0B', fontWeight: '600' }}
                    >
                      Pending
                    </Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Invite member button + collapsible input */}
          <Button
            testID="invite-member-button"
            mode="outlined"
            icon={showInviteInput ? 'close' : 'account-plus'}
            onPress={() => {
              setShowInviteInput(!showInviteInput)
              setInviteFeedback(null)
              setInviteEmail('')
            }}
            style={styles.inviteButton}
            textColor={theme.colors.primary}
          >
            {showInviteInput ? 'Cancel' : '+ Invite Member'}
          </Button>

          {showInviteInput && (
            <View style={styles.inviteInputContainer} testID="invite-input-section">
              <TextInput
                testID="invite-email-input"
                mode="outlined"
                label="Email address"
                placeholder="name@example.com"
                value={inviteEmail}
                onChangeText={(text) => {
                  setInviteEmail(text)
                  setInviteFeedback(null)
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoFocus
                outlineStyle={{ borderRadius: 12 }}
                style={{ backgroundColor: 'transparent' }}
                right={
                  inviteEmail.trim() ? (
                    <TextInput.Icon
                      icon="send"
                      onPress={handleSendInvite}
                      disabled={sendInvite.isPending}
                    />
                  ) : undefined
                }
                onSubmitEditing={handleSendInvite}
                returnKeyType="send"
              />

              <Button
                testID="send-invite-button"
                mode="contained"
                onPress={handleSendInvite}
                loading={sendInvite.isPending}
                disabled={!inviteEmail.trim() || sendInvite.isPending}
                style={styles.sendInviteButton}
                labelStyle={{ fontWeight: '600' }}
              >
                Send Invite
              </Button>

              {inviteFeedback && (
                <View
                  style={[
                    styles.feedbackRow,
                    {
                      backgroundColor: inviteFeedback.type === 'success'
                        ? theme.colors.primary + '15'
                        : theme.colors.error + '15',
                    },
                  ]}
                  testID="invite-feedback"
                >
                  <Text
                    variant="bodySmall"
                    style={{
                      color: inviteFeedback.type === 'success'
                        ? theme.colors.primary
                        : theme.colors.error,
                      fontWeight: '500',
                    }}
                  >
                    {inviteFeedback.type === 'success' ? '✅ ' : '⚠️ '}
                    {inviteFeedback.message}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>

      {/* ================================================================
          Sign Out
      ================================================================= */}
      <Button mode="outlined" onPress={signOut} style={styles.signOut}>
        Sign Out
      </Button>
    </ScrollView>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 48 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    gap: 12,
  },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  profileText: { flex: 1, gap: 2 },
  section: { marginBottom: 28 },
  sectionTitle: { fontWeight: '600', marginBottom: 8 },
  card: { borderRadius: 16, padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  emoji: { fontSize: 22, marginRight: 12, width: 28, textAlign: 'center' },
  rowText: { flex: 1, marginRight: 12 },
  rowLabel: { fontWeight: '500' },
  rowSpacer: { height: 4 },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  timeValue: { fontWeight: '500', opacity: 0.8 },
  testButton: { borderRadius: 24, marginTop: 12 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  memberAvatar: { width: 32, height: 32, borderRadius: 16 },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  signOut: { marginTop: 8 },
  pendingDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginVertical: 10,
  },
  inviteButton: {
    borderRadius: 24,
    marginTop: 14,
  },
  inviteInputContainer: {
    marginTop: 12,
    gap: 10,
  },
  sendInviteButton: {
    borderRadius: 24,
  },
  feedbackRow: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
})
