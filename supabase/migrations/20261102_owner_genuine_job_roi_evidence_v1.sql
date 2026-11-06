-- Preview only: immutable evidence-backed ROI readback from existing original-job ledger.
-- Uses owner scope and preexisting independently recorded settlement; no writes.
create or replace function public.reality_read_owner_job_roi_evidence_v1(p_owner_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  items jsonb;
begin
  if current_user <> 'service_role' then
    raise exception 'JOB_ROI_SERVICE_ROLE_REQUIRED';
  end if;
  if p_owner_id is null then
    raise exception 'JOB_ROI_OWNER_REQUIRED';
  end if;
  select coalesce(pg_catalog.jsonb_agg(
     pg_catalog.jsonb_build_object(
       'original_work_id', j.original_work_id,
       'capability_id', j.capability_id,
       'state', j.state,
       'isolated_preview_only', true,
       'original_work_verified', true,
       'settlement_verified', true,
       'source_claim_run_id', j.claim_run_id,
       'claimed_at', j.claimed_at,
       'settled_at', j.settled_at,
       'claim_to_settlement_ms', j.claim_to_settlement_ms,
       'technical_candidate_checks_passed', j.candidate_pass,
       'technical_frozen_checks_passed', j.frozen_pass,
       'technical_holdout_checks_passed', j.holdout_pass,
       'technical_counts_are_passes_not_rates', true,
       'reconciliation_target_original_work_id',j.reconciliation_target,
       'business_job_completed_outside_isolated_preview',false,
       'human_baseline_minutes',null,
       'human_supervision_minutes',null,
       'model_cost_usd',null,
       'infrastructure_cost_usd',null,
       'verified_hours_returned',null,
       'verified_cash_savings_usd',null,
       'workforce_fte_replaced',null,
       'production_changed',false)
     order by j.settled_at desc),'[]'::jsonb) into items
  from (
    select c.original_work_id,q.capability_id,c.state,c.claim_run_id,
      c.claimed_at,c.settled_at,
      case when c.claimed_at is not null and c.settled_at is not null and
                c.settled_at >= c.claimed_at
           then pg_catalog.floor(extract(epoch from
              c.settled_at - c.claimed_at)*1000)::bigint else null end
           as claim_to_settlement_ms,
      case when (q.qualification_receipt->>'candidate_pass') ~ '^[0-9]{1,6}$'
           then (q.qualification_receipt->>'candidate_pass')::int else null end
           as candidate_pass,
      case when (q.qualification_receipt->>'frozen_pass') ~ '^[0-9]{1,6}$'
           then (q.qualification_receipt->>'frozen_pass')::int else null end
           as frozen_pass,
      case when (q.qualification_receipt->>'holdout_pass') ~ '^[0-9]{1,6}$'
           then (q.qualification_receipt->>'holdout_pass')::int else null end
           as holdout_pass,
      case when c.outcome_receipt->>'reconciliation_target_original_work_id'
                ~ '^work:[a-f0-9]{32}$'
           then c.outcome_receipt->>'reconciliation_target_original_work_id'
           else null end as reconciliation_target
    from reality_internal.genuine_original_continuations_v1 c
    join reality_internal.genuine_capability_queue_v1 q
      on q.trigger_id=c.trigger_id and q.owner_id=c.owner_id
         and q.original_work_id=c.original_work_id
    join public.universe_events e
      on e.event_id=q.original_work_event_id
         and e.epistemic_status='VERIFIED'
         and e.payload->>'original_work_id'=q.original_work_id
         and e.payload->>'owner_id'=p_owner_id::text
         and e.provenance->>'principal_id'=p_owner_id::text
    where c.owner_id=p_owner_id
      and c.state='SETTLED_ISOLATED'
      and q.phase='SETTLED_ISOLATED'
      and c.outcome_receipt->>'status'='SETTLED_ISOLATED'
      and c.outcome_receipt->>'original_work_id'=c.original_work_id
      and c.outcome_receipt->>'original_job_completed'='true'
      and c.outcome_receipt->>'independent_outcome_verified'='true'
      and c.outcome_receipt->>'production_changed'='false'
      and c.installed_commit_sha ~ '^[a-f0-9]{40}$'
      and c.artifact_sha256 ~ '^[a-f0-9]{64}$'
    order by c.settled_at desc nulls last
    limit 20
  ) j;
  return pg_catalog.jsonb_build_object(
    'schema','reality-owner-original-job-roi-evidence-v1',
    'evidence_scope','SIGNED_OWNER_SCOPED_ISOLATED_LEDGER_READBACK',
    'jobs',items,'owner_authorization_granted',false,
    'work_executed_by_read',false,'production_changed',false);
end;
$function$;
revoke all on function public.reality_read_owner_job_roi_evidence_v1(uuid)
from public,anon,authenticated;
grant execute on function public.reality_read_owner_job_roi_evidence_v1(uuid)
to service_role;
