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
  calculateStreakWeeks,
  type AnalyticsSummary,
  type MonthlyTrend,
  type CategoryWaste,
} from '@fridge-manager/shared'

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const ANALYTICS_KEY = 'analytics'

// ---------------------------------------------------------------------------
// Supabase response shapes (avoids `any` casts)
// ---------------------------------------------------------------------------

interface InventoryRow {
  id: string
  discard_reason: string | null
  discarded_at: string | null
  added_at: string
  category_id: string | null
  categories: { name: string; emoji: string } | null
}

interface GroceryRow {
  completed_at: string | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get ISO date string for N months ago. */
function monthsAgo(n: number): string {
  const date = new Date()
  date.setMonth(date.getMonth() - n)
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
        .select('id, discard_reason, discarded_at, added_at, category_id, categories(name, emoji)')
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

      const items = (inventoryItems ?? []) as unknown as InventoryRow[]
      const groceries = (groceryItems ?? []) as unknown as GroceryRow[]

      // Calculate stats
      const consumed = items.filter((i) => i.discard_reason === 'consumed')
      const wasted = items.filter(
        (i) => i.discard_reason === 'wasted' || i.discard_reason === 'expired',
      )

      const wasteRate = calculateWasteRate(consumed.length, wasted.length)

      // Top wasted category
      const categoryMap = new Map<string, { category: string; emoji: string; count: number }>()
      for (const item of wasted) {
        const cat = item.categories?.name ?? 'uncategorized'
        const emoji = item.categories?.emoji ?? '📦'
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
        groceries.map((g) => g.completed_at?.split('T')[0]).filter(Boolean),
      )

      // Average shelf life for consumed items
      let avgShelfLifeDays: number | null = null
      if (consumed.length > 0) {
        const totalDays = consumed.reduce((sum, item) => {
          const added = new Date(item.added_at).getTime()
          const discarded = new Date(item.discarded_at!).getTime()
          return sum + (discarded - added) / (1000 * 60 * 60 * 24)
        }, 0)
        avgShelfLifeDays = Math.round((totalDays / consumed.length) * 10) / 10
      }

      // Calculate streak from 6-month trend data
      const trendSince = monthsAgo(6)
      const { data: trendData } = await supabase
        .from('inventory_items')
        .select('discard_reason, discarded_at')
        .eq('household_id', householdId!)
        .not('discarded_at', 'is', null)
        .gte('discarded_at', trendSince)

      const trendItems = (trendData ?? []) as unknown as Pick<InventoryRow, 'discard_reason' | 'discarded_at'>[]
      const trendMonthMap = new Map<string, { consumed: number; wasted: number }>()
      for (const item of trendItems) {
        const month = item.discarded_at?.substring(0, 7)
        if (!month) continue
        const entry = trendMonthMap.get(month) ?? { consumed: 0, wasted: 0 }
        if (item.discard_reason === 'consumed') {
          entry.consumed++
        } else {
          entry.wasted++
        }
        trendMonthMap.set(month, entry)
      }
      const trends: MonthlyTrend[] = [...trendMonthMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([m, { consumed: c, wasted: w }]) => ({
          month: m,
          consumed: c,
          wasted: w,
          wasteRate: calculateWasteRate(c, w),
        }))

      return {
        wasteRate,
        itemsConsumed: consumed.length,
        itemsWasted: wasted.length,
        topWastedCategory,
        shoppingTrips: tripDates.size,
        avgShelfLifeDays,
        streakWeeks: calculateStreakWeeks(trends),
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

      const items = (data ?? []) as unknown as Pick<InventoryRow, 'discard_reason' | 'discarded_at'>[]

      // Group by month
      const monthMap = new Map<string, { consumed: number; wasted: number }>()

      for (const item of items) {
        const month = item.discarded_at?.substring(0, 7) // "2026-05"
        if (!month) continue

        const entry = monthMap.get(month) ?? { consumed: 0, wasted: 0 }
        if (item.discard_reason === 'consumed') {
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

      const items = (data ?? []) as unknown as Pick<InventoryRow, 'discard_reason' | 'categories'>[]

      // Group by category
      const categoryMap = new Map<string, CategoryWaste>()

      for (const item of items) {
        const cat = item.categories?.name ?? 'uncategorized'
        const emoji = item.categories?.emoji ?? '📦'
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
