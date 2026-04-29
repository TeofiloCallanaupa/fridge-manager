'use client'

import { useFormStatus } from 'react-dom'

export function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <footer className="fixed bottom-0 left-0 w-full px-8 pb-10 pt-6 bg-gradient-to-t from-[var(--color-background)] via-[var(--color-background)]/90 to-transparent">
      <div className="max-w-2xl mx-auto px-0 md:px-8">
        <button 
          type="submit" 
          disabled={pending}
          className="w-full forest-gradient cursor-pointer text-[var(--color-on-primary)] font-headline font-bold text-lg py-5 rounded-full shadow-lg shadow-[var(--color-primary)]/20 hover:-translate-y-0.5 hover:opacity-90 hover:shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </span>
          ) : (
            <>
              Next
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </>
          )}
        </button>
        <div className="mt-6 flex justify-center items-center gap-2">
          <div className="h-1.5 w-8 rounded-full bg-[var(--color-primary)]"></div>
          <div className="h-1.5 w-2 rounded-full bg-[var(--color-outline-variant)]"></div>
          <div className="h-1.5 w-2 rounded-full bg-[var(--color-outline-variant)]"></div>
        </div>
      </div>
    </footer>
  )
}
