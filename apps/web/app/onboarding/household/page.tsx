import { createHousehold } from './actions'
import { SubmitButton } from './submit-button'

export const metadata = {
  title: 'Household Setup — Fridge Manager',
  description: 'Set up your Fridge Manager household',
}

export default async function HouseholdStepPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedSearchParams = await searchParams
  const errorParam = resolvedSearchParams.error
  const errorMessage = Array.isArray(errorParam) ? errorParam[0] : errorParam

  return (
    <form action={createHousehold} className="w-full h-full flex flex-col pt-12 pb-32 max-w-4xl mx-auto px-8 gap-12 md:gap-20">
      {/* Hero Section */}
      <section className="flex flex-col md:flex-row items-end justify-between gap-8 border-none">
        <div className="max-w-xl">
          <h1 className="font-display font-extrabold text-5xl md:text-6xl text-[var(--color-on-background)] tracking-tighter leading-[1.1]">
            Set up your <br/><span className="text-[var(--color-primary)] italic font-serif">household</span>
          </h1>
          <p className="mt-6 text-[var(--color-on-surface-variant)] text-lg md:text-xl font-body leading-relaxed max-w-md">
            Every great recipe starts with a well-stocked pantry. Let&apos;s create the space where your culinary journey begins together.
          </p>
        </div>
        <div className="hidden md:block w-48 h-48 rounded-[3rem] bg-[var(--color-surface-container-low)] overflow-hidden rotate-3 flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            alt="Artisanal glass jars filled with dry grains and pasta on a clean wooden shelf" 
            className="w-full h-full object-cover" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuA2BFNzWMvnkRuqQ0aguKHWP9Xfp6xSkD9EvMMBdpluQyc6RQanABdOCRm3uhNaot24UNNgGbXsN8w1KmbR4AgvdxjxloYY5ujJ8mh7pjWrWGhGtSMpGBxLiZJvlWuPM7uIYcGek-f2HCtP2_buPxzj05MQlA-Am-apPrdflw92cvcJ61QvaeCqdRqREOSr6PaVogqAOKB9uex8KkABwwxea7pN1JGtwwiwfUV3t1X_1agevY-Pi6XNEMZPz_BBbrGeUGDTaA0J7tAo"
          />
        </div>
      </section>

      {/* Content Area: Asymmetric Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Card 1: Create */}
        <div className="bg-[var(--color-surface-container-lowest)] rounded-[1.5rem] p-8 shadow-[0_12px_32px_rgba(26,28,27,0.06)] flex flex-col gap-6 relative overflow-hidden transition-transform hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div className="w-14 h-14 bg-[var(--color-primary-container)]/10 rounded-2xl flex items-center justify-center">
              <span className="material-symbols-outlined text-[var(--color-primary)] text-3xl">home</span>
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold font-headline text-[var(--color-on-background)]">Create new household</h3>
            <p className="mt-2 text-[var(--color-on-secondary-container)] text-sm leading-relaxed">
              Start fresh and invite family members or roommates to manage your kitchen inventory in real-time.
            </p>
          </div>
          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="name" className="block text-[11px] font-medium tracking-wide uppercase text-stone-500 mb-2 ml-1">Household Name</label>
              <input 
                id="name"
                name="name"
                required
                className="w-full bg-[var(--color-surface-container-highest)] border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-[var(--color-primary)]/20 text-[var(--color-on-surface)] font-medium placeholder:text-stone-400 focus:outline-none" 
                placeholder="e.g. The Smith Kitchen" 
                type="text"
              />
            </div>
            <div>
              <label htmlFor="timezone" className="block text-[11px] font-medium tracking-wide uppercase text-stone-500 mb-2 ml-1">Timezone</label>
              <select 
                id="timezone"
                name="timezone"
                defaultValue="America/New_York"
                className="w-full bg-[var(--color-surface-container-highest)] border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-[var(--color-primary)]/20 text-[var(--color-on-surface)] font-medium focus:outline-none"
              >
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="Europe/London">London (GMT)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Card 2: Join */}
        <div className="bg-[var(--color-surface-container-lowest)] rounded-[1.5rem] p-8 shadow-[0_12px_32px_rgba(26,28,27,0.06)] flex flex-col gap-6 mt-0 md:mt-12 transition-transform hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div className="w-14 h-14 bg-[var(--color-secondary-container)]/50 rounded-2xl flex items-center justify-center">
              <span className="material-symbols-outlined text-[var(--color-secondary)] text-3xl">group_add</span>
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold font-headline text-[var(--color-on-background)]">Join existing household</h3>
            <p className="mt-2 text-[var(--color-on-secondary-container)] text-sm leading-relaxed">
              Want to join an existing household?
            </p>
          </div>
          <div className="mt-4 p-4 rounded-xl bg-[var(--color-surface-container-low)]">
             <p className="text-sm font-medium text-[var(--color-on-secondary-container)]">
               Ask your household administrator to invite you via email from their Settings page. Once invited, click the link in your email to join!
             </p>
          </div>
        </div>
      </section>

      {/* Decorative Element */}
      <div className="flex justify-center md:justify-start -mt-4">
        <div className="flex -space-x-4">
          <div className="w-10 h-10 rounded-full border-4 border-[var(--color-background)] bg-stone-200 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDU3twj_X97DWxtGiYibYkWEutzz9ihF3W79At8aX1WZ5JnSdHQ_v1yGZl8l-ekCXtKXyKmUhS6WO2uFbwQZdiQejQzzfg0gRsXEwZLKw8UWKfOqk2ZBcAyMHRV_HQV7Lr6mamf0h0JP3JTowF6hpr2xrfT-eM2cxmlDBA6Fj8o3sh59_gkYrLPwAx0csWHIWqBvehAvf9V0M1Hgx_eD_MHwNLYrUCObjxT4TGPmBRW7oaeDTFI58x5ZJuBzV812tOl-OHlEss6CEGv" alt="Avatar" />
          </div>
          <div className="w-10 h-10 rounded-full border-4 border-[var(--color-background)] bg-stone-300 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuB36mCHVtE7g2ur1Lmr103vE4s5d4BqyOSY5dt22gJb0pgB9oOZKgRQwFr_CrgdVZqUTutzUAUSOPnOsAQKVJ9XesOfQD_TnUICvNFS8f-0P_USCWVXIrVgdAC7cVqb9AJP70rpIEBundJEE-ONOrN0BRrF0aeIcoKriyipcKmMqGbI1_aFC0dGhumyVZF_DQA4RMNWycupTbZPUQNAC0ijGhkT3ynnX13_DjwWECFwRlT434h9OgdL-KYN_YHialfm4R1OmNqVTI7B" alt="Avatar" />
          </div>
          <div className="w-10 h-10 rounded-full border-4 border-[var(--color-background)] bg-[var(--color-primary-fixed)] flex items-center justify-center text-[10px] font-bold text-[var(--color-on-primary-fixed)]">
              +12k
          </div>
        </div>
        <p className="ml-8 text-sm text-stone-400 self-center">Join 12,000+ happy households</p>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-md bg-[var(--color-error-container)] text-[var(--color-on-error-container)] text-center font-medium">
          {errorMessage}
        </div>
      )}

      {/* Footer Action */}
      <SubmitButton />
    </form>
  )
}

