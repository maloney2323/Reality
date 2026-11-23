-- Reality Final Loop: evidence-only, parent-bound large-PR source plan handoff.
-- Isolated development migration. Do not install in a live/shared shift DB.
-- This is a subrecord of the existing signed shift, not a second orchestrator.
-- Staging never creates an original, child claim, approval or settlement.
CREATE TABLE IF NOT EXISTS reality_internal.final_loop_pr_source_plans_v1 (
 plan_id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
 shift_id uuid NOT NULL,
 owner_id uuid NOT NULL,
 plan_fingerprint text NOT NULL CHECK
  (plan_fingerprint ~ '^sha256:[a-f0-9]{64}$'),
 source_ref text NOT NULL,
 source_proof_sha256 text NOT NULL CHECK
  (source_proof_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 parent_original_work_id text CHECK
  (parent_original_work_id IS NULL OR
   parent_original_work_id ~ '^work:[a-f0-9]{32}$'),
 parent_source_phase text NOT NULL,
 source_head_sha text NOT NULL CHECK(source_head_sha ~ '^[a-f0-9]{40}$'),
 source_base_sha text NOT NULL CHECK(source_base_sha ~ '^[a-f0-9]{40}$'),
 source_manifest_sha256 text NOT NULL CHECK
  (source_manifest_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 database_plan_digest_sha256 text NOT NULL CHECK
  (database_plan_digest_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 file_count integer NOT NULL CHECK(file_count BETWEEN 9 AND 500),
 proposed_scope_count integer NOT NULL CHECK
  (proposed_scope_count BETWEEN 2 AND 63),
 source_plan jsonb NOT NULL,
 staging_worker_run_id uuid NOT NULL,
 state text NOT NULL DEFAULT 'PROPOSED_SOURCE_PLAN_AWAITING_INDEPENDENT_ADMISSION'
  CHECK(state='PROPOSED_SOURCE_PLAN_AWAITING_INDEPENDENT_ADMISSION'),
 staged_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
 UNIQUE(shift_id,source_ref,source_manifest_sha256)
);
ALTER TABLE reality_internal.final_loop_pr_source_plans_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE reality_internal.final_loop_pr_source_plans_v1
 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON TABLE reality_internal.final_loop_pr_source_plans_v1
 TO service_role;

CREATE OR REPLACE FUNCTION
 public.reality_stage_final_loop_pr_source_plan_v1(
 p_shift_id uuid,p_worker_run_id uuid,p_plan jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE
 v_shift record;v_source record;v_parent record;v_run record;
 v_grp jsonb;v_file jsonb;v_scopes integer;v_files integer:=0;
 v_seen text[]:=ARRAY[]::text[];v_group_files integer;
 v_i integer:=0;v_path text;v_kind text;v_sha text;
 v_id uuid;v_digest text;v_state text;
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'FINAL_LOOP_PR_SOURCE_PLAN_SERVICE_ONLY';END IF;
 IF p_shift_id IS NULL OR p_worker_run_id IS NULL OR
  p_plan IS NULL OR pg_catalog.jsonb_typeof(p_plan)<>'object' OR
  p_plan->>'version'<>'reality-large-pr-source-qualification-v1' OR
  p_plan->>'status' NOT IN
   ('FULL_DRAFT_MANIFEST_READ_REVIEW_AUTHORITY_PENDING',
    'FULL_MANIFEST_READ_EXACT_ORIGINAL_ADMISSION_PENDING') OR
  p_plan->>'source_manifest_complete'<>'true' OR
  p_plan->>'read_only'<>'true' OR
  p_plan->>'proposed_only'<>'true' OR
  p_plan->>'native_admission_unchanged'<>'true' OR
  p_plan->>'parent_obligation_remains_open'<>'true' OR
  p_plan->>'worker_claim_consumed'<>'false' OR
  p_plan->>'owner_approval_granted'<>'false' OR
  p_plan->>'independent_review_completed'<>'false' OR
  p_plan->>'cross_scope_review_verified'<>'false' OR
  p_plan->>'patch_coverage_verified'<>'false' OR
  p_plan->>'original_job_completed'<>'false' OR
  p_plan->>'production_changed'<>'false' OR
  p_plan->>'installation_authorized'<>'false' OR
  coalesce(p_plan->>'source_manifest_sha256','') !~
   '^sha256:[a-f0-9]{64}$' OR
  coalesce(p_plan->>'live_base_sha','') !~ '^[a-f0-9]{40}$' OR
  coalesce(p_plan->>'live_head_sha','') !~ '^[a-f0-9]{40}$' OR
  coalesce(p_plan->>'frozen_source_proof_sha256','') !~
   '^sha256:[a-f0-9]{64}$' OR
  pg_catalog.jsonb_typeof(p_plan->'bounded_scopes')<>'array' OR
  coalesce(p_plan->>'manifest_file_count','') !~ '^[0-9]{1,3}$' OR
  coalesce(p_plan->>'bounded_scope_count','') !~ '^[0-9]{1,2}$' THEN
  RETURN jsonb_build_object('status','FINAL_LOOP_SOURCE_PLAN_INPUT_UNVERIFIED',
   'source_plan_staged',false,'child_original_admitted',false,
   'execution_authorized',false,'original_job_completed',false);END IF;
 v_scopes:=(p_plan->>'bounded_scope_count')::integer;
 IF (p_plan->>'manifest_file_count')::integer NOT BETWEEN 9 AND 500 OR
    v_scopes NOT BETWEEN 2 AND 63 OR
    v_scopes<>pg_catalog.jsonb_array_length(p_plan->'bounded_scopes') THEN
  RETURN jsonb_build_object('status','FINAL_LOOP_SOURCE_PLAN_BOUNDS_INVALID',
   'source_plan_staged',false,'child_original_admitted',false,
   'original_job_completed',false); END IF;
 -- Verify the proposed file groups are a complete, nonoverlapping inventory.
 FOR v_grp IN SELECT value FROM pg_catalog.jsonb_array_elements(
    p_plan->'bounded_scopes') item(value) LOOP
  IF pg_catalog.jsonb_typeof(v_grp->'files')<>'array' OR
   coalesce(v_grp->>'index','') !~ '^[0-9]{1,2}$' OR
   (v_grp->>'index')::integer<>v_i OR
   coalesce(v_grp->>'file_count','') !~ '^[1-8]$' OR
   coalesce(v_grp->>'proposed_scope_sha256','') !~
     '^sha256:[a-f0-9]{64}$' OR
   v_grp->>'proposed_only'<>'true' OR
   v_grp->>'native_child_original_admitted'<>'false' OR
   v_grp->>'independent_review_verified'<>'false' OR
   v_grp->>'child_execution_authorized'<>'false' THEN
   RETURN jsonb_build_object('status','FINAL_LOOP_SCOPE_COVERAGE_INVALID',
    'source_plan_staged',false,'original_job_completed',false);END IF;
  v_group_files:=pg_catalog.jsonb_array_length(v_grp->'files');
  IF v_group_files<>(v_grp->>'file_count')::integer OR
   v_group_files<1 OR v_group_files>8 OR
   v_grp->>'source_head_sha'<>p_plan->>'live_head_sha' THEN
   RETURN jsonb_build_object('status','FINAL_LOOP_SCOPE_COVERAGE_INVALID',
    'source_plan_staged',false,'original_job_completed',false);END IF;
  FOR v_file IN SELECT value FROM pg_catalog.jsonb_array_elements(
    v_grp->'files') item(value) LOOP
   v_path:=v_file->>'path';v_kind:=v_file->>'status';
   v_sha:=v_file->>'blob_sha';
   IF v_path IS NULL OR v_path='' OR
     pg_catalog.length(v_path)>350 OR
     v_path !~ '^[A-Za-z0-9._/-]+$' OR
     v_path LIKE '/%' OR
     v_path ~ '(^|/)[.][.]?(/|$)' OR
     v_path=ANY(v_seen) OR
     v_kind NOT IN ('added','modified','removed','renamed','copied','changed') OR
     coalesce(v_sha,'') !~ '^[a-f0-9]{40}$' OR
     v_file->>'patch_proof_verified'<>'false' THEN
    RETURN jsonb_build_object('status','FINAL_LOOP_MANIFEST_FILE_INVALID',
     'source_plan_staged',false,'original_job_completed',false);END IF;
   v_seen:=pg_catalog.array_append(v_seen,v_path);
   v_files:=v_files+1;
  END LOOP;
  v_i:=v_i+1;
 END LOOP;
 IF v_files<>(p_plan->>'manifest_file_count')::integer OR
  v_i<>v_scopes THEN
  RETURN jsonb_build_object('status','FINAL_LOOP_FULL_MANIFEST_MISSING',
   'source_plan_staged',false,'original_job_completed',false);END IF;
 -- The SIGNED original shift/warrant and worker, not the JSON model,
 -- determine the owner and frozen admission lineage.
 SELECT s.shift_id,s.owner_id,s.plan_fingerprint INTO v_shift
 FROM reality_internal.governed_employee_shifts_v1 s
 JOIN reality_internal.governed_employee_completion_warrants_v1 w
  ON w.shift_id=s.shift_id AND w.owner_id=s.owner_id
  AND w.plan_fingerprint=s.plan_fingerprint
 WHERE s.shift_id=p_shift_id AND s.authorized_at IS NOT NULL
  AND s.closed_at IS NULL AND s.planned_end_at='infinity'::timestamptz
  AND s.status IN ('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
  AND w.state='ACTIVE' AND w.authorized_at IS NOT NULL
  AND w.mode='UNTIL_ALL_INDEPENDENT_FINAL_RECEIPTS'
  AND EXISTS(
   SELECT 1 FROM pg_catalog.jsonb_array_elements(w.source_scope) item
   WHERE item->>'source_ref'=p_plan->>'source_ref')
 FOR UPDATE OF s;
 IF NOT FOUND OR v_shift.owner_id::text<>p_plan->>'owner_id' OR
  v_shift.shift_id::text<>p_plan->>'shift_id' THEN
  RETURN jsonb_build_object('status','FINAL_LOOP_SOURCE_PLAN_SIGNED_SHIFT_UNVERIFIED',
   'source_plan_staged',false,'original_job_completed',false);END IF;
 SELECT r.run_id INTO v_run
 FROM reality_internal.signed_worker_actual_runs_v1 r
 WHERE r.run_id=p_worker_run_id AND r.status='STARTED'
  AND r.finished_at IS NULL
  AND r.started_at>=pg_catalog.clock_timestamp()-interval '10 minutes';
 IF NOT FOUND THEN
  RETURN jsonb_build_object('status','FINAL_LOOP_SOURCE_PLAN_SIGNED_RUN_UNVERIFIED',
   'source_plan_staged',false,'original_job_completed',false);END IF;
 SELECT t.source_ref,t.proof_sha256 INTO v_source
 FROM reality_internal.governed_employee_shift_steps_v1 t
 WHERE t.shift_id=p_shift_id
  AND t.step_index BETWEEN 2 AND 5
  AND t.state='SOURCE_CHECKED'
  AND t.source_ref=p_plan->>'source_ref'
  AND t.proof_sha256=p_plan->>'frozen_source_proof_sha256'
  AND t.proof_sha256='sha256:'||pg_catalog.encode(
   pg_catalog.sha256(pg_catalog.convert_to(t.proof::text,'UTF8')),'hex');
 IF NOT FOUND THEN
  RETURN jsonb_build_object('status','FINAL_LOOP_SOURCE_PLAN_FROZEN_SOURCE_UNVERIFIED',
   'source_plan_staged',false,'original_job_completed',false);END IF;
 SELECT r.original_work_id,r.phase,r.model_response_id,r.review_body,
  r.provider_comment_id,r.settlement_receipt_id
 INTO v_parent FROM reality_internal.riley_pr_review_originals_v1 r
 WHERE r.shift_id=p_shift_id AND r.owner_id=v_shift.owner_id
  AND r.source_ref=p_plan->>'source_ref';
 IF FOUND THEN
  IF v_parent.original_work_id<>p_plan->>'original_work_id' OR
   v_parent.phase<>p_plan->>'native_phase' OR
   v_parent.phase NOT IN ('BLOCKED','CLAIMED') OR
   v_parent.model_response_id IS NOT NULL OR
   v_parent.review_body IS NOT NULL OR
   v_parent.provider_comment_id IS NOT NULL OR
   v_parent.settlement_receipt_id IS NOT NULL THEN
   RETURN jsonb_build_object('status','FINAL_LOOP_PARENT_EFFECT_OR_PHASE_RECONCILIATION_REQUIRED',
    'source_plan_staged',false,'original_job_completed',false);END IF;
 ELSE
  IF p_plan->>'original_work_id' IS NOT NULL OR
   p_plan->>'native_phase'<>'NOT_ADMITTED' THEN
   RETURN jsonb_build_object('status','FINAL_LOOP_SOURCE_NOT_ADMITTED_PARENT_IDENTITY_INVALID',
    'source_plan_staged',false,'original_job_completed',false);END IF;
 END IF;
 v_digest:='sha256:'||pg_catalog.encode(
  pg_catalog.sha256(pg_catalog.convert_to(p_plan::text,'UTF8')),'hex');
 INSERT INTO reality_internal.final_loop_pr_source_plans_v1
  (shift_id,owner_id,plan_fingerprint,source_ref,source_proof_sha256,
   parent_original_work_id,parent_source_phase,source_head_sha,
   source_base_sha,source_manifest_sha256,database_plan_digest_sha256,
   file_count,proposed_scope_count,source_plan,staging_worker_run_id)
 VALUES(p_shift_id,v_shift.owner_id,v_shift.plan_fingerprint,
  p_plan->>'source_ref',p_plan->>'frozen_source_proof_sha256',
  v_parent.original_work_id, p_plan->>'native_phase',
  p_plan->>'live_head_sha',p_plan->>'live_base_sha',
  p_plan->>'source_manifest_sha256',v_digest,
  v_files,v_scopes,p_plan,p_worker_run_id)
 ON CONFLICT DO NOTHING RETURNING plan_id INTO v_id;
 IF v_id IS NULL THEN
  SELECT plan_id,database_plan_digest_sha256 INTO v_id,v_state
  FROM reality_internal.final_loop_pr_source_plans_v1
  WHERE shift_id=p_shift_id AND source_ref=p_plan->>'source_ref'
   AND source_manifest_sha256=p_plan->>'source_manifest_sha256';
  IF v_id IS NULL OR v_state<>v_digest THEN
   RETURN jsonb_build_object('status','FINAL_LOOP_SOURCE_PLAN_CONFLICT_NO_REPLAY',
    'source_plan_staged',false,'original_job_completed',false);END IF;
  RETURN jsonb_build_object('status','FINAL_LOOP_SOURCE_PLAN_ALREADY_STAGED_NO_REPLAY',
   'plan_id',v_id,'owner_id',v_shift.owner_id,'shift_id',p_shift_id,
   'source_ref',p_plan->>'source_ref',
   'parent_original_work_id',v_parent.original_work_id,
   'source_manifest_sha256',p_plan->>'source_manifest_sha256',
   'source_plan_staged',true,'new_original_created',false,
   'child_original_admitted',false,'review_executed',false,
   'original_job_completed',false,'production_changed',false);END IF;
 RETURN jsonb_build_object(
  'status','FINAL_LOOP_SOURCE_PLAN_STAGED_PENDING_GOVERNED_ADMISSION',
  'plan_id',v_id,'owner_id',v_shift.owner_id,'shift_id',p_shift_id,
  'source_ref',p_plan->>'source_ref',
  'parent_original_work_id',v_parent.original_work_id,
  'source_manifest_sha256',p_plan->>'source_manifest_sha256',
  'manifest_file_count',v_files,'proposed_scope_count',v_scopes,
  'source_plan_staged',true,'new_original_created',false,
  'child_original_admitted',false,'review_executed',false,
  'original_job_completed',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION
 public.reality_stage_final_loop_pr_source_plan_v1(uuid,uuid,jsonb)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION
 public.reality_stage_final_loop_pr_source_plan_v1(uuid,uuid,jsonb)
 TO service_role;

-- Owner/time and signed worker consume an identical source-plan receipt.
-- No proposed child is exposed as an admitted original or future work.
CREATE OR REPLACE FUNCTION
 public.reality_read_final_loop_pr_source_plans_v1(p_shift_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE v_shift record;v_plans jsonb;
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'FINAL_LOOP_PR_SOURCE_READER_SERVICE_ONLY';END IF;
 SELECT s.shift_id,s.owner_id,s.plan_fingerprint INTO v_shift
 FROM reality_internal.governed_employee_shifts_v1 s
 JOIN reality_internal.governed_employee_completion_warrants_v1 w
 ON w.shift_id=s.shift_id AND w.owner_id=s.owner_id
  AND w.plan_fingerprint=s.plan_fingerprint
 WHERE s.shift_id=p_shift_id AND s.closed_at IS NULL AND
  s.authorized_at IS NOT NULL AND w.state='ACTIVE';
 IF NOT FOUND THEN
  RETURN jsonb_build_object('status','FINAL_LOOP_SOURCE_PLAN_SHIFT_UNVERIFIED',
   'read_only',true,'execution_authorized',false);END IF;
 SELECT pg_catalog.coalesce(pg_catalog.jsonb_agg(
  jsonb_build_object(
   'source_ref',p.source_ref,'parent_original_work_id',p.parent_original_work_id,
   'parent_source_phase',p.parent_source_phase,
   'source_manifest_sha256',p.source_manifest_sha256,
   'source_head_sha',p.source_head_sha,
   'file_count',p.file_count,'proposed_scope_count',p.proposed_scope_count,
   'state',p.state,'source_plan_digest_sha256',p.database_plan_digest_sha256,
   'independent_source_review_verified',false,
   'owner_acceptance_verified',false,
   'child_originals_admitted',0,
   'next_governed_action',CASE WHEN p.parent_original_work_id IS NULL
     THEN 'QUALIFY_DISTINCT_PARENT_ORIGINAL_BEFORE_CHILD_REVIEW'
     ELSE 'INDEPENDENT_SOURCE_AND_OWNER_ACCEPTANCE_BEFORE_CHILD_ADMISSION' END
  ) ORDER BY p.source_ref,p.staged_at DESC),'[]'::jsonb)
 INTO v_plans FROM reality_internal.final_loop_pr_source_plans_v1 p
 WHERE p.shift_id=p_shift_id AND p.owner_id=v_shift.owner_id
  AND p.plan_fingerprint=v_shift.plan_fingerprint;
 RETURN jsonb_build_object(
  'schema','reality-final-loop-pr-source-plans-readback-v1',
  'status','FINAL_LOOP_PROPOSED_SOURCE_PLANS_NOT_EXECUTABLE',
  'owner_id',v_shift.owner_id,'shift_id',p_shift_id,
  'plan_fingerprint',v_shift.plan_fingerprint,'plans',v_plans,
  'read_only',true,'execution_authorized',false,
  'new_original_created',false,'child_originals_admitted',0,
  'independent_review_completed',false,'original_job_completed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_read_final_loop_pr_source_plans_v1(uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_read_final_loop_pr_source_plans_v1(uuid)
 TO service_role;
