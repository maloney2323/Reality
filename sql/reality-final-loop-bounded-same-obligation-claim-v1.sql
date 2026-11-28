-- Existing packet and child carry the additional authority decision and
-- immutable historical attempt. No new original, executor, or scheduler.
ALTER TABLE reality_internal.final_loop_child_approval_packets_v1
 ADD COLUMN IF NOT EXISTS same_obligation_recovery_approval jsonb;
ALTER TABLE reality_internal.final_loop_child_review_work_v1
 ADD COLUMN IF NOT EXISTS historical_prepare_fence jsonb;

-- Keep the historical claim and invocation permanently attributable even
-- when the existing child allocator is permitted to reserve a distinct
-- continuation. An interrupted new attempt cannot be reset a second time.
CREATE OR REPLACE FUNCTION reality_internal.guard_final_loop_historical_prepare_fence_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $guard$
BEGIN
 IF TG_OP='DELETE' THEN
  IF OLD.historical_prepare_fence IS NOT NULL THEN RAISE EXCEPTION 'FINAL_LOOP_HISTORICAL_INVOCATION_CANNOT_BE_DELETED';END IF;
  RETURN OLD;
 END IF;
 IF OLD.historical_prepare_fence IS NOT NULL AND
  (NEW.historical_prepare_fence IS DISTINCT FROM OLD.historical_prepare_fence
   OR NEW.child_work_id IS DISTINCT FROM OLD.child_work_id
   OR NEW.parent_original_work_id IS DISTINCT FROM OLD.parent_original_work_id
   OR NEW.owner_id IS DISTINCT FROM OLD.owner_id OR NEW.shift_id IS DISTINCT FROM OLD.shift_id
   OR NEW.plan_id IS DISTINCT FROM OLD.plan_id OR NEW.packet_id IS DISTINCT FROM OLD.packet_id
   OR NEW.scope_sha256 IS DISTINCT FROM OLD.scope_sha256 OR NEW.scope_index IS DISTINCT FROM OLD.scope_index
   OR NEW.source_head_sha IS DISTINCT FROM OLD.source_head_sha
   OR NEW.source_manifest_sha256 IS DISTINCT FROM OLD.source_manifest_sha256
   OR NEW.acceptance_contract_sha256 IS DISTINCT FROM OLD.acceptance_contract_sha256
   OR NEW.premodel_recovery_count IS DISTINCT FROM OLD.premodel_recovery_count
   OR NEW.canonical_prepare_invocation_id::text=OLD.historical_prepare_fence->>'invocation_id'
   OR NEW.canonical_verify_invocation_id::text=OLD.historical_prepare_fence->>'invocation_id'
   OR NEW.claimant_worker_run_id::text=OLD.historical_prepare_fence->>'worker_run_id'
   OR NEW.canonical_verify_invocation_run_id::text=OLD.historical_prepare_fence->>'worker_run_id'
   OR (OLD.canonical_prepare_invocation_id IS NOT NULL AND NEW.canonical_prepare_invocation_id IS DISTINCT FROM OLD.canonical_prepare_invocation_id)
   OR (OLD.canonical_verify_invocation_id IS NOT NULL AND NEW.canonical_verify_invocation_id IS DISTINCT FROM OLD.canonical_verify_invocation_id)
   OR (OLD.phase<>'ADMITTED' AND NEW.claim_id IS DISTINCT FROM OLD.claim_id)
   OR (OLD.claimant_worker_run_id IS NOT NULL AND NEW.claimant_worker_run_id IS DISTINCT FROM OLD.claimant_worker_run_id)
   OR NEW.phase='ADMITTED')
 THEN RAISE EXCEPTION 'FINAL_LOOP_HISTORICAL_INVOCATION_OR_CONTINUATION_IMMUTABLE';END IF;
 IF OLD.historical_prepare_fence IS NULL AND NEW.historical_prepare_fence IS NOT NULL THEN
  IF OLD.phase<>'CLAIMED' OR OLD.canonical_prepare_invocation_id IS NULL
    OR OLD.model_response_id IS NOT NULL OR OLD.review_body IS NOT NULL OR OLD.review_sha256 IS NOT NULL
    OR OLD.canonical_verify_invocation_id IS NOT NULL OR OLD.independent_review_receipt_sha256 IS NOT NULL
    OR NEW.historical_prepare_fence->>'invocation_id' IS DISTINCT FROM OLD.canonical_prepare_invocation_id::text
    OR NEW.historical_prepare_fence->>'worker_run_id' IS DISTINCT FROM OLD.claimant_worker_run_id::text
    OR NEW.historical_prepare_fence->>'claim_id' IS DISTINCT FROM OLD.claim_id::text
    OR NEW.historical_prepare_fence->>'replay_authorized' IS DISTINCT FROM 'false'
    OR NEW.historical_prepare_fence->>'provider_outcome' IS DISTINCT FROM 'UNKNOWN'
    OR NEW.historical_prepare_fence->>'premodel_recovery_count' IS DISTINCT FROM OLD.premodel_recovery_count::text
    OR NEW.premodel_recovery_count IS DISTINCT FROM OLD.premodel_recovery_count
    OR NEW.phase<>'ADMITTED' OR NEW.canonical_prepare_invocation_id IS NOT NULL
    OR NEW.claimant_worker_run_id IS NOT NULL
    OR NOT EXISTS(SELECT 1 FROM reality_internal.final_loop_child_approval_packets_v1 a
      WHERE a.packet_id=OLD.packet_id AND a.same_obligation_recovery_approval->>'approval_receipt_sha256'=
       NEW.historical_prepare_fence->>'continuation_approval_receipt_sha256')
  THEN RAISE EXCEPTION 'FINAL_LOOP_HISTORICAL_INVOCATION_ARCHIVE_INVALID';END IF;
 END IF;
 RETURN NEW;
END $guard$;
DROP TRIGGER IF EXISTS final_loop_historical_prepare_fence_immutable ON reality_internal.final_loop_child_review_work_v1;
CREATE TRIGGER final_loop_historical_prepare_fence_immutable BEFORE UPDATE OR DELETE
 ON reality_internal.final_loop_child_review_work_v1 FOR EACH ROW
 EXECUTE FUNCTION reality_internal.guard_final_loop_historical_prepare_fence_v1();
REVOKE ALL ON FUNCTION reality_internal.guard_final_loop_historical_prepare_fence_v1() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION reality_internal.guard_final_loop_recovery_approval_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $guard$
BEGIN
 IF TG_OP='DELETE' THEN
  IF OLD.same_obligation_recovery_approval IS NOT NULL THEN RAISE EXCEPTION 'FINAL_LOOP_RECOVERY_APPROVAL_IMMUTABLE';END IF;
  RETURN OLD;
 END IF;
 IF OLD.same_obligation_recovery_approval IS NOT NULL AND
    (NEW.same_obligation_recovery_approval IS DISTINCT FROM OLD.same_obligation_recovery_approval
     OR NEW.owner_approval_receipt_sha256 IS DISTINCT FROM OLD.owner_approval_receipt_sha256
     OR NEW.owner_approval_request_id IS DISTINCT FROM OLD.owner_approval_request_id
     OR NEW.packet_id IS DISTINCT FROM OLD.packet_id OR NEW.plan_id IS DISTINCT FROM OLD.plan_id)
 THEN RAISE EXCEPTION 'FINAL_LOOP_RECOVERY_APPROVAL_IMMUTABLE';END IF;
 RETURN NEW;
END $guard$;
DROP TRIGGER IF EXISTS final_loop_recovery_approval_immutable ON reality_internal.final_loop_child_approval_packets_v1;
CREATE TRIGGER final_loop_recovery_approval_immutable BEFORE UPDATE OR DELETE
 ON reality_internal.final_loop_child_approval_packets_v1 FOR EACH ROW
 EXECUTE FUNCTION reality_internal.guard_final_loop_recovery_approval_v1();
REVOKE ALL ON FUNCTION reality_internal.guard_final_loop_recovery_approval_v1() FROM PUBLIC,anon,authenticated;

-- Read an already approved, exact, still-unconsumed scope. The original
-- maintenance budget stays terminal. The separately approved continuation
-- is limited to one preparation and one independent verification per scope.
-- This predicate is not an authority writer and cannot admit a new original.
CREATE OR REPLACE FUNCTION reality_internal.read_final_loop_approved_recovery_candidate_v1(p_shift_id uuid,p_plan_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $candidate$
DECLARE a record; g jsonb; ob jsonb; e jsonb; q jsonb; approval jsonb; proposal jsonb; candidate jsonb; c record;
BEGIN
 IF current_user NOT IN ('service_role','postgres') THEN RETURN NULL;END IF;
 SELECT packet.* INTO a FROM reality_internal.final_loop_child_approval_packets_v1 packet
 WHERE packet.shift_id=p_shift_id AND packet.plan_id=p_plan_id AND packet.state='EFFECT_RESERVED_RECONCILE_ONLY'
 AND packet.authority_effect='READ_ONLY_INTERNAL_PR_REVIEW' AND packet.same_obligation_recovery_approval IS NOT NULL;
 IF NOT FOUND THEN RETURN NULL;END IF;
 approval:=a.same_obligation_recovery_approval;proposal:=approval->'proposal';
 IF approval->>'schema' IS DISTINCT FROM 'reality-final-loop-same-obligation-recovery-approval-v1'
 OR approval->>'approval_receipt_sha256' IS DISTINCT FROM 'sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to((approval-'approval_receipt_sha256')::text,'UTF8')),'hex')
 OR approval->>'proposal_sha256' IS DISTINCT FROM 'sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(proposal::text,'UTF8')),'hex')
 OR approval->>'owner_approval_request_id' IS NULL OR approval->>'owner_approval_request_id'=a.owner_approval_request_id::text
 OR approval->>'approved' IS DISTINCT FROM 'true' OR approval->>'historical_invocation_replay_authorized' IS DISTINCT FROM 'false'
 OR proposal->>'owner_id' IS DISTINCT FROM a.owner_id::text OR proposal->>'shift_id' IS DISTINCT FROM a.shift_id::text
 OR proposal->>'plan_id' IS DISTINCT FROM a.plan_id::text OR proposal->>'packet_id' IS DISTINCT FROM a.packet_id::text
 OR proposal->>'original_work_id' IS DISTINCT FROM a.parent_original_work_id OR proposal->>'source_ref' IS DISTINCT FROM a.source_ref
 OR proposal->>'source_manifest_sha256' IS DISTINCT FROM a.source_manifest_sha256
 OR proposal->>'acceptance_contract_sha256' IS DISTINCT FROM a.acceptance_contract_sha256
 OR proposal->>'prior_owner_approval_receipt_sha256' IS DISTINCT FROM a.owner_approval_receipt_sha256
 OR proposal->'terminal_recovery_history'->>'remaining_attempts' IS DISTINCT FROM '0'
 OR proposal->'terminal_recovery_history'->>'new_attempt_authorized' IS DISTINCT FROM 'false'
 OR proposal->>'historical_invocation_replay_authorized' IS DISTINCT FROM 'false'
 OR proposal->>'new_budget_authorized' IS DISTINCT FROM 'false'
 OR pg_catalog.jsonb_typeof(proposal->'unfinished_scopes') IS DISTINCT FROM 'array'
 OR pg_catalog.jsonb_array_length(proposal->'unfinished_scopes')<1
 OR proposal->>'proposed_max_new_prepare_calls' IS DISTINCT FROM pg_catalog.jsonb_array_length(proposal->'unfinished_scopes')::text
 OR proposal->>'proposed_max_new_independent_verify_calls' IS DISTINCT FROM pg_catalog.jsonb_array_length(proposal->'unfinished_scopes')::text
 OR proposal->>'proposed_max_new_provider_calls' IS DISTINCT FROM (2*pg_catalog.jsonb_array_length(proposal->'unfinished_scopes'))::text
 THEN RETURN NULL;END IF;
 g:=public.reality_read_final_loop_shared_continuity_guard_v1(p_shift_id);
 IF g->>'status' IS DISTINCT FROM 'FINAL_LOOP_SHARED_CONTINUITY_CHECKED'
 OR g->>'owner_id' IS DISTINCT FROM a.owner_id::text OR g->>'continuity_root_id' IS DISTINCT FROM proposal->>'continuity_root_id'
 OR g->>'no_new_executable_authority' IS DISTINCT FROM 'true' OR g->>'execution_authorized' IS DISTINCT FROM 'false'
 OR g->>'original_job_completed' IS DISTINCT FROM 'false' OR g->>'production_changed' IS DISTINCT FROM 'false'
 OR g->>'worldline_parent_links_verified' IS DISTINCT FROM 'true' OR g->>'unverified_handoffs' IS DISTINCT FROM '0'
 THEN RETURN NULL;END IF;
 SELECT x INTO ob FROM pg_catalog.jsonb_array_elements(g->'obligations') x
 WHERE x->>'original_work_id'=a.parent_original_work_id AND x->>'source_ref'=a.source_ref
 AND x->>'continuity_identity_verified'='true' AND x->>'qualifier_digest_verified'='true'
 AND x->>'source_proof_verified'='true' AND x->>'independent_original_outcome_verified'='false';
 e:=ob->'execution_spine_readback';
 IF e->>'status' IS DISTINCT FROM 'SIGNED_INVOCATION_OBSERVATIONS_RETURNED_ORIGINAL_OPEN'
 OR e->>'canonical_return_committed' IS DISTINCT FROM 'true'
 OR e->>'replay_authorized' IS DISTINCT FROM 'false'
 OR e->>'provider_outcome_verified' IS DISTINCT FROM 'false'
 THEN RETURN NULL;END IF;
 -- Do not allocate preparation while a current preparation or independent
 -- verification needs readback, or after an interrupted continuation.
 IF EXISTS(SELECT 1 FROM reality_internal.final_loop_child_review_work_v1 ch WHERE ch.packet_id=a.packet_id
  AND (ch.phase IN ('ADMITTED','PREPARED','SOURCE_ARTIFACT_CHECKED')
   OR (ch.historical_prepare_fence IS NOT NULL AND ch.phase<>'INDEPENDENTLY_VERIFIED')))
 THEN RETURN NULL;END IF;
 SELECT ch.*, x AS proposed_scope INTO c
 FROM reality_internal.final_loop_child_review_work_v1 ch
 JOIN LATERAL pg_catalog.jsonb_array_elements(proposal->'unfinished_scopes') x
  ON x->>'child_work_id'=ch.child_work_id AND x->>'scope_sha256'=ch.scope_sha256 AND x->>'scope_index'=ch.scope_index::text
  AND x->>'historical_invocation_id'=ch.canonical_prepare_invocation_id::text
  AND x->>'historical_worker_run_id'=ch.claimant_worker_run_id::text
 WHERE ch.packet_id=a.packet_id AND ch.plan_id=a.plan_id AND ch.owner_id=a.owner_id AND ch.shift_id=a.shift_id
 AND ch.parent_original_work_id=a.parent_original_work_id AND ch.source_head_sha=proposal->>'source_head_sha'
 AND ch.source_manifest_sha256=a.source_manifest_sha256 AND ch.acceptance_contract_sha256=a.acceptance_contract_sha256
 AND ch.phase='CLAIMED' AND ch.historical_prepare_fence IS NULL AND ch.premodel_recovery_count=1
 AND ch.model_response_id IS NULL AND ch.review_body IS NULL AND ch.review_sha256 IS NULL
 AND ch.canonical_verify_invocation_id IS NULL AND ch.independent_review_receipt_sha256 IS NULL
 AND x->>'historical_provider_outcome'='UNKNOWN' AND x->>'historical_invocation_replay_authorized'='false'
 AND EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(e->'observations') z
  WHERE z->>'child_work_id'=ch.child_work_id AND z->>'scope_sha256'=ch.scope_sha256
   AND z->>'invocation_id'=ch.canonical_prepare_invocation_id::text AND z->>'worker_run_id'=ch.claimant_worker_run_id::text
   AND z->>'event_id'=x->>'historical_event_id' AND z->>'release_sha'=x->>'historical_release_sha'
   AND z->>'model_artifact_recorded'='false' AND z->>'provider_outcome_verified'='false' AND z->>'replay_authorized'='false')
 ORDER BY ch.scope_index LIMIT 1;
 IF NOT FOUND THEN RETURN NULL;END IF;
 RETURN pg_catalog.jsonb_build_object('child_work_id',c.child_work_id,'scope_sha256',c.scope_sha256,
  'scope_index',c.scope_index,'historical_invocation_id',c.canonical_prepare_invocation_id,'historical_worker_run_id',c.claimant_worker_run_id,
  'proposal_sha256',approval->>'proposal_sha256','approval_receipt_sha256',approval->>'approval_receipt_sha256',
  'continuity_head_sha256',g->>'continuity_head_sha256','continuity_revision',g->'revision',
  'historical_invocation_replay_authorized',false,'new_original_admitted',false,'execution_authorized',false);
END $candidate$;
REVOKE ALL ON FUNCTION reality_internal.read_final_loop_approved_recovery_candidate_v1(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION reality_internal.read_final_loop_approved_recovery_candidate_v1(uuid,uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.reality_owner_approve_final_loop_child_v1(p_owner_id uuid, p_packet_id uuid, p_proposal_fingerprint text, p_manifest_sha256 text, p_approval_request_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE v_packet record;v_plan record;v_receipt text;v_recovery jsonb;v_proposal jsonb;v_approval jsonb;
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'FINAL_LOOP_CHILD_OWNER_CHAT_SERVICE_REQUIRED';END IF;
 IF p_owner_id IS NULL OR p_packet_id IS NULL OR p_approval_request_id IS NULL
  OR coalesce(p_proposal_fingerprint,'') !~ '^sha256:[a-f0-9]{64}$'
  OR coalesce(p_manifest_sha256,'') !~ '^sha256:[a-f0-9]{64}$'
 THEN RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_CHILD_APPROVAL_INPUT_INVALID',
  'approved',false,'execution_authorized',false); END IF;
 SELECT * INTO v_packet FROM
 reality_internal.final_loop_child_approval_packets_v1
 WHERE packet_id=p_packet_id FOR UPDATE;
 -- The existing authenticated owner service may accept the exact recovery
 -- fingerprint, not reuse the first goal approval as a new model budget.
 IF FOUND AND v_packet.owner_id=p_owner_id AND v_packet.source_manifest_sha256=p_manifest_sha256
  AND v_packet.state='EFFECT_RESERVED_RECONCILE_ONLY'
  AND v_packet.owner_approval_receipt_sha256 IS NOT NULL
  AND v_packet.same_obligation_recovery_approval IS NULL
  AND p_approval_request_id IS DISTINCT FROM v_packet.owner_approval_request_id
  AND p_proposal_fingerprint IS DISTINCT FROM v_packet.proposal_fingerprint THEN
  v_recovery:=public.reality_read_final_loop_child_recovery_v1(v_packet.shift_id,v_packet.plan_id)->'recovery_qualification';
  v_proposal:=v_recovery->'proposal';
  IF v_recovery->>'status' IS DISTINCT FROM 'SAME_ORIGINAL_MISSING_REVIEW_WORK_QUALIFIED_FOR_EXACT_OWNER_DECISION'
   OR v_recovery->>'proposal_sha256' IS DISTINCT FROM p_proposal_fingerprint
   OR v_proposal->>'owner_id' IS DISTINCT FROM p_owner_id::text
   OR v_proposal->>'packet_id' IS DISTINCT FROM p_packet_id::text
   OR v_proposal->>'source_manifest_sha256' IS DISTINCT FROM p_manifest_sha256
   OR v_proposal->>'prior_owner_approval_receipt_sha256' IS DISTINCT FROM v_packet.owner_approval_receipt_sha256
   OR v_proposal->'terminal_recovery_history'->>'remaining_attempts' IS DISTINCT FROM '0'
   OR v_proposal->>'historical_invocation_replay_authorized' IS DISTINCT FROM 'false'
   OR v_proposal->>'new_budget_authorized' IS DISTINCT FROM 'false'
   OR NOT EXISTS(SELECT 1 FROM reality_internal.governed_employee_shifts_v1 s
     JOIN reality_internal.governed_employee_completion_warrants_v1 w
      ON w.shift_id=s.shift_id AND w.owner_id=s.owner_id AND w.plan_fingerprint=s.plan_fingerprint
     WHERE s.shift_id=v_packet.shift_id AND s.owner_id=p_owner_id
      AND s.closed_at IS NULL AND s.authorized_at IS NOT NULL AND w.state='ACTIVE')
  THEN RETURN pg_catalog.jsonb_build_object('status','FINAL_LOOP_SAME_OBLIGATION_RECOVERY_APPROVAL_STALE','approved',false,'execution_authorized',false);END IF;
  v_approval:=pg_catalog.jsonb_build_object('schema','reality-final-loop-same-obligation-recovery-approval-v1',
   'proposal',v_proposal,'proposal_sha256',p_proposal_fingerprint,'owner_approval_request_id',p_approval_request_id,
   'approved',true,'historical_invocation_replay_authorized',false,'original_job_completed',false,'production_changed',false);
  v_receipt:='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(v_approval::text,'UTF8')),'hex');
  UPDATE reality_internal.final_loop_child_approval_packets_v1
   SET same_obligation_recovery_approval=v_approval||pg_catalog.jsonb_build_object('approval_receipt_sha256',v_receipt)
   WHERE packet_id=p_packet_id AND same_obligation_recovery_approval IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'FINAL_LOOP_SAME_OBLIGATION_RECOVERY_APPROVAL_RACE';END IF;
  RETURN pg_catalog.jsonb_build_object('status','FINAL_LOOP_SAME_OBLIGATION_RECOVERY_APPROVED_ONCE',
   'packet_id',p_packet_id,'owner_id',p_owner_id,'shift_id',v_packet.shift_id,
   'parent_original_work_id',v_packet.parent_original_work_id,'source_ref',v_packet.source_ref,
   'source_manifest_sha256',p_manifest_sha256,'acceptance_contract_sha256',v_packet.acceptance_contract_sha256,
   'proposal_sha256',p_proposal_fingerprint,'approval_receipt_sha256',v_receipt,
   'approved',true,'execution_authorized',false,'historical_invocation_replay_authorized',false,
   'child_originals_admitted',0,'original_job_completed',false,'production_changed',false);
 END IF;
 IF NOT FOUND OR v_packet.owner_id<>p_owner_id
  OR v_packet.proposal_fingerprint<>p_proposal_fingerprint
  OR v_packet.source_manifest_sha256<>p_manifest_sha256
  OR v_packet.state<>'AWAITING_EXACT_OWNER_APPROVAL'
  OR v_packet.approved_at IS NOT NULL
  OR v_packet.owner_approval_receipt_sha256 IS NOT NULL
 THEN RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_CHILD_APPROVAL_NOT_CURRENT_OR_ALREADY_USED',
  'approved',false,'execution_authorized',false);END IF;
 SELECT * INTO v_plan FROM reality_internal.final_loop_pr_source_plans_v1
 WHERE plan_id=v_packet.plan_id AND owner_id=p_owner_id
  AND source_manifest_sha256=p_manifest_sha256
  AND parent_original_work_id=v_packet.parent_original_work_id;
 IF NOT FOUND OR NOT EXISTS(
  SELECT 1 FROM reality_internal.governed_employee_shifts_v1 s
  JOIN reality_internal.governed_employee_completion_warrants_v1 w
   ON w.shift_id=s.shift_id AND w.owner_id=s.owner_id
  WHERE s.shift_id=v_packet.shift_id AND s.owner_id=p_owner_id
   AND s.closed_at IS NULL AND s.authorized_at IS NOT NULL
   AND s.planned_end_at='infinity'::timestamptz AND w.state='ACTIVE')
  OR NOT EXISTS(SELECT 1 FROM reality_internal.riley_pr_review_originals_v1 r
   WHERE r.shift_id=v_packet.shift_id
    AND r.original_work_id=v_packet.parent_original_work_id
    AND r.owner_id=p_owner_id AND r.phase='BLOCKED'
    AND r.provider_comment_id IS NULL AND r.settlement_receipt_id IS NULL)
  OR v_packet.acceptance_contract_sha256 IS DISTINCT FROM
   reality_internal.final_loop_pr_review_acceptance_digest_v1(v_plan.plan_id)
 THEN RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_CHILD_APPROVAL_PARENT_ACCEPTANCE_STALE',
  'approved',false,'execution_authorized',false);END IF;
 v_receipt:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to(pg_catalog.jsonb_build_object(
   'packet_id',v_packet.packet_id,'owner_id',p_owner_id,
   'proposal_fingerprint',v_packet.proposal_fingerprint,
   'manifest_sha256',v_packet.source_manifest_sha256,
   'acceptance_contract_sha256',v_packet.acceptance_contract_sha256,
   'approval_request_id',p_approval_request_id)::text,'UTF8')),'hex');
 UPDATE reality_internal.final_loop_child_approval_packets_v1
 SET state='APPROVED_ONCE',owner_approval_request_id=p_approval_request_id,
  owner_approval_receipt_sha256=v_receipt,
  approved_at=pg_catalog.clock_timestamp()
 WHERE packet_id=p_packet_id AND state='AWAITING_EXACT_OWNER_APPROVAL';
 RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_EXACT_CHILD_REVIEW_OWNER_APPROVED_ONCE',
  'packet_id',v_packet.packet_id,'owner_id',p_owner_id,
  'shift_id',v_packet.shift_id,
  'parent_original_work_id',v_packet.parent_original_work_id,
  'source_ref',v_packet.source_ref,
  'source_manifest_sha256',v_packet.source_manifest_sha256,
  'acceptance_contract_sha256',v_packet.acceptance_contract_sha256,
  'approval_receipt_sha256',v_receipt,
  'approved',true,'execution_authorized',false,
  'child_originals_admitted',0,'original_job_completed',false,
  'production_changed',false);
END $function$;
CREATE OR REPLACE FUNCTION public.reality_claim_final_loop_child_review_v1(p_shift_id uuid, p_worker_run_id uuid, p_canonical_handoff jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE h jsonb:=p_canonical_handoff; scope_check jsonb; c jsonb; continuation jsonb; archive jsonb; previous record;
BEGIN
 scope_check:=reality_internal.check_final_loop_canonical_child_scope_v1(p_shift_id,p_worker_run_id,h);
 IF scope_check->>'status' IS DISTINCT FROM 'FINAL_LOOP_CANONICAL_CHILD_SCOPE_CURRENT'
 THEN RETURN scope_check;END IF;
 -- Only the exact already approved bounded scope can change its active
 -- claim pointer. The complete old fence remains immutable on the SAME child.
 continuation:=reality_internal.read_final_loop_approved_recovery_candidate_v1(p_shift_id,(h->>'plan_id')::uuid);
 IF continuation IS NOT NULL THEN
  IF continuation->>'continuity_head_sha256' IS DISTINCT FROM h->>'continuity_head_sha256'
   OR continuation->>'continuity_revision' IS DISTINCT FROM h->>'revision'
   OR continuation->>'historical_worker_run_id'=p_worker_run_id::text
  THEN RAISE EXCEPTION 'FINAL_LOOP_RECOVERY_CONTINUATION_SCOPE_DRIFT';END IF;
  SELECT * INTO previous FROM reality_internal.final_loop_child_review_work_v1 x
   WHERE x.child_work_id=continuation->>'child_work_id' AND x.packet_id::text=h->>'packet_id'
    AND x.plan_id::text=h->>'plan_id' AND x.shift_id=p_shift_id
    AND x.canonical_prepare_invocation_id::text=continuation->>'historical_invocation_id'
    AND x.claimant_worker_run_id::text=continuation->>'historical_worker_run_id'
    AND x.historical_prepare_fence IS NULL AND x.phase='CLAIMED' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'FINAL_LOOP_RECOVERY_CONTINUATION_CLAIM_RACE';END IF;
  archive:=pg_catalog.jsonb_build_object('schema','reality-final-loop-historical-preparation-fence-v1',
    'claim_id',previous.claim_id,'worker_run_id',previous.claimant_worker_run_id,
    'invocation_id',previous.canonical_prepare_invocation_id,'claimed_at',previous.claimed_at,
    'premodel_recovery_count',previous.premodel_recovery_count,'provider_outcome','UNKNOWN',
    'replay_authorized',false,'continuation_proposal_sha256',continuation->>'proposal_sha256',
    'continuation_approval_receipt_sha256',continuation->>'approval_receipt_sha256',
    'historical_observation_preserved',true,'original_job_completed',false,'production_changed',false);
  UPDATE reality_internal.final_loop_child_review_work_v1 SET historical_prepare_fence=archive,
    phase='ADMITTED',canonical_prepare_invocation_id=NULL,claimant_worker_run_id=NULL,claimed_at=NULL,
    updated_at=pg_catalog.clock_timestamp()
  WHERE child_work_id=previous.child_work_id AND historical_prepare_fence IS NULL AND phase='CLAIMED';
  IF NOT FOUND THEN RAISE EXCEPTION 'FINAL_LOOP_RECOVERY_CONTINUATION_ARCHIVE_RACE';END IF;
 END IF;
 -- Reuse the existing transactional allocator. If its selection differs,
 -- raise and roll back ALL changes; no other parent can be reserved.
 c:=public.reality_claim_final_loop_child_review_v1(p_shift_id,p_worker_run_id);
 IF c->>'status' IS DISTINCT FROM 'FINAL_LOOP_EXACT_SIGNED_CHILD_CLAIMED_ONCE'
  OR c->>'owner_id' IS DISTINCT FROM h->>'owner_id'
  OR c->>'shift_id' IS DISTINCT FROM h->>'shift_id'
  OR c->>'parent_original_work_id' IS DISTINCT FROM h->>'parent_original_work_id'
  OR c->>'source_ref' IS DISTINCT FROM h->>'source_ref'
  OR c->>'source_head_sha' IS DISTINCT FROM h->>'source_head_sha'
  OR c->>'source_proof_sha256' IS DISTINCT FROM h->>'source_proof_sha256'
  OR c->>'source_manifest_sha256' IS DISTINCT FROM h->>'source_manifest_sha256'
  OR c->>'acceptance_contract_sha256' IS DISTINCT FROM h->>'acceptance_contract_sha256'
  OR c->>'approval_receipt_sha256' IS DISTINCT FROM h->>'owner_approval_receipt_sha256'
  OR c->>'claimant_worker_run_id' IS DISTINCT FROM p_worker_run_id::text
  OR c->>'original_job_completed' IS DISTINCT FROM 'false'
  OR NOT EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(h->'scope_fingerprints') s
    WHERE s->>'index'=c->>'scope_index' AND s->>'scope_sha256'=c->>'scope_sha256')
  OR NOT EXISTS(SELECT 1 FROM reality_internal.final_loop_child_review_work_v1 x
    WHERE x.child_work_id=c->>'child_work_id' AND x.packet_id::text=h->>'packet_id'
     AND x.plan_id::text=h->>'plan_id' AND x.claim_id::text=c->>'claim_id'
     AND x.claimant_worker_run_id=p_worker_run_id AND x.phase='CLAIMED')
 THEN RAISE EXCEPTION 'FINAL_LOOP_CANONICAL_CHILD_ATOMIC_CLAIM_SCOPE_MISMATCH';END IF;
 IF continuation IS NOT NULL THEN
  IF c->>'child_work_id' IS DISTINCT FROM continuation->>'child_work_id'
   OR c->>'claim_id' IS NOT DISTINCT FROM previous.claim_id::text
   OR c->>'claimant_worker_run_id' IS NOT DISTINCT FROM previous.claimant_worker_run_id::text
  THEN RAISE EXCEPTION 'FINAL_LOOP_RECOVERY_CONTINUATION_WRONG_CHILD_NO_REPLAY';END IF;
  c:=c||pg_catalog.jsonb_build_object('same_obligation_continuation',continuation,
   'historical_prepare_fence',archive,'historical_invocation_replay_authorized',false);
 END IF;
 -- Carry a reference to the SAME claim. It is not a bearer token or
 -- a permission to invoke a model without fresh canonical readback.
 RETURN c||pg_catalog.jsonb_build_object(
  'canonical_scope_bound',true,'canonical_claim_required',true,
  'continuity_root_id',h->'continuity_root_id',
  'continuity_head_sha256',h->'continuity_head_sha256','revision',h->'revision',
  'packet_id',h->'packet_id','plan_id',h->'plan_id',
  'execution_authorized',false,'isolated_model_invoked',false,
  'original_job_completed',false,'production_changed',false);
END $function$;
CREATE OR REPLACE FUNCTION public.reality_fence_final_loop_child_transport_v1(p_child_work_id text, p_claim_id uuid, p_worker_run_id uuid, p_mode text, p_invocation_id uuid, p_begin boolean, p_canonical_handoff jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE a jsonb; n integer; v reality_internal.final_loop_child_review_work_v1%rowtype;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'FINAL_LOOP_CHILD_TRANSPORT_SERVICE_ONLY';END IF;
 IF p_begin IS NULL OR p_invocation_id IS NULL OR p_worker_run_id IS NULL
  OR coalesce(p_child_work_id,'') !~ '^work:[a-f0-9]{32}$'
  OR coalesce(p_mode,'') NOT IN ('PREPARE','VERIFY')
  OR (p_mode='PREPARE' AND p_claim_id IS NULL)
  OR (p_mode='VERIFY' AND p_claim_id IS NOT NULL)
 THEN RETURN jsonb_build_object('status','FINAL_LOOP_CHILD_TRANSPORT_SCOPE_INVALID');END IF;
 -- Existing canonical scope and release guard takes the shift/warrant lock.
 IF p_mode='PREPARE' THEN
  a:=public.reality_read_final_loop_child_model_scope_v1(
   p_child_work_id,p_claim_id,p_worker_run_id,p_canonical_handoff);
  IF a->>'status' IS DISTINCT FROM 'FINAL_LOOP_CHILD_CURRENT_SIGNED_MODEL_READBACK'
   OR a->>'model_authorized' IS DISTINCT FROM 'true'
  THEN RETURN jsonb_build_object('status','FINAL_LOOP_CHILD_TRANSPORT_AUTHORITY_UNVERIFIED');END IF;
 ELSE
  a:=public.reality_read_final_loop_child_verify_v1(
   (p_canonical_handoff->>'shift_id')::uuid,p_worker_run_id,p_canonical_handoff);
  IF a->>'status' IS DISTINCT FROM 'FINAL_LOOP_INDEPENDENT_CHILD_VERIFICATION_CANDIDATE'
   OR a->>'child_work_id' IS DISTINCT FROM p_child_work_id
   OR a->>'independent_verifier_run_id' IS DISTINCT FROM p_worker_run_id::text
  THEN RETURN jsonb_build_object('status','FINAL_LOOP_CHILD_TRANSPORT_VERIFIER_UNVERIFIED');END IF;
 END IF;
 SELECT * INTO v FROM reality_internal.final_loop_child_review_work_v1 c
 WHERE c.child_work_id=p_child_work_id FOR UPDATE;
 IF NOT FOUND OR NOT reality_internal.final_loop_canonical_child_matches_v1(p_child_work_id,p_canonical_handoff)
 THEN RETURN jsonb_build_object('status','FINAL_LOOP_CHILD_TRANSPORT_ORIGINAL_DRIFT');END IF;
 -- A distinct continuation must never consume a historical invocation ID,
 -- even if a delayed signed request arrives after the new claim exists.
 IF EXISTS(SELECT 1 FROM reality_internal.final_loop_child_review_work_v1 c
  WHERE c.historical_prepare_fence->>'invocation_id'=p_invocation_id::text)
 THEN RETURN pg_catalog.jsonb_build_object('status','FINAL_LOOP_CHILD_HISTORICAL_INVOCATION_NO_REPLAY');END IF;
 IF p_mode='PREPARE' THEN
  IF v.phase<>'CLAIMED' OR v.claim_id IS DISTINCT FROM p_claim_id
   OR v.claimant_worker_run_id IS DISTINCT FROM p_worker_run_id
  THEN RETURN jsonb_build_object('status','FINAL_LOOP_CHILD_TRANSPORT_CLAIM_DRIFT');END IF;
  IF p_begin THEN
   UPDATE reality_internal.final_loop_child_review_work_v1
   SET canonical_prepare_invocation_id=p_invocation_id,
    -- Existing premodel recovery must NOT readmit a possibly invoked model.
    premodel_recovery_count=greatest(premodel_recovery_count,1)
   WHERE child_work_id=p_child_work_id AND canonical_prepare_invocation_id IS NULL
    AND phase='CLAIMED' AND claim_id=p_claim_id AND claimant_worker_run_id=p_worker_run_id;
   GET DIAGNOSTICS n=ROW_COUNT;
   IF n<>1 THEN RETURN jsonb_build_object('status','FINAL_LOOP_CHILD_TRANSPORT_ALREADY_FENCED_NO_REPLAY');END IF;
  ELSIF v.canonical_prepare_invocation_id IS DISTINCT FROM p_invocation_id
  THEN RETURN jsonb_build_object('status','FINAL_LOOP_CHILD_TRANSPORT_INVOCATION_MISMATCH');END IF;
 ELSE
  IF v.phase<>'PREPARED' OR v.claimant_worker_run_id=p_worker_run_id
  THEN RETURN jsonb_build_object('status','FINAL_LOOP_CHILD_TRANSPORT_VERIFIER_DRIFT');END IF;
  IF p_begin THEN
   UPDATE reality_internal.final_loop_child_review_work_v1
   SET canonical_verify_invocation_id=p_invocation_id,
    canonical_verify_invocation_run_id=p_worker_run_id
   WHERE child_work_id=p_child_work_id AND phase='PREPARED'
    AND canonical_verify_invocation_id IS NULL AND claimant_worker_run_id<>p_worker_run_id;
   GET DIAGNOSTICS n=ROW_COUNT;
   IF n<>1 THEN RETURN jsonb_build_object('status','FINAL_LOOP_CHILD_TRANSPORT_ALREADY_FENCED_NO_REPLAY');END IF;
  ELSIF v.canonical_verify_invocation_id IS DISTINCT FROM p_invocation_id
   OR v.canonical_verify_invocation_run_id IS DISTINCT FROM p_worker_run_id
  THEN RETURN jsonb_build_object('status','FINAL_LOOP_CHILD_TRANSPORT_INVOCATION_MISMATCH');END IF;
 END IF;
 RETURN a;
END $function$;
CREATE OR REPLACE FUNCTION public.reality_read_final_loop_child_recovery_v1(p_shift_id uuid, p_plan_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE v_plan record;v_packet record;v_children jsonb;v_count integer;
 v_capacity boolean:=false;v_run_count integer:=0;
 v_capacity_receipt text;
 v_integration_count integer:=0;v_integration_verified integer:=0;
 v_integration_receipt text;
 v_guard jsonb;v_obligation jsonb;v_spine jsonb;v_candidates jsonb:='[]'::jsonb;
 v_missing int:=0;v_uncertain int:=0;v_recovery_proposal jsonb;v_proposal_sha256 text;
 v_budget jsonb;v_recovery_status text:='NO_UNFINISHED_SCOPES';
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'FINAL_LOOP_CHILD_RECOVERY_SERVICE_ONLY'; END IF;
 SELECT p.* INTO v_plan FROM reality_internal.final_loop_pr_source_plans_v1 p
 WHERE p.shift_id=p_shift_id AND p.plan_id=p_plan_id
  AND p.parent_original_work_id IS NOT NULL;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_PARENT_SOURCE_PLAN_NOT_ADMITTED',
  'independent_service_readback_verified',false);END IF;
 SELECT a.* INTO v_packet FROM
  reality_internal.final_loop_child_approval_packets_v1 a
 WHERE a.plan_id=p_plan_id AND a.shift_id=p_shift_id
  AND a.state='EFFECT_RESERVED_RECONCILE_ONLY'
  AND a.owner_approval_receipt_sha256 IS NOT NULL;
 IF NOT FOUND OR v_packet.acceptance_contract_sha256 IS DISTINCT FROM
  reality_internal.final_loop_pr_review_acceptance_digest_v1(v_plan.plan_id)
 THEN RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_PARENT_CHILD_ACCEPTANCE_NOT_VERIFIED',
  'independent_service_readback_verified',false); END IF;
 SELECT pg_catalog.count(*),coalesce(pg_catalog.jsonb_agg(
  pg_catalog.jsonb_build_object(
   'index',c.scope_index,'scope_sha256',c.scope_sha256,
   'parent_original_work_id',c.parent_original_work_id,
   'source_manifest_sha256',c.source_manifest_sha256,
   'acceptance_contract_sha256',c.acceptance_contract_sha256,
   'phase',CASE
    WHEN c.phase='INDEPENDENTLY_VERIFIED' THEN 'VERIFIED'
    WHEN c.phase='EFFECT_UNCERTAIN' OR disposition.state IN
     ('TERMINAL_PREPARE_PROVIDER_OUTCOME_UNKNOWN','TERMINAL_VERIFY_PROVIDER_OUTCOME_UNKNOWN')
    THEN 'EFFECT_UNCERTAIN'
    ELSE 'ADMITTED' END,
   'invocation_disposition',disposition.state,
   'historical_prepare_fence',c.historical_prepare_fence,
   'canonical_prepare_invocation_id',c.canonical_prepare_invocation_id,
   'canonical_verify_invocation_id',c.canonical_verify_invocation_id,
   'preparation_worker_run_id',c.claimant_worker_run_id,
   'verification_worker_run_id',c.canonical_verify_invocation_run_id,
   'prepared_artifact_available',c.model_response_id IS NOT NULL AND c.review_body IS NOT NULL
      AND c.review_sha256 IS NOT NULL,
   'provider_effect_replay_authorized',false,
   'new_attempt_authorized',false,
   'child_original_work_id',c.child_work_id,
   'independently_verified',c.phase='INDEPENDENTLY_VERIFIED',
   'verifier_independent',c.phase='INDEPENDENTLY_VERIFIED'
    AND c.independent_verifier_run_id<>c.claimant_worker_run_id,
   'independent_receipt_sha256',c.independent_review_receipt_sha256,
   'advisory_rejection_receipts',c.advisory_rejection_receipts,
   'canonical_continuity_binding',CASE WHEN c.phase='INDEPENDENTLY_VERIFIED'
    AND c.verifier_evidence ? 'canonical_continuity_root_id'
    THEN pg_catalog.jsonb_build_object(
     'continuity_root_id',c.verifier_evidence->'canonical_continuity_root_id',
     'continuity_head_sha256',c.verifier_evidence->'canonical_continuity_head_sha256',
     'revision',c.verifier_evidence->'canonical_continuity_revision',
     'owner_approval_receipt_sha256',c.verifier_evidence->'canonical_owner_approval_receipt_sha256')
    ELSE NULL END
  ) ORDER BY c.scope_index),'[]'::jsonb)
 INTO v_count,v_children FROM reality_internal.final_loop_child_review_work_v1 c
 CROSS JOIN LATERAL (SELECT CASE
   WHEN c.phase='INDEPENDENTLY_VERIFIED' THEN 'INDEPENDENTLY_VERIFIED'
   WHEN c.canonical_verify_invocation_id IS NOT NULL AND c.independent_review_receipt_sha256 IS NULL
    AND EXISTS(SELECT 1 FROM reality_internal.signed_worker_actual_runs_v1 r
      WHERE r.run_id=c.canonical_verify_invocation_run_id AND r.status IN ('COMPLETED','FAILED')
      AND r.finished_at IS NOT NULL)
    THEN 'TERMINAL_VERIFY_PROVIDER_OUTCOME_UNKNOWN'
   WHEN c.canonical_verify_invocation_id IS NOT NULL THEN 'VERIFY_INVOCATION_FENCED_AWAITING_EVIDENCE'
   WHEN c.phase IN ('PREPARED','SOURCE_ARTIFACT_CHECKED') AND c.model_response_id IS NOT NULL
    AND c.review_body IS NOT NULL AND c.review_sha256 IS NOT NULL THEN 'PREPARED_ARTIFACT_AVAILABLE'
   WHEN c.canonical_prepare_invocation_id IS NOT NULL AND c.model_response_id IS NULL
    AND c.review_body IS NULL AND c.review_sha256 IS NULL
    AND EXISTS(SELECT 1 FROM reality_internal.signed_worker_actual_runs_v1 r
      WHERE r.run_id=c.claimant_worker_run_id AND r.status IN ('COMPLETED','FAILED')
      AND r.finished_at IS NOT NULL)
    THEN 'TERMINAL_PREPARE_PROVIDER_OUTCOME_UNKNOWN'
   WHEN c.canonical_prepare_invocation_id IS NOT NULL THEN 'PREPARE_INVOCATION_FENCED_AWAITING_EVIDENCE'
   WHEN c.phase='EFFECT_UNCERTAIN' THEN 'LEGACY_EFFECT_UNCERTAIN'
   WHEN c.phase='CLAIMED' THEN 'CLAIMED_NO_CANONICAL_INVOCATION_OBSERVED'
   ELSE 'NO_CANONICAL_INVOCATION_OBSERVED' END AS state) disposition
 WHERE c.plan_id=v_plan.plan_id AND c.packet_id=v_packet.packet_id
  AND c.owner_id=v_plan.owner_id AND c.shift_id=v_plan.shift_id
  AND c.parent_original_work_id=v_plan.parent_original_work_id
  AND c.source_manifest_sha256=v_plan.source_manifest_sha256;
 IF v_count<>v_plan.proposed_scope_count THEN
  RETURN pg_catalog.jsonb_build_object(
   'status','FINAL_LOOP_CHILDREN_NOT_ATOMICALLY_ADMITTED',
   'independent_service_readback_verified',false);END IF;
 -- An interrupted invocation is an evidence disposition, not a new
 -- original or an authorization to erase the original invocation fence.
 SELECT count(*) FILTER(WHERE x->>'independently_verified'<>'true'),
        count(*) FILTER(WHERE x->>'phase'='EFFECT_UNCERTAIN')
 INTO v_missing,v_uncertain FROM pg_catalog.jsonb_array_elements(v_children) x;
 IF v_missing>0 THEN v_recovery_status:='UNFINISHED_SCOPES_EXIST'; END IF;
 IF v_uncertain>0 THEN
  v_recovery_status:='HISTORICAL_INVOCATIONS_REQUIRE_EVIDENCE_RECONCILIATION_NO_REPLAY';
  -- Use the existing independently returned invocation observations and
  -- exact current Continuity identity; missing artifacts alone prove no
  -- provider outcome. This reader cannot reset a budget or allocate work.
  v_guard:=public.reality_read_final_loop_shared_continuity_guard_v1(p_shift_id);
  SELECT x INTO v_obligation FROM pg_catalog.jsonb_array_elements(v_guard->'obligations') x
  WHERE x->>'original_work_id'=v_plan.parent_original_work_id AND x->>'source_ref'=v_plan.source_ref
    AND x->>'continuity_identity_verified'='true' AND x->>'qualifier_digest_verified'='true'
    AND x->>'source_proof_verified'='true' AND x->>'independent_original_outcome_verified'='false';
  v_spine:=v_obligation->'execution_spine_readback';
  SELECT q.reconciliation_snapshot->'recovery_terminal_history' INTO v_budget
  FROM reality_internal.owner_continuity_qualification_routes_v1 q
  WHERE q.owner_id=v_plan.owner_id AND q.source_ref=v_plan.source_ref AND q.intake_family='SIGNED_SHIFT_SOURCE'
   AND q.reconciliation_snapshot->>'shift_id'=p_shift_id::text
   AND q.reconciliation_snapshot->>'original_candidate_work_id'=v_plan.parent_original_work_id
   AND q.reconciliation_receipt_sha256=v_obligation->>'qualifier_receipt_sha256'
   AND q.reconciliation_receipt_sha256='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(q.reconciliation_snapshot::text,'UTF8')),'hex')
  ORDER BY q.reconciliation_checked_at DESC LIMIT 1;
  IF v_guard->>'status'='FINAL_LOOP_SHARED_CONTINUITY_CHECKED'
    AND v_guard->>'owner_id'=v_plan.owner_id::text AND v_guard->>'shift_id'=p_shift_id::text
    AND v_guard->>'no_new_executable_authority'='true' AND v_guard->>'execution_authorized'='false'
    AND v_guard->>'original_job_completed'='false' AND v_guard->>'production_changed'='false'
    AND v_guard->>'worldline_parent_links_verified'='true' AND v_guard->>'unverified_handoffs'='0'
    AND v_spine->>'status'='SIGNED_INVOCATION_OBSERVATIONS_RETURNED_ORIGINAL_OPEN'
    AND v_spine->>'canonical_return_committed'='true'
    AND v_spine->>'replay_authorized'='false' AND v_spine->>'provider_outcome_verified'='false'
    AND v_budget->>'remaining_attempts'='0' AND v_budget->>'new_attempt_authorized'='false'
    AND v_budget->>'replay_permitted'='false'
    AND v_packet.same_obligation_recovery_approval IS NULL
    AND v_packet.authority_effect='READ_ONLY_INTERNAL_PR_REVIEW'
    AND v_packet.source_manifest_sha256=v_plan.source_manifest_sha256
    AND v_packet.owner_approval_receipt_sha256~'^sha256:[a-f0-9]{64}$'
    AND NOT EXISTS(SELECT 1 FROM reality_internal.final_loop_resume_events_v1 ev
      WHERE ev.shift_id=p_shift_id AND ev.state='SHADOW_PENDING')
  THEN
   SELECT coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
     'child_work_id',x->>'child_original_work_id','scope_index',x->'index',
     'scope_sha256',x->>'scope_sha256','file_count',scope->'file_count',
     'historical_invocation_id',x->>'canonical_prepare_invocation_id',
     'historical_worker_run_id',x->>'preparation_worker_run_id',
     'historical_worker_status',CASE WHEN obs->>'worker_completed'='true' THEN 'COMPLETED' ELSE 'FAILED' END,
     'historical_event_id',obs->>'event_id','historical_release_sha',obs->>'release_sha',
     'historical_provider_outcome','UNKNOWN','historical_invocation_replay_authorized',false,
     'new_work_required','PREPARE_AND_INDEPENDENTLY_VERIFY_MISSING_SCOPE',
     'new_attempt_authorized',false,'fresh_exact_source_readback_required',true)
      ORDER BY (x->>'index')::int),'[]'::jsonb) INTO v_candidates
   FROM pg_catalog.jsonb_array_elements(v_children) x
   JOIN LATERAL pg_catalog.jsonb_array_elements(v_spine->'observations') obs
    ON obs->>'child_work_id'=x->>'child_original_work_id' AND obs->>'scope_sha256'=x->>'scope_sha256'
    AND obs->>'invocation_id'=x->>'canonical_prepare_invocation_id'
    AND obs->>'worker_run_id'=x->>'preparation_worker_run_id'
    AND obs->>'model_artifact_recorded'='false' AND obs->>'provider_outcome_verified'='false'
    AND obs->>'replay_authorized'='false'
    AND (obs->>'worker_completed'='true' OR (obs->>'worker_terminal_status'='FAILED'
      AND obs->>'worker_failure_attested'='true' AND obs->>'provider_outcome_unknown'='true'))
   JOIN LATERAL pg_catalog.jsonb_array_elements(v_plan.source_plan->'bounded_scopes') scope
    ON scope->>'index'=x->>'index' AND scope->>'proposed_scope_sha256'=x->>'scope_sha256'
   WHERE x->>'invocation_disposition'='TERMINAL_PREPARE_PROVIDER_OUTCOME_UNKNOWN'
    AND x->>'canonical_verify_invocation_id' IS NULL;
   IF pg_catalog.jsonb_array_length(v_candidates)=v_missing
    AND (SELECT count(DISTINCT x->>'child_work_id') FROM pg_catalog.jsonb_array_elements(v_candidates) x)=v_missing
   THEN
    v_recovery_status:='SAME_ORIGINAL_MISSING_REVIEW_WORK_QUALIFIED_FOR_EXACT_OWNER_DECISION';
    v_recovery_proposal:=pg_catalog.jsonb_build_object(
     'schema','reality-final-loop-same-obligation-recovery-qualification-v1',
     'owner_id',v_plan.owner_id,'shift_id',p_shift_id,'original_work_id',v_plan.parent_original_work_id,
     'source_ref',v_plan.source_ref,'source_head_sha',v_plan.source_head_sha,
     'source_manifest_sha256',v_plan.source_manifest_sha256,'plan_id',p_plan_id,'packet_id',v_packet.packet_id,
     'acceptance_contract_sha256',v_packet.acceptance_contract_sha256,
     'prior_owner_approval_receipt_sha256',v_packet.owner_approval_receipt_sha256,
     'continuity_root_id',v_guard->'continuity_root_id','continuity_head_sha256',v_guard->'continuity_head_sha256',
     'continuity_revision',v_guard->'revision','historical_observation_sha256',v_spine->'observation_sha256',
     'historical_return_event_id',v_spine->'canonical_return_event_id',
     'terminal_recovery_history',v_budget,'unfinished_scopes',v_candidates,
     'missing_scope_count',v_missing,'preserved_verified_scope_count',v_count-v_missing,
     'proposed_max_new_prepare_calls',v_missing,'proposed_max_new_independent_verify_calls',v_missing,
     'proposed_max_new_provider_calls',2*v_missing,
     'prior_budget_preserved',true,'fresh_source_readback_required',true,
     'distinct_invocation_ids_required',true,'historical_invocation_replay_authorized',false,
     'new_attempt_authorized',false,'new_budget_authorized',false,'execution_authorized',false,
     'original_job_completed',false,'production_changed',false,
     'requires_exact_owner_authority_and_existing_executor_acceptance',true);
    v_proposal_sha256:='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(v_recovery_proposal::text,'UTF8')),'hex');
   END IF;
  END IF;
 END IF;
 -- Capacity is witnessed by actual separate signed worker records,
 -- not inferred from an owner approval receipt or proposed scope count.
 SELECT count(*) INTO v_run_count FROM
  reality_internal.final_loop_child_review_work_v1 c
 WHERE c.plan_id=v_plan.plan_id AND c.claimant_worker_run_id IS NOT NULL;
 v_capacity:=v_run_count=v_plan.proposed_scope_count AND NOT EXISTS(
  SELECT 1 FROM reality_internal.final_loop_child_review_work_v1 c
  WHERE c.plan_id=v_plan.plan_id AND
   (NOT EXISTS(SELECT 1 FROM reality_internal.signed_worker_actual_runs_v1 r
     WHERE r.run_id=c.claimant_worker_run_id AND r.started_at IS NOT NULL)
    OR (c.phase='INDEPENDENTLY_VERIFIED' AND
      (c.independent_verifier_run_id=c.claimant_worker_run_id OR
       NOT EXISTS(SELECT 1 FROM reality_internal.signed_worker_actual_runs_v1 vr
        WHERE vr.run_id=c.independent_verifier_run_id
         AND vr.started_at IS NOT NULL)))));
 SELECT CASE WHEN v_capacity THEN
  'sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
   pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'scope_index',c.scope_index,'run_id',c.claimant_worker_run_id,
    'verifier_run_id',c.independent_verifier_run_id,
    'phase',c.phase) ORDER BY c.scope_index)::text,'UTF8')),'hex')
  ELSE null END INTO v_capacity_receipt
 FROM reality_internal.final_loop_child_review_work_v1 c
 WHERE c.plan_id=v_plan.plan_id;
 -- Full nonoverlapping integration batches are proof obligations of this
 -- same parent. Their receipts are not final customer outcome receipts.
 SELECT pg_catalog.count(*),
  pg_catalog.count(*) FILTER (WHERE
   i.phase='VERIFIED'
   AND i.cross_scope_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'
   AND i.evidence->>'independent_provider_readback'='true'
   AND i.evidence->>'all_child_receipts_verified'='true'
   AND i.first_scope_index=i.batch_index*6
   AND i.last_scope_index=least(
    v_plan.proposed_scope_count-1,i.batch_index*6+5)
   AND EXISTS(SELECT 1 FROM reality_internal.signed_worker_actual_runs_v1 r
    WHERE r.run_id=i.verifier_worker_run_id AND r.started_at IS NOT NULL)
   AND NOT EXISTS(SELECT 1 FROM reality_internal.final_loop_child_review_work_v1 c
    WHERE c.plan_id=v_plan.plan_id
     AND c.scope_index BETWEEN i.first_scope_index AND i.last_scope_index
     AND (c.claimant_worker_run_id=i.verifier_worker_run_id
      OR c.independent_verifier_run_id=i.verifier_worker_run_id))
  )
 INTO v_integration_count,v_integration_verified
 FROM reality_internal.final_loop_parent_integration_batches_v1 i
 WHERE i.plan_id=v_plan.plan_id AND i.packet_id=v_packet.packet_id
  AND i.owner_id=v_plan.owner_id AND i.shift_id=v_plan.shift_id
  AND i.parent_original_work_id=v_plan.parent_original_work_id
  AND i.source_manifest_sha256=v_plan.source_manifest_sha256
  AND i.source_head_sha=v_plan.source_head_sha
  AND i.acceptance_contract_sha256=v_packet.acceptance_contract_sha256;
 IF v_capacity AND v_integration_count=(v_plan.proposed_scope_count+5)/6
  AND v_integration_verified=v_integration_count
  AND NOT EXISTS(SELECT 1 FROM reality_internal.final_loop_child_review_work_v1 c
   WHERE c.plan_id=v_plan.plan_id
    AND c.phase<>'INDEPENDENTLY_VERIFIED') THEN
  SELECT 'sha256:'||pg_catalog.encode(pg_catalog.sha256(
   pg_catalog.convert_to(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'batch_index',i.batch_index,
    'receipt_sha256',i.cross_scope_receipt_sha256,
    'verified_child_receipts_sha256',i.verified_child_receipts_sha256
   ) ORDER BY i.batch_index)::text,'UTF8')),'hex')
  INTO v_integration_receipt
  FROM reality_internal.final_loop_parent_integration_batches_v1 i
  WHERE i.plan_id=v_plan.plan_id AND i.packet_id=v_packet.packet_id;
 END IF;
 RETURN pg_catalog.jsonb_build_object(
  'schema','reality-final-loop-independent-child-readback-v1',
  'status','FINAL_LOOP_CANONICAL_CHILD_RECOVERY_PROOF_NOT_PARENT_SETTLEMENT',
  'owner_id',v_plan.owner_id,'shift_id',v_plan.shift_id,
  'parent_original_work_id',v_plan.parent_original_work_id,
  'parent_source_ref',v_plan.source_ref,
  'source_manifest_sha256',v_plan.source_manifest_sha256,
  'source_head_sha',v_plan.source_head_sha,
  'acceptance_contract_sha256',v_packet.acceptance_contract_sha256,
  'independent_service_readback_verified',true,
  'authority',pg_catalog.jsonb_build_object(
   'owner_id',v_plan.owner_id,
   'parent_original_work_id',v_plan.parent_original_work_id,
   'acceptance_contract_sha256',v_packet.acceptance_contract_sha256,
   'independently_verified',true,
   'receipt_sha256',v_packet.owner_approval_receipt_sha256,
   'permitted_effects',pg_catalog.jsonb_build_array('READ','PREPARE'),
   'requested_effects',pg_catalog.jsonb_build_array('READ')),
  'capacity',pg_catalog.jsonb_build_object(
   'independently_attested',v_capacity,
   'signed_worker_observed',v_capacity,
   'scheduled_worker_observed',v_capacity,
   'receipt_sha256',v_capacity_receipt),
  'provider_effect_uncertain',v_uncertain>0,
  'historical_provider_outcome_uncertain',EXISTS(SELECT 1 FROM reality_internal.final_loop_child_review_work_v1 c WHERE c.plan_id=v_plan.plan_id AND c.historical_prepare_fence IS NOT NULL),
  'approved_recovery_candidate',reality_internal.read_final_loop_approved_recovery_candidate_v1(p_shift_id,p_plan_id),
  'recovery_qualification',pg_catalog.jsonb_build_object(
   'status',v_recovery_status,'unfinished_scope_count',v_missing,'uncertain_scope_count',v_uncertain,
   'proposal',v_recovery_proposal,'proposal_sha256',v_proposal_sha256,
   'execution_authorized',false,'new_attempt_authorized',false,'replay_authorized',false),
  'children',v_children,
  'cross_scope',pg_catalog.jsonb_build_object(
   'independently_verified',v_integration_receipt IS NOT NULL,
   'receipt_sha256',v_integration_receipt,
   'verified_batch_count',v_integration_verified,
   'required_batch_count',(v_plan.proposed_scope_count+5)/6),
  'parent_obligation_remains_open',true,
  'parent_outcome_verified',false,
  'universe_reconciled',false,'parent_settlement_committed',false,
  'original_job_completed',false,'production_changed',false);
END $function$;

REVOKE ALL ON FUNCTION public.reality_owner_approve_final_loop_child_v1(uuid,uuid,text,text,uuid), public.reality_claim_final_loop_child_review_v1(uuid,uuid,jsonb), public.reality_fence_final_loop_child_transport_v1(text,uuid,uuid,text,uuid,boolean,jsonb), public.reality_read_final_loop_child_recovery_v1(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_owner_approve_final_loop_child_v1(uuid,uuid,text,text,uuid), public.reality_claim_final_loop_child_review_v1(uuid,uuid,jsonb), public.reality_fence_final_loop_child_transport_v1(text,uuid,uuid,text,uuid,boolean,jsonb), public.reality_read_final_loop_child_recovery_v1(uuid,uuid) TO service_role;
