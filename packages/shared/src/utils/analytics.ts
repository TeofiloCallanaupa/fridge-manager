/**
 * Analytics utility functions.
 *
 * Pure functions for calculating and formatting analytics data.
 * No Supabase dependency — these transform raw data into display values.
 *
 * @see docs/architecture.md "Analytics & Insights" section
 */

import type { MonthlyTrend } from '../types/analytics.js';

/** Waste rate threshold for "low waste" streak (10%). */
const STREAK_THRESHOLD = 10;

/** Approximate weeks per month for streak calculation. */
const WEEKS_PER_MONTH = 4;

// ---------------------------------------------------------------------------
// Calculations
// ---------------------------------------------------------------------------

/**
 * Calculate waste rate as a percentage.
 *
 * @param consumed - Number of items consumed
 * @param wasted - Number of items wasted (includes 'wasted' + 'expired')
 * @returns Waste rate as 0–100 percentage
 */
export function calculateWasteRate(consumed: number, wasted: number): number {
  const total = consumed + wasted;
  if (total === 0) return 0;
  return (wasted / total) * 100;
}

/**
 * Calculate consecutive low-waste weeks from the most recent month backwards.
 *
 * A "low waste" month has a waste rate < 10%.
 * Approximates 4 weeks per month.
 *
 * @param trends - Monthly trends ordered chronologically (oldest first)
 * @returns Number of consecutive low-waste weeks
 */
export function calculateStreakWeeks(trends: MonthlyTrend[]): number {
  if (trends.length === 0) return 0;

  let consecutiveMonths = 0;

  // Walk backwards from most recent month
  for (let i = trends.length - 1; i >= 0; i--) {
    if (trends[i].wasteRate < STREAK_THRESHOLD) {
      consecutiveMonths++;
    } else {
      break;
    }
  }

  return consecutiveMonths * WEEKS_PER_MONTH;
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/**
 * Format a waste rate for display.
 *
 * @param rate - Waste rate as 0–100
 * @returns Formatted string, e.g. "14.5%" or "0%"
 */
export function formatWasteRate(rate: number): string {
  // Round to 1 decimal, drop trailing .0
  const rounded = Math.round(rate * 10) / 10;
  const formatted = rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1);
  return `${formatted}%`;
}

/**
 * Format average shelf life in days.
 *
 * @param days - Average shelf life in days, or null
 * @returns Formatted string, e.g. "4.2 days" or "—"
 */
export function formatShelfLife(days: number | null): string {
  if (days === null) return '—';
  const rounded = Math.round(days * 10) / 10;
  const formatted = rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1);
  const unit = rounded === 1 ? 'day' : 'days';
  return `${formatted} ${unit}`;
}

/**
 * Format a stat number for compact display.
 *
 * @param n - Number to format
 * @returns Formatted string, e.g. "47", "1.2k", "2k"
 */
export function formatStatNumber(n: number): string {
  if (n < 1000) return String(n);
  const k = n / 1000;
  const formatted = k % 1 === 0 ? k.toFixed(0) : k.toFixed(1);
  return `${formatted}k`;
}
