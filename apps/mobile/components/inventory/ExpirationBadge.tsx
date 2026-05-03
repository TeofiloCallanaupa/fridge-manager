import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Chip, useTheme } from 'react-native-paper'
import { getExpirationColor } from '@fridge-manager/shared'

type ExpirationBadgeProps = {
  expirationDate: string | null
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Color-coded expiration badge using React Native Paper Chip.
 *
 * Design system colors from DESIGN.md:
 * - Fresh Green (#22C55E) → >3 days remaining
 * - Amber Warning (#F59E0B) → 1-3 days remaining
 * - Coral Expired (#EF4444) → expired or today
 */
export function ExpirationBadge({ expirationDate }: ExpirationBadgeProps) {
  if (!expirationDate) return null

  const expDate = new Date(expirationDate)
  const color = getExpirationColor(expDate)
  if (color === null) return null

  const now = new Date()
  const diffMs = expDate.getTime() - now.getTime()
  const daysRemaining = Math.ceil(diffMs / MS_PER_DAY)

  const label =
    daysRemaining <= 0
      ? daysRemaining === 0
        ? 'Today'
        : `${Math.abs(daysRemaining)}d ago`
      : `${daysRemaining}d left`

  return (
    <View style={styles.container}>
      <Chip
        mode="flat"
        compact
        textStyle={[styles.chipText, { color: COLOR_MAP[color].text }]}
        style={[styles.chip, { backgroundColor: COLOR_MAP[color].bg }]}
      >
        {label}
      </Chip>
    </View>
  )
}

const COLOR_MAP = {
  green: { bg: '#DCFCE7', text: '#166534' },   // Mint Wash tint
  yellow: { bg: '#FEF3C7', text: '#92400E' },  // Amber tint
  red: { bg: '#FFDAD6', text: '#BA1A1A' },     // Error container from DESIGN.md
}

const styles = StyleSheet.create({
  container: {
    flexShrink: 0,
  },
  chip: {
    height: 28,
    borderRadius: 14,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
  },
})
