-- Isolated, single-use GitHub push transport proof for an already-authorized original.
-- This deliberately NEVER authorizes installation or changes the original job.
CREATE TABLE IF NOT EXISTS reality_internal.governed_original_acceptance_push_probes_v1(
 original_work_id text PRIMARY KEY REFERENCES reality_internal.governed_original_install_reviews_v1(original_work_id),
 attempt_id uuid UNIQUE NOT NULL,
 owner_id uuid NOT NULL, shift_id uuid NOT NULL,
 preflight_branch text NOT NULL CHECK(preflight_branch~'^reality/[A-Za-z0-9/_-]{10,135}$'),
 original_source_path text NOT NULL CHECK(original_source_path~'^src/[A-Za-z0-9/_-]+[.]js$'),
 original_source_blob_sha text NOT NULL CHECK(original_source_blob_sha~'^[a-f0-9]{40}$'),
 expected_preflight_parent_sha text NOT NULL CHECK(expected_preflight_parent_sha~'^[a-f0-9]{40}$'),
 inert_path text UNIQUE NOT NULL CHECK(inert_path~'^src/reality-ci-transport-probe-[a-f0-9-]{36}[.]txt$'),
 phase text NOT NULL DEFAULT 'STAGED' CHECK(phase IN
  ('STAGED','FENCED','PUSH_VERIFIED_AWAITING_CI',
   'CI_PUSH_INDEPENDENTLY_VERIFIED','EFFECT_UNVERIFIED')),
 fence_at timestamptz, github_commit_sha text UNIQUE,
 inert_blob_sha text, push_ci_run_id bigint UNIQUE,
 observed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 provider_receipt_at timestamptz, ci_receipt_at timestamptz,
 production_changed boolean NOT NULL DEFAULT false CHECK(production_changed=false)
);
ALTER TABLE reality_internal.governed_original_acceptance_push_probes_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON reality_internal.governed_original_acceptance_push_probes_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON reality_internal.governed_original_acceptance_push_probes_v1 TO service_role;

CREATE OR REPLACE FUNCTION public.reality_read_general_original_push_probe_v1()
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE p reality_internal.governed_original_acceptance_push_probes_v1%rowtype;
r reality_internal.governed_original_install_reviews_v1%rowtype; s record;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'PUSH_PROBE_SERVICE_ROLE_REQUIRED';END IF;
 SELECT * INTO p FROM reality_internal.governed_original_acceptance_push_probes_v1;
 IF NOT FOUND THEN RETURN jsonb_build_object('status','NO_CURRENT_AUTHORIZED_PUSH_PROBE');END IF;
 IF (SELECT count(*) FROM reality_internal.governed_original_acceptance_push_probes_v1)<>1
 THEN RAISE EXCEPTION 'PUSH_PROBE_EXACT_SCOPE_NOT_UNIQUE';END IF;
 SELECT * INTO r FROM reality_internal.governed_original_install_reviews_v1
 WHERE original_work_id=p.original_work_id;
 SELECT s0.* INTO s FROM reality_internal.governed_employee_shifts_v1 s0
 JOIN reality_internal.governed_employee_completion_warrants_v1 w
 ON w.shift_id=s0.shift_id AND w.owner_id=s0.owner_id AND w.plan_fingerprint=s0.plan_fingerprint
 WHERE s0.shift_id=p.shift_id AND w.state='ACTIVE' AND s0.closed_at IS NULL
 AND s0.planned_end_at='infinity'::timestamptz AND s0.authorized_at IS NOT NULL
 AND s0.status IN ('RUNNING','AWAITING_EXACT_ORIGINAL_WORK');
 IF NOT FOUND OR r.original_work_id IS NULL OR r.original_work_id<>p.original_work_id
 OR r.owner_id<>p.owner_id OR r.shift_id<>p.shift_id
 OR r.attempt_id<>p.attempt_id OR s.owner_id<>p.owner_id
 OR r.phase<>'REVIEW_STAGED_NOT_INSTALL_READY'
 OR r.approval_receipt_id IS NOT NULL OR r.installed_commit_sha IS NOT NULL
 OR r.original_final_receipt_id IS NOT NULL
 OR r.isolated_github_write_verified IS DISTINCT FROM true
 OR r.preview_auto_deploy_verified IS DISTINCT FROM true
 OR r.source_file_path<>p.original_source_path
 OR r.exact_install_target_branch=p.preflight_branch
 OR p.original_work_id IS NULL OR p.production_changed IS DISTINCT FROM false
 THEN RAISE EXCEPTION 'PUSH_PROBE_ORIGINAL_OR_CURRENT_OWNER_WARRANT_DRIFT';END IF;
 RETURN jsonb_build_object(
 'status',CASE p.phase
   WHEN 'STAGED' THEN 'EXACT_ISOLATED_PUSH_PROBE_STAGED'
   WHEN 'PUSH_VERIFIED_AWAITING_CI' THEN 'EXACT_ISOLATED_PUSH_CI_READBACK_PENDING'
   WHEN 'CI_PUSH_INDEPENDENTLY_VERIFIED' THEN 'EXACT_ISOLATED_PUSH_AND_CI_INDEPENDENTLY_VERIFIED'
   ELSE 'EXACT_ISOLATED_PUSH_FENCED_OR_UNVERIFIED' END,
 'phase',p.phase,'original_work_id',p.original_work_id,'attempt_id',p.attempt_id,
 'owner_id',p.owner_id,'shift_id',p.shift_id,'preflight_branch',p.preflight_branch,
 'original_source_path',p.original_source_path,'original_source_blob_sha',p.original_source_blob_sha,
 'expected_preflight_parent_sha',p.expected_preflight_parent_sha,
 'inert_path',p.inert_path,'github_commit_sha',p.github_commit_sha,
 'inert_blob_sha',p.inert_blob_sha,'push_ci_run_id',p.push_ci_run_id,
 'installation_authorized',false,'source_installed',false,
 'original_job_completed',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_read_general_original_push_probe_v1() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_read_general_original_push_probe_v1() TO service_role;

CREATE OR REPLACE FUNCTION public.reality_claim_general_original_push_probe_v1(
 p_attempt_id uuid,p_current_parent_sha text,p_current_source_blob_sha text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE p reality_internal.governed_original_acceptance_push_probes_v1%rowtype;
v jsonb;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'PUSH_PROBE_SERVICE_ROLE_REQUIRED';END IF;
 v:=public.reality_read_general_original_push_probe_v1();
 IF v->>'status'<>'EXACT_ISOLATED_PUSH_PROBE_STAGED'
 THEN RETURN jsonb_build_object('status','EXACT_ISOLATED_PUSH_NOT_ELIGIBLE_FOR_NEW_WRITE');END IF;
 SELECT * INTO p FROM reality_internal.governed_original_acceptance_push_probes_v1
 WHERE attempt_id=p_attempt_id FOR UPDATE;
 IF NOT FOUND OR p.phase<>'STAGED' OR p.fence_at IS NOT NULL
 OR p.expected_preflight_parent_sha<>p_current_parent_sha
 OR p.original_source_blob_sha<>p_current_source_blob_sha
 THEN RAISE EXCEPTION 'PUSH_PROBE_FENCE_PRECONDITION_DRIFT';END IF;
 UPDATE reality_internal.governed_original_acceptance_push_probes_v1
 SET phase='FENCED',fence_at=clock_timestamp()
 WHERE attempt_id=p_attempt_id AND phase='STAGED' AND fence_at IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'PUSH_PROBE_FENCE_ATOMIC_RACE';END IF;
 RETURN jsonb_build_object('status','EXACT_ISOLATED_PUSH_ONE_USE_FENCED',
 'original_work_id',p.original_work_id,'attempt_id',p.attempt_id,
 'preflight_branch',p.preflight_branch,'inert_path',p.inert_path,
 'expected_preflight_parent_sha',p.expected_preflight_parent_sha,
 'original_source_blob_sha',p.original_source_blob_sha,
 'installation_authorized',false,'source_installed',false,
 'original_job_completed',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_claim_general_original_push_probe_v1(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_claim_general_original_push_probe_v1(uuid,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.reality_record_general_original_push_provider_v1(
 p_attempt_id uuid,p_success boolean,p_commit_sha text,p_blob_sha text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE p reality_internal.governed_original_acceptance_push_probes_v1%rowtype;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'PUSH_PROBE_SERVICE_ROLE_REQUIRED';END IF;
 SELECT * INTO p FROM reality_internal.governed_original_acceptance_push_probes_v1
 WHERE attempt_id=p_attempt_id FOR UPDATE;
 IF NOT FOUND OR p.phase<>'FENCED' OR p.fence_at IS NULL
 THEN RAISE EXCEPTION 'PUSH_PROBE_WRITE_RECEIPT_FENCE_REQUIRED';END IF;
 IF p_success IS TRUE AND (p_commit_sha!~'^[a-f0-9]{40}$' OR
    p_blob_sha!~'^[a-f0-9]{40}$') THEN
  RAISE EXCEPTION 'PUSH_PROBE_WRITE_SHA_UNVERIFIED';END IF;
 UPDATE reality_internal.governed_original_acceptance_push_probes_v1 SET
 phase=CASE WHEN p_success THEN 'PUSH_VERIFIED_AWAITING_CI' ELSE 'EFFECT_UNVERIFIED' END,
 github_commit_sha=CASE WHEN p_success THEN p_commit_sha ELSE NULL END,
 inert_blob_sha=CASE WHEN p_success THEN p_blob_sha ELSE NULL END,
 provider_receipt_at=clock_timestamp() WHERE attempt_id=p_attempt_id;
 RETURN jsonb_build_object('status',
 CASE WHEN p_success THEN 'EXACT_ISOLATED_SOURCE_PATH_PUSH_PROVIDER_VERIFIED'
 ELSE 'EXACT_ISOLATED_PUSH_EFFECT_UNVERIFIED' END,
 'original_work_id',p.original_work_id,'attempt_id',p.attempt_id,
 'github_commit_sha',CASE WHEN p_success THEN p_commit_sha ELSE NULL END,
 'installation_authorized',false,'source_installed',false,
 'original_job_completed',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_record_general_original_push_provider_v1(uuid,boolean,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_record_general_original_push_provider_v1(uuid,boolean,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.reality_record_general_original_push_ci_v1(
 p_attempt_id uuid,p_commit_sha text,p_run_id bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE p reality_internal.governed_original_acceptance_push_probes_v1%rowtype;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'PUSH_PROBE_SERVICE_ROLE_REQUIRED';END IF;
 SELECT * INTO p FROM reality_internal.governed_original_acceptance_push_probes_v1
 WHERE attempt_id=p_attempt_id FOR UPDATE;
 IF NOT FOUND OR p.phase<>'PUSH_VERIFIED_AWAITING_CI'
 OR p.github_commit_sha<>p_commit_sha OR p_run_id<=10000
 OR p.provider_receipt_at IS NULL THEN
  RAISE EXCEPTION 'PUSH_PROBE_INDEPENDENT_CI_PRECONDITION_DRIFT';END IF;
 UPDATE reality_internal.governed_original_acceptance_push_probes_v1 SET
 phase='CI_PUSH_INDEPENDENTLY_VERIFIED',push_ci_run_id=p_run_id,
 ci_receipt_at=clock_timestamp() WHERE attempt_id=p_attempt_id;
 RETURN jsonb_build_object('status','EXACT_ISOLATED_PUSH_AND_CI_INDEPENDENTLY_VERIFIED',
  'original_work_id',p.original_work_id,'attempt_id',p.attempt_id,
  'github_commit_sha',p_commit_sha,'push_ci_run_id',p_run_id,
  'installation_authorized',false,'source_installed',false,
  'original_job_completed',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_record_general_original_push_ci_v1(uuid,text,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_record_general_original_push_ci_v1(uuid,text,bigint) TO service_role;
