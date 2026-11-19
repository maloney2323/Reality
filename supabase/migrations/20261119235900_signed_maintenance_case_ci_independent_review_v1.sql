-- Reality's existing separate signed reviewer records independent GitHub
-- CI diagnostics after the claimed worker dispatches a source-bound trigger.
-- A passed diagnostic is NOT a reproduced frozen RED or a repaired original.
alter table reality_internal.signed_maintenance_executor_claims_v1
 add column if not exists ci_independent_diagnostic_run_id bigint,
 add column if not exists ci_independent_diagnostic_artifact_id bigint,
 add column if not exists ci_independent_artifact_digest text,
 add column if not exists ci_independent_review_worker_run_id uuid,
 add column if not exists ci_independent_diagnostic_receipt_sha256 text,
 add column if not exists ci_independent_verified_at timestamptz;
do $constraint$
begin
 if not exists(select 1 from pg_catalog.pg_constraint
  where conrelid='reality_internal.signed_maintenance_executor_claims_v1'::regclass
   and conname='signed_maintenance_ci_diagnostic_review_proof_v1') then
  alter table reality_internal.signed_maintenance_executor_claims_v1
  add constraint signed_maintenance_ci_diagnostic_review_proof_v1 check(
    ci_independent_diagnostic_receipt_sha256 is null or(
     action='RUN_CASE_SPECIFIC_INDEPENDENT_MAINTENANCE_CI_RED'
     and state='COMPLETED'
     and ci_trigger_receipt_sha256~'^sha256:[a-f0-9]{64}$'
     and ci_independent_diagnostic_run_id>0
     and ci_independent_diagnostic_artifact_id>0
     and ci_independent_artifact_digest~'^sha256:[a-f0-9]{64}$'
     and ci_independent_diagnostic_receipt_sha256~'^sha256:[a-f0-9]{64}$'
     and ci_independent_review_worker_run_id is not null
     and ci_independent_verified_at is not null));
 end if;
end $constraint$;

create or replace function public.reality_read_next_signed_maintenance_ci_diagnostic_v1(
 p_shift_id uuid,p_worker_run_id uuid)
 returns jsonb language plpgsql set search_path to '' as $fn$
declare c record;
begin
 if current_user<>'service_role' or p_shift_id is null or p_worker_run_id is null
 then raise exception 'MAINTENANCE_DIAGNOSTIC_REVIEW_SERVICE_REQUIRED';end if;
 if not exists(select 1 from reality_internal.signed_worker_actual_runs_v1 r
   where r.run_id=p_worker_run_id and r.status='STARTED'
   and r.started_at>pg_catalog.clock_timestamp()-interval '3 minutes')
 then raise exception 'MAINTENANCE_DIAGNOSTIC_REVIEW_INDEPENDENT_RUN_REQUIRED';end if;
 select x.* into c
 from reality_internal.signed_maintenance_executor_claims_v1 x
 join reality_internal.signed_maintenance_ci_source_epochs_v1 e
  on e.maintenance_id=x.maintenance_id and e.owner_id=x.owner_id
  and e.shift_id=x.shift_id and e.source_ref=x.source_ref
  and e.receipt_sha256=x.source_epoch_receipt_sha256
 join reality_internal.owner_internal_maintenance_jobs_v1 m
  on m.incident_id=x.maintenance_id and m.owner_id=x.owner_id
  and m.claimed_shift_id=x.shift_id and m.source_ref=x.source_ref
  and m.independent_review_receipt_sha256=e.independent_review_receipt_sha256
  and m.independent_failure_baseline_receipt_sha256=e.baseline_receipt_sha256
 join reality_internal.governed_employee_shifts_v1 s
  on s.shift_id=x.shift_id and s.owner_id=x.owner_id
 join reality_internal.governed_employee_completion_warrants_v1 w
  on w.shift_id=s.shift_id and w.owner_id=s.owner_id
  and w.plan_fingerprint=s.plan_fingerprint and w.state='ACTIVE'
  and w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
 where x.shift_id=p_shift_id
  and x.action='RUN_CASE_SPECIFIC_INDEPENDENT_MAINTENANCE_CI_RED'
  and x.state='COMPLETED' and x.worker_run_id<>p_worker_run_id
  and x.ci_trigger_commit_sha~'^[a-f0-9]{40}$'
  and x.ci_trigger_receipt_sha256~'^sha256:[a-f0-9]{64}$'
  and x.ci_dispatched_at is not null
  and x.ci_independent_diagnostic_receipt_sha256 is null
  and x.ci_dispatched_at<=pg_catalog.clock_timestamp()
  and x.ci_dispatched_at>=pg_catalog.clock_timestamp()-interval '14 days'
  and s.closed_at is null and s.authorized_at is not null
  and s.status in ('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
  and s.planned_start_at<=pg_catalog.clock_timestamp()
  and (s.planned_end_at='infinity'::timestamptz
    or s.planned_end_at>pg_catalog.clock_timestamp())
  and m.independent_frozen_test_receipt_sha256 is null
  and m.original_job_completed=false and m.production_changed=false
  and exists(select 1 from pg_catalog.jsonb_array_elements(
    case when pg_catalog.jsonb_typeof(w.source_scope)='array'
      then w.source_scope else '[]'::jsonb end) sc
    where sc->>'maintenance_id'=m.incident_id::text
      and sc->>'origin_shift_id'=m.origin_shift_id::text
      and sc->>'source_ref'=m.source_ref
      and sc->>'independent_review_receipt_sha256'=m.independent_review_receipt_sha256)
 order by x.ci_dispatched_at,x.maintenance_id limit 1;
 if not found then return pg_catalog.jsonb_build_object(
  'status','NO_SIGNED_MAINTENANCE_DIAGNOSTIC_TO_REVIEW',
  'frozen_ci_red_verified',false,'repair_executed',false,
  'original_job_completed',false,'installation_authorized',false,
  'production_changed',false);end if;
 return pg_catalog.jsonb_build_object(
  'status','SIGNED_MAINTENANCE_DIAGNOSTIC_NEEDS_INDEPENDENT_GITHUB_RECHECK',
  'maintenance_id',c.maintenance_id,'owner_id',c.owner_id,
  'shift_id',c.shift_id,'source_ref',c.source_ref,
  'source_epoch_receipt_sha256',c.source_epoch_receipt_sha256,
  'trigger_commit_sha',c.ci_trigger_commit_sha,
  'trigger_receipt_sha256',c.ci_trigger_receipt_sha256,
  'ci_dispatched_at',c.ci_dispatched_at,
  'first_worker_run_id',c.worker_run_id,
  'independent_worker_run_id',p_worker_run_id,
  'read_only',true,'frozen_ci_red_verified',false,
  'repair_executed',false,'original_job_completed',false,
  'installation_authorized',false,'production_changed',false);
end $fn$;

create or replace function public.reality_record_signed_maintenance_ci_diagnostic_v1(
 p_shift_id uuid,p_maintenance_id uuid,p_worker_run_id uuid,
 p_github_run_id bigint,p_artifact_id bigint,
 p_artifact_digest text,p_provider_verified_commit_sha text)
 returns jsonb language plpgsql set search_path to '' as $fn$
declare c record;v_receipt text;v_time timestamptz;
begin
 v_time:=pg_catalog.clock_timestamp();
 if current_user<>'service_role' or p_shift_id is null or
  p_maintenance_id is null or p_worker_run_id is null or
  p_github_run_id<1 or p_artifact_id<1 or
  p_artifact_digest!~'^sha256:[a-f0-9]{64}$' or
  p_provider_verified_commit_sha!~'^[a-f0-9]{40}$'
 then raise exception 'MAINTENANCE_DIAGNOSTIC_REVIEW_PROVIDER_IDENTITY_REQUIRED';end if;
 if not exists(select 1 from reality_internal.signed_worker_actual_runs_v1 r
   where r.run_id=p_worker_run_id and r.status='STARTED'
    and r.started_at>v_time-interval '3 minutes')
 then raise exception 'MAINTENANCE_DIAGNOSTIC_REVIEW_SIGNED_RUN_REQUIRED';end if;
 select * into c from reality_internal.signed_maintenance_executor_claims_v1
 where shift_id=p_shift_id and maintenance_id=p_maintenance_id
  and action='RUN_CASE_SPECIFIC_INDEPENDENT_MAINTENANCE_CI_RED'
  and state='COMPLETED' and worker_run_id<>p_worker_run_id
  and ci_trigger_commit_sha~'^[a-f0-9]{40}$'
  and ci_trigger_receipt_sha256~'^sha256:[a-f0-9]{64}$'
  and ci_independent_diagnostic_receipt_sha256 is null
 for update;
 if not found then raise exception 'MAINTENANCE_DIAGNOSTIC_REVIEW_UNOWNED_OR_REPLAY';end if;
 if p_provider_verified_commit_sha=c.ci_trigger_commit_sha
 then null; -- The trigger itself may be the verified head SHA.
 end if;
 v_receipt:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to(
   'independent-maintenance-ci-diagnostic-v1|'||c.maintenance_id::text||'|'||
   c.shift_id::text||'|'||c.ci_trigger_receipt_sha256||'|'||
   p_github_run_id::text||'|'||p_artifact_id::text||'|'||
   p_artifact_digest||'|'||p_provider_verified_commit_sha||'|'||
   p_worker_run_id::text,'UTF8')),'hex');
 update reality_internal.signed_maintenance_executor_claims_v1
 set ci_independent_diagnostic_run_id=p_github_run_id,
     ci_independent_diagnostic_artifact_id=p_artifact_id,
     ci_independent_artifact_digest=p_artifact_digest,
     ci_independent_review_worker_run_id=p_worker_run_id,
     ci_independent_diagnostic_receipt_sha256=v_receipt,
     ci_independent_verified_at=v_time
 where maintenance_id=c.maintenance_id
  and ci_independent_diagnostic_receipt_sha256 is null;
 if not found then raise exception 'MAINTENANCE_DIAGNOSTIC_REVIEW_COMMIT_FAILED';end if;
 return pg_catalog.jsonb_build_object(
  'status','SIGNED_MAINTENANCE_CI_DIAGNOSTIC_REVIEWED_CASE_RED_STILL_REQUIRED',
  'maintenance_id',c.maintenance_id,'shift_id',c.shift_id,
  'independent_worker_run_id',p_worker_run_id,
  'github_run_id',p_github_run_id,'artifact_id',p_artifact_id,
  'artifact_digest',p_artifact_digest,
  'independent_diagnostic_receipt_sha256',v_receipt,
  'frozen_ci_red_verified',false,'repair_executed',false,
  'original_job_completed',false,'installation_authorized',false,
  'production_changed',false);
end $fn$;

revoke all on function public.reality_read_next_signed_maintenance_ci_diagnostic_v1(
 uuid,uuid) from public,anon,authenticated;
revoke all on function public.reality_record_signed_maintenance_ci_diagnostic_v1(
 uuid,uuid,uuid,bigint,bigint,text,text) from public,anon,authenticated;
grant execute on function public.reality_read_next_signed_maintenance_ci_diagnostic_v1(
 uuid,uuid) to service_role;
grant execute on function public.reality_record_signed_maintenance_ci_diagnostic_v1(
 uuid,uuid,uuid,bigint,bigint,text,text) to service_role;
