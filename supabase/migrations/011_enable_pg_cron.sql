-- ============================================================================
-- Migration 011: Enable pg_cron and schedule notification check
-- Triggers the check-expiration-notifications Edge Function daily at 1pm UTC (9am ET)
--
-- ⚠️  DEPLOYMENT NOTE:
--   Before applying to production, replace the two placeholders below:
--     1. <SUPABASE_URL>  → your project URL (e.g. https://abc123.supabase.co)
--     2. <ANON_KEY>      → your project's anon/public key
--   These values are in: Supabase Dashboard → Settings → API
--   DO NOT commit real keys to this file — apply manually via SQL Editor.
-- ============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant pg_net usage to postgres role (required for http calls)
GRANT USAGE ON SCHEMA extensions TO postgres;

-- Schedule daily notification check at 1pm UTC (9am ET)
-- Uses pg_net to call the Edge Function via HTTP POST
SELECT cron.schedule(
  'daily-expiration-check',     -- job name
  '0 13 * * *',                 -- cron expression: 1pm UTC daily
  $$
  SELECT net.http_post(
    url := '<SUPABASE_URL>/functions/v1/check-expiration-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <ANON_KEY>'
    ),
    body := '{}'::jsonb
  );
  $$
);
