-- DYNAMIC, source-grounded employee work qualification.  An investigation
-- is not a code-install warrant; only CURRENT provider evidence jobs are
-- executable under the already authorized read-only eight-hour shift.
create table if not exists reality_internal.owner_qualified_employee_evidence_jobs_v1(
 job_id uuid primary key default gen_random_uuid(),
 owner_id uuid not null,
 shift_id uuid not null references reality_internal.governed_employee_shifts_v1(shift_id),
 inquiry_claim_id uuid not null,
 employee text not null,
 source_ref text not null,
 discovery_evidence_sha256 text not null check(discovery_evidence_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 inquiry_provider_sha256 text not null check(inquiry_provider_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 objective text not null check(length(objective) between 15 and 1500),
 initial_investigation text not null check(length(initial_investigation) between 20 and 2500),
 qualification_receipt_sha256 text not null check(qualification_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 job_type text not null default 'CURRENT_SOURCE_EVIDENCE_PACK'
  check(job_type='CURRENT_SOURCE_EVIDENCE_PACK'),
 phase text not null default 'QUALIFIED_EXECUTABLE'
 check(phase in ('QUALIFIED_EXECUTABLE','EXECUTION_CLAIMED',
  'SUBMITTED_AWAITING_INDEPENDENT_RECHECK','REVIEW_CLAIMED',
  'COMPLETED_INDEPENDENTLY_VERIFIED','BLOCKED_SOURCE_CHANGED',
  'BLOCKED_PROVIDER_OR_WORKER_EVIDENCE')),
 qualified_at timestamptz not null default clock_timestamp(),
 execution_claim_id uuid,execution_worker_run_id uuid,
 execution_claimed_at timestamptz,execution_completed_at timestamptz,
 first_source_proof_sha256 text check(
  first_source_proof_sha256 is null or first_source_proof_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 first_source_title text,first_source_updated_at timestamptz,
 first_source_checked_at timestamptz,
 deliverable jsonb,deliverable_receipt_sha256 text check(
  deliverable_receipt_sha256 is null or deliverable_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 review_claim_id uuid,review_worker_run_id uuid,review_claimed_at timestamptz,
 reviewed_source_sha256 text check(
  reviewed_source_sha256 is null or reviewed_source_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 verified_at timestamptz,independent_receipt_sha256 text check(
  independent_receipt_sha256 is null or independent_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 blocker text,
 installation_authorized boolean not null default false check(installation_authorized=false),
 production_changed boolean not null default false check(production_changed=false),
 original_customer_job_completed boolean not null default false check(original_customer_job_completed=false),
 unique(owner_id,shift_id,employee,source_ref),
 unique(owner_id,shift_id,inquiry_claim_id)
);
alter table reality_internal.owner_qualified_employee_evidence_jobs_v1 enable row level security;
revoke all on reality_internal.owner_qualified_employee_evidence_jobs_v1
 from public,anon,authenticated;
grant select,insert,update on reality_internal.owner_qualified_employee_evidence_jobs_v1
 to service_role;
create index if not exists owner_qualified_evidence_work_queue_v1
 on reality_internal.owner_qualified_employee_evidence_jobs_v1
 (shift_id,phase,qualified_at);

create or replace function reality_internal.qualify_owner_employee_evidence_jobs_v1()
returns text language plpgsql security invoker set search_path to '' as $fn$
declare n int;
begin
 if current_user<>'postgres' then raise exception
  'QUALIFICATION_TRUSTED_WATCHDOG_ROLE_REQUIRED';end if;
 -- The existing original-code repair warrant continues to be separately
 -- required. This creates ONLY immediately executable read-only evidence packs.
 with eligible as (
  select distinct on (s.owner_id,s.shift_id,i.employee,i.source_ref)
   s.owner_id,s.shift_id,i.claim_id,i.employee,i.source_ref,
   i.evidence_sha256,i.provider_proof_sha256,
   i.next_proof,i.investigation,i.finished_at
  from reality_internal.governed_employee_shifts_v1 s
  join reality_internal.employee_temporal_inquiries_v1 i
   on i.owner_id=s.owner_id
  join reality_internal.employee_discovery_observations_v1 d
   on d.owner_id=i.owner_id and d.employee=i.employee
    and d.source_ref=i.source_ref and d.evidence_sha256=i.evidence_sha256
  where s.authorized_at is not null and s.closed_at is null
   and s.planned_start_at<=clock_timestamp()
   and s.planned_end_at>clock_timestamp()
   and s.status in ('RUNNING','QUEUED','AWAITING_EXACT_ORIGINAL_WORK')
   and exists(select 1 from reality_internal.governed_employee_shift_worker_pulses_v1 w
    where w.shift_id=s.shift_id and w.owner_id=s.owner_id
      and w.last_worker_status='WAKE_RECEIVED'
      and w.last_worker_seen_at>clock_timestamp()-interval '5 minutes')
   and i.phase='RECORDED'
   and i.finished_at>=s.authorized_at and i.finished_at<=clock_timestamp()
   and i.provider_checked_at>=s.authorized_at
   and i.provider_checked_at<=clock_timestamp()
   and i.provider_proof_sha256 ~ '^sha256:[a-f0-9]{64}$'
   and i.evidence_sha256 ~ '^sha256:[a-f0-9]{64}$'
   and i.model_response_id ~ '^resp_[A-Za-z0-9_-]{4,160}$'
   and i.recommendation in ('INVESTIGATE_MORE','OWNER_REVIEW')
   and length(i.next_proof) between 15 and 1500
   and length(i.investigation) between 20 and 2500
   and i.source_ref ~ '^https://github[.]com/[^/]+/[^/]+/(issues|pull)/[1-9][0-9]*$'
   and d.qualified_job_created=false and d.installation_authorized=false
   and d.production_changed=false
   and d.source_observed_at<=i.provider_checked_at
  order by s.owner_id,s.shift_id,i.employee,i.source_ref,i.finished_at desc
 )
 insert into reality_internal.owner_qualified_employee_evidence_jobs_v1(
  owner_id,shift_id,inquiry_claim_id,employee,source_ref,
  discovery_evidence_sha256,inquiry_provider_sha256,objective,
  initial_investigation,qualification_receipt_sha256)
 select e.owner_id,e.shift_id,e.claim_id,e.employee,e.source_ref,
  e.evidence_sha256,e.provider_proof_sha256,e.next_proof,
  e.investigation,
  'sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
   e.owner_id::text||':'||e.shift_id::text||':'||e.claim_id::text||
   ':'||e.source_ref||':'||e.provider_proof_sha256||
   ':QUALIFIED_CURRENT_SOURCE_EVIDENCE_PACK','UTF8')),'hex')
 from eligible e
 on conflict do nothing;
 get diagnostics n=row_count;
 return 'SOURCE_BACKED_EXECUTABLE_EVIDENCE_JOBS_QUALIFIED_'||n;
end $fn$;

-- Every claim is tied to a real, currently running signed worker process and
-- the owner-authorized shift. The claim grants no new external side effects.
create or replace function public.reality_claim_next_qualified_employee_evidence_job_v1(
 p_shift_id uuid,p_worker_run_id uuid)
returns jsonb language plpgsql security invoker set search_path to '' as $fn$
declare j reality_internal.owner_qualified_employee_evidence_jobs_v1%rowtype;
begin
 if current_user<>'service_role' or p_shift_id is null
    or p_worker_run_id is null then raise exception
    'EXECUTABLE_EVIDENCE_SIGNED_WORKER_REQUIRED';end if;
 if not exists(
  select 1 from reality_internal.governed_employee_shifts_v1 s
  join reality_internal.governed_employee_shift_worker_pulses_v1 pulse
   on pulse.shift_id=s.shift_id and pulse.owner_id=s.owner_id
  join reality_internal.signed_worker_actual_runs_v1 run
   on run.run_id=p_worker_run_id and run.status='STARTED'
  where s.shift_id=p_shift_id and s.closed_at is null
   and s.authorized_at is not null and s.planned_start_at<=clock_timestamp()
   and s.planned_end_at>clock_timestamp()
   and s.status in ('RUNNING','AWAITING_EXACT_ORIGINAL_WORK','QUEUED')
   and pulse.last_worker_status='WAKE_RECEIVED'
   and pulse.last_worker_seen_at>clock_timestamp()-interval '3 minutes'
   and run.started_at>clock_timestamp()-interval '3 minutes'
 ) then return pg_catalog.jsonb_build_object(
  'status','NO_CURRENT_SIGNED_QUALIFIED_JOB_AUTHORITY',
  'execution_authorized',false,'installation_authorized',false,
  'production_changed',false);end if;
 select * into j from reality_internal.owner_qualified_employee_evidence_jobs_v1
 where shift_id=p_shift_id and phase='QUALIFIED_EXECUTABLE'
 order by qualified_at,employee,source_ref
 limit 1 for update skip locked;
 if not found then return pg_catalog.jsonb_build_object(
  'status','NO_QUALIFIED_EVIDENCE_JOB_READY','execution_authorized',false,
  'installation_authorized',false,'production_changed',false);end if;
 update reality_internal.owner_qualified_employee_evidence_jobs_v1
 set phase='EXECUTION_CLAIMED',execution_claim_id=gen_random_uuid(),
  execution_worker_run_id=p_worker_run_id,execution_claimed_at=clock_timestamp()
 where job_id=j.job_id returning * into j;
 return pg_catalog.jsonb_build_object(
  'status','QUALIFIED_EVIDENCE_JOB_SIGNED_CLAIMED',
  'job_id',j.job_id,'shift_id',j.shift_id,'owner_id',j.owner_id,
  'employee',j.employee,'source_ref',j.source_ref,
  'objective',j.objective,
  'qualification_receipt_sha256',j.qualification_receipt_sha256,
  'execution_claim_id',j.execution_claim_id,
  'worker_run_id',j.execution_worker_run_id,
  'job_type',j.job_type,'authorized_evidence_only',true,
  'installation_authorized',false,'production_changed',false,
  'original_customer_job_completed',false);
end $fn$;

create or replace function public.reality_record_qualified_employee_evidence_job_v1(
 p_job_id uuid,p_execution_claim_id uuid,p_worker_run_id uuid,
 p_source_ref text,p_source_title text,p_source_updated_at timestamptz,
 p_source_checked_at timestamptz,p_source_proof_sha256 text,p_source_excerpt text)
returns jsonb language plpgsql security invoker set search_path to '' as $fn$
declare j reality_internal.owner_qualified_employee_evidence_jobs_v1%rowtype;
 inquiry record; evidence jsonb;receipt text;
begin
 if current_user<>'service_role' or p_job_id is null or
   p_execution_claim_id is null or p_worker_run_id is null or
   p_source_proof_sha256 !~ '^sha256:[a-f0-9]{64}$' or
   p_source_title is null or length(p_source_title) not between 1 and 500 or
   p_source_ref !~ '^https://github[.]com/[^/]+/[^/]+/(issues|pull)/[1-9][0-9]*$'
   or p_source_updated_at is null or p_source_checked_at is null or
   p_source_checked_at<clock_timestamp()-interval '3 minutes' or
   p_source_checked_at>clock_timestamp()+interval '1 minute' or
   p_source_updated_at>p_source_checked_at or
   p_source_excerpt is null or length(p_source_excerpt)>3500
 then raise exception 'QUALIFIED_EVIDENCE_EXACT_PROVIDER_PROOF_REQUIRED';end if;
 select * into j from reality_internal.owner_qualified_employee_evidence_jobs_v1
 where job_id=p_job_id and phase='EXECUTION_CLAIMED'
  and execution_claim_id=p_execution_claim_id
  and execution_worker_run_id=p_worker_run_id
  and source_ref=p_source_ref
 for update;
 if not found then raise exception 'QUALIFIED_EVIDENCE_JOB_CLAIM_NOT_CURRENT';end if;
 if not exists(select 1 from reality_internal.signed_worker_actual_runs_v1 r
  where r.run_id=p_worker_run_id and r.status='STARTED'
   and r.started_at>=j.execution_claimed_at-interval '3 minutes') then
  raise exception 'QUALIFIED_EVIDENCE_WORKER_PROCESS_NOT_CONFIRMED';end if;
 select t.question,t.recommendation,t.model_response_id,
  t.provider_proof_sha256,t.next_proof
 into inquiry from reality_internal.employee_temporal_inquiries_v1 t
 where t.owner_id=j.owner_id and t.claim_id=j.inquiry_claim_id
  and t.phase='RECORDED' and t.source_ref=j.source_ref
  and t.evidence_sha256=j.discovery_evidence_sha256
  and t.provider_proof_sha256=j.inquiry_provider_sha256;
 if not found then raise exception 'QUALIFIED_EVIDENCE_SOURCE_INQUIRY_NOT_VERIFIED';end if;
 evidence:=pg_catalog.jsonb_build_object(
  'job_type','CURRENT_SOURCE_EVIDENCE_PACK',
  'source_ref',j.source_ref,'employee',j.employee,
  'source_title',p_source_title,
  'provider_updated_at',p_source_updated_at,
  'current_provider_checked_at',p_source_checked_at,
  'current_provider_sha256',p_source_proof_sha256,
  'source_body_excerpt',p_source_excerpt,
  'investigation_question',inquiry.question,
  'previous_provider_sha256',inquiry.provider_proof_sha256,
  'prior_investigation',j.initial_investigation,
  'next_evidence_required',j.objective,
  'recommendation',inquiry.recommendation,
  'customer_job_completed',false,
  'source_report_only_no_code_installation',true);
 receipt:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to(j.job_id::text||':'||j.qualification_receipt_sha256||
    ':'||p_worker_run_id::text||':'||evidence::text,'UTF8')),'hex');
 update reality_internal.owner_qualified_employee_evidence_jobs_v1
 set phase='SUBMITTED_AWAITING_INDEPENDENT_RECHECK',
  execution_completed_at=clock_timestamp(),
  first_source_proof_sha256=p_source_proof_sha256,
  first_source_title=p_source_title,
  first_source_updated_at=p_source_updated_at,
  first_source_checked_at=p_source_checked_at,
  deliverable=evidence,deliverable_receipt_sha256=receipt
 where job_id=j.job_id;
 return pg_catalog.jsonb_build_object(
  'status','EXECUTABLE_SOURCE_EVIDENCE_PACK_SUBMITTED',
  'job_id',j.job_id,'shift_id',j.shift_id,'owner_id',j.owner_id,
  'source_ref',j.source_ref,'execution_worker_run_id',p_worker_run_id,
  'evidence_deliverable_sha256',receipt,
  'independent_verification_required',true,
  'original_customer_job_completed',false,'installation_authorized',false,
  'production_changed',false);
end $fn$;

create or replace function public.reality_claim_qualified_employee_evidence_review_v1(
 p_shift_id uuid,p_worker_run_id uuid)
returns jsonb language plpgsql security invoker set search_path to '' as $fn$
declare j reality_internal.owner_qualified_employee_evidence_jobs_v1%rowtype;
begin
 if current_user<>'service_role' or p_shift_id is null or p_worker_run_id is null
 then raise exception 'QUALIFIED_EVIDENCE_REVIEW_SIGNED_WORKER_REQUIRED';end if;
 if not exists(
  select 1 from reality_internal.governed_employee_shifts_v1 s
  join reality_internal.governed_employee_shift_worker_pulses_v1 p
   on p.shift_id=s.shift_id and p.owner_id=s.owner_id
  join reality_internal.signed_worker_actual_runs_v1 r
   on r.run_id=p_worker_run_id and r.status='STARTED'
  where s.shift_id=p_shift_id and s.closed_at is null
   and s.planned_start_at<=clock_timestamp() and
    s.planned_end_at>clock_timestamp()
   and s.status in ('RUNNING','AWAITING_EXACT_ORIGINAL_WORK','QUEUED')
   and p.last_worker_status='WAKE_RECEIVED'
   and p.last_worker_seen_at>clock_timestamp()-interval '3 minutes'
   and r.started_at>clock_timestamp()-interval '3 minutes'
 ) then return pg_catalog.jsonb_build_object(
  'status','NO_CURRENT_SIGNED_QUALIFIED_REVIEW_SCOPE',
  'installation_authorized',false,'production_changed',false);end if;
 select q.* into j
 from reality_internal.owner_qualified_employee_evidence_jobs_v1 q
 join reality_internal.signed_worker_actual_runs_v1 executed
  on executed.run_id=q.execution_worker_run_id
  and executed.status='COMPLETED'
  and executed.finished_at>=q.execution_completed_at
 where q.shift_id=p_shift_id and
  q.phase='SUBMITTED_AWAITING_INDEPENDENT_RECHECK'
  and q.execution_worker_run_id<>p_worker_run_id
  and q.deliverable_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'
 order by q.execution_completed_at
 limit 1 for update of q skip locked;
 if not found then return pg_catalog.jsonb_build_object(
  'status','NO_INDEPENDENT_EVIDENCE_JOB_REVIEW_READY',
  'installation_authorized',false,'production_changed',false);end if;
 update reality_internal.owner_qualified_employee_evidence_jobs_v1
 set phase='REVIEW_CLAIMED',review_claim_id=gen_random_uuid(),
  review_worker_run_id=p_worker_run_id,
  review_claimed_at=clock_timestamp()
 where job_id=j.job_id returning * into j;
 return pg_catalog.jsonb_build_object(
  'status','INDEPENDENT_SOURCE_RECHECK_SIGNED_CLAIMED',
  'job_id',j.job_id,'source_ref',j.source_ref,
  'owner_id',j.owner_id,'shift_id',j.shift_id,
  'review_claim_id',j.review_claim_id,
  'review_worker_run_id',p_worker_run_id,
  'original_execution_worker_run_id',j.execution_worker_run_id,
  'source_sha256_to_verify',j.first_source_proof_sha256,
  'deliverable_receipt_sha256',j.deliverable_receipt_sha256,
  'installation_authorized',false,'production_changed',false);
end $fn$;

create or replace function public.reality_record_qualified_employee_evidence_review_v1(
 p_job_id uuid,p_review_claim_id uuid,p_worker_run_id uuid,
 p_source_ref text,p_provider_sha256 text,p_provider_checked_at timestamptz)
returns jsonb language plpgsql security invoker set search_path to '' as $fn$
declare j reality_internal.owner_qualified_employee_evidence_jobs_v1%rowtype;
 receipt text;verdict text;
begin
 if current_user<>'service_role' or p_job_id is null or
 p_review_claim_id is null or p_worker_run_id is null or
 p_provider_sha256 !~ '^sha256:[a-f0-9]{64}$' or
 p_provider_checked_at is null or
 p_provider_checked_at<clock_timestamp()-interval '3 minutes' or
 p_provider_checked_at>clock_timestamp()+interval '1 minute'
 then raise exception 'INDEPENDENT_SOURCE_REVIEW_EVIDENCE_REQUIRED';end if;
 select * into j from reality_internal.owner_qualified_employee_evidence_jobs_v1
 where job_id=p_job_id and phase='REVIEW_CLAIMED'
  and review_claim_id=p_review_claim_id
  and review_worker_run_id=p_worker_run_id
  and execution_worker_run_id<>p_worker_run_id
  and source_ref=p_source_ref for update;
 if not found then raise exception 'INDEPENDENT_SOURCE_REVIEW_LEASE_NOT_CURRENT';end if;
 if not exists(select 1 from reality_internal.signed_worker_actual_runs_v1 r
   where r.run_id=p_worker_run_id and r.status='STARTED'
    and r.started_at>=j.review_claimed_at-interval '3 minutes') or
  not exists(select 1 from reality_internal.signed_worker_actual_runs_v1 r
   where r.run_id=j.execution_worker_run_id and r.status='COMPLETED'
    and r.finished_at>=j.execution_completed_at)
 then raise exception 'TWO_DISTINCT_SIGNED_WORKER_PROCESSES_REQUIRED';end if;
 verdict:=case when j.first_source_proof_sha256=p_provider_sha256
  then 'COMPLETED_INDEPENDENTLY_VERIFIED'
  else 'BLOCKED_SOURCE_CHANGED' end;
 receipt:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to(j.job_id::text||':'||j.deliverable_receipt_sha256||
   ':'||j.execution_worker_run_id::text||':'||p_worker_run_id::text||
   ':'||p_provider_sha256||':'||verdict,'UTF8')),'hex');
 update reality_internal.owner_qualified_employee_evidence_jobs_v1
 set phase=verdict,
  reviewed_source_sha256=p_provider_sha256,
  verified_at=clock_timestamp(),
  independent_receipt_sha256=receipt,
  blocker=case when verdict='BLOCKED_SOURCE_CHANGED'
   then 'CURRENT_GITHUB_SOURCE_CHANGED_BETWEEN_SIGNED_WORKERS' else null end
 where job_id=j.job_id;
 return pg_catalog.jsonb_build_object(
  'status',case when verdict='COMPLETED_INDEPENDENTLY_VERIFIED'
   then 'QUALIFIED_SOURCE_EVIDENCE_JOB_INDEPENDENTLY_COMPLETED'
   else 'QUALIFIED_SOURCE_EVIDENCE_SOURCE_CHANGED_NO_COMPLETION' end,
  'job_id',j.job_id,'owner_id',j.owner_id,'shift_id',j.shift_id,
  'source_ref',j.source_ref,
  'independent_receipt_sha256',receipt,
  'evidence_job_completed',verdict='COMPLETED_INDEPENDENTLY_VERIFIED',
  'original_customer_job_completed',false,
  'code_repair_installed',false,'installation_authorized',false,
  'production_changed',false);
end $fn$;

create or replace function reality_internal.reconcile_qualified_employee_evidence_claims_v1()
returns text language plpgsql security invoker set search_path to '' as $fn$
declare n int;
begin
 if current_user<>'postgres' then raise exception
  'QUALIFIED_WORK_CLAIM_WATCHDOG_ROLE_REQUIRED';end if;
 update reality_internal.owner_qualified_employee_evidence_jobs_v1
 set phase='BLOCKED_PROVIDER_OR_WORKER_EVIDENCE',
  blocker='SIGNED_WORKER_EVIDENCE_CLAIM_EXPIRED_WITHOUT_RECEIPT'
 where phase='EXECUTION_CLAIMED'
  and execution_claimed_at<clock_timestamp()-interval '5 minutes';
 get diagnostics n=row_count;
 update reality_internal.owner_qualified_employee_evidence_jobs_v1
 set phase='BLOCKED_PROVIDER_OR_WORKER_EVIDENCE',
  blocker='INDEPENDENT_SIGNED_WORKER_REVIEW_CLAIM_EXPIRED'
 where phase='REVIEW_CLAIMED'
  and review_claimed_at<clock_timestamp()-interval '5 minutes';
 return 'QUALIFIED_EMPLOYEE_EVIDENCE_STALE_CLAIMS_FENCED_'||n;
end $fn$;

create or replace function public.reality_read_owner_qualified_employee_evidence_jobs_v1(
 p_owner_id uuid)
returns jsonb language plpgsql security invoker set search_path to '' as $fn$
declare counts jsonb; items jsonb;
begin
 if current_user<>'service_role' or p_owner_id is null then
  raise exception 'QUALIFIED_EVIDENCE_WORK_OWNER_SERVICE_REQUIRED';end if;
 select pg_catalog.jsonb_build_object(
  'qualified_executable',count(*) filter(where phase='QUALIFIED_EXECUTABLE'),
  'executing',count(*) filter(where phase in ('EXECUTION_CLAIMED','REVIEW_CLAIMED')),
  'pending_independent_verification',count(*) filter(where phase='SUBMITTED_AWAITING_INDEPENDENT_RECHECK'),
  'independently_completed',count(*) filter(where phase='COMPLETED_INDEPENDENTLY_VERIFIED'),
  'blocked',count(*) filter(where phase like 'BLOCKED_%'),
  'total',count(*)
 ) into counts
 from reality_internal.owner_qualified_employee_evidence_jobs_v1
 where owner_id=p_owner_id;
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'job_id',j.job_id,'shift_id',j.shift_id,'employee',j.employee,
  'job_type',j.job_type,'source_ref',j.source_ref,
  'objective',j.objective,'phase',j.phase,
  'qualification_receipt_sha256',j.qualification_receipt_sha256,
  'deliverable_receipt_sha256',j.deliverable_receipt_sha256,
  'independent_receipt_sha256',j.independent_receipt_sha256,
  'deliverable',j.deliverable,'blocker',j.blocker,
  'execution_worker_run_id',j.execution_worker_run_id,
  'review_worker_run_id',j.review_worker_run_id,
  'qualified_at',j.qualified_at,'verified_at',j.verified_at,
  'evidence_job_completed',j.phase='COMPLETED_INDEPENDENTLY_VERIFIED',
  'original_customer_job_completed',false,
  'code_repair_installed',false,'production_changed',false
 ) order by j.qualified_at desc),'[]'::jsonb) into items from(
  select * from reality_internal.owner_qualified_employee_evidence_jobs_v1
  where owner_id=p_owner_id order by qualified_at desc limit 12
 ) j;
 return pg_catalog.jsonb_build_object(
  'status','OWNER_SOURCE_QUALIFIED_EMPLOYEE_WORK_READ_ONLY',
  'owner_id',p_owner_id,'owner_scope_verified',true,'read_only',true,
  'counts',counts,'items',items,'installation_authorized_by_read',false,
  'original_customer_job_completed_by_read',false,'production_changed',false);
end $fn$;
revoke all on function public.reality_claim_next_qualified_employee_evidence_job_v1(uuid,uuid) from public,anon,authenticated;
revoke all on function public.reality_record_qualified_employee_evidence_job_v1(
 uuid,uuid,uuid,text,text,timestamptz,timestamptz,text,text) from public,anon,authenticated;
revoke all on function public.reality_claim_qualified_employee_evidence_review_v1(uuid,uuid) from public,anon,authenticated;
revoke all on function public.reality_record_qualified_employee_evidence_review_v1(
 uuid,uuid,uuid,text,text,timestamptz) from public,anon,authenticated;
revoke all on function public.reality_read_owner_qualified_employee_evidence_jobs_v1(uuid) from public,anon,authenticated;
grant execute on function public.reality_claim_next_qualified_employee_evidence_job_v1(uuid,uuid) to service_role;
grant execute on function public.reality_record_qualified_employee_evidence_job_v1(
 uuid,uuid,uuid,text,text,timestamptz,timestamptz,text,text) to service_role;
grant execute on function public.reality_claim_qualified_employee_evidence_review_v1(uuid,uuid) to service_role;
grant execute on function public.reality_record_qualified_employee_evidence_review_v1(
 uuid,uuid,uuid,text,text,timestamptz) to service_role;
grant execute on function public.reality_read_owner_qualified_employee_evidence_jobs_v1(uuid) to service_role;

-- Existing signed watchdog and worker only; no new trust/cron transport.
do $install$
declare watchdog_id bigint;wd text; wake_id bigint;wc text;
 anchor text:='where (eligible_shift.permitted';
 extra text:=$e$
 or exists(
  select 1 from reality_internal.owner_qualified_employee_evidence_jobs_v1 work
  join reality_internal.governed_employee_shifts_v1 s
   on s.shift_id=work.shift_id and s.owner_id=work.owner_id
  where work.phase in ('QUALIFIED_EXECUTABLE',
   'SUBMITTED_AWAITING_INDEPENDENT_RECHECK')
   and s.authorized_at is not null and s.closed_at is null
   and s.planned_start_at<=clock_timestamp()
   and s.planned_end_at>clock_timestamp()
 )
$e$;
begin
 select j.jobid,j.command into strict watchdog_id,wd
 from cron.job j where j.jobname='reality-governed-wake-watchdog-v1'
 and j.active=true and j.schedule='* * * * *'
 and j.command like '%observe_owner_shift_continuity_stalls_v1%';
 if position('qualify_owner_employee_evidence_jobs_v1' in wd)=0 then
  perform cron.alter_job(watchdog_id,command=>wd||
   E'\nSELECT reality_internal.qualify_owner_employee_evidence_jobs_v1();'||
   E'\nSELECT reality_internal.reconcile_qualified_employee_evidence_claims_v1();');
 end if;
 select j.jobid,j.command into strict wake_id,wc from cron.job j
 where j.jobname='reality-riley-preview-original-execution-wake-v1'
 and j.active=true and j.schedule='* * * * *'
 and j.command like '%credential.worker_token%'
 and j.command like '%credential.vercel_bypass%'
 and j.command like '%net.http_post%'
 and j.command not like '%public.reality_read_owner_capability_gap_feed_v1%';
 if position('owner_qualified_employee_evidence_jobs_v1 work' in wc)=0 then
  if length(wc)-length(replace(wc,anchor,''))<>length(anchor)
  then raise exception 'QUALIFIED_EVIDENCE_SIGNED_WAKE_ANCHOR_NOT_UNIQUE';end if;
  perform cron.alter_job(wake_id,command=>replace(wc,anchor,anchor||
   E'\n'||extra));
 end if;
end $install$;
