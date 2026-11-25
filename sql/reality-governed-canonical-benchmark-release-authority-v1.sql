-- Deployment-specific authoritative BENCHMARK variant of the existing
-- release controller. Do NOT install on production or the isolated branch.
-- Uses the SAME release approval ledger and existing one-use RPC names.
-- The isolated-only migration remains untouched.
DO $guard$ BEGIN
 IF pg_catalog.to_regclass('cron.job') IS NULL OR
    pg_catalog.to_regprocedure('public.reality_read_final_loop_shared_continuity_guard_v1(uuid)') IS NULL OR
    pg_catalog.to_regclass('reality_internal.governed_worker_release_approvals_v1') IS NOT NULL
 THEN RAISE EXCEPTION 'CANONICAL_BENCHMARK_RELEASE_INSTALL_SCOPE_UNVERIFIED';END IF;
END $guard$;
CREATE TABLE IF NOT EXISTS reality_internal.governed_worker_release_approvals_v1 (
 request_id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
 owner_id uuid NOT NULL,
 shift_id uuid NOT NULL,
 scheduled_alias text NOT NULL
  CHECK(scheduled_alias ~ '^[a-z0-9-]{6,145}\.vercel\.app$'
    AND scheduled_alias !~ '^reality-git-'),
 release_sha text NOT NULL CHECK(release_sha ~ '^[a-f0-9]{40}$'),
 release_ref text NOT NULL CHECK(release_ref ~ '^[A-Za-z0-9][A-Za-z0-9/_-]{3,145}$'),
 capability_key text NOT NULL CHECK(capability_key ~ '^[A-Z][A-Z0-9_]{3,110}$'),
 previous_release_sha text NOT NULL CHECK(previous_release_sha ~ '^[a-f0-9]{40}$'),
 previous_release_ref text NOT NULL
  CHECK(previous_release_ref ~ '^[A-Za-z0-9][A-Za-z0-9/_-]{3,145}$'),
 independent_ci_run_id bigint NOT NULL CHECK(independent_ci_run_id>0),
 provider_release_proof_sha256 text NOT NULL
  CHECK(provider_release_proof_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 independent_isolation_proof_sha256 text NOT NULL
  CHECK(independent_isolation_proof_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 runtime_scope jsonb NOT NULL CHECK(pg_catalog.jsonb_typeof(runtime_scope)='object'),
 proposal_fingerprint text NOT NULL UNIQUE
  CHECK(proposal_fingerprint ~ '^sha256:[a-f0-9]{64}$'),
 state text NOT NULL DEFAULT 'PREPARED'
  CHECK(state IN ('PREPARED','APPROVED_ONCE','CLAIMED_ONCE')),
 prepared_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
 expires_at timestamptz NOT NULL,
 approved_at timestamptz,
 approval_receipt_sha256 text
  CHECK(approval_receipt_sha256 IS NULL OR
    approval_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 claim_id uuid UNIQUE,
 claimed_at timestamptz,
 UNIQUE(shift_id,release_sha,capability_key,scheduled_alias)
);
ALTER TABLE reality_internal.governed_worker_release_approvals_v1
 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON reality_internal.governed_worker_release_approvals_v1
 FROM PUBLIC, anon, authenticated;
GRANT SELECT,INSERT,UPDATE
 ON reality_internal.governed_worker_release_approvals_v1 TO service_role;


-- The authoritative benchmark owns the existing shift and pg_cron.
-- The isolated database is a qualification environment, not the target
-- runtime database. Never treat a branch proof as proof of runtime identity.
-- This helper accepts only a service-controller observation of a candidate
-- release AND rechecks the current canonical shift, source and scheduler.
CREATE OR REPLACE FUNCTION reality_internal.canonical_worker_release_scope_current_v1(
 p_owner_id uuid,p_shift_id uuid,p_scheduled_alias text,p_scope jsonb
) RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE g jsonb; p jsonb; s jsonb; n int;
BEGIN
 IF current_user<>'service_role' OR p_owner_id IS NULL OR p_shift_id IS NULL
  OR pg_catalog.jsonb_typeof(p_scope) IS DISTINCT FROM 'object'
  OR pg_catalog.length(p_scope::text)>4500
  OR p_scope->>'target_environment' IS DISTINCT FROM 'CANONICAL_BENCHMARK_PREVIEW'
  OR p_scope->>'owner_id' IS DISTINCT FROM p_owner_id::text
  OR p_scope->>'shift_id' IS DISTINCT FROM p_shift_id::text
  OR p_scope->>'scheduled_alias' IS DISTINCT FROM p_scheduled_alias
  OR coalesce(p_scope->>'runtime_database_project_ref','') !~ '^[a-z0-9]{20}$'
  OR coalesce(p_scope->>'qualification_database_project_ref','') !~ '^[a-z0-9]{20}$'
  OR p_scope->>'runtime_database_project_ref'=p_scope->>'qualification_database_project_ref'
  OR p_scope->>'runtime_database_project_ref' IS DISTINCT FROM 'hvkfreoagbrphwghjajw'
  OR coalesce(p_scope->>'original_work_id','') !~ '^work:[a-f0-9]{32}$'
  OR coalesce(p_scope->>'source_ref','') !~ '^https://github[.]com/maloney2323/Reality/(issues|pull)/[1-9][0-9]*$'
  OR coalesce(p_scope->>'qualifier_receipt_sha256','') !~ '^sha256:[a-f0-9]{64}$'
  OR coalesce(p_scope->>'plan_fingerprint','') !~ '^sha256:[a-f0-9]{64}$'
  OR coalesce(p_scope->>'continuity_head_sha256','') !~ '^sha256:[a-f0-9]{64}$'
  OR coalesce(p_scope->>'continuity_revision','') !~ '^[1-9][0-9]{0,8}$'
  OR coalesce(p_scope->>'cron_job_id','') !~ '^[1-9][0-9]{0,8}$'
  OR coalesce(p_scope->>'gateway_ci_run_id','') !~ '^[1-9][0-9]{0,17}$'
  OR coalesce(p_scope->>'target_deployment_id','') !~ '^dpl_[A-Za-z0-9_-]{8,75}$'
  OR p_scope->>'runtime_same_shift_verified' IS DISTINCT FROM 'true'
  OR p_scope->>'independent_qualification_branch_verified' IS DISTINCT FROM 'true'
  OR p_scope->>'independent_gateway_ci_verified' IS DISTINCT FROM 'true'
  OR p_scope->>'child_execution_enabled' IS DISTINCT FROM 'false'
  OR p_scope->>'parent_delivery_enabled' IS DISTINCT FROM 'false'
  OR p_scope->>'production_changed' IS DISTINCT FROM 'false'
  OR coalesce(p_scope->>'capability_key','') NOT IN
   ('REQUALIFY_EXISTING_CONTINUITY_SOURCE','PREPARE_FINAL_LOOP_CHILD_OWNER_PACKET')
 THEN RETURN false; END IF;
 IF NOT EXISTS(SELECT 1 FROM reality_internal.governed_employee_shifts_v1 sh
  JOIN reality_internal.governed_employee_completion_warrants_v1 w
   ON w.shift_id=sh.shift_id AND w.owner_id=sh.owner_id AND w.plan_fingerprint=sh.plan_fingerprint
  WHERE sh.shift_id=p_shift_id AND sh.owner_id=p_owner_id
   AND sh.plan_fingerprint=p_scope->>'plan_fingerprint'
   AND sh.authorized_at IS NOT NULL AND sh.closed_at IS NULL
   AND sh.planned_start_at<=pg_catalog.clock_timestamp()
   AND sh.planned_end_at>pg_catalog.clock_timestamp()
   AND sh.status IN('RUNNING','QUEUED','AWAITING_EXACT_ORIGINAL_WORK')
   AND w.state='ACTIVE' AND w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS')
 THEN RETURN false; END IF;
 g:=public.reality_read_final_loop_shared_continuity_guard_v1(p_shift_id);
 p:=public.reality_read_current_final_loop_proof_envelope_v1(p_shift_id);
 IF g->>'status' IS DISTINCT FROM 'FINAL_LOOP_SHARED_CONTINUITY_CHECKED'
  OR g->>'owner_id' IS DISTINCT FROM p_owner_id::text OR g->>'shift_id' IS DISTINCT FROM p_shift_id::text
  OR p->>'status' IS DISTINCT FROM 'FINAL_LOOP_FROZEN_SCOPE_VERIFIED_ORIGINAL_ACCEPTANCE_PENDING'
  OR p->>'owner_id' IS DISTINCT FROM p_owner_id::text OR p->>'shift_id' IS DISTINCT FROM p_shift_id::text
  OR p->>'plan_fingerprint' IS DISTINCT FROM p_scope->>'plan_fingerprint'
  OR g->>'continuity_root_id' IS DISTINCT FROM p_scope->>'continuity_root_id'
  OR g->>'continuity_head_sha256' IS DISTINCT FROM p_scope->>'continuity_head_sha256'
  OR g->>'revision' IS DISTINCT FROM p_scope->>'continuity_revision'
  OR p->>'continuity_root_id' IS DISTINCT FROM g->>'continuity_root_id'
  OR p->>'continuity_head_sha256' IS DISTINCT FROM g->>'continuity_head_sha256'
  OR p->>'revision' IS DISTINCT FROM g->>'revision'
  OR p->>'frozen_shift_scope_sha256' IS DISTINCT FROM g->>'frozen_shift_scope_sha256'
  OR g->>'unverified_handoffs' IS DISTINCT FROM '0'
  OR g->>'first_signal_anchor_verified' IS DISTINCT FROM 'true'
  OR g->>'worldline_parent_links_verified' IS DISTINCT FROM 'true'
  OR g->>'shift_scope_authority_event_present' IS DISTINCT FROM 'true'
  OR g->>'read_only' IS DISTINCT FROM 'true'
  OR g->>'execution_authorized' IS DISTINCT FROM 'false'
  OR g->>'no_new_executable_authority' IS DISTINCT FROM 'true'
  OR g->>'original_job_completed' IS DISTINCT FROM 'false'
  OR g->>'production_changed' IS DISTINCT FROM 'false'
  OR pg_catalog.jsonb_typeof(g->'obligations') IS DISTINCT FROM 'array'
 THEN RETURN false; END IF;
 SELECT count(*) INTO n FROM pg_catalog.jsonb_array_elements(g->'obligations') o
 WHERE o->>'original_work_id'=p_scope->>'original_work_id'
  AND o->>'source_ref'=p_scope->>'source_ref'
  AND o->>'qualifier_receipt_sha256'=p_scope->>'qualifier_receipt_sha256'
  AND o->>'qualifier_digest_verified'='true'
  AND o->>'continuity_identity_verified'='true'
  AND o->>'source_proof_verified'='true'
  AND o->>'execution_permitted_by_handoff'='false'
  AND o->>'independent_original_outcome_verified'='false';
 IF n<>1 THEN RETURN false;END IF;
 s:=public.reality_read_governed_worker_release_schedule_v1((p_scope->>'cron_job_id')::bigint);
 RETURN s->>'status'='GOVERNED_RELEASE_CRON_SCHEDULE_READ_ONLY'
  AND s->>'host'=p_scheduled_alias AND s->>'active'='true'
  AND s->>'credential_values_exposed'='false' AND s->>'method'='POST'
  AND s->>'endpoint_path'='/api/reality/governed-employee-shift-worker'
  AND s->>'read_only'='true';
END $fn$;
REVOKE ALL ON FUNCTION reality_internal.canonical_worker_release_scope_current_v1(uuid,uuid,text,jsonb)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION reality_internal.canonical_worker_release_scope_current_v1(uuid,uuid,text,jsonb) TO service_role;
-- Service prepares exact owner-facing release packet using externally
-- verified CI/provider and independent isolation proof digests. This
-- preparation cannot approve the packet or touch the scheduled target.
CREATE OR REPLACE FUNCTION public.reality_prepare_governed_signed_worker_release_v1(
 p_owner_id uuid,p_shift_id uuid,
 p_scheduled_alias text,p_release_sha text,p_release_ref text,
 p_capability_key text,p_previous_release_sha text,
 p_previous_release_ref text,p_independent_ci_run_id bigint,
 p_provider_release_proof_sha256 text,
 p_independent_isolation_proof_sha256 text,p_runtime_scope jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER
 SET search_path='' AS $fn$
DECLARE existing record; fp text; new_id uuid;
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'SIGNED_RELEASE_PREPARE_SERVICE_ONLY';
 END IF;
 IF p_scheduled_alias !~ '^[a-z0-9-]{6,145}[.]vercel[.]app$'
    OR p_scheduled_alias ~ '^reality-git-'
    OR p_release_sha !~ '^[a-f0-9]{40}$'
    OR p_release_ref !~ '^[A-Za-z0-9][A-Za-z0-9/_-]{3,145}$'
    OR p_capability_key !~ '^[A-Z][A-Z0-9_]{3,110}$'
    OR p_previous_release_sha !~ '^[a-f0-9]{40}$'
    OR p_previous_release_ref !~ '^[A-Za-z0-9][A-Za-z0-9/_-]{3,145}$'
    OR p_independent_ci_run_id IS NULL OR p_independent_ci_run_id<1
    OR p_provider_release_proof_sha256 !~ '^sha256:[a-f0-9]{64}$'
    OR p_independent_isolation_proof_sha256 !~ '^sha256:[a-f0-9]{64}$' THEN
  RAISE EXCEPTION 'SIGNED_RELEASE_EXACT_PROOF_REQUIRED';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM reality_internal.governed_employee_shifts_v1 s
     WHERE s.shift_id=p_shift_id AND s.owner_id=p_owner_id
       AND s.authorized_at IS NOT NULL AND s.closed_at IS NULL) THEN
  RAISE EXCEPTION 'SIGNED_RELEASE_EXISTING_AUTHORIZED_SHIFT_REQUIRED';
 END IF;
 IF NOT coalesce(reality_internal.canonical_worker_release_scope_current_v1(p_owner_id,p_shift_id,p_scheduled_alias,p_runtime_scope),false)
  OR p_runtime_scope->>'release_sha' IS DISTINCT FROM p_release_sha
  OR p_runtime_scope->>'release_ref' IS DISTINCT FROM p_release_ref
  OR p_runtime_scope->>'capability_key' IS DISTINCT FROM p_capability_key
  OR p_runtime_scope->>'provider_release_proof_sha256' IS DISTINCT FROM p_provider_release_proof_sha256
  OR p_runtime_scope->>'independent_isolation_proof_sha256' IS DISTINCT FROM p_independent_isolation_proof_sha256
 THEN RAISE EXCEPTION 'SIGNED_RELEASE_CANONICAL_RUNTIME_SCOPE_UNVERIFIED';END IF;
 fp:='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
  pg_catalog.concat_ws('|',p_owner_id::text,p_shift_id::text,
    p_scheduled_alias,p_release_sha,p_release_ref,p_capability_key,
    p_previous_release_sha,p_previous_release_ref,
    p_independent_ci_run_id::text,p_provider_release_proof_sha256,
    p_independent_isolation_proof_sha256,p_runtime_scope::text),'UTF8')),'hex');
 INSERT INTO reality_internal.governed_worker_release_approvals_v1(
  owner_id,shift_id,scheduled_alias,release_sha,release_ref,
  capability_key,previous_release_sha,previous_release_ref,
  independent_ci_run_id,provider_release_proof_sha256,
  independent_isolation_proof_sha256,runtime_scope,proposal_fingerprint,expires_at
 ) VALUES(p_owner_id,p_shift_id,p_scheduled_alias,p_release_sha,p_release_ref,
  p_capability_key,p_previous_release_sha,p_previous_release_ref,
  p_independent_ci_run_id,p_provider_release_proof_sha256,
  p_independent_isolation_proof_sha256,p_runtime_scope,fp,
  pg_catalog.clock_timestamp()+interval '30 minutes')
 ON CONFLICT DO NOTHING RETURNING request_id INTO new_id;
 IF new_id IS NULL THEN
  SELECT * INTO existing
   FROM reality_internal.governed_worker_release_approvals_v1
   WHERE shift_id=p_shift_id AND release_sha=p_release_sha
     AND capability_key=p_capability_key AND scheduled_alias=p_scheduled_alias;
  IF NOT FOUND OR existing.proposal_fingerprint<>fp
     OR existing.expires_at<=pg_catalog.clock_timestamp() THEN
   RETURN pg_catalog.jsonb_build_object(
    'status','SIGNED_RELEASE_STALE_OR_DIFFERENT_PACKET_NO_REPLAY');
  END IF;
  new_id:=existing.request_id;
 END IF;
 RETURN pg_catalog.jsonb_build_object(
  'status','SIGNED_RELEASE_EXACT_OWNER_PACKET_PREPARED',
  'request_id',new_id,'owner_id',p_owner_id,'shift_id',p_shift_id,
  'release_sha',p_release_sha,'release_ref',p_release_ref,
  'scheduled_alias',p_scheduled_alias,'capability_key',p_capability_key,
  'proposal_fingerprint',fp,'runtime_scope',p_runtime_scope,'target_environment','CANONICAL_BENCHMARK_PREVIEW','owner_approval_granted',false,
  'release_changed',false,'original_job_completed',false);
END $fn$;

-- Authenticated owner must explicitly approve the pinned packet.
-- No user-controlled ID can approve another owner's request.
CREATE OR REPLACE FUNCTION public.reality_owner_approve_governed_signed_worker_release_v1(
 p_request_id uuid,p_proposal_fingerprint text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
 SET search_path='' AS $fn$
DECLARE rec record; receipt text; now_at timestamptz :=
 pg_catalog.clock_timestamp();
BEGIN
 IF auth.jwt()->>'role' IS DISTINCT FROM 'authenticated'
    OR auth.uid() IS NULL
    OR p_proposal_fingerprint !~ '^sha256:[a-f0-9]{64}$' THEN
  RAISE EXCEPTION 'SIGNED_RELEASE_AUTHENTICATED_OWNER_REQUIRED';
 END IF;
 SELECT * INTO rec
 FROM reality_internal.governed_worker_release_approvals_v1
 WHERE request_id=p_request_id AND owner_id=auth.uid()
   AND proposal_fingerprint=p_proposal_fingerprint
   AND state='PREPARED' AND expires_at>now_at
   AND EXISTS(SELECT 1 FROM reality_internal.governed_employee_shifts_v1 s
    WHERE s.shift_id=governed_worker_release_approvals_v1.shift_id AND s.owner_id=auth.uid()
      AND s.plan_fingerprint=governed_worker_release_approvals_v1.runtime_scope->>'plan_fingerprint'
      AND s.authorized_at IS NOT NULL AND s.closed_at IS NULL AND s.planned_end_at>now_at)
   FOR UPDATE;
 IF NOT FOUND THEN
  RETURN pg_catalog.jsonb_build_object(
   'status','SIGNED_RELEASE_EXACT_OWNER_PACKET_NOT_APPROVABLE',
   'owner_approval_granted',false);
 END IF;
 receipt:='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
  pg_catalog.concat_ws('|','APPROVED',p_request_id::text,
   rec.proposal_fingerprint,rec.owner_id::text,now_at::text),'UTF8')),'hex');
 UPDATE reality_internal.governed_worker_release_approvals_v1
 SET state='APPROVED_ONCE',approved_at=now_at,
  approval_receipt_sha256=receipt
 WHERE request_id=rec.request_id AND state='PREPARED';
 RETURN pg_catalog.jsonb_build_object(
  'status','EXACT_PREVIEW_RELEASE_OWNER_APPROVED',
  'owner_id',rec.owner_id,'shift_id',rec.shift_id,
  'release_sha',rec.release_sha,'release_ref',rec.release_ref,
  'scheduled_alias',rec.scheduled_alias,
  'capability_key',rec.capability_key,'receipt_sha256',receipt,
  'approved_at',now_at,'runtime_scope',rec.runtime_scope,'target_environment','CANONICAL_BENCHMARK_PREVIEW',
  'production_change_permitted',false,'release_changed',false);
END $fn$;

-- Optional service-only approval read for the independent dispatcher.
CREATE OR REPLACE FUNCTION public.reality_read_governed_signed_worker_release_approval_v1(
 p_owner_id uuid,p_shift_id uuid,p_release_sha text,
 p_scheduled_alias text,p_capability_key text
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER
 SET search_path='' AS $fn$
DECLARE a record;
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'SIGNED_RELEASE_APPROVAL_READ_SERVICE_ONLY';
 END IF;
 SELECT * INTO a FROM
  reality_internal.governed_worker_release_approvals_v1
 WHERE owner_id=p_owner_id AND shift_id=p_shift_id
   AND release_sha=p_release_sha AND scheduled_alias=p_scheduled_alias
   AND capability_key=p_capability_key
   AND state='APPROVED_ONCE'
   AND expires_at>pg_catalog.clock_timestamp()
   AND reality_internal.canonical_worker_release_scope_current_v1(owner_id,shift_id,scheduled_alias,runtime_scope);
 IF NOT FOUND THEN
  RETURN pg_catalog.jsonb_build_object(
   'status','SIGNED_RELEASE_EXACT_OWNER_APPROVAL_NOT_FOUND',
   'owner_approval_granted',false);
 END IF;
 RETURN pg_catalog.jsonb_build_object(
  'status','EXACT_PREVIEW_RELEASE_OWNER_APPROVED',
  'owner_id',a.owner_id,'shift_id',a.shift_id,
  'release_sha',a.release_sha,'release_ref',a.release_ref,
  'scheduled_alias',a.scheduled_alias,
  'capability_key',a.capability_key,
  'receipt_sha256',a.approval_receipt_sha256,
  'approved_at',a.approved_at,'runtime_scope',a.runtime_scope,
  'target_environment','CANONICAL_BENCHMARK_PREVIEW',
  'production_change_permitted',false);
END $fn$;

-- Atomic one-use owner-approved claim. No provider mutation here.
CREATE OR REPLACE FUNCTION public.reality_claim_governed_signed_worker_release_v1(
 p_owner_id uuid,p_shift_id uuid,p_release_sha text,p_release_ref text,
 p_capability_key text,p_scheduled_alias text,
 p_previous_release_sha text,p_previous_release_ref text,
 p_independent_ci_run_id bigint,p_runtime_scope jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER
 SET search_path='' AS $fn$
DECLARE r record; claim uuid:=pg_catalog.gen_random_uuid();
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'SIGNED_RELEASE_CLAIM_SERVICE_ONLY';
 END IF;
 UPDATE reality_internal.governed_worker_release_approvals_v1 a
 SET state='CLAIMED_ONCE',claim_id=claim,
  claimed_at=pg_catalog.clock_timestamp()
 WHERE a.owner_id=p_owner_id AND a.shift_id=p_shift_id
   AND a.release_sha=p_release_sha AND a.release_ref=p_release_ref
   AND a.capability_key=p_capability_key
   AND a.scheduled_alias=p_scheduled_alias
   AND a.previous_release_sha=p_previous_release_sha
   AND a.previous_release_ref=p_previous_release_ref
   AND a.independent_ci_run_id=p_independent_ci_run_id
   AND a.runtime_scope=p_runtime_scope
   AND reality_internal.canonical_worker_release_scope_current_v1(a.owner_id,a.shift_id,a.scheduled_alias,a.runtime_scope)
   AND a.state='APPROVED_ONCE'
   AND a.expires_at>pg_catalog.clock_timestamp()
   AND a.approval_receipt_sha256 IS NOT NULL
 RETURNING * INTO r;
 IF NOT FOUND THEN
  RETURN pg_catalog.jsonb_build_object(
   'status','SIGNED_RELEASE_EXACT_ONE_USE_AUTHORITY_MISSING',
   'one_use_service_claim',false,'owner_approved_exact_release',false,
   'production_change_permitted',false);
 END IF;
 RETURN pg_catalog.jsonb_build_object(
  'status','EXACT_SIGNED_CAPABILITY_DELIVERY_CLAIMED',
  'owner_id',r.owner_id,'shift_id',r.shift_id,
  'release_sha',r.release_sha,'release_ref',r.release_ref,
  'capability_key',r.capability_key,'scheduled_alias',r.scheduled_alias,
  'previous_release_sha',r.previous_release_sha,
  'previous_release_ref',r.previous_release_ref,
  'independent_ci_run_id',r.independent_ci_run_id,'runtime_scope',r.runtime_scope,
  'target_environment','CANONICAL_BENCHMARK_PREVIEW',
  'one_use_service_claim',true,'owner_approved_exact_release',true,
  'claim_id',r.claim_id,
  'approval_receipt_sha256',r.approval_receipt_sha256,
  'production_change_permitted',false,'original_job_completed',false);
END $fn$;

REVOKE ALL ON FUNCTION
 public.reality_prepare_governed_signed_worker_release_v1(
 uuid,uuid,text,text,text,text,text,text,bigint,text,text,jsonb)
 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION
 public.reality_claim_governed_signed_worker_release_v1(
 uuid,uuid,text,text,text,text,text,text,bigint,jsonb)
 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION
 public.reality_read_governed_signed_worker_release_approval_v1(
 uuid,uuid,text,text,text)
 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION
 public.reality_owner_approve_governed_signed_worker_release_v1(uuid,text)
 FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION
 public.reality_prepare_governed_signed_worker_release_v1(
 uuid,uuid,text,text,text,text,text,text,bigint,text,text,jsonb)
 TO service_role;
GRANT EXECUTE ON FUNCTION
 public.reality_claim_governed_signed_worker_release_v1(
 uuid,uuid,text,text,text,text,text,text,bigint,jsonb)
 TO service_role;
GRANT EXECUTE ON FUNCTION
 public.reality_read_governed_signed_worker_release_approval_v1(
 uuid,uuid,text,text,text)
 TO service_role;
GRANT EXECUTE ON FUNCTION
 public.reality_owner_approve_governed_signed_worker_release_v1(uuid,text)
 TO authenticated;
