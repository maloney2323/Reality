-- A watchdog-contained, deterministic remediation for the ACTUAL preview
-- scheduler service-role mismatch. This owns ONLY the known-bad SQL clause;
-- arbitrary LLM-written patches, external deployments and production changes
-- remain prohibited. Recovery is not complete until the real worker attests.
create table if not exists reality_internal.preview_worker_auto_repairs_v1(
 repair_id uuid primary key default gen_random_uuid(),
 owner_id uuid not null,
 incident_id uuid not null references
  reality_internal.owner_worker_recovery_incidents_v1(incident_id),
 failed_runid bigint not null,
 repair_kind text not null check(repair_kind=
  'EXACT_PREVIEW_SCHEDULER_OWNER_FEED_ROLE_MISMATCH'),
 phase text not null check(phase in (
  'PATCH_APPLIED_AWAITING_WORKER',
  'WORKER_ATTESTED_AWAITING_ORIGINAL',
  'INDEPENDENT_WORKER_AND_ORIGINAL_VERIFIED',
  'BLOCKED_UNRECOGNIZED_SCOPE',
  'BLOCKED_EVIDENCE_OR_WORKER_MISSING')),
 before_sha256 text not null check(before_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 after_sha256 text check(after_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 repair_receipt_sha256 text not null
  check(repair_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 original_capability_claim_id uuid,
 original_work_receipt_sha256 text
  check(original_work_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 worker_run_id uuid,
 scope_verified boolean not null,
 preview_only boolean not null default true
   check(preview_only=true),
 production_changed boolean not null default false
   check(production_changed=false),
 repair_applied_at timestamptz,
 verified_at timestamptz,
 last_checked_at timestamptz not null default clock_timestamp(),
 blocker text,
 unique(incident_id,failed_runid)
);
alter table reality_internal.preview_worker_auto_repairs_v1 enable row level security;
revoke all on reality_internal.preview_worker_auto_repairs_v1 from public,anon,authenticated;
grant select,insert,update on reality_internal.preview_worker_auto_repairs_v1 to service_role;
create index if not exists preview_worker_auto_repairs_active_v1
 on reality_internal.preview_worker_auto_repairs_v1(phase,last_checked_at);

-- Not SECURITY DEFINER: only the existing trusted pg_cron execution role
-- may alter its OWN signed preview worker job. Client/data roles never execute.
create or replace function reality_internal.auto_repair_known_preview_worker_gate_v1()
returns text language plpgsql security invoker set search_path to '' as $fn$
declare
 v_bad text:=$bad$
 or exists(
  select 1
  from reality_internal.owner_routine_delegations_v1 g
  cross join lateral pg_catalog.jsonb_array_elements(
   public.reality_read_owner_capability_gap_feed_v1(g.owner_id)->'items'
  ) capability(value)
  where g.enabled=true
   and g.scope='EVIDENCE_ONLY_EMPLOYEE_DISCOVERY_V1'
   and g.expires_at>clock_timestamp()
   and (case when g.daily_date=current_date
     then g.daily_reserved else 0 end)<g.max_daily_inquiries
   and capability.value->>'executable_job'='false'
   and capability.value->>'installation_authorized'='false'
   and capability.value->>'verified_missing_capability'='false'
   and capability.value->>'kind' in
    ('RESEARCH_OPPORTUNITY','INDEPENDENTLY_TESTED_CANDIDATE',
     'FROZEN_UNBOUND_SOURCE','VERIFIED_SOURCE_CANDIDATE')
   and length(capability.value->>'key') between 3 and 180
   and length(capability.value->>'title') between 8 and 240
   and capability.value->>'source_url' ~ '^https://'
   and not exists(
    select 1 from reality_internal.owner_capability_employee_schedule_v1 already
    where already.owner_id=g.owner_id
     and already.capability_key=capability.value->>'key'
     and already.evidence_fingerprint=pg_catalog.encode(
      pg_catalog.sha256(pg_catalog.convert_to(
       capability.value::text,'UTF8')),'hex')
   )
 )
$bad$;
 v_good text:=$good$
 or exists (
  select 1 from reality_internal.owner_routine_delegations_v1 g
  where g.enabled=true
   and g.scope='EVIDENCE_ONLY_EMPLOYEE_DISCOVERY_V1'
   and g.expires_at>clock_timestamp()
   and (case when g.daily_date=current_date then g.daily_reserved else 0 end)<g.max_daily_inquiries
 )
$good$;
 d record; j record; incident record;
 before_hash text;after_hash text;receipt_hash text;
 next_command text;readback text;
BEGIN
 if current_user<>'postgres' then
  raise exception 'AUTO_REPAIR_TRUSTED_WATCHDOG_ROLE_REQUIRED';end if;
 -- Re-read the most recent physical cron failure, not a Chat-generated
 -- diagnosis, historical candidate or forged model claim.
 select d0.runid,d0.jobid,d0.status,d0.return_message,d0.start_time
 into d from cron.job_run_details d0 join cron.job j0 on j0.jobid=d0.jobid
 where j0.jobname='reality-riley-preview-original-execution-wake-v1'
 order by d0.runid desc limit 1;
 if not found or d.status<>'failed' or
    d.start_time<clock_timestamp()-interval '10 minutes' or
    d.return_message !~ '^ERROR:[[:space:]]+GAP_FEED_OWNER_SERVICE_ROLE_REQUIRED'
 then return 'NO_CURRENT_KNOWN_PREVIEW_WORKER_FAULT';end if;
 select * into j from cron.job
 where jobid=d.jobid and jobname='reality-riley-preview-original-execution-wake-v1'
  and active=true and schedule='* * * * *'
  and position('reality-git-reality-chat-dire-49b77a-maloney2323-5310s-projects.vercel.app' in command)>0
  and position('credential.worker_token' in command)>0
  and position('credential.vercel_bypass' in command)>0
  and position('eligible_shift.permitted' in command)>0
  and position('owner_routine_delegations_v1' in command)>0
  and position('net.http_post' in command)>0;
 if not found then return 'CURRENT_PREVIEW_WORKER_SCOPE_NOT_VERIFIED';end if;
 select i.incident_id,i.owner_id into incident
 from reality_internal.owner_worker_recovery_incidents_v1 i
 where i.cron_jobid=d.jobid
  and i.last_failed_runid=d.runid
  and i.error_summary='ERROR: GAP_FEED_OWNER_SERVICE_ROLE_REQUIRED'
  and i.phase <> 'OPERATIONAL_CONTINUITY_VERIFIED_EXTERNAL_FIX'
 order by i.last_observed_at desc limit 1;
 if not found then return 'WAITING_FOR_DURABLE_INDEPENDENT_INCIDENT_OBSERVATION';end if;
 if exists(select 1 from reality_internal.preview_worker_auto_repairs_v1 a
   where a.incident_id=incident.incident_id and a.failed_runid=d.runid)
 then return 'EXACT_PREVIEW_WORKER_REPAIR_ALREADY_ATTEMPTED';end if;
 before_hash:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to(j.command,'UTF8')),'hex');
 if position(v_bad in j.command)=0 or
  length(j.command)-length(replace(j.command,v_bad,''))<>length(v_bad) or
  position('public.reality_read_owner_capability_gap_feed_v1' in j.command)=0 then
  receipt_hash:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
   pg_catalog.convert_to(incident.incident_id::text||d.runid::text||
    before_hash||':BLOCKED_RECIPE_DRIFT','UTF8')),'hex');
  insert into reality_internal.preview_worker_auto_repairs_v1(
   owner_id,incident_id,failed_runid,repair_kind,phase,
   before_sha256,repair_receipt_sha256,scope_verified,blocker)
  values(incident.owner_id,incident.incident_id,d.runid,
   'EXACT_PREVIEW_SCHEDULER_OWNER_FEED_ROLE_MISMATCH',
   'BLOCKED_UNRECOGNIZED_SCOPE',before_hash,receipt_hash,false,
   'The current SQL no longer matches the independently reviewed exact repair recipe');
  return 'BLOCKED_UNRECOGNIZED_SIGNED_WORKER_RECIPE';
 end if;
 next_command:=replace(j.command,v_bad,v_good);
 if next_command=j.command or
  position('public.reality_read_owner_capability_gap_feed_v1' in next_command)>0 or
  position('credential.worker_token' in next_command)=0 or
  position('credential.vercel_bypass' in next_command)=0 or
  position('eligible_shift.permitted' in next_command)=0 or
  position('owner_routine_delegations_v1' in next_command)=0 or
  position('net.http_post' in next_command)=0 or
  position('INQUIRY_SCHEDULED_REQUIRES_INDEPENDENT_GAP_PROOF' in next_command)=0
 then return 'BLOCKED_REPAIR_CANDIDATE_INDEPENDENT_TEST_FAILED';end if;
 -- This single previously reviewed deterministic correction restores only
 -- read permissions of the PREVIEW worker wake. No model-chosen SQL runs.
 perform cron.alter_job(j.jobid,command=>next_command);
 select command into readback from cron.job where jobid=j.jobid;
 if readback is distinct from next_command then
  raise exception 'AUTO_REPAIR_POST_CHANGE_INDEPENDENT_READBACK_FAILED';end if;
 after_hash:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to(readback,'UTF8')),'hex');
 receipt_hash:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to(incident.incident_id::text||':'||d.runid::text||
   ':'||before_hash||':'||after_hash||':KNOWN_SAFE_PREVIEW_ROLE_FIX',
   'UTF8')),'hex');
 insert into reality_internal.preview_worker_auto_repairs_v1(
  owner_id,incident_id,failed_runid,repair_kind,phase,before_sha256,
  after_sha256,repair_receipt_sha256,scope_verified,repair_applied_at)
 values(incident.owner_id,incident.incident_id,d.runid,
  'EXACT_PREVIEW_SCHEDULER_OWNER_FEED_ROLE_MISMATCH',
  'PATCH_APPLIED_AWAITING_WORKER',before_hash,after_hash,
  receipt_hash,true,clock_timestamp());
 return 'REPAIR_APPLIED_AWAITING_INDEPENDENT_SIGNED_WORKER_AND_ORIGINAL_PROOF';
end $fn$;

-- The worker's own attestation is independently read, not inferred from
-- cron's '1 row' SQL enqueue status. Link the exact already-scheduled
-- research original when one existed before the fault.
create or replace function reality_internal.verify_preview_worker_auto_repair_v1()
returns text language plpgsql security invoker set search_path to '' as $fn$
declare a reality_internal.preview_worker_auto_repairs_v1%rowtype;
 j record;actual record;original record;verified_count integer:=0;
BEGIN
 if current_user<>'postgres' then
  raise exception 'AUTO_REPAIR_VERIFIER_WATCHDOG_ROLE_REQUIRED';end if;
 for a in select * from reality_internal.preview_worker_auto_repairs_v1
  where phase in ('PATCH_APPLIED_AWAITING_WORKER',
    'WORKER_ATTESTED_AWAITING_ORIGINAL')
  order by repair_applied_at
  for update skip locked
 loop
  select jobid,command into j from cron.job
  where jobname='reality-riley-preview-original-execution-wake-v1'
   and active=true and schedule='* * * * *';
  if not found or position('public.reality_read_owner_capability_gap_feed_v1' in j.command)>0
   or 'sha256:'||pg_catalog.encode(pg_catalog.sha256(
    pg_catalog.convert_to(j.command,'UTF8')),'hex')<>a.after_sha256
  then
   update reality_internal.preview_worker_auto_repairs_v1
   set phase='BLOCKED_EVIDENCE_OR_WORKER_MISSING',
    blocker='Signed worker cron command drifted before independent final verification',
    last_checked_at=clock_timestamp()
   where repair_id=a.repair_id;
   continue;
  end if;
  select r.run_id,r.started_at,r.finished_at into actual
  from reality_internal.signed_worker_actual_runs_v1 r
  where r.status='COMPLETED' and r.started_at>a.repair_applied_at
    and r.finished_at is not null
  order by r.started_at desc limit 1;
  if not found then
   update reality_internal.preview_worker_auto_repairs_v1
   set last_checked_at=clock_timestamp()
   where repair_id=a.repair_id;
   continue;
  end if;
  select t.claim_id,t.inquiry_receipt_sha256 into original
  from reality_internal.owner_capability_employee_schedule_v1 t
  where t.owner_id=a.owner_id
   and t.phase='INQUIRY_RECORDED_NEEDS_INDEPENDENT_GAP_PROOF'
   and t.inquiry_recorded_at>a.repair_applied_at
   and t.inquiry_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'
   and t.inquiry_model_response_id ~ '^resp_[A-Za-z0-9_-]{4,160}$'
  order by t.inquiry_recorded_at limit 1;
  if not found then
   update reality_internal.preview_worker_auto_repairs_v1
   set phase='WORKER_ATTESTED_AWAITING_ORIGINAL',
    worker_run_id=actual.run_id,last_checked_at=clock_timestamp()
   where repair_id=a.repair_id;
   continue;
  end if;
  update reality_internal.preview_worker_auto_repairs_v1
  set phase='INDEPENDENT_WORKER_AND_ORIGINAL_VERIFIED',
   worker_run_id=actual.run_id,
   original_capability_claim_id=original.claim_id,
   original_work_receipt_sha256=original.inquiry_receipt_sha256,
   verified_at=clock_timestamp(),last_checked_at=clock_timestamp()
  where repair_id=a.repair_id;
  verified_count:=verified_count+1;
 end loop;
 return 'PREVIEW_WORKER_REPAIR_INDEPENDENT_RESUMPTIONS_VERIFIED_'||verified_count;
end $fn$;

-- This is the platform's explicit, code-reviewed preview-only repair recipe.
-- No owner research permission is silently expanded; production and customer
-- actions are not included. Two functions run in the EXISTING DB watchdog.
revoke all on function reality_internal.auto_repair_known_preview_worker_gate_v1()
 from public,anon,authenticated,service_role;
revoke all on function reality_internal.verify_preview_worker_auto_repair_v1()
 from public,anon,authenticated,service_role;
