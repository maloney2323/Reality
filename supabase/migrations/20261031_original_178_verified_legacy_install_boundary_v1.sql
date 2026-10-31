-- Exact, independently verified historical original #178 only. Other jobs unchanged.

-- Run in the isolated Supabase preview project; no owner approval or installation performed.


-- Strict, SERVICE-ONLY historical compatibility: exactly the first already
-- approved #178 investigation, original source and verified model artifact.
-- No new job, owner authority, capability installation, or settled outcome.
CREATE OR REPLACE FUNCTION reality_internal.reality_original178_legacy_verified_source_v1(
 p_owner_id uuid,p_conversation_id uuid,p_original_work_id text,
 p_original_work_event_id uuid,p_candidate_hash text,
 p_frozen_test_sha256 text,p_verifier_run_id bigint)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER
SET search_path TO ''
AS $reality_original178$
 SELECT coalesce(
  current_user='service_role'
  AND p_original_work_id='work:9b9578b3c65427589c4c6da68fe0fc87'
  AND p_candidate_hash='105c2c59bde7ae12e4e6e74d6ec8ccf6c159a32fcaaa34db9ff5e4ae358e409a'
  AND p_frozen_test_sha256='b42935d7300333ac7f1ecfce0aded8d2c7698bb88a55cbd413a96ebe0d73afdd'
  AND p_verifier_run_id=41217870164
  AND EXISTS (
   SELECT 1
   FROM reality_internal.original_178_recovery_v1 r
   JOIN reality_internal.governed_build_queue_v1 q ON q.id=r.original_queue_id
   JOIN public.universe_events s ON s.event_id=r.source_work_event_id
   JOIN public.universe_events g ON g.event_id=r.verified_gap_event_id
   JOIN reality_internal.goal_publication_epochs e
    ON e.user_id=r.owner_id AND e.conversation_id=r.conversation_id
   WHERE r.id='abf4d0ee-f0a9-4d0f-8285-02a516feddc1'::uuid
    AND r.owner_id=p_owner_id AND r.conversation_id=p_conversation_id
    AND r.original_work_id=p_original_work_id
    AND r.source_work_event_id=p_original_work_event_id
    AND r.phase='CLAIMED' AND r.recovery_claim_id IS NOT NULL
    AND r.dispatch_commit_sha ~ '^[a-f0-9]{40}$'
    AND r.dispatch_request_path='reality-requests/'||r.id::text||'.json'
    AND r.source_sha='6e6014f38f9fea382ea93b38418ec77e9158c1ef'
    AND r.frozen_test_sha256=p_frozen_test_sha256
    AND q.phase='ESCALATED' AND q.worker_claim_id=r.prior_worker_claim_id
    AND q.owner_id=p_owner_id AND q.conversation_id=p_conversation_id
    AND q.original_work_id=p_original_work_id
    AND q.original_work_evidence_ref=s.payload->>'gap_provider_receipt_ref'
    AND e.revision=q.goal_revision
    AND e.last_transition_event_id=q.goal_transition_event_id
    AND s.event_kind='WORK' AND s.epistemic_status='OBSERVED'
    AND s.entity_type='personal_first_self_upgrade_customer_work'
    AND s.provenance->>'principal_id'=p_owner_id::text
    AND s.provenance->>'conversation_id'=p_conversation_id::text
    AND s.payload->>'version'='reality-personal-first-upgrade-178-v0.1'
    AND s.payload->>'original_work_id'=p_original_work_id
    AND s.payload->>'issue_number'='178'
    AND s.payload->>'status'='INVESTIGATION_APPROVED_GAP_WORK_NOT_COMPLETED'
    AND s.payload->>'original_goal_id'=g.payload->>'goal_id'
    AND s.payload->>'goal_transition_receipt_ref'=e.last_transition_event_id::text
    AND s.payload->>'pinned_red_run'='https://github.com/maloney2323/Reality/actions/runs/40962921090'
    AND s.payload->>'gap_evidence_hash'=g.payload->>'evidence_hash'
    AND s.payload->>'model_generated'='false'
    AND s.payload->>'installation_authorized'='false'
    AND s.payload->>'original_job_completed'='false'
    AND g.event_kind='OBSERVATION' AND g.epistemic_status='VERIFIED'
    AND g.entity_type='personal_first_178_confirmed_gap'
    AND g.provenance->>'principal_id'=p_owner_id::text
    AND g.provenance->>'conversation_id'=p_conversation_id::text
    AND g.payload->>'original_source_receipt_ref'=s.event_id::text
    AND g.payload->>'original_work_id'=p_original_work_id
    AND g.payload->>'owner_id'=p_owner_id::text
    AND g.payload->>'provider_receipt_ref'=s.payload->>'gap_provider_receipt_ref'
    AND g.payload->>'authorization_granted'='false'
    AND g.payload->>'original_job_completed'='false'
  ),false);
$reality_original178$;
REVOKE EXECUTE ON FUNCTION reality_internal.reality_original178_legacy_verified_source_v1(uuid,uuid,text,uuid,text,text,bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION reality_internal.reality_original178_legacy_verified_source_v1(uuid,uuid,text,uuid,text,text,bigint) TO service_role;


CREATE OR REPLACE FUNCTION public.reality_authorize_general_repair_install_v2(p_owner_id uuid, p_conversation_id uuid, p_original_work_id text, p_original_work_event_id uuid, p_candidate_hash text, p_frozen_test_sha256 text, p_review_commit_sha text, p_verifier_run_id bigint, p_checkpoint_receipt_id uuid, p_checkpoint_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
 -- General verified jobs remain strictly bound to the exact owner, goal,
 -- source and frozen regression. The only legacy exception is the original
 -- #178 source verified by a separate existing immutable recovery claim.
 if source_event.event_id is null or NOT (
   coalesce((
    source_event.entity_type='reality_original_source_backed_repair_work'
    and source_event.event_kind='OBSERVATION'
    and source_event.epistemic_status='VERIFIED'
    and source_event.payload->>'owner_id'=p_owner_id::text
    and source_event.provenance->>'principal_id'=p_owner_id::text
    and source_event.payload->>'original_work_id'=p_original_work_id
    and source_event.payload->>'goal_transition_receipt_ref'=e.last_transition_event_id::text
    and source_event.payload->>'frozen_test_sha256'=p_frozen_test_sha256
    and source_event.payload->>'owner_authorized_investigation'='true'
    and source_event.payload->>'owner_authorized_installation'='false'
    and source_event.payload->>'original_job_completed'='false'
    and source_event.provenance->>'conversation_id'=p_conversation_id::text
   ),false)
   OR reality_internal.reality_original178_legacy_verified_source_v1(
    p_owner_id,p_conversation_id,p_original_work_id,
    p_original_work_event_id,p_candidate_hash,p_frozen_test_sha256,
    p_verifier_run_id)
 ) then
  raise exception 'GENERAL_REPAIR_VERIFIED_ORIGINAL_SOURCE_MISSING';
 end if;
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
       coalesce(source_event.payload->>'goal_id',source_event.payload->>'original_goal_id') or
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
   p_original_work_event_id,coalesce(source_event.payload->>'goal_id',source_event.payload->>'original_goal_id'),
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
end $function$;

CREATE OR REPLACE FUNCTION public.reality_enqueue_approved_repair_continuation_v1(p_owner_id uuid, p_conversation_id uuid, p_original_work_id text, p_reservation_id uuid, p_candidate_hash text, p_install_branch text, p_issue_number integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare a reality_internal.general_repair_owner_approvals_v1%rowtype;
 e reality_internal.goal_publication_epochs%rowtype;
 j reality_internal.approved_repair_continuations_v1%rowtype;
begin
 if current_user<>'service_role' then raise exception 'APPROVED_CONTINUATION_SERVICE_ROLE_REQUIRED';end if;
 if p_owner_id is null or p_reservation_id is null or p_conversation_id is null
  or p_original_work_id !~ '^work:[a-f0-9]{32}$'
  or p_candidate_hash !~ '^[a-f0-9]{64}$'
  or p_install_branch !~ '^feature/reality-[a-z0-9][a-z0-9/-]{5,105}$'
  or p_install_branch like '%..%'
  or p_issue_number not between 1 and 100000
 then raise exception 'APPROVED_CONTINUATION_EXACT_SCOPE_REQUIRED'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
  'reality-goal-pub-v1:'||p_owner_id::text||':'||p_conversation_id::text,0));
 select * into e from reality_internal.goal_publication_epochs where
  user_id=p_owner_id and conversation_id=p_conversation_id for update;
 select * into a from reality_internal.general_repair_owner_approvals_v1 where
  reservation_id=p_reservation_id and owner_id=p_owner_id
  and conversation_id=p_conversation_id and original_work_id=p_original_work_id
  and candidate_hash=p_candidate_hash for update;
 if a.reservation_id is null or a.status not in ('CLAIMED','INSTALLED','SETTLED')
  or a.claimed_at is null or e.user_id is null
  or e.last_transition_event_id is distinct from a.goal_transition_event_id
  or a.review_commit_sha !~ '^[a-f0-9]{40}$'
  or (a.install_branch is not null and a.install_branch<>p_install_branch)
 then raise exception 'APPROVED_CONTINUATION_ATOMIC_OWNER_CLAIM_REQUIRED'; end if;
 if not exists(select 1 from public.universe_events x
 where x.event_id=a.original_work_event_id
 and (
   (
    x.entity_type='reality_original_source_backed_repair_work'
    and x.event_kind='OBSERVATION' and x.epistemic_status='VERIFIED'
    and x.payload->>'owner_id'=p_owner_id::text
    and x.payload->>'original_work_id'=p_original_work_id
    and x.payload->>'issue_number'=p_issue_number::text
   )
   OR
   (
    x.entity_type='personal_first_self_upgrade_customer_work'
    and x.payload->>'issue_number'=p_issue_number::text
    and reality_internal.reality_original178_legacy_verified_source_v1(
     p_owner_id,p_conversation_id,p_original_work_id,
     a.original_work_event_id,a.candidate_hash,
     a.frozen_test_sha256,a.verifier_run_id)
   )
 )
) then raise exception 'APPROVED_CONTINUATION_ORIGINAL_EVIDENCE_MISSING'; end if;
 insert into reality_internal.approved_repair_continuations_v1
 (reservation_id,owner_id,conversation_id,original_work_id,issue_number,candidate_hash,install_branch)
 values (p_reservation_id,p_owner_id,p_conversation_id,p_original_work_id,p_issue_number,p_candidate_hash,p_install_branch)
 on conflict(reservation_id) do nothing;
 select * into j from reality_internal.approved_repair_continuations_v1 where reservation_id=p_reservation_id;
 if j.owner_id<>p_owner_id or j.original_work_id<>p_original_work_id
  or j.install_branch<>p_install_branch or j.candidate_hash<>p_candidate_hash
  or j.issue_number<>p_issue_number then
  raise exception 'APPROVED_CONTINUATION_IDEMPOTENT_SCOPE_CHANGED'; end if;
 return pg_catalog.jsonb_build_object('queued',true,'reservation_id',j.reservation_id,
  'status',j.status,'original_work_id',j.original_work_id,'installation_authorized',true,
  'original_job_completed',j.status='SETTLED','production_changed',false);
end $function$;
