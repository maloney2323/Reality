-- Extend the existing one-minute preview-worker eligibility to consider
-- investigations that were assigned and scheduled but NOT YET PERFORMED.
-- Cron never calls a privileged owner feed and creates no new scheduler.
do $migration$
declare v_id bigint;v_command text;v_new text;
 v_anchor text:='where (eligible_shift.permitted';
 v_add text:=$added$
 or exists(
  select 1 from reality_internal.owner_capability_employee_schedule_v1 t
  join reality_internal.owner_routine_delegations_v1 g
   on g.owner_id=t.owner_id
  where t.phase='INQUIRY_SCHEDULED_REQUIRES_INDEPENDENT_GAP_PROOF'
   and t.planned_inquiry_at<=clock_timestamp()
   and t.assigned_employee is not null
   and t.independent_reviewer is not null
   and t.assigned_employee<>t.independent_reviewer
   and t.source_url ~ '^https://'
   and g.enabled=true
   and g.scope='EVIDENCE_ONLY_EMPLOYEE_DISCOVERY_V1'
   and g.expires_at>clock_timestamp()
   and (case when g.daily_date=current_date then g.daily_reserved else 0 end)
       <g.max_daily_inquiries
 )
$added$;
begin
 select jobid,command into strict v_id,v_command from cron.job
 where jobname='reality-riley-preview-original-execution-wake-v1'
  and active=true and schedule='* * * * *'
  and command like '%eligible_shift.permitted%'
  and command like '%owner_routine_delegations_v1%'
  and command like '%governed-employee-shift-worker%'
  and command like '%credential.worker_token%'
  and command like '%credential.vercel_bypass%';
 if position('t.phase=''INQUIRY_SCHEDULED_REQUIRES_INDEPENDENT_GAP_PROOF''' in v_command)>0
 then return;end if;
 if length(v_command)-length(replace(v_command,v_anchor,''))<>length(v_anchor)
 then raise exception 'INQUIRY_WAKE_AUTHORITY_BOUNDARY_NOT_UNIQUE';end if;
 if position('public.reality_read_owner_capability_gap_feed_v1' in v_command)>0
 then raise exception 'INQUIRY_WAKE_FORBIDDEN_OWNER_FEED_CALL';end if;
 v_new:=replace(v_command,v_anchor,v_anchor||E'\n'||v_add);
 if length(v_new)<=length(v_command) or
  position('credential.worker_token' in v_new)=0 or
  position('credential.vercel_bypass' in v_new)=0 or
  position('eligible_shift.permitted' in v_new)=0 or
  position('t.phase=''INQUIRY_SCHEDULED_REQUIRES_INDEPENDENT_GAP_PROOF''' in v_new)=0
 then raise exception 'INQUIRY_WAKE_AUTHORIZED_DISPATCH_UNVERIFIED';end if;
 perform cron.alter_job(v_id,command=>v_new);
end $migration$;
