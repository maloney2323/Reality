-- PostgreSQL 17 smoke validation for the migration in an ephemeral CI database.
-- Never copy, patch, claim or settle the original Reality benchmark.
CREATE ROLE service_role NOLOGIN;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA reality_internal;
GRANT USAGE ON SCHEMA reality_internal TO service_role;
\ir ../supabase/migrations/20261124033000_final_loop_proof_carrying_recovery_ledger_v1.sql
\ir ../supabase/migrations/20261124041000_final_loop_technical_ci_continuity_observation_v1.sql
DO $$
BEGIN
 IF (SELECT count(*) FROM reality_internal.final_loop_recovery_capability_registry_v1
  WHERE state='READY_SIGNED_ISOLATED_ONLY')<>0 THEN
  RAISE EXCEPTION 'RECOVERY_REGISTRY_MUST_BOOT_DISABLED';
 END IF;
 IF has_function_privilege('authenticated',
  'public.reality_freeze_final_loop_recovery_contract_v1(uuid,text,uuid,jsonb)',
  'EXECUTE') THEN
  RAISE EXCEPTION 'RECOVERY_FREEZE_MUST_NOT_BE_PUBLIC';
 END IF;
 IF NOT has_function_privilege('service_role',
  'public.reality_read_final_loop_recovery_contract_v1(uuid,text)','EXECUTE')
 THEN RAISE EXCEPTION 'RECOVERY_SERVICE_READBACK_NOT_GRANTED';END IF;
 IF has_function_privilege('authenticated',
  'public.reality_record_final_loop_technical_ci_observation_v1(text,uuid,jsonb)',
  'EXECUTE') THEN RAISE EXCEPTION 'TECHNICAL_CI_WRITE_EXPOSED';END IF;
 IF NOT has_function_privilege('service_role',
  'public.reality_read_final_loop_technical_ci_observation_v1(text)',
  'EXECUTE') THEN RAISE EXCEPTION 'TECHNICAL_CI_READ_NOT_SERVICE_SCOPED';END IF;
 IF (SELECT count(*) FROM reality_internal.final_loop_technical_ci_observations_v1)<>0
 THEN RAISE EXCEPTION 'TECHNICAL_CI_OBSERVATION_MUST_START_EMPTY';END IF;
END $$;
SET ROLE service_role;
DO $$
DECLARE v jsonb;
BEGIN
 v:=public.reality_read_final_loop_recovery_contract_v1(
  'ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce'::uuid,
  'work:315562fe1bd66b30a48bb9be4f1d162a');
 IF v->>'status'<>'RECOVERY_NO_DURABLE_CONTRACT' OR
  v->>'original_job_completed'<>'false' THEN
  RAISE EXCEPTION 'RECOVERY_NO_DURABLE_CONTRACT_FAIL_OPEN';END IF;
 v:=public.reality_read_final_loop_recovery_capability_v1(
  'REPRODUCE_CASE_SPECIFIC_FROZEN_RED');
 IF v->>'status'<>'RECOVERY_CAPABILITY_NOT_INDEPENDENTLY_REGISTERED'
 THEN RAISE EXCEPTION 'RECOVERY_MISSING_CAPABILITY_FAIL_OPEN';END IF;
 v:=public.reality_freeze_final_loop_recovery_contract_v1(
  'ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce'::uuid,
  'work:315562fe1bd66b30a48bb9be4f1d162a',
  '12345678-1234-4123-8123-123456789abc'::uuid,'{}'::jsonb);
 IF v->>'status'<>'RECOVERY_FREEZE_CONTRACT_INVALID'
 THEN RAISE EXCEPTION 'RECOVERY_INVALID_CONTRACT_FAIL_OPEN';END IF;
 v:=public.reality_read_final_loop_technical_ci_observation_v1(
  'sha256:'||repeat('a',64));
 IF v->>'status'<>'RECOVERY_TECHNICAL_CI_NOT_DURABLY_OBSERVED' OR
  v->>'business_original_red_verified'<>'false'
 THEN RAISE EXCEPTION 'TECHNICAL_CI_MISSING_OBSERVATION_FAIL_OPEN';END IF;
 v:=public.reality_record_final_loop_technical_ci_observation_v1(
  'sha256:'||repeat('a',64),
  '12345678-1234-4123-8123-123456789abc'::uuid,'{}'::jsonb);
 IF v->>'status'<>'RECOVERY_TECH_CI_SOURCE_PROOF_INVALID_NO_WRITE'
 THEN RAISE EXCEPTION 'TECHNICAL_CI_INVALID_PROOF_FAIL_OPEN';END IF;
END $$;
RESET ROLE;

-- Compile the actual builder SQL in PostgreSQL, not just JS string assertions.
-- This deliberately minimal empty relation is a compile-only fixture for the
-- ALTER in the existing SQL. No real shift, warrant or provider proof is made.
CREATE TABLE reality_internal.owner_internal_maintenance_jobs_v1(
 incident_id uuid PRIMARY KEY
);
SET check_function_bodies = on;
\ir ../sql/reality-signed-maintenance-frozen-test-build-v1.sql
DO $$
BEGIN
 IF NOT has_function_privilege('service_role',
  'reality_internal.signed_frozen_test_build_scope_v1(uuid,uuid,uuid,text)','EXECUTE')
  OR has_function_privilege('authenticated',
  'reality_internal.signed_frozen_test_build_scope_v1(uuid,uuid,uuid,text)','EXECUTE')
 THEN RAISE EXCEPTION 'FROZEN_BUILDER_SCOPE_AUTHORITY_DRIFT';END IF;
END $$;
-- Do not leave the compile fixture in place for the next smoke script.
DROP TABLE reality_internal.owner_internal_maintenance_jobs_v1;
