-- Reality: independently inspect the exact frozen maintenance artifact's
-- current isolated install target on a DIFFERENT signed worker wake.
-- Extend the already deployed artifact ledger. This is NOT installation,
-- owner consent, original settlement, production publication or a new shift.
ALTER TABLE reality_internal.owner_maintenance_verified_artifact_handoffs_v1
 ADD COLUMN IF NOT EXISTS target_review_receipt_sha256 text,
 ADD COLUMN IF NOT EXISTS target_review_worker_run_id uuid,
 ADD COLUMN IF NOT EXISTS target_review_branch text,
 ADD COLUMN IF NOT EXISTS target_review_head_sha text,
 ADD COLUMN IF NOT EXISTS target_review_existing_blob_sha text,
 ADD COLUMN IF NOT EXISTS target_reviewed_at timestamptz;

DO $guard$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint
  WHERE conrelid='reality_internal.owner_maintenance_verified_artifact_handoffs_v1'::regclass
   AND conname='exact_signed_maintenance_target_review_v1') THEN
  ALTER TABLE reality_internal.owner_maintenance_verified_artifact_handoffs_v1
   ADD CONSTRAINT exact_signed_maintenance_target_review_v1 CHECK (
    (target_review_receipt_sha256 IS NULL AND
     target_review_worker_run_id IS NULL AND target_review_branch IS NULL AND
     target_review_head_sha IS NULL AND target_review_existing_blob_sha IS NULL AND
     target_reviewed_at IS NULL)
    OR
    (target_review_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$' AND
     target_review_worker_run_id IS NOT NULL AND
     target_review_worker_run_id <> observed_worker_run_id AND
     target_review_branch='reality/chat-direct-work-handoff-20261115' AND
     target_review_head_sha ~ '^[a-f0-9]{40}$' AND
     target_review_existing_blob_sha=historical_source_blob_sha AND
     target_reviewed_at IS NOT NULL)
   );
 END IF;
END $guard$;

CREATE OR REPLACE FUNCTION public.reality_read_signed_maintenance_install_target_review_v1(
 p_shift_id uuid,p_worker_run_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE v record;
BEGIN
 IF current_user<>'service_role' OR p_shift_id IS NULL OR p_worker_run_id IS NULL
 THEN RAISE EXCEPTION 'SIGNED_MAINTENANCE_TARGET_REVIEW_SERVICE_REQUIRED'; END IF;
 SELECT a.*,m.origin_shift_id,m.independent_review_receipt_sha256,
  m.independent_frozen_test_receipt_sha256,s.plan_fingerprint
 INTO v FROM reality_internal.owner_maintenance_verified_artifact_handoffs_v1 a
 JOIN reality_internal.owner_internal_maintenance_jobs_v1 m
  ON m.incident_id=a.maintenance_id AND m.owner_id=a.owner_id
  AND m.claimed_shift_id=a.shift_id AND m.source_ref=a.source_ref
 JOIN reality_internal.owner_maintenance_independent_case_ci_v1 c
  ON c.maintenance_id=a.maintenance_id AND c.owner_id=a.owner_id
  AND c.shift_id=a.shift_id AND c.source_ref=a.source_ref
  AND c.case_specific_ci_receipt_sha256=a.source_case_ci_receipt_sha256
  AND c.source_epoch_frozen_red_verified=true
  AND c.code_correction_green_verified=true
 JOIN reality_internal.governed_employee_shifts_v1 s
  ON s.shift_id=a.shift_id AND s.owner_id=a.owner_id
 JOIN reality_internal.governed_employee_completion_warrants_v1 w
  ON w.shift_id=s.shift_id AND w.owner_id=s.owner_id
  AND w.plan_fingerprint=s.plan_fingerprint AND w.state='ACTIVE'
  AND w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
 JOIN reality_internal.governed_employee_shift_worker_pulses_v1 pulse
  ON pulse.shift_id=s.shift_id AND pulse.owner_id=s.owner_id
 JOIN reality_internal.signed_worker_actual_runs_v1 run
  ON run.run_id=p_worker_run_id AND run.status='STARTED'
 WHERE a.shift_id=p_shift_id
  AND a.observed_worker_run_id<>p_worker_run_id
  AND a.target_review_receipt_sha256 IS NULL
  AND m.independent_review_receipt_sha256~'^sha256:[a-f0-9]{64}$'
  AND m.independent_frozen_test_receipt_sha256=a.source_case_ci_receipt_sha256
  AND m.exact_install_approval_receipt_sha256 IS NULL
  AND m.repaired_capability_receipt_sha256 IS NULL
  AND m.original_job_completed=false AND m.production_changed=false
  AND m.installation_authorized_by_discovery=false
  AND s.authorized_at IS NOT NULL AND s.closed_at IS NULL
  AND s.planned_start_at<=pg_catalog.clock_timestamp()
  AND (s.planned_end_at='infinity'::timestamptz OR
   s.planned_end_at>pg_catalog.clock_timestamp())
  AND s.status IN('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
  AND pulse.last_worker_status='WAKE_RECEIVED'
  AND pulse.last_worker_seen_at>pg_catalog.clock_timestamp()-interval '3 minutes'
  AND run.started_at>pg_catalog.clock_timestamp()-interval '3 minutes'
  AND EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(
   CASE WHEN pg_catalog.jsonb_typeof(w.source_scope)='array'
    THEN w.source_scope ELSE '[]'::jsonb END) sc
   WHERE sc->>'maintenance_id'=m.incident_id::text
    AND sc->>'origin_shift_id'=m.origin_shift_id::text
    AND sc->>'source_ref'=m.source_ref
    AND sc->>'independent_review_receipt_sha256'=m.independent_review_receipt_sha256)
 ORDER BY a.reviewed_at,a.maintenance_id LIMIT 1;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object(
  'status','NO_SIGNED_MAINTENANCE_INSTALL_TARGET_REVIEW_DUE',
  'installation_authorized',false,'repair_installed',false,
  'original_job_completed',false,'production_changed',false,
  'new_shift_started',false); END IF;
 RETURN pg_catalog.jsonb_build_object(
  'status','SIGNED_MAINTENANCE_EXACT_INSTALL_TARGET_REVIEW_DUE',
  'maintenance_id',v.maintenance_id,'owner_id',v.owner_id,
  'shift_id',v.shift_id,'origin_shift_id',v.origin_shift_id,
  'source_ref',v.source_ref,'source_path',v.source_path,
  'candidate_commit_sha',v.exact_candidate_commit_sha,
  'candidate_source_blob_sha',v.candidate_source_blob_sha,
  'historical_source_blob_sha',v.historical_source_blob_sha,
  'case_ci_receipt_sha256',v.source_case_ci_receipt_sha256,
  'artifact_receipt_sha256',v.review_receipt_sha256,
  'github_artifact_digest',v.github_artifact_digest,
  'artifact_worker_run_id',v.observed_worker_run_id,
  'reviewer_worker_run_id',p_worker_run_id,
  'target_branch','reality/chat-direct-work-handoff-20261115',
  'target_source_checked',false,'owner_approval_ready',false,
  'installation_authorized',false,'repair_installed',false,
  'original_job_completed',false,'production_changed',false,
  'new_shift_started',false);
END $fn$;

CREATE OR REPLACE FUNCTION public.reality_record_signed_maintenance_install_target_review_v1(
 p_shift_id uuid,p_worker_run_id uuid,p_maintenance_id uuid,
 p_candidate_blob_sha text,p_target_branch text,p_target_head_sha text,
 p_target_existing_blob_sha text
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE scope jsonb; r record; digest text;
BEGIN
 IF current_user<>'service_role' OR
   p_shift_id IS NULL OR p_worker_run_id IS NULL OR p_maintenance_id IS NULL OR
   p_candidate_blob_sha!~'^[a-f0-9]{40}$' OR
   p_target_branch<>'reality/chat-direct-work-handoff-20261115' OR
   p_target_head_sha!~'^[a-f0-9]{40}$' OR
   p_target_existing_blob_sha!~'^[a-f0-9]{40}$'
 THEN RAISE EXCEPTION 'SIGNED_MAINTENANCE_TARGET_SOURCE_REQUIRED'; END IF;
 scope:=public.reality_read_signed_maintenance_install_target_review_v1(
  p_shift_id,p_worker_run_id);
 IF scope->>'status'<>'SIGNED_MAINTENANCE_EXACT_INSTALL_TARGET_REVIEW_DUE'
  OR scope->>'maintenance_id'<>p_maintenance_id::text
  OR scope->>'candidate_source_blob_sha'<>p_candidate_blob_sha
  OR scope->>'target_branch'<>p_target_branch
 THEN RETURN pg_catalog.jsonb_build_object(
  'status','EXACT_MAINTENANCE_TARGET_REVIEW_SCOPE_UNVERIFIED',
  'installation_authorized',false,'repair_installed',false,
  'original_job_completed',false,'production_changed',false); END IF;
 IF scope->>'historical_source_blob_sha'<>p_target_existing_blob_sha
 THEN RETURN pg_catalog.jsonb_build_object(
  'status','EXACT_MAINTENANCE_TARGET_SOURCE_DRIFT_REQUALIFICATION_REQUIRED',
  'maintenance_id',p_maintenance_id,'shift_id',p_shift_id,
  'installation_authorized',false,'repair_installed',false,
  'original_job_completed',false,'production_changed',false); END IF;
 SELECT * INTO r FROM reality_internal.owner_maintenance_verified_artifact_handoffs_v1
 WHERE maintenance_id=p_maintenance_id AND shift_id=p_shift_id
  AND target_review_receipt_sha256 IS NULL FOR UPDATE;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object(
  'status','EXACT_MAINTENANCE_TARGET_REVIEW_ALREADY_RECORDED_NO_REPLAY',
  'installation_authorized',false,'repair_installed',false,
  'original_job_completed',false,'production_changed',false); END IF;
 digest:='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
  r.owner_id::text||'|'||p_shift_id::text||'|'||p_maintenance_id::text||'|'||
  r.review_receipt_sha256||'|'||r.source_case_ci_receipt_sha256||'|'||
  r.exact_candidate_commit_sha||'|'||p_candidate_blob_sha||'|'||
  p_target_branch||'|'||p_target_head_sha||'|'||p_target_existing_blob_sha||
  '|INDEPENDENT_DIFFERENT_SIGNED_WORKER_TARGET_REVIEW_ONLY','UTF8')),'hex');
 UPDATE reality_internal.owner_maintenance_verified_artifact_handoffs_v1
 SET target_review_receipt_sha256=digest,
     target_review_worker_run_id=p_worker_run_id,
     target_review_branch=p_target_branch,
     target_review_head_sha=p_target_head_sha,
     target_review_existing_blob_sha=p_target_existing_blob_sha,
     target_reviewed_at=pg_catalog.clock_timestamp()
 WHERE maintenance_id=p_maintenance_id AND shift_id=p_shift_id
  AND target_review_receipt_sha256 IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'TARGET_REVIEW_CONCURRENT_REPLAY_REJECTED'; END IF;
 RETURN pg_catalog.jsonb_build_object(
  'status','EXACT_SIGNED_MAINTENANCE_INSTALL_TARGET_INDEPENDENTLY_REVIEWED',
  'maintenance_id',p_maintenance_id,'owner_id',r.owner_id,
  'shift_id',p_shift_id,'source_ref',r.source_ref,
  'candidate_commit_sha',r.exact_candidate_commit_sha,
  'candidate_source_blob_sha',p_candidate_blob_sha,
  'target_branch',p_target_branch,'target_head_sha',p_target_head_sha,
  'target_existing_blob_sha',p_target_existing_blob_sha,
  'target_review_receipt_sha256',digest,
  'owner_approval_ready',false,'installation_authorized',false,
  'repair_installed',false,'original_job_completed',false,
  'production_changed',false,'new_shift_started',false,
  'next_action','EXACT_OWNER_INSTALL_APPROVAL_AND_ORIGINAL_RESUME_CONTRACT_REQUIRED');
END $fn$;

REVOKE ALL ON FUNCTION public.reality_read_signed_maintenance_install_target_review_v1(uuid,uuid)
 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.reality_record_signed_maintenance_install_target_review_v1(
 uuid,uuid,uuid,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_read_signed_maintenance_install_target_review_v1(uuid,uuid)
 TO service_role;
GRANT EXECUTE ON FUNCTION public.reality_record_signed_maintenance_install_target_review_v1(
 uuid,uuid,uuid,text,text,text,text) TO service_role;
REVOKE ALL ON TABLE reality_internal.owner_maintenance_verified_artifact_handoffs_v1
 FROM PUBLIC,anon,authenticated;
GRANT SELECT,UPDATE ON TABLE reality_internal.owner_maintenance_verified_artifact_handoffs_v1
 TO service_role;


-- Reuse the SAME existing owner maintenance artifact readback. A successful
-- target review is visible in Reality Chat and the Universe classifier on
-- subsequent wakes; it is never promoted into owner approval automatically.
CREATE OR REPLACE FUNCTION public.reality_read_owner_maintenance_verified_artifacts_v1(
 p_owner_id uuid
) RETURNS jsonb LANGUAGE plpgsql SET search_path TO '' AS $function$
DECLARE items jsonb;
BEGIN
 IF current_user<>'service_role' OR p_owner_id IS NULL THEN
  RAISE EXCEPTION 'MAINTENANCE_ARTIFACT_OWNER_SERVICE_REQUIRED'; END IF;
 SELECT coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'maintenance_id',x.maintenance_id,'shift_id',x.shift_id,
  'source_ref',x.source_ref,'source_path',x.source_path,
  'candidate_commit_sha',x.exact_candidate_commit_sha,
  'candidate_source_blob_sha',x.candidate_source_blob_sha,
  'historical_source_blob_sha',x.historical_source_blob_sha,
  'review_receipt_sha256',x.review_receipt_sha256,
  'case_ci_receipt_sha256',x.source_case_ci_receipt_sha256,
  'github_run_id',x.github_run_id,'github_artifact_id',x.github_artifact_id,
  'github_artifact_digest',x.github_artifact_digest,
  'target_review_receipt_sha256',x.target_review_receipt_sha256,
  'target_review_worker_run_id',x.target_review_worker_run_id,
  'target_review_branch',x.target_review_branch,
  'target_review_head_sha',x.target_review_head_sha,
  'target_review_existing_blob_sha',x.target_review_existing_blob_sha,
  'install_target_verified',(
   x.target_review_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'
   AND x.target_review_worker_run_id IS NOT NULL
   AND x.target_review_worker_run_id<>x.observed_worker_run_id
   AND x.target_review_branch='reality/chat-direct-work-handoff-20261115'
   AND x.target_review_head_sha ~ '^[a-f0-9]{40}$'
   AND x.target_review_existing_blob_sha=x.historical_source_blob_sha
  ),
  'owner_approval_ready',false,
  'installation_authorized',false,'repair_installed',false,
  'original_job_completed',false,'next_action',
  CASE WHEN x.target_review_receipt_sha256 IS NOT NULL
   THEN 'EXACT_OWNER_APPROVAL_AND_ORIGINAL_RESUME_CONTRACT_REQUIRED'
   ELSE 'INDEPENDENT_INSTALL_TARGET_AND_OWNER_APPROVAL_REVIEW_REQUIRED'
  END
 ) ORDER BY x.reviewed_at DESC),'[]'::jsonb)
 INTO items
 FROM reality_internal.owner_maintenance_verified_artifact_handoffs_v1 x
 JOIN reality_internal.governed_employee_completion_warrants_v1 w
  ON w.shift_id=x.shift_id AND w.owner_id=x.owner_id
 WHERE x.owner_id=p_owner_id AND w.state='ACTIVE'
 AND w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
 AND EXISTS (SELECT 1 FROM pg_catalog.jsonb_array_elements(
  CASE WHEN pg_catalog.jsonb_typeof(w.source_scope)='array'
   THEN w.source_scope ELSE '[]'::jsonb END) sc
  WHERE sc->>'maintenance_id'=x.maintenance_id::text
   AND sc->>'source_ref'=x.source_ref);
 RETURN pg_catalog.jsonb_build_object(
  'status','OWNER_VERIFIED_MAINTENANCE_ARTIFACTS_READ_ONLY',
  'owner_id',p_owner_id,'count',pg_catalog.jsonb_array_length(items),
  'items',items,'installation_authorized',false,
  'production_changed',false);
END $function$;
REVOKE ALL ON FUNCTION public.reality_read_owner_maintenance_verified_artifacts_v1(uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_read_owner_maintenance_verified_artifacts_v1(uuid)
 TO service_role;
