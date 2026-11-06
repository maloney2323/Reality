-- Experimental preview only. Durable, immutable, source-labelled job economics.
-- No owners or models get write access. No economic record grants execution.
create table if not exists reality_internal.genuine_job_economic_observations_v1 (
 observation_id uuid primary key,
 owner_id uuid not null,
 original_work_id text not null check (original_work_id ~ '^work:[a-f0-9]{32}$'),
 metric_type text not null check (metric_type in (
   'HUMAN_BASELINE_MINUTES','HUMAN_REVIEW_MINUTES',
   'MODEL_INPUT_TOKENS','MODEL_OUTPUT_TOKENS',
   'MODEL_PROVIDER_COST_USD','INFRASTRUCTURE_COST_USD'
 )),
 numeric_value numeric(18,6) not null
   check (numeric_value>=0 and numeric_value<=1000000000000),
 unit text not null check (
   (metric_type in ('HUMAN_BASELINE_MINUTES','HUMAN_REVIEW_MINUTES') and unit='MINUTES') or
   (metric_type in ('MODEL_INPUT_TOKENS','MODEL_OUTPUT_TOKENS') and
     unit='TOKENS' and numeric_value=trunc(numeric_value)) or
   (metric_type in ('MODEL_PROVIDER_COST_USD','INFRASTRUCTURE_COST_USD') and unit='USD')
 ),
 source_class text not null check (source_class in
   ('OWNER_REPORTED_UNVERIFIED','TRUSTED_PROVIDER_RECEIPT')),
 source_ref text not null check (length(source_ref) between 15 and 500),
 evidence_sha256 text not null check(evidence_sha256 ~ '^[a-f0-9]{64}$'),
 observed_at timestamptz not null,
 recorded_at timestamptz not null default now(),
 unique(owner_id,original_work_id,metric_type,evidence_sha256)
);
create index if not exists genuine_job_economics_owner_work_v1
 on reality_internal.genuine_job_economic_observations_v1(owner_id,original_work_id,recorded_at);
alter table reality_internal.genuine_job_economic_observations_v1 enable row level security;
revoke all on reality_internal.genuine_job_economic_observations_v1
 from public,anon,authenticated;
grant select,insert on reality_internal.genuine_job_economic_observations_v1 to service_role;
revoke update,delete,truncate on reality_internal.genuine_job_economic_observations_v1 from service_role;

-- This readout is an extension of v1, not a change to historical receipts.
-- Timestamp intervals are queue-to-settlement, approval-to-settlement and
-- claim-to-settlement. None is automatically comparable full-job labor time.
create or replace function public.reality_read_owner_job_roi_evidence_v2(p_owner_id uuid)
returns jsonb language plpgsql security invoker set search_path=''
as $function$
declare items jsonb;
begin
 if current_user <> 'service_role' then
   raise exception 'JOB_ROI_V2_SERVICE_ROLE_REQUIRED';
 end if;
 if p_owner_id is null then
   raise exception 'JOB_ROI_V2_OWNER_REQUIRED';
 end if;
 select coalesce(jsonb_agg(to_jsonb(j) order by j.settled_at desc),'[]'::jsonb)
 into items from (
 select
   c.original_work_id,q.capability_id,c.state,
   true as isolated_preview_only,true as original_work_verified,
   true as settlement_verified,
   false as business_job_completed_outside_isolated_preview,
   false as production_changed,
   c.claim_run_id as source_claim_run_id,
   c.claimed_at,c.settled_at,
   q.created_at as gap_queued_at,
   a.approved_at as owner_approved_at,
   case when c.claimed_at is not null and c.settled_at>=c.claimed_at
      then floor(extract(epoch from c.settled_at-c.claimed_at)*1000)::bigint
      else null end as claim_to_settlement_ms,
   case when q.created_at is not null and c.settled_at>=q.created_at
      then floor(extract(epoch from c.settled_at-q.created_at)*1000)::bigint
      else null end as gap_queue_to_settlement_ms,
   case when a.approved_at is not null and c.settled_at>=a.approved_at
      then floor(extract(epoch from c.settled_at-a.approved_at)*1000)::bigint
      else null end as owner_approval_to_settlement_ms,
   case when (q.qualification_receipt->>'candidate_pass') ~ '^[0-9]{1,6}$'
      then (q.qualification_receipt->>'candidate_pass')::int else null end
      as technical_candidate_checks_passed,
   case when (q.qualification_receipt->>'frozen_pass') ~ '^[0-9]{1,6}$'
      then (q.qualification_receipt->>'frozen_pass')::int else null end
      as technical_frozen_checks_passed,
   case when (q.qualification_receipt->>'holdout_pass') ~ '^[0-9]{1,6}$'
      then (q.qualification_receipt->>'holdout_pass')::int else null end
      as technical_holdout_checks_passed,
   true as technical_counts_are_passes_not_rates,
   case when c.outcome_receipt->>'reconciliation_target_original_work_id'
     ~ '^work:[a-f0-9]{32}$'
      then c.outcome_receipt->>'reconciliation_target_original_work_id'
      else null end as reconciliation_target_original_work_id,
   null::numeric as human_baseline_minutes,
   null::numeric as human_supervision_minutes,
   null::numeric as model_cost_usd,
   null::numeric as infrastructure_cost_usd,
   null::numeric as verified_hours_returned,
   null::numeric as verified_cash_savings_usd,
   null::numeric as workforce_fte_replaced,
   coalesce((
      select jsonb_agg(jsonb_build_object(
        'observation_id',m.observation_id,
        'metric_type',m.metric_type,'numeric_value',m.numeric_value,
        'unit',m.unit,'source_class',m.source_class,
        'source_ref',m.source_ref,'evidence_sha256',m.evidence_sha256,
        'observed_at',m.observed_at,'recorded_at',m.recorded_at)
        order by m.recorded_at,m.observation_id)
      from reality_internal.genuine_job_economic_observations_v1 m
      where m.owner_id=c.owner_id and m.original_work_id=c.original_work_id
   ),'[]'::jsonb) as economic_observations
 from reality_internal.genuine_original_continuations_v1 c
 join reality_internal.genuine_capability_queue_v1 q
   on q.trigger_id=c.trigger_id
   and q.owner_id=c.owner_id and q.original_work_id=c.original_work_id
 join public.universe_events e
   on e.event_id=q.original_work_event_id
   and e.epistemic_status='VERIFIED'
   and e.payload->>'original_work_id'=q.original_work_id
   and e.payload->>'owner_id'=p_owner_id::text
   and e.provenance->>'principal_id'=p_owner_id::text
 left join reality_internal.genuine_preview_install_approvals_v1 a
   on a.trigger_id=c.trigger_id and a.owner_id=c.owner_id
   and a.original_work_id=c.original_work_id
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
 return jsonb_build_object(
  'schema','reality-owner-original-job-roi-evidence-v2',
  'evidence_scope','SIGNED_OWNER_SCOPED_ISOLATED_LEDGER_READBACK',
  'jobs',items,'owner_authorization_granted',false,
  'work_executed_by_read',false,'production_changed',false
 );
end;
$function$;
revoke all on function public.reality_read_owner_job_roi_evidence_v2(uuid)
 from public,anon,authenticated;
grant execute on function public.reality_read_owner_job_roi_evidence_v2(uuid)
 to service_role;
