-- PostgreSQL 17 smoke validation for the migration in an ephemeral CI database.
-- Never copy, patch, claim or settle the original Reality benchmark.
CREATE ROLE service_role NOLOGIN;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA reality_internal;
GRANT USAGE ON SCHEMA reality_internal TO service_role;
\ir ../supabase/migrations/20261124033000_final_loop_proof_carrying_recovery_ledger_v1.sql
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
END $$;
RESET ROLE;
