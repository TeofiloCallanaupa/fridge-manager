'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Check, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AvatarEditor } from '@/components/avatar/avatar-editor'
import { updateProfile } from './actions'
import type { AvatarConfig } from '@fridge-manager/shared'
import { DEFAULT_AVATAR_CONFIG } from '@fridge-manager/shared'

export default function EditProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const queryClient = useQueryClient()

  const [displayName, setDisplayName] = useState('')
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(DEFAULT_AVATAR_CONFIG)
  const [isSaving, setIsSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<'success' | 'error' | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  // Fetch current profile data
  const { data: profileData, isLoading } = useQuery({
    queryKey: ['edit-profile-data'],
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

  // Seed state from fetched data
  useEffect(() => {
    if (profileData?.profile) {
      setDisplayName(profileData.profile.display_name || '')
      if (profileData.profile.avatar_config) {
        setAvatarConfig(profileData.profile.avatar_config as unknown as AvatarConfig)
      }
    }
  }, [profileData])

  const handleSave = async () => {
    setIsSaving(true)
    setSaveResult(null)
    setErrorMessage('')

    try {
      const result = await updateProfile(displayName, avatarConfig)
      if (result.error) {
        setSaveResult('error')
        setErrorMessage(result.error)
      } else {
        setSaveResult('success')
        // Invalidate queries so settings page shows updated data
        queryClient.invalidateQueries({ queryKey: ['current-user-profile'] })
        queryClient.invalidateQueries({ queryKey: ['edit-profile-data'] })
        // Show success briefly then navigate back
        setTimeout(() => router.push('/settings'), 1200)
      }
    } catch {
      setSaveResult('error')
      setErrorMessage('Something went wrong')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading || !profileData) {
    return (
      <div className="bg-[var(--color-surface)] min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" />
      </div>
    )
  }

  return (
    <div className="bg-[var(--color-surface)] text-[var(--color-on-surface)] min-h-screen pb-44">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 max-w-2xl mx-auto">
        <button
          type="button"
          onClick={() => router.push('/settings')}
          className="p-2 -ml-2 rounded-full hover:bg-[var(--color-surface-container)] transition-colors cursor-pointer"
          aria-label="Back to settings"
          data-testid="profile-back-button"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-base tracking-tight">Profile Settings</h1>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || saveResult === 'success'}
          className="text-[var(--color-primary)] text-sm font-semibold disabled:opacity-50 cursor-pointer"
          data-testid="profile-save-button"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saveResult === 'success' ? (
            <Check className="w-5 h-5 text-[var(--color-primary)]" />
          ) : (
            'Save'
          )}
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-6 space-y-6">
        {/* Error banner */}
        {saveResult === 'error' && (
          <div
            className="p-3 rounded-xl bg-[var(--color-error-container)] text-[var(--color-on-error-container)] text-sm text-center"
            data-testid="profile-error"
          >
            {errorMessage}
          </div>
        )}

        {/* Success banner */}
        {saveResult === 'success' && (
          <div
            className="p-3 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-sm text-center font-medium"
            data-testid="profile-success"
          >
            Profile updated! Redirecting...
          </div>
        )}

        {/* Display Name */}
        <section>
          <label
            htmlFor="display_name"
            className="text-[var(--color-on-secondary-container)] text-xs font-bold uppercase tracking-widest mb-2 block"
          >
            Display Name
          </label>
          <div className="bg-[var(--color-surface-container-highest)] rounded-xl">
            <input
              id="display_name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your name"
              className="w-full bg-transparent py-4 px-5 text-lg font-semibold text-[var(--color-on-surface)] placeholder:text-[var(--color-outline-variant)] focus:ring-0 focus:outline-none no-border border-none"
              minLength={2}
              maxLength={50}
              data-testid="display-name-input"
            />
          </div>
          <p className="mt-2 text-[var(--color-on-secondary-container)] text-xs px-1">
            This is how you&apos;ll appear in your household
          </p>
        </section>

        {/* Email (read-only) */}
        <section>
          <label className="text-[var(--color-on-secondary-container)] text-xs font-bold uppercase tracking-widest mb-2 block">
            Email
          </label>
          <div className="bg-[var(--color-surface-container-highest)] rounded-xl flex items-center px-5 py-4 gap-2">
            <span className="text-[var(--color-on-surface-variant)] text-lg">
              {profileData.user.email}
            </span>
            <Lock className="w-4 h-4 text-[var(--color-outline)] ml-auto shrink-0" />
          </div>
          <p className="mt-2 text-[var(--color-on-secondary-container)] text-xs px-1">
            Email cannot be changed
          </p>
        </section>

        {/* Avatar Studio */}
        <section>
          <h2 className="font-bold text-lg text-[var(--color-on-surface)] mb-4">
            Avatar Studio
          </h2>
          <AvatarEditor
            initialConfig={avatarConfig}
            onChange={setAvatarConfig}
          />
        </section>
      </main>

      {/* Fixed Bottom Save Button */}
      <footer className="fixed bottom-16 left-0 w-full p-6 bg-[var(--color-surface)]/90 backdrop-blur-md z-40">
        <div className="max-w-2xl mx-auto">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || saveResult === 'success'}
            className="w-full py-4 rounded-full forest-gradient text-[var(--color-on-primary)] font-bold text-base shadow-[0_12px_24px_rgba(59,122,87,0.3)] hover:-translate-y-0.5 hover:opacity-90 hover:shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            data-testid="profile-save-bottom"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : saveResult === 'success' ? (
              <>
                <Check className="w-5 h-5" />
                Saved!
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </footer>
    </div>
  )
}
