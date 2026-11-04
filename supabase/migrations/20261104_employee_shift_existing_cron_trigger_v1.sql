-- Preview-only shift wake: reuse the existing pg_cron + pg_net transport.
-- No owner shift or original job is authorized by installing this schedule.
-- The worker checks owner-scoped durable queue state and exact claim fences.
select cron.schedule(
 'reality-governed-employee-shift-wake-v1',
 '* * * * *',
 $wake$
 select net.http_post(
  url := 'https://hvkfreoagbrphwghjajw.supabase.co/functions/v1/reality-governed-employee-shift-wake-v1',
  headers := jsonb_build_object(
   'Authorization','Bearer '||(
      select decrypted_secret from vault.decrypted_secrets
      where name='reality_employee_shift_worker_token_v1'),
   'Content-Type','application/json'),
  body := '{}'::jsonb,
  timeout_milliseconds := 15000);
 $wake$
);
