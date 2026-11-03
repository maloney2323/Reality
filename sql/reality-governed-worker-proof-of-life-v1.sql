-- OIDC-authenticated runner proof-of-life and fresh-governance transitions.
-- All RPCs require the trusted edge function's service_role call. GitHub's
-- signed JWT and run/provider evidence are checked by the edge before RPCs.
CREATE OR REPLACE FUNCTION public.reality_ack_governed_worker_alive_v1(
 p_approval_id uuid,p_fence bigint,p_run_id bigint,p_run_attempt integer,p_source_sha text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE w reality_internal.governed_execution_wake_outbox_v1%rowtype;
        q reality_internal.genuine_capability_queue_v1%rowtype;
        a reality_internal.genuine_preview_install_approvals_v1%rowtype;
        e reality_internal.goal_publication_epochs%rowtype;
BEGIN
 IF current_user <> 'service_role' THEN RAISE EXCEPTION 'LIFE_SERVICE_ROLE_REQUIRED'; END IF;
 IF p_run_id IS NULL OR p_run_id<1 OR p_run_attempt IS NULL OR
   p_run_attempt<1 OR p_run_attempt>100 OR
   p_source_sha !~ '^[a-f0-9]{40}$' OR p_fence<1 THEN
   RAISE EXCEPTION 'LIFE_SIGNED_PROVIDER_INPUT_INVALID'; END IF;
 SELECT * INTO w FROM reality_internal.governed_execution_wake_outbox_v1
  WHERE approval_id=p_approval_id FOR UPDATE;
 IF w.approval_id IS NULL OR w.dispatch_fence<>p_fence
   OR w.dispatch_lease_expires_at<=now()
 THEN RAISE EXCEPTION 'LIFE_FENCED_DELIVERY_NOT_CURRENT'; END IF;
 IF w.wake_state='WORKER_ALIVE' AND w.worker_run_id=p_run_id
   AND w.worker_run_attempt=p_run_attempt THEN
  RETURN jsonb_build_object('status','WORKER_ALIVE_SIGNED_AND_RECORDED',
    'idempotent',true,'approval_id',p_approval_id,'fence',p_fence,
    'execution_authorized',false);
 END IF;
 IF w.wake_state<>'DISPATCH_ACCEPTED' THEN
  RAISE EXCEPTION 'LIFE_REPLAY_OR_DELIVERY_NOT_ACCEPTED'; END IF;
 SELECT * INTO a FROM reality_internal.genuine_preview_install_approvals_v1
  WHERE approval_id=p_approval_id;
 SELECT * INTO q FROM reality_internal.genuine_capability_queue_v1
  WHERE trigger_id=w.trigger_id;
 SELECT * INTO e FROM reality_internal.goal_publication_epochs
  WHERE user_id=q.owner_id AND conversation_id=q.conversation_id;
 IF a.approval_id IS NULL OR q.trigger_id IS NULL OR e.user_id IS NULL
 OR a.owner_id IS DISTINCT FROM w.owner_id
 OR a.original_work_id IS DISTINCT FROM w.original_work_id
 OR a.artifact_hash IS DISTINCT FROM w.artifact_sha256
 OR a.pre_state_hash IS DISTINCT FROM w.pre_state_hash
 OR a.valid_time IS DISTINCT FROM w.approval_valid_time
 OR a.target_environment<>'ISOLATED_PREVIEW'
 OR a.approval_receipt->>'approval_origin'<>'AUTHENTICATED_OWNER_EXPLICIT_ACTION'
 OR a.consumed_at IS NOT NULL
 OR q.phase<>'AWAITING_OWNER_APPROVAL'
 OR q.goal_transition_event_id IS DISTINCT FROM w.goal_transition_event_id
 OR e.last_transition_event_id IS DISTINCT FROM w.goal_transition_event_id
 OR q.provider_failure_hash IS DISTINCT FROM w.provider_failure_hash
 OR q.qualification_receipt->>'artifact_sha256' IS DISTINCT FROM w.artifact_sha256 THEN
  UPDATE reality_internal.governed_execution_wake_outbox_v1
    SET wake_state='STALE_APPROVAL_BLOCKED',updated_at=now()
  WHERE approval_id=p_approval_id;
  INSERT INTO reality_internal.governed_execution_wake_events_v1
    (approval_id,dispatch_fence,wake_state,detail)
  VALUES(p_approval_id,p_fence,'STALE_APPROVAL_BLOCKED',
    jsonb_build_object('reason','MATERIAL_LEDGER_SNAPSHOT_CHANGED'));
  RETURN jsonb_build_object('status','STALE_APPROVAL_BLOCKED',
    'execution_authorized',false);
 END IF;
 UPDATE reality_internal.governed_execution_wake_outbox_v1
  SET wake_state='WORKER_ALIVE',worker_run_id=p_run_id,
    worker_run_attempt=p_run_attempt,first_worker_alive_at=now(),
    updated_at=now()
 WHERE approval_id=p_approval_id;
 INSERT INTO reality_internal.governed_execution_wake_events_v1
  (approval_id,dispatch_fence,wake_state,detail)
 VALUES(p_approval_id,p_fence,'WORKER_ALIVE',
   jsonb_build_object('provider','GITHUB_OIDC',
    'run_id',p_run_id,'run_attempt',p_run_attempt,'source_sha',p_source_sha,
    'execution_authorized',false));
 RETURN jsonb_build_object('status','WORKER_ALIVE_SIGNED_AND_RECORDED',
  'approval_id',p_approval_id,'fence',p_fence,
  'execution_authorized',false,'governance_ready',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_ack_governed_worker_alive_v1(
 uuid,bigint,bigint,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_ack_governed_worker_alive_v1(
 uuid,bigint,bigint,integer,text) TO service_role;

CREATE OR REPLACE FUNCTION public.reality_validate_governed_worker_freshness_v1(
 p_approval_id uuid,p_fence bigint,p_run_id bigint,p_run_attempt integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE w reality_internal.governed_execution_wake_outbox_v1%rowtype;
        q reality_internal.genuine_capability_queue_v1%rowtype;
        a reality_internal.genuine_preview_install_approvals_v1%rowtype;
        e reality_internal.goal_publication_epochs%rowtype;
BEGIN
 IF current_user <> 'service_role' THEN
  RAISE EXCEPTION 'FRESHNESS_SERVICE_ROLE_REQUIRED'; END IF;
 SELECT * INTO w FROM reality_internal.governed_execution_wake_outbox_v1
 WHERE approval_id=p_approval_id FOR UPDATE;
 IF w.approval_id IS NULL OR w.dispatch_fence<>p_fence OR
  w.worker_run_id IS DISTINCT FROM p_run_id OR
  w.worker_run_attempt IS DISTINCT FROM p_run_attempt OR
  w.dispatch_lease_expires_at<=now() THEN
   RAISE EXCEPTION 'FRESHNESS_SIGNED_WORKER_FENCE_NOT_CURRENT'; END IF;
 IF w.wake_state='GOVERNANCE_READY' THEN
  RETURN jsonb_build_object('status','GOVERNANCE_READY',
   'idempotent',true,'execution_authorized',false); END IF;
 IF w.wake_state<>'WORKER_ALIVE' THEN
  RAISE EXCEPTION 'FRESHNESS_WORKER_LIFE_NOT_VERIFIED'; END IF;
 SELECT * INTO a FROM reality_internal.genuine_preview_install_approvals_v1
 WHERE approval_id=p_approval_id;
 SELECT * INTO q FROM reality_internal.genuine_capability_queue_v1
 WHERE trigger_id=w.trigger_id;
 SELECT * INTO e FROM reality_internal.goal_publication_epochs
 WHERE user_id=q.owner_id AND conversation_id=q.conversation_id;
 IF a.approval_id IS NULL OR q.trigger_id IS NULL OR e.user_id IS NULL
 OR a.owner_id IS DISTINCT FROM w.owner_id
 OR a.original_work_id IS DISTINCT FROM w.original_work_id
 OR a.artifact_hash IS DISTINCT FROM w.artifact_sha256
 OR a.pre_state_hash IS DISTINCT FROM w.pre_state_hash
 OR a.valid_time IS DISTINCT FROM w.approval_valid_time
 OR a.consumed_at IS NOT NULL
 OR a.installed_commit_sha IS NOT NULL
 OR q.phase <> 'AWAITING_OWNER_APPROVAL'
 OR e.last_transition_event_id IS DISTINCT FROM w.goal_transition_event_id
 OR q.goal_transition_event_id IS DISTINCT FROM w.goal_transition_event_id
 OR q.provider_failure_hash IS DISTINCT FROM w.provider_failure_hash
 OR q.qualification_receipt->>'artifact_sha256' IS DISTINCT FROM w.artifact_sha256
 THEN
  UPDATE reality_internal.governed_execution_wake_outbox_v1
   SET wake_state='STALE_APPROVAL_BLOCKED',updated_at=now()
  WHERE approval_id=p_approval_id;
  INSERT INTO reality_internal.governed_execution_wake_events_v1
   (approval_id,dispatch_fence,wake_state,detail)
  VALUES(p_approval_id,p_fence,'STALE_APPROVAL_BLOCKED',
   jsonb_build_object('reason','MATERIAL_CONTEXT_DRIFT_ON_WORKER_ADMISSION'));
  RETURN jsonb_build_object('status','STALE_APPROVAL_BLOCKED',
   'execution_authorized',false);
 END IF;
 UPDATE reality_internal.governed_execution_wake_outbox_v1
  SET wake_state='GOVERNANCE_READY',updated_at=now()
 WHERE approval_id=p_approval_id;
 INSERT INTO reality_internal.governed_execution_wake_events_v1
  (approval_id,dispatch_fence,wake_state,detail)
 VALUES(p_approval_id,p_fence,'GOVERNANCE_READY',
 jsonb_build_object('material_goal_and_candidate_state','CURRENT',
  'note','Final single-use install still needs independent existing reservation'));
 RETURN jsonb_build_object('status','GOVERNANCE_READY',
  'execution_authorized',false,
  'requires_original_single_use_install_reservation',true);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_validate_governed_worker_freshness_v1(
 uuid,bigint,bigint,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_validate_governed_worker_freshness_v1(
 uuid,bigint,bigint,integer) TO service_role;
