-- Switch isolated employee-source scheduling to the model-backed trusted
-- Vercel worker. The previous Edge worker was read-only and consumed source
-- checks BEFORE Riley/Taylor got a claimed step. Source work, original work
-- and independent receipt gates stay on existing owner-bound DB records.
--
-- This migration refuses to act during an active owner shift and never
-- extends authorization or mints a job. To roll back: reschedule the
-- previous 'reality-governed-employee-shift-wake-v1' from its prior migration
-- and restore the prior 'reality-riley-preview-original-execution-wake-v1'.
do $preview_switch_guard$
begin
 if current_user<>'postgres' then raise exception 'SHIFT_SCHEDULER_POSTGRES_ONLY'; end if;
 if exists (
   select 1 from reality_internal.governed_employee_shifts_v1 s
   where s.closed_at is null and
     s.status in ('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
 ) then raise exception 'SHIFT_SCHEDULER_OWNER_SHIFT_ACTIVE_NO_MIDSHIFT_SWAP'; end if;
 if (select count(*) from cron.job
     where jobname in ('reality-governed-employee-shift-wake-v1',
      'reality-riley-preview-original-execution-wake-v1') and active
      and username='postgres')<>2
 then raise exception 'SHIFT_EXPECTED_TWO_ISOLATED_SCHEDULERS_REQUIRED'; end if;
end $preview_switch_guard$;

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
   where s.status in ('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
    and s.closed_at is null
    and s.authorized_at is not null
    and s.planned_start_at<=clock_timestamp()
    and s.planned_end_at>clock_timestamp()
    and (
      -- Work-conserving, one already-authorized read-only source step.
      -- This is what lets Riley/Taylor actually receive source work.
      (s.status in ('QUEUED','RUNNING') and exists (
        select 1 from reality_internal.governed_employee_shift_steps_v1 step
        where step.shift_id=s.shift_id and step.step_index between 1 and 5
          and step.state in ('QUEUED','CLAIMED')
      ) and exists (
        select 1 from reality_internal.governed_employee_shift_steps_v1 source_step
        where source_step.shift_id=s.shift_id
          and source_step.step_index between 2 and 5
          and source_step.source_ref~'^https://github[.]com/maloney2323/Reality/(issues|pull|actions/runs)/[1-9][0-9]*
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

      ))
      or
      -- Preserve the existing exact current-original capability handoff.
      (s.status='AWAITING_EXACT_ORIGINAL_WORK' and exists (
        select 1 from reality_internal.governed_employee_shift_steps_v1 step
        where step.shift_id=s.shift_id
          and step.step_index between 2 and 5
          and step.state='SOURCE_CHECKED'
          and step.source_status='OPEN_ISSUE'
          and step.proof_sha256~'^sha256:[a-f0-9]{64}
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

      ))
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

-- Stop the old source-only scheduler AFTER ensuring the trusted preview job
-- is updated. Keep one and only one worker that can claim steps 1–5.
do $retire_source_only$
begin
 if (select count(*) from cron.job
   where jobname='reality-riley-preview-original-execution-wake-v1'
     and active
     and command like '%QUEUED%'
     and command like '%x-vercel-protection-bypass%')<>1
 then raise exception 'SHIFT_PREVIEW_MODEL_WORKER_NOT_DURABLY_SCHEDULED'; end if;
 if not cron.unschedule('reality-governed-employee-shift-wake-v1')
 then raise exception 'SHIFT_SOURCE_ONLY_SCHEDULER_UNSCHEDULE_FAILED'; end if;
end $retire_source_only$;
