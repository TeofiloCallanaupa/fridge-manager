import { QueryClient } from '@tanstack/react-query'

/**
 * Shared QueryClient with offline-friendly defaults.
 * - gcTime: 24h — cached data stays in memory for a full day
 * - staleTime: 5min — data is considered fresh for 5 minutes
 * - retry: 3 — auto-retry failed requests
 * - networkMode: offlineFirst — use cache first, fetch in background
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      staleTime: 1000 * 60 * 5,     // 5 minutes
      retry: 3,
      networkMode: 'offlineFirst',
    },
    mutations: {
      retry: 3,
      networkMode: 'offlineFirst',
    },
  },
})
