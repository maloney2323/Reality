-- The existing signed worker reconciles a second GitHub CI run containing
-- an exact source artifact and original RED/GREEN tests. This only creates
-- a reviewable candidate: no owner approval, installation or settlement.
CREATE TABLE IF NOT EXISTS reality_internal.owner_maintenance_verified_artifact_handoffs_v1 (
 maintenance_id uuid PRIMARY KEY,
 owner_id uuid NOT NULL,
 shift_id uuid NOT NULL,
 source_ref text NOT NULL CHECK (source_ref ~ '^https://github\.com/maloney2323/Reality/pull/[1-9][0-9]*$'),
 source_case_ci_receipt_sha256 text NOT NULL CHECK (source_case_ci_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 exact_candidate_commit_sha text NOT NULL CHECK (exact_candidate_commit_sha ~ '^[a-f0-9]{40}$'),
 source_path text NOT NULL CHECK (source_path ~ '^src/[a-z0-9_./-]+\.js$' AND position('..' in source_path)=0),
 candidate_source_blob_sha text NOT NULL CHECK (candidate_source_blob_sha ~ '^[a-f0-9]{40}$'),
 historical_source_blob_sha text NOT NULL CHECK (historical_source_blob_sha ~ '^[a-f0-9]{40}$'),
 frozen_test_blob_sha text NOT NULL CHECK (frozen_test_blob_sha ~ '^[a-f0-9]{40}$'),
 builder_blob_sha text NOT NULL CHECK (builder_blob_sha ~ '^[a-f0-9]{40}$'),
 github_run_id bigint NOT NULL CHECK (github_run_id>10000),
 github_job_id bigint NOT NULL CHECK (github_job_id>10000),
 github_artifact_id bigint NOT NULL CHECK (github_artifact_id>10000),
 github_artifact_digest text NOT NULL CHECK (github_artifact_digest ~ '^sha256:[a-f0-9]{64}$'),
 artifact_packet_sha256 text NOT NULL CHECK (artifact_packet_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 review_receipt_sha256 text NOT NULL UNIQUE CHECK (review_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 observed_worker_run_id uuid NOT NULL,
 reviewed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 FOREIGN KEY (maintenance_id) REFERENCES reality_internal.owner_internal_maintenance_jobs_v1(incident_id)
);
REVOKE ALL ON TABLE reality_internal.owner_maintenance_verified_artifact_handoffs_v1 FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.reality_read_signed_existing_maintenance_artifact_scope_v1(
 p_shift_id uuid,p_worker_run_id uuid
) RETURNS jsonb LANGUAGE plpgsql SET search_path TO '' AS $function$
DECLARE v record; items jsonb;
BEGIN
 IF current_user<>'service_role' OR p_shift_id IS NULL OR p_worker_run_id IS NULL
 THEN RAISE EXCEPTION 'SIGNED_MAINTENANCE_ARTIFACT_SERVICE_ONLY';END IF;
 SELECT s.shift_id,s.owner_id,w.source_scope INTO v
 FROM reality_internal.governed_employee_shifts_v1 s
 JOIN reality_internal.governed_employee_completion_warrants_v1 w
  ON w.shift_id=s.shift_id AND w.owner_id=s.owner_id AND w.plan_fingerprint=s.plan_fingerprint
 JOIN reality_internal.governed_employee_shift_worker_pulses_v1 p
  ON p.shift_id=s.shift_id AND p.owner_id=s.owner_id
 JOIN reality_internal.signed_worker_actual_runs_v1 r
  ON r.run_id=p_worker_run_id
 WHERE s.shift_id=p_shift_id AND s.closed_at IS NULL AND s.authorized_at IS NOT NULL
 AND s.planned_start_at<=clock_timestamp() AND s.planned_end_at>clock_timestamp()
 AND s.status IN ('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
 AND w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
 AND w.state='ACTIVE' AND pg_catalog.jsonb_typeof(w.source_scope)='array'
 AND pg_catalog.jsonb_array_length(w.source_scope) BETWEEN 1 AND 4
 AND p.last_worker_status='WAKE_RECEIVED'
 AND p.last_worker_seen_at>clock_timestamp()-interval '3 minutes'
 AND r.status='STARTED' AND r.started_at>clock_timestamp()-interval '3 minutes';
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object(
  'status','NO_SIGNED_MAINTENANCE_ARTIFACT_WORKER_SCOPE',
  'candidate_count',0,'cases','[]'::jsonb,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);END IF;
 SELECT coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'maintenance_id',m.incident_id,'owner_id',m.owner_id,
  'shift_id',m.claimed_shift_id,'source_ref',m.source_ref,
  'case_ci_receipt_sha256',c.case_specific_ci_receipt_sha256,
  'frozen_test_blob_sha',c.frozen_test_blob_sha,
  'historical_failure_kind',c.historical_failure_kind
 ) ORDER BY c.reviewed_at ASC),'[]'::jsonb) INTO items
 FROM pg_catalog.jsonb_array_elements(v.source_scope) sc(entry)
 JOIN reality_internal.owner_internal_maintenance_jobs_v1 m
  ON m.incident_id=(sc.entry->>'maintenance_id')::uuid
  AND m.owner_id=v.owner_id AND m.claimed_shift_id=p_shift_id
  AND m.source_ref=sc.entry->>'source_ref'
  AND m.origin_shift_id=(sc.entry->>'origin_shift_id')::uuid
  AND m.independent_review_receipt_sha256=sc.entry->>'independent_review_receipt_sha256'
 JOIN reality_internal.owner_maintenance_independent_case_ci_v1 c
  ON c.maintenance_id=m.incident_id AND c.owner_id=m.owner_id
  AND c.shift_id=p_shift_id AND c.source_ref=m.source_ref
  AND c.case_specific_ci_receipt_sha256=m.independent_frozen_test_receipt_sha256
 WHERE c.source_epoch_frozen_red_verified=true AND c.code_correction_green_verified=true
 AND m.phase='FROZEN_FAILURE_VERIFIED'
 AND m.exact_install_approval_receipt_sha256 IS NULL
 AND m.repaired_capability_receipt_sha256 IS NULL
 AND m.original_job_completed=false AND m.production_changed=false
 AND NOT EXISTS(SELECT 1 FROM reality_internal.owner_maintenance_verified_artifact_handoffs_v1 a
  WHERE a.maintenance_id=m.incident_id);
 RETURN pg_catalog.jsonb_build_object(
  'status',CASE WHEN pg_catalog.jsonb_array_length(items)>0
   THEN 'SIGNED_MAINTENANCE_VERIFIED_ARTIFACT_CANDIDATE_READY'
   ELSE 'NO_UNRECONCILED_VERIFIED_MAINTENANCE_ARTIFACT' END,
  'owner_id',v.owner_id,'shift_id',p_shift_id,
  'candidate_count',pg_catalog.jsonb_array_length(items),'cases',items,
  'installation_authorized',false,'original_job_completed',false,'production_changed',false);
END $function$;

CREATE OR REPLACE FUNCTION public.reality_record_signed_existing_maintenance_artifact_v1(
 p_shift_id uuid,p_worker_run_id uuid,p_maintenance_id uuid,
 p_case_ci_receipt_sha256 text,p_candidate_commit_sha text,p_source_path text,
 p_candidate_blob_sha text,p_historical_blob_sha text,p_frozen_test_blob_sha text,
 p_builder_blob_sha text,p_github_run_id bigint,p_github_job_id bigint,
 p_github_artifact_id bigint,p_github_artifact_digest text,p_artifact_packet_sha256 text
) RETURNS jsonb LANGUAGE plpgsql SET search_path TO '' AS $function$
DECLARE v record; old record; h text;
BEGIN
 IF current_user<>'service_role' OR p_shift_id IS NULL OR
    p_worker_run_id IS NULL OR p_maintenance_id IS NULL OR
    p_case_ci_receipt_sha256!~'^sha256:[a-f0-9]{64}$' OR
    p_candidate_commit_sha!~'^[a-f0-9]{40}$' OR
    p_source_path!~'^src/[a-z0-9_./-]+\.js$' OR
    position('..' in p_source_path)>0 OR
    p_candidate_blob_sha!~'^[a-f0-9]{40}$' OR
    p_historical_blob_sha!~'^[a-f0-9]{40}$' OR
    p_frozen_test_blob_sha!~'^[a-f0-9]{40}$' OR
    p_builder_blob_sha!~'^[a-f0-9]{40}$' OR
    p_github_run_id<=10000 OR p_github_job_id<=10000 OR
    p_github_artifact_id<=10000 OR
    p_github_artifact_digest!~'^sha256:[a-f0-9]{64}$' OR
    p_artifact_packet_sha256!~'^sha256:[a-f0-9]{64}$'
 THEN RAISE EXCEPTION 'SIGNED_MAINTENANCE_PROVIDER_ARTIFACT_REQUIRED';END IF;
 SELECT m.owner_id,m.claimed_shift_id,m.source_ref,c.case_specific_ci_receipt_sha256
 INTO v
 FROM reality_internal.owner_internal_maintenance_jobs_v1 m
 JOIN reality_internal.owner_maintenance_independent_case_ci_v1 c
  ON c.maintenance_id=m.incident_id AND c.owner_id=m.owner_id
  AND c.shift_id=m.claimed_shift_id AND c.source_ref=m.source_ref
 JOIN reality_internal.governed_employee_shifts_v1 s
  ON s.shift_id=m.claimed_shift_id AND s.owner_id=m.owner_id
 JOIN reality_internal.governed_employee_completion_warrants_v1 w
  ON w.shift_id=s.shift_id AND w.owner_id=s.owner_id
   AND w.plan_fingerprint=s.plan_fingerprint
 JOIN reality_internal.governed_employee_shift_worker_pulses_v1 pulse
  ON pulse.shift_id=s.shift_id AND pulse.owner_id=s.owner_id
 JOIN reality_internal.signed_worker_actual_runs_v1 run
  ON run.run_id=p_worker_run_id
 WHERE m.incident_id=p_maintenance_id AND m.claimed_shift_id=p_shift_id
 AND m.phase='FROZEN_FAILURE_VERIFIED'
 AND m.independent_frozen_test_receipt_sha256=p_case_ci_receipt_sha256
 AND c.case_specific_ci_receipt_sha256=p_case_ci_receipt_sha256
 AND c.frozen_test_blob_sha=p_frozen_test_blob_sha
 AND c.source_epoch_frozen_red_verified=true
 AND c.code_correction_green_verified=true
 AND m.exact_install_approval_receipt_sha256 IS NULL
 AND m.repaired_capability_receipt_sha256 IS NULL
 AND m.original_job_completed=false AND m.production_changed=false
 AND s.closed_at IS NULL AND s.authorized_at IS NOT NULL
 AND s.planned_start_at<=clock_timestamp() AND s.planned_end_at>clock_timestamp()
 AND s.status IN ('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
 AND w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
 AND w.state='ACTIVE' AND EXISTS(
  SELECT 1 FROM pg_catalog.jsonb_array_elements(w.source_scope) sc(entry)
  WHERE sc.entry->>'maintenance_id'=m.incident_id::text
  AND sc.entry->>'origin_shift_id'=m.origin_shift_id::text
  AND sc.entry->>'source_ref'=m.source_ref
  AND sc.entry->>'independent_review_receipt_sha256'=m.independent_review_receipt_sha256)
 AND pulse.last_worker_status='WAKE_RECEIVED'
 AND pulse.last_worker_seen_at>clock_timestamp()-interval '3 minutes'
 AND run.status='STARTED' AND run.started_at>clock_timestamp()-interval '3 minutes'
 FOR UPDATE OF m;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object(
  'status','NO_SIGNED_MAINTENANCE_ARTIFACT_ACCEPTANCE_SCOPE',
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false);END IF;
 h:='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
  v.owner_id::text||'|'||p_shift_id::text||'|'||p_maintenance_id::text||'|'||
  v.source_ref||'|'||p_case_ci_receipt_sha256||'|'||
  p_candidate_commit_sha||'|'||p_source_path||'|'||p_candidate_blob_sha||'|'||
  p_historical_blob_sha||'|'||p_frozen_test_blob_sha||'|'||p_builder_blob_sha||'|'||
  p_github_run_id::text||'|'||p_github_job_id::text||'|'||
  p_github_artifact_id::text||'|'||p_github_artifact_digest||'|'||
  p_artifact_packet_sha256||'|VERIFIED_SOURCE_ARTIFACT_REVIEW_ONLY','UTF8')),'hex');
 INSERT INTO reality_internal.owner_maintenance_verified_artifact_handoffs_v1(
  maintenance_id,owner_id,shift_id,source_ref,source_case_ci_receipt_sha256,
  exact_candidate_commit_sha,source_path,candidate_source_blob_sha,
  historical_source_blob_sha,frozen_test_blob_sha,builder_blob_sha,
  github_run_id,github_job_id,github_artifact_id,github_artifact_digest,
  artifact_packet_sha256,review_receipt_sha256,observed_worker_run_id)
 VALUES(p_maintenance_id,v.owner_id,p_shift_id,v.source_ref,
  p_case_ci_receipt_sha256,p_candidate_commit_sha,p_source_path,
  p_candidate_blob_sha,p_historical_blob_sha,p_frozen_test_blob_sha,
  p_builder_blob_sha,p_github_run_id,p_github_job_id,p_github_artifact_id,
  p_github_artifact_digest,p_artifact_packet_sha256,h,p_worker_run_id)
 ON CONFLICT(maintenance_id) DO NOTHING;
 SELECT * INTO old FROM reality_internal.owner_maintenance_verified_artifact_handoffs_v1
 WHERE maintenance_id=p_maintenance_id;
 IF NOT FOUND OR old.review_receipt_sha256<>h
 THEN RAISE EXCEPTION 'SIGNED_MAINTENANCE_ARTIFACT_IMMUTABLE_CONFLICT';END IF;
 RETURN pg_catalog.jsonb_build_object(
  'status','EXACT_MAINTENANCE_SOURCE_REPAIR_ARTIFACT_RECORDED',
  'maintenance_id',p_maintenance_id,'shift_id',p_shift_id,'owner_id',v.owner_id,
  'source_ref',v.source_ref,'candidate_commit_sha',p_candidate_commit_sha,
  'source_path',p_source_path,'source_blob_sha',p_candidate_blob_sha,
  'github_run_id',p_github_run_id,'github_artifact_id',p_github_artifact_id,
  'github_artifact_digest',p_github_artifact_digest,
  'review_receipt_sha256',h,'case_ci_receipt_sha256',p_case_ci_receipt_sha256,
  'install_target_verified',false,'owner_approval_ready',false,
  'installation_authorized',false,'repair_installed',false,
  'original_job_completed',false,'production_changed',false,
  'next_action','INDEPENDENT_INSTALL_TARGET_AND_OWNER_APPROVAL_REVIEW_REQUIRED');
END $function$;

CREATE OR REPLACE FUNCTION public.reality_read_owner_maintenance_verified_artifacts_v1(
 p_owner_id uuid
) RETURNS jsonb LANGUAGE plpgsql SET search_path TO '' AS $function$
DECLARE a jsonb;
BEGIN
 IF current_user<>'service_role' OR p_owner_id IS NULL THEN
  RAISE EXCEPTION 'MAINTENANCE_ARTIFACT_OWNER_SERVICE_REQUIRED';END IF;
 SELECT coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'maintenance_id',x.maintenance_id,'shift_id',x.shift_id,
  'source_ref',x.source_ref,'source_path',x.source_path,
  'candidate_commit_sha',x.exact_candidate_commit_sha,
  'candidate_source_blob_sha',x.candidate_source_blob_sha,
  'review_receipt_sha256',x.review_receipt_sha256,
  'case_ci_receipt_sha256',x.source_case_ci_receipt_sha256,
  'github_run_id',x.github_run_id,'github_artifact_id',x.github_artifact_id,
  'github_artifact_digest',x.github_artifact_digest,
  'install_target_verified',false,'owner_approval_ready',false,
  'installation_authorized',false,'repair_installed',false,
  'original_job_completed',false,'next_action',
  'INDEPENDENT_INSTALL_TARGET_AND_OWNER_APPROVAL_REVIEW_REQUIRED'
 ) ORDER BY x.reviewed_at DESC),'[]'::jsonb) INTO a
 FROM reality_internal.owner_maintenance_verified_artifact_handoffs_v1 x
 JOIN reality_internal.governed_employee_completion_warrants_v1 w
  ON w.shift_id=x.shift_id AND w.owner_id=x.owner_id
 WHERE x.owner_id=p_owner_id AND w.state='ACTIVE'
 AND w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
 AND EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(w.source_scope) sc(entry)
  WHERE sc.entry->>'maintenance_id'=x.maintenance_id::text
  AND sc.entry->>'source_ref'=x.source_ref);
 RETURN pg_catalog.jsonb_build_object(
  'status','OWNER_VERIFIED_MAINTENANCE_ARTIFACTS_READ_ONLY',
  'owner_id',p_owner_id,'count',pg_catalog.jsonb_array_length(a),
  'items',a,'installation_authorized',false,
  'production_changed',false);
END $function$;
REVOKE ALL ON FUNCTION
 public.reality_read_signed_existing_maintenance_artifact_scope_v1(uuid,uuid)
 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION
 public.reality_record_signed_existing_maintenance_artifact_v1(
 uuid,uuid,uuid,text,text,text,text,text,text,text,bigint,bigint,bigint,text,text)
 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.reality_read_owner_maintenance_verified_artifacts_v1(uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_read_signed_existing_maintenance_artifact_scope_v1(uuid,uuid)
 TO service_role;
GRANT EXECUTE ON FUNCTION public.reality_record_signed_existing_maintenance_artifact_v1(
 uuid,uuid,uuid,text,text,text,text,text,text,text,bigint,bigint,bigint,text,text)
 TO service_role;
GRANT EXECUTE ON FUNCTION public.reality_read_owner_maintenance_verified_artifacts_v1(uuid)
 TO service_role;
