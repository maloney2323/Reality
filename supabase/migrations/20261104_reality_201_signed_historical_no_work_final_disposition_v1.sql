-- #201: signed, immutable final disposition for an objective satisfied by earlier
-- VERIFIED Universe settlements. This is NOT another original-job settlement.
-- Restricted to the exact independently observed #201 owner work and source.
create table if not exists reality_internal.genuine_historical_no_work_dispositions_v1 (
 receipt_id uuid primary key default gen_random_uuid(),
 original_work_id text not null unique
  check (original_work_id='work:bf17f1716f7c9550680d761e64f8b591'),
 trigger_id uuid not null unique,
 owner_id uuid not null,
 original_work_event_id uuid not null,
 previous_repairing_original_work_id text not null,
 previous_reconciliation_target_work_id text not null,
 previous_original_universe_event_id uuid not null,
 previous_target_universe_event_id uuid not null,
 previous_original_event_content_hash text not null,
 previous_target_event_content_hash text not null,
 signed_github_run_id bigint not null check (signed_github_run_id>0),
 signed_repository_sha text not null check (signed_repository_sha ~ '^[a-f0-9]{40}$'),
 disposition text not null default 'HISTORICAL_OBJECTIVE_SATISFIED_NO_NEW_EXECUTION'
  check (disposition='HISTORICAL_OBJECTIVE_SATISFIED_NO_NEW_EXECUTION'),
 recorded_at timestamptz not null default clock_timestamp(),
 production_changed boolean not null default false check (production_changed=false)
);
alter table reality_internal.genuine_historical_no_work_dispositions_v1 enable row level security;
revoke all on reality_internal.genuine_historical_no_work_dispositions_v1
 from public, anon, authenticated;
grant select,insert on reality_internal.genuine_historical_no_work_dispositions_v1
 to service_role;
create or replace function reality_internal.prevent_genuine_historical_disposition_change_v1()
returns trigger language plpgsql security invoker set search_path='' as $$
begin raise exception 'HISTORICAL_FINAL_DISPOSITION_IMMUTABLE'; end$$;
drop trigger if exists immutable_genuine_historical_no_work_disposition_v1
 on reality_internal.genuine_historical_no_work_dispositions_v1;
create trigger immutable_genuine_historical_no_work_disposition_v1
 before update or delete on reality_internal.genuine_historical_no_work_dispositions_v1
 for each row execute function
 reality_internal.prevent_genuine_historical_disposition_change_v1();

-- Prepare is wholly read-only. It rechecks the live queue, approval,
-- unconsumed execution claim, source issue #201, and both prior SETTLED events.
create or replace function public.reality_prepare_genuine_historical_no_work_v1(p_work text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 q reality_internal.genuine_capability_queue_v1%rowtype;
 c reality_internal.genuine_original_continuations_v1%rowtype;
 a reality_internal.genuine_preview_install_approvals_v1%rowtype;
 o public.universe_events%rowtype;
 earlier public.universe_events%rowtype;
 target public.universe_events%rowtype;
 witness jsonb;
begin
 if current_user<>'service_role' then
  raise exception 'HISTORICAL_DISPOSITION_SERVICE_ROLE_ONLY'; end if;
 if p_work<>'work:bf17f1716f7c9550680d761e64f8b591' then
  raise exception 'HISTORICAL_DISPOSITION_EXACT_201_WORK_REQUIRED'; end if;
 select * into strict q from reality_internal.genuine_capability_queue_v1
  where original_work_id=p_work;
 select * into strict c from reality_internal.genuine_original_continuations_v1
  where trigger_id=q.trigger_id;
 select * into strict a from reality_internal.genuine_preview_install_approvals_v1
  where trigger_id=q.trigger_id;
 select * into strict o from public.universe_events
  where event_id=q.original_work_event_id;
 if q.capability_id<>'reality-continuity-settlement-reconciler'
  or q.phase<>'ISOLATED_INSTALLED_PROBATION'
  or c.original_work_id<>p_work or c.owner_id<>q.owner_id
  or c.state<>'ACCEPTED_FOR_ISOLATED_RESUMPTION'
  or c.claim_run_id is not null or c.claimed_at is not null
  or c.settled_at is not null or c.outcome_receipt is not null
  or a.original_work_id<>p_work or a.owner_id<>q.owner_id
  or a.consumed_at is null or a.installed_commit_sha is null
  or a.installed_commit_sha<>c.installed_commit_sha
  or o.payload->>'owner_id'<>q.owner_id::text
  or o.payload->>'original_work_id'<>p_work
  or o.epistemic_status<>'VERIFIED'
  or o.payload->>'issue_number'<>'201'
  or o.payload->>'source_path'<>'src/reality-extensions/reality-continuity-settlement-reconciler.mjs'
  or o.payload->>'frozen_test_sha256'<>
   '03480c22c0ad896e732b5782c7f4edd9d0576c34dec42a2911db90c63dd31fe9'
  or o.payload->>'owner_authorized_investigation'<>'true'
  or o.payload->>'original_job_completed'<>'false'
  or o.payload->>'owner_authorized_installation'<>'false'
 then raise exception 'HISTORICAL_DISPOSITION_UNCLAIMED_ORIGINAL_SCOPE_REQUIRED'; end if;
 if exists(select 1 from reality_internal.genuine_independent_final_receipts_v1
    where original_work_id=p_work)
  or exists(select 1 from public.universe_events
    where payload->>'original_work_id'=p_work
      and epistemic_status='VERIFIED'
      and payload->>'constitutional_phase'='SETTLED'
      and payload->>'original_job_completed'='true')
 then raise exception 'HISTORICAL_DISPOSITION_NEW_SETTLEMENT_CONFLICT';end if;
 witness:=public.reality_read_genuine_reconciliation_target_v1(q.trigger_id);
 if witness->>'status'<>'RECONCILIATION_ALREADY_SATISFIED_BY_VERIFIED_UNIVERSE'
  or witness->>'repairing_original_work_id'<>p_work
  or (witness->>'unresolved_reconciliation_targets')::integer<>0
  or witness->>'new_reconciliation_proposed'<>'false'
  or witness->>'original_job_completed'<>'false'
  or witness->>'production_changed'<>'false'
  or witness->>'independent_database_readback'<>'true'
 then raise exception 'HISTORICAL_DISPOSITION_ZERO_TARGET_WITNESS_REQUIRED'; end if;
 select * into strict earlier from public.universe_events
  where event_id=(witness->>'previous_original_universe_event_id')::uuid;
 select * into strict target from public.universe_events
  where event_id=(witness->>'previous_target_universe_event_id')::uuid;
 if earlier.event_id=target.event_id
  or earlier.event_kind<>'OUTCOME' or target.event_kind<>'OUTCOME'
  or earlier.epistemic_status<>'VERIFIED' or target.epistemic_status<>'VERIFIED'
  or earlier.payload->>'original_work_id'<>
   witness->>'previous_repairing_original_work_id'
  or target.payload->>'original_work_id'<>
   witness->>'previous_reconciliation_target_work_id'
  or earlier.payload->>'constitutional_phase'<>'SETTLED'
  or target.payload->>'constitutional_phase'<>'SETTLED'
  or earlier.payload->>'original_job_completed'<>'true'
  or target.payload->>'original_job_completed'<>'true'
  or earlier.content_hash is null or target.content_hash is null
  or earlier.lineage_hash is null or target.lineage_hash is null
 then raise exception 'HISTORICAL_DISPOSITION_TWO_INDEPENDENT_UNIVERSE_SETTLEMENTS_REQUIRED'; end if;
 return pg_catalog.jsonb_build_object(
  'status','HISTORICAL_NO_NEW_WORK_PREPARED',
  'original_work_id',p_work,'trigger_id',q.trigger_id,
  'owner_id',q.owner_id,'original_work_event_id',o.event_id,
  'previous_repairing_original_work_id',witness->>'previous_repairing_original_work_id',
  'previous_reconciliation_target_work_id',witness->>'previous_reconciliation_target_work_id',
  'previous_original_universe_event_id',earlier.event_id,
  'previous_target_universe_event_id',target.event_id,
  'previous_original_event_content_hash',earlier.content_hash,
  'previous_target_event_content_hash',target.content_hash,
  'unresolved_reconciliation_targets',0,
  'original_job_completed',false,
  'original_execution_replayed',false,
  'new_universe_settlement_written',false,
  'production_changed',false);
end$$;
revoke all on function public.reality_prepare_genuine_historical_no_work_v1(text)
 from public,anon,authenticated;
grant execute on function public.reality_prepare_genuine_historical_no_work_v1(text)
 to service_role;

-- A separate read-only RPC re-verifies live source and persisted immutable row.
create or replace function public.reality_read_genuine_historical_no_work_v1(p_work text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 r reality_internal.genuine_historical_no_work_dispositions_v1%rowtype;
 s jsonb;
begin
 if current_user<>'service_role' then
  raise exception 'HISTORICAL_DISPOSITION_READ_SERVICE_ROLE_ONLY';end if;
 s:=public.reality_prepare_genuine_historical_no_work_v1(p_work);
 select * into r from reality_internal.genuine_historical_no_work_dispositions_v1
  where original_work_id=p_work;
 if r.receipt_id is null then return pg_catalog.jsonb_build_object(
  'status','HISTORICAL_NO_WORK_FINAL_RECEIPT_NOT_RECORDED',
  'original_work_id',p_work,'independent_database_readback',true,
  'production_changed',false);end if;
 if r.trigger_id<>(s->>'trigger_id')::uuid
  or r.owner_id<>(s->>'owner_id')::uuid
  or r.original_work_event_id<>(s->>'original_work_event_id')::uuid
  or r.previous_repairing_original_work_id<>s->>'previous_repairing_original_work_id'
  or r.previous_reconciliation_target_work_id<>s->>'previous_reconciliation_target_work_id'
  or r.previous_original_universe_event_id<>(s->>'previous_original_universe_event_id')::uuid
  or r.previous_target_universe_event_id<>(s->>'previous_target_universe_event_id')::uuid
  or r.previous_original_event_content_hash<>s->>'previous_original_event_content_hash'
  or r.previous_target_event_content_hash<>s->>'previous_target_event_content_hash'
  or r.disposition<>'HISTORICAL_OBJECTIVE_SATISFIED_NO_NEW_EXECUTION'
  or r.production_changed<>false
 then raise exception 'HISTORICAL_DISPOSITION_IMMUTABLE_READBACK_MISMATCH';end if;
 return pg_catalog.jsonb_build_object(
  'status',r.disposition,
  'receipt_id',r.receipt_id,'original_work_id',p_work,
  'original_work_event_id',r.original_work_event_id,
  'previous_repairing_original_work_id',r.previous_repairing_original_work_id,
  'previous_reconciliation_target_work_id',r.previous_reconciliation_target_work_id,
  'previous_original_universe_event_id',r.previous_original_universe_event_id,
  'previous_target_universe_event_id',r.previous_target_universe_event_id,
  'previous_original_event_content_hash',r.previous_original_event_content_hash,
  'previous_target_event_content_hash',r.previous_target_event_content_hash,
  'signed_github_run_id',r.signed_github_run_id,
  'signed_repository_sha',r.signed_repository_sha,
  'recorded_at',r.recorded_at,
  'independent_database_readback',true,
  'unresolved_reconciliation_targets',0,
  'original_job_completed',false,
  'original_execution_replayed',false,
  'new_universe_settlement_written',false,
  'new_execution_claim_consumed',false,
  'measured_roi_claimed',false,
  'installation_replay_authorized',false,
  'production_changed',false);
end$$;
revoke all on function public.reality_read_genuine_historical_no_work_v1(text)
 from public,anon,authenticated;
grant execute on function public.reality_read_genuine_historical_no_work_v1(text)
 to service_role;

-- Signed broker supplies independently checked GitHub run identity. The DB
-- transaction inserts once, rejects drift, and does not touch the claim or ledger.
create or replace function public.reality_record_genuine_historical_no_work_v1(
 p_work text,p_signed_run_id bigint,p_repository_sha text
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare s jsonb; r reality_internal.genuine_historical_no_work_dispositions_v1%rowtype;
begin
 if current_user<>'service_role' then
  raise exception 'HISTORICAL_DISPOSITION_WRITE_SERVICE_ROLE_ONLY';end if;
 if p_signed_run_id is null or p_signed_run_id<1
  or p_repository_sha is null or p_repository_sha !~ '^[a-f0-9]{40}$'
 then raise exception 'HISTORICAL_DISPOSITION_SIGNED_RUN_REQUIRED';end if;
 s:=public.reality_prepare_genuine_historical_no_work_v1(p_work);
 insert into reality_internal.genuine_historical_no_work_dispositions_v1(
  original_work_id,trigger_id,owner_id,original_work_event_id,
  previous_repairing_original_work_id,previous_reconciliation_target_work_id,
  previous_original_universe_event_id,previous_target_universe_event_id,
  previous_original_event_content_hash,previous_target_event_content_hash,
  signed_github_run_id,signed_repository_sha)
 values(p_work,(s->>'trigger_id')::uuid,(s->>'owner_id')::uuid,
  (s->>'original_work_event_id')::uuid,
  s->>'previous_repairing_original_work_id',
  s->>'previous_reconciliation_target_work_id',
  (s->>'previous_original_universe_event_id')::uuid,
  (s->>'previous_target_universe_event_id')::uuid,
  s->>'previous_original_event_content_hash',s->>'previous_target_event_content_hash',
  p_signed_run_id,p_repository_sha)
 on conflict (original_work_id) do nothing;
 -- The read RPC is an independent read and revalidation, even on replay.
 return public.reality_read_genuine_historical_no_work_v1(p_work);
end$$;
revoke all on function public.reality_record_genuine_historical_no_work_v1(text,bigint,text)
 from public,anon,authenticated;
grant execute on function public.reality_record_genuine_historical_no_work_v1(text,bigint,text)
 to service_role;
