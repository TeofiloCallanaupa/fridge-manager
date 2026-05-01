import Link from 'next/link'
import { signup } from './actions'
import { loginWithMagicLink } from '../login/actions'

export const metadata = {
  title: 'Sign Up — Fridge Manager',
  description: 'Create a new Fridge Manager account',
}

export default async function SignupPage(props: {
  searchParams: Promise<{ error?: string; message?: string; next?: string; email?: string }>
}) {
  const params = await props.searchParams

  return (
    <main className="flex-grow flex flex-col items-center justify-center px-8 pb-12 pt-12 md:pt-24 min-h-screen bg-[var(--color-surface)]">
      {/* Top Navigation Identity */}
      <div className="absolute top-0 left-0 w-full flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[var(--color-primary-container)]">restaurant</span>
          <h1 className="text-xl font-extrabold text-[var(--color-primary-container)] tracking-tighter">Fridge Manager</h1>
        </div>
      </div>

      <section className="w-full max-w-md mb-12 text-center md:text-left z-10">
        <div className="inline-block px-4 py-1.5 mb-6 bg-[var(--color-primary-fixed)] text-[var(--color-on-primary-fixed-variant)] rounded-md text-[10px] font-bold uppercase tracking-[0.2em]">
          Digital Pantry
        </div>
        <h2 className="text-4xl md:text-5xl font-bold text-[var(--color-on-surface)] leading-[1.1] tracking-tight mb-4">
          Start your kitchen journal
        </h2>
        <p className="text-[var(--color-on-secondary-container)] text-lg leading-relaxed max-w-sm">
          Join Fridge Manager to track, share, and savor every ingredient.
        </p>
      </section>

      <div className="w-full max-w-md bg-[var(--color-surface-container-lowest)] rounded-[1.5rem] p-8 soft-shadow z-10">
        {/* Status messages */}
        {params.error && (
          <div id="signup-error" className="mb-6 rounded-md bg-[var(--color-error-container)] p-4 text-sm font-medium text-[var(--color-on-error-container)]">
            {params.error}
          </div>
        )}
        {params.message && (
          <div id="signup-message" className="mb-6 rounded-md bg-[var(--color-primary-fixed)] p-4 text-sm font-medium text-[var(--color-on-primary-fixed-variant)]">
            {params.message}
          </div>
        )}

        <form className="flex flex-col gap-6">
          {params.next && <input type="hidden" name="next" value={params.next} />}
          <div className="group">
            <label htmlFor="email" className="block text-[var(--color-on-secondary-container)] text-[13px] font-semibold mb-2 ml-1">Email Address</label>
            <div className="bg-[var(--color-surface-container-highest)] rounded-[1.5rem] px-6 py-4 transition-all duration-300 focus-within:bg-[var(--color-surface-container)] focus-within:ring-2 focus-within:ring-[var(--color-outline-variant)]">
              <input
                id="email"
                name="email"
                type="email"
                required
                defaultValue={params.email || ""}
                autoComplete="email"
                className="w-full bg-transparent border-none p-0 text-[var(--color-on-surface)] placeholder:text-[var(--color-outline)] focus:ring-0 text-md no-border"
                placeholder="hello@kitchen.com"
              />
            </div>
          </div>

          <div className="group">
            <div className="flex justify-between items-center mb-2 px-1">
              <label htmlFor="password" className="text-[var(--color-on-secondary-container)] text-[13px] font-semibold">Create Password</label>
              <span className="text-[11px] font-medium text-[var(--color-outline)]">Min. 6 characters</span>
            </div>
            <div className="bg-[var(--color-surface-container-highest)] rounded-[1.5rem] px-6 py-4 transition-all duration-300 focus-within:bg-[var(--color-surface-container)] focus-within:ring-2 focus-within:ring-[var(--color-outline-variant)]">
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full bg-transparent border-none p-0 text-[var(--color-on-surface)] placeholder:text-[var(--color-outline)] focus:ring-0 text-md no-border"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            id="signup-button"
            formAction={signup}
            className="forest-gradient cursor-pointer text-[var(--color-on-primary)] font-bold py-4 px-8 rounded-full mt-4 active:scale-95 transition-transform text-lg shadow-lg shadow-[var(--color-primary)]/10"
          >
            Create Account
          </button>
        </form>

        <div className="relative mt-8 mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--color-surface-variant)]" />
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-wider font-semibold">
            <span className="bg-[var(--color-surface-container-lowest)] px-4 text-[var(--color-outline)]">
              or continue with magic link
            </span>
          </div>
        </div>

        <form className="flex flex-col gap-4">
          {params.next && <input type="hidden" name="next" value={params.next} />}
          <div className="group">
            <div className="bg-[var(--color-surface-container-highest)] rounded-[1.5rem] px-6 py-4 transition-all duration-300 focus-within:bg-[var(--color-surface-container)] focus-within:ring-2 focus-within:ring-[var(--color-outline-variant)]">
              <input
                id="magic-link-email"
                name="email"
                type="email"
                required
                defaultValue={params.email || ""}
                autoComplete="email"
                className="w-full bg-transparent border-none p-0 text-[var(--color-on-surface)] placeholder:text-[var(--color-outline)] focus:ring-0 text-md no-border"
                placeholder="hello@kitchen.com"
              />
            </div>
          </div>
          <button
            id="magic-link-button"
            formAction={loginWithMagicLink}
            className="w-full cursor-pointer bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] font-bold py-4 px-8 rounded-full active:scale-95 transition-all text-lg hover:bg-[var(--color-surface-container-highest)]"
          >
            Send Magic Link
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-transparent text-center">
          <p className="text-[var(--color-on-secondary-container)] text-sm">
            Already have an account? 
            <Link href="/login" className="text-[var(--color-primary)] font-bold ml-1 hover:underline underline-offset-4 decoration-2">
              Log in
            </Link>
          </p>
        </div>
      </div>
      
      {/* Decorative Organic Grid */}
      <div className="hidden lg:grid grid-cols-2 gap-6 fixed right-12 bottom-12 w-64 opacity-20 pointer-events-none z-0">
        <div className="h-48 bg-[var(--color-tertiary-container)] rounded-[1.5rem]"></div>
        <div className="h-32 bg-[var(--color-primary-fixed)] rounded-[1.5rem] mt-16"></div>
      </div>
    </main>
  )
}
