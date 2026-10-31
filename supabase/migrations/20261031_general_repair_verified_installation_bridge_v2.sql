-- The general source-backed work is an owner-verified Continuity event, not
-- necessarily a legacy governed_build_queue row. Keep prior v1 queue records
-- intact; allow NULL queue_id only for this strictly validated v2 RPC.
alter table reality_internal.general_repair_owner_approvals_v1
  alter column queue_id drop not null;

create or replace function public.reality_authorize_general_repair_install_v2(
 p_owner_id uuid,p_conversation_id uuid,
 p_original_work_id text,p_original_work_event_id uuid,
 p_candidate_hash text,p_frozen_test_sha256 text,
 p_review_commit_sha text,p_verifier_run_id bigint,
 p_checkpoint_receipt_id uuid,p_checkpoint_hash text)
returns jsonb language plpgsql security invoker set search_path=''
as $fn$
declare
 e reality_internal.goal_publication_epochs%rowtype;
 a reality_internal.general_repair_owner_approvals_v1%rowtype;
 source_event public.universe_events%rowtype;
 checkpoint public.universe_events%rowtype;
begin
 if current_user <> 'service_role' then
  raise exception 'GENERAL_REPAIR_SERVICE_ONLY';
 end if;
 if p_owner_id is null or p_conversation_id is null or
    p_original_work_event_id is null or p_checkpoint_receipt_id is null or
    p_original_work_id !~ '^work:[a-f0-9]{32}$' or
    p_candidate_hash !~ '^[a-f0-9]{64}$' or
    p_frozen_test_sha256 !~ '^[a-f0-9]{64}$' or
    p_review_commit_sha !~ '^[a-f0-9]{40}$' or
    p_checkpoint_hash !~ '^[a-f0-9]{64}$' or
    p_verifier_run_id is null or p_verifier_run_id<1
 then raise exception 'GENERAL_REPAIR_EXACT_OWNER_SCOPE_REQUIRED';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
 'reality-goal-pub-v1:'||p_owner_id::text||':'||p_conversation_id::text,0));
 select * into e from reality_internal.goal_publication_epochs
 where user_id=p_owner_id and conversation_id=p_conversation_id for update;
 if e.user_id is null or e.last_transition_event_id is null then
  raise exception 'GENERAL_REPAIR_CURRENT_OWNER_GOAL_MISSING';
 end if;
 select * into source_event from public.universe_events
 where event_id=p_original_work_event_id;
 if source_event.event_id is null or
    source_event.entity_type<>'reality_original_source_backed_repair_work' or
    source_event.payload->>'owner_id'<>p_owner_id::text or
    source_event.payload->>'original_work_id'<>p_original_work_id or
    source_event.payload->>'goal_transition_receipt_ref'<>e.last_transition_event_id::text or
    source_event.payload->>'frozen_test_sha256'<>p_frozen_test_sha256 or
    source_event.payload->>'owner_authorized_investigation'<>'true' or
    source_event.payload->>'owner_authorized_installation'<>'false' or
    source_event.payload->>'original_job_completed'<>'false' or
    source_event.provenance->>'conversation_id'<>p_conversation_id::text
 then raise exception 'GENERAL_REPAIR_VERIFIED_ORIGINAL_SOURCE_MISSING';end if;
 select * into checkpoint from public.universe_events
 where event_id=p_checkpoint_receipt_id;
 if checkpoint.event_id is null or
    checkpoint.entity_type<>'reality_general_constitutional_checkpoint' or
    checkpoint.continuity_root_id<>source_event.continuity_root_id or
    checkpoint.worldline_id<>source_event.worldline_id or
    checkpoint.payload->>'owner_id'<>p_owner_id::text or
    checkpoint.payload->>'original_work_id'<>p_original_work_id or
    checkpoint.payload->>'original_source_receipt_ref'<>p_original_work_event_id::text or
    checkpoint.payload->>'constitutional_phase'<>'AWAITING_OWNER_APPROVAL' or
    checkpoint.payload->>'constitutional_head_hash'<>p_checkpoint_hash or
    checkpoint.payload->>'installation_authorized'<>'false' or
    checkpoint.payload->>'original_job_completed'<>'false' or
    checkpoint.payload->'driver_state'->'scope'->>'goal_id'<>
       source_event.payload->>'goal_id' or
    checkpoint.payload->'driver_state'->'scope'->>'goal_transition_receipt_ref'<>
       e.last_transition_event_id::text or
    checkpoint.payload->'driver_state'->'candidate'->>'artifact_hash'<>p_candidate_hash or
    checkpoint.payload->'driver_state'->'sandbox_receipt'->>'artifact_hash'<>p_candidate_hash or
    checkpoint.payload->'driver_state'->'sandbox_receipt'->>'independent_tests_passed'<>'true' or
    checkpoint.payload->'driver_state'->'sandbox_receipt'->>'frozen_regression_passed'<>'true' or
    checkpoint.payload->'driver_state'->'sandbox_receipt'->>'governance_preserved'<>'true' or
    checkpoint.payload->'driver_state'->'sandbox_receipt'->>'verifier_run_ref'<>
      'github:actions:run:'||p_verifier_run_id::text or
    checkpoint.payload->'driver_state'->'journal'->-1->>'kind'<>'SANDBOX_VERIFIED'
 then raise exception 'GENERAL_REPAIR_VERIFIED_SOURCE_CHECKPOINT_MISSING';end if;
 select * into a from reality_internal.general_repair_owner_approvals_v1
 where owner_id=p_owner_id and original_work_id=p_original_work_id for update;
 if a.reservation_id is not null then
  if a.status<>'RESERVED' or a.conversation_id<>p_conversation_id or
     a.original_work_event_id<>p_original_work_event_id or
     a.checkpoint_receipt_id<>p_checkpoint_receipt_id or
     a.checkpoint_hash<>p_checkpoint_hash or
     a.candidate_hash<>p_candidate_hash or
     a.frozen_test_sha256<>p_frozen_test_sha256 or
     a.review_commit_sha<>p_review_commit_sha or
     a.verifier_run_id<>p_verifier_run_id
  then raise exception 'GENERAL_REPAIR_SINGLE_USE_ALREADY_COMMITTED';end if;
 else
  insert into reality_internal.general_repair_owner_approvals_v1(
   owner_id,conversation_id,queue_id,original_work_id,
   original_work_event_id,goal_id,goal_transition_event_id,
   candidate_hash,frozen_test_sha256,review_commit_sha,
   verifier_run_id,checkpoint_receipt_id,checkpoint_hash)
  values(p_owner_id,p_conversation_id,null,p_original_work_id,
   p_original_work_event_id,source_event.payload->>'goal_id',
   e.last_transition_event_id,p_candidate_hash,p_frozen_test_sha256,
   p_review_commit_sha,p_verifier_run_id,p_checkpoint_receipt_id,p_checkpoint_hash)
  returning * into a;
 end if;
 return pg_catalog.jsonb_build_object(
  'reservation_id',a.reservation_id,
  'owner_id',a.owner_id,'original_work_id',a.original_work_id,
  'candidate_hash',a.candidate_hash,'status',a.status,
  'target_environment','ISOLATED_PREVIEW','consumed_once',false,
  'installation_performed',false,'job_completed',false,
  'production_changed',false);
end $fn$;

create or replace function public.reality_mark_general_repair_installed_v1(
 p_owner_id uuid,p_conversation_id uuid,p_reservation_id uuid,
 p_original_work_id text,p_candidate_hash text,p_branch text,p_commit_sha text)
returns jsonb language plpgsql security invoker set search_path=''
as $fn$
declare a reality_internal.general_repair_owner_approvals_v1%rowtype;
begin
 if current_user<>'service_role' then raise exception 'GENERAL_REPAIR_SERVICE_ONLY';end if;
 if p_branch !~ '^feature/reality-[a-z0-9][a-z0-9/-]{5,105}$' or
    p_branch like '%..%' or p_commit_sha !~ '^[a-f0-9]{40}$'
 then raise exception 'GENERAL_REPAIR_ISOLATED_BRANCH_PIN_REQUIRED';end if;
 select * into a from reality_internal.general_repair_owner_approvals_v1
 where owner_id=p_owner_id and conversation_id=p_conversation_id
 and reservation_id=p_reservation_id and original_work_id=p_original_work_id
 and candidate_hash=p_candidate_hash for update;
 if a.reservation_id is null or a.status not in ('CLAIMED','INSTALLED')
 then raise exception 'GENERAL_REPAIR_CLAIMED_OWNER_INSTALL_MISSING';end if;
 if a.status='INSTALLED' and
 (a.install_branch is distinct from p_branch or
  a.installed_commit_sha is distinct from p_commit_sha)
 then raise exception 'GENERAL_REPAIR_INSTALLED_SOURCE_CONFLICT';end if;
 update reality_internal.general_repair_owner_approvals_v1
 set status='INSTALLED',install_branch=p_branch,
  installed_commit_sha=p_commit_sha,
  installed_at=coalesce(installed_at,pg_catalog.now())
 where reservation_id=a.reservation_id;
 return pg_catalog.jsonb_build_object(
 'verified',true,'status','INSTALLED','reservation_id',a.reservation_id,
 'owner_id',a.owner_id,'original_work_id',a.original_work_id,
 'artifact_hash',a.candidate_hash,'branch',p_branch,
 'installed_commit_sha',p_commit_sha,'production_changed',false,
 'original_job_completed',false);
end $fn$;

create or replace function public.reality_read_general_repair_progress_v2(
 p_owner_id uuid,p_conversation_id uuid,p_original_work_id text)
returns jsonb language plpgsql security invoker set search_path=''
as $fn$
declare a reality_internal.general_repair_owner_approvals_v1%rowtype;
begin
 if current_user<>'service_role' then raise exception 'GENERAL_REPAIR_SERVICE_ONLY';end if;
 select * into a from reality_internal.general_repair_owner_approvals_v1
 where owner_id=p_owner_id and conversation_id=p_conversation_id
 and original_work_id=p_original_work_id;
 if a.reservation_id is null then
  return '{"status":"NOT_APPROVED","installed":false,"job_completed":false}'::jsonb;
 end if;
 return pg_catalog.jsonb_build_object(
 'status',a.status,'reservation_id',a.reservation_id,
 'owner_id',a.owner_id,'conversation_id',a.conversation_id,
 'original_work_id',a.original_work_id,'original_work_event_id',a.original_work_event_id,
 'goal_id',a.goal_id,'goal_transition_event_id',a.goal_transition_event_id,
 'candidate_hash',a.candidate_hash,'frozen_test_sha256',a.frozen_test_sha256,
 'review_commit_sha',a.review_commit_sha,'verifier_run_id',a.verifier_run_id,
 'checkpoint_receipt_id',a.checkpoint_receipt_id,
 'checkpoint_hash',a.checkpoint_hash,
 'install_branch',a.install_branch,'installed_commit_sha',a.installed_commit_sha,
 'consumed_once',a.status in ('CLAIMED','INSTALLED','SETTLED'),
 'production_changed',false);
end $fn$;
revoke all on function public.reality_authorize_general_repair_install_v2(uuid,uuid,text,uuid,text,text,text,bigint,uuid,text) from public,anon,authenticated;
grant execute on function public.reality_authorize_general_repair_install_v2(uuid,uuid,text,uuid,text,text,text,bigint,uuid,text) to service_role;
revoke all on function public.reality_mark_general_repair_installed_v1(uuid,uuid,uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.reality_mark_general_repair_installed_v1(uuid,uuid,uuid,text,text,text,text) to service_role;
revoke all on function public.reality_read_general_repair_progress_v2(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.reality_read_general_repair_progress_v2(uuid,uuid,text) to service_role;
