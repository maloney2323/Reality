-- The service-role owner-scoped recovery read needs schema USAGE to
-- read cron.job_run_details. The cron tables already grant SELECT to
-- service_role. Never grant the cron schema to anon/authenticated.
grant usage on schema cron to service_role;
revoke usage on schema cron from anon,authenticated;
