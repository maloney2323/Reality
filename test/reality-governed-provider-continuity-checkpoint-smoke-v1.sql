-- Ephemeral PostgreSQL fixture: real checkpoint functions and uniqueness;
-- synthetic existing shift/guard readbacks, no live database or credentials.
\set ON_ERROR_STOP on
CREATE SCHEMA reality_internal;
GRANT USAGE ON SCHEMA reality_internal TO service_role;
CREATE TABLE reality_internal.governed_employee_shifts_v1 (
 shift_id uuid PRIMARY KEY, owner_id uuid NOT NULL, plan_fingerprint text NOT NULL,
 authorized_at timestamptz, closed_at timestamptz, status text,
 planned_start_at timestamptz, planned_end_at timestamptz
);
CREATE TABLE reality_internal.owner_shift_continuity_incidents_v1 (
 incident_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),owner_id uuid NOT NULL,shift_id uuid NOT NULL,
 kind text NOT NULL CONSTRAINT owner_shift_continuity_incidents_v1_kind_check CHECK(kind IN ('SIGNED_FINAL_LOOP_CONTINUITY_BLOCKED')),
 evidence_key text NOT NULL,error_summary text NOT NULL,evidence_sha256 text NOT NULL,source_evidence jsonb NOT NULL,
 phase text NOT NULL,next_investigation_at timestamptz,first_detected_at timestamptz DEFAULT clock_timestamp(),
 investigation_attempts integer DEFAULT 0,UNIQUE(owner_id,shift_id,kind,evidence_key)
);
GRANT SELECT,UPDATE ON reality_internal.governed_employee_shifts_v1 TO service_role;
GRANT SELECT,INSERT ON reality_internal.owner_shift_continuity_incidents_v1 TO service_role;
CREATE TABLE reality_internal.checkpoint_smoke_fixture(revision bigint,head text);
INSERT INTO reality_internal.checkpoint_smoke_fixture VALUES(3,'sha256:'||repeat('b',64));
GRANT SELECT ON reality_internal.checkpoint_smoke_fixture TO service_role;
INSERT INTO reality_internal.governed_employee_shifts_v1 VALUES(
 '22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','sha256:'||repeat('a',64),
 clock_timestamp(),NULL,'RUNNING',clock_timestamp()-interval '1 hour','infinity');
CREATE FUNCTION public.reality_continuity_canonical_json_v1(p jsonb) RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE result text;
BEGIN
 IF p IS NULL OR jsonb_typeof(p)='null' THEN RETURN 'null'; END IF;
 IF jsonb_typeof(p)='object' THEN
 SELECT '{'||coalesce(string_agg(to_jsonb(k)::text||':'||public.reality_continuity_canonical_json_v1(v),',' ORDER BY k),'')||'}'
 INTO result FROM jsonb_each(p) pairs(k,v); RETURN result;
 ELSIF jsonb_typeof(p)='array' THEN
 SELECT '['||coalesce(string_agg(public.reality_continuity_canonical_json_v1(v),',' ORDER BY seq),'')||']'
 INTO result FROM jsonb_array_elements(p) WITH ORDINALITY items(v,seq); RETURN result;
 END IF; RETURN p::text;
END $$;
CREATE FUNCTION public.reality_read_current_final_loop_proof_envelope_v1(uuid) RETURNS jsonb LANGUAGE sql AS $$
 SELECT jsonb_build_object('status','FINAL_LOOP_FROZEN_SCOPE_VERIFIED_ORIGINAL_ACCEPTANCE_PENDING',
 'owner_id','11111111-1111-4111-8111-111111111111','continuity_root_id','33333333-3333-4333-8333-333333333333',
 'continuity_head_sha256',head,'revision',revision,'jobs',jsonb_build_array(jsonb_build_object(
 'original_work_id','work:'||repeat('d',32),'source_ref','https://github.com/example/repo/pull/1','independent_source_proof_verified',true)))
 FROM reality_internal.checkpoint_smoke_fixture $$;
CREATE FUNCTION public.reality_read_final_loop_shared_continuity_guard_v1(uuid) RETURNS jsonb LANGUAGE sql AS $$
 SELECT jsonb_build_object('status','FINAL_LOOP_SHARED_CONTINUITY_CHECKED',
 'owner_id','11111111-1111-4111-8111-111111111111','continuity_root_id','33333333-3333-4333-8333-333333333333',
 'continuity_head_sha256',head,'revision',revision,'obligations',jsonb_build_array(jsonb_build_object(
 'original_work_id','work:'||repeat('d',32),'source_ref','https://github.com/example/repo/pull/1',
 'qualifier_digest_verified',true,'continuity_identity_verified',true,'qualifier_receipt_sha256','sha256:'||repeat('c',64),
 'independent_original_outcome_verified',false))) FROM reality_internal.checkpoint_smoke_fixture $$;
\ir ../sql/reality-governed-provider-continuity-checkpoint-v1.sql
CREATE FUNCTION public.checkpoint_smoke_candidate(p_run bigint DEFAULT 100) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE c jsonb; d text;
BEGIN
 c:=jsonb_build_object('owner_id','11111111-1111-4111-8111-111111111111','shift_id','22222222-2222-4222-8222-222222222222',
 'original_work_id','work:'||repeat('d',32),'continuity_root_id','33333333-3333-4333-8333-333333333333',
 'continuity_revision',3,'continuity_head_sha256','sha256:'||repeat('b',64),'plan_fingerprint','sha256:'||repeat('a',64),
 'source_ref','https://github.com/example/repo/pull/1','qualifier_receipt_sha256','sha256:'||repeat('c',64),
 'release_ref','feature/smoke','release_sha',repeat('e',40),'connection_id','GITHUB_RELEASE_CI_READ:example/repo',
 'paused_step','GITHUB_LIFECYCLE_CI_READ','run_id',p_run,'policy_id','GOVERNED_GITHUB_READ_RECOVERY_V1');
 d:='sha256:'||encode(sha256(convert_to(public.reality_continuity_canonical_json_v1(c),'UTF8')),'hex');
 RETURN c||jsonb_build_object('input_digest',d,'idempotency_key',d,'failure_class','BOUND_CREDENTIAL_REJECTED_CAUSE_UNVERIFIED',
 'route','VERIFY_ISSUER_SCOPE_AND_RENEWAL_AUTHORITY','renewal_eligibility','REQUIRES_VERIFIED_ISSUER_CAUSE_AND_AUTHORITY',
 'evidence_signal','HTTP_STATUS','provider_http_status',401,'provider_failure_fingerprint','sha256:'||repeat('f',64),
 'state','CHECKPOINT_CANDIDATE_NOT_DURABLE','durable_freeze_verified',false,'renewal_authority_verified',false,'resume_permitted',false,
 'raw_secret_ignored','synthetic-marker-not-a-real-secret');
END $$;
DO $$ BEGIN
 IF has_function_privilege('authenticated','public.reality_record_governed_provider_checkpoint_v1(jsonb)','EXECUTE')
 OR has_function_privilege('anon','public.reality_read_governed_provider_checkpoint_v1(uuid,uuid,uuid)','EXECUTE')
 THEN RAISE EXCEPTION 'CHECKPOINT_PUBLIC_AUTHORITY_DRIFT'; END IF;
END $$;
SET ROLE service_role;
DO $$ DECLARE r jsonb; BEGIN
 r:=public.reality_record_governed_provider_checkpoint_v1(public.checkpoint_smoke_candidate());
 IF r->>'status' IS DISTINCT FROM 'PROVIDER_CHECKPOINT_RECORDED_OR_EXISTING' OR r->>'resume_permitted' IS DISTINCT FROM 'false'
 THEN RAISE EXCEPTION 'CHECKPOINT_WRITE_FAILED %',r;END IF;
END $$;
-- First transaction committed; discard the connection (simulated crash at
-- the precise commit/readback boundary).
\connect :DBNAME
SET ROLE service_role;
DO $$ DECLARE r jsonb; q jsonb; i record; BEGIN
 SELECT * INTO i FROM reality_internal.owner_shift_continuity_incidents_v1;
 r:=public.reality_record_governed_provider_checkpoint_v1(public.checkpoint_smoke_candidate());
 q:=public.reality_read_governed_provider_checkpoint_v1(i.owner_id,i.shift_id,i.incident_id);
 IF r->>'checkpoint_id' IS DISTINCT FROM i.incident_id::text
 OR q->>'status' IS DISTINCT FROM 'PROVIDER_CHECKPOINT_DURABLE_READBACK'
 OR q->>'receipt_sha256' IS DISTINCT FROM r->>'receipt_sha256'
 OR q->>'current_revision_matches' IS DISTINCT FROM 'true'
 OR q->>'resume_permitted' IS DISTINCT FROM 'false'
 OR q->>'lease_created' IS DISTINCT FROM 'false'
 OR q->>'execution_freeze_verified' IS DISTINCT FROM 'false'
 OR i.investigation_attempts<>0 OR i.next_investigation_at<>'infinity'::timestamptz
 OR i.source_evidence::text LIKE '%synthetic-marker%'
 OR (SELECT count(*) FROM reality_internal.owner_shift_continuity_incidents_v1)<>1
 THEN RAISE EXCEPTION 'CHECKPOINT_RECONNECT_OR_DEDUPE_FAILED % %',r,q; END IF;
END $$;
RESET ROLE;
UPDATE reality_internal.checkpoint_smoke_fixture SET revision=4,head='sha256:'||repeat('9',64);
SET ROLE service_role;
DO $$ DECLARE q jsonb; i record; BEGIN
 SELECT * INTO i FROM reality_internal.owner_shift_continuity_incidents_v1;
 q:=public.reality_read_governed_provider_checkpoint_v1(i.owner_id,i.shift_id,i.incident_id);
 IF q->>'current_revision_matches' IS DISTINCT FROM 'false' OR q->>'resume_permitted' IS DISTINCT FROM 'false'
 THEN RAISE EXCEPTION 'STALE_CHECKPOINT_READ_FAIL_OPEN'; END IF;
 q:=public.reality_record_governed_provider_checkpoint_v1(public.checkpoint_smoke_candidate(101));
 IF q->>'status' IS DISTINCT FROM 'PROVIDER_CHECKPOINT_CONTINUITY_STALE'
 OR (SELECT count(*) FROM reality_internal.owner_shift_continuity_incidents_v1)<>1
 THEN RAISE EXCEPTION 'STALE_CHECKPOINT_WRITE_FAIL_OPEN %',q;END IF;
END $$;
RESET ROLE;
