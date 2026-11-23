-- One Final Loop controller; transactional child obligations for an existing
-- source-pinned parent. Development-only migration. Do NOT apply to live DB.
-- Native Riley review gate remains <=8 files / non-draft, unchanged.
-- The parent is NEVER marked settled by these child records.

CREATE TABLE IF NOT EXISTS reality_internal.final_loop_child_approval_packets_v1 (
 packet_id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
 plan_id uuid NOT NULL REFERENCES reality_internal.final_loop_pr_source_plans_v1(plan_id),
 shift_id uuid NOT NULL,
 owner_id uuid NOT NULL,
 parent_original_work_id text NOT NULL CHECK
  (parent_original_work_id ~ '^work:[a-f0-9]{32}$'),
 source_ref text NOT NULL,
 source_manifest_sha256 text NOT NULL CHECK
  (source_manifest_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 acceptance_contract_sha256 text NOT NULL CHECK
  (acceptance_contract_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 authority_effect text NOT NULL DEFAULT 'READ_ONLY_INTERNAL_PR_REVIEW'
  CHECK(authority_effect='READ_ONLY_INTERNAL_PR_REVIEW'),
 state text NOT NULL DEFAULT 'AWAITING_EXACT_OWNER_APPROVAL'
  CHECK(state IN ('AWAITING_EXACT_OWNER_APPROVAL','APPROVED_ONCE',
                  'EFFECT_RESERVED_RECONCILE_ONLY')),
 proposal_fingerprint text NOT NULL CHECK
  (proposal_fingerprint ~ '^sha256:[a-f0-9]{64}$'),
 owner_approval_request_id uuid,
 owner_approval_receipt_sha256 text CHECK
  (owner_approval_receipt_sha256 IS NULL OR
   owner_approval_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 approved_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
 UNIQUE(plan_id,acceptance_contract_sha256)
);
CREATE TABLE IF NOT EXISTS reality_internal.final_loop_child_review_work_v1 (
 child_work_id text PRIMARY KEY CHECK
  (child_work_id ~ '^work:[a-f0-9]{32}$'),
 packet_id uuid NOT NULL REFERENCES
  reality_internal.final_loop_child_approval_packets_v1(packet_id),
 plan_id uuid NOT NULL REFERENCES
  reality_internal.final_loop_pr_source_plans_v1(plan_id),
 owner_id uuid NOT NULL,shift_id uuid NOT NULL,
 parent_original_work_id text NOT NULL CHECK
  (parent_original_work_id ~ '^work:[a-f0-9]{32}$'),
 scope_index integer NOT NULL CHECK(scope_index BETWEEN 0 AND 62),
 scope_sha256 text NOT NULL CHECK(scope_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 source_manifest_sha256 text NOT NULL CHECK
  (source_manifest_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 source_head_sha text NOT NULL CHECK(source_head_sha ~ '^[a-f0-9]{40}$'),
 acceptance_contract_sha256 text NOT NULL CHECK
  (acceptance_contract_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 phase text NOT NULL DEFAULT 'ADMITTED'
  CHECK(phase IN ('ADMITTED','CLAIMED','PREPARED','SOURCE_ARTIFACT_CHECKED',
                  'INDEPENDENTLY_VERIFIED','EFFECT_UNCERTAIN')),
 claim_id uuid NOT NULL DEFAULT pg_catalog.gen_random_uuid(),
 claimant_worker_run_id uuid,
 claimed_at timestamptz,
 model_response_id text,
 review_body text,
 review_sha256 text,
 independent_verifier_run_id uuid,
 independent_provider_evidence_sha256 text,
 independent_review_receipt_sha256 text,
 verified_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
 UNIQUE(plan_id,scope_index),UNIQUE(packet_id,scope_sha256)
);
ALTER TABLE reality_internal.final_loop_child_approval_packets_v1
 ENABLE ROW LEVEL SECURITY;
ALTER TABLE reality_internal.final_loop_child_review_work_v1
 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE reality_internal.final_loop_child_approval_packets_v1,
 reality_internal.final_loop_child_review_work_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON TABLE
 reality_internal.final_loop_child_approval_packets_v1,
 reality_internal.final_loop_child_review_work_v1 TO service_role;

-- Bind an exact approval request to a REAL canonical owner goal acceptance.
-- A shift warrant is NOT customer acceptance and a manifest is NOT authority.
CREATE OR REPLACE FUNCTION public.reality_prepare_final_loop_child_approval_v1(
 p_plan_id uuid,p_acceptance_contract_sha256 text,p_worker_run_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE v_plan record;v_id uuid;v_fingerprint text;v_packet record;
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'FINAL_LOOP_CHILD_APPROVAL_SERVICE_ONLY'; END IF;
 IF p_plan_id IS NULL OR p_worker_run_id IS NULL OR
  coalesce(p_acceptance_contract_sha256,'') !~
   '^sha256:[a-f0-9]{64}$' THEN
  RETURN pg_catalog.jsonb_build_object(
   'status','FINAL_LOOP_CHILD_APPROVAL_INVALID_INPUT',
   'owner_approval_granted',false,'execution_authorized',false);END IF;
 SELECT p.* INTO v_plan
 FROM reality_internal.final_loop_pr_source_plans_v1 p
 JOIN reality_internal.governed_employee_shifts_v1 s
  ON s.shift_id=p.shift_id AND s.owner_id=p.owner_id
  AND s.plan_fingerprint=p.plan_fingerprint
 JOIN reality_internal.governed_employee_completion_warrants_v1 w
  ON w.shift_id=s.shift_id AND w.owner_id=s.owner_id
  AND w.plan_fingerprint=s.plan_fingerprint
 WHERE p.plan_id=p_plan_id AND p.parent_original_work_id IS NOT NULL
  AND p.state='PROPOSED_SOURCE_PLAN_AWAITING_INDEPENDENT_ADMISSION'
  AND s.closed_at IS NULL AND s.authorized_at IS NOT NULL
  AND s.planned_end_at='infinity'::timestamptz
  AND s.status IN ('RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
  AND w.state='ACTIVE' AND w.mode='UNTIL_ALL_INDEPENDENT_FINAL_RECEIPTS'
  AND EXISTS(SELECT 1 FROM
    reality_internal.riley_pr_review_originals_v1 parent
   WHERE parent.shift_id=p.shift_id AND parent.owner_id=p.owner_id
    AND parent.original_work_id=p.parent_original_work_id
    AND parent.source_ref=p.source_ref AND parent.phase='BLOCKED'
    AND parent.model_response_id IS NULL AND parent.review_body IS NULL
    AND parent.provider_comment_id IS NULL
    AND parent.settlement_receipt_id IS NULL)
  AND EXISTS(SELECT 1 FROM reality_internal.signed_worker_actual_runs_v1 r
   WHERE r.run_id=p_worker_run_id AND r.status='STARTED'
    AND r.finished_at IS NULL
    AND r.started_at>=pg_catalog.clock_timestamp()-interval '10 minutes')
  -- Independently verified goal acceptance and continuity scope, not
  -- user-entered hashes, signed shift plans, or model-generated wishes.
  AND EXISTS(SELECT 1 FROM public.universe_events e
   WHERE e.epistemic_status='VERIFIED'
    AND e.continuity_root_id IS NOT NULL AND e.worldline_id IS NOT NULL
    AND e.payload->>'principal_id'=p.owner_id::text
    AND e.payload->>'original_work_id'=p.parent_original_work_id
    AND e.payload->>'acceptance_contract_sha256'=p_acceptance_contract_sha256
    AND (e.payload->>'source_ref'=p.source_ref OR
         e.provenance->>'source_ref'=p.source_ref));
 IF NOT FOUND THEN
  RETURN pg_catalog.jsonb_build_object(
   'status','FINAL_LOOP_INDEPENDENT_PARENT_ACCEPTANCE_OR_SOURCE_NOT_VERIFIED',
   'owner_approval_granted',false,'execution_authorized',false,
   'new_original_created',false,'original_job_completed',false);END IF;
 v_fingerprint:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to(pg_catalog.jsonb_build_object(
   'plan_id',v_plan.plan_id,'shift_id',v_plan.shift_id,
   'owner_id',v_plan.owner_id,
   'parent_original_work_id',v_plan.parent_original_work_id,
   'source_manifest_sha256',v_plan.source_manifest_sha256,
   'acceptance_contract_sha256',p_acceptance_contract_sha256,
   'effect','READ_ONLY_INTERNAL_PR_REVIEW')::text,'UTF8')),'hex');
 INSERT INTO reality_internal.final_loop_child_approval_packets_v1
 (plan_id,shift_id,owner_id,parent_original_work_id,source_ref,
  source_manifest_sha256,acceptance_contract_sha256,proposal_fingerprint)
 VALUES(v_plan.plan_id,v_plan.shift_id,v_plan.owner_id,
  v_plan.parent_original_work_id,v_plan.source_ref,
  v_plan.source_manifest_sha256,p_acceptance_contract_sha256,v_fingerprint)
 ON CONFLICT(plan_id,acceptance_contract_sha256) DO NOTHING
 RETURNING packet_id INTO v_id;
 SELECT * INTO v_packet
 FROM reality_internal.final_loop_child_approval_packets_v1
 WHERE plan_id=p_plan_id AND
  acceptance_contract_sha256=p_acceptance_contract_sha256;
 IF NOT FOUND OR v_packet.proposal_fingerprint<>v_fingerprint THEN
  RETURN pg_catalog.jsonb_build_object(
   'status','FINAL_LOOP_CHILD_APPROVAL_PACKET_CONFLICT_NO_REPLAY',
   'owner_approval_granted',false,'execution_authorized',false);END IF;
 RETURN pg_catalog.jsonb_build_object(
  'status',CASE WHEN v_packet.state='AWAITING_EXACT_OWNER_APPROVAL'
   THEN 'FINAL_LOOP_CHILD_EXACT_OWNER_APPROVAL_REQUIRED'
   ELSE 'FINAL_LOOP_CHILD_PACKET_ALREADY_AUTHORIZED_OR_RESERVED' END,
  'packet_id',v_packet.packet_id,'owner_id',v_packet.owner_id,
  'shift_id',v_packet.shift_id,
  'parent_original_work_id',v_packet.parent_original_work_id,
  'source_ref',v_packet.source_ref,
  'source_manifest_sha256',v_packet.source_manifest_sha256,
  'acceptance_contract_sha256',v_packet.acceptance_contract_sha256,
  'proposal_fingerprint',v_packet.proposal_fingerprint,
  'effect_type',v_packet.authority_effect,
  'owner_approval_granted',v_packet.state<>'AWAITING_EXACT_OWNER_APPROVAL',
  'execution_authorized',false,'original_job_completed',false);
END $fn$;

-- Requires a separately authenticated owner action in Reality Chat/API.
-- The caller cannot choose an effect, child executor, scope, or new parent.
CREATE OR REPLACE FUNCTION public.reality_owner_approve_final_loop_child_v1(
 p_owner_id uuid,p_packet_id uuid,p_proposal_fingerprint text,
 p_manifest_sha256 text,p_approval_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE v_packet record;v_plan record;v_receipt text;
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
  OR NOT EXISTS(SELECT 1 FROM public.universe_events e
   WHERE e.epistemic_status='VERIFIED'
    AND e.payload->>'principal_id'=p_owner_id::text
    AND e.payload->>'original_work_id'=v_packet.parent_original_work_id
    AND e.payload->>'acceptance_contract_sha256'=
      v_packet.acceptance_contract_sha256
    AND (e.payload->>'source_ref'=v_packet.source_ref OR
         e.provenance->>'source_ref'=v_packet.source_ref))
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
END $fn$;


-- Atomic batch creation is one child per actual bounded source scope. This
-- consumes the packet's one-use execution authority only when an actual
-- signed worker has capacity. A failure after CLAIMED requires reconciliation,
-- never a blind second model invocation or external publication.
CREATE OR REPLACE FUNCTION public.reality_claim_final_loop_child_review_v1(
 p_shift_id uuid,p_worker_run_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE v_packet record;v_plan record;v_parent record;v_child record;
 v_scope jsonb;v_expected integer;v_actual integer;v_work text;
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'FINAL_LOOP_CHILD_CLAIM_SERVICE_ONLY';END IF;
 IF p_shift_id IS NULL OR p_worker_run_id IS NULL OR
  NOT EXISTS(SELECT 1 FROM reality_internal.signed_worker_actual_runs_v1 r
   WHERE r.run_id=p_worker_run_id AND r.status='STARTED'
    AND r.finished_at IS NULL AND
    r.started_at>=pg_catalog.clock_timestamp()-interval '10 minutes') THEN
  RETURN pg_catalog.jsonb_build_object(
   'status','FINAL_LOOP_CHILD_SIGNED_WORKER_REQUIRED',
   'child_claimed',false,'original_job_completed',false);END IF;
 SELECT a.* INTO v_packet FROM
  reality_internal.final_loop_child_approval_packets_v1 a
 JOIN reality_internal.governed_employee_shifts_v1 s
  ON s.shift_id=a.shift_id AND s.owner_id=a.owner_id
 JOIN reality_internal.governed_employee_completion_warrants_v1 w
  ON w.shift_id=s.shift_id AND w.owner_id=s.owner_id
  AND w.plan_fingerprint=s.plan_fingerprint
 WHERE a.shift_id=p_shift_id
  AND a.state IN ('APPROVED_ONCE','EFFECT_RESERVED_RECONCILE_ONLY')
  AND a.owner_approval_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'
  AND a.approved_at>=pg_catalog.clock_timestamp()-interval '12 hours'
  AND s.closed_at IS NULL AND s.authorized_at IS NOT NULL
  AND s.planned_end_at='infinity'::timestamptz
  AND s.status IN ('RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
  AND w.state='ACTIVE' AND w.mode='UNTIL_ALL_INDEPENDENT_FINAL_RECEIPTS'
  AND EXISTS(SELECT 1 FROM reality_internal.riley_pr_review_originals_v1 r
   WHERE r.shift_id=a.shift_id AND r.owner_id=a.owner_id
    AND r.original_work_id=a.parent_original_work_id
    AND r.source_ref=a.source_ref AND r.phase='BLOCKED'
    AND r.model_response_id IS NULL AND r.review_body IS NULL
    AND r.provider_comment_id IS NULL
    AND r.settlement_receipt_id IS NULL)
 ORDER BY a.approved_at,a.packet_id LIMIT 1 FOR UPDATE OF a SKIP LOCKED;
 IF NOT FOUND THEN
  RETURN pg_catalog.jsonb_build_object(
   'status','FINAL_LOOP_NO_OWNER_APPROVED_PARENT_CHILD_REVIEW_READY',
   'child_claimed',false,'original_job_completed',false);END IF;
 SELECT * INTO v_plan FROM
  reality_internal.final_loop_pr_source_plans_v1 p
 WHERE p.plan_id=v_packet.plan_id AND p.shift_id=v_packet.shift_id
  AND p.owner_id=v_packet.owner_id
  AND p.parent_original_work_id=v_packet.parent_original_work_id
  AND p.source_ref=v_packet.source_ref
  AND p.source_manifest_sha256=v_packet.source_manifest_sha256
  AND p.state='PROPOSED_SOURCE_PLAN_AWAITING_INDEPENDENT_ADMISSION';
 IF NOT FOUND THEN
  RETURN pg_catalog.jsonb_build_object('status','FINAL_LOOP_PARENT_PLAN_DRIFT',
   'child_claimed',false,'original_job_completed',false);END IF;
 IF pg_catalog.jsonb_array_length(v_plan.source_plan->'bounded_scopes')
    <>v_plan.proposed_scope_count THEN
  RETURN pg_catalog.jsonb_build_object('status','FINAL_LOOP_SOURCE_SCOPES_CHANGED',
   'child_claimed',false,'original_job_completed',false);END IF;
 IF v_packet.state='APPROVED_ONCE' THEN
  FOR v_scope IN SELECT value FROM pg_catalog.jsonb_array_elements(
   v_plan.source_plan->'bounded_scopes') item(value) LOOP
   v_work:='work:'||pg_catalog.left(pg_catalog.encode(pg_catalog.sha256(
    pg_catalog.convert_to('reality:final-loop-child-v1:'||
     v_packet.packet_id::text||':'||(v_scope->>'index')||':'||
     (v_scope->>'proposed_scope_sha256'),'UTF8')),'hex'),32);
   INSERT INTO reality_internal.final_loop_child_review_work_v1
    (child_work_id,packet_id,plan_id,owner_id,shift_id,
     parent_original_work_id,scope_index,scope_sha256,
     source_manifest_sha256,source_head_sha,acceptance_contract_sha256)
   VALUES(v_work,v_packet.packet_id,v_plan.plan_id,v_packet.owner_id,
    v_packet.shift_id,v_packet.parent_original_work_id,
    (v_scope->>'index')::integer,v_scope->>'proposed_scope_sha256',
    v_plan.source_manifest_sha256,v_plan.source_head_sha,
    v_packet.acceptance_contract_sha256)
   ON CONFLICT DO NOTHING;
  END LOOP;
  UPDATE reality_internal.final_loop_child_approval_packets_v1
   SET state='EFFECT_RESERVED_RECONCILE_ONLY'
   WHERE packet_id=v_packet.packet_id AND state='APPROVED_ONCE';
 END IF;
 SELECT count(*) INTO v_actual FROM
  reality_internal.final_loop_child_review_work_v1 c
 WHERE c.packet_id=v_packet.packet_id AND c.plan_id=v_plan.plan_id
  AND c.shift_id=v_packet.shift_id
  AND c.parent_original_work_id=v_packet.parent_original_work_id
  AND c.source_manifest_sha256=v_plan.source_manifest_sha256;
 IF v_actual<>v_plan.proposed_scope_count THEN
  RAISE EXCEPTION 'FINAL_LOOP_CHILD_ATOMIC_SCOPE_ADMISSION_INCOMPLETE';END IF;
 SELECT c.* INTO v_child FROM
  reality_internal.final_loop_child_review_work_v1 c
 WHERE c.packet_id=v_packet.packet_id AND c.phase='ADMITTED'
 ORDER BY c.scope_index LIMIT 1 FOR UPDATE SKIP LOCKED;
 IF NOT FOUND THEN
  RETURN pg_catalog.jsonb_build_object(
   'status','FINAL_LOOP_ALL_CHILDREN_CLAIMED_OR_PENDING_VERIFICATION',
   'parent_original_work_id',v_packet.parent_original_work_id,
   'child_claimed',false,'original_job_completed',false);END IF;
 UPDATE reality_internal.final_loop_child_review_work_v1
 SET phase='CLAIMED',claimant_worker_run_id=p_worker_run_id,
  claimed_at=pg_catalog.clock_timestamp(),
  claim_id=pg_catalog.gen_random_uuid(),
  updated_at=pg_catalog.clock_timestamp()
 WHERE child_work_id=v_child.child_work_id AND phase='ADMITTED'
 RETURNING * INTO v_child;
 IF NOT FOUND THEN
  RETURN pg_catalog.jsonb_build_object(
   'status','FINAL_LOOP_CHILD_CONCURRENT_CLAIM_NOT_COMMITTED',
   'child_claimed',false,'original_job_completed',false);END IF;
 SELECT value INTO v_scope FROM pg_catalog.jsonb_array_elements(
  v_plan.source_plan->'bounded_scopes') item(value)
 WHERE (item.value->>'index')::integer=v_child.scope_index;
 RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_EXACT_SIGNED_CHILD_CLAIMED_ONCE',
  'owner_id',v_child.owner_id,'shift_id',v_child.shift_id,
  'child_work_id',v_child.child_work_id,'claim_id',v_child.claim_id,
  'claimant_worker_run_id',v_child.claimant_worker_run_id,
  'parent_original_work_id',v_child.parent_original_work_id,
  'source_ref',v_plan.source_ref,'source_head_sha',v_child.source_head_sha,
  'source_manifest_sha256',v_child.source_manifest_sha256,
  'source_proof_sha256',v_plan.source_proof_sha256,
  'acceptance_contract_sha256',v_child.acceptance_contract_sha256,
  'approval_receipt_sha256',v_packet.owner_approval_receipt_sha256,
  'scope_index',v_child.scope_index,'scope_sha256',v_child.scope_sha256,
  'scope',v_scope,
  'phase',v_child.phase,'child_claimed',true,'model_invoked',false,
  'external_effect_performed',false,'original_job_completed',false,
  'parent_obligation_remains_open',true,'production_changed',false);
END $fn$;

-- Guard both pre- and post-inference via the Reality governed gateway.
CREATE OR REPLACE FUNCTION public.reality_read_final_loop_child_model_scope_v1(
 p_child_work_id text,p_claim_id uuid,p_worker_run_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE v_child record;v_plan record;v_packet record;
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'FINAL_LOOP_CHILD_MODEL_SCOPE_SERVICE_ONLY';END IF;
 SELECT c.* INTO v_child FROM
  reality_internal.final_loop_child_review_work_v1 c
 WHERE c.child_work_id=p_child_work_id AND c.claim_id=p_claim_id
  AND c.claimant_worker_run_id=p_worker_run_id AND c.phase='CLAIMED';
 IF NOT FOUND THEN
  RETURN pg_catalog.jsonb_build_object(
   'status','FINAL_LOOP_CHILD_MODEL_CURRENT_CLAIM_NOT_FOUND',
   'model_authorized',false);END IF;
 SELECT * INTO v_plan FROM reality_internal.final_loop_pr_source_plans_v1
  WHERE plan_id=v_child.plan_id;
 SELECT * INTO v_packet FROM reality_internal.final_loop_child_approval_packets_v1
  WHERE packet_id=v_child.packet_id;
 IF v_packet.state<>'EFFECT_RESERVED_RECONCILE_ONLY'
  OR v_packet.owner_approval_receipt_sha256 IS NULL
  OR v_packet.acceptance_contract_sha256<>v_child.acceptance_contract_sha256
  OR v_plan.source_manifest_sha256<>v_child.source_manifest_sha256
  OR NOT EXISTS(SELECT 1 FROM reality_internal.signed_worker_actual_runs_v1 r
   WHERE r.run_id=p_worker_run_id AND r.status='STARTED'
    AND r.finished_at IS NULL)
  OR NOT EXISTS(SELECT 1 FROM reality_internal.governed_employee_shifts_v1 s
   WHERE s.shift_id=v_child.shift_id AND s.owner_id=v_child.owner_id
    AND s.closed_at IS NULL AND s.authorized_at IS NOT NULL
    AND s.planned_end_at='infinity'::timestamptz)
 THEN RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_CHILD_MODEL_AUTHORITY_OR_SOURCE_STALE',
  'model_authorized',false);END IF;
 RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_CHILD_CURRENT_SIGNED_MODEL_READBACK',
  'owner_id',v_child.owner_id,'shift_id',v_child.shift_id,
  'child_work_id',v_child.child_work_id,
  'claim_id',v_child.claim_id,
  'worker_run_id',p_worker_run_id,
  'parent_original_work_id',v_child.parent_original_work_id,
  'source_ref',v_plan.source_ref,'source_head_sha',v_child.source_head_sha,
  'source_manifest_sha256',v_child.source_manifest_sha256,
  'acceptance_contract_sha256',v_child.acceptance_contract_sha256,
  'scope_sha256',v_child.scope_sha256,
  'phase',v_child.phase,'model_response_id',v_child.model_response_id,
  'read_only_model_execution',true,'model_authorized',true,
  'external_effect_authorized',false,
  'original_job_completed',false,'production_changed',false);
END $fn$;

CREATE OR REPLACE FUNCTION public.reality_prepare_final_loop_child_review_v1(
 p_child_work_id text,p_claim_id uuid,p_worker_run_id uuid,
 p_head_sha text,p_model_response_id text,p_review_body text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE v_child record;v_hash text;v_scope jsonb;v_plan record;
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'FINAL_LOOP_CHILD_PREPARE_SERVICE_ONLY';END IF;
 IF p_child_work_id !~ '^work:[a-f0-9]{32}$'
  OR p_claim_id IS NULL OR p_worker_run_id IS NULL
  OR coalesce(p_head_sha,'') !~ '^[a-f0-9]{40}$'
  OR coalesce(p_model_response_id,'') !~ '^resp_[A-Za-z0-9_-]{4,160}$'
  OR pg_catalog.length(coalesce(p_review_body,'')) NOT BETWEEN 100 AND 4000
 THEN RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_CHILD_PREPARE_INVALID_SCOPE',
  'review_prepared',false,'original_job_completed',false);END IF;
 SELECT c.* INTO v_child
 FROM reality_internal.final_loop_child_review_work_v1 c
 WHERE c.child_work_id=p_child_work_id AND c.claim_id=p_claim_id
  AND c.claimant_worker_run_id=p_worker_run_id AND c.phase='CLAIMED'
  AND c.source_head_sha=p_head_sha FOR UPDATE;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_CHILD_ORIGINAL_CLAIM_OR_SOURCE_CHANGED',
  'review_prepared',false,'original_job_completed',false);END IF;
 SELECT * INTO v_plan FROM reality_internal.final_loop_pr_source_plans_v1
 WHERE plan_id=v_child.plan_id;
 SELECT value INTO v_scope FROM pg_catalog.jsonb_array_elements(
  v_plan.source_plan->'bounded_scopes') item(value)
 WHERE (item.value->>'index')::integer=v_child.scope_index;
 IF v_scope->>'proposed_scope_sha256'<>v_child.scope_sha256 OR
  NOT EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(
   v_scope->'files') item(value)
   WHERE p_review_body LIKE '%'||(item.value->>'path')||'%') OR
  NOT EXISTS(SELECT 1 FROM reality_internal.signed_worker_actual_runs_v1 r
   WHERE r.run_id=p_worker_run_id AND r.status='STARTED'
    AND r.finished_at IS NULL)
 THEN RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_CHILD_PREPARED_PATCH_OR_WORKER_NOT_VERIFIED',
  'review_prepared',false,'original_job_completed',false);END IF;
 v_hash:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to(p_review_body,'UTF8')),'hex');
 UPDATE reality_internal.final_loop_child_review_work_v1
 SET phase='PREPARED',model_response_id=p_model_response_id,
  review_body=p_review_body,review_sha256=v_hash,
  updated_at=pg_catalog.clock_timestamp()
 WHERE child_work_id=p_child_work_id AND phase='CLAIMED';
 RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_CHILD_MODEL_ARTIFACT_PREPARED_NOT_VERIFIED',
  'child_work_id',p_child_work_id,'parent_original_work_id',
   v_child.parent_original_work_id,
  'review_sha256',v_hash,'source_head_sha',v_child.source_head_sha,
  'review_prepared',true,'independent_verification_required',true,
  'original_job_completed',false,'production_changed',false);
END $fn$;
