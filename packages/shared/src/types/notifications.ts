/**
 * Notification system types matching the Supabase schema.
 * See docs/architecture.md for the notification system design.
 */

export type NotificationType = 'halfway' | 'two_day' | 'one_day' | 'day_of' | 'expired';

export interface NotificationLog {
  id: string;
  inventory_item_id: string;
  household_id: string;
  type: NotificationType;
  sent_at: string;
}

export type SystemLogEvent = 'cron_run' | 'notification_sent' | 'error';

export interface SystemLog {
  id: string;
  event: SystemLogEvent;
  details: Record<string, unknown> | null;
  created_at: string;
}
