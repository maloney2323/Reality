-- Final Loop governed release control-plane.
-- Draft for an independently verified isolated preview DB only.
-- Do NOT apply to the shared benchmark, or treat this as approval.
-- The scheduled pg_cron command / secrets are never returned to a caller.

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

-- pg_cron itself remains the source of truth; this never echoes the
-- sensitive command, Vault query, authorization header, or SQL body.
CREATE OR REPLACE FUNCTION public.reality_read_governed_worker_release_schedule_v1(
 p_job_id bigint
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER
 SET search_path='' AS $fn$
DECLARE j record; h text; path text :=
 '/api/reality/governed-employee-shift-worker';
BEGIN
 IF current_user<>'service_role' OR p_job_id IS NULL OR p_job_id<1 THEN
  RAISE EXCEPTION 'GOVERNED_RELEASE_SCHEDULE_SERVICE_ONLY';
 END IF;
 SELECT jobid,jobname,schedule,active,command
 INTO j FROM cron.job WHERE jobid=p_job_id;
 IF NOT FOUND OR j.active IS DISTINCT FROM true
    OR j.command NOT ILIKE '%net.http_post%'
    OR (pg_catalog.length(j.command)-
        pg_catalog.length(pg_catalog.replace(j.command,path,'')))/
       pg_catalog.length(path)<>1 THEN
  RETURN pg_catalog.jsonb_build_object(
   'status','GOVERNED_RELEASE_CRON_SCHEDULE_UNVERIFIED',
   'credential_values_exposed',false);
 END IF;
 h:=pg_catalog.substring(j.command,
  'https://([a-z0-9-]+[.]vercel[.]app)/api/reality/governed-employee-shift-worker');
 IF h IS NULL THEN
  RETURN pg_catalog.jsonb_build_object(
   'status','GOVERNED_RELEASE_CRON_HOST_UNVERIFIED',
   'credential_values_exposed',false);
 END IF;
 RETURN pg_catalog.jsonb_build_object(
  'status','GOVERNED_RELEASE_CRON_SCHEDULE_READ_ONLY',
  'job_id',j.jobid,'job_name',j.jobname,
  'provider','SUPABASE_PG_CRON','schedule',j.schedule,
  'active',true,'method','POST','endpoint_path',path,
  'host',h,'credential_values_exposed',false,'read_only',true,
  'release_activated',false,'original_job_completed',false);
END $fn$;

-- Service prepares exact owner-facing release packet using externally
-- verified CI/provider and independent isolation proof digests. This
-- preparation cannot approve the packet or touch the scheduled target.
CREATE OR REPLACE FUNCTION public.reality_prepare_governed_signed_worker_release_v1(
 p_owner_id uuid,p_shift_id uuid,
 p_scheduled_alias text,p_release_sha text,p_release_ref text,
 p_capability_key text,p_previous_release_sha text,
 p_previous_release_ref text,p_independent_ci_run_id bigint,
 p_provider_release_proof_sha256 text,
 p_independent_isolation_proof_sha256 text
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
 fp:='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
  pg_catalog.concat_ws('|',p_owner_id::text,p_shift_id::text,
    p_scheduled_alias,p_release_sha,p_release_ref,p_capability_key,
    p_previous_release_sha,p_previous_release_ref,
    p_independent_ci_run_id::text,p_provider_release_proof_sha256,
    p_independent_isolation_proof_sha256),'UTF8')),'hex');
 INSERT INTO reality_internal.governed_worker_release_approvals_v1(
  owner_id,shift_id,scheduled_alias,release_sha,release_ref,
  capability_key,previous_release_sha,previous_release_ref,
  independent_ci_run_id,provider_release_proof_sha256,
  independent_isolation_proof_sha256,proposal_fingerprint,expires_at
 ) VALUES(p_owner_id,p_shift_id,p_scheduled_alias,p_release_sha,p_release_ref,
  p_capability_key,p_previous_release_sha,p_previous_release_ref,
  p_independent_ci_run_id,p_provider_release_proof_sha256,
  p_independent_isolation_proof_sha256,fp,
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
  'proposal_fingerprint',fp,'owner_approval_granted',false,
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
 IF pg_catalog.current_setting('request.jwt.claim.role',true)<>'authenticated'
    OR auth.uid() IS NULL
    OR p_proposal_fingerprint !~ '^sha256:[a-f0-9]{64}$' THEN
  RAISE EXCEPTION 'SIGNED_RELEASE_AUTHENTICATED_OWNER_REQUIRED';
 END IF;
 SELECT * INTO rec
 FROM reality_internal.governed_worker_release_approvals_v1
 WHERE request_id=p_request_id AND owner_id=auth.uid()
   AND proposal_fingerprint=p_proposal_fingerprint
   AND state='PREPARED' AND expires_at>now_at FOR UPDATE;
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
  'approved_at',now_at,'target_environment','ISOLATED_PREVIEW',
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
   AND expires_at>pg_catalog.clock_timestamp();
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
  'approved_at',a.approved_at,
  'target_environment','ISOLATED_PREVIEW',
  'production_change_permitted',false);
END $fn$;

-- Atomic one-use owner-approved claim. No provider mutation here.
CREATE OR REPLACE FUNCTION public.reality_claim_governed_signed_worker_release_v1(
 p_owner_id uuid,p_shift_id uuid,p_release_sha text,p_release_ref text,
 p_capability_key text,p_scheduled_alias text,
 p_previous_release_sha text,p_previous_release_ref text,
 p_independent_ci_run_id bigint
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
  'independent_ci_run_id',r.independent_ci_run_id,
  'target_environment','ISOLATED_PREVIEW',
  'one_use_service_claim',true,'owner_approved_exact_release',true,
  'claim_id',r.claim_id,
  'approval_receipt_sha256',r.approval_receipt_sha256,
  'production_change_permitted',false,'original_job_completed',false);
END $fn$;

REVOKE ALL ON FUNCTION
 public.reality_read_governed_worker_release_schedule_v1(bigint)
 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION
 public.reality_prepare_governed_signed_worker_release_v1(
 uuid,uuid,text,text,text,text,text,text,bigint,text,text)
 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION
 public.reality_claim_governed_signed_worker_release_v1(
 uuid,uuid,text,text,text,text,text,text,bigint)
 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION
 public.reality_read_governed_signed_worker_release_approval_v1(
 uuid,uuid,text,text,text)
 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION
 public.reality_owner_approve_governed_signed_worker_release_v1(uuid,text)
 FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION
 public.reality_read_governed_worker_release_schedule_v1(bigint)
 TO service_role;
GRANT EXECUTE ON FUNCTION
 public.reality_prepare_governed_signed_worker_release_v1(
 uuid,uuid,text,text,text,text,text,text,bigint,text,text)
 TO service_role;
GRANT EXECUTE ON FUNCTION
 public.reality_claim_governed_signed_worker_release_v1(
 uuid,uuid,text,text,text,text,text,text,bigint)
 TO service_role;
GRANT EXECUTE ON FUNCTION
 public.reality_read_governed_signed_worker_release_approval_v1(
 uuid,uuid,text,text,text)
 TO service_role;
GRANT EXECUTE ON FUNCTION
 public.reality_owner_approve_governed_signed_worker_release_v1(uuid,text)
 TO authenticated;
