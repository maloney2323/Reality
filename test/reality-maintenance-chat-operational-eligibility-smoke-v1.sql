\set ON_ERROR_STOP on
-- Ephemeral Postgres fixtures, never the benchmark or production database.
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
END $$;
CREATE SCHEMA reality_internal;
CREATE TABLE public.reality_chat_messages(id uuid PRIMARY KEY,user_id uuid,conversation_id uuid,request_id uuid,role text,content text);
CREATE TABLE reality_internal.chat_work_handoffs_v1(
 message_id uuid PRIMARY KEY,owner_id uuid,conversation_id uuid,request_id uuid,message_sha256 text,status text DEFAULT 'PENDING',created_at timestamptz DEFAULT now(),
 shift_id uuid,plan_fingerprint text,claim_id uuid,claimed_at timestamptz,claim_expires_at timestamptz);
CREATE TABLE reality_internal.governed_employee_shifts_v1(
 shift_id uuid PRIMARY KEY,owner_id uuid,plan_fingerprint text,authorized_at timestamptz,closed_at timestamptz,status text,planned_start_at timestamptz,planned_end_at timestamptz);
CREATE TABLE reality_internal.governed_employee_completion_warrants_v1(
 shift_id uuid PRIMARY KEY,owner_id uuid,plan_fingerprint text,state text,mode text,source_scope jsonb);
CREATE TABLE reality_internal.owner_internal_maintenance_jobs_v1(
 incident_id uuid PRIMARY KEY,owner_id uuid,source_ref text,origin_shift_id uuid,independent_review_receipt_sha256 text,original_job_completed boolean,production_changed boolean);
GRANT USAGE ON SCHEMA reality_internal TO service_role;
GRANT SELECT,INSERT,UPDATE ON ALL TABLES IN SCHEMA reality_internal TO service_role;
GRANT SELECT ON public.reality_chat_messages TO service_role;
\ir ../sql/reality-maintenance-chat-operational-eligibility-v1.sql
INSERT INTO reality_internal.governed_employee_shifts_v1 VALUES
 ('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','fingerprint',now()-interval '1 hour',null,'RUNNING',now()-interval '1 hour',now()+interval '1 hour');
INSERT INTO reality_internal.owner_internal_maintenance_jobs_v1 VALUES
 ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','world:dispatch:job-42','40000000-0000-4000-8000-000000000001','sha256:'||repeat('a',64),false,false);
INSERT INTO reality_internal.governed_employee_completion_warrants_v1
 SELECT s.shift_id,s.owner_id,s.plan_fingerprint,'ACTIVE','UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS',
 jsonb_build_array(jsonb_build_object('maintenance_id',i.incident_id,'source_ref',i.source_ref,'origin_shift_id',i.origin_shift_id,'independent_review_receipt_sha256',i.independent_review_receipt_sha256,'step_index',0))
 FROM reality_internal.governed_employee_shifts_v1 s CROSS JOIN reality_internal.owner_internal_maintenance_jobs_v1 i;
INSERT INTO public.reality_chat_messages VALUES
 ('50000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001','user','Could you keep working on the interrupted dispatch review?');
INSERT INTO reality_internal.chat_work_handoffs_v1(message_id,owner_id,conversation_id,request_id,message_sha256)
 SELECT id,user_id,conversation_id,request_id,encode(sha256(convert_to(content,'UTF8')),'hex') FROM public.reality_chat_messages;
DO $$ BEGIN
 IF has_function_privilege('anon','public.reality_claim_signed_maintenance_chat_investigation_v1()','EXECUTE') OR
 has_function_privilege('authenticated','public.reality_claim_signed_maintenance_chat_investigation_v1()','EXECUTE') THEN RAISE EXCEPTION 'CLAIM_PUBLICLY_EXECUTABLE'; END IF;
END $$;
SET ROLE service_role;
DO $$ DECLARE j jsonb; BEGIN
 j:=public.reality_claim_signed_maintenance_chat_investigation_v1();
 IF j->>'status' IS DISTINCT FROM 'AUTHENTICATED_CHAT_WORK_LEASED_TO_EXISTING_SHIFT'
 OR j->>'shift_id' IS DISTINCT FROM '10000000-0000-4000-8000-000000000001'
 OR j->>'investigation_only' IS DISTINCT FROM 'true'
 OR j->>'execution_authorized' IS DISTINCT FROM 'false'
 OR j->>'installation_authorized' IS DISTINCT FROM 'false'
 OR j->>'new_shift_started' IS DISTINCT FROM 'false'
 OR j->>'new_job_created' IS DISTINCT FROM 'false'
 OR j->>'original_job_completed' IS DISTINCT FROM 'false'
 OR j->>'production_changed' IS DISTINCT FROM 'false'
 OR j->'source_scope'->0->>'source_ref' IS DISTINCT FROM 'world:dispatch:job-42'
 THEN RAISE EXCEPTION 'GENERALIZED_MAINTENANCE_CLAIM_FAILED: %',j;END IF;
 j:=public.reality_claim_signed_maintenance_chat_investigation_v1();
 IF j->>'status' IS DISTINCT FROM 'NO_PENDING_SIGNED_MAINTENANCE_CHAT_INVESTIGATION' THEN RAISE EXCEPTION 'DUPLICATE_CLAIM';END IF;
END $$;
RESET ROLE;
-- Each negative case reuses a synthetic pending message, not an actual replay.
UPDATE reality_internal.chat_work_handoffs_v1 SET status='PENDING',claim_id=null;
UPDATE reality_internal.owner_internal_maintenance_jobs_v1 SET independent_review_receipt_sha256='wrong';
SET ROLE service_role;
DO $$ BEGIN IF public.reality_claim_signed_maintenance_chat_investigation_v1()->>'status' <> 'NO_PENDING_SIGNED_MAINTENANCE_CHAT_INVESTIGATION' THEN RAISE EXCEPTION 'BAD_RECEIPT_ADMITTED'; END IF; END $$;
RESET ROLE;
UPDATE reality_internal.owner_internal_maintenance_jobs_v1 SET independent_review_receipt_sha256='sha256:'||repeat('a',64);
UPDATE reality_internal.chat_work_handoffs_v1 SET created_at=now()-interval '2 hours';
SET ROLE service_role;
DO $$ BEGIN IF public.reality_claim_signed_maintenance_chat_investigation_v1()->>'status' <> 'NO_PENDING_SIGNED_MAINTENANCE_CHAT_INVESTIGATION' THEN RAISE EXCEPTION 'PREAUTH_CHAT_ADMITTED'; END IF; END $$;
RESET ROLE;
UPDATE reality_internal.chat_work_handoffs_v1 SET created_at=now();
UPDATE reality_internal.governed_employee_shifts_v1 SET planned_end_at=now()-interval '1 second';
SET ROLE service_role;
DO $$ BEGIN IF public.reality_claim_signed_maintenance_chat_investigation_v1()->>'status' <> 'NO_PENDING_SIGNED_MAINTENANCE_CHAT_INVESTIGATION' THEN RAISE EXCEPTION 'EXPIRED_SHIFT_ADMITTED'; END IF; END $$;
RESET ROLE;
UPDATE reality_internal.governed_employee_shifts_v1 SET planned_end_at=now()+interval '1 hour';
INSERT INTO reality_internal.governed_employee_shifts_v1 SELECT '10000000-0000-4000-8000-000000000002',owner_id,plan_fingerprint,authorized_at,closed_at,status,planned_start_at,planned_end_at FROM reality_internal.governed_employee_shifts_v1;
INSERT INTO reality_internal.governed_employee_completion_warrants_v1 SELECT '10000000-0000-4000-8000-000000000002',owner_id,plan_fingerprint,state,mode,source_scope FROM reality_internal.governed_employee_completion_warrants_v1;
SET ROLE service_role;
DO $$ BEGIN IF public.reality_claim_signed_maintenance_chat_investigation_v1()->>'status' <> 'NO_PENDING_SIGNED_MAINTENANCE_CHAT_INVESTIGATION' THEN RAISE EXCEPTION 'AMBIGUOUS_SHIFT_ADMITTED'; END IF; END $$;
RESET ROLE;
SELECT 'MAINTENANCE_CHAT_OPERATIONAL_ELIGIBILITY_PROVEN_IN_FIXTURE' AS result;
