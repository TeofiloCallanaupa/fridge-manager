/**
 * Analytics hooks.
 *
 * - useAnalyticsSummary — aggregate stats for "At a Glance" tab
 * - useMonthlyTrends — monthly waste rate for line chart
 * - useCategoryWaste — items wasted by category for bar chart
 *
 * All data is derived from inventory_items and grocery_items.
 */
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import {
  calculateWasteRate,
  type AnalyticsSummary,
  type MonthlyTrend,
  type CategoryWaste,
} from '@fridge-manager/shared'

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const ANALYTICS_KEY = 'analytics'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get ISO date string for N months ago. */
function monthsAgo(n: number): string {
  const date = new Date()
  date.setMonth(date.getMonth() - n)
  return date.toISOString()
}

/** Get the start of the current month as ISO string. */
function startOfMonth(): string {
  const date = new Date()
  date.setDate(1)
  date.setHours(0, 0, 0, 0)
  return date.toISOString()
}

// ---------------------------------------------------------------------------
// useAnalyticsSummary
// ---------------------------------------------------------------------------

export function useAnalyticsSummary(householdId: string | undefined | null) {
  return useQuery({
    queryKey: [ANALYTICS_KEY, 'summary', householdId],
    queryFn: async (): Promise<AnalyticsSummary> => {
      const since = monthsAgo(1)

      // Fetch discarded inventory items this month
      const { data: inventoryItems, error: invError } = await supabase
        .from('inventory_items')
        .select('*, categories(name, emoji)')
        .eq('household_id', householdId!)
        .not('discarded_at', 'is', null)
        .gte('discarded_at', since)

      if (invError) throw invError

      // Fetch completed grocery items this month (for shopping trips)
      const { data: groceryItems, error: grocError } = await supabase
        .from('grocery_items')
        .select('completed_at')
        .eq('household_id', householdId!)
        .not('completed_at', 'is', null)
        .gte('completed_at', since)

      if (grocError) throw grocError

      // Calculate stats
      const consumed = inventoryItems?.filter(
        (i: any) => i.discard_reason === 'consumed',
      ) ?? []
      const wasted = inventoryItems?.filter(
        (i: any) => i.discard_reason === 'wasted' || i.discard_reason === 'expired',
      ) ?? []

      const wasteRate = calculateWasteRate(consumed.length, wasted.length)

      // Top wasted category
      const categoryMap = new Map<string, { category: string; emoji: string; count: number }>()
      for (const item of wasted) {
        const cat = (item as any).categories?.name ?? 'uncategorized'
        const emoji = (item as any).categories?.emoji ?? '📦'
        const existing = categoryMap.get(cat)
        if (existing) {
          existing.count++
        } else {
          categoryMap.set(cat, { category: cat, emoji, count: 1 })
        }
      }
      const topWastedCategory = categoryMap.size > 0
        ? [...categoryMap.values()].sort((a, b) => b.count - a.count)[0]
        : null

      // Shopping trips = distinct dates of completed_at
      const tripDates = new Set(
        groceryItems?.map((g: any) => g.completed_at?.split('T')[0]) ?? [],
      )

      // Average shelf life for consumed items
      let avgShelfLifeDays: number | null = null
      if (consumed.length > 0) {
        const totalDays = consumed.reduce((sum: number, item: any) => {
          const added = new Date(item.added_at).getTime()
          const discarded = new Date(item.discarded_at).getTime()
          return sum + (discarded - added) / (1000 * 60 * 60 * 24)
        }, 0)
        avgShelfLifeDays = Math.round((totalDays / consumed.length) * 10) / 10
      }

      return {
        wasteRate,
        itemsConsumed: consumed.length,
        itemsWasted: wasted.length,
        topWastedCategory,
        shoppingTrips: tripDates.size,
        avgShelfLifeDays,
        streakWeeks: 0, // TODO: calculate from monthly trends
      }
    },
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
  return useQuery({
    queryKey: [ANALYTICS_KEY, 'trends', householdId, months],
    queryFn: async (): Promise<MonthlyTrend[]> => {
      const since = monthsAgo(months)

      const { data, error } = await supabase
        .from('inventory_items')
        .select('discard_reason, discarded_at')
        .eq('household_id', householdId!)
        .not('discarded_at', 'is', null)
        .gte('discarded_at', since)

      if (error) throw error

      // Group by month
      const monthMap = new Map<string, { consumed: number; wasted: number }>()

      for (const item of data ?? []) {
        const month = (item as any).discarded_at?.substring(0, 7) // "2026-05"
        if (!month) continue

        const entry = monthMap.get(month) ?? { consumed: 0, wasted: 0 }
        if ((item as any).discard_reason === 'consumed') {
          entry.consumed++
        } else {
          entry.wasted++
        }
        monthMap.set(month, entry)
      }

      // Convert to sorted array
      return [...monthMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, { consumed, wasted }]) => ({
          month,
          consumed,
          wasted,
          wasteRate: calculateWasteRate(consumed, wasted),
        }))
    },
    enabled: !!householdId,
  })
}

// ---------------------------------------------------------------------------
// useCategoryWaste
// ---------------------------------------------------------------------------

export function useCategoryWaste(householdId: string | undefined | null) {
  return useQuery({
    queryKey: [ANALYTICS_KEY, 'categoryWaste', householdId],
    queryFn: async (): Promise<CategoryWaste[]> => {
      const since = monthsAgo(1)

      const { data, error } = await supabase
        .from('inventory_items')
        .select('discard_reason, categories(name, emoji)')
        .eq('household_id', householdId!)
        .not('discarded_at', 'is', null)
        .in('discard_reason', ['wasted', 'expired'])
        .gte('discarded_at', since)

      if (error) throw error

      // Group by category
      const categoryMap = new Map<string, CategoryWaste>()

      for (const item of data ?? []) {
        const cat = (item as any).categories?.name ?? 'uncategorized'
        const emoji = (item as any).categories?.emoji ?? '📦'
        const existing = categoryMap.get(cat)
        if (existing) {
          existing.count++
        } else {
          categoryMap.set(cat, { category: cat, emoji, count: 1 })
        }
      }

      // Sort descending by count
      return [...categoryMap.values()].sort((a, b) => b.count - a.count)
    },
    enabled: !!householdId,
  })
}
