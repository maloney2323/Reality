-- Final Loop parent/child cross-scope integration proof.
-- Adds bounded independent review batches to the EXISTING controller/worker.
-- Never treats child drafts as an externally delivered parent outcome.
-- Do not install on shared/live DB before isolated acceptance.

CREATE TABLE IF NOT EXISTS reality_internal.final_loop_parent_integration_batches_v1 (
 batch_id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
 plan_id uuid NOT NULL REFERENCES reality_internal.final_loop_pr_source_plans_v1(plan_id),
 packet_id uuid NOT NULL REFERENCES reality_internal.final_loop_child_approval_packets_v1(packet_id),
 owner_id uuid NOT NULL,
 shift_id uuid NOT NULL,
 parent_original_work_id text NOT NULL CHECK(parent_original_work_id ~ '^work:[a-f0-9]{32}$'),
 source_manifest_sha256 text NOT NULL CHECK(source_manifest_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 source_head_sha text NOT NULL CHECK(source_head_sha ~ '^[a-f0-9]{40}$'),
 acceptance_contract_sha256 text NOT NULL CHECK(acceptance_contract_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 batch_index integer NOT NULL CHECK(batch_index BETWEEN 0 AND 12),
 first_scope_index integer NOT NULL CHECK(first_scope_index BETWEEN 0 AND 62),
 last_scope_index integer NOT NULL CHECK(last_scope_index BETWEEN 0 AND 62 AND last_scope_index>=first_scope_index),
 phase text NOT NULL DEFAULT 'READY' CHECK(phase IN ('READY','CLAIMED','VERIFIED','EFFECT_UNCERTAIN')),
 claim_id uuid NOT NULL DEFAULT pg_catalog.gen_random_uuid(),
 verifier_worker_run_id uuid,
 claim_started_at timestamptz,
 verified_child_receipts_sha256 text,
 evidence jsonb,
 cross_scope_receipt_sha256 text CHECK (
  cross_scope_receipt_sha256 IS NULL OR cross_scope_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 verified_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
 UNIQUE(plan_id,batch_index),UNIQUE(packet_id,first_scope_index)
);
ALTER TABLE reality_internal.final_loop_parent_integration_batches_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON reality_internal.final_loop_parent_integration_batches_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON reality_internal.final_loop_parent_integration_batches_v1 TO service_role;

-- Transactionally admit ALL bounded integration batches, then claim exactly
-- one under an actually started worker that did not generate or verify ANY
-- child in this exact page. No automatic retry of an uncertain batch.
CREATE OR REPLACE FUNCTION public.reality_claim_final_loop_parent_integration_v1(
 p_shift_id uuid,p_worker_run_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE v_packet record;v_plan record;v_batch record;
 v_expected integer;v_count integer;v_i integer;v_reviews jsonb;
 v_children_sha text;
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'FINAL_LOOP_INTEGRATION_CLAIM_SERVICE_ONLY'; END IF;
 IF p_shift_id IS NULL OR p_worker_run_id IS NULL OR
  NOT EXISTS(SELECT 1 FROM reality_internal.signed_worker_actual_runs_v1 r
   WHERE r.run_id=p_worker_run_id AND r.status='STARTED'
    AND r.finished_at IS NULL
    AND r.started_at>=pg_catalog.clock_timestamp()-interval '10 minutes')
 THEN RETURN pg_catalog.jsonb_build_object('status','FINAL_LOOP_INTEGRATION_SIGNED_RUN_REQUIRED',
  'integration_claimed',false,'parent_original_completed',false);END IF;
 SELECT a.* INTO v_packet FROM
 reality_internal.final_loop_child_approval_packets_v1 a
 JOIN reality_internal.governed_employee_shifts_v1 s
  ON s.shift_id=a.shift_id AND s.owner_id=a.owner_id
 JOIN reality_internal.governed_employee_completion_warrants_v1 w
  ON w.shift_id=s.shift_id AND w.owner_id=s.owner_id
  AND w.plan_fingerprint=s.plan_fingerprint
 WHERE a.shift_id=p_shift_id
  AND a.state='EFFECT_RESERVED_RECONCILE_ONLY'
  AND a.owner_approval_receipt_sha256 IS NOT NULL
  AND s.closed_at IS NULL AND s.authorized_at IS NOT NULL
  AND s.planned_end_at='infinity'::timestamptz
  AND s.status IN ('RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
  AND w.state='ACTIVE' AND w.mode='UNTIL_ALL_INDEPENDENT_FINAL_RECEIPTS'
  AND EXISTS(SELECT 1 FROM reality_internal.riley_pr_review_originals_v1 r
   WHERE r.original_work_id=a.parent_original_work_id
    AND r.shift_id=a.shift_id AND r.owner_id=a.owner_id
    AND r.phase='BLOCKED' AND r.provider_comment_id IS NULL
    AND r.settlement_receipt_id IS NULL)
  AND EXISTS(SELECT 1 FROM public.universe_events e
   WHERE e.epistemic_status='VERIFIED'
    AND e.payload->>'principal_id'=a.owner_id::text
    AND e.payload->>'original_work_id'=a.parent_original_work_id
    AND e.payload->>'acceptance_contract_sha256'=a.acceptance_contract_sha256
    AND (e.payload->>'source_ref'=a.source_ref OR
         e.provenance->>'source_ref'=a.source_ref))
 ORDER BY a.approved_at,a.packet_id LIMIT 1
 FOR UPDATE OF a SKIP LOCKED;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_NO_OWNER_ACCEPTED_PARENT_INTEGRATION_READY',
  'integration_claimed',false,'parent_original_completed',false);END IF;
 SELECT * INTO v_plan FROM reality_internal.final_loop_pr_source_plans_v1 p
 WHERE p.plan_id=v_packet.plan_id
  AND p.owner_id=v_packet.owner_id AND p.shift_id=v_packet.shift_id
  AND p.parent_original_work_id=v_packet.parent_original_work_id
  AND p.source_manifest_sha256=v_packet.source_manifest_sha256;
 IF NOT FOUND THEN
  RETURN pg_catalog.jsonb_build_object(
   'status','FINAL_LOOP_INTEGRATION_PARENT_PLAN_DRIFT',
   'integration_claimed',false,'parent_original_completed',false);END IF;
 v_expected:=v_plan.proposed_scope_count;
 SELECT pg_catalog.count(*) INTO v_count
 FROM reality_internal.final_loop_child_review_work_v1 c
 WHERE c.plan_id=v_plan.plan_id AND c.packet_id=v_packet.packet_id
  AND c.phase='INDEPENDENTLY_VERIFIED'
  AND c.independent_verifier_run_id<>c.claimant_worker_run_id
  AND c.independent_review_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'
  AND c.source_head_sha=v_plan.source_head_sha
  AND c.source_manifest_sha256=v_plan.source_manifest_sha256
  AND c.acceptance_contract_sha256=v_packet.acceptance_contract_sha256;
 IF v_count<>v_expected OR EXISTS(
  SELECT 1 FROM reality_internal.final_loop_child_review_work_v1 c
  WHERE c.plan_id=v_plan.plan_id AND c.phase<>'INDEPENDENTLY_VERIFIED') THEN
  RETURN pg_catalog.jsonb_build_object(
   'status','FINAL_LOOP_INTEGRATION_ALL_CHILD_RECEIPTS_REQUIRED',
   'independently_verified_children',v_count,
   'expected_children',v_expected,'integration_claimed',false,
   'parent_original_completed',false);END IF;
 FOR v_i IN 0..((v_expected-1)/6) LOOP
  INSERT INTO reality_internal.final_loop_parent_integration_batches_v1
    (plan_id,packet_id,owner_id,shift_id,parent_original_work_id,
     source_manifest_sha256,source_head_sha,acceptance_contract_sha256,
     batch_index,first_scope_index,last_scope_index)
  VALUES(v_plan.plan_id,v_packet.packet_id,v_packet.owner_id,
   v_packet.shift_id,v_packet.parent_original_work_id,
   v_plan.source_manifest_sha256,v_plan.source_head_sha,
   v_packet.acceptance_contract_sha256,v_i,v_i*6,
   pg_catalog.least(v_expected-1,(v_i*6)+5))
  ON CONFLICT DO NOTHING;
 END LOOP;
 SELECT i.* INTO v_batch FROM reality_internal.final_loop_parent_integration_batches_v1 i
 WHERE i.plan_id=v_plan.plan_id AND i.packet_id=v_packet.packet_id
  AND i.phase='READY'
  AND NOT EXISTS(SELECT 1 FROM reality_internal.final_loop_child_review_work_v1 c
   WHERE c.plan_id=i.plan_id
    AND c.scope_index BETWEEN i.first_scope_index AND i.last_scope_index
    AND (c.claimant_worker_run_id=p_worker_run_id
     OR c.independent_verifier_run_id=p_worker_run_id))
 ORDER BY i.batch_index LIMIT 1 FOR UPDATE OF i SKIP LOCKED;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_INTEGRATION_BATCHES_ALREADY_CLAIMED_OR_VERIFIED',
  'integration_claimed',false,'parent_original_completed',false);END IF;
 SELECT 'sha256:'||pg_catalog.encode(pg_catalog.sha256(
   pg_catalog.convert_to(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'index',c.scope_index,'child_work_id',c.child_work_id,
    'review_sha256',c.review_sha256,
    'independent_receipt_sha256',c.independent_review_receipt_sha256
   ) ORDER BY c.scope_index)::text,'UTF8')),'hex')
 INTO v_children_sha
 FROM reality_internal.final_loop_child_review_work_v1 c
 WHERE c.plan_id=v_batch.plan_id
  AND c.scope_index BETWEEN v_batch.first_scope_index AND v_batch.last_scope_index;
 UPDATE reality_internal.final_loop_parent_integration_batches_v1
 SET phase='CLAIMED',verifier_worker_run_id=p_worker_run_id,
  claim_id=pg_catalog.gen_random_uuid(),
  claim_started_at=pg_catalog.clock_timestamp(),
  verified_child_receipts_sha256=v_children_sha,
  updated_at=pg_catalog.clock_timestamp()
 WHERE batch_id=v_batch.batch_id AND phase='READY'
 RETURNING * INTO v_batch;
 SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'index',c.scope_index,'child_work_id',c.child_work_id,
  'review_excerpt',pg_catalog.left(c.review_body,1300),
  'review_sha256',c.review_sha256,
  'independent_receipt_sha256',c.independent_review_receipt_sha256,
  'scope_sha256',c.scope_sha256,
  'files',v_plan.source_plan->'bounded_scopes'->c.scope_index->'files'
 ) ORDER BY c.scope_index) INTO v_reviews
 FROM reality_internal.final_loop_child_review_work_v1 c
 WHERE c.plan_id=v_batch.plan_id
  AND c.scope_index BETWEEN v_batch.first_scope_index AND v_batch.last_scope_index;
 RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_PARENT_INTEGRATION_EXACT_BATCH_CLAIMED',
  'batch_id',v_batch.batch_id,'claim_id',v_batch.claim_id,
  'owner_id',v_batch.owner_id,'shift_id',v_batch.shift_id,
  'worker_run_id',p_worker_run_id,'plan_id',v_batch.plan_id,
  'parent_original_work_id',v_batch.parent_original_work_id,
  'source_ref',v_plan.source_ref,'source_proof_sha256',v_plan.source_proof_sha256,
  'source_head_sha',v_batch.source_head_sha,
  'source_base_sha',v_plan.source_base_sha,
  'source_manifest_sha256',v_batch.source_manifest_sha256,
  'acceptance_contract_sha256',v_batch.acceptance_contract_sha256,
  'batch_index',v_batch.batch_index,
  'first_scope_index',v_batch.first_scope_index,
  'last_scope_index',v_batch.last_scope_index,
  'verified_child_receipts_sha256',v_children_sha,
  'reviews',v_reviews,'integration_claimed',true,
  'model_called',false,'parent_original_completed',false,
  'external_effect_performed',false,'production_changed',false);
END $fn$;

-- Independently re-read the complete source manifest, PR head and actual
-- full patch snippets before model review. A model verdict alone is NOT
-- independent evidence. Exact frozen children must still be verified at the
-- instant this receipt is recorded.
CREATE OR REPLACE FUNCTION public.reality_record_final_loop_parent_integration_v1(
 p_batch_id uuid,p_claim_id uuid,p_worker_run_id uuid,p_evidence jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE v_batch record;v_plan record;v_packet record;
 v_children_sha text;v_receipt text;v_count integer;v_valid integer;
 v_readback jsonb;
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'FINAL_LOOP_INTEGRATION_VERIFY_SERVICE_ONLY';END IF;
 IF p_batch_id IS NULL OR p_claim_id IS NULL OR p_worker_run_id IS NULL OR
  pg_catalog.jsonb_typeof(p_evidence)<>'object' OR
  p_evidence->>'schema'<>'reality-final-loop-independent-integration-batch-v1' OR
  p_evidence->>'verdict'<>'PASS' OR
  p_evidence->>'source_manifest_complete'<>'true' OR
  p_evidence->>'independent_provider_readback'<>'true' OR
  p_evidence->>'all_child_receipts_verified'<>'true' OR
  p_evidence->>'read_only'<>'true' OR
  p_evidence->>'production_changed'<>'false' OR
  coalesce(p_evidence->>'provider_full_manifest_digest','')
   !~ '^sha256:[a-f0-9]{64}$' OR
  coalesce(p_evidence->>'integration_verdict_sha256','')
   !~ '^sha256:[a-f0-9]{64}$' OR
  coalesce(p_evidence->>'verifier_model_response_id','')
   !~ '^resp_[A-Za-z0-9_-]{4,160}$'
 THEN RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_INTEGRATION_PROOF_INPUT_INVALID',
  'integration_verified',false,'parent_original_completed',false);END IF;
 SELECT * INTO v_batch
 FROM reality_internal.final_loop_parent_integration_batches_v1 i
 WHERE i.batch_id=p_batch_id AND i.claim_id=p_claim_id
  AND i.verifier_worker_run_id=p_worker_run_id
  AND i.phase='CLAIMED' FOR UPDATE;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM
  reality_internal.signed_worker_actual_runs_v1 r
  WHERE r.run_id=p_worker_run_id AND r.status='STARTED'
   AND r.finished_at IS NULL AND
   r.started_at>=pg_catalog.clock_timestamp()-interval '10 minutes')
 THEN RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_INTEGRATION_SIGNED_CLAIM_EXPIRED',
  'integration_verified',false,'parent_original_completed',false);END IF;
 SELECT * INTO v_plan FROM reality_internal.final_loop_pr_source_plans_v1
 WHERE plan_id=v_batch.plan_id AND owner_id=v_batch.owner_id
  AND shift_id=v_batch.shift_id
  AND parent_original_work_id=v_batch.parent_original_work_id
  AND source_manifest_sha256=v_batch.source_manifest_sha256
  AND source_head_sha=v_batch.source_head_sha;
 SELECT * INTO v_packet FROM
  reality_internal.final_loop_child_approval_packets_v1 a
 WHERE a.packet_id=v_batch.packet_id AND a.plan_id=v_batch.plan_id
  AND a.state='EFFECT_RESERVED_RECONCILE_ONLY'
  AND a.acceptance_contract_sha256=v_batch.acceptance_contract_sha256;
 IF v_plan.plan_id IS NULL OR v_packet.packet_id IS NULL OR
  p_evidence->>'source_manifest_sha256'<>v_batch.source_manifest_sha256 OR
  p_evidence->>'source_head_sha'<>v_batch.source_head_sha OR
  p_evidence->>'batch_id'<>v_batch.batch_id::text OR
  p_evidence->>'parent_original_work_id'<>v_batch.parent_original_work_id OR
  p_evidence->>'worker_run_id'<>p_worker_run_id::text OR
  p_evidence->>'verified_child_receipts_sha256'<>
   v_batch.verified_child_receipts_sha256 OR
  p_evidence->>'provider_full_manifest_digest'<>
   v_batch.source_manifest_sha256 OR
  NOT EXISTS(SELECT 1 FROM reality_internal.riley_pr_review_originals_v1 r
   WHERE r.original_work_id=v_batch.parent_original_work_id
    AND r.owner_id=v_batch.owner_id AND r.shift_id=v_batch.shift_id
    AND r.phase='BLOCKED' AND r.provider_comment_id IS NULL
    AND r.settlement_receipt_id IS NULL)
 THEN RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_INTEGRATION_SOURCE_OR_PARENT_DRIFT',
  'integration_verified',false,'parent_original_completed',false);END IF;
 SELECT pg_catalog.count(*),
  'sha256:'||pg_catalog.encode(pg_catalog.sha256(
   pg_catalog.convert_to(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'index',c.scope_index,'child_work_id',c.child_work_id,
    'review_sha256',c.review_sha256,
    'independent_receipt_sha256',c.independent_review_receipt_sha256
   ) ORDER BY c.scope_index)::text,'UTF8')),'hex')
 INTO v_count,v_children_sha
 FROM reality_internal.final_loop_child_review_work_v1 c
 WHERE c.plan_id=v_batch.plan_id
  AND c.scope_index BETWEEN v_batch.first_scope_index AND v_batch.last_scope_index
  AND c.phase='INDEPENDENTLY_VERIFIED'
  AND c.independent_review_receipt_sha256 IS NOT NULL
  AND c.claimant_worker_run_id<>p_worker_run_id
  AND c.independent_verifier_run_id<>p_worker_run_id;
 IF v_count<>(v_batch.last_scope_index-v_batch.first_scope_index+1) OR
  v_children_sha<>v_batch.verified_child_receipts_sha256
 THEN RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_INTEGRATION_CHILD_RECEIPTS_STALE_OR_NOT_INDEPENDENT',
  'integration_verified',false,'parent_original_completed',false);END IF;
 v_receipt:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to(pg_catalog.jsonb_build_object(
   'plan_id',v_batch.plan_id,'batch_index',v_batch.batch_index,
   'parent_original_work_id',v_batch.parent_original_work_id,
   'source_manifest_sha256',v_batch.source_manifest_sha256,
   'verified_child_receipts_sha256',v_children_sha,
   'verifier_worker_run_id',p_worker_run_id,
   'integration_verdict_sha256',p_evidence->>'integration_verdict_sha256',
   'provider_full_manifest_digest',p_evidence->>'provider_full_manifest_digest'
   )::text,'UTF8')),'hex');
 UPDATE reality_internal.final_loop_parent_integration_batches_v1
 SET phase='VERIFIED',cross_scope_receipt_sha256=v_receipt,
  evidence=p_evidence,verified_at=pg_catalog.clock_timestamp(),
  updated_at=pg_catalog.clock_timestamp()
 WHERE batch_id=p_batch_id AND phase='CLAIMED';
 RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_CROSS_SCOPE_BATCH_INDEPENDENTLY_VERIFIED_PARENT_OPEN',
  'batch_id',p_batch_id,'parent_original_work_id',
   v_batch.parent_original_work_id,
  'receipt_sha256',v_receipt,'integration_verified',true,
  'parent_obligation_remains_open',true,
  'original_job_completed',false,'production_changed',false);
END $fn$;

-- A fresh service-only readback protects model inference against
-- mid-call authority, source-head, child receipt, or lease changes.
CREATE OR REPLACE FUNCTION public.reality_read_final_loop_parent_integration_claim_v1(
 p_batch_id uuid,p_claim_id uuid,p_worker_run_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE v_batch record;v_plan record;v_packet record;v_reviews jsonb;
 v_current text;v_n integer;
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'FINAL_LOOP_PARENT_INTEGRATION_READ_SERVICE_ONLY';END IF;
 SELECT i.* INTO v_batch FROM reality_internal.final_loop_parent_integration_batches_v1 i
 WHERE i.batch_id=p_batch_id AND i.claim_id=p_claim_id
  AND i.verifier_worker_run_id=p_worker_run_id AND i.phase='CLAIMED';
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM
  reality_internal.signed_worker_actual_runs_v1 r
   WHERE r.run_id=p_worker_run_id AND r.status='STARTED'
    AND r.finished_at IS NULL
    AND r.started_at>=pg_catalog.clock_timestamp()-interval '10 minutes')
 THEN RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_PARENT_INTEGRATION_CURRENT_CLAIM_UNVERIFIED',
  'integration_model_authorized',false);END IF;
 SELECT * INTO v_plan FROM reality_internal.final_loop_pr_source_plans_v1 p
 WHERE p.plan_id=v_batch.plan_id AND p.shift_id=v_batch.shift_id
  AND p.owner_id=v_batch.owner_id
  AND p.source_manifest_sha256=v_batch.source_manifest_sha256
  AND p.source_head_sha=v_batch.source_head_sha;
 SELECT * INTO v_packet FROM reality_internal.final_loop_child_approval_packets_v1 a
 WHERE a.packet_id=v_batch.packet_id AND a.plan_id=v_batch.plan_id
  AND a.state='EFFECT_RESERVED_RECONCILE_ONLY'
  AND a.source_manifest_sha256=v_batch.source_manifest_sha256
  AND a.acceptance_contract_sha256=v_batch.acceptance_contract_sha256;
 IF v_plan.plan_id IS NULL OR v_packet.packet_id IS NULL OR
  NOT EXISTS(SELECT 1 FROM reality_internal.riley_pr_review_originals_v1 parent
   WHERE parent.original_work_id=v_batch.parent_original_work_id
    AND parent.shift_id=v_batch.shift_id AND parent.owner_id=v_batch.owner_id
    AND parent.phase='BLOCKED' AND parent.review_body IS NULL
    AND parent.provider_comment_id IS NULL
    AND parent.settlement_receipt_id IS NULL)
 THEN RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_PARENT_INTEGRATION_PARENT_OR_APPROVAL_STALE',
  'integration_model_authorized',false);END IF;
 SELECT pg_catalog.count(*),'sha256:'||pg_catalog.encode(
  pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.jsonb_agg(
   pg_catalog.jsonb_build_object(
    'index',c.scope_index,'child_work_id',c.child_work_id,
    'review_sha256',c.review_sha256,
    'independent_receipt_sha256',c.independent_review_receipt_sha256
   ) ORDER BY c.scope_index)::text,'UTF8')),'hex'),
  pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
   'index',c.scope_index,'child_work_id',c.child_work_id,
   'review_excerpt',pg_catalog.left(c.review_body,1300),
   'review_sha256',c.review_sha256,
   'independent_receipt_sha256',c.independent_review_receipt_sha256,
   'scope_sha256',c.scope_sha256,
   'files',v_plan.source_plan->'bounded_scopes'->c.scope_index->'files'
  ) ORDER BY c.scope_index)
 INTO v_n,v_current,v_reviews
 FROM reality_internal.final_loop_child_review_work_v1 c
 WHERE c.plan_id=v_batch.plan_id
  AND c.scope_index BETWEEN v_batch.first_scope_index AND v_batch.last_scope_index
  AND c.phase='INDEPENDENTLY_VERIFIED'
  AND c.claimant_worker_run_id<>p_worker_run_id
  AND c.independent_verifier_run_id<>p_worker_run_id;
 IF v_n<>(v_batch.last_scope_index-v_batch.first_scope_index+1) OR
  v_current<>v_batch.verified_child_receipts_sha256 THEN
  RETURN pg_catalog.jsonb_build_object(
   'status','FINAL_LOOP_PARENT_INTEGRATION_CHILD_PROOFS_CHANGED',
   'integration_model_authorized',false);END IF;
 RETURN pg_catalog.jsonb_build_object(
  'status','CURRENT_INDEPENDENT_PARENT_INTEGRATION_SCOPE',
  'owner_id',v_batch.owner_id,'shift_id',v_batch.shift_id,
  'batch_id',v_batch.batch_id,'claim_id',v_batch.claim_id,
  'worker_run_id',p_worker_run_id,'plan_id',v_batch.plan_id,
  'parent_original_work_id',v_batch.parent_original_work_id,
  'source_ref',v_plan.source_ref,'source_proof_sha256',v_plan.source_proof_sha256,
  'source_head_sha',v_batch.source_head_sha,
  'source_base_sha',v_plan.source_base_sha,
  'source_manifest_sha256',v_batch.source_manifest_sha256,
  'acceptance_contract_sha256',v_batch.acceptance_contract_sha256,
  'batch_index',v_batch.batch_index,
  'first_scope_index',v_batch.first_scope_index,
  'last_scope_index',v_batch.last_scope_index,
  'verified_child_receipts_sha256',v_current,
  'reviews',v_reviews,'read_only',true,'integration_model_authorized',true,
  'original_job_completed',false,'production_changed',false);
END $fn$;

REVOKE ALL ON FUNCTION
 public.reality_claim_final_loop_parent_integration_v1(uuid,uuid),
 public.reality_record_final_loop_parent_integration_v1(uuid,uuid,uuid,jsonb),
 public.reality_read_final_loop_parent_integration_claim_v1(uuid,uuid,uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION
 public.reality_claim_final_loop_parent_integration_v1(uuid,uuid),
 public.reality_record_final_loop_parent_integration_v1(uuid,uuid,uuid,jsonb),
 public.reality_read_final_loop_parent_integration_claim_v1(uuid,uuid,uuid)
 TO service_role;
