-- Read-only, source-bound preparation for the final completion-verifier.
-- Successful frozen tests do not constitute a final receipt.
create or replace function public.reality_prepare_genuine_final_receipt_v1(p_work text)
returns jsonb language plpgsql
set search_path='' as $$
declare q reality_internal.genuine_capability_queue_v1%rowtype;
        a reality_internal.genuine_preview_install_approvals_v1%rowtype;
        c reality_internal.genuine_original_continuations_v1%rowtype;
        o public.universe_events%rowtype;
        settlement public.universe_events%rowtype;
        matches integer;
begin
 if current_user<>'service_role' then raise exception 'FINAL_RECEIPT_SERVICE_REQUIRED';end if;
 select * into strict q from reality_internal.genuine_capability_queue_v1
  where original_work_id=p_work and capability_id='reality-general-execution-receipt';
 select * into strict a from reality_internal.genuine_preview_install_approvals_v1
  where trigger_id=q.trigger_id;
 select * into strict c from reality_internal.genuine_original_continuations_v1
  where trigger_id=q.trigger_id;
 select * into strict o from public.universe_events where event_id=q.original_work_event_id;
 select count(*),min(event_id::text)::uuid into matches,settlement.event_id
 from public.universe_events
 where entity_type='reality_verified_original_work_settlement_v2'
  and event_kind='OUTCOME' and epistemic_status='VERIFIED'
  and payload->>'original_work_id'=p_work;
 if matches<>1 then raise exception 'FINAL_RECEIPT_UNIQUE_VERIFIED_SETTLEMENT_REQUIRED';end if;
 select * into strict settlement from public.universe_events
 where event_id=settlement.event_id;
 if q.phase<>'SETTLED_ISOLATED' or c.state<>'SETTLED_ISOLATED' or
    q.owner_id<>a.owner_id or c.owner_id<>q.owner_id or
    q.original_work_id<>a.original_work_id or c.original_work_id<>p_work or
    q.goal_id<>o.payload->>'goal_id' or
    o.epistemic_status<>'VERIFIED' or
    o.payload->>'source_path'<>
      'src/reality-extensions/reality-general-execution-receipt.mjs' or
    o.payload->>'frozen_test_path'<>
      'test/reality-frozen-regressions/reality-general-execution-receipt-v1.test.js' or
    o.payload->>'owner_id'<>q.owner_id::text or
    o.payload->>'owner_authorized_installation'<>'false' or
    q.qualified_candidate->>'artifact_sha256'<>a.artifact_hash or
    q.qualification_receipt->>'artifact_sha256'<>a.artifact_hash or
    (q.qualification_receipt->>'frozen_pass')::integer<5 or
    (q.qualification_receipt->>'candidate_pass')::integer<5 or
    a.approval_receipt->>'approval_origin'<>'AUTHENTICATED_OWNER_EXPLICIT_ACTION' or
    a.approval_receipt->>'owner_id'<>q.owner_id::text or
    a.approval_receipt->>'artifact_sha256'<>a.artifact_hash or
    a.approval_receipt->>'original_work_id'<>p_work or
    a.consumed_at is null or a.approval_id<>c.approval_id or
    a.installed_commit_sha<>c.installed_commit_sha or
    a.artifact_hash<>c.artifact_sha256 or
    a.installed_commit_sha !~ '^[a-f0-9]{40}$' or
    a.artifact_hash !~ '^[a-f0-9]{64}$' or
    a.install_branch<>('feature/reality-qualified-install-'||substr(a.artifact_hash,1,12)) or
    a.probation_status<>'ACTIVE' or
    a.installation_receipt->>'installed_commit_sha'<>c.installed_commit_sha or
    a.installation_receipt->>'original_work_id'<>p_work or
    (a.installation_receipt->>'monitored_executions')::integer<>5 or
    (a.installation_receipt->>'passed_assertions')::integer<220 or
    c.claim_run_id is null or c.claim_run_id<1 or
    c.outcome_receipt->>'status'<>'SETTLED_ISOLATED' or
    c.outcome_receipt->>'independent_outcome_verified'<>'true' or
    c.outcome_receipt->>'original_job_completed'<>'true' or
    c.outcome_receipt->>'production_changed'<>'false' or
    c.outcome_receipt->>'github_run_id'<>c.claim_run_id::text or
    c.outcome_receipt->>'artifact_sha256'<>a.artifact_hash or
    c.outcome_receipt->>'installed_commit_sha'<>a.installed_commit_sha or
    settlement.payload->>'owner_id'<>q.owner_id::text or
    settlement.payload->>'artifact_sha256'<>a.artifact_hash or
    settlement.payload->>'installed_commit_sha'<>a.installed_commit_sha or
    settlement.payload->>'owner_approval_id'<>a.approval_id::text or
    settlement.payload->>'provider_run_id'<>c.claim_run_id::text or
    settlement.payload->>'original_job_completed'<>'true' or
    settlement.payload->>'independent_outcome_verified'<>'true' or
    settlement.payload->>'production_changed'<>'false'
 then raise exception 'FINAL_RECEIPT_ORIGINAL_INSTALL_AND_OUTCOME_NOT_MATCHED';end if;
 return jsonb_build_object(
  'status','AUTHORITATIVE_SETTLED_SOURCE_FOR_INDEPENDENT_RECEIPT',
  'original_work_id',p_work,'owner_id',q.owner_id,'goal_id',q.goal_id,
  'artifact_sha256',a.artifact_hash,'original_work_event_id',q.original_work_event_id,
  'approval_id',a.approval_id,'installation_reservation_consumed',true,
  'installed_commit_sha',a.installed_commit_sha,'installed_branch',a.install_branch,
  'frozen_pass',(q.qualification_receipt->>'frozen_pass')::integer,
  'candidate_pass',(q.qualification_receipt->>'candidate_pass')::integer,
  'provider_run_id',c.claim_run_id,'settlement_event_id',settlement.event_id,
  'provider_outcome_digest',c.outcome_receipt->>'provider_outcome_digest',
  'source_path','src/reality-extensions/reality-general-execution-receipt.mjs',
  'production_changed',false,'final_receipt_verified',false);
end$$;
revoke all on function public.reality_prepare_genuine_final_receipt_v1(text) from public,anon,authenticated;
grant execute on function public.reality_prepare_genuine_final_receipt_v1(text) to service_role;

create table if not exists reality_internal.genuine_independent_final_receipts_v1(
 original_work_id text primary key,
 owner_id uuid not null,
 artifact_sha256 text not null check(artifact_sha256 ~ '^[a-f0-9]{64}$'),
 installed_commit_sha text not null check(installed_commit_sha ~ '^[a-f0-9]{40}$'),
 provider_run_id bigint not null check(provider_run_id>0),
 verified_settlement_event_id uuid not null,
 verifier_artifact_digest text not null check(verifier_artifact_digest ~ '^sha256:[a-f0-9]{64}$'),
 observed_result jsonb not null,
 verified_at timestamptz not null default clock_timestamp(),
 production_changed boolean not null default false check(production_changed=false),
 unique(original_work_id,artifact_sha256,provider_run_id)
);
alter table reality_internal.genuine_independent_final_receipts_v1 enable row level security;
revoke all on reality_internal.genuine_independent_final_receipts_v1 from anon,authenticated,public;
grant select,insert on reality_internal.genuine_independent_final_receipts_v1 to service_role;
create or replace function reality_internal.prevent_genuine_final_receipt_change_v1()
returns trigger language plpgsql as $$begin raise exception 'FINAL_RECEIPT_IMMUTABLE';end$$;
drop trigger if exists immutable_genuine_final_receipt_v1 on reality_internal.genuine_independent_final_receipts_v1;
create trigger immutable_genuine_final_receipt_v1 before update or delete
on reality_internal.genuine_independent_final_receipts_v1
for each row execute function reality_internal.prevent_genuine_final_receipt_change_v1();

create or replace function public.reality_record_genuine_final_receipt_v1(
 p_work text,p_provider_run_id bigint,p_artifact_digest text,p_verified_result jsonb
) returns jsonb language plpgsql
set search_path='' as $$
declare source jsonb; record reality_internal.genuine_independent_final_receipts_v1%rowtype;
begin
 if current_user<>'service_role' then raise exception 'FINAL_RECEIPT_WRITE_SERVICE_REQUIRED';end if;
 source:=public.reality_prepare_genuine_final_receipt_v1(p_work);
 if p_provider_run_id::text<>source->>'provider_run_id' or
    p_artifact_digest !~ '^sha256:[a-f0-9]{64}$' or
    p_verified_result->>'status'<>'VERIFIED_SETTLED' or
    p_verified_result->>'verified'<>'true' or
    p_verified_result->>'original_work_id'<>p_work or
    p_verified_result->>'production_changed'<>'false'
 then raise exception 'FINAL_RECEIPT_INDEPENDENT_VERIFIER_PROOF_REQUIRED';end if;
 insert into reality_internal.genuine_independent_final_receipts_v1(
  original_work_id,owner_id,artifact_sha256,installed_commit_sha,
  provider_run_id,verified_settlement_event_id,verifier_artifact_digest,observed_result)
 values(p_work,(source->>'owner_id')::uuid,source->>'artifact_sha256',
  source->>'installed_commit_sha',p_provider_run_id,
  (source->>'settlement_event_id')::uuid,p_artifact_digest,p_verified_result)
 on conflict do nothing;
 select * into strict record from reality_internal.genuine_independent_final_receipts_v1
 where original_work_id=p_work;
 if record.owner_id<>(source->>'owner_id')::uuid or
    record.artifact_sha256<>source->>'artifact_sha256' or
    record.installed_commit_sha<>source->>'installed_commit_sha' or
    record.provider_run_id<>p_provider_run_id or
    record.verified_settlement_event_id<>(source->>'settlement_event_id')::uuid or
    record.verifier_artifact_digest<>p_artifact_digest or
    record.observed_result<>p_verified_result
 then raise exception 'FINAL_RECEIPT_DUPLICATE_OR_PROVIDER_CONFLICT';end if;
 return jsonb_build_object('status','FULL_LOOP_INDEPENDENTLY_VERIFIED',
  'original_work_id',record.original_work_id,'artifact_sha256',record.artifact_sha256,
  'installed_commit_sha',record.installed_commit_sha,
  'provider_run_id',record.provider_run_id,
  'settlement_event_id',record.verified_settlement_event_id,
  'verifier_artifact_digest',record.verifier_artifact_digest,
  'recorded_at',record.verified_at,'installation_authorized_by_new_read',false,
  'production_changed',false,'independent_readback_verified',true);
end$$;
revoke all on function public.reality_record_genuine_final_receipt_v1(text,bigint,text,jsonb)
 from public,anon,authenticated;
grant execute on function public.reality_record_genuine_final_receipt_v1(text,bigint,text,jsonb)
 to service_role;

create or replace function public.reality_read_owner_final_receipts_v1(p_owner_id uuid)
returns jsonb language plpgsql
set search_path='' as $$
begin
 if current_user<>'service_role' then raise exception 'FINAL_RECEIPT_OWNER_READ_SERVICE_REQUIRED';end if;
 return jsonb_build_object('status','INDEPENDENT_FINAL_RECEIPT_READBACK',
  'receipts',coalesce((select jsonb_agg(jsonb_build_object(
  'status','FULL_LOOP_INDEPENDENTLY_VERIFIED',
  'original_work_id',r.original_work_id,'artifact_sha256',r.artifact_sha256,
  'installed_commit_sha',r.installed_commit_sha,
  'provider_run_id',r.provider_run_id,
  'settlement_event_id',r.verified_settlement_event_id,
  'verifier_artifact_digest',r.verifier_artifact_digest,
  'verified_at',r.verified_at,'production_changed',false)
   order by r.verified_at desc)
  from reality_internal.genuine_independent_final_receipts_v1 r
  where r.owner_id=p_owner_id),'[]'::jsonb),
  'does_not_authorize_actions',true);
end$$;
revoke all on function public.reality_read_owner_final_receipts_v1(uuid)
 from public,anon,authenticated;
grant execute on function public.reality_read_owner_final_receipts_v1(uuid) to service_role;
