-- Riley's isolated original executor is separate from the existing 1/minute
-- read-only employee source-checking wake. This job only NOTIFIES the
-- protected Vercel PREVIEW worker when an already-authorized owner shift
-- awaits original work. It never authorizes jobs, installs, or settlements.
--
-- Credentials are read only from Supabase Vault at invocation time.
-- Missing/revoked credentials cause zero HTTP requests (fail closed).
-- The Vercel automation bypass is project-wide and must be explicitly
-- approved and stored as a separate Vault secret before this job can deliver.
-- The application then performs independent source/goal/owner checks and
-- a global single-use DB claim; notification is not a completed job.
select cron.schedule(
 'reality-riley-preview-original-execution-wake-v1',
 '* * * * *',
 $riley_preview_wake$
 with credential as (
  select
   max(decrypted_secret) filter (
    where name='reality_riley_preview_worker_token_20261107') as worker_token,
   max(decrypted_secret) filter (
    where name='reality_riley_preview_vercel_bypass_20261107') as vercel_bypass
  from vault.decrypted_secrets
  where name in (
   'reality_riley_preview_worker_token_20261107',
   'reality_riley_preview_vercel_bypass_20261107'
  )
 ),
 eligible_shift as (
  select exists (
   select 1
   from reality_internal.governed_employee_shifts_v1 s
   where s.status='AWAITING_EXACT_ORIGINAL_WORK'
    and s.closed_at is null
    and s.authorized_at is not null
    and s.planned_start_at<=clock_timestamp()
    and s.planned_end_at>clock_timestamp()
    and exists (
     select 1 from reality_internal.governed_employee_shift_steps_v1 step
     where step.shift_id=s.shift_id
      and step.step_index between 2 and 5
      and step.state='SOURCE_CHECKED'
      and step.source_status='OPEN_ISSUE'
      and step.proof_sha256~'^sha256:[a-f0-9]{64}$'
    )
  ) as permitted
 )
 select net.http_post(
  url := 'https://reality-git-fix-reality-gover-c8a922-maloney2323-5310s-projects.vercel.app/api/reality/governed-employee-shift-worker',
  headers := jsonb_build_object(
   'Authorization','Bearer '||credential.worker_token,
   'x-vercel-protection-bypass',credential.vercel_bypass,
   'Content-Type','application/json'
  ),
  body := '{}'::jsonb,
  timeout_milliseconds := 45000
 )
 from credential cross join eligible_shift
 where eligible_shift.permitted
  and credential.worker_token~'^[a-f0-9]{64}$'
  and credential.vercel_bypass~'^[A-Za-z0-9]{32}$';
 $riley_preview_wake$
);
