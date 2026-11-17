-- First executable handoff from model investigation to a DIFFERENT signed worker.
-- It verifies current source evidence, never marks a code repair/customer job done.
create table if not exists reality_internal.shift_continuity_independent_reviews_v1(
 incident_id uuid primary key references reality_internal.owner_shift_continuity_incidents_v1(incident_id),
 owner_id uuid not null, shift_id uuid not null, qualified_job_id uuid not null,
 claim_id uuid not null, worker_run_id uuid not null,
 reviewer text not null, reviewer_function_id text not null,
 source_ref text not null, previously_reviewed_sha256 text not null
  check(previously_reviewed_sha256~'^sha256:[a-f0-9]{64}$'),
 investigation_receipt_sha256 text not null
  check(investigation_receipt_sha256~'^sha256:[a-f0-9]{64}$'),
 claimed_at timestamptz not null default clock_timestamp(),
 status text not null default 'REVIEW_CLAIMED'
  check(status in ('REVIEW_CLAIMED','SOURCE_CHANGED_NEEDS_FROZEN_TEST',
   'SOURCE_MATCHED_NEEDS_FROZEN_TEST','PROVIDER_PROOF_UNAVAILABLE')),
 current_provider_sha256 text check(current_provider_sha256 is null or
  current_provider_sha256~'^sha256:[a-f0-9]{64}$'),
 provider_checked_at timestamptz, source_head_sha text
  check(source_head_sha is null or source_head_sha~'^[a-f0-9]{40}$'),
 receipt_sha256 text check(receipt_sha256 is null or
  receipt_sha256~'^sha256:[a-f0-9]{64}$'),
 completed_at timestamptz,
 installation_authorized boolean not null default false check(installation_authorized=false),
 production_changed boolean not null default false check(production_changed=false),
 original_job_completed boolean not null default false check(original_job_completed=false)
);
alter table reality_internal.shift_continuity_independent_reviews_v1 enable row level security;
revoke all on reality_internal.shift_continuity_independent_reviews_v1 from public,anon,authenticated;
grant select,insert,update on reality_internal.shift_continuity_independent_reviews_v1 to service_role;

create or replace function public.reality_claim_shift_continuity_independent_review_v1(
 p_shift_id uuid,p_worker_run_id uuid)
returns jsonb language plpgsql security invoker set search_path to '' as $fn$
declare i record; v_id uuid;
begin
 if current_user<>'service_role' or p_shift_id is null or p_worker_run_id is null
 then raise exception 'SIGNED_INDEPENDENT_CONTINUITY_REVIEW_REQUIRED'; end if;
 select inc.*,job.source_ref,job.reviewed_source_sha256 into i
 from reality_internal.owner_shift_continuity_incidents_v1 inc
 join reality_internal.owner_qualified_employee_evidence_jobs_v1 job
  on job.job_id=inc.qualified_job_id and job.owner_id=inc.owner_id
  and job.shift_id=inc.shift_id
 join reality_internal.governed_employee_shifts_v1 s
  on s.shift_id=inc.shift_id and s.owner_id=inc.owner_id
 join reality_internal.governed_employee_shift_worker_pulses_v1 pulse
  on pulse.shift_id=s.shift_id and pulse.owner_id=s.owner_id
 join reality_internal.signed_worker_actual_runs_v1 run
  on run.run_id=p_worker_run_id and run.status='STARTED'
 where inc.shift_id=p_shift_id
  and inc.phase='INVESTIGATION_RECORDED_NEEDS_INDEPENDENT_PROOF'
  and inc.investigated_at is not null and run.started_at>inc.investigated_at
  and inc.investigation_receipt_sha256~'^sha256:[a-f0-9]{64}$'
  and inc.independent_reviewer is not null
  and inc.reviewer_function_id is not null
  and inc.reviewer_function_id<>inc.assigned_function_id
  and job.phase='BLOCKED_SOURCE_CHANGED'
  and job.reviewed_source_sha256~'^sha256:[a-f0-9]{64}$'
  and job.source_ref~'^https://github[.]com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/(pull|issues)/[1-9][0-9]*$'
  and s.authorized_at is not null and s.closed_at is null
  and s.status in ('RUNNING','QUEUED','AWAITING_EXACT_ORIGINAL_WORK')
  and s.planned_start_at<=clock_timestamp() and s.planned_end_at>clock_timestamp()
  and pulse.last_worker_status='WAKE_RECEIVED'
  and pulse.last_worker_seen_at>clock_timestamp()-interval '3 minutes'
  and run.started_at>clock_timestamp()-interval '3 minutes'
  and not exists(select 1 from reality_internal.shift_continuity_independent_reviews_v1 r
   where r.incident_id=inc.incident_id)
 order by inc.investigated_at limit 1 for update of inc skip locked;
 if not found then return jsonb_build_object(
  'status','NO_CONTINUITY_INDEPENDENT_REVIEW_READY',
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false); end if;
 v_id:=gen_random_uuid();
 insert into reality_internal.shift_continuity_independent_reviews_v1(
  incident_id,owner_id,shift_id,qualified_job_id,claim_id,worker_run_id,
  reviewer,reviewer_function_id,source_ref,previously_reviewed_sha256,
  investigation_receipt_sha256)
 values(i.incident_id,i.owner_id,i.shift_id,i.qualified_job_id,v_id,
  p_worker_run_id,i.independent_reviewer,i.reviewer_function_id,
  i.source_ref,i.reviewed_source_sha256,i.investigation_receipt_sha256);
 return jsonb_build_object(
  'status','SIGNED_CONTINUITY_REVIEW_CLAIMED','incident_id',i.incident_id,
  'owner_id',i.owner_id,'shift_id',i.shift_id,'job_id',i.qualified_job_id,
  'claim_id',v_id,'worker_run_id',p_worker_run_id,
  'reviewer',i.independent_reviewer,'reviewer_function_id',i.reviewer_function_id,
  'source_ref',i.source_ref,'previously_reviewed_sha256',i.reviewed_source_sha256,
  'investigation_receipt_sha256',i.investigation_receipt_sha256,
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false);
end $fn$;

create or replace function public.reality_record_shift_continuity_independent_review_v1(
 p_incident_id uuid,p_claim_id uuid,p_worker_run_id uuid,
 p_source_ref text,p_provider_sha256 text,p_checked_at timestamptz)
returns jsonb language plpgsql security invoker set search_path to '' as $fn$
declare r reality_internal.shift_continuity_independent_reviews_v1%rowtype;
 v_status text; v_receipt text;
begin
 if current_user<>'service_role' or p_incident_id is null or p_claim_id is null
  or p_worker_run_id is null or p_provider_sha256 !~ '^sha256:[a-f0-9]{64}$'
  or p_checked_at is null or p_checked_at<clock_timestamp()-interval '3 minutes'
  or p_checked_at>clock_timestamp()+interval '1 minute'
 then raise exception 'CONTINUITY_PROVIDER_PROOF_REQUIRED';end if;
 select * into r from reality_internal.shift_continuity_independent_reviews_v1
 where incident_id=p_incident_id and claim_id=p_claim_id
  and worker_run_id=p_worker_run_id and source_ref=p_source_ref
  and status='REVIEW_CLAIMED'
  and claimed_at>clock_timestamp()-interval '3 minutes' for update;
 if not found or not exists(
  select 1 from reality_internal.signed_worker_actual_runs_v1 w
  where w.run_id=p_worker_run_id and w.status='STARTED'
 ) then raise exception 'CONTINUITY_INDEPENDENT_REVIEW_LEASE_INVALID';end if;
 v_status:=case when r.previously_reviewed_sha256=p_provider_sha256
  then 'SOURCE_MATCHED_NEEDS_FROZEN_TEST'
  else 'SOURCE_CHANGED_NEEDS_FROZEN_TEST' end;
 v_receipt:='sha256:'||encode(sha256(convert_to(r.incident_id::text||':'||
  r.claim_id::text||':'||r.worker_run_id::text||':'||
  r.investigation_receipt_sha256||':'||r.previously_reviewed_sha256||':'||
  p_provider_sha256||':'||v_status,'UTF8')),'hex');
 update reality_internal.shift_continuity_independent_reviews_v1
 set status=v_status,current_provider_sha256=p_provider_sha256,
  provider_checked_at=p_checked_at,receipt_sha256=v_receipt,
  completed_at=clock_timestamp()
 where incident_id=r.incident_id;
 return jsonb_build_object('status',v_status,'incident_id',r.incident_id,
  'job_id',r.qualified_job_id,'reviewer',r.reviewer,
  'independent_review_receipt_sha256',v_receipt,
  'next_action','INDEPENDENT_FROZEN_REPRODUCTION_OR_NEW_SOURCE_EPOCH_REQUIRED',
  'original_job_completed',false,'repair_executed',false,
  'installation_authorized',false,'production_changed',false);
end $fn$;

create or replace function reality_internal.reconcile_stale_continuity_reviews_v1()
returns text language plpgsql security invoker set search_path to '' as $fn$
declare n integer;
begin
 if current_user<>'postgres' then raise exception 'REVIEW_WATCHDOG_REQUIRED';end if;
 update reality_internal.shift_continuity_independent_reviews_v1
 set status='PROVIDER_PROOF_UNAVAILABLE',completed_at=clock_timestamp()
 where status='REVIEW_CLAIMED' and claimed_at<clock_timestamp()-interval '5 minutes';
 get diagnostics n=row_count;
 return 'STALE_CONTINUITY_REVIEW_LEASES_FENCED_'||n;
end $fn$;

revoke execute on function public.reality_claim_shift_continuity_independent_review_v1(uuid,uuid)
 from public,anon,authenticated;
revoke execute on function public.reality_record_shift_continuity_independent_review_v1(uuid,uuid,uuid,text,text,timestamptz)
 from public,anon,authenticated;
grant execute on function public.reality_claim_shift_continuity_independent_review_v1(uuid,uuid)
 to service_role;
grant execute on function public.reality_record_shift_continuity_independent_review_v1(uuid,uuid,uuid,text,text,timestamptz)
 to service_role;
revoke execute on function reality_internal.reconcile_stale_continuity_reviews_v1()
 from public,anon,authenticated;
