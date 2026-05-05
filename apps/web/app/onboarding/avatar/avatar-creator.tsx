'use client'

/**
 * Onboarding Avatar Creator.
 * Now wraps the shared AvatarEditor component with onboarding-specific UI.
 */
import { useState } from 'react'
import type { AvatarConfig } from '@fridge-manager/shared'
import { DEFAULT_AVATAR_CONFIG } from '@fridge-manager/shared'
import { AvatarEditor } from '@/components/avatar/avatar-editor'
import { updateAvatarConfig } from './actions'

export function AvatarCreator() {
  const [config, setConfig] = useState<AvatarConfig>(DEFAULT_AVATAR_CONFIG)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      await updateAvatarConfig(config)
    } catch (err: unknown) {
      const errorObj = err as Error & { digest?: string };
      if (errorObj?.digest?.startsWith('NEXT_REDIRECT') || errorObj?.message === 'NEXT_REDIRECT') {
        throw err
      }
      setError(errorObj.message || 'Failed to save avatar')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col w-full h-full min-h-screen pt-12 pb-32">
      {/* Hero Section */}
      <section className="mb-12">
        <h1 className="font-headline text-4xl md:text-5xl font-extrabold text-[var(--color-on-surface)] tracking-tight leading-tight mb-4">
          Create your avatar
        </h1>
        <p className="text-[var(--color-on-secondary-container)] text-lg md:text-xl max-w-md leading-relaxed">
          Personalize your digital chef to reflect your unique flavor in the kitchen.
        </p>
      </section>

      {/* Avatar Editor */}
      <AvatarEditor initialConfig={config} onChange={setConfig} />

      {error && (
        <div className="mt-8 p-4 rounded-md bg-[var(--color-error-container)] text-[var(--color-on-error-container)] text-center font-medium">
          {error}
        </div>
      )}

      {/* Fixed Bottom Action Bar */}
      <footer className="fixed bottom-0 left-0 w-full p-8 bg-[var(--color-surface)]/90 backdrop-blur-md z-40">
        <div className="max-w-screen-xl mx-auto flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSubmitting}
            className="w-full md:w-64 py-5 px-8 cursor-pointer rounded-full forest-gradient text-[var(--color-on-primary)] font-headline font-bold text-lg shadow-[0_12px_24px_rgba(59,122,87,0.3)] hover:-translate-y-0.5 hover:opacity-90 hover:shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Next Step'}
            {!isSubmitting && <span className="material-symbols-outlined">arrow_forward</span>}
          </button>
        </div>
      </footer>
    </div>
  )
}
