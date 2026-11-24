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

-- The Final Loop's canonical goal acceptance contract is derived from
-- existing signed owner shift, frozen independently sourced PR original,
-- and immutable full changed-file manifest. This creates a PROPOSAL,
-- never grants owner consent. Only the authenticated owner click below
-- can change the one-use packet from pending to approved.
CREATE OR REPLACE FUNCTION
 reality_internal.final_loop_pr_review_acceptance_digest_v1(p_plan_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY INVOKER
SET search_path TO '' AS $goal$
 SELECT 'sha256:'||pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to(pg_catalog.jsonb_build_object(
   'version','reality-final-loop-pr-review-acceptance-contract-v1',
   'owner_id',p.owner_id,
   'shift_id',p.shift_id,
   'original_work_id',p.parent_original_work_id,
   'source_ref',p.source_ref,
   'source_proof_sha256',p.source_proof_sha256,
   'source_manifest_sha256',p.source_manifest_sha256,
   'expected_outcome','INDEPENDENTLY_DELIVERED_AND_VERIFIED_PR_REVIEW',
   'required_child_proof','INDEPENDENT_ALL_SCOPES_AND_INTEGRATION',
   'required_parent_proof','EXACT_DELIVERY_AND_UNIVERSE_RECONCILIATION',
   'execution_scope','READ_ONLY_REVIEW_UNTIL_SEPARATE_PUBLICATION_APPROVAL',
   'prohibited_effects',pg_catalog.jsonb_build_array(
    'PRODUCTION_INSTALL','UNAUTHORIZED_GITHUB_WRITE')
   )::text,'UTF8')),'hex')
 FROM reality_internal.final_loop_pr_source_plans_v1 p
 JOIN reality_internal.governed_employee_shifts_v1 s
  ON s.shift_id=p.shift_id AND s.owner_id=p.owner_id
  AND s.plan_fingerprint=p.plan_fingerprint
 JOIN reality_internal.governed_employee_completion_warrants_v1 w
  ON w.shift_id=s.shift_id AND w.owner_id=s.owner_id
  AND w.plan_fingerprint=s.plan_fingerprint
 JOIN reality_internal.riley_pr_review_originals_v1 r
  ON r.original_work_id=p.parent_original_work_id
  AND r.shift_id=p.shift_id AND r.owner_id=p.owner_id
  AND r.source_ref=p.source_ref AND r.source_proof_sha256=p.source_proof_sha256
 JOIN reality_internal.governed_employee_shift_steps_v1 step
  ON step.shift_id=p.shift_id AND step.source_ref=p.source_ref
  AND step.proof_sha256=p.source_proof_sha256 AND step.state='SOURCE_CHECKED'
 WHERE p.plan_id=p_plan_id AND p.parent_original_work_id IS NOT NULL
  AND p.state='PROPOSED_SOURCE_PLAN_AWAITING_INDEPENDENT_ADMISSION'
  AND s.authorized_at IS NOT NULL AND s.closed_at IS NULL
  AND s.planned_end_at='infinity'::timestamptz
  AND s.status IN ('RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
  AND w.state='ACTIVE' AND w.mode IN (
   'UNTIL_ALL_INDEPENDENT_FINAL_RECEIPTS',
   'UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS')
  AND EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(w.source_scope) item
   WHERE item->>'source_ref'=p.source_ref)
  AND r.phase='BLOCKED'
  AND r.model_response_id IS NULL AND r.review_body IS NULL
  AND r.provider_comment_id IS NULL AND r.settlement_receipt_id IS NULL
 LIMIT 1
$goal$;
REVOKE ALL ON FUNCTION reality_internal.final_loop_pr_review_acceptance_digest_v1(uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION reality_internal.final_loop_pr_review_acceptance_digest_v1(uuid)
 TO service_role;

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
  AND w.state='ACTIVE' AND w.mode IN ('UNTIL_ALL_INDEPENDENT_FINAL_RECEIPTS',
   'UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS')
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
  -- Derived from the actual signed original, never a model-provided
  -- customer goal. OWNER ACCEPTANCE IS STILL PENDING at this point.
  AND p_acceptance_contract_sha256=
   reality_internal.final_loop_pr_review_acceptance_digest_v1(p.plan_id);
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
  -- Owner intent is durable for the exact active signed shift. The separate
  -- actual worker lease above remains short-lived and must be current.
  AND a.approved_at IS NOT NULL
  AND a.approved_at<=pg_catalog.clock_timestamp()
  AND a.owner_approval_request_id IS NOT NULL
  AND s.closed_at IS NULL AND s.authorized_at IS NOT NULL
  AND s.planned_end_at='infinity'::timestamptz
  AND s.status IN ('RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
  AND w.state='ACTIVE' AND w.mode IN ('UNTIL_ALL_INDEPENDENT_FINAL_RECEIPTS',
   'UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS')
  AND EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(w.source_scope) scope(entry)
   WHERE scope.entry->>'source_ref'=a.source_ref)
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
 -- Revalidate the exact frozen contract and independently recorded goal
 -- before reserving any child. Durable consent does not permit scope drift.
 IF v_packet.acceptance_contract_sha256 IS DISTINCT FROM
   reality_internal.final_loop_pr_review_acceptance_digest_v1(v_plan.plan_id)
   OR NOT EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(
    public.reality_read_final_loop_child_approval_preflight_v1(p_shift_id)->'plans') p(value)
    WHERE p.value->>'plan_id'=v_plan.plan_id::text
     AND p.value->>'independent_goal_acceptance_verified'='true'
     AND p.value->>'owner_approval_claim_window_current'='true') THEN
  RETURN pg_catalog.jsonb_build_object('status','FINAL_LOOP_OWNER_ACCEPTANCE_SCOPE_NOT_CURRENT',
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


-- A different, actually started worker must perform fresh provider reads.
-- This endpoint reads a prepared child but never publishes/retries the model.
CREATE OR REPLACE FUNCTION public.reality_read_final_loop_child_verify_v1(
 p_shift_id uuid,p_verifier_run_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE v_child record;v_plan record;v_scope jsonb;
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'FINAL_LOOP_CHILD_VERIFY_SERVICE_ONLY'; END IF;
 IF p_shift_id IS NULL OR p_verifier_run_id IS NULL OR
  NOT EXISTS(SELECT 1 FROM reality_internal.signed_worker_actual_runs_v1 r
   WHERE r.run_id=p_verifier_run_id AND r.status='STARTED'
    AND r.finished_at IS NULL
    AND r.started_at>=pg_catalog.clock_timestamp()-interval '10 minutes') THEN
  RETURN pg_catalog.jsonb_build_object(
   'status','FINAL_LOOP_CHILD_INDEPENDENT_SIGNED_RUN_REQUIRED',
   'verification_committed',false);END IF;
 SELECT c.* INTO v_child FROM
 reality_internal.final_loop_child_review_work_v1 c
 JOIN reality_internal.final_loop_child_approval_packets_v1 p
  ON p.packet_id=c.packet_id
 WHERE c.shift_id=p_shift_id AND c.phase='PREPARED'
  AND c.claimant_worker_run_id<>p_verifier_run_id
  AND c.model_response_id ~ '^resp_[A-Za-z0-9_-]{4,160}$'
  AND c.review_sha256 ~ '^sha256:[a-f0-9]{64}$'
  AND p.state='EFFECT_RESERVED_RECONCILE_ONLY'
  AND EXISTS(SELECT 1 FROM reality_internal.governed_employee_shifts_v1 s
   WHERE s.shift_id=c.shift_id AND s.owner_id=c.owner_id
    AND s.closed_at IS NULL AND s.planned_end_at='infinity'::timestamptz)
 ORDER BY c.updated_at,c.scope_index LIMIT 1;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_NO_PREPARED_CHILD_FOR_INDEPENDENT_VERIFICATION',
  'verification_committed',false);END IF;
 SELECT * INTO v_plan FROM reality_internal.final_loop_pr_source_plans_v1
 WHERE plan_id=v_child.plan_id;
 SELECT value INTO v_scope FROM pg_catalog.jsonb_array_elements(
  v_plan.source_plan->'bounded_scopes') item(value)
 WHERE (item.value->>'index')::integer=v_child.scope_index;
 RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_INDEPENDENT_CHILD_VERIFICATION_CANDIDATE',
  'owner_id',v_child.owner_id,'shift_id',v_child.shift_id,
  'child_work_id',v_child.child_work_id,
  'parent_original_work_id',v_child.parent_original_work_id,
  'source_ref',v_plan.source_ref,'source_head_sha',v_child.source_head_sha,
  'source_manifest_sha256',v_child.source_manifest_sha256,
  'source_proof_sha256',v_plan.source_proof_sha256,
  'acceptance_contract_sha256',v_child.acceptance_contract_sha256,
  'scope_index',v_child.scope_index,'scope_sha256',v_child.scope_sha256,
  'scope',v_scope,'model_response_id',v_child.model_response_id,
  'review_body',v_child.review_body,'review_sha256',v_child.review_sha256,
  'original_generation_worker_run_id',v_child.claimant_worker_run_id,
  'independent_verifier_run_id',p_verifier_run_id,
  'read_only',true,'verification_committed',false,
  'original_job_completed',false,'production_changed',false);
END $fn$;

ALTER TABLE reality_internal.final_loop_child_review_work_v1
 ADD COLUMN IF NOT EXISTS verifier_evidence jsonb;

CREATE OR REPLACE FUNCTION public.reality_record_final_loop_child_verified_v1(
 p_child_work_id text,p_verifier_run_id uuid,
 p_review_sha256 text,p_source_head_sha text,
 p_source_manifest_sha256 text,p_evidence jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE v_child record;v_plan record;v_scope jsonb;v_path jsonb;
 v_count integer;v_distinct integer;v_receipt text;v_review text;
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'FINAL_LOOP_CHILD_VERIFICATION_SERVICE_ONLY';END IF;
 IF p_verifier_run_id IS NULL OR
  coalesce(p_child_work_id,'') !~ '^work:[a-f0-9]{32}$' OR
  coalesce(p_review_sha256,'') !~ '^sha256:[a-f0-9]{64}$' OR
  coalesce(p_source_head_sha,'') !~ '^[a-f0-9]{40}$' OR
  coalesce(p_source_manifest_sha256,'') !~ '^sha256:[a-f0-9]{64}$' OR
  pg_catalog.jsonb_typeof(p_evidence)<>'object' OR
  p_evidence->>'schema'<>'reality-final-loop-independent-patch-review-v1' OR
  p_evidence->>'review_source_verified'<>'true' OR
  p_evidence->>'all_scope_patches_checked'<>'true' OR
  p_evidence->>'independent_model_used'<>'true' OR
  p_evidence->>'read_only'<>'true' OR
  p_evidence->>'production_changed'<>'false' OR
  p_evidence->>'source_manifest_sha256'<>p_source_manifest_sha256 OR
  p_evidence->>'source_head_sha'<>p_source_head_sha OR
  p_evidence->>'review_sha256'<>p_review_sha256 OR
  coalesce(p_evidence->>'verifier_model_response_id','')
   !~ '^resp_[A-Za-z0-9_-]{4,160}$' OR
  coalesce(p_evidence->>'provider_evidence_sha256','')
   !~ '^sha256:[a-f0-9]{64}$' OR
  coalesce(p_evidence->>'verifier_verdict_sha256','')
   !~ '^sha256:[a-f0-9]{64}$' OR
  pg_catalog.jsonb_typeof(p_evidence->'verified_paths')<>'array'
 THEN RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_INDEPENDENT_CHILD_PROOF_INVALID',
  'independently_verified',false,'original_job_completed',false);END IF;
 SELECT c.* INTO v_child FROM
  reality_internal.final_loop_child_review_work_v1 c
 WHERE c.child_work_id=p_child_work_id AND c.phase='PREPARED'
  AND c.claimant_worker_run_id<>p_verifier_run_id
  AND c.review_sha256=p_review_sha256
  AND c.source_head_sha=p_source_head_sha
  AND c.source_manifest_sha256=p_source_manifest_sha256
 FOR UPDATE;
 IF NOT FOUND OR NOT EXISTS(
  SELECT 1 FROM reality_internal.signed_worker_actual_runs_v1 r
  WHERE r.run_id=p_verifier_run_id AND r.status='STARTED'
   AND r.finished_at IS NULL
   AND r.started_at>=pg_catalog.clock_timestamp()-interval '10 minutes')
 THEN RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_CHILD_VERIFIER_RUN_OR_CLAIM_UNVERIFIED',
  'independently_verified',false,'original_job_completed',false);END IF;
 SELECT * INTO v_plan FROM reality_internal.final_loop_pr_source_plans_v1 p
 WHERE p.plan_id=v_child.plan_id AND p.shift_id=v_child.shift_id
  AND p.source_manifest_sha256=v_child.source_manifest_sha256;
 SELECT value INTO v_scope FROM pg_catalog.jsonb_array_elements(
  v_plan.source_plan->'bounded_scopes') item(value)
 WHERE (item.value->>'index')::integer=v_child.scope_index;
 IF v_scope->>'proposed_scope_sha256'<>v_child.scope_sha256
  OR p_evidence->>'child_work_id'<>v_child.child_work_id
  OR p_evidence->>'parent_original_work_id'<>v_child.parent_original_work_id
  OR p_evidence->>'scope_sha256'<>v_child.scope_sha256
  OR p_evidence->>'independent_verifier_run_id'<>p_verifier_run_id::text
  OR (p_evidence->>'verifier_model_response_id')=v_child.model_response_id
  OR p_evidence->>'review_source_verified'<>'true'
  OR pg_catalog.jsonb_array_length(p_evidence->'verified_paths')
     <>(v_scope->>'file_count')::integer THEN
   RETURN pg_catalog.jsonb_build_object(
    'status','FINAL_LOOP_CHILD_INDEPENDENT_SCOPE_COVERAGE_MISMATCH',
    'independently_verified',false,'original_job_completed',false);
 END IF;
 -- Full, unique, EXACT scope inventory. A model verdict by itself cannot
 -- replace the independent provider patch recheck done by the worker.
 SELECT count(DISTINCT x.value#>>'{}') INTO v_distinct
 FROM pg_catalog.jsonb_array_elements(
  p_evidence->'verified_paths') x(value);
 IF v_distinct<>(v_scope->>'file_count')::integer OR EXISTS(
  SELECT 1 FROM pg_catalog.jsonb_array_elements(
   p_evidence->'verified_paths') x(value)
  WHERE pg_catalog.jsonb_typeof(x.value)<>'string'
   OR NOT EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(
     v_scope->'files') f(value)
     WHERE f.value->>'path'=x.value#>>'{}')) THEN
  RETURN pg_catalog.jsonb_build_object(
   'status','FINAL_LOOP_CHILD_INDEPENDENT_PATHS_MISSING',
   'independently_verified',false,'original_job_completed',false);
 END IF;
 v_review:='sha256:'||pg_catalog.encode(
  pg_catalog.sha256(pg_catalog.convert_to(v_child.review_body,'UTF8')),'hex');
 IF v_review<>p_review_sha256 THEN
  RETURN pg_catalog.jsonb_build_object(
   'status','FINAL_LOOP_CHILD_PREPARED_REVIEW_DIGEST_MISMATCH',
   'independently_verified',false,'original_job_completed',false); END IF;
 v_receipt:='sha256:'||pg_catalog.encode(
  pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.jsonb_build_object(
    'child_work_id',v_child.child_work_id,
    'parent_original_work_id',v_child.parent_original_work_id,
    'review_sha256',v_child.review_sha256,
    'source_manifest_sha256',v_child.source_manifest_sha256,
    'independent_verifier_run_id',p_verifier_run_id,
    'provider_evidence_sha256',p_evidence->>'provider_evidence_sha256',
    'verifier_verdict_sha256',p_evidence->>'verifier_verdict_sha256'
  )::text,'UTF8')),'hex');
 UPDATE reality_internal.final_loop_child_review_work_v1 SET
  phase='INDEPENDENTLY_VERIFIED',
  independent_verifier_run_id=p_verifier_run_id,
  independent_provider_evidence_sha256=
   p_evidence->>'provider_evidence_sha256',
  independent_review_receipt_sha256=v_receipt,
  verifier_evidence=p_evidence,
  verified_at=pg_catalog.clock_timestamp(),
  updated_at=pg_catalog.clock_timestamp()
 WHERE child_work_id=v_child.child_work_id AND phase='PREPARED';
 RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_CHILD_REVIEW_INDEPENDENTLY_VERIFIED_PARENT_OPEN',
  'child_work_id',v_child.child_work_id,
  'parent_original_work_id',v_child.parent_original_work_id,
  'independent_receipt_sha256',v_receipt,
  'independently_verified',true,'parent_obligation_remains_open',true,
  'original_job_completed',false,'production_changed',false);
END $fn$;

-- The single Final Loop policy consumes this readback. Even all independently
-- checked child reviews remain "Present" until cross-scope verification and
-- the parent's actual final acceptance + Universe return have separate proof.
CREATE OR REPLACE FUNCTION public.reality_read_final_loop_child_recovery_v1(
 p_shift_id uuid,p_plan_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE v_plan record;v_packet record;v_children jsonb;v_count integer;
 v_capacity boolean:=false;v_run_count integer:=0;
 v_capacity_receipt text;
 v_integration_count integer:=0;v_integration_verified integer:=0;
 v_integration_receipt text;
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
    WHEN c.phase='EFFECT_UNCERTAIN' THEN 'EFFECT_UNCERTAIN'
    ELSE 'ADMITTED' END,
   'child_original_work_id',c.child_work_id,
   'independently_verified',c.phase='INDEPENDENTLY_VERIFIED',
   'verifier_independent',c.phase='INDEPENDENTLY_VERIFIED'
    AND c.independent_verifier_run_id<>c.claimant_worker_run_id,
   'independent_receipt_sha256',c.independent_review_receipt_sha256
  ) ORDER BY c.scope_index),'[]'::jsonb)
 INTO v_count,v_children FROM reality_internal.final_loop_child_review_work_v1 c
 WHERE c.plan_id=v_plan.plan_id AND c.packet_id=v_packet.packet_id
  AND c.owner_id=v_plan.owner_id AND c.shift_id=v_plan.shift_id
  AND c.parent_original_work_id=v_plan.parent_original_work_id
  AND c.source_manifest_sha256=v_plan.source_manifest_sha256;
 IF v_count<>v_plan.proposed_scope_count THEN
  RETURN pg_catalog.jsonb_build_object(
   'status','FINAL_LOOP_CHILDREN_NOT_ATOMICALLY_ADMITTED',
   'independent_service_readback_verified',false);END IF;
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
   'scheduled_worker_observed',v_capacity,
   'receipt_sha256',v_capacity_receipt),
  'provider_effect_uncertain',EXISTS(SELECT 1 FROM
   reality_internal.final_loop_child_review_work_v1 c
   WHERE c.plan_id=v_plan.plan_id AND c.phase='EFFECT_UNCERTAIN'),
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
END $fn$;

REVOKE ALL ON FUNCTION
 public.reality_prepare_final_loop_child_approval_v1(uuid,text,uuid),
 public.reality_owner_approve_final_loop_child_v1(uuid,uuid,text,text,uuid),
 public.reality_claim_final_loop_child_review_v1(uuid,uuid),
 public.reality_read_final_loop_child_model_scope_v1(text,uuid,uuid),
 public.reality_prepare_final_loop_child_review_v1(text,uuid,uuid,text,text,text),
 public.reality_read_final_loop_child_verify_v1(uuid,uuid),
 public.reality_record_final_loop_child_verified_v1(text,uuid,text,text,text,jsonb),
 public.reality_read_final_loop_child_recovery_v1(uuid,uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION
 public.reality_prepare_final_loop_child_approval_v1(uuid,text,uuid),
 public.reality_owner_approve_final_loop_child_v1(uuid,uuid,text,text,uuid),
 public.reality_claim_final_loop_child_review_v1(uuid,uuid),
 public.reality_read_final_loop_child_model_scope_v1(text,uuid,uuid),
 public.reality_prepare_final_loop_child_review_v1(text,uuid,uuid,text,text,text),
 public.reality_read_final_loop_child_verify_v1(uuid,uuid),
 public.reality_record_final_loop_child_verified_v1(text,uuid,text,text,text,jsonb),
 public.reality_read_final_loop_child_recovery_v1(uuid,uuid)
 TO service_role;


-- The existing signed worker reads Reality's actual verified owner-goal
-- acceptance. Never infer acceptance from GitHub source or shift warrant.
CREATE OR REPLACE FUNCTION public.reality_read_final_loop_child_approval_preflight_v1(
 p_shift_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE v_shift record;v_plans jsonb;
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'FINAL_LOOP_CHILD_PREFLIGHT_SERVICE_ONLY';END IF;
 SELECT s.shift_id,s.owner_id,s.plan_fingerprint INTO v_shift FROM
 reality_internal.governed_employee_shifts_v1 s
 JOIN reality_internal.governed_employee_completion_warrants_v1 w
  ON w.shift_id=s.shift_id AND w.owner_id=s.owner_id
  AND w.plan_fingerprint=s.plan_fingerprint
 WHERE s.shift_id=p_shift_id AND s.closed_at IS NULL
  AND s.planned_end_at='infinity'::timestamptz
  AND s.authorized_at IS NOT NULL AND w.state='ACTIVE';
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_CHILD_PREFLIGHT_NO_CURRENT_SIGNED_SHIFT',
  'owner_acceptance_verified',false,'execution_authorized',false); END IF;
 SELECT coalesce(pg_catalog.jsonb_agg(
  pg_catalog.jsonb_build_object(
   'plan_id',p.plan_id,'source_ref',p.source_ref,
   'parent_original_work_id',p.parent_original_work_id,
   'source_manifest_sha256',p.source_manifest_sha256,
   'acceptance_contract_sha256',
    u.acceptance_hash,
   'verified_signed_source_goal_contract_prepared',
    u.acceptance_hash IS NOT NULL,
   'owner_goal_acceptance_pending',u.acceptance_hash IS NOT NULL AND NOT proof.accepted,
   'independent_goal_acceptance_verified',proof.accepted,
   'owner_approval_claim_window_current',proof.current_window,
   'owner_approval_expired',proof.accepted AND NOT proof.current_window,
   'pending_exact_owner_approval',u.acceptance_hash IS NOT NULL AND NOT EXISTS(
    SELECT 1 FROM reality_internal.final_loop_child_approval_packets_v1 a
    WHERE a.plan_id=p.plan_id AND
     a.acceptance_contract_sha256=u.acceptance_hash),
   'child_review_automatically_authorized',false
  ) ORDER BY p.staged_at),'[]'::jsonb) INTO v_plans
 FROM reality_internal.final_loop_pr_source_plans_v1 p
 CROSS JOIN LATERAL (
  SELECT reality_internal.final_loop_pr_review_acceptance_digest_v1(p.plan_id)
   AS acceptance_hash
 ) u
 CROSS JOIN LATERAL (
  SELECT count(e.event_id)=1 AS accepted,
   -- Compatibility field: current means exact accepted scope on an active
   -- signed shift, not time elapsed since the owner accepted the goal.
   count(e.event_id)=1 AND coalesce(bool_and(a.approved_at IS NOT NULL
    AND a.approved_at<=pg_catalog.clock_timestamp()
    AND a.owner_approval_request_id IS NOT NULL),false) AS current_window
  FROM reality_internal.final_loop_child_approval_packets_v1 a
  JOIN public.universe_events e ON e.continuity_root_id=p.shift_id AND e.worldline_id=p.plan_id AND e.entity_id=p.plan_id
  WHERE a.plan_id=p.plan_id AND a.shift_id=p.shift_id AND a.owner_id=p.owner_id
   AND a.source_manifest_sha256=p.source_manifest_sha256 AND a.parent_original_work_id=p.parent_original_work_id AND a.source_ref=p.source_ref
   AND a.acceptance_contract_sha256=u.acceptance_hash
   AND a.state IN ('APPROVED_ONCE','EFFECT_RESERVED_RECONCILE_ONLY')
   AND a.authority_effect='READ_ONLY_INTERNAL_PR_REVIEW'
   AND e.entity_type='reality_final_loop_owner_accepted_goal_v1'
   AND e.epistemic_status='VERIFIED' AND e.event_kind='WORK'
   AND e.payload->>'owner_approval_receipt_sha256'=a.owner_approval_receipt_sha256
   AND e.payload->>'owner_approval_request_id'=a.owner_approval_request_id::text
   AND e.payload->>'acceptance_contract_sha256'=a.acceptance_contract_sha256
   AND e.payload->>'goal_accepted'='true'
   AND e.payload->>'original_job_completed'='false'
   AND e.payload->>'production_changed'='false'
   AND e.payload->>'source_head_sha'=p.source_head_sha
   AND e.payload->>'source_manifest_sha256'=p.source_manifest_sha256
   AND e.payload->>'owner_id'=p.owner_id::text
   AND e.payload->>'shift_id'=p.shift_id::text
   AND e.payload->>'original_work_id'=p.parent_original_work_id
   AND e.payload->>'source_ref'=p.source_ref
   AND e.content_hash=pg_catalog.encode(extensions.digest(pg_catalog.convert_to(public.reality_continuity_canonical_json_v1(e.payload),'UTF8'),'sha256'),'hex')
 ) proof
 WHERE p.shift_id=p_shift_id AND p.owner_id=v_shift.owner_id
  AND p.parent_original_work_id IS NOT NULL;
 RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_CHILD_GOAL_ACCEPTANCE_PREFLIGHT_READ_ONLY',
  'owner_id',v_shift.owner_id,'shift_id',v_shift.shift_id,
  'plan_fingerprint',v_shift.plan_fingerprint,
  'plans',v_plans,'read_only',true,
  'execution_authorized',false,'original_job_completed',false);
END $fn$;

-- Exact owner-facing packet readback; requires authenticated app session
-- before the service proxy is allowed to call it.
CREATE OR REPLACE FUNCTION public.reality_read_owner_final_loop_child_approvals_v1(
 p_owner_id uuid,p_shift_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE v_plans jsonb;
BEGIN
 IF current_user<>'service_role' OR p_owner_id IS NULL
  OR p_shift_id IS NULL THEN
  RAISE EXCEPTION 'FINAL_LOOP_CHILD_OWNER_READBACK_SERVICE_ONLY'; END IF;
 SELECT coalesce(pg_catalog.jsonb_agg(
  pg_catalog.jsonb_build_object(
   'packet_id',a.packet_id,'source_ref',a.source_ref,
   'source_manifest_sha256',a.source_manifest_sha256,
   'parent_original_work_id',a.parent_original_work_id,
   'approval_fingerprint',a.proposal_fingerprint,
   'acceptance_contract_sha256',a.acceptance_contract_sha256,
   'effect_type',a.authority_effect,
   'file_count',p.file_count,
   'proposed_scope_count',p.proposed_scope_count,
   'state',a.state,
   'approved',a.state<>'AWAITING_EXACT_OWNER_APPROVAL',
   'original_job_completed',false
  ) ORDER BY a.created_at),'[]'::jsonb) INTO v_plans
 FROM reality_internal.final_loop_child_approval_packets_v1 a
 JOIN reality_internal.final_loop_pr_source_plans_v1 p
  ON p.plan_id=a.plan_id AND p.shift_id=a.shift_id
  AND p.owner_id=a.owner_id
 JOIN reality_internal.governed_employee_shifts_v1 s
  ON s.shift_id=a.shift_id AND s.owner_id=a.owner_id
 WHERE a.owner_id=p_owner_id AND a.shift_id=p_shift_id
  AND s.closed_at IS NULL;
 RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_OWNER_EXACT_CHILD_APPROVALS_READ_ONLY',
  'owner_id',p_owner_id,'shift_id',p_shift_id,
  'packets',v_plans,'read_only',true,
  'execution_authorized',false,'original_job_completed',false);
END $fn$;
REVOKE ALL ON FUNCTION
 public.reality_read_final_loop_child_approval_preflight_v1(uuid),
 public.reality_read_owner_final_loop_child_approvals_v1(uuid,uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION
 public.reality_read_final_loop_child_approval_preflight_v1(uuid),
 public.reality_read_owner_final_loop_child_approvals_v1(uuid,uuid)
 TO service_role;


-- Governed no-provider-effect recovery for a previously claimed READ-ONLY
-- child whose model result was never durably prepared. At most one re-entry.
-- PREPARED, verified, published, or uncertain effects cannot use this path.
ALTER TABLE reality_internal.final_loop_child_review_work_v1
 ADD COLUMN IF NOT EXISTS premodel_recovery_count smallint NOT NULL DEFAULT 0
 CHECK(premodel_recovery_count BETWEEN 0 AND 1);
CREATE OR REPLACE FUNCTION
 public.reality_reconcile_final_loop_child_premodel_v1(
 p_shift_id uuid,p_worker_run_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE v_child record;
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'FINAL_LOOP_CHILD_RECOVERY_SERVICE_ONLY';END IF;
 IF p_shift_id IS NULL OR p_worker_run_id IS NULL OR
  NOT EXISTS(SELECT 1 FROM reality_internal.signed_worker_actual_runs_v1 r
   WHERE r.run_id=p_worker_run_id AND r.status='STARTED'
    AND r.finished_at IS NULL AND
    r.started_at>=pg_catalog.clock_timestamp()-interval '10 minutes')
 THEN RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_RECOVERY_SIGNED_WORKER_REQUIRED',
  'recovered',false,'original_job_completed',false);END IF;
 SELECT c.* INTO v_child FROM
  reality_internal.final_loop_child_review_work_v1 c
 JOIN reality_internal.final_loop_child_approval_packets_v1 p
  ON p.packet_id=c.packet_id
 JOIN reality_internal.signed_worker_actual_runs_v1 prior
  ON prior.run_id=c.claimant_worker_run_id
 WHERE c.shift_id=p_shift_id AND c.phase='CLAIMED'
  AND c.premodel_recovery_count=0
  AND c.model_response_id IS NULL AND c.review_body IS NULL
  AND c.review_sha256 IS NULL
  AND c.independent_verifier_run_id IS NULL
  AND c.independent_review_receipt_sha256 IS NULL
  AND c.claimant_worker_run_id<>p_worker_run_id
  AND c.claimed_at<pg_catalog.clock_timestamp()-interval '90 seconds'
  AND prior.finished_at IS NOT NULL
  AND p.state='EFFECT_RESERVED_RECONCILE_ONLY'
  AND EXISTS(SELECT 1 FROM reality_internal.riley_pr_review_originals_v1 r
   WHERE r.original_work_id=c.parent_original_work_id
    AND r.owner_id=c.owner_id AND r.shift_id=c.shift_id
    AND r.phase='BLOCKED' AND r.provider_comment_id IS NULL
    AND r.settlement_receipt_id IS NULL)
 ORDER BY c.claimed_at,c.scope_index LIMIT 1 FOR UPDATE OF c SKIP LOCKED;
 IF NOT FOUND THEN
  RETURN pg_catalog.jsonb_build_object(
   'status','FINAL_LOOP_NO_SAFE_PREMODEL_CHILD_RECOVERY_READY',
   'recovered',false,'original_job_completed',false);END IF;
 UPDATE reality_internal.final_loop_child_review_work_v1
 SET phase='ADMITTED',premodel_recovery_count=1,
  claim_id=pg_catalog.gen_random_uuid(),
  claimant_worker_run_id=NULL,claimed_at=NULL,
  updated_at=pg_catalog.clock_timestamp()
 WHERE child_work_id=v_child.child_work_id AND phase='CLAIMED'
  AND premodel_recovery_count=0;
 RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_SAME_CHILD_PREMODEL_RECOVERY_DURABLY_QUALIFIED',
  'child_work_id',v_child.child_work_id,
  'parent_original_work_id',v_child.parent_original_work_id,
  'previous_claim_id',v_child.claim_id,
  'recovery_count',1,'recovered',true,
  'same_child_original_preserved',true,
  'owner_approval_reused_only_within_exact_scope',true,
  'provider_effect_replay_authorized',false,
  'original_job_completed',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION
 public.reality_reconcile_final_loop_child_premodel_v1(uuid,uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION
 public.reality_reconcile_final_loop_child_premodel_v1(uuid,uuid)
 TO service_role;
