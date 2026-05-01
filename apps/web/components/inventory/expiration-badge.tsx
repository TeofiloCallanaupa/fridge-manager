'use client'

import { getExpirationColor } from '@fridge-manager/shared'
import { Badge } from '@/components/ui/badge'

type ExpirationBadgeProps = {
  expirationDate: string | null // ISO date string from Supabase
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Color-coded expiration badge.
 * green  = >3 days remaining
 * yellow = 1-3 days remaining
 * red    = expired or expiring today
 * null   = no badge (no expiration)
 */
export function ExpirationBadge({ expirationDate }: ExpirationBadgeProps) {
  if (!expirationDate) return null

  const expDate = new Date(expirationDate)
  const color = getExpirationColor(expDate)
  if (color === null) return null

  const now = new Date()
  const diffMs = expDate.getTime() - now.getTime()
  const daysRemaining = Math.ceil(diffMs / MS_PER_DAY)

  const label = daysRemaining <= 0
    ? daysRemaining === 0
      ? 'Expires today'
      : `Expired ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? '' : 's'} ago`
    : `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left`

  const colorStyles: Record<string, string> = {
    green: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    yellow: 'bg-amber-100 text-amber-800 border-amber-200',
    red: 'bg-red-100 text-red-800 border-red-200',
  }

  return (
    <Badge
      variant="outline"
      className={`text-xs font-medium ${colorStyles[color]}`}
      aria-label={`Expiration: ${label}`}
    >
      {label}
    </Badge>
  )
}
