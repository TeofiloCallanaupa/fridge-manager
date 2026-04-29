import { updateDisplayName } from './actions'
import { SubmitButton } from './submit-button'

export const metadata = {
  title: 'Profile Setup — Fridge Manager',
  description: 'Set up your Fridge Manager profile',
}

export default function ProfileSetupPage() {
  return (
    <form action={updateDisplayName} className="flex flex-col w-full h-full">
      {/* Hero Section */}
      <section className="mb-16">
        <div className="mb-8 overflow-hidden rounded-xl h-48 w-full bg-[var(--color-surface-container-low)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            className="w-full h-full object-cover opacity-90 mix-blend-multiply" 
            alt="kitchen pantry" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBGH7ieHjBFIfYS_HPL6jCEM3EjvytTxhrSJEZ3_qDq1947mXx_FaZI4ExIvQBuv7xzuC8n9xlSBe3DnwFEnXg0UE6x7m0cH63WwIf_8ZMRS1gcxTfxtCjV7t3_juzlNUobLLms66UoPpAlgLgcMW3-0slpd9VK0egvvBKny6zE0xu91segYAabAx8YUz33EXbeZe5sGBxHgB_lpoJG54L-ulW7Y9ASBgYcGJuNDNTrahkEepIhBY8SfASmt1fwj_5j4c7dc-pfFl1Y"
          />
        </div>
        <span className="text-[var(--color-primary)] font-bold uppercase tracking-widest text-[11px] mb-3 block">Personalization</span>
        <h1 className="text-[var(--color-on-surface)] font-display text-4xl md:text-5xl font-extrabold tracking-tighter leading-[1.1] mb-4">
          What should we call you?
        </h1>
        <p className="text-[var(--color-on-secondary-container)] text-lg max-w-md font-medium leading-relaxed">
          Your culinary identity starts here. Let’s make your kitchen feel like home.
        </p>
      </section>

      {/* Input Section */}
      <section className="space-y-8 flex-1">
        <div className="relative group">
          <div className="absolute -top-3 left-6 px-2 bg-[var(--color-background)] z-10">
            <label className="text-[var(--color-on-secondary-container)] text-[11px] font-bold uppercase tracking-widest" htmlFor="display_name">Display Name</label>
          </div>
          <div className="bg-[var(--color-surface-container-highest)] rounded-xl p-1 transition-all focus-within:ring-2 focus-within:ring-[var(--color-primary-container)]/20">
            <input 
              className="w-full bg-transparent border-none py-6 px-6 text-xl font-semibold text-[var(--color-on-surface)] placeholder:text-[var(--color-outline-variant)] focus:ring-0 focus:outline-none no-border" 
              id="display_name" 
              name="display_name"
              placeholder="Enter your name" 
              required
              minLength={2}
              maxLength={50}
              type="text"
            />
          </div>
          <p className="mt-4 text-[var(--color-on-secondary-container)] text-sm flex items-center gap-2 px-2">
            <span className="material-symbols-outlined text-[18px]">info</span>
            This is how you&apos;ll appear in your shared pantry.
          </p>
        </div>

        {/* Asymmetric Editorial Card */}
        <div className="mt-12 p-8 rounded-[2rem] bg-[var(--color-surface-container-low)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8">
            <span className="material-symbols-outlined text-[var(--color-primary-container)]/20 text-6xl" style={{ fontVariationSettings: "'FILL' 1" }}>restaurant</span>
          </div>
          <div className="relative z-10 max-w-[70%]">
            <h3 className="text-[var(--color-on-surface)] font-headline font-bold text-lg mb-2">Why a name?</h3>
            <p className="text-[var(--color-on-secondary-container)] text-sm leading-relaxed">
              Personalizing your space helps us curate recipes and storage tips specifically for your lifestyle.
            </p>
          </div>
        </div>
      </section>

      <SubmitButton />
    </form>
  )
}
