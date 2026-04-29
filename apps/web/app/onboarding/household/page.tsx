import { createHousehold } from './actions'


export default async function HouseholdStepPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const resolvedSearchParams = await searchParams

  return (
    <div className="flex flex-col space-y-8">
      <div className="flex justify-center text-sm font-medium text-zinc-500">
        Step 3 of 3
      </div>

      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Set up your household</h2>
        <p className="text-sm text-zinc-500">
          Create a space to share your fridge and groceries.
        </p>
      </div>

      <div className="space-y-8">
        {/* Create Household Form */}
        <div className="rounded-lg border bg-zinc-50 p-6 dark:bg-zinc-800/50">
          <h3 className="mb-4 text-lg font-medium">Create a new household</h3>
          <form action={createHousehold} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Household Name</label>
              <input
                id="name"
                name="name"
                placeholder="e.g. Teo & Emilia's Apartment"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="timezone" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Timezone</label>
              <select 
                id="timezone" 
                name="timezone"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                defaultValue="America/New_York"
              >
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="Europe/London">London (GMT)</option>
                {/* Add more timezones as needed */}
              </select>
              <p className="text-xs text-zinc-500 mt-1">Used for calculating expiration dates</p>
            </div>

            {resolvedSearchParams.error && (
              <div className="text-sm text-red-500">
                {resolvedSearchParams.error}
              </div>
            )}

            <button type="submit" className="w-full h-10 px-4 py-2 bg-zinc-900 text-zinc-50 hover:bg-zinc-900/90 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-50/90 rounded-md font-medium">
              Create and Get Started
            </button>
          </form>
        </div>

        {/* Join Household Section */}
        <div className="text-center space-y-2">
          <p className="text-sm text-zinc-500">
            Want to join an existing household?
          </p>
          <p className="text-sm font-medium">
            Ask them to invite you to their household by entering your email in their Settings page. Once they invite you, click the link in your email to join!
          </p>
        </div>
      </div>
    </div>
  )
}
