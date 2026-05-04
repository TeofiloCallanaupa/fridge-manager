/**
 * TDD Red Phase — Tests for analytics utility functions.
 *
 * These pure functions handle waste rate calculation, streak tracking,
 * and formatting for the analytics dashboard.
 */
import {
  calculateWasteRate,
  calculateStreakWeeks,
  formatWasteRate,
  formatShelfLife,
  formatStatNumber,
} from '../analytics.js';
import type { MonthlyTrend } from '../../types/analytics.js';

// ---------------------------------------------------------------------------
// calculateWasteRate
// ---------------------------------------------------------------------------

describe('calculateWasteRate', () => {
  it('calculates correct waste rate', () => {
    // 8 wasted out of 55 total discarded (47 consumed + 8 wasted) = 14.5%
    expect(calculateWasteRate(47, 8)).toBeCloseTo(14.5, 1);
  });

  it('returns 0 when no items discarded', () => {
    expect(calculateWasteRate(0, 0)).toBe(0);
  });

  it('returns 100 when all items are wasted', () => {
    expect(calculateWasteRate(0, 10)).toBe(100);
  });

  it('returns 0 when no items wasted', () => {
    expect(calculateWasteRate(25, 0)).toBe(0);
  });

  it('handles large numbers', () => {
    expect(calculateWasteRate(900, 100)).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// calculateStreakWeeks
// ---------------------------------------------------------------------------

describe('calculateStreakWeeks', () => {
  it('counts consecutive low-waste months from most recent', () => {
    const trends: MonthlyTrend[] = [
      { month: '2026-01', consumed: 40, wasted: 15, wasteRate: 27.3 }, // high
      { month: '2026-02', consumed: 50, wasted: 3, wasteRate: 5.7 },  // low ✓
      { month: '2026-03', consumed: 45, wasted: 2, wasteRate: 4.3 },  // low ✓
      { month: '2026-04', consumed: 48, wasted: 4, wasteRate: 7.7 },  // low ✓
    ];
    // 3 consecutive low-waste months (Feb, Mar, Apr)
    // Approximate as 4 weeks per month = 12 weeks
    expect(calculateStreakWeeks(trends)).toBe(12);
  });

  it('resets on high-waste month', () => {
    const trends: MonthlyTrend[] = [
      { month: '2026-01', consumed: 50, wasted: 3, wasteRate: 5.7 },  // low
      { month: '2026-02', consumed: 40, wasted: 15, wasteRate: 27.3 }, // HIGH — breaks
      { month: '2026-03', consumed: 45, wasted: 2, wasteRate: 4.3 },  // low ✓
      { month: '2026-04', consumed: 48, wasted: 4, wasteRate: 7.7 },  // low ✓
    ];
    // Only Mar + Apr are consecutive from the end = 8 weeks
    expect(calculateStreakWeeks(trends)).toBe(8);
  });

  it('returns 0 when most recent month is high-waste', () => {
    const trends: MonthlyTrend[] = [
      { month: '2026-01', consumed: 50, wasted: 3, wasteRate: 5.7 },
      { month: '2026-02', consumed: 40, wasted: 15, wasteRate: 27.3 },
    ];
    expect(calculateStreakWeeks(trends)).toBe(0);
  });

  it('returns 0 for empty trends', () => {
    expect(calculateStreakWeeks([])).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// formatWasteRate
// ---------------------------------------------------------------------------

describe('formatWasteRate', () => {
  it('formats integer rate', () => {
    expect(formatWasteRate(10)).toBe('10%');
  });

  it('rounds to one decimal', () => {
    expect(formatWasteRate(14.55)).toBe('14.6%');
  });

  it('drops decimal for whole numbers', () => {
    expect(formatWasteRate(0)).toBe('0%');
  });
});

// ---------------------------------------------------------------------------
// formatShelfLife
// ---------------------------------------------------------------------------

describe('formatShelfLife', () => {
  it('formats days with one decimal', () => {
    expect(formatShelfLife(4.2)).toBe('4.2 days');
  });

  it('formats whole number', () => {
    expect(formatShelfLife(7)).toBe('7 days');
  });

  it('formats 1 day as singular', () => {
    expect(formatShelfLife(1)).toBe('1 day');
  });

  it('returns "—" for null', () => {
    expect(formatShelfLife(null)).toBe('—');
  });
});

// ---------------------------------------------------------------------------
// formatStatNumber
// ---------------------------------------------------------------------------

describe('formatStatNumber', () => {
  it('returns plain number for < 1000', () => {
    expect(formatStatNumber(47)).toBe('47');
  });

  it('formats thousands with k', () => {
    expect(formatStatNumber(1200)).toBe('1.2k');
  });

  it('formats exact thousands', () => {
    expect(formatStatNumber(2000)).toBe('2k');
  });

  it('returns 0 for zero', () => {
    expect(formatStatNumber(0)).toBe('0');
  });
});
