-- Reality owner-scoped read-only economic attachments for already-settled
-- source-native employee originals. Never installs, creates, claims or settles.
-- Original immutable settlement receipts are unchanged. Monetary ROI remains
-- unverified until provider expense AND comparable human labor are proven.
create or replace function public.reality_read_owner_shift_final_value_receipts_v1(
 p_owner_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
 receipts jsonb;
begin
 if current_user <> 'service_role' then
  raise exception 'SHIFT_FINAL_VALUE_OWNER_SERVICE_ROLE_REQUIRED';
 end if;
 if p_owner_id is null then
  raise exception 'SHIFT_FINAL_VALUE_OWNER_REQUIRED';
 end if;
 select coalesce(jsonb_agg(v.receipt order by v.settled_at desc),'[]'::jsonb)
 into receipts
 from (
  select n.settled_at,
   jsonb_build_object(
    'status','INDEPENDENTLY_SETTLED_SOURCE_NATIVE_ORIGINAL',
    'kind','NATIVE_CODE_REPAIR',
    'original_work_id',n.original_work_id,
    'shift_id',n.shift_id,
    'source_ref',n.source_ref,
    'source_proof_sha256',n.source_proof_sha256,
    'final_receipt_ref','supabase:riley_native_independent_final_receipts_v1:'||n.receipt_id::text,
    'final_receipt_sha256',n.final_receipt_sha256,
    'final_outcome',n.final_outcome,
    'settled_at',n.settled_at,
    'provider_proof_ref','https://github.com/maloney2323/Reality/actions/runs/'||n.original_execution_run_id::text,
    'installed_commit_sha',n.installed_commit_sha,
    'independent_verification',n.installed_provider_readback_verified
      and n.original_execution_independently_verified,
    'model_output_tokens_recorded', case
      when coalesce(d.model_output_tokens,0)>0 or coalesce(m.output_tokens,0)>0
       then coalesce(nullif(d.model_output_tokens,0),0)
        +coalesce(nullif(m.output_tokens,0),0)
      else null end,
    'model_usage_scope','PARTIAL_NATIVE_DRAFT_AND_REVISION_OUTPUT_ONLY',
    'model_cost_usd_verified',null,
    'infrastructure_cost_usd_verified',null,
    'human_baseline_minutes_verified',null,
    'human_supervision_minutes_verified',null,
    'verified_net_savings_usd',null,
    'verified_roi_percent',null,
    'economic_observations',coalesce((
      select jsonb_agg(jsonb_build_object(
        'metric_type',o.metric_type,'value',o.numeric_value,'unit',o.unit,
        'source_class',o.source_class,'source_ref',o.source_ref,
        'evidence_sha256',o.evidence_sha256,'observed_at',o.observed_at)
        order by o.observed_at)
      from reality_internal.genuine_job_economic_observations_v1 o
      where o.owner_id=n.owner_id
        and o.original_work_id=n.original_work_id
    ),'[]'::jsonb),
    'economic_evidence_scope','SOURCE_RECORDED_UNVERIFIED_NET_SAVINGS',
    'production_changed',false
   ) as receipt
  from reality_internal.riley_native_independent_final_receipts_v1 n
  join reality_internal.riley_unattended_repair_originals_v1 j
    on j.owner_id=n.owner_id and j.shift_id=n.shift_id
   and j.original_work_id=n.original_work_id
   and j.issue_url=n.source_ref
   and j.shift_source_proof_sha256=n.source_proof_sha256
   and j.original_settlement_receipt_ref=
     'supabase:riley_native_independent_final_receipts_v1:'||n.receipt_id::text
  left join reality_internal.riley_native_model_drafts_v1 d
    on d.owner_id=n.owner_id and d.shift_id=n.shift_id
   and d.original_work_id=n.original_work_id
   and d.phase='MODEL_DRAFT_RECORDED'
  left join reality_internal.riley_native_model_revisions_v1 m
    on m.owner_id=n.owner_id and m.shift_id=n.shift_id
   and m.original_work_id=n.original_work_id
   and m.state='MODEL_REVISION_RECORDED'
  where n.owner_id=p_owner_id
   and n.final_outcome='SUCCEEDED'
   and n.installed_provider_readback_verified=true
   and n.original_execution_independently_verified=true
   and n.production_changed=false
   and j.phase='SETTLED' and j.installed=true
   and j.production_changed=false
   and n.final_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'
   and n.original_execution_run_id>0
  union all
  select j.settled_at,
   jsonb_build_object(
    'status','INDEPENDENTLY_SETTLED_SOURCE_NATIVE_ORIGINAL',
    'kind','PR_CODE_REVIEW',
    'original_work_id',j.original_work_id,
    'shift_id',j.shift_id,
    'source_ref',j.source_ref,
    'source_proof_sha256',j.source_proof_sha256,
    'final_receipt_ref','supabase:riley_pr_review_originals_v1:'||j.settlement_receipt_id::text,
    'final_receipt_sha256',j.independent_provider_digest,
    'final_outcome','SUCCEEDED',
    'settled_at',j.settled_at,
    'provider_proof_ref',j.provider_comment_url,
    'installed_commit_sha',null,
    'independent_verification',true,
    'model_output_tokens_recorded',null,
    'model_usage_scope','PR_REVIEW_USAGE_NOT_RECORDED',
    'model_cost_usd_verified',null,
    'infrastructure_cost_usd_verified',null,
    'human_baseline_minutes_verified',null,
    'human_supervision_minutes_verified',null,
    'verified_net_savings_usd',null,
    'verified_roi_percent',null,
    'economic_observations',coalesce((
      select jsonb_agg(jsonb_build_object(
        'metric_type',o.metric_type,'value',o.numeric_value,'unit',o.unit,
        'source_class',o.source_class,'source_ref',o.source_ref,
        'evidence_sha256',o.evidence_sha256,'observed_at',o.observed_at)
        order by o.observed_at)
      from reality_internal.genuine_job_economic_observations_v1 o
      where o.owner_id=j.owner_id
        and o.original_work_id=j.original_work_id
    ),'[]'::jsonb),
    'economic_evidence_scope','SOURCE_RECORDED_UNVERIFIED_NET_SAVINGS',
    'production_changed',false
   ) as receipt
  from reality_internal.riley_pr_review_originals_v1 j
  where j.owner_id=p_owner_id and j.phase='SETTLED'
    and j.settlement_receipt_id is not null
    and j.source_ref ~ '^https://github[.]com/maloney2323/Reality/pull/[1-9][0-9]*$'
    and j.provider_comment_url ~ '^https://github[.]com/maloney2323/Reality/pull/[1-9][0-9]*#issuecomment-[1-9][0-9]*$'
    and j.independent_provider_digest ~ '^sha256:[a-f0-9]{64}$'
    and j.source_proof_sha256 ~ '^sha256:[a-f0-9]{64}$'
    and j.source_head_sha ~ '^[a-f0-9]{40}$'
    and j.settled_at is not null
 ) v;
 return jsonb_build_object(
  'status','OWNER_SHIFT_FINAL_VALUE_RECEIPTS_READ_ONLY',
  'owner_scope_verified',true,
  'economic_calculation','NO_UNSUPPORTED_SAVINGS_INFERRED',
  'receipts',receipts,
  'installation_authorized',false,
  'new_shift_created',false,
  'original_job_replayed',false,
  'production_changed',false);
end;
$$;
revoke all on function public.reality_read_owner_shift_final_value_receipts_v1(uuid)
 from public, anon, authenticated;
grant execute on function public.reality_read_owner_shift_final_value_receipts_v1(uuid)
 to service_role;
