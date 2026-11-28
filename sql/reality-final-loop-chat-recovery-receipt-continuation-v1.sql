CREATE OR REPLACE FUNCTION public.reality_read_owner_final_loop_child_approvals_v1(p_owner_id uuid, p_shift_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
   'recovery_qualification',CASE WHEN a.state='EFFECT_RESERVED_RECONCILE_ONLY'
    AND EXISTS(SELECT 1 FROM reality_internal.final_loop_child_review_work_v1 c
       JOIN reality_internal.signed_worker_actual_runs_v1 r
        ON r.run_id=CASE WHEN c.canonical_verify_invocation_id IS NOT NULL
             THEN c.canonical_verify_invocation_run_id ELSE c.claimant_worker_run_id END
       WHERE c.plan_id=a.plan_id AND c.packet_id=a.packet_id AND c.owner_id=a.owner_id
        AND c.shift_id=a.shift_id AND c.phase<>'INDEPENDENTLY_VERIFIED'
        AND (c.canonical_prepare_invocation_id IS NOT NULL OR c.canonical_verify_invocation_id IS NOT NULL)
        AND r.status IN ('COMPLETED','FAILED') AND r.finished_at IS NOT NULL)
    THEN public.reality_read_final_loop_child_recovery_v1(a.shift_id,a.plan_id)->'recovery_qualification'
    ELSE NULL END,
   'recovery_approval',CASE WHEN a.same_obligation_recovery_approval IS NOT NULL THEN
    pg_catalog.jsonb_build_object('approved',a.same_obligation_recovery_approval->'approved',
     'proposal_sha256',a.same_obligation_recovery_approval->>'proposal_sha256',
     'approval_receipt_sha256',a.same_obligation_recovery_approval->>'approval_receipt_sha256',
     'historical_invocation_replay_authorized',false) ELSE NULL END,
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
END $function$;
REVOKE ALL ON FUNCTION public.reality_read_owner_final_loop_child_approvals_v1(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_read_owner_final_loop_child_approvals_v1(uuid,uuid) TO service_role;
