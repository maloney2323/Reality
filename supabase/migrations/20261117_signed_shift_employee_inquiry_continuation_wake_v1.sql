-- Once all five source-check stages are settled, an ordinary owner
-- signed shift still has source-backed employee investigations. Reuse its
-- SAME one-minute preview signed worker (no second job / new authority).
-- Only currently re-observable, owner-bound source work can wake it.
do $wake$
declare v_id bigint;v_command text;v_new text;
 v_anchor text:='where (eligible_shift.permitted';
 v_extra text:=$extra$
 or exists(
  select 1
  from reality_internal.governed_employee_shifts_v1 s
  join reality_internal.employee_discovery_role_coverage_v1 c
   on c.owner_id=s.owner_id
  join reality_internal.employee_discovery_observations_v1 o
   on o.owner_id=c.owner_id and o.employee=c.employee
  where s.authorized_at is not null
   and s.closed_at is null
   and s.status in ('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
   and s.planned_start_at<=clock_timestamp()
   and (s.planned_end_at='infinity'::timestamptz or
        s.planned_end_at>clock_timestamp())
   and exists(
    select 1 from reality_internal.governed_employee_shift_steps_v1 scope
    where scope.shift_id=s.shift_id and scope.step_index between 2 and 5
     and scope.source_ref ~
       '^https://github[.]com/maloney2323/Reality/(issues|pull|actions/runs)/[1-9][0-9]*$'
   )
   and c.checked_at>=clock_timestamp()-interval '12 hours'
   and c.execution_authorized=false and c.qualified_jobs=0
   and o.disposition in
      ('NEEDS_CURRENT_VALIDATION','HISTORICAL_REVALIDATION_REQUIRED')
   and o.qualified_job_created=false and o.shift_authorized=false
   and o.installation_authorized=false and o.production_changed=false
   and o.last_reconciled_at>=clock_timestamp()-interval '12 hours'
   and o.evidence_sha256 ~ '^sha256:[a-f0-9]{64}$'
   and (o.source_ref ~
     '^https://github[.]com/[^/]+/[^/]+/issues/[1-9][0-9]*$'
     or o.source_ref ~
     '^https://github[.]com/[^/]+/[^/]+/pull/[1-9][0-9]*$')
   and not exists(
    select 1 from reality_internal.employee_temporal_inquiries_v1 seen
    where seen.owner_id=o.owner_id and seen.employee=o.employee
     and seen.source_ref=o.source_ref
     and seen.evidence_sha256=o.evidence_sha256
   )
 )
$extra$;
begin
 select j.jobid,j.command into strict v_id,v_command
 from cron.job j
 where j.jobname='reality-riley-preview-original-execution-wake-v1'
  and j.active=true and j.schedule='* * * * *'
  and j.command like '%credential.worker_token%'
  and j.command like '%credential.vercel_bypass%'
  and j.command like '%net.http_post%'
  and j.command like '%eligible_shift.permitted%'
  and j.command like '%INQUIRY_SCHEDULED_REQUIRES_INDEPENDENT_GAP_PROOF%'
  and j.command not like '%public.reality_read_owner_capability_gap_feed_v1%';
 if position('realit' || 'y_internal.employee_discovery_role_coverage_v1 c' in
  v_command)>0 then
  return;
 end if;
 if length(v_command)-length(replace(v_command,v_anchor,''))<>length(v_anchor)
 then raise exception 'SHIFT_EMPLOYEE_INQUIRY_WAKE_ANCHOR_NOT_UNIQUE';end if;
 v_new:=replace(v_command,v_anchor,v_anchor||E'\n'||v_extra);
 if length(v_new)<=length(v_command)
    or position('credential.worker_token' in v_new)=0
    or position('credential.vercel_bypass' in v_new)=0
    or position('INQUIRY_SCHEDULED_REQUIRES_INDEPENDENT_GAP_PROOF' in v_new)=0
    or position('net.http_post' in v_new)=0
    or position('public.reality_read_owner_capability_gap_feed_v1' in v_new)>0
 then raise exception 'SHIFT_EMPLOYEE_INQUIRY_WAKE_AUTHORITY_NOT_VERIFIED';end if;
 perform cron.alter_job(v_id,command=>v_new);
end $wake$;
