-- DEVELOPMENT / ROLLBACK-ONLY smoke test, never commit effects.
-- Run after the three Final Loop migrations inside BEGIN ... ROLLBACK.
-- Synthetic consent below is explicitly confined to this transaction.
SET LOCAL ROLE service_role;
DO $smoke$
DECLARE p record;plan_id uuid;run_id uuid;contract text;
 packet jsonb;pending jsonb;approved jsonb;claim jsonb;continuity jsonb;
BEGIN
 SELECT s.shift_id,s.owner_id,s.plan_fingerprint,r.original_work_id,
  r.source_ref,r.source_proof_sha256 INTO p
 FROM reality_internal.riley_pr_review_originals_v1 r
 JOIN reality_internal.governed_employee_shifts_v1 s
  ON s.shift_id=r.shift_id AND s.owner_id=r.owner_id
 WHERE r.source_ref='https://github.com/maloney2323/Reality/pull/307'
  AND r.phase='BLOCKED' AND s.closed_at IS NULL
  AND s.authorized_at IS NOT NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'NO_SIGNED_BLOCKED_PARENT';END IF;
 run_id:=gen_random_uuid();
 INSERT INTO reality_internal.signed_worker_actual_runs_v1
 (run_id,started_at,status,worker_stage)
 VALUES(run_id,clock_timestamp(),'STARTED','FINAL_LOOP_TEST_V1');
 INSERT INTO reality_internal.final_loop_pr_source_plans_v1
 (shift_id,owner_id,plan_fingerprint,source_ref,source_proof_sha256,
 parent_original_work_id,parent_source_phase,source_head_sha,source_base_sha,
 source_manifest_sha256,database_plan_digest_sha256,file_count,
 proposed_scope_count,source_plan,staging_worker_run_id)
 VALUES(p.shift_id,p.owner_id,p.plan_fingerprint,p.source_ref,
  p.source_proof_sha256,p.original_work_id,'BLOCKED',
  repeat('f',40),repeat('e',40),'sha256:'||repeat('d',64),
  'sha256:'||repeat('a',64),9,2,
  jsonb_build_object('bounded_scopes',jsonb_build_array(
   jsonb_build_object('index',0,
    'proposed_scope_sha256','sha256:'||repeat('1',64),
    'files',jsonb_build_array(jsonb_build_object('path','src/a.js'))),
   jsonb_build_object('index',1,
    'proposed_scope_sha256','sha256:'||repeat('2',64),
    'files',jsonb_build_array(jsonb_build_object('path','src/b.js')))
  )),run_id) RETURNING final_loop_pr_source_plans_v1.plan_id INTO plan_id;
 contract:=reality_internal.final_loop_pr_review_acceptance_digest_v1(plan_id);
 IF contract !~ '^sha256:[a-f0-9]{64}$' THEN
  RAISE EXCEPTION 'GOAL_CONTRACT_NOT_DERIVED_FROM_SIGNED_ORIGINAL';END IF;
 pending:=public.reality_read_final_loop_child_approval_preflight_v1(p.shift_id);
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(pending->'plans') item
  WHERE item->>'plan_id'=plan_id::text
   AND item->>'acceptance_contract_sha256'=contract
   AND item->>'verified_signed_source_goal_contract_prepared'='true'
   AND item->>'independent_goal_acceptance_verified'='false'
   AND item->>'pending_exact_owner_approval'='true')
 THEN RAISE EXCEPTION 'OWNER_GOAL_PROPOSAL_UNAVAILABLE: %',pending;END IF;
 packet:=public.reality_prepare_final_loop_child_approval_v1(plan_id,contract,run_id);
 IF packet->>'status'<>'FINAL_LOOP_CHILD_EXACT_OWNER_APPROVAL_REQUIRED'
 THEN RAISE EXCEPTION 'OWNER_PACKET_CREATION_FAILED: %',packet;END IF;
 claim:=public.reality_claim_final_loop_child_review_v1(p.shift_id,run_id);
 IF claim->>'child_claimed'='true' THEN
  RAISE EXCEPTION 'CHILD_EXECUTED_WITHOUT_OWNER_CONSENT';END IF;
 -- Simulation only; this owner ID is NEVER submitted to production.
 approved:=public.reality_owner_approve_final_loop_child_v1(
  p.owner_id,(packet->>'packet_id')::uuid,
  packet->>'proposal_fingerprint',
  packet->>'source_manifest_sha256',gen_random_uuid());
 IF approved->>'status'<>'FINAL_LOOP_EXACT_CHILD_REVIEW_OWNER_APPROVED_ONCE'
 THEN RAISE EXCEPTION 'SIMULATED_APPROVAL_FAILED: %',approved;END IF;
 claim:=public.reality_claim_final_loop_child_review_v1(p.shift_id,run_id);
 IF claim->>'status'<>'FINAL_LOOP_EXACT_SIGNED_CHILD_CLAIMED_ONCE'
  OR claim->>'parent_original_work_id'<>p.original_work_id
  OR claim->>'original_job_completed'<>'false'
 THEN RAISE EXCEPTION 'ATOMIC_CHILD_CLAIM_FAILED: %',claim;END IF;
 continuity:=public.reality_read_final_loop_child_recovery_v1(p.shift_id,plan_id);
 IF continuity->>'status'<>
   'FINAL_LOOP_CANONICAL_CHILD_RECOVERY_PROOF_NOT_PARENT_SETTLEMENT'
  OR continuity->>'original_job_completed'<>'false'
  OR continuity->>'universe_reconciled'<>'false'
 THEN RAISE EXCEPTION 'PARENT_RETURN_OR_OPEN_STATE_INVALID: %',continuity;END IF;
END $smoke$;
SELECT 'SIGNED_GOAL_PROPOSAL_OWNER_CONSENT_CHILD_CLAIM_PARENT_OPEN' AS result;
