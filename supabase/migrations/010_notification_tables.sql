-- ============================================================================
-- Migration 010: Notification Tables
-- Creates: notification_preferences, push_subscriptions, notification_log, system_logs
-- See: docs/architecture.md → Notification Tables
-- ============================================================================

-- ---------------------------------------------------------------------------
-- notification_preferences: Per-user, per-household notification settings
-- ---------------------------------------------------------------------------
CREATE TABLE public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  halfway_enabled boolean NOT NULL DEFAULT true,
  two_day_enabled boolean NOT NULL DEFAULT true,
  one_day_enabled boolean NOT NULL DEFAULT true,
  day_of_enabled boolean NOT NULL DEFAULT true,
  post_expiration_enabled boolean NOT NULL DEFAULT true,
  quiet_hours_start time,
  quiet_hours_end time,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, household_id)
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification preferences"
  ON public.notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences"
  ON public.notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
  ON public.notification_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notification preferences"
  ON public.notification_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- push_subscriptions: FCM tokens and Web Push endpoints per device
-- ---------------------------------------------------------------------------
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  platform text NOT NULL,
  token text NOT NULL,
  keys jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (platform IN ('android', 'web'))
);

CREATE UNIQUE INDEX push_subscriptions_token_unique
  ON public.push_subscriptions(user_id, household_id, token);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own push subscriptions"
  ON public.push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push subscriptions"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push subscriptions"
  ON public.push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own push subscriptions"
  ON public.push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- notification_log: Tracks sent notifications (deduplication)
-- ---------------------------------------------------------------------------
CREATE TABLE public.notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  type text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  CHECK (type IN ('halfway', 'two_day', 'one_day', 'day_of', 'expired'))
);

CREATE INDEX notification_log_item_type_idx
  ON public.notification_log(inventory_item_id, type);

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can view notification log"
  ON public.notification_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.household_members hm
      WHERE hm.household_id = notification_log.household_id
        AND hm.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- system_logs: Cron run history and system events (observability)
-- ---------------------------------------------------------------------------
CREATE TABLE public.system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event text NOT NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Auto-update updated_at on notification_preferences
-- ---------------------------------------------------------------------------
CREATE TRIGGER notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
