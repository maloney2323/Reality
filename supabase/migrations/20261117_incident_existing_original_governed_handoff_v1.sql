-- The existing incident record now has a durable, strictly evidence-bound
-- handoff to the EXISTING genuine-original repair/continuation ledger.
-- Neither the watchdog nor Chat invents a customer job or installation grant.
alter table reality_internal.owner_worker_recovery_incidents_v1
 add column if not exists original_repair_handoff_status text not null default 'UNASSESSED',
 add column if not exists original_repair_observation_id uuid,
 add column if not exists original_repair_work_id text,
 add column if not exists original_repair_last_checked_at timestamptz,
 add column if not exists original_repair_handoff_receipt_sha256 text;
alter table reality_internal.owner_worker_recovery_incidents_v1
 add constraint owner_incident_original_repair_handoff_scope_v1
 check (
 original_repair_handoff_status in (
  'UNASSESSED',
  'RECOVERED_PREVIOUSLY_NO_REPLAY',
  'WAITING_FOR_CURRENT_INDEPENDENT_FAILURE',
  'ORIGINAL_WARRANT_AND_FROZEN_PROOF_REQUIRED',
  'EXISTING_ORIGINAL_RECOVERY_ELIGIBLE',
  'EXISTING_ORIGINAL_RECOVERY_CLAIMED',
  'EXISTING_ORIGINAL_OBLIGATION_PRESERVED',
  'ORIGINAL_RECOVERY_PROOF_FAILED_NEEDS_REVIEW'
 ) and
 (original_repair_work_id is null or original_repair_work_id ~ '^work:[a-f0-9]{32}$')
 and
 (original_repair_handoff_receipt_sha256 is null or
  original_repair_handoff_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$')
 and
 (original_repair_handoff_status not in
  ('EXISTING_ORIGINAL_RECOVERY_ELIGIBLE',
   'EXISTING_ORIGINAL_RECOVERY_CLAIMED',
   'EXISTING_ORIGINAL_OBLIGATION_PRESERVED')
  or (original_repair_observation_id is not null and
      original_repair_work_id is not null))
 );

-- Independent reconciler runs in the EXISTING watchdog.
create or replace function reality_internal.reconcile_incident_existing_original_handoff_v1()
returns text language plpgsql security invoker set search_path to '' as $fn$
declare i reality_internal.owner_worker_recovery_incidents_v1%rowtype;
 o record; latest_success timestamptz;reconciled integer:=0;
begin
 for i in
  select * from reality_internal.owner_worker_recovery_incidents_v1
  where original_repair_handoff_status not in (
   'EXISTING_ORIGINAL_RECOVERY_CLAIMED',
   'EXISTING_ORIGINAL_OBLIGATION_PRESERVED',
   'ORIGINAL_RECOVERY_PROOF_FAILED_NEEDS_REVIEW')
  order by last_observed_at desc,incident_id
  for update skip locked
 loop
  if i.phase='OPERATIONAL_CONTINUITY_VERIFIED_EXTERNAL_FIX' and
     i.continuity_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'
     and i.recovery_attribution='EXTERNALLY_CORRECTED_NOT_SELF_REPAIRED' then
   update reality_internal.owner_worker_recovery_incidents_v1
   set original_repair_handoff_status='RECOVERED_PREVIOUSLY_NO_REPLAY',
    original_repair_last_checked_at=clock_timestamp(),
    original_repair_observation_id=null,original_repair_work_id=null
   where incident_id=i.incident_id;
   reconciled:=reconciled+1;
   continue;
  end if;
  -- If provider operation resumed, don't manufacture a repair. The existing
  -- independent continuity reconciler will decide final recovery separately.
  select max(d.start_time) into latest_success
  from cron.job_run_details d where d.jobid=i.cron_jobid
   and d.status='succeeded' and d.start_time>i.last_observed_at;
  if latest_success is not null then
   update reality_internal.owner_worker_recovery_incidents_v1
   set original_repair_handoff_status='WAITING_FOR_CURRENT_INDEPENDENT_FAILURE',
    original_repair_last_checked_at=clock_timestamp(),
    original_repair_observation_id=null,original_repair_work_id=null
   where incident_id=i.incident_id;
   continue;
  end if;
  -- The original must already exist and have consumed EXACT installation
  -- approval, with the independently observed SAME failure run. This is NOT
  -- an incident -> arbitrary new-original admission.
  select obs.observation_id,obs.original_work_id
   into o
  from reality_internal.genuine_worker_failure_observations_v1 obs
  join reality_internal.genuine_capability_queue_v1 q
    on q.owner_id=obs.owner_id
     and q.original_work_id=obs.original_work_id
     and q.original_work_event_id=obs.original_work_event_id
     and q.trigger_id=obs.trigger_id
     and q.phase='ISOLATED_INSTALLED_PROBATION'
  join reality_internal.genuine_original_continuations_v1 c
    on c.owner_id=q.owner_id and c.trigger_id=q.trigger_id
     and c.original_work_id=q.original_work_id
     and c.state in ('ACCEPTED_FOR_ISOLATED_RESUMPTION','RESUMPTION_CLAIMED')
  join reality_internal.genuine_preview_install_approvals_v1 a
    on a.owner_id=q.owner_id and a.trigger_id=q.trigger_id
     and a.original_work_id=q.original_work_id
     and a.approval_id=c.approval_id
     and a.consumed_at is not null
     and a.target_environment='ISOLATED_PREVIEW'
  where obs.owner_id=i.owner_id and obs.failed_job_id=i.cron_jobid
   and obs.failed_run_id=i.last_failed_runid
   and obs.independent_provider_readback_verified=true
   and obs.original_job_completed=false
   and obs.installation_authorized=false
   and obs.production_changed=false
   and not exists(select 1
     from reality_internal.genuine_independent_final_receipts_v1 r
     where r.owner_id=q.owner_id
       and r.original_work_id=q.original_work_id)
  order by obs.observed_at desc limit 1;
  if found then
   update reality_internal.owner_worker_recovery_incidents_v1
   set original_repair_handoff_status='EXISTING_ORIGINAL_RECOVERY_ELIGIBLE',
    original_repair_observation_id=o.observation_id,
    original_repair_work_id=o.original_work_id,
    original_repair_last_checked_at=clock_timestamp()
   where incident_id=i.incident_id;
  else
   update reality_internal.owner_worker_recovery_incidents_v1
   set original_repair_handoff_status=
      'ORIGINAL_WARRANT_AND_FROZEN_PROOF_REQUIRED',
    original_repair_observation_id=null,
    original_repair_work_id=null,
    original_repair_last_checked_at=clock_timestamp()
   where incident_id=i.incident_id;
  end if;
  reconciled:=reconciled+1;
 end loop;
 return 'INCIDENT_EXISTING_ORIGINAL_HANDOFFS_RECONCILED_'||reconciled;
end $fn$;

-- Atomic claim is single-use for one incident and one immutable observation;
-- the worker subsequently calls the EXISTING original recovery RPC.
create or replace function public.reality_claim_next_incident_original_handoff_v1()
returns jsonb language plpgsql security invoker set search_path to '' as $fn$
declare i reality_internal.owner_worker_recovery_incidents_v1%rowtype;
begin
 if current_user<>'service_role'
 then raise exception 'INCIDENT_ORIGINAL_HANDOFF_SERVICE_REQUIRED';end if;
 select * into i from reality_internal.owner_worker_recovery_incidents_v1
  where original_repair_handoff_status='EXISTING_ORIGINAL_RECOVERY_ELIGIBLE'
   and original_repair_observation_id is not null
   and original_repair_work_id ~ '^work:[a-f0-9]{32}$'
  order by last_observed_at asc,incident_id limit 1 for update skip locked;
 if not found then
  return pg_catalog.jsonb_build_object(
   'status','NO_EXISTING_OWNER_INCIDENT_ORIGINAL_ELIGIBLE',
   'original_job_created',false,'repair_executed',false,
   'installation_authorized',false,'production_changed',false);
 end if;
 update reality_internal.owner_worker_recovery_incidents_v1
 set original_repair_handoff_status='EXISTING_ORIGINAL_RECOVERY_CLAIMED',
  original_repair_last_checked_at=clock_timestamp()
 where incident_id=i.incident_id;
 return pg_catalog.jsonb_build_object(
  'status','EXISTING_OWNER_INCIDENT_ORIGINAL_CLAIMED',
  'owner_id',i.owner_id,'incident_id',i.incident_id,
  'original_work_id',i.original_repair_work_id,
  'observation_id',i.original_repair_observation_id,
  'source_error_fingerprint',i.error_fingerprint,
  'original_job_created',false,'repair_executed',false,
  'installation_authorized',false,'production_changed',false);
end $fn$;

create or replace function public.reality_record_incident_original_handoff_v1(
 p_owner_id uuid,p_incident_id uuid,p_observation_id uuid,
 p_original_work_id text,p_existing_recovery_id uuid)
returns jsonb language plpgsql security invoker set search_path to '' as $fn$
declare i reality_internal.owner_worker_recovery_incidents_v1%rowtype;
 evidence jsonb;hash text;
begin
 if current_user<>'service_role' or
  p_owner_id is null or p_incident_id is null or
  p_observation_id is null or p_existing_recovery_id is null or
  p_original_work_id !~ '^work:[a-f0-9]{32}$'
 then raise exception 'INCIDENT_ORIGINAL_HANDOFF_EXACT_SERVICE_SCOPE_REQUIRED';end if;
 select * into i from reality_internal.owner_worker_recovery_incidents_v1
  where owner_id=p_owner_id and incident_id=p_incident_id
    and original_repair_handoff_status='EXISTING_ORIGINAL_RECOVERY_CLAIMED'
    and original_repair_observation_id=p_observation_id
    and original_repair_work_id=p_original_work_id for update;
 if not found then raise exception 'INCIDENT_ORIGINAL_HANDOFF_NOT_CLAIMED';end if;
 if not exists(
  select 1 from reality_internal.genuine_original_recovery_commitments_v1 c
  where c.recovery_id=p_existing_recovery_id
    and c.owner_id=p_owner_id
    and c.original_work_id=p_original_work_id
    and c.latest_observation_id=p_observation_id
    and c.original_job_settled=false)
 then raise exception 'INCIDENT_RECOVERY_EXISTING_OBLIGATION_NOT_VERIFIED';end if;
 evidence:=pg_catalog.jsonb_build_object(
  'incident_id',i.incident_id,'owner_id',i.owner_id,
  'error_fingerprint',i.error_fingerprint,
  'observation_id',p_observation_id,
  'original_work_id',p_original_work_id,
  'recovery_id',p_existing_recovery_id,
  'new_original_created',false,'repair_executed',false,
  'installation_authorized',false);
 hash:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to(evidence::text,'UTF8')),'hex');
 update reality_internal.owner_worker_recovery_incidents_v1
 set original_repair_handoff_status='EXISTING_ORIGINAL_OBLIGATION_PRESERVED',
  original_repair_handoff_receipt_sha256=hash,
  original_repair_last_checked_at=clock_timestamp()
 where incident_id=i.incident_id;
 return pg_catalog.jsonb_build_object(
  'status','OWNER_INCIDENT_EXISTING_ORIGINAL_RECOVERY_PRESERVED',
  'owner_id',i.owner_id,'incident_id',i.incident_id,
  'original_work_id',p_original_work_id,
  'existing_recovery_id',p_existing_recovery_id,
  'proof_sha256',hash,'original_job_created',false,
  'repair_executed',false,'installation_authorized',false,
  'production_changed',false);
end $fn$;

create or replace function public.reality_fail_incident_original_handoff_v1(
 p_owner_id uuid,p_incident_id uuid,p_observation_id uuid)
returns jsonb language plpgsql security invoker set search_path to '' as $fn$
begin
 if current_user<>'service_role' or
  p_owner_id is null or p_incident_id is null or p_observation_id is null
 then raise exception 'INCIDENT_HANDOFF_FAILURE_BOUND_OWNER_REQUIRED';end if;
 update reality_internal.owner_worker_recovery_incidents_v1
 set original_repair_handoff_status='ORIGINAL_RECOVERY_PROOF_FAILED_NEEDS_REVIEW',
  original_repair_last_checked_at=clock_timestamp()
 where owner_id=p_owner_id and incident_id=p_incident_id
  and original_repair_observation_id=p_observation_id
  and original_repair_handoff_status='EXISTING_ORIGINAL_RECOVERY_CLAIMED';
 return pg_catalog.jsonb_build_object(
  'status','INCIDENT_ORIGINAL_HANDOFF_BLOCKED_NEEDS_REVIEW',
  'repair_executed',false,'installation_authorized',false,
  'production_changed',false);
end $fn$;

-- Owner-scoped readback for Chat and the signed worker. Reading never
-- authorizes execution or claims a job.
create or replace function public.reality_read_owner_incident_original_handoff_v1(
 p_owner_id uuid)
returns jsonb language plpgsql security invoker set search_path to '' as $fn$
declare rows jsonb;
begin
 if current_user<>'service_role' or p_owner_id is null
 then raise exception 'INCIDENT_ORIGINAL_HANDOFF_READ_OWNER_REQUIRED';end if;
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'incident_id',i.incident_id,
  'phase',i.phase,'handoff_status',i.original_repair_handoff_status,
  'original_work_id',i.original_repair_work_id,
  'independent_observation_id',i.original_repair_observation_id,
  'original_handoff_receipt_sha256',i.original_repair_handoff_receipt_sha256,
  'last_qualified_at',i.original_repair_last_checked_at,
  'next_action',case
   when i.original_repair_handoff_status='RECOVERED_PREVIOUSLY_NO_REPLAY'
    then 'Recovered already. Monitor for recurrence; never replay a historical repair.'
   when i.original_repair_handoff_status='EXISTING_ORIGINAL_RECOVERY_ELIGIBLE'
    then 'The existing signed worker can now preserve the exact independent original recovery obligation.'
   when i.original_repair_handoff_status='EXISTING_ORIGINAL_RECOVERY_CLAIMED'
    then 'An exact owner-bound original handoff is in progress. Do not issue duplicate execution.'
   when i.original_repair_handoff_status='EXISTING_ORIGINAL_OBLIGATION_PRESERVED'
    then 'Existing original recovery preserved; its existing approval, independent CI and original settlement gates still apply.'
   when i.original_repair_handoff_status='ORIGINAL_RECOVERY_PROOF_FAILED_NEEDS_REVIEW'
    then 'Independent original handoff failed; review the source and warrant. No automatic retry or installation.'
   when i.original_repair_handoff_status='WAITING_FOR_CURRENT_INDEPENDENT_FAILURE'
    then 'The worker dispatched after the failure; verify operational continuity before considering another repair.'
   else 'An original-work warrant and fresh independent frozen failure proof are missing. Reality can investigate but cannot execute a new live repair under discovery-only delegation.'
  end,
  'original_created_by_handoff',false,
  'repair_executed_by_handoff',false,
  'installation_authorized',false,
  'production_changed',false
 ) order by i.last_observed_at desc),'[]'::jsonb) into rows
 from (select * from reality_internal.owner_worker_recovery_incidents_v1
  where owner_id=p_owner_id
  order by last_observed_at desc limit 8) i;
 return pg_catalog.jsonb_build_object(
  'status','OWNER_INCIDENT_ORIGINAL_REPAIR_HANDOFF_READ_ONLY',
  'owner_id',p_owner_id,'owner_scope_verified',true,
  'read_only',true,'items',rows,
  'count',pg_catalog.jsonb_array_length(rows),
  'original_job_created',false,'repair_executed',false,
  'installation_authorized',false,'production_changed',false);
end $fn$;
revoke execute on function public.reality_claim_next_incident_original_handoff_v1()
 from public,anon,authenticated;
revoke execute on function public.reality_record_incident_original_handoff_v1(uuid,uuid,uuid,text,uuid)
 from public,anon,authenticated;
revoke execute on function public.reality_fail_incident_original_handoff_v1(uuid,uuid,uuid)
 from public,anon,authenticated;
revoke execute on function public.reality_read_owner_incident_original_handoff_v1(uuid)
 from public,anon,authenticated;
grant execute on function public.reality_claim_next_incident_original_handoff_v1()
 to service_role;
grant execute on function public.reality_record_incident_original_handoff_v1(uuid,uuid,uuid,text,uuid)
 to service_role;
grant execute on function public.reality_fail_incident_original_handoff_v1(uuid,uuid,uuid)
 to service_role;
grant execute on function public.reality_read_owner_incident_original_handoff_v1(uuid)
 to service_role;

-- Same watchdog and same signed worker. No second scheduler or executor.
do $watchdog$
declare v_id bigint;v_command text;
begin
 select jobid,command into strict v_id,v_command from cron.job
 where jobname='reality-governed-wake-watchdog-v1'
   and active=true and schedule='* * * * *'
   and command like '%observe_owner_worker_cron_failures_v1%'
   and command like '%reconcile_owner_worker_recovery_evidence_v1%';
 if position('reconcile_incident_existing_original_handoff_v1' in v_command)>0
 then return;end if;
 perform cron.alter_job(v_id,command=>v_command||
  E'\nSELECT reality_internal.reconcile_incident_existing_original_handoff_v1();');
end $watchdog$;
