-- Restore the original scheduled wake to its narrow authority check.
-- Cron runs as the database scheduler, not the service-role identity required
-- to read protected owner capability feeds. The signed worker alone reads
-- those feeds after its own credential and grant verification.
-- This is a one-time bootstrap repair; future failures are observed by Reality.
do $repair$
declare v_id bigint;v_old text;v_new text;
v_forbidden text:=$forbidden$
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
$forbidden$;
v_safe text:=$safe$
 or exists (
  select 1 from reality_internal.owner_routine_delegations_v1 g
  where g.enabled=true
   and g.scope='EVIDENCE_ONLY_EMPLOYEE_DISCOVERY_V1'
   and g.expires_at>clock_timestamp()
   and (case when g.daily_date=current_date then g.daily_reserved else 0 end)<g.max_daily_inquiries
 )
$safe$;
begin
 select jobid,command into strict v_id,v_old from cron.job
 where jobname='reality-riley-preview-original-execution-wake-v1'
 and active=true and schedule='* * * * *'
 and command like '%governed-employee-shift-worker%'
 and command like '%credential.worker_token%'
 and command like '%credential.vercel_bypass%'
 and command like '%eligible_shift.permitted%';
 if position('public.reality_read_owner_capability_gap_feed_v1' in v_old)=0
 then return;end if;
 if position(v_forbidden in v_old)=0 or
 length(v_old)-length(replace(v_old,v_forbidden,''))<>length(v_forbidden)
 then raise exception 'ORIGINAL_SIGNED_CRON_GATE_DRIFT_UNVERIFIED';end if;
 v_new:=replace(v_old,v_forbidden,v_safe);
 if length(v_new)>=length(v_old) or
 position('public.reality_read_owner_capability_gap_feed_v1' in v_new)>0 or
 position('credential.worker_token' in v_new)=0 or
 position('credential.vercel_bypass' in v_new)=0 or
 position('eligible_shift.permitted' in v_new)=0 or
 position('owner_routine_delegations_v1' in v_new)=0
 then raise exception 'SIGNED_WAKE_RECOVERY_NO_AUTHORITY_PROOF';end if;
 perform cron.alter_job(v_id,command=>v_new);
end $repair$;
