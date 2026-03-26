-- Enable pg_cron extension (already enabled on Supabase by default)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule settle-call Edge Function every 60 seconds
-- Uses pg_net to HTTP POST to our Edge Function
SELECT cron.schedule(
  'settle-due-calls',
  '* * * * *',  -- every minute
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/settle-call',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
