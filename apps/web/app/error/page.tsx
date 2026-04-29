import Link from 'next/link'

export const metadata = {
  title: 'Error — Fridge Manager',
  description: 'Something went wrong',
}

/**
 * Generic error page for auth failures (bad token, expired link, etc.).
 */
export default function ErrorPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">
          Something went wrong
        </h1>
        <p className="text-sm text-gray-500">
          The link may have expired or was already used.
          <br />
          Please try again.
        </p>
        <div className="flex justify-center gap-3">
          <Link
            href="/login"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            Back to login
          </Link>
          <Link
            href="/signup"
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Sign up
          </Link>
        </div>
      </div>
    </main>
  )
}
