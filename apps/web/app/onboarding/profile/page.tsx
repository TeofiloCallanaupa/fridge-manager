import { updateDisplayName } from './actions'


import { SubmitButton } from './submit-button'

export default async function ProfileStepPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const resolvedSearchParams = await searchParams

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex justify-center text-sm font-medium text-zinc-500">
        Step 1 of 3
      </div>

      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">What should we call you?</h2>
        <p className="text-sm text-zinc-500">
          This is how you'll appear to your household.
        </p>
      </div>

      <form action={updateDisplayName} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="display_name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Display Name</label>
          <input
            id="display_name"
            name="display_name"
            placeholder="e.g. Teo"
            required
            autoComplete="name"
            autoFocus
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {resolvedSearchParams.error && (
          <div className="text-sm text-red-500 text-center">
            {resolvedSearchParams.error}
          </div>
        )}

        <SubmitButton />
      </form>
    </div>
  )
}
