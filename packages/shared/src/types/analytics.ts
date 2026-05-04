/**
 * Analytics types.
 *
 * All analytics are derived from inventory_items and grocery_items.
 * No price tracking in MVP — track by item count.
 */

/** Summary stats for the "At a Glance" tab. */
export interface AnalyticsSummary {
  /** Waste rate as 0–100 percentage. */
  wasteRate: number;
  /** Total items consumed (discard_reason = 'consumed'). */
  itemsConsumed: number;
  /** Total items wasted (discard_reason = 'wasted' | 'expired'). */
  itemsWasted: number;
  /** Category with the most wasted items, or null if none. */
  topWastedCategory: CategoryWaste | null;
  /** Number of distinct shopping trips (grocery checkout dates). */
  shoppingTrips: number;
  /** Average days from added_at to discarded_at for consumed items. */
  avgShelfLifeDays: number | null;
  /** Consecutive weeks with waste rate < 10%. */
  streakWeeks: number;
}

/** Monthly waste/consumption trend for line charts. */
export interface MonthlyTrend {
  /** ISO month string, e.g. "2026-01". */
  month: string;
  /** Items consumed that month. */
  consumed: number;
  /** Items wasted that month. */
  wasted: number;
  /** Waste rate for that month (0–100). */
  wasteRate: number;
}

/** Per-category waste count for bar charts. */
export interface CategoryWaste {
  /** Category name, e.g. "dairy". */
  category: string;
  /** Category emoji, e.g. "🧀". */
  emoji: string;
  /** Number of items wasted in this category. */
  count: number;
}
