-- Auto handoff: source-backed qualification stall -> different signed reviewer.
-- Proves ONLY the state of owner-authorized original-work admission, not code
-- repair, installation, ROI or completion.
create table if not exists reality_internal.shift_business_qualification_reviews_v1(
 incident_id uuid primary key references reality_internal.owner_shift_continuity_incidents_v1(incident_id),
 owner_id uuid not null, shift_id uuid not null, source_claim_id uuid not null,
 claim_id uuid not null, worker_run_id uuid not null,
 reviewer text not null, reviewer_function_id text not null,
 source_ref text not null,
 prior_source_sha256 text not null check(prior_source_sha256~'^sha256:[a-f0-9]{64}$'),
 investigation_receipt_sha256 text not null
  check(investigation_receipt_sha256~'^sha256:[a-f0-9]{64}$'),
 claimed_at timestamptz not null default clock_timestamp(),
 status text not null default 'REVIEW_CLAIMED'
  check(status in('REVIEW_CLAIMED','NO_ORIGINAL_ADMISSION_CONFIRMED',
   'ORIGINAL_CLAIM_NOW_EXISTS','INSUFFICIENT_LIVE_SOURCE_EVIDENCE',
   'PROVIDER_PROOF_UNAVAILABLE')),
 current_provider_sha256 text check(current_provider_sha256 is null or
  current_provider_sha256~'^sha256:[a-f0-9]{64}$'),
 source_epoch_changed boolean, original_claim_count integer
  check(original_claim_count is null or original_claim_count between 0 and 100000),
 prior_inquiry_count integer
  check(prior_inquiry_count is null or prior_inquiry_count between 0 and 100000),
 provider_checked_at timestamptz,
 receipt_sha256 text check(receipt_sha256 is null or
  receipt_sha256~'^sha256:[a-f0-9]{64}$'),
 completed_at timestamptz,
 original_job_completed boolean not null default false check(original_job_completed=false),
 repair_executed boolean not null default false check(repair_executed=false),
 installation_authorized boolean not null default false check(installation_authorized=false),
 production_changed boolean not null default false check(production_changed=false)
);
alter table reality_internal.shift_business_qualification_reviews_v1 enable row level security;
revoke all on reality_internal.shift_business_qualification_reviews_v1 from public,anon,authenticated;
grant select,insert,update on reality_internal.shift_business_qualification_reviews_v1 to service_role;

create or replace function public.reality_claim_shift_business_qualification_review_v1(
 p_shift_id uuid,p_worker_run_id uuid)
returns jsonb language plpgsql security invoker set search_path to '' as $fn$
declare i record; claim uuid;
begin
 if current_user<>'service_role' or p_shift_id is null or p_worker_run_id is null
 then raise exception 'QUALIFICATION_SIGNED_REVIEW_SERVICE_REQUIRED';end if;
 select inc.*,t.source_ref,t.provider_proof_sha256 into i
 from reality_internal.owner_shift_continuity_incidents_v1 inc
 join reality_internal.employee_temporal_inquiries_v1 t
  on t.claim_id=inc.source_claim_id and t.owner_id=inc.owner_id
 join reality_internal.governed_employee_shifts_v1 s
  on s.shift_id=inc.shift_id and s.owner_id=inc.owner_id
 join reality_internal.governed_employee_shift_worker_pulses_v1 w
  on w.shift_id=s.shift_id and w.owner_id=s.owner_id
 join reality_internal.signed_worker_actual_runs_v1 run
  on run.run_id=p_worker_run_id and run.status='STARTED'
 where inc.shift_id=p_shift_id
  and inc.kind='EMPLOYEE_QUALIFICATION_HANDOFF_STALLED'
  and inc.phase='INVESTIGATION_RECORDED_NEEDS_INDEPENDENT_PROOF'
  and inc.investigation_receipt_sha256~'^sha256:[a-f0-9]{64}$'
  and inc.independent_reviewer is not null and inc.reviewer_function_id is not null
  and inc.reviewer_function_id<>inc.assigned_function_id
  and inc.investigated_at is not null and run.started_at>inc.investigated_at
  and t.phase='RECORDED' and t.finished_at>=s.authorized_at
  and t.provider_proof_sha256~'^sha256:[a-f0-9]{64}$'
  and t.source_ref~'^https://github[.]com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/(issues|pull)/[1-9][0-9]*$'
  and s.authorized_at is not null and s.closed_at is null
  and s.status in('RUNNING','QUEUED','AWAITING_EXACT_ORIGINAL_WORK')
  and s.planned_start_at<=clock_timestamp() and s.planned_end_at>clock_timestamp()
  and w.last_worker_status='WAKE_RECEIVED'
  and w.last_worker_seen_at>clock_timestamp()-interval '3 minutes'
  and run.started_at>clock_timestamp()-interval '3 minutes'
  and not exists(select 1 from reality_internal.shift_business_qualification_reviews_v1 r
   where r.incident_id=inc.incident_id)
 order by inc.first_detected_at limit 1 for update of inc skip locked;
 if not found then return pg_catalog.jsonb_build_object(
  'status','NO_SIGNED_BUSINESS_QUALIFICATION_REVIEW_READY',
  'original_job_completed',false,'installation_authorized',false,
  'production_changed',false);end if;
 claim:=gen_random_uuid();
 insert into reality_internal.shift_business_qualification_reviews_v1(
  incident_id,owner_id,shift_id,source_claim_id,claim_id,worker_run_id,
  reviewer,reviewer_function_id,source_ref,prior_source_sha256,
  investigation_receipt_sha256)
 values(i.incident_id,i.owner_id,i.shift_id,i.source_claim_id,
  claim,p_worker_run_id,i.independent_reviewer,i.reviewer_function_id,
  i.source_ref,i.provider_proof_sha256,i.investigation_receipt_sha256);
 return pg_catalog.jsonb_build_object(
  'status','SIGNED_BUSINESS_QUALIFICATION_REVIEW_CLAIMED',
  'incident_id',i.incident_id,'shift_id',i.shift_id,'owner_id',i.owner_id,
  'source_claim_id',i.source_claim_id,'claim_id',claim,
  'worker_run_id',p_worker_run_id,'reviewer',i.independent_reviewer,
  'reviewer_function_id',i.reviewer_function_id,
  'source_ref',i.source_ref,'prior_source_sha256',i.provider_proof_sha256,
  'investigation_receipt_sha256',i.investigation_receipt_sha256,
  'original_job_completed',false,'installation_authorized',false,
  'production_changed',false);
end $fn$;

create or replace function public.reality_record_shift_business_qualification_review_v1(
 p_incident_id uuid,p_claim_id uuid,p_worker_run_id uuid,
 p_source_ref text,p_provider_sha256 text,p_checked_at timestamptz)
returns jsonb language plpgsql security invoker set search_path to '' as $fn$
declare r reality_internal.shift_business_qualification_reviews_v1%rowtype;
 s record; live_inquiries integer; originals integer; status_code text;
 proof text;
begin
 if current_user<>'service_role' or p_incident_id is null or p_claim_id is null
  or p_worker_run_id is null or p_provider_sha256!~'^sha256:[a-f0-9]{64}$'
  or p_checked_at is null or p_checked_at<clock_timestamp()-interval '3 minutes'
  or p_checked_at>clock_timestamp()+interval '1 minute'
 then raise exception 'BUSINESS_QUALIFICATION_REVIEW_PROVIDER_PROOF_REQUIRED';end if;
 select * into r from reality_internal.shift_business_qualification_reviews_v1
 where incident_id=p_incident_id and claim_id=p_claim_id
  and worker_run_id=p_worker_run_id and source_ref=p_source_ref
  and status='REVIEW_CLAIMED'
  and claimed_at>clock_timestamp()-interval '3 minutes'
 for update;
 if not found or not exists(
  select 1 from reality_internal.signed_worker_actual_runs_v1 run
   where run.run_id=p_worker_run_id and run.status='STARTED'
 ) then raise exception 'BUSINESS_QUALIFICATION_REVIEW_LEASE_INVALID';end if;
 select s.owner_id,s.shift_id,s.authorized_at into s
 from reality_internal.governed_employee_shifts_v1 s
 where s.shift_id=r.shift_id and s.owner_id=r.owner_id
  and s.authorized_at is not null and s.closed_at is null
  and s.planned_end_at>clock_timestamp();
 if not found then raise exception 'BUSINESS_QUALIFICATION_ACTIVE_SHIFT_REQUIRED';end if;
 select count(*) into originals
 from reality_internal.governed_employee_original_claims_v1 c
 where c.owner_id=r.owner_id and c.shift_id=r.shift_id;
 select count(*) into live_inquiries
 from reality_internal.employee_temporal_inquiries_v1 i
 join reality_internal.employee_discovery_observations_v1 d
  on d.owner_id=i.owner_id and d.employee=i.employee
   and d.source_ref=i.source_ref and d.evidence_sha256=i.evidence_sha256
 where i.owner_id=r.owner_id and i.phase='RECORDED'
  and i.finished_at>s.authorized_at
  and i.provider_proof_sha256~'^sha256:[a-f0-9]{64}$'
  and i.recommendation in('INVESTIGATE_MORE','OWNER_REVIEW')
  and d.qualified_job_created=false and d.production_changed=false;
 status_code:=case
  when originals>0 then 'ORIGINAL_CLAIM_NOW_EXISTS'
  when live_inquiries>=2 then 'NO_ORIGINAL_ADMISSION_CONFIRMED'
  else 'INSUFFICIENT_LIVE_SOURCE_EVIDENCE' end;
 proof:='sha256:'||encode(sha256(convert_to(
  r.incident_id::text||':'||r.claim_id::text||':'||p_worker_run_id::text||
  ':'||r.investigation_receipt_sha256||':'||r.prior_source_sha256||
  ':'||p_provider_sha256||':'||live_inquiries::text||':'||originals::text||
  ':'||status_code,'UTF8')),'hex');
 update reality_internal.shift_business_qualification_reviews_v1
 set status=status_code,current_provider_sha256=p_provider_sha256,
  source_epoch_changed=r.prior_source_sha256<>p_provider_sha256,
  prior_inquiry_count=live_inquiries,original_claim_count=originals,
  provider_checked_at=p_checked_at,receipt_sha256=proof,
  completed_at=clock_timestamp()
 where incident_id=r.incident_id;
 return pg_catalog.jsonb_build_object(
  'status',status_code,'incident_id',r.incident_id,
  'shift_id',r.shift_id,'reviewer',r.reviewer,'source_ref',r.source_ref,
  'independent_receipt_sha256',proof,
  'provider_source_epoch_changed',r.prior_source_sha256<>p_provider_sha256,
  'source_backed_inquiries',live_inquiries,'original_job_claims',originals,
  'next_action',case when status_code='NO_ORIGINAL_ADMISSION_CONFIRMED'
   then 'DISCOVER_EXACT_AUTHORIZED_ORIGINAL_BUSINESS_WORK_OR_REQUEST_SOURCE_CONNECTION'
   else 'RECONCILE_LIVE_ORIGINAL_WORK_AND_SOURCE_EVIDENCE' end,
  'original_job_completed',false,'repair_executed',false,
  'installation_authorized',false,'production_changed',false);
end $fn$;

revoke execute on function public.reality_claim_shift_business_qualification_review_v1(uuid,uuid)
 from public,anon,authenticated;
revoke execute on function public.reality_record_shift_business_qualification_review_v1(uuid,uuid,uuid,text,text,timestamptz)
 from public,anon,authenticated;
grant execute on function public.reality_claim_shift_business_qualification_review_v1(uuid,uuid)
 to service_role;
grant execute on function public.reality_record_shift_business_qualification_review_v1(uuid,uuid,uuid,text,text,timestamptz)
 to service_role;

-- Reuse the EXISTING every-minute watchdog: expired reviewer leases become
-- a durable unknown outcome, never an unverified completed original job.
CREATE OR REPLACE FUNCTION reality_internal.reconcile_stale_continuity_reviews_v1()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare n integer; m integer;
begin
 if current_user<>'postgres' then raise exception 'REVIEW_WATCHDOG_REQUIRED';end if;
 update reality_internal.shift_continuity_independent_reviews_v1
 set status='PROVIDER_PROOF_UNAVAILABLE',completed_at=clock_timestamp()
 where status='REVIEW_CLAIMED' and claimed_at<clock_timestamp()-interval '5 minutes';
 get diagnostics n=row_count;
 update reality_internal.shift_business_qualification_reviews_v1
 set status='PROVIDER_PROOF_UNAVAILABLE',completed_at=clock_timestamp()
 where status='REVIEW_CLAIMED'
  and claimed_at<clock_timestamp()-interval '5 minutes';
 get diagnostics m=row_count;
 return 'STALE_CONTINUITY_REVIEW_LEASES_FENCED_'||n||
  '_BUSINESS_QUALIFICATION_LEASES_FENCED_'||m;
end $function$
;
revoke execute on function reality_internal.reconcile_stale_continuity_reviews_v1()
 from public,anon,authenticated;
