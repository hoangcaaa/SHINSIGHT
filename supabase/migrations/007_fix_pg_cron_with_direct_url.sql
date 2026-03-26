-- Fix pg_cron: use direct URL instead of app.settings (which may not be configured)
-- Enable pg_net for HTTP calls from SQL
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Drop old schedule if exists
SELECT cron.unschedule('settle-due-calls');

-- Re-create with hardcoded Supabase URL
SELECT cron.schedule(
  'settle-due-calls',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://zutqtdkarfnkokmmvsqr.supabase.co/functions/v1/settle-call',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1dHF0ZGthcmZua29rbW12c3FyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzMxMjY0MywiZXhwIjoyMDg4ODg4NjQzfQ.UZdTdGVUcrCcFb_ngfNWosYdnfKiFjWJtITzh7GTL8Y"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
