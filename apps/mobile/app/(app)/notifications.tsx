/**
 * Notification Preferences screen.
 *
 * Matches the Stitch-generated "Heirloom Pantry" design:
 * - Expiration alert toggles (5 thresholds)
 * - Quiet hours configuration
 * - Test notification button
 */
import React, { useCallback } from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import {
  Text,
  Switch,
  Button,
  ActivityIndicator,
  useTheme,
  Divider,
} from 'react-native-paper'
import { router } from 'expo-router'
import { useAuth } from '../../contexts/AuthContext'
import {
  useNotificationPreferences,
  useUpdateNotificationPreference,
  useSendTestNotification,
  type PreferenceField,
} from '../../hooks/use-notification-preferences'
import { QUIET_HOURS_DEFAULT } from '@fridge-manager/shared'

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
  {
    field: 'halfway_enabled',
    emoji: '⏳',
    label: 'Halfway',
    description: 'When items reach the midpoint of their shelf life',
  },
  {
    field: 'two_day_enabled',
    emoji: '⚠️',
    label: '2-Day Warning',
    description: 'Two days before expiration',
  },
  {
    field: 'one_day_enabled',
    emoji: '🔔',
    label: '1-Day Warning',
    description: 'The day before expiration',
  },
  {
    field: 'day_of_enabled',
    emoji: '🚨',
    label: 'Day Of',
    description: 'On the expiration date',
  },
  {
    field: 'post_expiration_enabled',
    emoji: '🗑️',
    label: 'Expired',
    description: 'Daily reminders for expired items',
  },
]

// ---------------------------------------------------------------------------
// Default prefs (used when no row exists yet)
// ---------------------------------------------------------------------------

const DEFAULT_PREFS = {
  halfway_enabled: true,
  two_day_enabled: true,
  one_day_enabled: true,
  day_of_enabled: true,
  post_expiration_enabled: true,
  quiet_hours_start: null as string | null,
  quiet_hours_end: null as string | null,
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NotificationsScreen() {
  const theme = useTheme()
  const { user, householdId } = useAuth()

  const { data: prefs, isLoading } = useNotificationPreferences(
    user?.id,
    householdId,
  )
  const updatePref = useUpdateNotificationPreference()
  const sendTest = useSendTestNotification()

  // Merge fetched prefs with defaults for toggles
  const currentPrefs = prefs ?? DEFAULT_PREFS

  const handleToggle = useCallback(
    (field: PreferenceField, value: boolean) => {
      if (!user?.id || !householdId) return
      updatePref.mutate({
        userId: user.id,
        householdId,
        field,
        value,
      })
    },
    [user?.id, householdId, updatePref],
  )

  const handleQuietHoursToggle = useCallback(
    (enabled: boolean) => {
      if (!user?.id || !householdId) return
      if (enabled) {
        // Set default quiet hours
        updatePref.mutate({
          userId: user.id,
          householdId,
          field: 'quiet_hours_start',
          value: QUIET_HOURS_DEFAULT.start,
        })
        updatePref.mutate({
          userId: user.id,
          householdId,
          field: 'quiet_hours_end',
          value: QUIET_HOURS_DEFAULT.end,
        })
      } else {
        // Clear quiet hours
        updatePref.mutate({
          userId: user.id,
          householdId,
          field: 'quiet_hours_start',
          value: null,
        })
        updatePref.mutate({
          userId: user.id,
          householdId,
          field: 'quiet_hours_end',
          value: null,
        })
      }
    },
    [user?.id, householdId, updatePref],
  )

  const quietHoursEnabled =
    currentPrefs.quiet_hours_start !== null &&
    currentPrefs.quiet_hours_end !== null

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          styles.center,
          { backgroundColor: theme.colors.background },
        ]}
        testID="loading-indicator"
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    )
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Notifications
        </Text>
        <Text
          variant="bodyMedium"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          Choose which alerts you receive
        </Text>
      </View>

      {/* Expiration Alerts */}
      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Expiration Alerts
        </Text>

        <View
          style={[
            styles.card,
            { backgroundColor: theme.colors.surfaceVariant + '33' },
          ]}
        >
          {ALERT_ROWS.map((row, index) => (
            <View key={row.field}>
              <View style={styles.row}>
                <Text style={styles.emoji}>{row.emoji}</Text>
                <View style={styles.rowText}>
                  <Text variant="bodyLarge" style={styles.rowLabel}>
                    {row.label}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    {row.description}
                  </Text>
                </View>
                <Switch
                  testID={`toggle-${row.field}`}
                  value={
                    currentPrefs[row.field as keyof typeof currentPrefs] as boolean
                  }
                  onValueChange={(value) => handleToggle(row.field, value)}
                  color={theme.colors.primary}
                />
              </View>
              {index < ALERT_ROWS.length - 1 && (
                <View style={styles.rowSpacer} />
              )}
            </View>
          ))}
        </View>
      </View>

      {/* Quiet Hours */}
      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Quiet Hours
        </Text>
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}
        >
          No notifications during these hours
        </Text>

        <View
          style={[
            styles.card,
            { backgroundColor: theme.colors.surfaceVariant + '33' },
          ]}
        >
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text variant="bodyLarge" style={styles.rowLabel}>
                Enable Quiet Hours
              </Text>
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
              <View style={styles.rowSpacer} />
              <View style={styles.timeRow}>
                <Text
                  variant="bodyMedium"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  Start
                </Text>
                <Text variant="bodyMedium" style={styles.timeValue}>
                  {formatTime(currentPrefs.quiet_hours_start)}
                </Text>
              </View>
              <View style={styles.timeRow}>
                <Text
                  variant="bodyMedium"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  End
                </Text>
                <Text variant="bodyMedium" style={styles.timeValue}>
                  {formatTime(currentPrefs.quiet_hours_end)}
                </Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Test Notification */}
      <View style={styles.testSection}>
        <Button
          testID="test-notification-button"
          mode="outlined"
          onPress={() => sendTest.mutate()}
          loading={sendTest.isPending}
          icon="test-tube"
          style={styles.testButton}
          textColor={theme.colors.primary}
        >
          Send Test Notification
        </Button>
        <Text
          variant="bodySmall"
          style={{
            color: theme.colors.onSurfaceVariant,
            textAlign: 'center',
            marginTop: 8,
          }}
        >
          {sendTest.isSuccess
            ? '✅ Test notification sent!'
            : 'Sends a test push to this device'}
        </Text>
      </View>
    </ScrollView>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Formats "22:00" → "10:00 PM" */
function formatTime(time: string | null): string {
  if (!time) return '—'
  const [hours, minutes] = time.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 24,
    paddingBottom: 48,
  },
  header: {
    marginBottom: 28,
    gap: 4,
  },
  title: {
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  emoji: {
    fontSize: 22,
    marginRight: 12,
    width: 28,
    textAlign: 'center',
  },
  rowText: {
    flex: 1,
    marginRight: 12,
  },
  rowLabel: {
    fontWeight: '500',
  },
  rowSpacer: {
    height: 4,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  timeValue: {
    fontWeight: '500',
    opacity: 0.8,
  },
  testSection: {
    marginTop: 8,
    alignItems: 'center',
  },
  testButton: {
    borderRadius: 24,
    width: '100%',
  },
})
