'use client'

/**
 * Analytics Dashboard — client component.
 *
 * Two tabs:
 * - "At a Glance" — stat cards with summary metrics
 * - "Charts" — Recharts bar/area charts
 *
 * Matches the "Heirloom Pantry" design system.
 */
import React, { useState } from 'react'
import {
  useAnalyticsSummary,
  useMonthlyTrends,
  useCategoryWaste,
} from '@/hooks/use-analytics'
import {
  formatWasteRate,
  formatShelfLife,
  type AnalyticsSummary,
  type MonthlyTrend,
  type CategoryWaste,
} from '@fridge-manager/shared'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

// ---------------------------------------------------------------------------
// Stat card config
// ---------------------------------------------------------------------------

interface StatCardConfig {
  emoji: string
  label: string
  getValue: (s: AnalyticsSummary) => string
  getSubtitle: (s: AnalyticsSummary) => string
  color?: string
}

const STAT_CARDS: StatCardConfig[] = [
  {
    emoji: '📊',
    label: 'Waste Rate',
    getValue: (s) => formatWasteRate(s.wasteRate),
    getSubtitle: () => 'of items wasted',
  },
  {
    emoji: '🍽️',
    label: 'Consumed',
    getValue: (s) => String(s.itemsConsumed),
    getSubtitle: () => 'items used',
  },
  {
    emoji: '🗑️',
    label: 'Wasted',
    getValue: (s) => String(s.itemsWasted),
    getSubtitle: () => 'items wasted',
    color: 'var(--color-error)',
  },
  {
    emoji: '🏆',
    label: 'Top Wasted',
    getValue: (s) =>
      s.topWastedCategory
        ? s.topWastedCategory.category.charAt(0).toUpperCase() +
          s.topWastedCategory.category.slice(1)
        : '—',
    getSubtitle: (s) =>
      s.topWastedCategory
        ? `${s.topWastedCategory.count} items expired`
        : 'No waste yet!',
  },
  {
    emoji: '🛒',
    label: 'Trips',
    getValue: (s) => String(s.shoppingTrips),
    getSubtitle: () => 'this month',
  },
  {
    emoji: '⏱️',
    label: 'Avg Life',
    getValue: (s) =>
      s.avgShelfLifeDays !== null ? formatShelfLife(s.avgShelfLifeDays) : '—',
    getSubtitle: () => 'avg shelf life',
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  householdId: string
  userId: string
}

export function AnalyticsDashboard({ householdId }: Props) {
  const [activeTab, setActiveTab] = useState<'glance' | 'charts'>('glance')

  const { data: summary, isLoading } = useAnalyticsSummary(householdId)
  const { data: trends } = useMonthlyTrends(householdId)
  const { data: categoryWaste } = useCategoryWaste(householdId)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="px-6 py-4 border-b border-outline-variant/30 flex justify-between items-center">
        <h1 className="text-xl font-medium text-on-surface">Fridge Manager</h1>
        <a
          href="/grocery"
          className="text-sm text-on-surface-variant hover:text-on-surface transition-colors"
        >
          ← Back
        </a>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Page header */}
        <div className="mb-6">
          <h2 className="text-3xl font-light text-on-surface tracking-tight">
            Analytics
          </h2>
          <p className="text-on-surface-variant mt-1">
            Your food insights this month
          </p>
        </div>

        {/* Tab selector */}
        <div className="flex gap-2 mb-8" role="tablist" data-testid="tab-selector">
          <button
            role="tab"
            aria-selected={activeTab === 'glance'}
            data-testid="tab-glance"
            onClick={() => setActiveTab('glance')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'glance'
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            At a Glance
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'charts'}
            data-testid="tab-charts"
            onClick={() => setActiveTab('charts')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'charts'
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            Charts
          </button>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20" data-testid="loading-indicator">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Content */}
        {!isLoading && activeTab === 'glance' && (
          <GlanceTab summary={summary ?? null} />
        )}
        {!isLoading && activeTab === 'charts' && (
          <ChartsTab
            categoryWaste={categoryWaste ?? []}
            trends={trends ?? []}
          />
        )}
      </main>
    </div>
  )
}

// ---------------------------------------------------------------------------
// At a Glance tab
// ---------------------------------------------------------------------------

function GlanceTab({ summary }: { summary: AnalyticsSummary | null }) {
  if (!summary) {
    return (
      <div className="text-center py-16 text-on-surface-variant" data-testid="empty-state">
        No data yet — start tracking inventory!
      </div>
    )
  }

  return (
    <div>
      {/* Streak banner */}
      {summary.streakWeeks > 0 && (
        <div
          className="rounded-2xl p-4 mb-6 forest-gradient text-on-primary"
          data-testid="streak-banner"
        >
          <p className="font-semibold">
            🔥 {summary.streakWeeks} week{summary.streakWeeks === 1 ? '' : 's'}{' '}
            with less than 10% waste — keep it up!
          </p>
        </div>
      )}

      {/* Stat cards grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4" data-testid="stat-cards">
        {STAT_CARDS.map((card) => (
          <div
            key={card.label}
            className="bg-card rounded-2xl p-5 soft-shadow flex flex-col gap-1"
            data-testid={`stat-${card.label.toLowerCase().replace(/\s/g, '-')}`}
          >
            <span className="text-xl">{card.emoji}</span>
            <span
              className="text-2xl font-bold mt-1"
              style={{ color: card.color }}
            >
              {card.getValue(summary)}
            </span>
            <span className="text-xs text-on-surface-variant">
              {card.getSubtitle(summary)}
            </span>
            <span className="text-[10px] text-on-surface-variant uppercase tracking-widest mt-1">
              {card.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Charts tab
// ---------------------------------------------------------------------------

function ChartsTab({
  categoryWaste,
  trends,
}: {
  categoryWaste: CategoryWaste[]
  trends: MonthlyTrend[]
}) {
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  const trendChartData = trends.map((t) => {
    const [, monthNum] = t.month.split('-')
    return {
      name: MONTHS[parseInt(monthNum, 10) - 1] ?? t.month,
      consumed: t.consumed,
      wasted: t.wasted,
    }
  })

  const categoryChartData = categoryWaste.slice(0, 6).map((c) => ({
    name: `${c.emoji} ${c.category}`,
    count: c.count,
  }))

  return (
    <div className="flex flex-col gap-10">
      {/* Monthly Trend */}
      <section data-testid="trends-chart">
        <h3 className="text-lg font-semibold text-on-surface mb-4">Monthly Trend</h3>
        {trends.length === 0 ? (
          <p className="text-on-surface-variant">Not enough data yet</p>
        ) : (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendChartData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--color-on-surface-variant)' }} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--color-on-surface-variant)' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-surface-container)',
                    border: '1px solid var(--color-outline-variant)',
                    borderRadius: '12px',
                    fontSize: '13px',
                  }}
                />
                <Legend />
                <Bar dataKey="consumed" name="Consumed" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="wasted" name="Wasted" fill="var(--color-error)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Waste by Category */}
      <section data-testid="category-chart">
        <h3 className="text-lg font-semibold text-on-surface mb-4">Waste by Category</h3>
        {categoryWaste.length === 0 ? (
          <p className="text-on-surface-variant">No wasted items this month</p>
        ) : (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChartData} layout="vertical" barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" opacity={0.3} />
                <XAxis type="number" tick={{ fontSize: 12, fill: 'var(--color-on-surface-variant)' }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={120}
                  tick={{ fontSize: 12, fill: 'var(--color-on-surface-variant)' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-surface-container)',
                    border: '1px solid var(--color-outline-variant)',
                    borderRadius: '12px',
                    fontSize: '13px',
                  }}
                />
                <Bar dataKey="count" name="Items wasted" fill="var(--color-primary)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  )
}
