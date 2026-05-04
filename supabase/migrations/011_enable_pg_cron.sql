-- ============================================================================
-- Migration 011: Enable pg_cron and schedule notification check
-- Triggers the check-expiration-notifications Edge Function daily at 1pm UTC (9am ET)
-- ============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant pg_net usage to postgres role (required for http calls)
GRANT USAGE ON SCHEMA extensions TO postgres;

-- Schedule daily notification check at 1pm UTC (9am ET)
-- Uses pg_net to call the Edge Function via HTTP POST
-- NOTE: Replace <SUPABASE_URL> and <ANON_KEY> with actual values in the applied migration
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
