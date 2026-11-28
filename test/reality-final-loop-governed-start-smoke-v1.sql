-- Fixtures ONLY in the disposable CI database; net.http_post is a fake transport.
CREATE SCHEMA vault;
CREATE SCHEMA net;
CREATE TABLE vault.decrypted_secrets(name text,decrypted_secret text);
CREATE TABLE net.fake_requests(id bigint GENERATED ALWAYS AS IDENTITY, target text, headers jsonb);
CREATE FUNCTION net.http_post(url text,body jsonb,headers jsonb,timeout_milliseconds integer)
 RETURNS bigint LANGUAGE sql AS 'INSERT INTO net.fake_requests(target,headers) VALUES(url,headers) RETURNING id';
CREATE TABLE reality_internal.governed_employee_shifts_v1(shift_id uuid PRIMARY KEY,owner_id uuid,
 plan_fingerprint text,status text,authorized_at timestamptz,planned_start_at timestamptz,
 planned_end_at timestamptz,closed_at timestamptz);
CREATE TABLE reality_internal.governed_employee_completion_warrants_v1(shift_id uuid PRIMARY KEY,owner_id uuid,
 plan_fingerprint text,source_scope jsonb,mode text,state text);
CREATE TABLE reality_internal.governed_employee_shift_worker_pulses_v1(shift_id uuid,owner_id uuid,last_worker_seen_at timestamptz);
CREATE TABLE reality_internal.governed_preview_shift_worker_leases_v1(worker_key text PRIMARY KEY,
 lease_expires_at timestamptz,next_wake_at timestamptz,released_at timestamptz);
CREATE TABLE reality_internal.final_loop_resume_conditions_v1(shift_id uuid,owner_id uuid,
 original_work_id text,source_ref text,condition_kind text,continuity_revision bigint,
 continuity_head_sha256 text,subscribed_receipt_sha256 text);
CREATE TABLE reality_internal.final_loop_resume_events_v1(event_id uuid PRIMARY KEY,shift_id uuid,owner_id uuid,
 original_work_id text,source_ref text,signal_kind text,continuity_revision bigint,continuity_head_sha256 text,
 previous_receipt_sha256 text,source_receipt_sha256 text,event_causality_sha256 text,signal_next_action text,state text,
 created_at timestamptz DEFAULT clock_timestamp());
CREATE TABLE reality_internal.owner_continuity_qualification_routes_v1(owner_id uuid,source_ref text,
 reconciliation_receipt_sha256 text,reconciliation_snapshot jsonb,reconciliation_next_action text);
CREATE TABLE reality_internal.owner_maintenance_independent_case_ci_v1(owner_id uuid,shift_id uuid,source_ref text,
 case_specific_ci_receipt_sha256 text,source_epoch_frozen_red_verified boolean,code_correction_green_verified boolean,
 original_customer_job_completed boolean,artifact_installation_authorized boolean,production_changed boolean);
\ir ../sql/reality-final-loop-governed-auto-trigger-transport-v1.sql
GRANT SELECT ON reality_internal.governed_employee_shifts_v1,reality_internal.governed_employee_completion_warrants_v1,
 reality_internal.governed_employee_shift_worker_pulses_v1 TO service_role;
INSERT INTO vault.decrypted_secrets VALUES
 ('reality_final_loop_isolated_worker_url_v1','https://fixture-isolated.vercel.app/api/reality/governed-employee-shift-worker'),
 ('reality_final_loop_isolated_worker_token_v1',repeat('a',64)),
 ('reality_final_loop_isolated_worker_bypass_v1','fixture-bypass-only');
DO $$
DECLARE s uuid:='22222222-2222-4222-8222-222222222222';o uuid:='11111111-1111-4111-8111-111111111111';
 work text:='work:'||repeat('b',32); src text:='https://github.com/maloney2323/Reality/pull/307';
 f text:='sha256:'||repeat('a',64);h text:='sha256:'||repeat('c',64);oldhash text:='sha256:'||repeat('d',64);
 snapshot jsonb;newhash text;cause text;
BEGIN
 INSERT INTO reality_internal.governed_employee_shifts_v1 VALUES(s,o,f,'QUEUED',now(),now()-interval '1 second','infinity',NULL);
 INSERT INTO reality_internal.governed_employee_completion_warrants_v1(shift_id,owner_id,plan_fingerprint,source_scope,mode,state)
 VALUES(s,o,f,jsonb_build_array(jsonb_build_object('source_ref',src)),'UNTIL_ALL_INDEPENDENT_FINAL_RECEIPTS','ACTIVE');
 IF (SELECT count(*) FROM net.fake_requests)<>1 THEN RAISE EXCEPTION 'START_NOT_QUEUED'; END IF;
 IF NOT EXISTS(SELECT 1 FROM net.fake_requests WHERE headers->>'x-reality-governed-shift-id'=s::text
  AND headers->>'x-reality-governed-owner-id'=o::text AND headers->>'x-reality-governed-plan-fingerprint'=f)
 THEN RAISE EXCEPTION 'START_SCOPE_NOT_BOUND';END IF;
 INSERT INTO reality_internal.governed_preview_shift_worker_leases_v1 VALUES
 ('preview-governed-employee-shift-worker',now()+interval '6 minutes',now(),NULL);
 INSERT INTO reality_internal.governed_employee_shift_worker_pulses_v1 VALUES(s,o,clock_timestamp());
 snapshot:=jsonb_build_object('shift_id',s::text,'original_candidate_work_id',work,'next_action','VERIFY_FROZEN');
 newhash:='sha256:'||encode(sha256(convert_to(snapshot::text,'UTF8')),'hex');
 cause:='sha256:'||encode(sha256(convert_to(s::text||'|'||work||'|'||h||'|2|'||oldhash||'|'||newhash,'UTF8')),'hex');
 INSERT INTO reality_internal.owner_continuity_qualification_routes_v1 VALUES(o,src,newhash,snapshot,'VERIFY_FROZEN');
 INSERT INTO reality_internal.final_loop_resume_conditions_v1 VALUES(s,o,work,src,'QUALIFIER_PROOF_CHANGED',2,h,oldhash);
 INSERT INTO reality_internal.final_loop_resume_events_v1(event_id,shift_id,owner_id,original_work_id,source_ref,
 signal_kind,continuity_revision,continuity_head_sha256,previous_receipt_sha256,source_receipt_sha256,event_causality_sha256,signal_next_action,state)
 VALUES('33333333-3333-4333-8333-333333333333',s,o,work,src,'QUALIFIER_PROOF_CHANGED',2,h,oldhash,newhash,cause,'VERIFY_FROZEN','SHADOW_PENDING');
 IF (SELECT count(*) FROM net.fake_requests)<>1 THEN RAISE EXCEPTION 'ACTIVE_LEASE_NOT_RESPECTED';END IF;
 UPDATE reality_internal.governed_preview_shift_worker_leases_v1 SET lease_expires_at=clock_timestamp(),
  next_wake_at=clock_timestamp()+interval '4 minutes',released_at=clock_timestamp();
 IF (SELECT count(*) FROM net.fake_requests)<>2 THEN RAISE EXCEPTION 'VERIFIED_EVENT_NOT_DRAINED_ON_RELEASE';END IF;
 IF NOT EXISTS(SELECT 1 FROM reality_internal.governed_preview_shift_worker_leases_v1 WHERE next_wake_at<=clock_timestamp())
 THEN RAISE EXCEPTION 'EVENT_COOLDOWN_NOT_RELEASED';END IF;
 UPDATE reality_internal.governed_preview_shift_worker_leases_v1 SET released_at=clock_timestamp();
 IF (SELECT count(*) FROM net.fake_requests)<>2 THEN RAISE EXCEPTION 'EVENT_REPLAYED';END IF;
 INSERT INTO reality_internal.final_loop_resume_events_v1(event_id,shift_id,owner_id,original_work_id,source_ref,
 signal_kind,continuity_revision,continuity_head_sha256,previous_receipt_sha256,source_receipt_sha256,event_causality_sha256,signal_next_action,state)
 VALUES('44444444-4444-4444-8444-444444444444',s,o,work,src,'QUALIFIER_PROOF_CHANGED',1,h,oldhash,newhash,cause,'VERIFY_FROZEN','SHADOW_PENDING');
 IF (SELECT count(*) FROM net.fake_requests)<>2 THEN RAISE EXCEPTION 'STALE_EVENT_DISPATCHED';END IF;
 IF has_function_privilege('authenticated','public.reality_read_final_loop_governed_start_v1(uuid,uuid,text)','EXECUTE')
 THEN RAISE EXCEPTION 'READBACK_EXPOSED';END IF;
END $$;
SET ROLE service_role;
DO $$
DECLARE r jsonb;
BEGIN
 r:=public.reality_read_final_loop_governed_start_v1('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','sha256:'||repeat('a',64));
 IF r->>'status'<>'GOVERNED_START_WORKER_OBSERVED' OR r->>'original_job_completed'<>'false'
 THEN RAISE EXCEPTION 'READBACK_NOT_EXACT';END IF;
END $$;
RESET ROLE;
