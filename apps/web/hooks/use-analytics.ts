'use client'

/**
 * Analytics hooks for the web app.
 *
 * Thin wrappers around shared query functions from @fridge-manager/shared.
 * Only platform-specific part: creating the Supabase client.
 *
 * @see packages/shared/src/queries/analytics.ts — shared query logic
 */
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import {
  fetchAnalyticsSummary,
  fetchMonthlyTrends,
  fetchCategoryWaste,
  type AnalyticsSummary,
  type MonthlyTrend,
  type CategoryWaste,
} from '@fridge-manager/shared'

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const ANALYTICS_KEY = 'analytics'

// ---------------------------------------------------------------------------
// useAnalyticsSummary
// ---------------------------------------------------------------------------

export function useAnalyticsSummary(householdId: string | undefined | null) {
  const supabase = createClient()

  return useQuery<AnalyticsSummary>({
    queryKey: [ANALYTICS_KEY, 'summary', householdId],
    queryFn: () => fetchAnalyticsSummary(supabase, householdId!),
    enabled: !!householdId,
  })
}

// ---------------------------------------------------------------------------
// useMonthlyTrends
// ---------------------------------------------------------------------------

export function useMonthlyTrends(
  householdId: string | undefined | null,
  months: number = 6,
) {
  const supabase = createClient()

  return useQuery<MonthlyTrend[]>({
    queryKey: [ANALYTICS_KEY, 'trends', householdId, months],
    queryFn: () => fetchMonthlyTrends(supabase, householdId!, months),
    enabled: !!householdId,
  })
}

// ---------------------------------------------------------------------------
// useCategoryWaste
// ---------------------------------------------------------------------------

export function useCategoryWaste(householdId: string | undefined | null) {
  const supabase = createClient()

  return useQuery<CategoryWaste[]>({
    queryKey: [ANALYTICS_KEY, 'categoryWaste', householdId],
    queryFn: () => fetchCategoryWaste(supabase, householdId!),
    enabled: !!householdId,
  })
}
