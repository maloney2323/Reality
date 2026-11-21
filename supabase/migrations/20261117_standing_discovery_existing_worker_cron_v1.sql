-- Extend the EXISTING signed preview-worker cron eligibility.
-- No new scheduler, token, endpoint, action scope or production target.
-- The already configured branch alias is verified to track this preview branch.
do $migration$
declare v_id bigint; v_command text; v_new text;
 v_anchor text:='where (eligible_shift.permitted';
 v_extra text:=$extra$
 or exists (
  select 1 from reality_internal.owner_routine_delegations_v1 grant_record
  where grant_record.enabled=true
    and grant_record.scope='EVIDENCE_ONLY_EMPLOYEE_DISCOVERY_V1'
    and grant_record.expires_at>clock_timestamp()
    and (case when grant_record.daily_date=current_date
      then grant_record.daily_reserved else 0 end)<
        grant_record.max_daily_inquiries
    and exists (
     select 1
     from reality_internal.employee_discovery_observations_v1 observation
     join reality_internal.employee_discovery_role_coverage_v1 coverage
      on coverage.owner_id=observation.owner_id
       and coverage.employee=observation.employee
     where observation.owner_id=grant_record.owner_id
       and observation.disposition in
        ('NEEDS_CURRENT_VALIDATION','HISTORICAL_REVALIDATION_REQUIRED')
       and observation.qualified_job_created=false
       and observation.shift_authorized=false
       and observation.installation_authorized=false
       and observation.production_changed=false
       and coverage.execution_authorized=false
       and coverage.qualified_jobs=0
       and coverage.checked_at>=clock_timestamp()-interval '12 hours'
       and observation.last_reconciled_at>=clock_timestamp()-interval '12 hours'
       and observation.source_ref ~ '^https://github.com/[^/]+/[^/]+/(issues|pull)/[1-9][0-9]*$'
       and not exists (
        select 1 from reality_internal.employee_temporal_inquiries_v1 already
        where already.owner_id=observation.owner_id
         and already.employee=observation.employee
         and already.source_ref=observation.source_ref
         and already.evidence_sha256=observation.evidence_sha256
       )
    )
 )
$extra$;
begin
 select jobid,command into strict v_id,v_command
 from cron.job
 where jobname='reality-riley-preview-original-execution-wake-v1'
  and active=true and schedule='* * * * *'
  and command like '%eligible_shift.permitted%'
  and command like '%governed-employee-shift-worker%'
  and command like '%reality-git-reality-chat-dire-49b77a-maloney2323-5310s-projects.vercel.app%'
  and command like '%credential.worker_token%'
  and command like '%credential.vercel_bypass%';
 if position('owner_routine_delegations_v1' in v_command)>0 then
  return;
 end if;
 if length(v_command)-length(replace(v_command,v_anchor,''))<>length(v_anchor)
 then raise exception 'STANDING_DISCOVERY_CRON_ANCHOR_NOT_UNIQUE';end if;
 v_new:=replace(v_command,v_anchor,v_anchor||E'\n'||v_extra);
 if length(v_new)<=length(v_command) or
  position('owner_routine_delegations_v1' in v_new)=0 or
  position('eligible_shift.permitted' in v_new)=0 or
  position('credential.worker_token' in v_new)=0
 then raise exception 'STANDING_DISCOVERY_CRON_EDIT_UNVERIFIED';end if;
 perform cron.alter_job(v_id,command=>v_new);
end $migration$;
