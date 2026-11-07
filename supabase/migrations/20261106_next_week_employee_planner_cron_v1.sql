-- Independent uninterrupted next-week planning refresh every six hours.
-- Reuses ONLY the existing isolated shift-service wake secret from Vault.
-- It does NOT authorize shifts, original jobs, installations or releases.
select cron.schedule(
 'reality-next-week-employee-planning-v1',
 '23 */6 * * *',
 $reality_week$
 select net.http_post(
  url := 'https://hvkfreoagbrphwghjajw.supabase.co/functions/v1/reality-next-week-employee-planning-v1',
  headers := jsonb_build_object(
    'Authorization','Bearer '||(
     select decrypted_secret from vault.decrypted_secrets
     where name='reality_employee_shift_worker_token_v1'
    ),
    'Content-Type','application/json'
  ),
  body := '{}'::jsonb,
  timeout_milliseconds := 15000
 );
 $reality_week$
);