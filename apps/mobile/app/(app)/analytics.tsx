/**
 * Analytics dashboard screen.
 *
 * Two tabs:
 * - "At a Glance" — stat cards with summary metrics
 * - "Charts" — Victory Native line/bar charts
 *
 * Matches Stitch-generated "Heirloom Pantry" design.
 */
import React, { useState } from 'react'
import { View, ScrollView, StyleSheet, Dimensions } from 'react-native'
import {
  Text,
  SegmentedButtons,
  ActivityIndicator,
  useTheme,
} from 'react-native-paper'
import { useAuth } from '../../contexts/AuthContext'
import {
  useAnalyticsSummary,
  useMonthlyTrends,
  useCategoryWaste,
} from '../../hooks/use-analytics'
import {
  formatWasteRate,
  formatShelfLife,
} from '@fridge-manager/shared'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const CARD_WIDTH = (SCREEN_WIDTH - 24 * 2 - 12) / 2

// ---------------------------------------------------------------------------
// Stat card config
// ---------------------------------------------------------------------------

type StatCard = {
  emoji: string
  label: string
  getValue: (s: any) => string
  getSubtitle: (s: any) => string
  color?: string
}

const STAT_CARDS: StatCard[] = [
  {
    emoji: '📊',
    label: 'WASTE RATE',
    getValue: (s) => formatWasteRate(s.wasteRate).replace('%', ''),
    getSubtitle: () => 'of items wasted',
    color: undefined, // uses primary
  },
  {
    emoji: '🍽️',
    label: 'CONSUMED',
    getValue: (s) => String(s.itemsConsumed),
    getSubtitle: () => 'items used',
  },
  {
    emoji: '🗑️',
    label: 'WASTED',
    getValue: (s) => String(s.itemsWasted),
    getSubtitle: () => 'items wasted',
    color: '#EF4444',
  },
  {
    emoji: '🏆',
    label: 'TOP WASTED',
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
    label: 'TRIPS',
    getValue: (s) => String(s.shoppingTrips),
    getSubtitle: () => 'this month',
  },
  {
    emoji: '⏱️',
    label: 'AVG LIFE',
    getValue: (s) => {
      if (s.avgShelfLifeDays === null) return '—'
      return formatShelfLife(s.avgShelfLifeDays)
    },
    getSubtitle: () => 'avg shelf life',
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AnalyticsScreen() {
  const theme = useTheme()
  const { householdId } = useAuth()
  const [activeTab, setActiveTab] = useState('glance')

  const { data: summary, isLoading } = useAnalyticsSummary(householdId)
  const { data: trends } = useMonthlyTrends(householdId)
  const { data: categoryWaste } = useCategoryWaste(householdId)

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          styles.center,
          { backgroundColor: theme.colors.background },
        ]}
        testID="loading-indicator"
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    )
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Analytics
        </Text>
        <Text
          variant="bodyMedium"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          Your food insights this month
        </Text>
      </View>

      {/* Tab selector */}
      <SegmentedButtons
        value={activeTab}
        onValueChange={setActiveTab}
        buttons={[
          { value: 'glance', label: 'At a Glance', testID: 'at-a-glance-tab' },
          { value: 'charts', label: 'Charts', testID: 'charts-tab' },
        ]}
        style={styles.tabs}
      />

      {activeTab === 'glance' ? (
        <GlanceTab summary={summary} theme={theme} />
      ) : (
        <ChartsTab
          categoryWaste={categoryWaste ?? []}
          trends={trends ?? []}
          theme={theme}
        />
      )}
    </ScrollView>
  )
}

// ---------------------------------------------------------------------------
// At a Glance tab
// ---------------------------------------------------------------------------

function GlanceTab({ summary, theme }: { summary: any; theme: any }) {
  if (!summary) {
    return (
      <View style={styles.empty}>
        <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
          No data yet — start tracking inventory!
        </Text>
      </View>
    )
  }

  return (
    <View>
      {/* Streak banner */}
      {summary.streakWeeks > 0 && (
        <View
          style={[styles.streakBanner, { backgroundColor: theme.colors.primary }]}
        >
          <Text style={styles.streakText}>
            🔥 {summary.streakWeeks} week{summary.streakWeeks === 1 ? '' : 's'} with
            less than 10% waste — keep it up!
          </Text>
        </View>
      )}

      {/* Stat cards grid */}
      <View style={styles.grid}>
        {STAT_CARDS.map((card) => (
          <View
            key={card.label}
            style={[styles.statCard, { backgroundColor: theme.colors.surface }]}
          >
            <Text style={styles.cardEmoji}>{card.emoji}</Text>
            <Text
              variant="headlineMedium"
              style={[
                styles.cardValue,
                { color: card.color ?? theme.colors.onSurface },
              ]}
            >
              {card.getValue(summary)}
              {card.label === 'WASTE RATE' && (
                <Text style={{ fontSize: 18, color: theme.colors.primary }}>%</Text>
              )}
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {card.getSubtitle(summary)}
            </Text>
            <Text
              variant="labelSmall"
              style={[styles.cardLabel, { color: theme.colors.onSurfaceVariant }]}
            >
              {card.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Charts tab
// ---------------------------------------------------------------------------

function ChartsTab({
  categoryWaste,
  trends,
  theme,
}: {
  categoryWaste: any[]
  trends: any[]
  theme: any
}) {
  const maxCount = Math.max(...categoryWaste.map((c) => c.count), 1)

  return (
    <View>
      {/* Waste by Category — horizontal bar chart */}
      <View style={styles.chartSection}>
        <Text variant="titleMedium" style={styles.chartTitle}>
          Waste by Category
        </Text>
        {categoryWaste.length === 0 ? (
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            No wasted items this month
          </Text>
        ) : (
          categoryWaste.slice(0, 5).map((cat) => (
            <View key={cat.category} style={styles.barRow}>
              <Text style={styles.barEmoji}>{cat.emoji}</Text>
              <Text
                variant="bodyMedium"
                style={styles.barLabel}
                numberOfLines={1}
              >
                {cat.category}
              </Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${(cat.count / maxCount) * 100}%`,
                      backgroundColor: theme.colors.primary,
                    },
                  ]}
                />
              </View>
              <Text variant="labelMedium" style={styles.barCount}>
                {cat.count}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Monthly Trends — simple trend display */}
      <View style={styles.chartSection}>
        <Text variant="titleMedium" style={styles.chartTitle}>
          Monthly Trend
        </Text>
        {trends.length === 0 ? (
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            Not enough data yet
          </Text>
        ) : (
          trends.map((t) => (
            <View key={t.month} style={styles.trendRow}>
              <Text
                variant="bodySmall"
                style={[styles.trendMonth, { color: theme.colors.onSurfaceVariant }]}
              >
                {formatMonth(t.month)}
              </Text>
              <View style={styles.trendBarContainer}>
                <View
                  style={[
                    styles.trendBarConsumed,
                    {
                      flex: t.consumed,
                      backgroundColor: theme.colors.primary,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.trendBarWasted,
                    {
                      flex: t.wasted || 0.01,
                      backgroundColor: '#EF4444',
                    },
                  ]}
                />
              </View>
              <Text variant="labelSmall" style={styles.trendRate}>
                {formatWasteRate(t.wasteRate)}
              </Text>
            </View>
          ))
        )}
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMonth(iso: string): string {
  const [year, month] = iso.split('-')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return months[parseInt(month, 10) - 1] ?? iso
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 24,
    paddingBottom: 48,
  },
  header: {
    marginBottom: 20,
    gap: 4,
  },
  title: {
    fontWeight: 'bold',
  },
  tabs: {
    marginBottom: 20,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  // Streak banner
  streakBanner: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  streakText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  // Stat cards
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: CARD_WIDTH,
    borderRadius: 16,
    padding: 16,
    gap: 2,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  cardValue: {
    fontWeight: 'bold',
    fontSize: 28,
    lineHeight: 34,
  },
  cardLabel: {
    marginTop: 4,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontSize: 10,
  },
  // Charts — bar chart
  chartSection: {
    marginBottom: 28,
  },
  chartTitle: {
    fontWeight: '600',
    marginBottom: 16,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  barEmoji: {
    fontSize: 18,
    width: 28,
    textAlign: 'center',
  },
  barLabel: {
    width: 72,
    marginLeft: 6,
    textTransform: 'capitalize',
  },
  barTrack: {
    flex: 1,
    height: 20,
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 10,
  },
  barCount: {
    width: 24,
    textAlign: 'right',
  },
  // Charts — trend
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  trendMonth: {
    width: 32,
    fontSize: 11,
  },
  trendBarContainer: {
    flex: 1,
    flexDirection: 'row',
    height: 16,
    borderRadius: 8,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  trendBarConsumed: {
    height: '100%',
  },
  trendBarWasted: {
    height: '100%',
  },
  trendRate: {
    width: 36,
    textAlign: 'right',
    fontSize: 11,
  },
})
