\set ON_ERROR_STOP on
-- Ephemeral schema; exact production qualifier/event trigger is exercised,
-- while outbound worker delivery is deliberately stubbed (no provider calls).
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
END $$;
CREATE SCHEMA reality_internal;
CREATE TABLE public.reality_chat_messages(id uuid PRIMARY KEY,user_id uuid,conversation_id uuid,request_id uuid,role text,content text,created_at timestamptz DEFAULT clock_timestamp());
CREATE TABLE reality_internal.chat_work_handoffs_v1(message_id uuid PRIMARY KEY,owner_id uuid,conversation_id uuid,request_id uuid,message_sha256 text,status text DEFAULT 'PENDING',created_at timestamptz DEFAULT clock_timestamp(),shift_id uuid,plan_fingerprint text,claim_id uuid,claimed_at timestamptz,claim_expires_at timestamptz);
CREATE TABLE reality_internal.owner_chat_existing_shift_wakes_v1(owner_id uuid,conversation_id uuid,request_id uuid,shift_id uuid,chat_source_ref text,network_request_id bigint,queued_at timestamptz DEFAULT clock_timestamp(),PRIMARY KEY(owner_id,request_id));
CREATE TABLE reality_internal.governed_employee_shifts_v1(shift_id uuid PRIMARY KEY,owner_id uuid,plan_fingerprint text,authorized_at timestamptz,closed_at timestamptz,status text,planned_start_at timestamptz,planned_end_at timestamptz);
CREATE TABLE reality_internal.governed_employee_completion_warrants_v1(shift_id uuid PRIMARY KEY,owner_id uuid,plan_fingerprint text,state text,mode text,source_scope jsonb);
CREATE TABLE reality_internal.owner_internal_maintenance_jobs_v1(incident_id uuid PRIMARY KEY,owner_id uuid,source_ref text,origin_shift_id uuid,independent_review_receipt_sha256 text,original_job_completed boolean,production_changed boolean,claimed_shift_id uuid,recovery_state text,frozen_test_build jsonb,build_attempt_receipts jsonb,build_recovery_decisions jsonb,independent_failure_baseline_receipt_sha256 text);
CREATE TABLE reality_internal.final_loop_pr_source_plans_v1(plan_id uuid PRIMARY KEY,shift_id uuid,owner_id uuid,source_ref text,parent_original_work_id text,source_proof_sha256 text,source_manifest_sha256 text,source_head_sha text,state text,plan_fingerprint text);
CREATE TABLE reality_internal.governed_employee_shift_steps_v1(shift_id uuid,source_ref text,state text,step_index int,proof_sha256 text);
CREATE TABLE reality_internal.signed_original_lineage_packets_v1(shift_id uuid,owner_id uuid,source_ref text,original_work_id text);
CREATE TABLE public.universe_events(epistemic_status text,payload jsonb,continuity_root_id uuid,worldline_id uuid);
CREATE TABLE reality_internal.final_loop_child_approval_packets_v1(owner_id uuid,shift_id uuid,plan_id uuid,parent_original_work_id text,acceptance_contract_sha256 text,owner_approval_receipt_sha256 text,state text);
CREATE TABLE reality_internal.governed_employee_original_claims_v1(shift_id uuid,owner_id uuid,source_ref text,original_work_id text);
CREATE TABLE reality_internal.signed_maintenance_executor_claims_v1(shift_id uuid,owner_id uuid,source_ref text,state text,ci_independent_verified_at timestamptz);
CREATE TABLE reality_internal.owner_maintenance_independent_case_ci_v1(shift_id uuid,owner_id uuid,source_ref text,source_epoch_frozen_red_verified boolean);
CREATE TABLE reality_internal.governed_original_independent_final_receipts_v1(shift_id uuid,owner_id uuid,source_ref text,original_work_id text,outcome text,final_evidence_sha256 text);
CREATE TABLE reality_internal.owner_maintenance_signed_repair_handoffs_v1(maintenance_id uuid,owner_id uuid,shift_id uuid,source_ref text,existing_original_work_id text,handoff_receipt_sha256 text,independent_diagnostic_receipt_sha256 text);
CREATE TABLE reality_internal.owner_continuity_qualification_routes_v1(owner_id uuid,intake_family text,intake_key text,source_ref text,reconciliation_receipt_sha256 text,reconciliation_snapshot jsonb,reconciliation_next_action text,reconciliation_checked_at timestamptz);
CREATE TABLE reality_internal.final_loop_resume_conditions_v1(shift_id uuid,owner_id uuid,original_work_id text,source_ref text,condition_kind text,subscribed_receipt_sha256 text,continuity_head_sha256 text,continuity_revision bigint,state text,last_signaled_receipt_sha256 text,updated_at timestamptz,PRIMARY KEY(shift_id,original_work_id,condition_kind));
CREATE TABLE reality_internal.final_loop_resume_events_v1(event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),shift_id uuid,owner_id uuid,original_work_id text,source_ref text,signal_kind text,source_receipt_sha256 text,previous_receipt_sha256 text,event_causality_sha256 text UNIQUE,continuity_head_sha256 text,continuity_revision bigint,signal_next_action text,governed_wake_requested_at timestamptz);
CREATE TABLE reality_internal.fixture_notify_calls(shift_id uuid);
CREATE FUNCTION reality_internal.notify_final_loop_governed_trigger_v1(p_shift_id uuid) RETURNS bigint LANGUAGE plpgsql AS $$BEGIN INSERT INTO reality_internal.fixture_notify_calls VALUES(p_shift_id);RETURN NULL;END$$;
CREATE FUNCTION reality_internal.final_loop_pr_review_acceptance_digest_v1(uuid) RETURNS text LANGUAGE sql AS $$ SELECT 'sha256:'||repeat('d',64) $$;
CREATE FUNCTION reality_internal.read_final_loop_child_approval_preflight_v1(p_shift_id uuid) RETURNS jsonb LANGUAGE sql AS $$
 SELECT jsonb_build_object('plans',coalesce(jsonb_agg(jsonb_build_object(
  'plan_id',p.plan_id,'independent_goal_acceptance_verified',true,'owner_approval_claim_window_current',true,
  'owner_approval_expired',false,'child_review_automatically_authorized',false,
  'canonical_review_handoff',jsonb_build_object('effect_type','READ_ONLY_INTERNAL_PR_REVIEW',
   'owner_id',p.owner_id,'shift_id',p.shift_id,'parent_original_work_id',p.parent_original_work_id,
   'source_ref',p.source_ref,'plan_fingerprint',p.plan_fingerprint,'source_proof_sha256',p.source_proof_sha256,
   'source_head_sha',p.source_head_sha,'source_manifest_sha256',p.source_manifest_sha256,
   'acceptance_contract_sha256',reality_internal.final_loop_pr_review_acceptance_digest_v1(p.plan_id),'execution_authorized',false)
  )),'[]'::jsonb)) FROM reality_internal.final_loop_pr_source_plans_v1 p WHERE p.shift_id=p_shift_id
$$;
GRANT USAGE ON SCHEMA reality_internal TO service_role;
GRANT SELECT,INSERT,UPDATE ON ALL TABLES IN SCHEMA reality_internal TO service_role;
GRANT SELECT ON public.reality_chat_messages TO service_role;
\ir ../sql/reality-governed-chat-continuation-connection-v1.sql
-- Existing benchmark qualifier-to-event function frozen from the pre-change
-- installed definition, rather than a mock that manufactures event success.
CREATE OR REPLACE FUNCTION reality_internal.on_final_loop_qualifier_receipt_change_v1()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_sub reality_internal.final_loop_resume_conditions_v1%rowtype;
        v_hash text;v_new_event uuid;
BEGIN
 -- Only a NEW independently reconciled digest is a wake condition.
 -- The recurring qualifier's unchanged heartbeat is not an event.
 IF NEW.reconciliation_receipt_sha256 IS NULL OR
    NEW.reconciliation_receipt_sha256=OLD.reconciliation_receipt_sha256 OR
    NEW.reconciliation_receipt_sha256 !~ '^sha256:[a-f0-9]{64}$'
 THEN RETURN NEW; END IF;

 -- The sole trusted scheduled qualifier computes a deterministic receipt
 -- from the canonical JSON snapshot; arbitrary updates are not events.
 IF NEW.intake_family<>'SIGNED_SHIFT_SOURCE'
   OR NEW.reconciliation_snapshot->>'schema'<>'reality-governed-qualifier-cross-layer-proof-v1'
   OR NEW.reconciliation_snapshot->>'next_action'
       IS DISTINCT FROM NEW.reconciliation_next_action
   OR NEW.reconciliation_receipt_sha256 IS DISTINCT FROM
      'sha256:'||pg_catalog.encode(pg_catalog.sha256(
       pg_catalog.convert_to(NEW.reconciliation_snapshot::text,'UTF8')),'hex')
   OR NEW.reconciliation_snapshot->>'shift_id' IS NULL
   OR NEW.reconciliation_snapshot->>'original_candidate_work_id' IS NULL
   OR NEW.reconciliation_snapshot->>'source_proof_bound'<>'true'
   OR NEW.reconciliation_snapshot->>'lineage_packet_found'<>'true'
   OR NEW.reconciliation_snapshot->>'original_final_receipt_verified'<>'false'
   OR NEW.reconciliation_checked_at<pg_catalog.clock_timestamp()-interval '10 minutes'
   OR NEW.reconciliation_checked_at>pg_catalog.clock_timestamp()+interval '1 minute'
 THEN RETURN NEW; END IF;
 IF NEW.reconciliation_snapshot->>'source_ref' IS DISTINCT FROM NEW.source_ref
    OR NEW.reconciliation_snapshot->>'owner_id' IS DISTINCT FROM NEW.owner_id::text
    OR NEW.reconciliation_snapshot->>'shift_id' IS NULL
    OR NEW.reconciliation_next_action IS NULL
 THEN RETURN NEW; END IF;
 SELECT * INTO v_sub FROM reality_internal.final_loop_resume_conditions_v1 sub
 WHERE sub.owner_id=NEW.owner_id AND sub.source_ref=NEW.source_ref
  AND sub.original_work_id=NEW.reconciliation_snapshot->>'original_candidate_work_id'
  AND sub.shift_id=(NEW.reconciliation_snapshot->>'shift_id')::uuid
  AND sub.condition_kind='QUALIFIER_PROOF_CHANGED'
  AND sub.subscribed_receipt_sha256<>NEW.reconciliation_receipt_sha256
  AND EXISTS(
   SELECT 1 FROM reality_internal.governed_employee_shifts_v1 s
   JOIN reality_internal.governed_employee_completion_warrants_v1 w
    ON w.shift_id=s.shift_id AND w.owner_id=s.owner_id
     AND w.plan_fingerprint=s.plan_fingerprint
   WHERE s.shift_id=sub.shift_id AND s.owner_id=sub.owner_id
    AND s.authorized_at IS NOT NULL AND s.closed_at IS NULL
    AND s.status IN ('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
    AND w.state='ACTIVE'
  ) FOR UPDATE OF sub;
 IF NOT FOUND THEN RETURN NEW; END IF;
 v_hash:='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
  v_sub.shift_id::text||'|'||v_sub.original_work_id||'|'||
  v_sub.continuity_head_sha256||'|'||v_sub.continuity_revision::text||'|'||
  v_sub.subscribed_receipt_sha256||'|'||NEW.reconciliation_receipt_sha256,
  'UTF8')),'hex');
 INSERT INTO reality_internal.final_loop_resume_events_v1(
  shift_id,owner_id,original_work_id,source_ref,signal_kind,
  source_receipt_sha256,previous_receipt_sha256,event_causality_sha256,
  continuity_head_sha256,continuity_revision,signal_next_action
 ) VALUES(
  v_sub.shift_id,v_sub.owner_id,v_sub.original_work_id,v_sub.source_ref,
  'QUALIFIER_PROOF_CHANGED',NEW.reconciliation_receipt_sha256,
  v_sub.subscribed_receipt_sha256,v_hash,
  v_sub.continuity_head_sha256,v_sub.continuity_revision,
  NEW.reconciliation_next_action
 ) ON CONFLICT DO NOTHING RETURNING event_id INTO v_new_event;
 IF v_new_event IS NOT NULL THEN
  UPDATE reality_internal.final_loop_resume_conditions_v1
  SET state='SHADOW_SIGNALED',
   last_signaled_receipt_sha256=NEW.reconciliation_receipt_sha256,
   updated_at=pg_catalog.clock_timestamp()
  WHERE shift_id=v_sub.shift_id
   AND original_work_id=v_sub.original_work_id
   AND condition_kind=v_sub.condition_kind;
 END IF;
 RETURN NEW;
END $function$;
CREATE TRIGGER fixture_qualifier_receipt_change AFTER UPDATE OF reconciliation_receipt_sha256 ON reality_internal.owner_continuity_qualification_routes_v1 FOR EACH ROW EXECUTE FUNCTION reality_internal.on_final_loop_qualifier_receipt_change_v1();
CREATE TRIGGER fixture_resume_event AFTER INSERT ON reality_internal.final_loop_resume_events_v1 FOR EACH ROW EXECUTE FUNCTION reality_internal.on_final_loop_governed_wake_v1();
INSERT INTO reality_internal.governed_employee_shifts_v1 VALUES('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','sha256:'||repeat('f',64),now()-interval '1 hour',null,'RUNNING',now()-interval '1 hour','infinity');
INSERT INTO reality_internal.owner_internal_maintenance_jobs_v1(incident_id,owner_id,source_ref,origin_shift_id,independent_review_receipt_sha256,original_job_completed,production_changed) VALUES('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','world:operations:review','40000000-0000-4000-8000-000000000001','sha256:'||repeat('a',64),false,false);
INSERT INTO reality_internal.governed_employee_completion_warrants_v1 SELECT s.shift_id,s.owner_id,s.plan_fingerprint,'ACTIVE','UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS',jsonb_build_array(jsonb_build_object('maintenance_id',m.incident_id,'source_ref',m.source_ref,'origin_shift_id',m.origin_shift_id,'independent_review_receipt_sha256',m.independent_review_receipt_sha256,'step_index',0)) FROM reality_internal.governed_employee_shifts_v1 s CROSS JOIN reality_internal.owner_internal_maintenance_jobs_v1 m;
INSERT INTO reality_internal.final_loop_pr_source_plans_v1 SELECT '50000000-0000-4000-8000-000000000001',s.shift_id,s.owner_id,'world:operations:review','work:'||repeat('b',32),'sha256:'||repeat('a',64),'sha256:'||repeat('c',64),repeat('a',40),'PROPOSED_SOURCE_PLAN_AWAITING_INDEPENDENT_ADMISSION',s.plan_fingerprint FROM reality_internal.governed_employee_shifts_v1 s;
INSERT INTO reality_internal.governed_employee_shift_steps_v1 SELECT shift_id,source_ref,'SOURCE_CHECKED',0,source_proof_sha256 FROM reality_internal.final_loop_pr_source_plans_v1;
INSERT INTO reality_internal.signed_original_lineage_packets_v1 SELECT shift_id,owner_id,source_ref,parent_original_work_id FROM reality_internal.final_loop_pr_source_plans_v1;
INSERT INTO public.universe_events SELECT 'VERIFIED',jsonb_build_object('original_work_id',parent_original_work_id,'source_ref',source_ref,'acceptance_contract_sha256',reality_internal.final_loop_pr_review_acceptance_digest_v1(plan_id),'owner_id',owner_id),shift_id,plan_id FROM reality_internal.final_loop_pr_source_plans_v1;
INSERT INTO reality_internal.final_loop_child_approval_packets_v1 SELECT owner_id,shift_id,plan_id,parent_original_work_id,reality_internal.final_loop_pr_review_acceptance_digest_v1(plan_id),'sha256:'||repeat('a',64),'EFFECT_RESERVED_RECONCILE_ONLY' FROM reality_internal.final_loop_pr_source_plans_v1;
INSERT INTO reality_internal.owner_continuity_qualification_routes_v1(owner_id,intake_family,intake_key,source_ref) SELECT owner_id,'SIGNED_SHIFT_SOURCE',shift_id::text||':0',source_ref FROM reality_internal.final_loop_pr_source_plans_v1;
SELECT reality_internal.reconcile_current_qualification_proofs_v1();
INSERT INTO reality_internal.final_loop_resume_conditions_v1(shift_id,owner_id,original_work_id,source_ref,condition_kind,subscribed_receipt_sha256,continuity_head_sha256,continuity_revision,state)
 SELECT p.shift_id,p.owner_id,p.parent_original_work_id,p.source_ref,'QUALIFIER_PROOF_CHANGED',r.reconciliation_receipt_sha256,'sha256:'||repeat('e',64),4,'SUSPENDED' FROM reality_internal.final_loop_pr_source_plans_v1 p JOIN reality_internal.owner_continuity_qualification_routes_v1 r ON r.owner_id=p.owner_id AND r.source_ref=p.source_ref;
INSERT INTO public.reality_chat_messages(id,user_id,conversation_id,request_id,role,content) VALUES
('60000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000001','user','Continue the existing authorized shift.'),
('60000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000002','user','I approve installation of the tested artifact.'),
('60000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000003','user','Hello');
INSERT INTO reality_internal.chat_work_handoffs_v1(message_id,owner_id,conversation_id,request_id,message_sha256,created_at)
 SELECT id,user_id,conversation_id,request_id,encode(sha256(convert_to(content,'UTF8')),'hex'),created_at FROM public.reality_chat_messages;
SET ROLE service_role;
DO $$DECLARE j jsonb;BEGIN
 j:=public.reality_dispatch_existing_chat_maintenance_shift_v1('20000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000002');
 IF j->>'status' IS DISTINCT FROM 'CHAT_EXISTING_SHIFT_EXPLICIT_SIGNED_COMMAND_REQUIRED' THEN RAISE EXCEPTION 'INSTALL_APPROVAL_ACCEPTED_AS_CONTINUATION';END IF;
 j:=public.reality_dispatch_existing_chat_maintenance_shift_v1('20000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000001');
 IF j->>'status' IS DISTINCT FROM 'CHAT_EXISTING_SHIFT_CONTINUATION_INTENT_RECORDED' OR j->>'wake_enqueued' IS DISTINCT FROM 'false' OR j->>'installation_authorized' IS DISTINCT FROM 'false' OR j->>'execution_authorized' IS DISTINCT FROM 'false' THEN RAISE EXCEPTION 'INTENT_RECEIPT_UNVERIFIED: %',j;END IF;
 j:=public.reality_dispatch_existing_chat_maintenance_shift_v1('20000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000001');
 IF j->>'status' IS DISTINCT FROM 'CHAT_EXISTING_SHIFT_CONTINUATION_INTENT_RECORDED' THEN RAISE EXCEPTION 'DUPLICATE_INTENT_REJECTED';END IF;
 j:=public.reality_claim_signed_maintenance_chat_investigation_v1();
 IF j->>'message_id' IS DISTINCT FROM '60000000-0000-4000-8000-000000000001' OR j->>'investigation_only' IS DISTINCT FROM 'true' OR j->>'execution_authorized' IS DISTINCT FROM 'false' THEN RAISE EXCEPTION 'WRONG_CHAT_CLAIMED: %',j;END IF;
 j:=public.reality_claim_signed_maintenance_chat_investigation_v1();
 IF j->>'status' IS DISTINCT FROM 'NO_PENDING_SIGNED_MAINTENANCE_CHAT_INVESTIGATION' THEN RAISE EXCEPTION 'DUPLICATE_OR_GENERIC_CHAT_CLAIMED';END IF;
END$$;
RESET ROLE;
DO $$DECLARE q record; e record;BEGIN
 SELECT * INTO q FROM reality_internal.owner_continuity_qualification_routes_v1;
 SELECT * INTO e FROM reality_internal.final_loop_resume_events_v1;
 IF (SELECT count(*) FROM reality_internal.owner_chat_existing_shift_wakes_v1)<>1 OR (SELECT count(*) FROM reality_internal.final_loop_resume_events_v1)<>1 OR (SELECT count(*) FROM reality_internal.fixture_notify_calls)<>1 THEN RAISE EXCEPTION 'CONTINUATION_NOT_SINGLE_CAUSAL_EVENT';END IF;
 IF q.reconciliation_snapshot->'authenticated_chat_continuation'->>'message_id' IS DISTINCT FROM '60000000-0000-4000-8000-000000000001'
 OR q.reconciliation_snapshot->'authenticated_chat_continuation'->>'original_work_id' IS DISTINCT FROM 'work:'||repeat('b',32)
 OR q.reconciliation_snapshot->'authenticated_chat_continuation'->>'execution_authorized' IS DISTINCT FROM 'false'
 OR q.reconciliation_snapshot->>'review_scope_qualified' IS DISTINCT FROM 'true'
 OR e.source_receipt_sha256 IS DISTINCT FROM q.reconciliation_receipt_sha256
 OR e.continuity_revision<>4 OR e.signal_next_action<>'VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM'
 OR e.governed_wake_requested_at IS NULL THEN RAISE EXCEPTION 'CAUSAL_CONTINUATION_PROOF_UNVERIFIED';END IF;
 IF EXISTS(SELECT 1 FROM reality_internal.owner_chat_existing_shift_wakes_v1 WHERE network_request_id IS NOT NULL) THEN RAISE EXCEPTION 'LEGACY_RAW_NETWORK_WAKE_USED';END IF;
END$$;
SELECT reality_internal.reconcile_current_qualification_proofs_v1();
DO $$BEGIN IF (SELECT count(*) FROM reality_internal.final_loop_resume_events_v1)<>1 THEN RAISE EXCEPTION 'HEARTBEAT_CREATED_DUPLICATE_EVENT';END IF;END$$;
SELECT 'GOVERNED_CHAT_CONTINUATION_CONNECTION_PROVEN_IN_FIXTURE' AS result;

-- Frozen failure: at 12 minutes the ordinary watchdog refuses to update
-- proof, but the real release-observation trigger must requalify immediately.
CREATE TABLE reality_internal.governed_worker_release_approvals_v1(
 request_id uuid,shift_id uuid,claim_id uuid,capability_key text,provider_alias_observed_at timestamptz);
CREATE TABLE reality_internal.fixture_release_stage_calls(kind text,proof_fresh boolean);
CREATE FUNCTION public.reality_stage_final_loop_ledger_return_v1(p_shift uuid,p_claim uuid) RETURNS jsonb
 LANGUAGE plpgsql AS $fixture$
 BEGIN
  INSERT INTO reality_internal.fixture_release_stage_calls
  SELECT 'ledger',coalesce(bool_and(reconciliation_checked_at>clock_timestamp()-interval '10 minutes'),false)
  FROM reality_internal.owner_continuity_qualification_routes_v1 WHERE intake_key=p_shift::text||':0';
  RETURN jsonb_build_object('status','LEDGER_RETURN_EVENT_STAGED');
 END $fixture$;
CREATE FUNCTION reality_internal.stage_final_loop_release_continuation_v1(uuid) RETURNS void
 LANGUAGE sql AS $$INSERT INTO reality_internal.fixture_release_stage_calls VALUES('ordinary',false)$$;
CREATE TRIGGER fixture_release_observed AFTER UPDATE OF provider_alias_observed_at
 ON reality_internal.governed_worker_release_approvals_v1 FOR EACH ROW
 WHEN (OLD.provider_alias_observed_at IS NULL AND NEW.provider_alias_observed_at IS NOT NULL)
 EXECUTE FUNCTION reality_internal.on_final_loop_governed_wake_v1();
UPDATE reality_internal.owner_continuity_qualification_routes_v1
 SET reconciliation_checked_at=clock_timestamp()-interval '12 minutes';
SELECT reality_internal.reconcile_current_qualification_proofs_v1();
DO $$BEGIN
 IF EXISTS(SELECT 1 FROM reality_internal.owner_continuity_qualification_routes_v1
 WHERE reconciliation_checked_at>clock_timestamp()-interval '10 minutes')
 THEN RAISE EXCEPTION 'WATCHDOG_FIXTURE_NOT_STALE';END IF;
END$$;
INSERT INTO reality_internal.governed_worker_release_approvals_v1
 SELECT gen_random_uuid(),shift_id,gen_random_uuid(),'VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM',NULL
 FROM reality_internal.governed_employee_shifts_v1;
UPDATE reality_internal.governed_worker_release_approvals_v1 SET provider_alias_observed_at=clock_timestamp();
DO $$BEGIN
 IF (SELECT count(*) FROM reality_internal.fixture_release_stage_calls WHERE kind='ledger' AND proof_fresh)<>1
 OR EXISTS(SELECT 1 FROM reality_internal.fixture_release_stage_calls WHERE kind='ordinary')
 OR (SELECT count(*) FROM reality_internal.final_loop_resume_events_v1)<>1
 THEN RAISE EXCEPTION 'ON_DEMAND_QUALIFICATION_OR_DUPLICATE_FENCE_FAILED';END IF;
 IF has_function_privilege('service_role','reality_internal.reconcile_current_qualification_proofs_v1(uuid)','EXECUTE')
 THEN RAISE EXCEPTION 'QUALIFIER_PRIVILEGE_WIDENED';END IF;
END$$;
SELECT 'RELEASE_PROOF_DEMAND_REQUALIFIED_WITHOUT_WATCHDOG_OR_DUPLICATE_EVENT' AS result;
