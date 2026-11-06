-- Reality isolated governing bridge: a provider-verified repair may reconcile a
-- separately settled original work item into its immutable Universe lineage.
-- Does NOT approve installation or make production changes.
create table if not exists reality_internal.genuine_universe_settlement_reconciliations_v1 (
 target_original_work_id text primary key check (target_original_work_id ~ '^work:[a-f0-9]{32}$'),
 repairing_trigger_id uuid not null unique references reality_internal.genuine_capability_queue_v1(trigger_id),
 repairing_work_id text not null check (repairing_work_id ~ '^work:[a-f0-9]{32}$'),
 owner_id uuid not null,
 target_settlement_run_id bigint not null,
 repairing_settlement_run_id bigint not null,
 verified_event_id uuid not null unique references public.universe_events(event_id),
 target_provider_outcome_digest text not null check (target_provider_outcome_digest ~ '^[a-f0-9]{64}$'),
 receipt jsonb not null,
 created_at timestamptz not null default clock_timestamp()
);
alter table reality_internal.genuine_universe_settlement_reconciliations_v1 enable row level security;
revoke all on reality_internal.genuine_universe_settlement_reconciliations_v1 from public,anon,authenticated;
grant select,insert on reality_internal.genuine_universe_settlement_reconciliations_v1 to service_role;

-- Canonical stable JSON encoding compatible with Continuity Spine's stable
-- sorted-property JSON hashing. No model supplies either hash.
create or replace function public.reality_continuity_canonical_json_v1(p jsonb)
returns text language plpgsql immutable set search_path='' as $$
declare result text;
begin
 if p is null or jsonb_typeof(p)='null' then return 'null';end if;
 if jsonb_typeof(p)='object' then
  select '{'||coalesce(string_agg(to_jsonb(k)::text||':'||
   public.reality_continuity_canonical_json_v1(v),',' order by k),'')||'}'
  into result from jsonb_each(p) as pairs(k,v);
  return result;
 elsif jsonb_typeof(p)='array' then
  select '['||coalesce(string_agg(public.reality_continuity_canonical_json_v1(v),',' order by seq),'')||']'
  into result from jsonb_array_elements(p) with ordinality as items(v,seq);
  return result;
 end if;
 return p::text;
end $$;
revoke all on function public.reality_continuity_canonical_json_v1(jsonb) from public,anon,authenticated;
grant execute on function public.reality_continuity_canonical_json_v1(jsonb) to service_role;

create or replace function public.reality_append_verified_genuine_universe_settlement_v1(
 p_repairing_trigger_id uuid,p_target_original_work_id text,p_repair_run_id bigint)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare repair reality_internal.genuine_capability_queue_v1%rowtype;
 repair_approval reality_internal.genuine_preview_install_approvals_v1%rowtype;
 repair_cont reality_internal.genuine_original_continuations_v1%rowtype;
 target reality_internal.genuine_original_continuations_v1%rowtype;
 target_approval reality_internal.genuine_preview_install_approvals_v1%rowtype;
 target_queue reality_internal.genuine_capability_queue_v1%rowtype;
 original public.universe_events%rowtype;
 prior public.universe_events%rowtype;
 other public.universe_events%rowtype;
 inserted public.universe_events%rowtype;
 saved reality_internal.genuine_universe_settlement_reconciliations_v1%rowtype;
 payload jsonb; provenance jsonb; basis jsonb; refs jsonb;
 provider_digest text; now_iso text; now_at timestamptz; new_event_id uuid;
 content_sha text; lineage_sha text; tips int;
begin
 if current_user<>'service_role' then raise exception 'REALITY_UNIVERSE_RECONCILE_SERVICE_ROLE_ONLY';end if;
 if p_repairing_trigger_id is null or p_target_original_work_id !~ '^work:[a-f0-9]{32}$'
 or p_repair_run_id<1 then
  raise exception 'REALITY_UNIVERSE_RECONCILE_EXACT_WORK_SCOPE_REQUIRED';end if;
 -- Scope all concurrency to one original work identity; an owner approval is
 -- checked below and cannot be inferred from the calling model or request.
 perform pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended('reality:universe:settlement:'||p_target_original_work_id,0));
 select * into saved from reality_internal.genuine_universe_settlement_reconciliations_v1
 where target_original_work_id=p_target_original_work_id;
 if saved.target_original_work_id is not null then
  if saved.repairing_trigger_id<>p_repairing_trigger_id or
     saved.repairing_settlement_run_id<>p_repair_run_id or
     not exists(select 1 from public.universe_events e where
       e.event_id=saved.verified_event_id and e.epistemic_status='VERIFIED' and
       e.payload->>'original_work_id'=p_target_original_work_id and
       e.payload->>'original_job_completed'='true' and
       e.payload->>'constitutional_phase'='SETTLED')
  then raise exception 'REALITY_UNIVERSE_RECONCILE_REPLAY_CONFLICT';end if;
  return saved.receipt;
 end if;
 select * into repair from reality_internal.genuine_capability_queue_v1
 where trigger_id=p_repairing_trigger_id for update;
 select * into repair_approval from reality_internal.genuine_preview_install_approvals_v1
 where trigger_id=p_repairing_trigger_id;
 select * into repair_cont from reality_internal.genuine_original_continuations_v1
 where trigger_id=p_repairing_trigger_id;
 select * into target from reality_internal.genuine_original_continuations_v1
 where original_work_id=p_target_original_work_id;
 select * into target_queue from reality_internal.genuine_capability_queue_v1
 where trigger_id=target.trigger_id;
 select * into target_approval from reality_internal.genuine_preview_install_approvals_v1
 where trigger_id=target.trigger_id;
 select * into original from public.universe_events where event_id=target_queue.original_work_event_id;
 if repair.trigger_id is null or
  repair.capability_id<>'reality-continuity-settlement-reconciler' or
  repair.original_work_id=p_target_original_work_id or
  repair.phase<>'SETTLED_ISOLATED' or
  repair_cont.state<>'SETTLED_ISOLATED' or
  repair_cont.claim_run_id<>p_repair_run_id or
  repair_cont.original_work_id<>repair.original_work_id or
  repair_cont.outcome_receipt->>'original_job_completed'<>'true' or
  repair_cont.outcome_receipt->>'independent_outcome_verified'<>'true' or
  repair_cont.outcome_receipt->>'github_run_id'<>p_repair_run_id::text or
  repair_cont.outcome_receipt->>'installed_commit_sha'<>repair_approval.installed_commit_sha or
  repair_approval.approval_id is null or repair_approval.consumed_at is null or
  repair_approval.target_environment<>'ISOLATED_PREVIEW' or
  repair_approval.probation_status<>'ACTIVE' or
  repair_approval.settlement_receipt is null or
  repair_approval.approval_id<>repair_cont.approval_id or
  target.trigger_id is null or target.state<>'SETTLED_ISOLATED' or
  target.owner_id<>repair.owner_id or target_queue.owner_id<>repair.owner_id or
  target.outcome_receipt->>'independent_outcome_verified'<>'true' or
  target.outcome_receipt->>'original_job_completed'<>'true' or
  target.outcome_receipt->>'production_changed'<>'false' or
  target.outcome_receipt->>'github_run_id'<>target.claim_run_id::text or
  target.outcome_receipt->>'installed_commit_sha'<>target.installed_commit_sha or
  target_approval.approval_id<>target.approval_id or
  target_approval.consumed_at is null or
  target_approval.probation_status<>'ACTIVE' or
  original.event_id is null or original.epistemic_status<>'VERIFIED' or
  original.payload->>'original_work_id'<>p_target_original_work_id or
  original.payload->>'original_job_completed'<>'false' or
  original.payload->>'owner_id'<>repair.owner_id::text
 then raise exception 'REALITY_UNIVERSE_RECONCILE_SAME_OWNER_APPROVED_PROVIDER_SETTLEMENT_REQUIRED';end if;
 provider_digest:=target.outcome_receipt->>'provider_outcome_digest';
 if provider_digest !~ '^[a-f0-9]{64}$' then
  raise exception 'REALITY_UNIVERSE_RECONCILE_PROVIDER_DIGEST_REQUIRED';end if;
 if exists(select 1 from public.universe_events e where
    e.continuity_root_id=original.continuity_root_id and
    e.worldline_id=original.worldline_id and e.epistemic_status='VERIFIED' and
    e.payload->>'original_work_id'=p_target_original_work_id and
    (e.payload->>'original_job_completed'='true' or e.payload->>'constitutional_phase'='SETTLED'))
 then raise exception 'REALITY_UNIVERSE_RECONCILE_PREEXISTING_COMPLETION_CONFLICT';end if;
 -- Do not guess a timestamp-ordered tail. Exactly one unreferenced chain tip.
 select count(*) into tips from public.universe_events e
 where e.continuity_root_id=original.continuity_root_id and
 e.worldline_id=original.worldline_id and not exists(
 select 1 from public.universe_events child where child.parent_event_id=e.event_id);
 if tips<>1 then raise exception 'REALITY_UNIVERSE_RECONCILE_CHAIN_TAIL_AMBIGUOUS';end if;
 select * into prior from public.universe_events e
 where e.continuity_root_id=original.continuity_root_id and
 e.worldline_id=original.worldline_id and not exists(
 select 1 from public.universe_events child where child.parent_event_id=e.event_id);
 if prior.event_id is null or prior.lineage_hash !~ '^[a-f0-9]{64}$'
 then raise exception 'REALITY_UNIVERSE_RECONCILE_LINEAGE_HEAD_INVALID';end if;
 now_at:=clock_timestamp();
 now_iso:=to_char(now_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
 new_event_id:=gen_random_uuid();
 payload:=jsonb_build_object(
  'schema','reality-verified-original-universe-settlement-v1',
  'original_work_id',p_target_original_work_id,
  'repairing_work_id',repair.original_work_id,
  'owner_id',target.owner_id,
  'original_job_completed',true,'constitutional_phase','SETTLED',
  'independent_outcome_verified',true,
  'provider_run_id',target.claim_run_id,
  'provider_outcome_digest',provider_digest,
  'installed_commit_sha',target.installed_commit_sha,
  'artifact_sha256',target.artifact_sha256,
  'owner_approval_id',target.approval_id,
  'repair_owner_approval_id',repair_approval.approval_id,
  'repair_provider_run_id',p_repair_run_id,
  'production_changed',false);
 refs:=jsonb_build_array(
  'github:actions:run:'||target.claim_run_id::text,
  'github:actions:run:'||p_repair_run_id::text);
 provenance:=jsonb_build_object(
  'source','SIGNED_GITHUB_PROVIDER_AND_DURABLE_OWNER_APPROVAL',
  'principal_id',target.owner_id::text,
  'conversation_id',target_queue.conversation_id::text,
  'source_original_event_id',original.event_id::text,
  'source_repair_trigger_id',p_repairing_trigger_id::text,
  'continuity_spine',jsonb_build_object(
    'version','reality-continuity-spine-v2.1',
    'prior_lineage_hash',prior.lineage_hash,
    'source_event_id',original.event_id::text,
    'transformation_receipt_id',null));
 content_sha:=encode(extensions.digest(convert_to(
   public.reality_continuity_canonical_json_v1(payload),'UTF8'),'sha256'),'hex');
 basis:=jsonb_build_object(
  'spine_version','reality-continuity-spine-v2.1',
  'continuity_root_id',original.continuity_root_id::text,
  'worldline_id',original.worldline_id::text,
  'parent_event_id',prior.event_id::text,
  'prior_lineage_hash',prior.lineage_hash,
  'stage','OUTCOME','entity_id',original.entity_id::text,
  'evidence_refs',refs,'transformation_receipt_id',null,
  'effective_time',now_iso,'assertion_time',now_iso,
  'epistemic_status','VERIFIED','payload',payload,'provenance',provenance);
 lineage_sha:=encode(extensions.digest(convert_to(
   public.reality_continuity_canonical_json_v1(basis),'UTF8'),'sha256'),'hex');
 insert into public.universe_events(
  event_id,event_kind,entity_type,entity_id,continuity_root_id,worldline_id,
  parent_event_id,effective_time,assertion_time,epistemic_status,
  payload,evidence_refs,provenance,content_hash,lineage_hash)
 values(new_event_id,'OUTCOME','reality_genuine_original_settlement_v1',
  original.entity_id,original.continuity_root_id,original.worldline_id,
  prior.event_id,now_at,now_at,'VERIFIED',payload,refs,provenance,content_sha,lineage_sha);
 select * into inserted from public.universe_events where event_id=new_event_id;
 if inserted.event_id is null or
   inserted.lineage_hash<>lineage_sha or inserted.content_hash<>content_sha or
   inserted.parent_event_id<>prior.event_id or
   inserted.payload->>'original_work_id'<>p_target_original_work_id
 then raise exception 'REALITY_UNIVERSE_RECONCILE_TRANSACTION_READBACK_FAILED';end if;
 insert into reality_internal.genuine_universe_settlement_reconciliations_v1(
  target_original_work_id,repairing_trigger_id,repairing_work_id,owner_id,
  target_settlement_run_id,repairing_settlement_run_id,verified_event_id,
  target_provider_outcome_digest,receipt)
 values(p_target_original_work_id,p_repairing_trigger_id,repair.original_work_id,
  repair.owner_id,target.claim_run_id,p_repair_run_id,new_event_id,provider_digest,
  jsonb_build_object('status','PERSISTED_AWAITING_INDEPENDENT_READBACK',
    'original_work_id',p_target_original_work_id,
    'repairing_work_id',repair.original_work_id,
    'verified_event_id',new_event_id,'event_lineage_hash',lineage_sha,
    'event_content_hash',content_sha,'parent_event_id',prior.event_id,
    'original_root',original.continuity_root_id,
    'worldline_id',original.worldline_id,
    'repair_provider_run_id',p_repair_run_id,
    'target_provider_outcome_digest',provider_digest,
    'production_changed',false)) returning * into saved;
 return saved.receipt;
end $$;
revoke all on function public.reality_append_verified_genuine_universe_settlement_v1(uuid,text,bigint)
 from public,anon,authenticated;
grant execute on function public.reality_append_verified_genuine_universe_settlement_v1(uuid,text,bigint)
 to service_role;

-- Independent readback is separately callable after the insert transaction commits.
create or replace function public.reality_read_verified_genuine_universe_settlement_v1(
 p_target_original_work_id text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r reality_internal.genuine_universe_settlement_reconciliations_v1%rowtype;
 e public.universe_events%rowtype;
begin
 if current_user<>'service_role' then raise exception 'REALITY_UNIVERSE_READBACK_SERVICE_ROLE_ONLY';end if;
 select * into r from reality_internal.genuine_universe_settlement_reconciliations_v1
 where target_original_work_id=p_target_original_work_id;
 if r.target_original_work_id is null then
  return jsonb_build_object('status','UNRECONCILED');end if;
 select * into e from public.universe_events where event_id=r.verified_event_id;
 if e.event_id is null or e.epistemic_status<>'VERIFIED' or
  e.event_kind<>'OUTCOME' or e.parent_event_id::text<>r.receipt->>'parent_event_id' or
  e.content_hash<>r.receipt->>'event_content_hash' or
  e.lineage_hash<>r.receipt->>'event_lineage_hash' or
  e.payload->>'original_job_completed'<>'true' or
  e.payload->>'original_work_id'<>r.target_original_work_id or
  e.payload->>'repairing_work_id'<>r.repairing_work_id or
  e.payload->>'constitutional_phase'<>'SETTLED'
 then raise exception 'REALITY_UNIVERSE_INDEPENDENT_READBACK_MISMATCH';end if;
 return jsonb_build_object('status','VERIFIED_UNIVERSE_SETTLED',
  'original_work_id',r.target_original_work_id,'repairing_work_id',r.repairing_work_id,
  'verified_event_id',e.event_id,'content_hash',e.content_hash,
  'lineage_hash',e.lineage_hash,'parent_event_id',e.parent_event_id,
  'root',e.continuity_root_id,'worldline_id',e.worldline_id,
  'independent_database_readback',true,'production_changed',false);
end $$;
revoke all on function public.reality_read_verified_genuine_universe_settlement_v1(text)
 from public,anon,authenticated;
grant execute on function public.reality_read_verified_genuine_universe_settlement_v1(text)
 to service_role;
