'use client'

import React, { useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  LogOut,
  Bell,
  Users,
  UserCircle,
  ChevronRight,
  Moon,
  FlaskConical,
  Loader2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useCurrentHousehold } from '@/hooks/use-household'
import {
  useNotificationPreferences,
  useUpdateNotificationPreference,
  useSendTestNotification,
  type PreferenceField,
} from '@/hooks/use-notification-preferences'
import { useHouseholdMembers } from '@/hooks/use-household-members'
import { QUIET_HOURS_DEFAULT, DEFAULT_NOTIFICATION_PREFS, buildAvatarUrl } from '@fridge-manager/shared'
import { useQuery } from '@tanstack/react-query'

// ---------------------------------------------------------------------------
// Alert row config
// ---------------------------------------------------------------------------

type AlertRow = {
  field: PreferenceField
  icon: React.ReactNode
  label: string
  description: string
}

const ALERT_ROWS: AlertRow[] = [
  {
    field: 'halfway_enabled',
    icon: <span className="text-sm">⏳</span>,
    label: 'Halfway',
    description: 'When items reach the midpoint of their shelf life',
  },
  {
    field: 'two_day_enabled',
    icon: <span className="text-sm">⚠️</span>,
    label: '2-Day Warning',
    description: 'Two days before expiration',
  },
  {
    field: 'one_day_enabled',
    icon: <span className="text-sm">🔔</span>,
    label: '1-Day Warning',
    description: 'The day before expiration',
  },
  {
    field: 'day_of_enabled',
    icon: <span className="text-sm">🚨</span>,
    label: 'Day Of',
    description: 'On the expiration date',
  },
  {
    field: 'post_expiration_enabled',
    icon: <span className="text-sm">🗑️</span>,
    label: 'Expired',
    description: 'Daily reminders for expired items',
  },
]



// ---------------------------------------------------------------------------
// Toggle component
// ---------------------------------------------------------------------------

function Toggle({
  checked,
  onChange,
  testId,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  testId?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      data-testid={testId}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        checked ? 'bg-primary' : 'bg-surface-container-high'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out mt-1 ${
          checked ? 'translate-x-6 ml-0.5' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(time: string | null): string {
  if (!time) return '—'
  const [hours, minutes] = time.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()

  // Auth + profile
  const { data: authData } = useQuery({
    queryKey: ['current-user-profile'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return null

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, avatar_config')
        .eq('id', user.id)
        .single()

      return { user, profile }
    },
  })

  // Household
  const { data: household } = useCurrentHousehold()
  const { data: members } = useHouseholdMembers(household?.householdId)

  // Notification preferences
  const { data: prefs, isLoading: prefsLoading } = useNotificationPreferences(
    household?.userId,
    household?.householdId,
  )
  const updatePref = useUpdateNotificationPreference()
  const sendTest = useSendTestNotification()

  const currentPrefs = prefs ?? DEFAULT_NOTIFICATION_PREFS

  const handleToggle = useCallback(
    (field: PreferenceField, value: boolean) => {
      if (!household?.userId || !household?.householdId) return
      updatePref.mutate({
        userId: household.userId,
        householdId: household.householdId,
        field,
        value,
      })
    },
    [household?.userId, household?.householdId, updatePref],
  )

  const handleQuietHoursToggle = useCallback(
    (enabled: boolean) => {
      if (!household?.userId || !household?.householdId) return
      if (enabled) {
        updatePref.mutate({
          userId: household.userId,
          householdId: household.householdId,
          field: 'quiet_hours_start',
          value: QUIET_HOURS_DEFAULT.start,
        })
        updatePref.mutate({
          userId: household.userId,
          householdId: household.householdId,
          field: 'quiet_hours_end',
          value: QUIET_HOURS_DEFAULT.end,
        })
      } else {
        updatePref.mutate({
          userId: household.userId,
          householdId: household.householdId,
          field: 'quiet_hours_start',
          value: null,
        })
        updatePref.mutate({
          userId: household.userId,
          householdId: household.householdId,
          field: 'quiet_hours_end',
          value: null,
        })
      }
    },
    [household?.userId, household?.householdId, updatePref],
  )

  const quietHoursEnabled =
    currentPrefs.quiet_hours_start !== null &&
    currentPrefs.quiet_hours_end !== null

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!authData?.user) {
    return (
      <div className="bg-surface min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="bg-surface text-on-surface min-h-screen">
      {/* Header */}
      <header className="px-6 py-5 max-w-2xl mx-auto">
        <h1 className="text-lg font-bold text-primary tracking-tight">
          Settings
        </h1>
      </header>

      <main className="max-w-2xl mx-auto px-6 pb-12 space-y-8">
        {/* ================================================================
            Profile Section
        ================================================================= */}
        <section
          data-testid="settings-profile"
          className="flex items-center gap-4 p-4 rounded-2xl bg-surface-container-lowest"
        >
          {authData.profile?.avatar_config ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={buildAvatarUrl(authData.profile.avatar_config as any)}
              alt="Avatar"
              className="w-12 h-12 rounded-full bg-surface-container-low"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center">
              <UserCircle className="w-8 h-8 text-on-surface-variant" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-on-surface font-semibold truncate">
              {authData.profile?.display_name || 'Chef'}
            </p>
            <p className="text-on-surface-variant text-sm truncate">
              {authData.user.email}
            </p>
          </div>
          <Link
            href="/settings/profile"
            className="text-primary text-sm font-semibold hover:underline shrink-0"
            data-testid="edit-profile-link"
          >
            Edit Profile
          </Link>
        </section>

        {/* ================================================================
            Notification Preferences
        ================================================================= */}
        <section data-testid="settings-notifications">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-5 h-5 text-on-surface" />
            <h2 className="text-on-surface font-bold text-base">
              Notification Preferences
            </h2>
          </div>
          <p className="text-on-surface-variant text-sm mb-4">
            Choose which alerts you receive
          </p>

          {prefsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Alert toggles */}
              <div className="rounded-2xl bg-surface-container-lowest p-4 space-y-1">
                {ALERT_ROWS.map((row) => (
                  <div
                    key={row.field}
                    className="flex items-center gap-3 py-3"
                    data-testid={`alert-row-${row.field}`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center shrink-0">
                      {row.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-on-surface text-sm font-medium">
                        {row.label}
                      </p>
                      <p className="text-on-surface-variant text-xs">
                        {row.description}
                      </p>
                    </div>
                    <Toggle
                      checked={
                        currentPrefs[
                          row.field as keyof typeof currentPrefs
                        ] as boolean
                      }
                      onChange={(v) => handleToggle(row.field, v)}
                      testId={`toggle-${row.field}`}
                    />
                  </div>
                ))}
              </div>

              {/* Quiet Hours */}
              <div className="mt-4 flex items-center justify-between py-3">
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-on-surface-variant" />
                  <span className="text-on-surface text-sm font-medium">
                    Enable Quiet Hours
                  </span>
                </div>
                <Toggle
                  checked={quietHoursEnabled}
                  onChange={handleQuietHoursToggle}
                  testId="toggle-quiet-hours"
                />
              </div>

              {quietHoursEnabled && (
                <div className="flex gap-4 mt-1 mb-2">
                  <div className="flex-1 py-2 px-4 rounded-xl bg-surface-container-lowest text-center">
                    <span className="text-on-surface-variant text-xs uppercase tracking-wider block">
                      Start
                    </span>
                    <span className="text-on-surface text-sm font-medium">
                      {formatTime(currentPrefs.quiet_hours_start)}
                    </span>
                  </div>
                  <div className="flex-1 py-2 px-4 rounded-xl bg-surface-container-lowest text-center">
                    <span className="text-on-surface-variant text-xs uppercase tracking-wider block">
                      End
                    </span>
                    <span className="text-on-surface text-sm font-medium">
                      {formatTime(currentPrefs.quiet_hours_end)}
                    </span>
                  </div>
                </div>
              )}

              {/* Test notification */}
              <button
                type="button"
                onClick={() => sendTest.mutate()}
                disabled={sendTest.isPending}
                data-testid="test-notification-button"
                className="mt-4 w-full py-3 rounded-full border border-outline-variant/50 text-on-surface-variant text-sm font-medium hover:text-on-surface hover:border-outline transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <FlaskConical className="w-4 h-4" />
                {sendTest.isPending
                  ? 'Sending...'
                  : sendTest.isSuccess
                    ? 'Test notification sent!'
                    : 'Send Test Notification'}
              </button>
            </>
          )}
        </section>

        {/* ================================================================
            Household
        ================================================================= */}
        <section data-testid="settings-household">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-on-surface" />
            <h2 className="text-on-surface font-bold text-base">Household</h2>
          </div>

          <div className="rounded-2xl bg-surface-container-lowest p-4">
            <p className="text-on-surface font-semibold mb-3">
              {household?.household?.name || 'Your Kitchen'}
            </p>

            <div className="space-y-3">
              {members?.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center gap-3"
                  data-testid={`member-${member.userId}`}
                >
                  {member.avatarConfig ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={buildAvatarUrl(member.avatarConfig as any)}
                      alt={member.displayName}
                      className="w-9 h-9 rounded-full bg-surface-container-low"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                      {member.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="flex-1 text-on-surface text-sm font-medium">
                    {member.displayName}
                  </span>
                  <span
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                      member.role === 'owner'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    {member.role === 'owner' ? 'Owner' : 'Member'}
                  </span>
                </div>
              ))}
            </div>

            <Link
              href="/invite"
              className="mt-4 w-full py-3 rounded-full border border-outline-variant/50 text-on-surface-variant text-sm font-medium hover:text-on-surface hover:border-outline transition-colors cursor-pointer flex items-center justify-center gap-2"
              data-testid="invite-member-button"
            >
              + Invite Member
            </Link>
          </div>
        </section>

        {/* ================================================================
            Sign Out
        ================================================================= */}
        <div className="pt-4">
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-full border border-outline-variant/50 text-on-surface-variant hover:text-on-surface hover:border-outline transition-colors text-sm font-medium cursor-pointer"
            data-testid="settings-signout"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </main>
    </div>
  )
}
