-- Extend only the EXISTING isolated signed preview-worker wake gate to include
-- unassigned capability opportunities for explicitly granted owners.
-- No new scheduler, no alternate endpoint, no new token/secret.
do $migration$
declare v_id bigint;v_command text;v_new text;
 v_anchor text:='where (eligible_shift.permitted';
 v_add text:=$added$
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
$added$;
begin
 select jobid,command into strict v_id,v_command from cron.job
 where jobname='reality-riley-preview-original-execution-wake-v1'
  and active=true and schedule='* * * * *'
  and command like '%eligible_shift.permitted%'
  and command like '%owner_routine_delegations_v1%'
  and command like '%governed-employee-shift-worker%'
  and command like '%reality-git-reality-chat-dire-49b77a-maloney2323-5310s-projects.vercel.app%'
  and command like '%credential.worker_token%'
  and command like '%credential.vercel_bypass%';
 if position('owner_capability_employee_schedule_v1' in v_command)>0
 then return;end if;
 if length(v_command)-length(replace(v_command,v_anchor,''))<>length(v_anchor)
 then raise exception 'CAPABILITY_SCHEDULE_WAKE_GATE_NOT_UNIQUE';end if;
 v_new:=replace(v_command,v_anchor,v_anchor||E'\n'||v_add);
 if length(v_new)<=length(v_command) or
  position('owner_capability_employee_schedule_v1' in v_new)=0 or
  position('eligible_shift.permitted' in v_new)=0 or
  position('credential.worker_token' in v_new)=0
 then raise exception 'CAPABILITY_SCHEDULE_WAKE_CHANGE_UNVERIFIED';end if;
 perform cron.alter_job(v_id,command=>v_new);
end $migration$;
