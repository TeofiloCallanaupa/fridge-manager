/**
 * Formatting utilities for dates, times, and quantities.
 */

/**
 * Formats a timestamp as a human-readable relative time string.
 *
 * Examples:
 *   "just now"     (< 1 minute ago)
 *   "2 minutes ago"
 *   "2 hours ago"
 *   "yesterday"
 *   "3 days ago"
 *   "2 weeks ago"
 */
export function formatRelativeTime(timestamp: Date): string {
  const now = Date.now();
  const diffMs = now - timestamp.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  if (diffDays === 1) return 'yesterday';
  return `${diffDays} days ago`;
}

/**
 * Formats a quantity for display.
 * Returns the quantity string as-is, or empty string if null.
 */
export function formatQuantity(quantity: string | null): string {
  return quantity ?? '';
}
