-- Reality: an authorized shift with eligible work must never silently stop.
-- These independent, source-bound observations are NOT repair authorizations.
create table if not exists reality_internal.owner_shift_continuity_incidents_v1(
 incident_id uuid primary key default gen_random_uuid(),
 owner_id uuid not null,
 shift_id uuid not null references reality_internal.governed_employee_shifts_v1(shift_id),
 kind text not null check(kind in (
  'ELIGIBLE_WORK_NO_DISPATCH','EMPLOYEE_INQUIRY_CLAIM_STALE'
 )),
 evidence_key text not null check(evidence_key ~ '^[a-f0-9]{64}$'),
 source_claim_id uuid,
 first_detected_at timestamptz not null default clock_timestamp(),
 last_observed_at timestamptz not null default clock_timestamp(),
 observation_count integer not null default 1 check(observation_count between 1 and 100000),
 phase text not null default 'DETECTED' check(phase in (
  'DETECTED','INVESTIGATION_CLAIMED',
  'INVESTIGATION_RECORDED_NEEDS_INDEPENDENT_PROOF',
  'BLOCKED_NEEDS_EVIDENCE','RECOVERED_AFTER_OBSERVATION'
 )),
 error_summary text not null check(length(error_summary) between 20 and 280),
 evidence_sha256 text not null check(evidence_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 investigation_lease_id uuid,
 model_response_id text,
 assigned_employee text,
 assigned_function_id text,
 independent_reviewer text,
 reviewer_function_id text,
 diagnosis text,
 proposed_upgrade text,
 independent_test_requirement text,
 limitations text,
 investigation_receipt_sha256 text check(
  investigation_receipt_sha256 is null or
  investigation_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 investigated_at timestamptz,
 recovered_at timestamptz,
 recovery_receipt_sha256 text check(
  recovery_receipt_sha256 is null or
  recovery_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 repair_executed boolean not null default false check(repair_executed=false),
 installation_authorized boolean not null default false check(installation_authorized=false),
 production_changed boolean not null default false check(production_changed=false),
 unique(owner_id,shift_id,kind,evidence_key),
 check ((phase='INVESTIGATION_RECORDED_NEEDS_INDEPENDENT_PROOF')=(
  investigation_receipt_sha256 is not null))
);
alter table reality_internal.owner_shift_continuity_incidents_v1 enable row level security;
revoke all on reality_internal.owner_shift_continuity_incidents_v1
 from public,anon,authenticated;
grant select,insert,update on reality_internal.owner_shift_continuity_incidents_v1 to service_role;
create index if not exists owner_shift_continuity_incidents_next_v1
 on reality_internal.owner_shift_continuity_incidents_v1(phase,last_observed_at);

create or replace function reality_internal.observe_owner_shift_continuity_stalls_v1()
returns text language plpgsql security invoker set search_path to '' as $fn$
declare s record; claimed record;
 now_at timestamptz:=clock_timestamp();
 dispatch_count int; no_dispatch_count int;
 fresh_worker timestamptz; due_count int;
 key text; proof text; seen_count int:=0;
begin
 if current_user<>'postgres' then
  raise exception 'SHIFT_STALL_WATCHDOG_POSTGRES_REQUIRED';end if;
 -- Skip a shift that is closed, expired or not yet started. The absence of
 -- ordinary work is NOT itself a failure.
 for s in
  select shift_id,owner_id,planned_end_at from
    reality_internal.governed_employee_shifts_v1
  where authorized_at is not null and closed_at is null
   and status in ('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
   and planned_start_at<=now_at and planned_end_at>now_at
   and authorized_at<now_at-interval '5 minutes'
 loop
  -- A stale claimed model inquiry has a durable claim identity and timestamp,
  -- unlike speculative agent prose. Each unique source claim is singleflight.
  for claimed in
   select claim_id,employee,source_ref,claimed_at
   from reality_internal.employee_temporal_inquiries_v1
   where owner_id=s.owner_id and phase='CLAIMED' and finished_at is null
    and claimed_at<now_at-interval '4 minutes'
    and claimed_at>=now_at-interval '24 hours'
   order by claimed_at limit 15
  loop
   key:=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
    s.shift_id::text||':STALE_CLAIM:'||claimed.claim_id::text,'UTF8')),'hex');
   proof:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
    pg_catalog.convert_to(
     s.shift_id::text||':'||claimed.claim_id::text||':'||
     claimed.source_ref||':'||claimed.claimed_at::text,'UTF8')),'hex');
   insert into reality_internal.owner_shift_continuity_incidents_v1(
    owner_id,shift_id,kind,evidence_key,source_claim_id,
    error_summary,evidence_sha256)
   values(s.owner_id,s.shift_id,'EMPLOYEE_INQUIRY_CLAIM_STALE',
    key,claimed.claim_id,
    'A signed employee investigation remained CLAIMED beyond its bounded worker window.',
    proof)
   on conflict(owner_id,shift_id,kind,evidence_key)
   do update set last_observed_at=now_at,
    observation_count=least(
     reality_internal.owner_shift_continuity_incidents_v1.observation_count+1,100000)
   where reality_internal.owner_shift_continuity_incidents_v1.phase='DETECTED';
   seen_count:=seen_count+1;
  end loop;
  -- Observe the exact same eligible source inventory the signed worker uses.
  -- Three consecutive cron SQL "0 rows" with no worker for four minutes
  -- are positive evidence of a dispatch gap, not a failure guessed by AI.
  select count(*) into due_count
  from reality_internal.employee_discovery_observations_v1 o
  join reality_internal.employee_discovery_role_coverage_v1 c
   on c.owner_id=o.owner_id and c.employee=o.employee
  where o.owner_id=s.owner_id
   and o.disposition in ('NEEDS_CURRENT_VALIDATION',
                         'HISTORICAL_REVALIDATION_REQUIRED')
   and o.qualified_job_created=false and o.shift_authorized=false
   and o.installation_authorized=false and o.production_changed=false
   and c.execution_authorized=false and c.qualified_jobs=0
   and c.checked_at>=now_at-interval '12 hours'
   and o.last_reconciled_at>=now_at-interval '12 hours'
   and o.evidence_sha256 ~ '^sha256:[a-f0-9]{64}$'
   and (o.source_ref ~
     '^https://github[.]com/[^/]+/[^/]+/issues/[1-9][0-9]*$'
     or o.source_ref ~
     '^https://github[.]com/[^/]+/[^/]+/pull/[1-9][0-9]*$')
   and not exists(
    select 1 from reality_internal.employee_temporal_inquiries_v1 t
    where t.owner_id=o.owner_id and t.employee=o.employee
      and t.source_ref=o.source_ref
      and t.evidence_sha256=o.evidence_sha256
   );
  if due_count=0 then continue;end if;
  select max(started_at) into fresh_worker
  from reality_internal.signed_worker_actual_runs_v1
  where started_at <=now_at;
  if fresh_worker is not null and fresh_worker>now_at-interval '4 minutes'
  then continue;end if;
  select count(*),count(*) filter(where q.status='succeeded'
   and q.return_message='0 rows')
  into dispatch_count,no_dispatch_count from (
   select status,return_message,start_time
   from cron.job_run_details
   where jobid=7 and start_time<=now_at
      and start_time>now_at-interval '4 minutes'
   order by runid desc limit 3
  ) q;
  if dispatch_count<>3 or no_dispatch_count<>3 then continue;end if;
  key:=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
   s.shift_id::text||':UNDISPATCHED_ELIGIBLE_WORK','UTF8')),'hex');
  proof:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
   pg_catalog.convert_to(
    s.shift_id::text||':DUE:'||due_count::text||
    ':LAST_WORKER:'||coalesce(fresh_worker::text,'NONE')||
    ':CRON_ZERO_ROWS_3_OF_3','UTF8')),'hex');
  insert into reality_internal.owner_shift_continuity_incidents_v1(
   owner_id,shift_id,kind,evidence_key,error_summary,evidence_sha256)
  values(s.owner_id,s.shift_id,'ELIGIBLE_WORK_NO_DISPATCH',key,
   'The signed preview shift has eligible employee work but three cron checks queued zero worker requests.',
   proof)
  on conflict(owner_id,shift_id,kind,evidence_key)
  do update set last_observed_at=now_at,
   observation_count=least(
    reality_internal.owner_shift_continuity_incidents_v1.observation_count+1,100000)
  where reality_internal.owner_shift_continuity_incidents_v1.phase='DETECTED';
  seen_count:=seen_count+1;
 end loop;
 return 'SOURCE_BACKED_SHIFT_CONTINUITY_INCIDENTS_OBSERVED_'||seen_count;
end $fn$;

-- The signed worker may automatically investigate a durable, currently
-- authorized owner's incident, but may NOT create a new job or install code.
create or replace function public.reality_claim_next_shift_continuity_investigation_v1(
 p_shift_id uuid)
returns jsonb language plpgsql security invoker set search_path to '' as $fn$
declare i reality_internal.owner_shift_continuity_incidents_v1%rowtype;
 s record;
begin
 if current_user<>'service_role' or p_shift_id is null then
  raise exception 'CONTINUITY_INVESTIGATION_SIGNED_SERVICE_REQUIRED';end if;
 select a.owner_id,a.shift_id into s
 from reality_internal.governed_employee_shifts_v1 a
 join reality_internal.governed_employee_shift_worker_pulses_v1 wake
  on wake.shift_id=a.shift_id and wake.owner_id=a.owner_id
 where a.shift_id=p_shift_id and a.status in
   ('RUNNING','QUEUED','AWAITING_EXACT_ORIGINAL_WORK')
   and a.closed_at is null and a.authorized_at is not null
   and a.planned_start_at<=clock_timestamp()
   and a.planned_end_at>clock_timestamp()
   and wake.last_worker_status='WAKE_RECEIVED'
   and wake.last_worker_seen_at>clock_timestamp()-interval '3 minutes';
 if not found then return pg_catalog.jsonb_build_object(
  'status','NO_CURRENT_SIGNED_SHIFT_CONTINUITY_SCOPE',
  'model_inquiry_authorized',false,'execution_authorized',false,
  'installation_authorized',false,'production_changed',false);end if;
 select * into i from reality_internal.owner_shift_continuity_incidents_v1
 where shift_id=p_shift_id and owner_id=s.owner_id and phase='DETECTED'
 order by first_detected_at limit 1 for update skip locked;
 if not found then return pg_catalog.jsonb_build_object(
  'status','NO_DETECTED_SHIFT_CONTINUITY_INCIDENT',
  'model_inquiry_authorized',false,'execution_authorized',false,
  'installation_authorized',false,'production_changed',false);end if;
 update reality_internal.owner_shift_continuity_incidents_v1
 set phase='INVESTIGATION_CLAIMED',investigation_lease_id=gen_random_uuid()
 where incident_id=i.incident_id returning * into i;
 return pg_catalog.jsonb_build_object(
  'status','SIGNED_SHIFT_CONTINUITY_INVESTIGATION_CLAIMED',
  'owner_id',i.owner_id,'shift_id',i.shift_id,
  'incident_id',i.incident_id,'lease_id',i.investigation_lease_id,
  'kind',i.kind,'source_claim_id',i.source_claim_id,
  'error_summary',i.error_summary,'evidence_sha256',i.evidence_sha256,
  'first_detected_at',i.first_detected_at,
  'scope','SOURCE_BACKED_SHIFT_FAILURE_INVESTIGATION_ONLY',
  'model_inquiry_authorized',true,'new_original_jobs_created',0,
  'execution_authorized',false,'installation_authorized',false,
  'production_changed',false);
end $fn$;

create or replace function public.reality_record_shift_continuity_investigation_v1(
 p_owner_id uuid,p_shift_id uuid,p_incident_id uuid,p_lease_id uuid,
 p_evidence_sha256 text,p_function_id text,p_employee text,
 p_reviewer_function_id text,p_reviewer text,p_diagnosis text,
 p_proposed_upgrade text,p_independent_test_requirement text,
 p_limitations text,p_model_response_id text)
returns jsonb language plpgsql security invoker set search_path to '' as $fn$
declare i reality_internal.owner_shift_continuity_incidents_v1%rowtype;
 proof jsonb;hash text;
begin
 if current_user<>'service_role' or
  p_owner_id is null or p_shift_id is null or
  p_incident_id is null or p_lease_id is null or
  p_evidence_sha256 !~ '^sha256:[a-f0-9]{64}$' or
  p_function_id !~ '^[a-z][a-z0-9_]{2,95}$' or
  p_reviewer_function_id !~ '^[a-z][a-z0-9_]{2,95}$' or
  p_function_id=p_reviewer_function_id or
  length(trim(coalesce(p_employee,''))) not between 2 and 100 or
  length(trim(coalesce(p_reviewer,''))) not between 2 and 100 or
  p_employee=p_reviewer or
  length(trim(coalesce(p_diagnosis,''))) not between 30 and 1500 or
  length(trim(coalesce(p_proposed_upgrade,''))) not between 30 and 1600 or
  length(trim(coalesce(p_independent_test_requirement,''))) not between 30 and 1600 or
  length(trim(coalesce(p_limitations,''))) not between 20 and 1200 or
  p_model_response_id !~ '^resp_[A-Za-z0-9_-]{4,160}$'
 then raise exception 'CONTINUITY_INVESTIGATION_EXACT_SOURCE_PROOF_REQUIRED';end if;
 select * into i from reality_internal.owner_shift_continuity_incidents_v1
 where incident_id=p_incident_id and owner_id=p_owner_id
  and shift_id=p_shift_id and investigation_lease_id=p_lease_id
  and evidence_sha256=p_evidence_sha256 and phase='INVESTIGATION_CLAIMED'
 for update;
 if not found then raise exception 'CONTINUITY_INCIDENT_CLAIM_STALE';end if;
 proof:=pg_catalog.jsonb_build_object(
  'owner_id',i.owner_id,'incident_id',i.incident_id,
  'evidence_sha256',i.evidence_sha256,
  'model_response_id',p_model_response_id,
  'assigned_employee',p_employee,'reviewer',p_reviewer,
  'diagnosis',p_diagnosis,'proposed_upgrade',p_proposed_upgrade,
  'required_independent_test',p_independent_test_requirement,
  'limitations',p_limitations,
  'new_original_jobs_created',0,'installation_authorized',false);
 hash:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to(proof::text,'UTF8')),'hex');
 update reality_internal.owner_shift_continuity_incidents_v1
 set phase='INVESTIGATION_RECORDED_NEEDS_INDEPENDENT_PROOF',
  assigned_employee=p_employee,assigned_function_id=p_function_id,
  independent_reviewer=p_reviewer,reviewer_function_id=p_reviewer_function_id,
  diagnosis=p_diagnosis,proposed_upgrade=p_proposed_upgrade,
  independent_test_requirement=p_independent_test_requirement,
  limitations=p_limitations,model_response_id=p_model_response_id,
  investigation_receipt_sha256=hash,investigated_at=clock_timestamp()
 where incident_id=i.incident_id and phase='INVESTIGATION_CLAIMED'
 returning * into i;
 return pg_catalog.jsonb_build_object(
  'status','SHIFT_CONTINUITY_INVESTIGATION_RECORDED',
  'owner_id',i.owner_id,'shift_id',i.shift_id,'incident_id',i.incident_id,
  'assigned_employee',i.assigned_employee,
  'independent_reviewer',i.independent_reviewer,
  'investigation_receipt_sha256',i.investigation_receipt_sha256,
  'independent_repair_verified',false,
  'new_original_jobs_created',0,'execution_authorized',false,
  'installation_authorized',false,'production_changed',false);
end $fn$;

create or replace function public.reality_block_shift_continuity_investigation_v1(
 p_owner_id uuid,p_incident_id uuid,p_lease_id uuid,p_reason text)
returns jsonb language plpgsql security invoker set search_path to '' as $fn$
begin
 if current_user<>'service_role' or p_owner_id is null
   or p_incident_id is null or p_lease_id is null
   or p_reason not in ('INDEPENDENT_SOURCE_UNAVAILABLE','MODEL_PROOF_UNAVAILABLE')
 then raise exception 'CONTINUITY_INVESTIGATION_BLOCKED_EXACT_OWNER_REQUIRED';end if;
 update reality_internal.owner_shift_continuity_incidents_v1
 set phase='BLOCKED_NEEDS_EVIDENCE',limitations=p_reason
 where owner_id=p_owner_id and incident_id=p_incident_id
  and investigation_lease_id=p_lease_id and phase='INVESTIGATION_CLAIMED';
 return pg_catalog.jsonb_build_object(
  'status','CONTINUITY_INVESTIGATION_BLOCKED_NEEDS_PROOF',
  'execution_authorized',false,'installation_authorized',false,
  'production_changed',false);
end $fn$;
create or replace function reality_internal.reconcile_shift_continuity_investigation_claims_v1()
returns text language plpgsql security invoker set search_path to '' as $fn$
declare n integer;
begin
 if current_user<>'postgres' then raise exception
  'SHIFT_CONTINUITY_CLAIM_WATCHDOG_REQUIRED';end if;
 update reality_internal.owner_shift_continuity_incidents_v1
 set phase='BLOCKED_NEEDS_EVIDENCE',limitations='SIGNED_WORKER_OR_MODEL_RECEIPT_MISSING'
 where phase='INVESTIGATION_CLAIMED'
  and last_observed_at<clock_timestamp()-interval '8 minutes';
 get diagnostics n=row_count;
 return 'SHIFT_CONTINUITY_INQUIRY_CLAIMS_FENCED_'||n;
end $fn$;

create or replace function public.reality_read_owner_shift_continuity_incidents_v1(
 p_owner_id uuid)
returns jsonb language plpgsql security invoker set search_path to '' as $fn$
declare rows jsonb;
begin
 if current_user<>'service_role' or p_owner_id is null then
  raise exception 'SHIFT_CONTINUITY_READ_EXACT_OWNER_REQUIRED';end if;
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'incident_id',i.incident_id,'shift_id',i.shift_id,'kind',i.kind,
  'phase',i.phase,'error_summary',i.error_summary,
  'evidence_sha256',i.evidence_sha256,'first_detected_at',i.first_detected_at,
  'last_observed_at',i.last_observed_at,
  'assigned_employee',i.assigned_employee,
  'independent_reviewer',i.independent_reviewer,
  'diagnosis',i.diagnosis,
  'proposed_upgrade',i.proposed_upgrade,
  'independent_test_requirement',i.independent_test_requirement,
  'limitations',i.limitations,
  'investigation_receipt_sha256',i.investigation_receipt_sha256,
  'repair_executed',i.repair_executed,
  'installation_authorized',i.installation_authorized,
  'production_changed',i.production_changed,
  'next_action',case
   when i.phase='DETECTED' then
    'Reality detected stalled authorized work. An employee investigation will be claimed on the next signed worker wake.'
   when i.phase='INVESTIGATION_CLAIMED' then
    'Reality is investigating its observed stall; independent repair proof is still required.'
   when i.phase='INVESTIGATION_RECORDED_NEEDS_INDEPENDENT_PROOF' then
    'The assigned employee proposed a diagnosis and capability improvement. The separate reviewer must reproduce the failure and independently test the proposed repair under an existing valid warrant before an installation.'
   when i.phase='BLOCKED_NEEDS_EVIDENCE' then
    'The investigation could not establish required proof; preserve the original shift and request the exact missing evidence or authority.'
   else
    'Work resumed with independent evidence. The observed recovery does not by itself demonstrate that Reality repaired its own code.'
  end
 ) order by i.last_observed_at desc),'[]'::jsonb)
 into rows from(
  select * from reality_internal.owner_shift_continuity_incidents_v1
  where owner_id=p_owner_id order by last_observed_at desc limit 8
 ) i;
 return pg_catalog.jsonb_build_object(
  'status','OWNER_SHIFT_CONTINUITY_INCIDENTS_READ_ONLY',
  'owner_id',p_owner_id,'owner_scope_verified',true,'read_only',true,
  'items',rows,'count',pg_catalog.jsonb_array_length(rows),
  'execution_authorized',false,'installation_authorized',false,
  'production_changed',false,'self_repair_proven',false);
end $fn$;
revoke execute on function public.reality_claim_next_shift_continuity_investigation_v1(uuid)
 from public,anon,authenticated;
revoke execute on function public.reality_record_shift_continuity_investigation_v1(
 uuid,uuid,uuid,uuid,text,text,text,text,text,text,text,text,text,text)
 from public,anon,authenticated;
revoke execute on function public.reality_block_shift_continuity_investigation_v1(
 uuid,uuid,uuid,text) from public,anon,authenticated;
revoke execute on function public.reality_read_owner_shift_continuity_incidents_v1(uuid)
 from public,anon,authenticated;
grant execute on function public.reality_claim_next_shift_continuity_investigation_v1(uuid)
 to service_role;
grant execute on function public.reality_record_shift_continuity_investigation_v1(
 uuid,uuid,uuid,uuid,text,text,text,text,text,text,text,text,text,text)
 to service_role;
grant execute on function public.reality_block_shift_continuity_investigation_v1(uuid,uuid,uuid,text)
 to service_role;
grant execute on function public.reality_read_owner_shift_continuity_incidents_v1(uuid)
 to service_role;

-- Existing one-minute watchdog + existing signed worker. Never create a second cron.
do $cron$
declare watchdog_id bigint;wake_id bigint;
 wd text;wc text;new_wake text;
 anchor text:='where (eligible_shift.permitted';
 extra text:=$extra$
 or exists(
  select 1 from reality_internal.owner_shift_continuity_incidents_v1 incident
  join reality_internal.governed_employee_shifts_v1 shift
   on shift.shift_id=incident.shift_id and shift.owner_id=incident.owner_id
  where incident.phase='DETECTED' and shift.authorized_at is not null
   and shift.closed_at is null
   and shift.planned_start_at<=clock_timestamp()
   and shift.planned_end_at>clock_timestamp()
 )
$extra$;
begin
 select jobid,command into strict watchdog_id,wd from cron.job
 where jobname='reality-governed-wake-watchdog-v1'
  and active=true and schedule='* * * * *'
  and command like '%watchdog_guarded_preview_self_repair_v1%';
 if position('observe_owner_shift_continuity_stalls_v1' in wd)=0 then
  perform cron.alter_job(watchdog_id,command=>wd||
   E'\nSELECT reality_internal.observe_owner_shift_continuity_stalls_v1();'||
   E'\nSELECT reality_internal.reconcile_shift_continuity_investigation_claims_v1();');
 end if;
 select jobid,command into strict wake_id,wc from cron.job
 where jobname='reality-riley-preview-original-execution-wake-v1'
 and active=true and schedule='* * * * *'
 and command like '%credential.worker_token%'
 and command like '%credential.vercel_bypass%'
 and command like '%employee_discovery_role_coverage_v1 c%'
 and command not like '%public.reality_read_owner_capability_gap_feed_v1%';
 if position('owner_shift_continuity_incidents_v1 incident' in wc)=0 then
  if length(wc)-length(replace(wc,anchor,''))<>length(anchor)
  then raise exception 'STALL_WAKE_SIGNED_WORKER_ANCHOR_DRIFT';end if;
  new_wake:=replace(wc,anchor,anchor||E'\n'||extra);
  if position('credential.worker_token' in new_wake)=0 or
   position('credential.vercel_bypass' in new_wake)=0 or
   position('net.http_post' in new_wake)=0
  then raise exception 'STALL_WAKE_EXACT_SIGNED_TRANSPORT_NOT_VERIFIED';end if;
  perform cron.alter_job(wake_id,command=>new_wake);
 end if;
end $cron$;
