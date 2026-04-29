'use client'

import { useFormStatus } from 'react-dom'

export function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <footer className="fixed bottom-0 left-0 w-full p-8 bg-[var(--color-surface)]/90 backdrop-blur-md z-40">
      <div className="max-w-screen-xl mx-auto flex justify-end">
        <button 
          type="submit" 
          disabled={pending}
          className="w-full md:w-64 py-5 px-8 cursor-pointer rounded-full forest-gradient text-[var(--color-on-primary)] font-headline font-bold text-lg shadow-[0_12px_24px_rgba(59,122,87,0.3)] hover:-translate-y-0.5 hover:opacity-90 hover:shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
        >
          <span className="relative z-10 flex items-center justify-center gap-3 w-full">
            {pending ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                Complete Setup
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">chevron_right</span>
              </>
            )}
          </span>
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </button>
      </div>
    </footer>
  )
}
