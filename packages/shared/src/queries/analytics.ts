/**
 * Analytics query functions.
 *
 * Platform-agnostic Supabase queries for analytics data.
 * Accepts any Supabase client (browser, server, or mobile singleton).
 *
 * Used by:
 * - apps/web/hooks/use-analytics.ts
 * - apps/mobile/hooks/use-analytics.ts
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AnalyticsSummary, MonthlyTrend, CategoryWaste } from '../types/analytics.js';
import { calculateWasteRate, calculateStreakWeeks } from '../utils/analytics.js';

// ---------------------------------------------------------------------------
// Internal row shapes (avoids `any` casts — Supabase select returns unknown
// for joined relations, so we cast once here)
// ---------------------------------------------------------------------------

interface InventoryRow {
  id: string;
  discard_reason: string | null;
  discarded_at: string | null;
  added_at: string;
  category_id: string | null;
  categories: { name: string; emoji: string } | null;
}

interface GroceryRow {
  completed_at: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** ISO date string for N months ago. */
function monthsAgo(n: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() - n);
  return date.toISOString();
}

/**
 * Build monthly trends from raw inventory rows.
 * Shared by fetchAnalyticsSummary (for streak) and fetchMonthlyTrends.
 */
function buildTrendsFromRows(
  rows: Pick<InventoryRow, 'discard_reason' | 'discarded_at'>[],
): MonthlyTrend[] {
  const monthMap = new Map<string, { consumed: number; wasted: number }>();

  for (const item of rows) {
    const month = item.discarded_at?.substring(0, 7);
    if (!month) continue;
    const entry = monthMap.get(month) ?? { consumed: 0, wasted: 0 };
    if (item.discard_reason === 'consumed') {
      entry.consumed++;
    } else {
      entry.wasted++;
    }
    monthMap.set(month, entry);
  }

  return [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { consumed, wasted }]) => ({
      month,
      consumed,
      wasted,
      wasteRate: calculateWasteRate(consumed, wasted),
    }));
}

// ---------------------------------------------------------------------------
// Query functions
// ---------------------------------------------------------------------------

/**
 * Fetch analytics summary for a household.
 *
 * Makes 3 Supabase calls:
 * 1. Discarded inventory items (last 30 days) — consumption + waste stats
 * 2. Completed grocery items (last 30 days) — shopping trip count
 * 3. Discarded inventory items (last 6 months) — streak calculation
 */
export async function fetchAnalyticsSummary(
  supabase: SupabaseClient,
  householdId: string,
): Promise<AnalyticsSummary> {
  const since = monthsAgo(1);

  const { data: inventoryItems, error: invError } = await supabase
    .from('inventory_items')
    .select('id, discard_reason, discarded_at, added_at, category_id, categories(name, emoji)')
    .eq('household_id', householdId)
    .not('discarded_at', 'is', null)
    .gte('discarded_at', since);

  if (invError) throw invError;

  const { data: groceryItems, error: grocError } = await supabase
    .from('grocery_items')
    .select('completed_at')
    .eq('household_id', householdId)
    .not('completed_at', 'is', null)
    .gte('completed_at', since);

  if (grocError) throw grocError;

  const items = (inventoryItems ?? []) as unknown as InventoryRow[];
  const groceries = (groceryItems ?? []) as unknown as GroceryRow[];

  const consumed = items.filter((i) => i.discard_reason === 'consumed');
  const wasted = items.filter(
    (i) => i.discard_reason === 'wasted' || i.discard_reason === 'expired',
  );

  const wasteRate = calculateWasteRate(consumed.length, wasted.length);

  // Top wasted category
  const categoryMap = new Map<string, { category: string; emoji: string; count: number }>();
  for (const item of wasted) {
    const cat = item.categories?.name ?? 'uncategorized';
    const emoji = item.categories?.emoji ?? '📦';
    const existing = categoryMap.get(cat);
    if (existing) {
      existing.count++;
    } else {
      categoryMap.set(cat, { category: cat, emoji, count: 1 });
    }
  }
  const topWastedCategory = categoryMap.size > 0
    ? [...categoryMap.values()].sort((a, b) => b.count - a.count)[0]
    : null;

  // Shopping trips (distinct dates)
  const tripDates = new Set(
    groceries.map((g) => g.completed_at?.split('T')[0]).filter(Boolean),
  );

  // Average shelf life
  let avgShelfLifeDays: number | null = null;
  if (consumed.length > 0) {
    const totalDays = consumed.reduce((sum, item) => {
      const added = new Date(item.added_at).getTime();
      const discarded = new Date(item.discarded_at!).getTime();
      return sum + (discarded - added) / (1000 * 60 * 60 * 24);
    }, 0);
    avgShelfLifeDays = Math.round((totalDays / consumed.length) * 10) / 10;
  }

  // Streak from 6-month trend data
  const trendSince = monthsAgo(6);
  const { data: trendData } = await supabase
    .from('inventory_items')
    .select('discard_reason, discarded_at')
    .eq('household_id', householdId)
    .not('discarded_at', 'is', null)
    .gte('discarded_at', trendSince);

  const trendRows = (trendData ?? []) as unknown as Pick<InventoryRow, 'discard_reason' | 'discarded_at'>[];
  const trends = buildTrendsFromRows(trendRows);

  return {
    wasteRate,
    itemsConsumed: consumed.length,
    itemsWasted: wasted.length,
    topWastedCategory,
    shoppingTrips: tripDates.size,
    avgShelfLifeDays,
    streakWeeks: calculateStreakWeeks(trends),
  };
}

/**
 * Fetch monthly consumption/waste trends.
 */
export async function fetchMonthlyTrends(
  supabase: SupabaseClient,
  householdId: string,
  months: number = 6,
): Promise<MonthlyTrend[]> {
  const since = monthsAgo(months);

  const { data, error } = await supabase
    .from('inventory_items')
    .select('discard_reason, discarded_at')
    .eq('household_id', householdId)
    .not('discarded_at', 'is', null)
    .gte('discarded_at', since);

  if (error) throw error;

  const rows = (data ?? []) as unknown as Pick<InventoryRow, 'discard_reason' | 'discarded_at'>[];
  return buildTrendsFromRows(rows);
}

/**
 * Fetch waste breakdown by category.
 */
export async function fetchCategoryWaste(
  supabase: SupabaseClient,
  householdId: string,
): Promise<CategoryWaste[]> {
  const since = monthsAgo(1);

  const { data, error } = await supabase
    .from('inventory_items')
    .select('discard_reason, categories(name, emoji)')
    .eq('household_id', householdId)
    .not('discarded_at', 'is', null)
    .in('discard_reason', ['wasted', 'expired'])
    .gte('discarded_at', since);

  if (error) throw error;

  const items = (data ?? []) as unknown as Pick<InventoryRow, 'discard_reason' | 'categories'>[];
  const categoryMap = new Map<string, CategoryWaste>();

  for (const item of items) {
    const cat = item.categories?.name ?? 'uncategorized';
    const emoji = item.categories?.emoji ?? '📦';
    const existing = categoryMap.get(cat);
    if (existing) {
      existing.count++;
    } else {
      categoryMap.set(cat, { category: cat, emoji, count: 1 });
    }
  }

  return [...categoryMap.values()].sort((a, b) => b.count - a.count);
}
