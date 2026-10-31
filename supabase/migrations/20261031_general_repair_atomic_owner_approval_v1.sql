-- Reality general owner-approved repair, isolated preview only.
-- A source candidate cannot be installed without a distinct owner-signed,
-- exact-artifact, single-use reservation grounded in Continuity.
create table if not exists reality_internal.general_repair_owner_approvals_v1 (
 reservation_id uuid primary key default gen_random_uuid(),
 owner_id uuid not null,
 conversation_id uuid not null,
 queue_id uuid not null references reality_internal.governed_build_queue_v1(id),
 original_work_id text not null check (original_work_id ~ '^work:[a-f0-9]{32}$'),
 original_work_event_id uuid not null references public.universe_events(event_id),
 goal_id text not null,
 goal_transition_event_id uuid not null,
 candidate_hash text not null check(candidate_hash ~ '^[a-f0-9]{64}$'),
 frozen_test_sha256 text not null check(frozen_test_sha256 ~ '^[a-f0-9]{64}$'),
 review_commit_sha text not null check(review_commit_sha ~ '^[a-f0-9]{40}$'),
 verifier_run_id bigint not null check(verifier_run_id>0),
 checkpoint_receipt_id uuid not null references public.universe_events(event_id),
 checkpoint_hash text not null check(checkpoint_hash ~ '^[a-f0-9]{64}$'),
 status text not null default 'RESERVED' check(status in ('RESERVED','CLAIMED','INSTALLED','SETTLED','RECONCILIATION_REQUIRED')),
 install_branch text,
 installed_commit_sha text,
 claimed_at timestamptz,
 installed_at timestamptz,
 settled_at timestamptz,
 created_at timestamptz not null default now(),
 unique(owner_id,original_work_id),
 unique(queue_id)
);
revoke all on reality_internal.general_repair_owner_approvals_v1 from public,anon,authenticated;
grant select,insert,update on reality_internal.general_repair_owner_approvals_v1 to service_role;
alter table reality_internal.general_repair_owner_approvals_v1 enable row level security;

create or replace function public.reality_authorize_general_repair_install_v1(
 p_owner_id uuid,p_conversation_id uuid,p_queue_id uuid,
 p_original_work_id text,p_original_work_event_id uuid,
 p_candidate_hash text,p_frozen_test_sha256 text,
 p_review_commit_sha text,p_verifier_run_id bigint,
 p_checkpoint_receipt_id uuid,p_checkpoint_hash text)
returns jsonb language plpgsql security invoker set search_path=''
as $body$
declare q reality_internal.governed_build_queue_v1%rowtype;
 e reality_internal.goal_publication_epochs%rowtype;
 existing reality_internal.general_repair_owner_approvals_v1%rowtype;
begin
 if current_user <> 'service_role' then raise exception 'GENERAL_REPAIR_SERVICE_ONLY'; end if;
 if p_owner_id is null or p_conversation_id is null or p_queue_id is null
  or p_original_work_event_id is null or p_checkpoint_receipt_id is null
  or p_original_work_id !~ '^work:[a-f0-9]{32}$'
  or p_candidate_hash !~ '^[a-f0-9]{64}$'
  or p_frozen_test_sha256 !~ '^[a-f0-9]{64}$'
  or p_review_commit_sha !~ '^[a-f0-9]{40}$'
  or p_checkpoint_hash !~ '^[a-f0-9]{64}$'
  or p_verifier_run_id is null or p_verifier_run_id<1
 then raise exception 'GENERAL_REPAIR_EXACT_OWNER_SCOPE_REQUIRED';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
  'reality-goal-pub-v1:'||p_owner_id::text||':'||p_conversation_id::text,0));
 select * into q from reality_internal.governed_build_queue_v1
  where id=p_queue_id and owner_id=p_owner_id and conversation_id=p_conversation_id
  for update;
 select * into e from reality_internal.goal_publication_epochs
  where user_id=p_owner_id and conversation_id=p_conversation_id for update;
 if q.id is null or e.user_id is null
  or q.original_work_id<>p_original_work_id
  or q.original_work_evidence_ref<>p_original_work_event_id::text
  or q.phase not in ('QUEUED_DISCOVERY','AWAITING_OWNER_APPROVAL')
  or q.goal_revision is distinct from e.revision
  or q.goal_transition_event_id is distinct from e.last_transition_event_id
 then raise exception 'GENERAL_REPAIR_CURRENT_OWNER_GOAL_QUEUE_MISSING';end if;
 if not exists(select 1 from public.universe_events x
   where x.event_id=p_original_work_event_id
    and x.continuity_root_id=q.continuity_root_id and x.worldline_id=q.worldline_id
    and x.entity_type='reality_original_source_backed_repair_work'
    and x.payload->>'owner_id'=p_owner_id::text
    and x.payload->>'original_work_id'=p_original_work_id
    and x.payload->>'goal_id'=q.goal_id
    and x.payload->>'goal_transition_receipt_ref'=q.goal_transition_event_id::text
    and x.payload->>'owner_authorized_investigation'='true'
    and x.payload->>'owner_authorized_installation'='false'
    and x.payload->>'original_job_completed'='false'
    and x.payload->>'frozen_test_sha256'=p_frozen_test_sha256
 ) then raise exception 'GENERAL_REPAIR_ORIGINAL_WORK_CONTINUITY_MISSING';end if;
 if not exists(select 1 from public.universe_events x
   where x.event_id=p_checkpoint_receipt_id
    and x.continuity_root_id=q.continuity_root_id and x.worldline_id=q.worldline_id
    and x.entity_type='reality_general_constitutional_checkpoint'
    and x.payload->>'original_work_id'=p_original_work_id
    and x.payload->>'constitutional_phase'='AWAITING_OWNER_APPROVAL'
    and x.payload->>'constitutional_head_hash'=p_checkpoint_hash
    and x.payload->>'installation_authorized'='false'
    and x.payload->>'original_job_completed'='false'
    and x.payload->'driver_state'->'candidate'->>'artifact_hash'=p_candidate_hash
    and x.payload->'driver_state'->'sandbox_receipt'->>'artifact_hash'=p_candidate_hash
    and x.payload->'driver_state'->'sandbox_receipt'->>'independent_tests_passed'='true'
    and x.payload->'driver_state'->'sandbox_receipt'->>'frozen_regression_passed'='true'
    and x.payload->'driver_state'->'sandbox_receipt'->>'governance_preserved'='true'
    and x.payload->'driver_state'->'sandbox_receipt'->>'verifier_run_ref'=
      'github:actions:run:'||p_verifier_run_id::text
    and x.payload->'driver_state'->'promotion_authorization'='null'::jsonb
    and x.payload->'driver_state'->'journal'->-1->>'kind'='SANDBOX_VERIFIED'
 ) then raise exception 'GENERAL_REPAIR_INDEPENDENT_SANDBOX_CHECKPOINT_MISSING';end if;
 select * into existing from reality_internal.general_repair_owner_approvals_v1
   where owner_id=p_owner_id and original_work_id=p_original_work_id for update;
 if existing.reservation_id is not null then
  if existing.status<>'RESERVED' or existing.queue_id<>p_queue_id
    or existing.candidate_hash<>p_candidate_hash
    or existing.checkpoint_receipt_id<>p_checkpoint_receipt_id
    or existing.review_commit_sha<>p_review_commit_sha
  then raise exception 'GENERAL_REPAIR_OWNER_APPROVAL_ALREADY_CONSUMED_OR_CONFLICT';end if;
 else
  insert into reality_internal.general_repair_owner_approvals_v1(
    owner_id,conversation_id,queue_id,original_work_id,original_work_event_id,
    goal_id,goal_transition_event_id,candidate_hash,frozen_test_sha256,
    review_commit_sha,verifier_run_id,checkpoint_receipt_id,checkpoint_hash)
  values(p_owner_id,p_conversation_id,p_queue_id,p_original_work_id,
    p_original_work_event_id,q.goal_id,q.goal_transition_event_id,
    p_candidate_hash,p_frozen_test_sha256,p_review_commit_sha,
    p_verifier_run_id,p_checkpoint_receipt_id,p_checkpoint_hash)
  returning * into existing;
 end if;
 return pg_catalog.jsonb_build_object(
  'approved_exact_candidate',true,'owner_action','AUTHENTICATED_OWNER_EXPLICIT_ACTION',
  'reservation_id',existing.reservation_id,'queue_id',p_queue_id,
  'owner_id',p_owner_id,'original_work_id',p_original_work_id,
  'candidate_hash',p_candidate_hash,'status',existing.status,
  'consumed_once',false,'installation_performed',false,
  'original_job_completed',false,'target_environment','ISOLATED_PREVIEW',
  'production_changed',false);
end $body$;

create or replace function public.reality_claim_general_repair_install_v1(
 p_owner_id uuid,p_conversation_id uuid,p_reservation_id uuid,
 p_original_work_id text,p_candidate_hash text)
returns jsonb language plpgsql security invoker set search_path=''
as $body$
declare a reality_internal.general_repair_owner_approvals_v1%rowtype;
 e reality_internal.goal_publication_epochs%rowtype;
begin
 if current_user<>'service_role' then raise exception 'GENERAL_REPAIR_SERVICE_ONLY';end if;
 select * into a from reality_internal.general_repair_owner_approvals_v1
  where reservation_id=p_reservation_id and owner_id=p_owner_id
   and conversation_id=p_conversation_id and original_work_id=p_original_work_id
   and candidate_hash=p_candidate_hash for update;
 select * into e from reality_internal.goal_publication_epochs
  where user_id=p_owner_id and conversation_id=p_conversation_id for update;
 if a.reservation_id is null or a.status<>'RESERVED' or
  e.user_id is null or e.last_transition_event_id is distinct from a.goal_transition_event_id
 then raise exception 'GENERAL_REPAIR_ATOMIC_SINGLE_USE_CLAIM_DENIED';end if;
 update reality_internal.general_repair_owner_approvals_v1
  set status='CLAIMED',claimed_at=pg_catalog.now()
  where reservation_id=a.reservation_id and status='RESERVED';
 if not found then raise exception 'GENERAL_REPAIR_CONCURRENT_CLAIM_BLOCKED';end if;
 return pg_catalog.jsonb_build_object(
  'claimed',true,'consumed_once',true,'reservation_id',a.reservation_id,
  'owner_id',a.owner_id,'original_work_id',a.original_work_id,
  'candidate_hash',a.candidate_hash,'checkpoint_receipt_id',a.checkpoint_receipt_id,
  'target_environment','ISOLATED_PREVIEW','production_changed',false,
  'installation_performed',false,'original_job_completed',false);
end $body$;
revoke all on function public.reality_authorize_general_repair_install_v1(
 uuid,uuid,uuid,text,uuid,text,text,text,bigint,uuid,text)
 from public,anon,authenticated;
grant execute on function public.reality_authorize_general_repair_install_v1(
 uuid,uuid,uuid,text,uuid,text,text,text,bigint,uuid,text)
 to service_role;
revoke all on function public.reality_claim_general_repair_install_v1(
 uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.reality_claim_general_repair_install_v1(
 uuid,uuid,uuid,text,text) to service_role;
