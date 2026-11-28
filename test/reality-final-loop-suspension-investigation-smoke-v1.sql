-- Disposable CI database only. No real credentials, network, provider calls,
-- production access, original settlement, or owner approval is manufactured.
CREATE SCHEMA reality_internal;
CREATE SCHEMA vault;
CREATE SCHEMA net;
GRANT USAGE ON SCHEMA reality_internal TO service_role;
CREATE TABLE vault.decrypted_secrets(name text,decrypted_secret text);
CREATE TABLE net.fake_requests(id bigint GENERATED ALWAYS AS IDENTITY,target text,headers jsonb);
CREATE TABLE net._http_response(id bigint PRIMARY KEY,status_code int,content_type text,content text,timed_out boolean,created timestamptz);
CREATE TABLE reality_internal.governed_original_independent_final_receipts_v1(owner_id uuid,shift_id uuid,original_work_id text);
CREATE FUNCTION net.http_post(url text,body jsonb,headers jsonb,timeout_milliseconds integer)
 RETURNS bigint LANGUAGE sql AS 'INSERT INTO net.fake_requests(target,headers) VALUES(url,headers) RETURNING id';
CREATE TABLE public.universe_events(event_id uuid PRIMARY KEY,continuity_root_id uuid,worldline_id uuid,parent_event_id uuid,
 entity_type text,epistemic_status text,lineage_hash text,content_hash text,payload jsonb,provenance jsonb,assertion_time timestamptz);
CREATE FUNCTION public.reality_continuity_canonical_json_v1(jsonb) RETURNS text LANGUAGE sql IMMUTABLE AS 'SELECT $1::text';
CREATE TABLE reality_internal.governed_employee_shifts_v1(shift_id uuid PRIMARY KEY,owner_id uuid,plan_fingerprint text,
 status text,authorized_at timestamptz,planned_start_at timestamptz,planned_end_at timestamptz,closed_at timestamptz,last_progress_at timestamptz);
CREATE TABLE reality_internal.governed_employee_completion_warrants_v1(shift_id uuid PRIMARY KEY,owner_id uuid,plan_fingerprint text,
 source_scope jsonb,mode text,state text,governed_start_requested_at timestamptz,governed_start_request_id bigint,
 governed_start_queued_at timestamptz,governed_start_nonce uuid,governed_start_worker_run_id uuid);
CREATE TABLE reality_internal.governed_employee_shift_worker_pulses_v1(shift_id uuid,owner_id uuid,last_worker_seen_at timestamptz,last_worker_status text);
ALTER TABLE reality_internal.governed_employee_shift_worker_pulses_v1 ADD COLUMN last_worker_completed_at timestamptz, ADD COLUMN last_worker_safe_result text;
CREATE TABLE reality_internal.governed_preview_shift_worker_leases_v1(worker_key text PRIMARY KEY,claim_id uuid,claimed_at timestamptz,
 lease_expires_at timestamptz,next_wake_at timestamptz,released_at timestamptz);
CREATE TABLE reality_internal.signed_worker_actual_runs_v1(run_id uuid PRIMARY KEY,status text,started_at timestamptz,finished_at timestamptz,worker_stage text);
CREATE TABLE reality_internal.governed_worker_release_approvals_v1(request_id uuid PRIMARY KEY,owner_id uuid,shift_id uuid,claim_id uuid UNIQUE,
 capability_key text,state text,approval_receipt_sha256 text,provider_alias_observed_at timestamptz,claimed_at timestamptz,
 provider_alias_observed_deployment_id text,runtime_scope jsonb,release_sha text,release_ref text,scheduled_alias text,independent_isolation_proof_sha256 text);
CREATE TABLE reality_internal.governed_signed_worker_release_wakes_v1(worker_run_id uuid PRIMARY KEY,owner_id uuid,shift_id uuid,release_claim_id uuid,
 running_release_sha text,running_release_ref text,operating_lane text,release_receipt_sha256 text);
CREATE TABLE reality_internal.final_loop_resume_conditions_v1(shift_id uuid,owner_id uuid,original_work_id text,source_ref text,
 condition_kind text,subscribed_receipt_sha256 text,continuity_head_sha256 text,continuity_revision bigint,next_qualified_action text,
 unresolved_proof_gates jsonb,proposed_transition text,state text,last_signaled_receipt_sha256 text,updated_at timestamptz,
 PRIMARY KEY(shift_id,original_work_id,condition_kind),
 CONSTRAINT final_loop_resume_conditions_v1_condition_kind_check CHECK(condition_kind IN ('QUALIFIER_PROOF_CHANGED','INDEPENDENT_FROZEN_CI_RECEIPT')));
CREATE TABLE reality_internal.final_loop_resume_events_v1(event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),shift_id uuid,owner_id uuid,
 original_work_id text,source_ref text,signal_kind text,source_receipt_sha256 text,previous_receipt_sha256 text,event_causality_sha256 text,
 continuity_head_sha256 text,continuity_revision bigint,signal_next_action text,state text DEFAULT 'SHADOW_PENDING',
 observed_at timestamptz,created_at timestamptz DEFAULT clock_timestamp(),governed_wake_requested_at timestamptz,
 governed_wake_request_id bigint,governed_wake_queued_at timestamptz,governed_wake_nonce uuid,governed_wake_worker_run_id uuid,
 CONSTRAINT final_loop_resume_events_v1_signal_kind_check CHECK(signal_kind IN ('QUALIFIER_PROOF_CHANGED','INDEPENDENT_FROZEN_CI_RECEIPT')));
CREATE TABLE reality_internal.final_loop_transition_receipts_v1(receipt_id uuid PRIMARY KEY,owner_id uuid,shift_id uuid,original_work_id text,
 source_ref text,continuity_root_id uuid,continuity_head_sha256 text,expected_revision bigint,decision text,reason_code text,worker_run_id uuid,receipt_sha256 text);
CREATE TABLE reality_internal.final_loop_child_review_work_v1(child_work_id uuid PRIMARY KEY,packet_id uuid,owner_id uuid,shift_id uuid,
 parent_original_work_id text,phase text,canonical_prepare_invocation_id uuid,canonical_verify_invocation_id uuid,model_response_id text,
 independent_review_receipt_sha256 text,claimant_worker_run_id uuid,canonical_verify_invocation_run_id uuid);
CREATE TABLE reality_internal.final_loop_child_approval_packets_v1(packet_id uuid PRIMARY KEY,source_ref text,state text);
CREATE TABLE reality_internal.owner_continuity_qualification_routes_v1(owner_id uuid,source_ref text,reconciliation_receipt_sha256 text,
 reconciliation_snapshot jsonb,reconciliation_next_action text,reconciliation_checked_at timestamptz);
CREATE TABLE reality_internal.owner_maintenance_independent_case_ci_v1(owner_id uuid,shift_id uuid,source_ref text,case_specific_ci_receipt_sha256 text,
 source_epoch_frozen_red_verified boolean,code_correction_green_verified boolean,original_customer_job_completed boolean,artifact_installation_authorized boolean,production_changed boolean);
CREATE TABLE reality_internal.shift_repeated_blocker_observations_v1(shift_id uuid PRIMARY KEY,owner_id uuid,blocker_code text,consecutive_count integer,
 last_shift_progress_at timestamptz,original_claim_count integer,independent_final_count integer,last_worker_run_id uuid,first_seen_at timestamptz,last_seen_at timestamptz,incident_id uuid);
CREATE TABLE reality_internal.owner_shift_continuity_incidents_v1(incident_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),owner_id uuid,shift_id uuid,
 kind text,evidence_key text,evidence_sha256 text,error_summary text,source_evidence jsonb,source_claim_id uuid,phase text DEFAULT 'DETECTED',
 investigation_lease_id uuid,investigation_claimed_at timestamptz,investigation_attempts integer DEFAULT 0,first_detected_at timestamptz DEFAULT clock_timestamp(),
 assigned_employee text,independent_reviewer text,assigned_function_id text,reviewer_function_id text,qualified_job_id uuid,investigated_at timestamptz,
 diagnosis text,proposed_upgrade text,independent_test_requirement text,limitations text,
 model_response_id text,investigation_receipt_sha256 text,observation_count integer DEFAULT 1,last_observed_at timestamptz,
 UNIQUE(owner_id,shift_id,kind,evidence_key),
 CONSTRAINT owner_shift_continuity_incidents_v1_kind_check CHECK(kind='SIGNED_SHIFT_REPEATED_NO_PROGRESS'));
CREATE TABLE reality_internal.shift_continuity_independent_reviews_v1(incident_id uuid PRIMARY KEY,owner_id uuid NOT NULL,shift_id uuid NOT NULL,
 qualified_job_id uuid NOT NULL,claim_id uuid NOT NULL,worker_run_id uuid NOT NULL,reviewer text NOT NULL,reviewer_function_id text NOT NULL,
 source_ref text NOT NULL,previously_reviewed_sha256 text NOT NULL,investigation_receipt_sha256 text NOT NULL,
 claimed_at timestamptz DEFAULT clock_timestamp(),status text DEFAULT 'REVIEW_CLAIMED',
 current_provider_sha256 text,provider_checked_at timestamptz,source_head_sha text,receipt_sha256 text,completed_at timestamptz,
 installation_authorized boolean DEFAULT false,production_changed boolean DEFAULT false,original_job_completed boolean DEFAULT false,
 original_work_id text,continuity_head_sha256 text,review_event_id uuid,frozen_source_head_sha text,independent_verdict jsonb);
ALTER TABLE public.universe_events ADD COLUMN event_kind text,ADD COLUMN entity_id uuid,ADD COLUMN effective_time timestamptz,ADD COLUMN evidence_refs jsonb;
ALTER TABLE reality_internal.final_loop_transition_receipts_v1 ADD COLUMN plan_fingerprint text,ADD COLUMN frozen_shift_scope_sha256 text;
CREATE TABLE public.suspension_fixture_proof(shift_id uuid PRIMARY KEY,proof jsonb,guard jsonb);
-- Simulate the existing canonical proof reader deriving its current head
-- and revision from the appended observation/transition, not a real effect.
CREATE FUNCTION public.fixture_terminal_observation_head() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fixture$
BEGIN
 IF NEW.entity_type='reality_final_loop_terminal_technical_observation_v1' THEN
 UPDATE public.suspension_fixture_proof SET
 proof=proof||pg_catalog.jsonb_build_object('continuity_head_sha256','sha256:'||NEW.lineage_hash,'revision',(proof->>'revision')::bigint+1),
 guard=guard||pg_catalog.jsonb_build_object('continuity_head_sha256','sha256:'||NEW.lineage_hash,'revision',(guard->>'revision')::bigint+1)
 WHERE shift_id=(NEW.payload->>'shift_id')::uuid;
 END IF;
 RETURN NEW;
END $fixture$;
CREATE TRIGGER fixture_terminal_head AFTER INSERT ON public.universe_events FOR EACH ROW EXECUTE FUNCTION public.fixture_terminal_observation_head();
CREATE FUNCTION public.reality_read_current_final_loop_proof_envelope_v1(uuid) RETURNS jsonb LANGUAGE sql AS
 'SELECT proof FROM public.suspension_fixture_proof WHERE shift_id=$1';
CREATE FUNCTION public.reality_read_final_loop_shared_continuity_guard_v1(uuid) RETURNS jsonb LANGUAGE sql AS
 'SELECT guard FROM public.suspension_fixture_proof WHERE shift_id=$1';
\ir ../sql/reality-final-loop-release-continuation-v1.sql
\ir ../sql/reality-final-loop-blocker-incident-handoff-v1.sql
GRANT SELECT,INSERT,UPDATE ON ALL TABLES IN SCHEMA reality_internal TO service_role;
GRANT SELECT,INSERT,UPDATE ON public.universe_events,public.suspension_fixture_proof TO service_role;
CREATE TRIGGER fixture_resume AFTER INSERT ON reality_internal.final_loop_resume_events_v1
 FOR EACH ROW EXECUTE FUNCTION reality_internal.on_final_loop_governed_wake_v1();
CREATE TRIGGER fixture_lease_release AFTER UPDATE OF released_at ON reality_internal.governed_preview_shift_worker_leases_v1
 FOR EACH ROW EXECUTE FUNCTION reality_internal.on_final_loop_governed_wake_v1();
CREATE TRIGGER fixture_alias AFTER UPDATE OF provider_alias_observed_at ON reality_internal.governed_worker_release_approvals_v1
 FOR EACH ROW WHEN (OLD.provider_alias_observed_at IS NULL AND NEW.provider_alias_observed_at IS NOT NULL)
 EXECUTE FUNCTION reality_internal.on_final_loop_governed_wake_v1();

INSERT INTO vault.decrypted_secrets VALUES
 ('reality_final_loop_canonical_worker_url_v1','https://fixture.invalid/api/reality/governed-employee-shift-worker'),
 ('reality_riley_preview_worker_token_20261107',repeat('a',64)),
 ('reality_riley_preview_vercel_bypass_20261107','fixture-bypass-only');
DO $$
DECLARE o uuid:=gen_random_uuid(); s uuid:=gen_random_uuid(); root uuid:=gen_random_uuid(); world uuid:=gen_random_uuid();
 parent uuid:=gen_random_uuid(); observed uuid:=gen_random_uuid(); oldrun uuid:=gen_random_uuid(); newrun uuid:=gen_random_uuid();
 oldclaim uuid:=gen_random_uuid(); newclaim uuid:=gen_random_uuid(); oldreq uuid:=gen_random_uuid(); newreq uuid:=gen_random_uuid();
 prior_event uuid:=gen_random_uuid(); receipt uuid:=gen_random_uuid(); packet uuid:=gen_random_uuid(); lease uuid:=gen_random_uuid();
 work text:='work:'||repeat('b',32); src text:='https://github.com/fixture/repository/pull/1';
 plan text:='sha256:'||repeat('c',64); oldhead text:='sha256:'||repeat('d',64); head text:='sha256:'||repeat('e',64);
 q text:='sha256:'||repeat('f',64); receipt_hash text:='sha256:'||repeat('1',64); wake_hash text:='sha256:'||repeat('2',64);
 gates jsonb:='["TERMINAL_BUILDER_DISTINCT_EVIDENCE_AND_BUDGET_REQUIRED","CASE_SPECIFIC_FROZEN_RED_NOT_VERIFIED"]';
 scope jsonb; payload jsonb; proof jsonb; guard jsonb; qualification jsonb; eventrow record;
BEGIN
 INSERT INTO reality_internal.governed_employee_shifts_v1 VALUES(s,o,plan,'AWAITING_EXACT_ORIGINAL_WORK',now(),now()-interval '1 hour','infinity',NULL,now());
 INSERT INTO reality_internal.governed_employee_completion_warrants_v1(shift_id,owner_id,plan_fingerprint,source_scope,mode,state)
  VALUES(s,o,plan,jsonb_build_array(jsonb_build_object('source_ref',src)),'UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS','ACTIVE');
 INSERT INTO reality_internal.final_loop_resume_conditions_v1(shift_id,owner_id,original_work_id,source_ref,condition_kind,subscribed_receipt_sha256,
 continuity_head_sha256,continuity_revision,next_qualified_action,unresolved_proof_gates,proposed_transition,state)
 VALUES(s,o,work,src,'QUALIFIER_PROOF_CHANGED',q,head,3,'VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM',gates,'RECOVER','SUSPENDED');
 INSERT INTO reality_internal.signed_worker_actual_runs_v1 VALUES(oldrun,'COMPLETED',now()-interval '5 minutes',now()-interval '4 minutes','WORKER_RESPONSE_PUBLICATION');
 INSERT INTO reality_internal.governed_worker_release_approvals_v1(request_id,owner_id,shift_id,claim_id,capability_key,state,
 approval_receipt_sha256,provider_alias_observed_at,claimed_at,runtime_scope,release_sha,release_ref,scheduled_alias)
 VALUES(oldreq,o,s,oldclaim,'VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM','CLAIMED_ONCE',receipt_hash,
 now()-interval '6 minutes',now()-interval '7 minutes','{}',repeat('1',40),'fixture-old','fixture.invalid');
 INSERT INTO reality_internal.governed_signed_worker_release_wakes_v1 VALUES(oldrun,o,s,oldclaim,repeat('1',40),'fixture-old','NORMAL_SIGNED_SHIFT',wake_hash);
 INSERT INTO reality_internal.final_loop_resume_events_v1(event_id,shift_id,owner_id,original_work_id,source_ref,signal_kind,
 source_receipt_sha256,previous_receipt_sha256,event_causality_sha256,continuity_head_sha256,continuity_revision,signal_next_action,state,
 governed_wake_worker_run_id,release_continuation_claim_id)
 VALUES(prior_event,s,o,work,src,'QUALIFIER_PROOF_CHANGED',q,wake_hash,wake_hash,oldhead,2,'VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM','SHADOW_OBSERVED',oldrun,oldclaim);
 payload:=jsonb_build_object('owner_id',o,'shift_id',s,'original_work_id',work,'source_ref',src,'provider_outcome_verified',false,
 'original_job_completed',false,'execution_authorized',false,'replay_authorized',false,'production_changed',false,
 'unresolved_proof_gates',gates,'terminal_recovery_history',jsonb_build_object('remaining_attempts',0,'replay_permitted',false));
 INSERT INTO public.universe_events(event_id,continuity_root_id,worldline_id,parent_event_id,entity_type,epistemic_status,lineage_hash,content_hash,payload,provenance,assertion_time) VALUES(parent,root,world,NULL,'fixture_prior','OBSERVED',repeat('d',64),repeat('a',64),'{}','{}',now()-interval '6 minutes');
 INSERT INTO public.universe_events(event_id,continuity_root_id,worldline_id,parent_event_id,entity_type,epistemic_status,lineage_hash,content_hash,payload,provenance,assertion_time) VALUES(observed,root,world,parent,'reality_final_loop_invocation_observation_v1','OBSERVED',repeat('e',64),
 encode(sha256(convert_to(public.reality_continuity_canonical_json_v1(payload),'UTF8')),'hex'),payload,
 jsonb_build_object('worker_run_id',oldrun,'continuity_spine',jsonb_build_object('prior_lineage_hash',repeat('d',64),'source_event_id',parent)),now()-interval '4 minutes');
 INSERT INTO reality_internal.final_loop_transition_receipts_v1(receipt_id,owner_id,shift_id,original_work_id,source_ref,continuity_root_id,continuity_head_sha256,expected_revision,decision,reason_code,worker_run_id,receipt_sha256) VALUES(receipt,o,s,work,src,root,oldhead,2,'SUSPEND','PROVIDER_EFFECT_UNCERTAIN',oldrun,receipt_hash);
 INSERT INTO reality_internal.final_loop_child_approval_packets_v1 VALUES(packet,src,'EFFECT_RESERVED_RECONCILE_ONLY');
 INSERT INTO reality_internal.final_loop_child_review_work_v1(child_work_id,packet_id,owner_id,shift_id,parent_original_work_id,phase)
 VALUES(gen_random_uuid(),packet,o,s,work,'ADMITTED');
 proof:=jsonb_build_object('status','FINAL_LOOP_FROZEN_SCOPE_VERIFIED_ORIGINAL_ACCEPTANCE_PENDING','owner_id',o,'shift_id',s,
 'continuity_head_sha256',head,'revision',3,'independent_owner_scope_verified',true,'governed_qualification_handoffs','[]'::jsonb);
 guard:=jsonb_build_object('status','FINAL_LOOP_SHARED_CONTINUITY_CHECKED','owner_id',o,'shift_id',s,'continuity_head_sha256',head,'revision',3,
 'read_only',true,'production_changed',false,'continuity_root_id',root,'handoff_observation_sha256',wake_hash,
 'execution_authorized',false,'original_job_completed',false,'obligations',jsonb_build_array(jsonb_build_object('original_work_id',work,'source_ref',src,
 'qualifier_receipt_sha256',q,'unresolved_proof_gates',gates,'next_qualified_action','VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM',
 'original_claim_admitted',false,'universe_return_verified',false,
 'continuity_identity_verified',true,'qualifier_digest_verified',true,'source_proof_verified',true,'independent_original_outcome_verified',false,
 'execution_spine_readback',jsonb_build_object('status','SIGNED_INVOCATION_OBSERVATIONS_RETURNED_ORIGINAL_OPEN','canonical_return_event_id',observed,'replay_authorized',false))));
 INSERT INTO public.suspension_fixture_proof VALUES(s,proof||jsonb_build_object('continuity_root_id',root,'frozen_shift_scope_sha256',wake_hash),guard);
 qualification:=jsonb_build_object('shift_id',s,'original_candidate_work_id',work,'source_proof_bound',true,
  'review_scope_qualified',true,'exact_goal_event_verified',true,'exact_acceptance_approval_verified',true,
  'source_head_sha',repeat('c',40),'accepted_review_scope',jsonb_build_object('source_head_sha',repeat('c',40),
  'parent_original_work_id',work,'source_ref',src,'execution_authorized',false),'unsatisfied_gates',gates,
  'recovery_terminal_boundary',true,'recovery_terminal_history',jsonb_build_object('original_work_id',work,'maintenance_id',gen_random_uuid(),
   'remaining_attempts',0,'replay_permitted',false,'new_attempt_authorized',false,'independent_diagnostic_receipt_sha256','sha256:'||repeat('7',64)));
 INSERT INTO reality_internal.owner_continuity_qualification_routes_v1 VALUES(o,src,
  'sha256:'||encode(sha256(convert_to(qualification::text,'UTF8')),'hex'),qualification,'VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM',clock_timestamp());
 scope:=jsonb_build_object('target_deployment_id','dpl_fixture_corrected','runtime_database_project_ref','hvkfreoagbrphwghjajw',
 'target_environment','CANONICAL_BENCHMARK_PREVIEW','exact_runtime_database_contract_verified',true,'independent_gateway_ci_verified',true,
 'independent_qualification_branch_verified',true,'independent_transport_proof_sha256',wake_hash,'child_execution_enabled',false,'parent_delivery_enabled',false,
 'production_changed',false,'plan_fingerprint',plan,'source_ref',src,'original_work_id',work,'continuity_head_sha256',head,'continuity_revision',3,
 'qualifier_receipt_sha256',q);
 INSERT INTO reality_internal.governed_worker_release_approvals_v1(request_id,owner_id,shift_id,claim_id,capability_key,state,approval_receipt_sha256,
 claimed_at,runtime_scope,release_sha,release_ref,scheduled_alias,independent_isolation_proof_sha256)
 VALUES(newreq,o,s,newclaim,'VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM','CLAIMED_ONCE',receipt_hash,now()-interval '1 second',
 scope,repeat('2',40),'fixture-corrected','reality-signed-worker-maloney2323-5310s-projects.vercel.app',wake_hash);
 IF reality_internal.read_final_loop_verified_suspension_v1(o,s,work,src,head,3)->>'receipt_sha256' IS DISTINCT FROM receipt_hash
 OR reality_internal.read_final_loop_verified_suspension_v1(o,s,work,src,oldhead,2) IS NOT NULL
 OR reality_internal.read_final_loop_verified_suspension_v1(o,s,'work:'||repeat('9',32),src,head,3) IS NOT NULL
 THEN RAISE EXCEPTION 'SUSPENSION_SOURCE_OR_REVISION_FENCE_FAILED'; END IF;
 IF reality_internal.stage_final_loop_release_continuation_v1(newreq) IS NOT NULL THEN RAISE EXCEPTION 'UNOBSERVED_RELEASE_QUEUED';END IF;
 UPDATE reality_internal.governed_worker_release_approvals_v1 SET provider_alias_observed_at=clock_timestamp(),
 provider_alias_observed_deployment_id='dpl_fixture_corrected' WHERE request_id=newreq;
 SELECT * INTO eventrow FROM reality_internal.final_loop_resume_events_v1 WHERE release_continuation_claim_id=newclaim;
 IF NOT FOUND OR eventrow.signal_kind<>'VERIFIED_SUSPENSION_INVESTIGATION' OR eventrow.continuity_revision<>3
 OR eventrow.source_receipt_sha256<>receipt_hash OR eventrow.previous_receipt_sha256<>q
 OR eventrow.governed_wake_request_id IS NULL OR (SELECT count(*) FROM net.fake_requests)<>1
 THEN RAISE EXCEPTION 'CURRENT_SUSPENSION_NOT_DELIVERED_ONCE';END IF;
 PERFORM reality_internal.stage_final_loop_release_continuation_v1(newreq);
 PERFORM reality_internal.notify_final_loop_governed_trigger_v1(s);
 IF (SELECT count(*) FROM net.fake_requests)<>1 THEN RAISE EXCEPTION 'SUSPENSION_REPLAYED';END IF;
 INSERT INTO reality_internal.governed_preview_shift_worker_leases_v1 VALUES('preview-governed-employee-shift-worker',lease,now()-interval '1 second',now()+interval '2 minutes',now(),NULL);
 INSERT INTO reality_internal.signed_worker_actual_runs_v1 VALUES(newrun,'STARTED',now(),NULL,'FIXTURE_ONLY');
 INSERT INTO reality_internal.governed_employee_shift_worker_pulses_v1 VALUES(s,o,clock_timestamp(),'WAKE_RECEIVED');
 INSERT INTO reality_internal.governed_signed_worker_release_wakes_v1 VALUES(newrun,o,s,newclaim,repeat('2',40),'fixture-corrected','NORMAL_SIGNED_SHIFT',wake_hash);
END $$;
SET ROLE service_role;
DO $$
DECLARE e record; l record; run uuid; plan text; r jsonb; claim jsonb; second jsonb; i record; fixture_receipt text;
BEGIN
 SELECT * INTO e FROM reality_internal.final_loop_resume_events_v1 WHERE signal_kind='VERIFIED_SUSPENSION_INVESTIGATION';
 SELECT * INTO l FROM reality_internal.governed_preview_shift_worker_leases_v1;
 SELECT run_id INTO run FROM reality_internal.signed_worker_actual_runs_v1 WHERE status='STARTED';
 SELECT plan_fingerprint INTO plan FROM reality_internal.governed_employee_shifts_v1 WHERE shift_id=e.shift_id;
 r:=public.reality_claim_canonical_governed_wake_v1(e.owner_id,e.shift_id,plan,e.event_id,gen_random_uuid(),'RESUME',repeat('2',40),run,l.claim_id);
 IF r->>'status'<>'CANONICAL_GOVERNED_WAKE_MISSING_STALE_OR_CONSUMED' THEN RAISE EXCEPTION 'FOREIGN_NONCE_ACCEPTED';END IF;
 r:=public.reality_claim_canonical_governed_wake_v1(e.owner_id,e.shift_id,plan,e.event_id,e.governed_wake_nonce,'RESUME',repeat('2',40),run,l.claim_id);
 IF r->>'status'<>'CANONICAL_GOVERNED_WAKE_DURABLY_CLAIMED' OR r->>'investigation_only'<>'true'
 OR r->>'execution_authorized'<>'false' THEN RAISE EXCEPTION 'SUSPENSION_CLAIM_NOT_INVESTIGATION_ONLY: %',r;END IF;
 claim:=public.reality_claim_next_shift_continuity_investigation_v1(e.shift_id,run,e.event_id);
 IF claim->>'status'<>'SIGNED_SHIFT_CONTINUITY_INVESTIGATION_CLAIMED'
 OR claim->>'model_inquiry_authorized'<>'true' OR claim->>'execution_authorized'<>'false'
 OR claim->'source_evidence'->>'verified_suspension_receipt_sha256'<>e.source_receipt_sha256
 OR claim->'source_evidence'->>'new_attempt_authorized'<>'false' THEN RAISE EXCEPTION 'EXACT_INVESTIGATION_NOT_CLAIMED: %',claim;END IF;
 second:=public.reality_claim_next_shift_continuity_investigation_v1(e.shift_id,run,e.event_id);
 IF second->>'model_inquiry_authorized'<>'false' THEN RAISE EXCEPTION 'DUPLICATE_INVESTIGATION_AUTHORIZED';END IF;
 r:=public.reality_observe_final_loop_suspension_investigation_v1(e.shift_id,e.event_id,run,(claim->>'incident_id')::uuid,'sha256:'||repeat('0',64));
 IF r->>'status'='SUSPENSION_INVESTIGATION_RECEIPT_INDEPENDENTLY_READ_BACK' THEN RAISE EXCEPTION 'UNRECORDED_INVESTIGATION_ACCEPTED';END IF;
 -- Stand-in for the EXISTING governed investigation writer's receipt in the
 -- isolated fixture only. The observer must independently recompute its hash.
 UPDATE reality_internal.owner_shift_continuity_incidents_v1 SET phase='INVESTIGATION_RECORDED_NEEDS_INDEPENDENT_PROOF',
  assigned_employee='Fixture engineer',independent_reviewer='Fixture verifier',assigned_function_id='engineering',reviewer_function_id='quality',
  investigated_at=clock_timestamp(),diagnosis='Fixture diagnosis only',
  proposed_upgrade='Fixture proposal only',independent_test_requirement='Fixture independent test only',
  limitations='No actual provider or execution effect',model_response_id='resp_fixture_only'
 WHERE incident_id=(claim->>'incident_id')::uuid RETURNING * INTO i;
 fixture_receipt:='sha256:'||encode(sha256(convert_to(jsonb_build_object(
  'owner_id',i.owner_id,'incident_id',i.incident_id,'evidence_sha256',i.evidence_sha256,
  'model_response_id',i.model_response_id,'assigned_employee',i.assigned_employee,'reviewer',i.independent_reviewer,
  'diagnosis',i.diagnosis,'proposed_upgrade',i.proposed_upgrade,'required_independent_test',i.independent_test_requirement,
  'limitations',i.limitations,'new_original_jobs_created',0,'installation_authorized',false)::text,'UTF8')),'hex');
 UPDATE reality_internal.owner_shift_continuity_incidents_v1 SET investigation_receipt_sha256=fixture_receipt WHERE incident_id=i.incident_id;
 r:=public.reality_observe_final_loop_suspension_investigation_v1(e.shift_id,e.event_id,run,i.incident_id,fixture_receipt);
 IF r->>'status'<>'SUSPENSION_INVESTIGATION_RECEIPT_INDEPENDENTLY_READ_BACK'
 OR r->>'execution_authorized'<>'false' OR r->>'new_attempt_authorized'<>'false' OR r->>'original_job_completed'<>'false'
 OR NOT EXISTS(SELECT 1 FROM reality_internal.final_loop_resume_events_v1 WHERE event_id=e.event_id AND state='SHADOW_OBSERVED')
 THEN RAISE EXCEPTION 'EXACT_INVESTIGATION_RECEIPT_NOT_OBSERVED: %',r;END IF;
 r:=public.reality_observe_final_loop_suspension_investigation_v1(e.shift_id,e.event_id,run,i.incident_id,fixture_receipt);
 IF r->>'status'='SUSPENSION_INVESTIGATION_RECEIPT_INDEPENDENTLY_READ_BACK' THEN RAISE EXCEPTION 'DUPLICATE_OBSERVATION_ACCEPTED';END IF;
 IF EXISTS(SELECT 1 FROM reality_internal.final_loop_child_review_work_v1 WHERE canonical_prepare_invocation_id IS NOT NULL OR claimant_worker_run_id IS NOT NULL)
 THEN RAISE EXCEPTION 'CHILD_EXECUTION_EFFECT_CREATED';END IF;
END $$;
RESET ROLE;
-- The first event is observed but its worker is still running: no review delivery.
DO $$
DECLARE i record; first_event record; review_event record;
BEGIN
 SELECT * INTO i FROM reality_internal.owner_shift_continuity_incidents_v1;
 SELECT * INTO first_event FROM reality_internal.final_loop_resume_events_v1 WHERE signal_kind='VERIFIED_SUSPENSION_INVESTIGATION';
 IF EXISTS(SELECT 1 FROM reality_internal.final_loop_resume_events_v1 WHERE signal_kind='VERIFIED_INVESTIGATION_REVIEW')
 THEN RAISE EXCEPTION 'REVIEW_QUEUED_BEFORE_DISTINCT_RUN_READY';END IF;
 UPDATE reality_internal.signed_worker_actual_runs_v1 SET status='COMPLETED',finished_at=clock_timestamp(),
 worker_stage='SUSPENSION_INVESTIGATION_RESPONSE_PUBLICATION' WHERE run_id=first_event.governed_wake_worker_run_id;
 SELECT * INTO review_event FROM reality_internal.final_loop_resume_events_v1 WHERE signal_kind='VERIFIED_INVESTIGATION_REVIEW';
 IF NOT FOUND OR review_event.source_receipt_sha256<>i.investigation_receipt_sha256
 OR review_event.previous_receipt_sha256<>first_event.source_receipt_sha256
 OR review_event.release_continuation_claim_id<>first_event.release_continuation_claim_id
 OR review_event.governed_wake_request_id IS NOT NULL THEN RAISE EXCEPTION 'REVIEW_EVENT_NOT_BOUND_OR_LEASE_NOT_RESPECTED';END IF;
 UPDATE reality_internal.governed_preview_shift_worker_leases_v1 SET released_at=clock_timestamp(),lease_expires_at=clock_timestamp();
 SELECT * INTO review_event FROM reality_internal.final_loop_resume_events_v1 WHERE signal_kind='VERIFIED_INVESTIGATION_REVIEW';
 IF review_event.governed_wake_request_id IS NULL OR (SELECT count(*) FROM net.fake_requests)<>2
 THEN RAISE EXCEPTION 'REVIEW_NOT_DELIVERED_ON_LEASE_RELEASE';END IF;
 PERFORM reality_internal.notify_final_loop_governed_trigger_v1(i.shift_id);
 IF (SELECT count(*) FROM net.fake_requests)<>2 THEN RAISE EXCEPTION 'REVIEW_SIGNAL_REPLAYED';END IF;
END $$;
-- Reproduce the real three-reader identity boundary. The fixture still
-- supplies synthetic proof data; all event staging, trigger and dispatch
-- paths below are the actual installed SQL.
CREATE FUNCTION public.reality_read_owner_shift_execution_graph_v1(uuid,uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $role$
BEGIN
 if current_user<>'service_role' then
  RAISE EXCEPTION 'UNIFIED_SHIFT_EXECUTION_SERVICE_ONLY'; END IF;
 RETURN '{}'::jsonb;
END $role$;
CREATE OR REPLACE FUNCTION public.reality_read_current_final_loop_proof_envelope_v1(uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $role$
BEGIN
 IF current_user <> 'service_role' THEN
  RAISE EXCEPTION 'FINAL_LOOP_CANONICAL_READER_SERVICE_ONLY'; END IF;
 PERFORM public.reality_read_owner_shift_execution_graph_v1(NULL,$1);
 RETURN (SELECT proof FROM public.suspension_fixture_proof WHERE shift_id=$1);
END $role$;
CREATE OR REPLACE FUNCTION public.reality_read_final_loop_shared_continuity_guard_v1(uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $role$
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'FINAL_LOOP_SHARED_CONTINUITY_SERVICE_ONLY';END IF;
 PERFORM public.reality_read_current_final_loop_proof_envelope_v1($1);
 RETURN (SELECT guard FROM public.suspension_fixture_proof WHERE shift_id=$1);
END $role$;
REVOKE ALL ON FUNCTION public.reality_read_owner_shift_execution_graph_v1(uuid,uuid),
 public.reality_read_current_final_loop_proof_envelope_v1(uuid),
 public.reality_read_final_loop_shared_continuity_guard_v1(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_read_owner_shift_execution_graph_v1(uuid,uuid),
 public.reality_read_current_final_loop_proof_envelope_v1(uuid),
 public.reality_read_final_loop_shared_continuity_guard_v1(uuid) TO service_role;
DO $$ BEGIN
 BEGIN
  PERFORM public.reality_read_final_loop_shared_continuity_guard_v1(NULL);
  RAISE EXCEPTION 'FIXTURE_MISSING_REAL_IDENTITY_FENCE';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM<>'FINAL_LOOP_SHARED_CONTINUITY_SERVICE_ONLY' THEN RAISE;END IF;
 END;
END $$;
\if :{?identity_red}
\echo 'Testing original trigger identity defect'
\else
\ir ../sql/reality-final-loop-trigger-verifier-identity-repair-v1.sql
-- Reapplication must be a no-op, with public access still forbidden.
\ir ../sql/reality-final-loop-trigger-verifier-identity-repair-v1.sql
DO $$ DECLARE sig text; BEGIN
 FOREACH sig IN ARRAY ARRAY['public.reality_read_owner_shift_execution_graph_v1(uuid,uuid)',
  'public.reality_read_current_final_loop_proof_envelope_v1(uuid)',
  'public.reality_read_final_loop_shared_continuity_guard_v1(uuid)'] LOOP
  IF has_function_privilege('anon',sig,'EXECUTE') OR has_function_privilege('authenticated',sig,'EXECUTE')
   OR NOT has_function_privilege('service_role',sig,'EXECUTE')
  THEN RAISE EXCEPTION 'CONTINUITY_READER_PRIVILEGE_CHANGED'; END IF;
 END LOOP;
END $$;
\endif
SET ROLE service_role;
DO $$
DECLARE e record; oldrun uuid; newrun uuid:=gen_random_uuid(); lease uuid:=gen_random_uuid();
 plan text; r jsonb; claim jsonb; i record; verdict record; visibility jsonb;
BEGIN
 SELECT * INTO e FROM reality_internal.final_loop_resume_events_v1 WHERE signal_kind='VERIFIED_INVESTIGATION_REVIEW';
 SELECT governed_wake_worker_run_id INTO oldrun FROM reality_internal.final_loop_resume_events_v1 WHERE signal_kind='VERIFIED_SUSPENSION_INVESTIGATION';
 SELECT plan_fingerprint INTO plan FROM reality_internal.governed_employee_shifts_v1 WHERE shift_id=e.shift_id;
 visibility:=public.reality_read_owner_current_continuity_self_visibility_v1(e.owner_id);
 IF visibility->>'status'<>'OWNER_CURRENT_CONTINUITY_SELF_VISIBILITY_READ_ONLY'
 OR visibility->'obligations'->0->'verified_investigation'->>'investigation_worker_run_id' IS DISTINCT FROM oldrun::text
 OR visibility->'obligations'->0->'verified_independent_review' IS DISTINCT FROM 'null'::jsonb
 OR visibility->'obligations'->0->>'continuity_revision'<>'3'
 OR visibility->>'execution_authorized'<>'false'
 THEN RAISE EXCEPTION 'SELF_VISIBILITY_CURRENT_INVESTIGATION_NOT_RECONCILED: %',visibility;END IF;
 IF public.reality_read_owner_current_continuity_self_visibility_v1(gen_random_uuid())->'obligations'<>'[]'::jsonb
 THEN RAISE EXCEPTION 'SELF_VISIBILITY_FOREIGN_OWNER_LEAK';END IF;
 r:=public.reality_claim_shift_continuity_independent_review_v1(e.shift_id,oldrun,e.event_id);
 IF r->>'status'<>'NO_CONTINUITY_INDEPENDENT_REVIEW_READY' THEN RAISE EXCEPTION 'DIAGNOSING_RUN_CLAIMED_OWN_REVIEW';END IF;
 UPDATE reality_internal.governed_preview_shift_worker_leases_v1 SET claim_id=lease,claimed_at=clock_timestamp()-interval '1 second',
  released_at=NULL,lease_expires_at=clock_timestamp()+interval '2 minutes';
 INSERT INTO reality_internal.signed_worker_actual_runs_v1 VALUES(newrun,'STARTED',clock_timestamp(),NULL,'FIXTURE_DISTINCT_REVIEW');
 INSERT INTO reality_internal.governed_signed_worker_release_wakes_v1 VALUES(newrun,e.owner_id,e.shift_id,
  e.release_continuation_claim_id,repeat('2',40),'fixture-corrected','NORMAL_SIGNED_SHIFT','sha256:'||repeat('2',64));
 UPDATE reality_internal.governed_employee_shift_worker_pulses_v1 SET last_worker_seen_at=clock_timestamp(),last_worker_status='WAKE_RECEIVED'
 WHERE shift_id=e.shift_id;
 r:=public.reality_claim_canonical_governed_wake_v1(e.owner_id,e.shift_id,plan,e.event_id,e.governed_wake_nonce,'RESUME',repeat('2',40),newrun,lease);
 IF r->>'status'<>'CANONICAL_GOVERNED_WAKE_DURABLY_CLAIMED' OR r->>'independent_review_only'<>'true'
 OR r->>'investigation_only'<>'false' OR r->>'execution_authorized'<>'false'
 THEN RAISE EXCEPTION 'DISTINCT_REVIEW_CLAIM_NOT_FENCED: %',r;END IF;
 claim:=public.reality_claim_shift_continuity_independent_review_v1(e.shift_id,newrun,e.event_id);
 IF claim->>'status'<>'SIGNED_CONTINUITY_ORIGINAL_REVIEW_CLAIMED' OR claim->>'job_id' IS NOT NULL
 OR claim->>'investigation_worker_run_id'<>oldrun::text OR claim->>'original_work_id'<>e.original_work_id
 OR claim->>'execution_authorized'<>'false' THEN RAISE EXCEPTION 'DIRECT_ORIGINAL_REVIEW_NOT_CLAIMED: %',claim;END IF;
 r:=public.reality_claim_shift_continuity_independent_review_v1(e.shift_id,newrun,e.event_id);
 IF r->>'status'<>'NO_CONTINUITY_INDEPENDENT_REVIEW_READY' THEN RAISE EXCEPTION 'DUPLICATE_REVIEW_CLAIMED';END IF;
 r:=public.reality_record_shift_continuity_independent_review_v1((claim->>'incident_id')::uuid,(claim->>'claim_id')::uuid,newrun,
 e.source_ref,'sha256:'||repeat('8',64),clock_timestamp(),e.event_id,repeat('c',40));
 IF r->>'status'<>'SOURCE_MATCHED_NEEDS_FROZEN_TEST' OR r->>'root_cause_verified'<>'false'
 OR r->>'recommendation_disposition'<>'ADVISORY_ONLY_NO_AUTHORITY_OR_REPLAY'
 OR r->>'new_attempt_authorized'<>'false' OR r->>'original_job_completed'<>'false'
 THEN RAISE EXCEPTION 'INDEPENDENT_REVIEW_VERDICT_UNVERIFIED: %',r;END IF;
 SELECT * INTO verdict FROM reality_internal.shift_continuity_independent_reviews_v1 WHERE incident_id=(claim->>'incident_id')::uuid;
 IF verdict.receipt_sha256 IS DISTINCT FROM 'sha256:'||encode(sha256(convert_to(verdict.independent_verdict::text,'UTF8')),'hex')
 OR NOT EXISTS(SELECT 1 FROM reality_internal.final_loop_resume_events_v1 WHERE event_id=e.event_id AND state='SHADOW_OBSERVED')
 OR EXISTS(SELECT 1 FROM reality_internal.final_loop_child_review_work_v1 WHERE canonical_prepare_invocation_id IS NOT NULL OR claimant_worker_run_id IS NOT NULL)
 THEN RAISE EXCEPTION 'REVIEW_HASH_OR_ORIGINAL_AUTHORITY_DRIFT';END IF;
 visibility:=public.reality_read_owner_current_continuity_self_visibility_v1(e.owner_id);
 IF visibility->'obligations'->0->'verified_independent_review' IS DISTINCT FROM 'null'::jsonb
 THEN RAISE EXCEPTION 'SELF_VISIBILITY_PREMATURE_REVIEW_PROOF';END IF;
 -- Bind the fixture guard to the actual canonical qualifier digest, not the initial placeholder.
 UPDATE public.suspension_fixture_proof f SET guard=jsonb_set(f.guard,'{obligations,0,qualifier_receipt_sha256}',to_jsonb(q.reconciliation_receipt_sha256))
 FROM reality_internal.owner_continuity_qualification_routes_v1 q WHERE f.shift_id=e.shift_id AND q.owner_id=e.owner_id AND q.source_ref=e.source_ref;
 UPDATE reality_internal.signed_worker_actual_runs_v1 SET status='COMPLETED',finished_at=clock_timestamp(),
 worker_stage='INDEPENDENT_INVESTIGATION_REVIEW_RESPONSE_PUBLICATION' WHERE run_id=newrun;
 visibility:=public.reality_read_owner_current_continuity_self_visibility_v1(e.owner_id);
 IF visibility->'obligations'->0->'verified_independent_review'->>'receipt_sha256' IS DISTINCT FROM verdict.receipt_sha256
 OR visibility->'obligations'->0->>'operational_next_action'<>'QUALIFY_DISTINCT_RECOVERY_EVIDENCE_AND_EXACT_BUDGET_NO_REPLAY'
 OR visibility->'obligations'->0->'verified_independent_review'->>'original_job_completed'<>'false'
 THEN RAISE EXCEPTION 'SELF_VISIBILITY_DISTINCT_REVIEW_NOT_RECONCILED: %',visibility;END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF has_function_privilege('authenticated','public.reality_read_owner_current_continuity_self_visibility_v1(uuid)','EXECUTE')
 OR has_function_privilege('anon','public.reality_read_owner_current_continuity_self_visibility_v1(uuid)','EXECUTE')
 THEN RAISE EXCEPTION 'SELF_VISIBILITY_RPC_EXPOSED';END IF;
 IF has_function_privilege('authenticated','public.reality_claim_shift_continuity_independent_review_v1(uuid,uuid,uuid)','EXECUTE')
 OR has_function_privilege('anon','public.reality_record_shift_continuity_independent_review_v1(uuid,uuid,uuid,text,text,timestamptz,uuid,text)','EXECUTE')
 THEN RAISE EXCEPTION 'DIRECT_ORIGINAL_REVIEW_RPC_EXPOSED';END IF;
 IF has_function_privilege('authenticated','public.reality_claim_next_shift_continuity_investigation_v1(uuid,uuid,uuid)','EXECUTE')
 OR has_function_privilege('anon','public.reality_observe_final_loop_suspension_investigation_v1(uuid,uuid,uuid,uuid,text)','EXECUTE')
 THEN RAISE EXCEPTION 'INVESTIGATION_RPC_PUBLICLY_EXPOSED';END IF;
END $$;

-- Continue the same fixture original through the distinct terminal evidence
-- run, without installing or resetting its exhausted strategy.
DO $$
DECLARE e record;
BEGIN
 SELECT * INTO e FROM reality_internal.final_loop_resume_events_v1 WHERE signal_kind='VERIFIED_REVIEW_TECHNICAL_EVIDENCE';
 IF NOT FOUND OR e.governed_wake_request_id IS NOT NULL THEN RAISE EXCEPTION 'TERMINAL_EVIDENCE_EVENT_NOT_STAGED_OR_LEASE_BYPASSED';END IF;
 UPDATE reality_internal.governed_preview_shift_worker_leases_v1 SET released_at=clock_timestamp(),lease_expires_at=clock_timestamp();
 SELECT * INTO e FROM reality_internal.final_loop_resume_events_v1 WHERE signal_kind='VERIFIED_REVIEW_TECHNICAL_EVIDENCE';
 IF e.governed_wake_request_id IS NULL OR (SELECT count(*) FROM net.fake_requests)<>3 THEN RAISE EXCEPTION 'TERMINAL_EVIDENCE_NOT_DELIVERED';END IF;
 PERFORM reality_internal.notify_final_loop_governed_trigger_v1(e.shift_id);
 IF (SELECT count(*) FROM net.fake_requests)<>3 THEN RAISE EXCEPTION 'TERMINAL_EVIDENCE_DELIVERY_REPLAYED';END IF;
END $$;
-- Simulate the observed live read-only retrieval failure, not a failed
-- original action. Use the genuine nonce claim and exact signed context.
SET ROLE service_role;
DO $$
DECLARE e record; run uuid:=gen_random_uuid(); lease uuid:=gen_random_uuid(); plan text; r jsonb;
BEGIN
 SELECT * INTO e FROM reality_internal.final_loop_resume_events_v1 WHERE signal_kind='VERIFIED_REVIEW_TECHNICAL_EVIDENCE';
 SELECT plan_fingerprint INTO plan FROM reality_internal.governed_employee_shifts_v1 WHERE shift_id=e.shift_id;
 UPDATE reality_internal.governed_preview_shift_worker_leases_v1 SET claim_id=lease,claimed_at=clock_timestamp()-interval '1 second',
 released_at=NULL,lease_expires_at=clock_timestamp()+interval '2 minutes';
 INSERT INTO reality_internal.signed_worker_actual_runs_v1 VALUES(run,'STARTED',clock_timestamp(),NULL,'FIXTURE_FAILED_TERMINAL_READBACK');
 INSERT INTO reality_internal.governed_signed_worker_release_wakes_v1 VALUES(run,e.owner_id,e.shift_id,e.release_continuation_claim_id,
 repeat('2',40),'fixture-corrected','NORMAL_SIGNED_SHIFT','sha256:'||repeat('2',64));
 UPDATE reality_internal.governed_employee_shift_worker_pulses_v1 SET last_worker_seen_at=clock_timestamp(),last_worker_status='WAKE_RECEIVED'
 WHERE shift_id=e.shift_id;
 r:=public.reality_claim_canonical_governed_wake_v1(e.owner_id,e.shift_id,plan,e.event_id,e.governed_wake_nonce,'RESUME',repeat('2',40),run,lease);
 IF r->>'status'<>'CANONICAL_GOVERNED_WAKE_DURABLY_CLAIMED' OR r->>'terminal_technical_evidence_only'<>'true'
  OR r->>'execution_authorized'<>'false' THEN RAISE EXCEPTION 'FIRST_READ_ONLY_CLAIM_UNVERIFIED';END IF;
 r:=public.reality_read_final_loop_terminal_technical_context_v1(e.shift_id,e.event_id,run);
 IF r->>'status'<>'TERMINAL_TECHNICAL_CONTEXT_VERIFIED_READ_ONLY' THEN RAISE EXCEPTION 'FIRST_READ_ONLY_CONTEXT_UNVERIFIED';END IF;
 UPDATE reality_internal.governed_employee_shift_worker_pulses_v1 SET last_worker_seen_at=clock_timestamp(),
 last_worker_completed_at=clock_timestamp(),last_worker_status='WAKE_COMPLETED',last_worker_safe_result='TERMINAL_TECHNICAL_EVIDENCE_UNVERIFIED'
 WHERE shift_id=e.shift_id;
 UPDATE reality_internal.signed_worker_actual_runs_v1 SET status='COMPLETED',finished_at=clock_timestamp(),
 worker_stage='TERMINAL_TECHNICAL_EVIDENCE_RESPONSE_PUBLICATION' WHERE run_id=run;
END $$;
RESET ROLE;
-- Exercise an interrupted final write against the same fixture, then roll back
-- the disposable scenario so the existing completed-unverified path still runs.
DO $$
DECLARE e record; a record; next_event uuid; next_req uuid:=gen_random_uuid(); next_claim uuid:=gen_random_uuid();
 q text; t timestamptz:=clock_timestamp(); failed record; old_event record; proof jsonb; denial uuid;
BEGIN
 BEGIN
 SELECT * INTO e FROM reality_internal.final_loop_resume_events_v1 WHERE signal_kind='VERIFIED_REVIEW_TECHNICAL_EVIDENCE';
 SELECT * INTO a FROM reality_internal.governed_worker_release_approvals_v1 WHERE claim_id=e.release_continuation_claim_id;
 SELECT reconciliation_receipt_sha256 INTO q FROM reality_internal.owner_continuity_qualification_routes_v1 WHERE owner_id=e.owner_id AND source_ref=e.source_ref;
 UPDATE reality_internal.final_loop_resume_events_v1 SET governed_wake_queued_at=t-interval '10 minutes' WHERE event_id=e.event_id;
 -- Keep historical fixture runs earlier than this interrupted run, as they
 -- are on the real timeline. The previous positive fixture runs in seconds.
 UPDATE reality_internal.signed_worker_actual_runs_v1 SET started_at=least(started_at,t-interval '11 minutes')
 WHERE run_id<>e.governed_wake_worker_run_id;
 UPDATE reality_internal.signed_worker_actual_runs_v1 SET status='STARTED',finished_at=NULL,started_at=t-interval '9 minutes',
 worker_stage='SHIFT_DB_BOUNDARY' WHERE run_id=e.governed_wake_worker_run_id;
 UPDATE reality_internal.governed_preview_shift_worker_leases_v1 SET claimed_at=t-interval '9 minutes 1 second',
 lease_expires_at=t-interval '3 minutes',released_at=NULL;
 UPDATE reality_internal.governed_employee_shift_worker_pulses_v1 SET last_worker_seen_at=t-interval '8 minutes',
 last_worker_completed_at=t-interval '11 minutes',last_worker_status='WAKE_RECEIVED',last_worker_safe_result=NULL WHERE shift_id=e.shift_id;
 INSERT INTO reality_internal.governed_worker_release_approvals_v1(request_id,owner_id,shift_id,claim_id,capability_key,state,
 approval_receipt_sha256,claimed_at,provider_alias_observed_at,provider_alias_observed_deployment_id,runtime_scope,release_sha,release_ref,scheduled_alias,independent_isolation_proof_sha256)
 VALUES(next_req,a.owner_id,a.shift_id,next_claim,a.capability_key,'CLAIMED_ONCE',a.approval_receipt_sha256,t,t,'dpl_fixture_interrupt',
 a.runtime_scope||jsonb_build_object('target_deployment_id','dpl_fixture_interrupt','qualifier_receipt_sha256',q),
 repeat('4',40),'fixture-interruption-correction',a.scheduled_alias,a.independent_isolation_proof_sha256);
 IF reality_internal.stage_final_loop_terminal_technical_evidence_v1(next_req) IS NOT NULL THEN RAISE EXCEPTION 'INTERRUPTION_WITHOUT_PROVIDER_RESPONSE_ACCEPTED';END IF;
 INSERT INTO net._http_response VALUES(e.governed_wake_request_id,503,'application/json; charset=utf-8',
 '{"ok":false,"error":"SHIFT_WORKER_PROVIDER_OR_DATABASE_UNVERIFIED","work_completed":true,"installation_authorized":false,"production_changed":false}',false,t-interval '9 minutes 30 seconds');
 IF reality_internal.stage_final_loop_terminal_technical_evidence_v1(next_req) IS NOT NULL THEN RAISE EXCEPTION 'INTERRUPTION_WITH_EFFECT_ACCEPTED';END IF;
 UPDATE net._http_response SET content='{"ok":false,"error":"SHIFT_WORKER_PROVIDER_OR_DATABASE_UNVERIFIED","work_completed":false,"installation_authorized":false,"production_changed":false}' WHERE id=e.governed_wake_request_id;
 UPDATE reality_internal.governed_preview_shift_worker_leases_v1 SET lease_expires_at=t+interval '1 minute';
 IF reality_internal.stage_final_loop_terminal_technical_evidence_v1(next_req) IS NOT NULL THEN RAISE EXCEPTION 'ACTIVE_LEASE_INTERRUPTION_ACCEPTED';END IF;
 UPDATE reality_internal.governed_preview_shift_worker_leases_v1 SET lease_expires_at=t-interval '3 minutes';
 INSERT INTO reality_internal.governed_original_independent_final_receipts_v1 VALUES(e.owner_id,e.shift_id,e.original_work_id);
 IF reality_internal.stage_final_loop_terminal_technical_evidence_v1(next_req) IS NOT NULL THEN RAISE EXCEPTION 'SETTLED_ORIGINAL_INTERRUPTION_ACCEPTED';END IF;
 DELETE FROM reality_internal.governed_original_independent_final_receipts_v1 WHERE original_work_id=e.original_work_id;
 INSERT INTO reality_internal.signed_worker_actual_runs_v1(run_id,status,started_at,finished_at,worker_stage)
 VALUES(next_claim,'STARTED',t-interval '2 minutes',NULL,'FIXTURE_NEWER_WORKER');
 IF reality_internal.stage_final_loop_terminal_technical_evidence_v1(next_req) IS NOT NULL THEN RAISE EXCEPTION 'NEWER_WORKER_INTERRUPTION_ACCEPTED';END IF;
 DELETE FROM reality_internal.signed_worker_actual_runs_v1 WHERE run_id=next_claim;
 UPDATE net._http_response SET id=e.governed_wake_request_id+1000 WHERE id=e.governed_wake_request_id;
 IF reality_internal.stage_final_loop_terminal_technical_evidence_v1(next_req) IS NOT NULL THEN RAISE EXCEPTION 'FOREIGN_REQUEST_INTERRUPTION_ACCEPTED';END IF;
 UPDATE net._http_response SET id=e.governed_wake_request_id WHERE id=e.governed_wake_request_id+1000;
 IF reality_internal.stage_final_loop_terminal_technical_evidence_v1(a.request_id) IS NOT NULL THEN RAISE EXCEPTION 'INTERRUPTION_SAME_RELEASE_REPLAYED';END IF;
 next_event:=reality_internal.stage_final_loop_terminal_technical_evidence_v1(next_req);
 SELECT * INTO failed FROM reality_internal.signed_worker_actual_runs_v1 WHERE run_id=e.governed_wake_worker_run_id;
 SELECT * INTO old_event FROM reality_internal.final_loop_resume_events_v1 WHERE event_id=e.event_id;
 proof:=failed.interrupted_evidence_failure_v1;
 IF next_event IS NULL OR next_event=e.event_id OR failed.status<>'FAILED' OR failed.finished_at IS NULL
  OR failed.worker_stage<>'SHIFT_DB_BOUNDARY' OR proof->>'request_id' IS DISTINCT FROM e.governed_wake_request_id::text
  OR proof->>'receipt_sha256' IS DISTINCT FROM 'sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to((proof-'receipt_sha256')::text,'UTF8')),'hex')
  OR proof->>'replay_authorized'<>'false' OR proof->>'previous_attempt_budget_preserved'<>'true'
  OR old_event.state<>'SHADOW_STALE' OR old_event.governed_wake_nonce IS DISTINCT FROM e.governed_wake_nonce
  OR old_event.governed_wake_worker_run_id IS DISTINCT FROM e.governed_wake_worker_run_id OR old_event.observed_at IS NOT NULL
  OR NOT EXISTS(SELECT 1 FROM reality_internal.final_loop_resume_events_v1 fresh WHERE fresh.event_id=next_event
    AND fresh.original_work_id=e.original_work_id AND fresh.continuity_revision=e.continuity_revision
    AND fresh.continuity_head_sha256=e.continuity_head_sha256 AND fresh.release_continuation_claim_id=next_claim
    AND fresh.governed_wake_worker_run_id IS NULL AND fresh.state='SHADOW_PENDING')
 THEN RAISE EXCEPTION 'INTERRUPTED_EVIDENCE_RECONCILIATION_FAILED';END IF;
 IF reality_internal.stage_final_loop_terminal_technical_evidence_v1(next_req) IS NOT NULL THEN RAISE EXCEPTION 'INTERRUPTED_EVIDENCE_DUPLICATED';END IF;
 -- Use the existing service-only claim, exact context reader and verifier
 -- return writer on the DISTINCT recovered event. Fixture proof is explicitly
 -- synthetic; the live revision must still use actual provider evidence.
 SET LOCAL ROLE service_role;
 DECLARE e record; run uuid:=gen_random_uuid(); lease uuid:=gen_random_uuid(); plan text; ctx jsonb; r jsonb; proof jsonb;
BEGIN
 SELECT * INTO e FROM reality_internal.final_loop_resume_events_v1 WHERE event_id=next_event AND signal_kind='VERIFIED_REVIEW_TECHNICAL_EVIDENCE' AND state='SHADOW_PENDING';
 SELECT plan_fingerprint INTO plan FROM reality_internal.governed_employee_shifts_v1 WHERE shift_id=e.shift_id;
 UPDATE reality_internal.governed_preview_shift_worker_leases_v1 SET claim_id=lease,claimed_at=clock_timestamp()-interval '1 second',
 released_at=NULL,lease_expires_at=clock_timestamp()+interval '2 minutes';
 INSERT INTO reality_internal.signed_worker_actual_runs_v1 VALUES(run,'STARTED',clock_timestamp(),NULL,'FIXTURE_TERMINAL_READBACK');
 INSERT INTO reality_internal.governed_signed_worker_release_wakes_v1 VALUES(run,e.owner_id,e.shift_id,e.release_continuation_claim_id,
 repeat('4',40),'fixture-interruption-correction','NORMAL_SIGNED_SHIFT','sha256:'||repeat('2',64));
 UPDATE reality_internal.governed_employee_shift_worker_pulses_v1 SET last_worker_seen_at=clock_timestamp(),last_worker_status='WAKE_RECEIVED'
 WHERE shift_id=e.shift_id;
 r:=public.reality_claim_canonical_governed_wake_v1(e.owner_id,e.shift_id,plan,e.event_id,e.governed_wake_nonce,'RESUME',repeat('4',40),run,lease);
 IF r->>'status'<>'CANONICAL_GOVERNED_WAKE_DURABLY_CLAIMED' OR r->>'terminal_technical_evidence_only'<>'true' OR r->>'execution_authorized'<>'false'
 THEN RAISE EXCEPTION 'TERMINAL_EVIDENCE_CLAIM_UNVERIFIED %',r;END IF;
 ctx:=public.reality_read_final_loop_terminal_technical_context_v1(e.shift_id,e.event_id,run);
 IF ctx->>'status'<>'TERMINAL_TECHNICAL_CONTEXT_VERIFIED_READ_ONLY' OR ctx->>'original_work_id'<>e.original_work_id
 OR ctx->>'worker_run_id' IS DISTINCT FROM run::text OR ctx->>'running_release_sha' IS DISTINCT FROM repeat('4',40)
 OR ctx->>'running_release_ref' IS DISTINCT FROM 'fixture-interruption-correction' OR ctx->>'release_claim_id' IS DISTINCT FROM e.release_continuation_claim_id::text
 THEN RAISE EXCEPTION 'TERMINAL_CONTEXT_UNVERIFIED %',ctx;END IF;
 proof:=jsonb_build_object('status','RECOVERY_TERMINAL_TECHNICAL_CI_ATTESTED_BUDGET_UNCHANGED','contract_id',NULL,
 'owner_id',e.owner_id,'shift_id',e.shift_id,'obligation_id',e.original_work_id,'source_ref',e.source_ref,
 'source_revision',ctx->>'frozen_source_head_sha','qualifier_receipt_sha256',ctx->>'qualifier_receipt_sha256',
 'maintenance_id',ctx->'terminal_history'->>'maintenance_id','existing_diagnostic_receipt_sha256',ctx->'terminal_history'->>'independent_diagnostic_receipt_sha256',
 'independent_technical_ci_verified',true,'frozen_technical_red_verified',true,'independent_ci_provider_observation',true,
 'original_business_case_red_verified',false,'business_original_warrant_verified',false,'original_job_completed',false,
 'previous_attempt_budget_preserved',true,'new_attempt_authorized',false,'repeat_prior_ci_dispatch_permitted',false,
 'execution_authorized',false,'production_changed',false,'github_artifact_digest','sha256:'||repeat('9',64),
 'signed_case_spec_git_blob_sha',repeat('a',40),'github_run_id',123,'github_job_id',456,'github_artifact_id',789,'github_release_sha',repeat('4',40));
 r:=public.reality_record_final_loop_technical_ci_observation_v1(e.shift_id,e.event_id,run,proof||jsonb_build_object('original_business_case_red_verified',true));
 IF r->>'status'<>'TERMINAL_TECHNICAL_PROVIDER_PROOF_UNVERIFIED' THEN RAISE EXCEPTION 'TECHNICAL_PROOF_PROMOTED_TO_BUSINESS_RED';END IF;
 r:=public.reality_record_final_loop_technical_ci_observation_v1(e.shift_id,e.event_id,run,proof);
 IF r->>'status'<>'TERMINAL_TECHNICAL_EVIDENCE_RETURNED_ORIGINAL_OPEN' OR r->>'revision'<>'4'
 OR r->>'original_job_completed'<>'false' OR r->>'new_attempt_authorized'<>'false'
 THEN RAISE EXCEPTION 'TERMINAL_EVIDENCE_RETURN_UNVERIFIED %',r;END IF;
 IF EXISTS(SELECT 1 FROM reality_internal.final_loop_resume_conditions_v1 WHERE shift_id=e.shift_id AND (continuity_revision<>4 OR state<>'SUSPENDED'))
 OR NOT EXISTS(SELECT 1 FROM public.universe_events WHERE entity_type='reality_final_loop_terminal_technical_observation_v1'
 AND payload->>'original_work_id'=e.original_work_id AND payload->'terminal_recovery_history'->>'remaining_attempts'='0')
 THEN RAISE EXCEPTION 'TERMINAL_RETURN_LOST_ORIGINAL_OR_BUDGET';END IF;
 r:=public.reality_record_final_loop_technical_ci_observation_v1(e.shift_id,e.event_id,run,proof);
 IF r->>'status'='TERMINAL_TECHNICAL_EVIDENCE_RETURNED_ORIGINAL_OPEN' THEN RAISE EXCEPTION 'TECHNICAL_RETURN_REPLAYED';END IF;

 END;
 RESET ROLE;
 RAISE SQLSTATE 'P9999';
 EXCEPTION WHEN SQLSTATE 'P9999' THEN NULL;
 END;
END $$;
DO $$
DECLARE e record; a record; next_event record; newreq uuid:=gen_random_uuid(); newclaim uuid:=gen_random_uuid(); q text;
BEGIN
 SELECT * INTO e FROM reality_internal.final_loop_resume_events_v1 WHERE signal_kind='VERIFIED_REVIEW_TECHNICAL_EVIDENCE';
 SELECT * INTO a FROM reality_internal.governed_worker_release_approvals_v1 WHERE claim_id=e.release_continuation_claim_id;
 SELECT reconciliation_receipt_sha256 INTO q FROM reality_internal.owner_continuity_qualification_routes_v1 WHERE owner_id=e.owner_id AND source_ref=e.source_ref;
 UPDATE reality_internal.governed_preview_shift_worker_leases_v1 SET released_at=clock_timestamp(),lease_expires_at=clock_timestamp();
 IF reality_internal.stage_final_loop_terminal_technical_evidence_v1(a.request_id) IS NOT NULL
 OR (SELECT count(*) FROM net.fake_requests)<>3 THEN RAISE EXCEPTION 'SAME_RELEASE_REPLAY_ALLOWED';END IF;
 -- New exact release fixture; the old nonce/claim/run must not be reset.
 INSERT INTO reality_internal.governed_worker_release_approvals_v1(request_id,owner_id,shift_id,claim_id,capability_key,state,
 approval_receipt_sha256,claimed_at,runtime_scope,release_sha,release_ref,scheduled_alias,independent_isolation_proof_sha256)
 VALUES(newreq,a.owner_id,a.shift_id,newclaim,a.capability_key,'CLAIMED_ONCE',a.approval_receipt_sha256,clock_timestamp(),
 a.runtime_scope||jsonb_build_object('target_deployment_id','dpl_fixture_provider_read','qualifier_receipt_sha256',q),
 repeat('3',40),'fixture-provider-read',a.scheduled_alias,a.independent_isolation_proof_sha256);
 IF reality_internal.stage_final_loop_terminal_technical_evidence_v1(newreq) IS NOT NULL
 THEN RAISE EXCEPTION 'UNOBSERVED_RELEASE_CONTINUED';END IF;
 UPDATE reality_internal.governed_worker_release_approvals_v1 SET provider_alias_observed_at=clock_timestamp(),
 provider_alias_observed_deployment_id='dpl_fixture_provider_read' WHERE request_id=newreq;
 SELECT * INTO next_event FROM reality_internal.final_loop_resume_events_v1 WHERE signal_kind='VERIFIED_REVIEW_TECHNICAL_EVIDENCE'
 AND release_continuation_claim_id=newclaim;
 IF NOT FOUND OR next_event.event_id=e.event_id OR next_event.original_work_id<>e.original_work_id
 OR next_event.source_receipt_sha256<>e.source_receipt_sha256 OR next_event.previous_receipt_sha256<>e.previous_receipt_sha256
 OR next_event.event_causality_sha256<>e.event_causality_sha256 OR next_event.continuity_revision<>3
 OR next_event.continuity_head_sha256<>e.continuity_head_sha256 OR next_event.governed_wake_request_id IS NULL
 OR next_event.governed_wake_nonce=e.governed_wake_nonce OR next_event.governed_wake_worker_run_id IS NOT NULL
 OR NOT EXISTS(SELECT 1 FROM reality_internal.final_loop_resume_events_v1 old WHERE old.event_id=e.event_id
 AND old.state='SHADOW_STALE' AND old.governed_wake_nonce=e.governed_wake_nonce
 AND old.governed_wake_worker_run_id=e.governed_wake_worker_run_id AND old.release_continuation_claim_id=e.release_continuation_claim_id
 AND old.governed_wake_request_id=e.governed_wake_request_id AND old.observed_at IS NULL)
 OR (SELECT count(*) FROM net.fake_requests)<>4
 THEN RAISE EXCEPTION 'CONSUMED_EVIDENCE_CONTINUATION_UNVERIFIED';END IF;
 IF reality_internal.stage_final_loop_terminal_technical_evidence_v1(newreq) IS NOT NULL
 THEN RAISE EXCEPTION 'CORRECTED_RELEASE_DUPLICATE_STAGED';END IF;
 PERFORM reality_internal.notify_final_loop_governed_trigger_v1(e.shift_id);
 IF (SELECT count(*) FROM net.fake_requests)<>4 THEN RAISE EXCEPTION 'CORRECTED_RELEASE_DUPLICATE_DELIVERED';END IF;
END $$;
-- Compare the exact unchanged terminal-review proof before and after the
-- function-scoped planner configuration, with the same fixture and zero budget.
SELECT md5(prosrc) AS body_hash,coalesce(proacl::text,'') AS acl FROM pg_proc
 WHERE oid='reality_internal.read_final_loop_verified_terminal_review_v1(uuid,uuid,text,text,text,bigint)'::regprocedure \gset prior_function_
SET ROLE service_role;
WITH e AS MATERIALIZED (SELECT * FROM reality_internal.final_loop_resume_events_v1
 WHERE signal_kind='VERIFIED_REVIEW_TECHNICAL_EVIDENCE' AND state='SHADOW_PENDING'),
 proof AS MATERIALIZED (SELECT reality_internal.read_final_loop_verified_terminal_review_v1(
 e.owner_id,e.shift_id,e.original_work_id,e.source_ref,e.continuity_head_sha256,e.continuity_revision) AS value FROM e)
SELECT coalesce(encode(sha256(convert_to(value::text,'UTF8')),'hex'),'MISSING') AS digest,
 coalesce(value->'terminal_history'->>'remaining_attempts','MISSING') AS budget FROM proof \gset prior_proof_
RESET ROLE;
\ir ../sql/reality-continuity-terminal-readback-plan-v1.sql
SELECT 1/CASE WHEN md5(prosrc)=:'prior_function_body_hash' AND coalesce(proacl::text,'')=:'prior_function_acl'
 AND proconfig @> ARRAY['join_collapse_limit=1','from_collapse_limit=1'] THEN 1 ELSE 0 END AS unchanged_body_acl_and_local_plan
 FROM pg_proc WHERE oid='reality_internal.read_final_loop_verified_terminal_review_v1(uuid,uuid,text,text,text,bigint)'::regprocedure;
SET ROLE service_role;
SET join_collapse_limit=8;
SET from_collapse_limit=8;
WITH e AS MATERIALIZED (SELECT * FROM reality_internal.final_loop_resume_events_v1
 WHERE signal_kind='VERIFIED_REVIEW_TECHNICAL_EVIDENCE' AND state='SHADOW_PENDING'),
 proof AS MATERIALIZED (SELECT reality_internal.read_final_loop_verified_terminal_review_v1(
 e.owner_id,e.shift_id,e.original_work_id,e.source_ref,e.continuity_head_sha256,e.continuity_revision) AS value FROM e)
SELECT 1/CASE WHEN :'prior_proof_digest'<>'MISSING' AND :'prior_proof_budget'='0'
 AND encode(sha256(convert_to(value::text,'UTF8')),'hex')=:'prior_proof_digest'
 AND value->'terminal_history'->>'remaining_attempts'='0'
 AND value->>'execution_authorized'='false' AND value->>'replay_authorized'='false'
 AND value->>'new_attempt_authorized'='false' THEN 1 ELSE 0 END AS identical_terminal_proof FROM proof;
SELECT 1/CASE WHEN current_setting('join_collapse_limit')='8' AND current_setting('from_collapse_limit')='8'
 THEN 1 ELSE 0 END AS caller_plan_restored;
RESET ROLE;
SET ROLE service_role;
DO $$
DECLARE e record; run uuid:=gen_random_uuid(); lease uuid:=gen_random_uuid(); plan text; ctx jsonb; r jsonb; proof jsonb;
BEGIN
 SELECT * INTO e FROM reality_internal.final_loop_resume_events_v1 WHERE signal_kind='VERIFIED_REVIEW_TECHNICAL_EVIDENCE' AND state='SHADOW_PENDING';
 SELECT plan_fingerprint INTO plan FROM reality_internal.governed_employee_shifts_v1 WHERE shift_id=e.shift_id;
 UPDATE reality_internal.governed_preview_shift_worker_leases_v1 SET claim_id=lease,claimed_at=clock_timestamp()-interval '1 second',
 released_at=NULL,lease_expires_at=clock_timestamp()+interval '2 minutes';
 INSERT INTO reality_internal.signed_worker_actual_runs_v1 VALUES(run,'STARTED',clock_timestamp(),NULL,'FIXTURE_TERMINAL_READBACK');
 INSERT INTO reality_internal.governed_signed_worker_release_wakes_v1 VALUES(run,e.owner_id,e.shift_id,e.release_continuation_claim_id,
 repeat('3',40),'fixture-provider-read','NORMAL_SIGNED_SHIFT','sha256:'||repeat('2',64));
 UPDATE reality_internal.governed_employee_shift_worker_pulses_v1 SET last_worker_seen_at=clock_timestamp(),last_worker_status='WAKE_RECEIVED'
 WHERE shift_id=e.shift_id;
 r:=public.reality_claim_canonical_governed_wake_v1(e.owner_id,e.shift_id,plan,e.event_id,e.governed_wake_nonce,'RESUME',repeat('3',40),run,lease);
 IF r->>'status'<>'CANONICAL_GOVERNED_WAKE_DURABLY_CLAIMED' OR r->>'terminal_technical_evidence_only'<>'true' OR r->>'execution_authorized'<>'false'
 THEN RAISE EXCEPTION 'TERMINAL_EVIDENCE_CLAIM_UNVERIFIED %',r;END IF;
 ctx:=public.reality_read_final_loop_terminal_technical_context_v1(e.shift_id,e.event_id,run);
 IF ctx->>'status'<>'TERMINAL_TECHNICAL_CONTEXT_VERIFIED_READ_ONLY' OR ctx->>'original_work_id'<>e.original_work_id
 OR ctx->>'worker_run_id' IS DISTINCT FROM run::text OR ctx->>'running_release_sha' IS DISTINCT FROM repeat('3',40)
 OR ctx->>'running_release_ref' IS DISTINCT FROM 'fixture-provider-read' OR ctx->>'release_claim_id' IS DISTINCT FROM e.release_continuation_claim_id::text
 THEN RAISE EXCEPTION 'TERMINAL_CONTEXT_UNVERIFIED %',ctx;END IF;
 proof:=jsonb_build_object('status','RECOVERY_TERMINAL_TECHNICAL_CI_ATTESTED_BUDGET_UNCHANGED','contract_id',NULL,
 'owner_id',e.owner_id,'shift_id',e.shift_id,'obligation_id',e.original_work_id,'source_ref',e.source_ref,
 'source_revision',ctx->>'frozen_source_head_sha','qualifier_receipt_sha256',ctx->>'qualifier_receipt_sha256',
 'maintenance_id',ctx->'terminal_history'->>'maintenance_id','existing_diagnostic_receipt_sha256',ctx->'terminal_history'->>'independent_diagnostic_receipt_sha256',
 'independent_technical_ci_verified',true,'frozen_technical_red_verified',true,'independent_ci_provider_observation',true,
 'original_business_case_red_verified',false,'business_original_warrant_verified',false,'original_job_completed',false,
 'previous_attempt_budget_preserved',true,'new_attempt_authorized',false,'repeat_prior_ci_dispatch_permitted',false,
 'execution_authorized',false,'production_changed',false,'github_artifact_digest','sha256:'||repeat('9',64),
 'signed_case_spec_git_blob_sha',repeat('a',40),'github_run_id',123,'github_job_id',456,'github_artifact_id',789,'github_release_sha',repeat('3',40));
 r:=public.reality_record_final_loop_technical_ci_observation_v1(e.shift_id,e.event_id,run,proof||jsonb_build_object('original_business_case_red_verified',true));
 IF r->>'status'<>'TERMINAL_TECHNICAL_PROVIDER_PROOF_UNVERIFIED' THEN RAISE EXCEPTION 'TECHNICAL_PROOF_PROMOTED_TO_BUSINESS_RED';END IF;
 r:=public.reality_record_final_loop_technical_ci_observation_v1(e.shift_id,e.event_id,run,proof);
 IF r->>'status'<>'TERMINAL_TECHNICAL_EVIDENCE_RETURNED_ORIGINAL_OPEN' OR r->>'revision'<>'4'
 OR r->>'original_job_completed'<>'false' OR r->>'new_attempt_authorized'<>'false'
 THEN RAISE EXCEPTION 'TERMINAL_EVIDENCE_RETURN_UNVERIFIED %',r;END IF;
 IF EXISTS(SELECT 1 FROM reality_internal.final_loop_resume_conditions_v1 WHERE shift_id=e.shift_id AND (continuity_revision<>4 OR state<>'SUSPENDED'))
 OR NOT EXISTS(SELECT 1 FROM public.universe_events WHERE entity_type='reality_final_loop_terminal_technical_observation_v1'
 AND payload->>'original_work_id'=e.original_work_id AND payload->'terminal_recovery_history'->>'remaining_attempts'='0')
 THEN RAISE EXCEPTION 'TERMINAL_RETURN_LOST_ORIGINAL_OR_BUDGET';END IF;
 r:=public.reality_record_final_loop_technical_ci_observation_v1(e.shift_id,e.event_id,run,proof);
 IF r->>'status'='TERMINAL_TECHNICAL_EVIDENCE_RETURNED_ORIGINAL_OPEN' THEN RAISE EXCEPTION 'TECHNICAL_RETURN_REPLAYED';END IF;
END $$;
RESET ROLE;


-- A new investigation of returned invocations at the *current* head must
-- reach the existing independent reviewer. This is a disposable synthetic
-- fixture of signed observations, not a new provider attempt or settlement.
DO $$
DECLARE u record; q record; sub record; a record; p record; e record; inc record; review record;
 run uuid:=gen_random_uuid(); req uuid:=gen_random_uuid(); rel uuid:=gen_random_uuid();
 incident uuid:=gen_random_uuid(); ev uuid:=gen_random_uuid(); nonce uuid:=gen_random_uuid();
 now_at timestamptz:=clock_timestamp(); qhash text; ihash text; rhash text;
 source_evidence jsonb; scope jsonb; snapshot jsonb; spine jsonb; v_guard jsonb; verdict jsonb;
 observations jsonb:=jsonb_build_array(jsonb_build_object('worker_completed',true,
  'model_artifact_recorded',false,'provider_outcome_verified',false,'replay_authorized',false));
BEGIN
 SELECT * INTO STRICT u FROM public.universe_events
  WHERE entity_type='reality_final_loop_terminal_technical_observation_v1';
 SELECT * INTO STRICT q FROM reality_internal.owner_continuity_qualification_routes_v1;
 SELECT * INTO STRICT sub FROM reality_internal.final_loop_resume_conditions_v1
  WHERE condition_kind='QUALIFIER_PROOF_CHANGED';
 SELECT * INTO STRICT p FROM reality_internal.shift_continuity_independent_reviews_v1
  WHERE receipt_sha256=u.payload->>'review_receipt_sha256';
 SELECT * INTO a FROM reality_internal.governed_worker_release_approvals_v1
  WHERE owner_id=q.owner_id ORDER BY provider_alias_observed_at DESC NULLS LAST LIMIT 1;
 IF sub.continuity_revision<>4 OR sub.continuity_head_sha256<>'sha256:'||u.lineage_hash
 THEN RAISE EXCEPTION 'FIXTURE_CURRENT_HEAD_MISSING';END IF;
 snapshot:=q.reconciliation_snapshot||jsonb_build_object('fixture_current_qualifier',true);
 qhash:='sha256:'||encode(sha256(convert_to(snapshot::text,'UTF8')),'hex');
 UPDATE reality_internal.owner_continuity_qualification_routes_v1
  SET reconciliation_snapshot=snapshot,reconciliation_receipt_sha256=qhash,
      reconciliation_next_action='VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM',
      reconciliation_checked_at=now_at WHERE owner_id=q.owner_id AND source_ref=q.source_ref;
 UPDATE reality_internal.final_loop_resume_conditions_v1
  SET state='SHADOW_SIGNALED',last_signaled_receipt_sha256=qhash
  WHERE shift_id=sub.shift_id AND original_work_id=sub.original_work_id
   AND condition_kind='QUALIFIER_PROOF_CHANGED';
 spine:=jsonb_build_object('status','SIGNED_INVOCATION_OBSERVATIONS_RETURNED_ORIGINAL_OPEN',
  'canonical_return_committed',true,'canonical_return_event_id',u.parent_event_id,
  'canonical_return_head_sha256',u.payload->>'prior_head_sha256',
  'observation_sha256','sha256:'||encode(sha256(convert_to(observations::text,'UTF8')),'hex'),
  'observations',observations,'replay_authorized',false,'execution_authorized',false,
  'original_job_completed',false);
 SELECT f.guard INTO v_guard FROM public.suspension_fixture_proof f WHERE shift_id=sub.shift_id;
 UPDATE public.suspension_fixture_proof f SET guard=f.guard||jsonb_build_object('obligations',
  jsonb_build_array((v_guard->'obligations'->0)||jsonb_build_object(
   'qualifier_receipt_sha256',qhash,'execution_spine_readback',spine)))
  WHERE shift_id=sub.shift_id;
 scope:=a.runtime_scope||jsonb_build_object('target_deployment_id','dpl_fixture_current_invocation',
  'continuity_head_sha256',sub.continuity_head_sha256,'continuity_revision',4,
  'qualifier_receipt_sha256',qhash);
 INSERT INTO reality_internal.governed_worker_release_approvals_v1(request_id,owner_id,shift_id,claim_id,
  capability_key,state,approval_receipt_sha256,claimed_at,provider_alias_observed_at,
  provider_alias_observed_deployment_id,runtime_scope,release_sha,release_ref,scheduled_alias,independent_isolation_proof_sha256)
 VALUES(req,sub.owner_id,sub.shift_id,rel,a.capability_key,'CLAIMED_ONCE',a.approval_receipt_sha256,
  now_at-interval '2 seconds',now_at-interval '1 second','dpl_fixture_current_invocation',
  scope,repeat('5',40),'fixture-current-invocation',a.scheduled_alias,a.independent_isolation_proof_sha256);
 UPDATE reality_internal.signed_worker_actual_runs_v1
  SET status='COMPLETED',finished_at=now_at,worker_stage='TERMINAL_TECHNICAL_EVIDENCE_RESPONSE_PUBLICATION'
  WHERE status='STARTED';
 UPDATE reality_internal.governed_preview_shift_worker_leases_v1
  SET claim_id=gen_random_uuid(),claimed_at=now_at,released_at=NULL,lease_expires_at=now_at+interval '2 minutes';
 INSERT INTO reality_internal.signed_worker_actual_runs_v1(run_id,status,started_at,worker_stage)
  VALUES(run,'STARTED',now_at,'SHIFT_DB_BOUNDARY');
 INSERT INTO reality_internal.governed_signed_worker_release_wakes_v1
  VALUES(run,sub.owner_id,sub.shift_id,rel,repeat('5',40),'fixture-current-invocation',
   'NORMAL_SIGNED_SHIFT','sha256:'||repeat('5',64));
 INSERT INTO reality_internal.final_loop_resume_events_v1(event_id,owner_id,shift_id,original_work_id,source_ref,
  signal_kind,source_receipt_sha256,previous_receipt_sha256,event_causality_sha256,
  continuity_head_sha256,continuity_revision,signal_next_action,state,governed_wake_request_id,
  governed_wake_queued_at,governed_wake_nonce,governed_wake_worker_run_id,release_continuation_claim_id)
 VALUES(ev,sub.owner_id,sub.shift_id,sub.original_work_id,sub.source_ref,'QUALIFIER_PROOF_CHANGED',
  qhash,sub.subscribed_receipt_sha256,'sha256:'||repeat('5',64),sub.continuity_head_sha256,4,
  'VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM','SHADOW_PENDING',5000,now_at,nonce,run,rel);
 source_evidence:=jsonb_build_object('owner_id',sub.owner_id,'shift_id',sub.shift_id,
  'original_work_id',sub.original_work_id,'source_ref',sub.source_ref,'continuity_root_id',u.continuity_root_id,
  'continuity_head_sha256',sub.continuity_head_sha256,'continuity_revision',4,
  'event_id',ev,'worker_run_id',run,'release_sha',repeat('5',40),'release_receipt_sha256','sha256:'||repeat('5',64),
  'blocker_code','FINAL_LOOP_UNRESOLVED_INVOCATION_INVESTIGATION_REQUIRED','investigation_only',true,
  'root_cause_verified',false,'provider_outcome_verified',false,'replay_authorized',false,
  'original_job_completed',false,'installation_authorized',false,'production_changed',false,
  'new_attempt_authorized',false,'previous_attempt_budget_preserved',true,
  'invocation_observation_sha256',spine->>'observation_sha256','canonical_return_event_id',spine->>'canonical_return_event_id',
  'canonical_return_head_sha256',spine->>'canonical_return_head_sha256','invocation_observations',observations);
 ihash:='sha256:'||encode(sha256(convert_to(source_evidence::text,'UTF8')),'hex');
 rhash:='sha256:'||encode(sha256(convert_to(jsonb_build_object(
  'owner_id',sub.owner_id,'incident_id',incident,'evidence_sha256',ihash,'model_response_id','fixture_current_investigation',
  'assigned_employee','engineer','reviewer','independent reviewer','diagnosis','Unresolved invocation',
  'proposed_upgrade','Read-only review','required_independent_test','No replay',
  'limitations','No outcome inferred','new_original_jobs_created',0,'installation_authorized',false)::text,'UTF8')),'hex');
 INSERT INTO reality_internal.owner_shift_continuity_incidents_v1(incident_id,owner_id,shift_id,kind,
  evidence_key,evidence_sha256,source_evidence,phase,assigned_employee,assigned_function_id,
  independent_reviewer,reviewer_function_id,investigated_at,model_response_id,diagnosis,proposed_upgrade,
  independent_test_requirement,limitations,investigation_receipt_sha256)
 VALUES(incident,sub.owner_id,sub.shift_id,'SIGNED_FINAL_LOOP_CONTINUITY_BLOCKED',substring(ihash from 8),ihash,
  source_evidence,'INVESTIGATION_RECORDED_NEEDS_INDEPENDENT_PROOF','engineer','engineering',
  'independent reviewer','quality',clock_timestamp(),'fixture_current_investigation','Unresolved invocation',
  'Read-only review','No replay','No outcome inferred',rhash);
 IF reality_internal.stage_final_loop_independent_investigation_review_v1(req) IS NOT NULL
 THEN RAISE EXCEPTION 'UNFINISHED_INVESTIGATION_STAGED';END IF;
 -- Completion fires the existing automatic trigger; the active singleton
 -- lease still prevents delivery while the first worker is finishing.
 UPDATE reality_internal.signed_worker_actual_runs_v1 SET status='COMPLETED',finished_at=clock_timestamp(),
  worker_stage='WORKER_RESPONSE_PUBLICATION' WHERE run_id=run;
 verdict:=reality_internal.read_final_loop_verified_investigation_v1(sub.owner_id,sub.shift_id,
  sub.original_work_id,sub.source_ref,sub.continuity_head_sha256,4);
 IF verdict->>'evidence_kind' IS DISTINCT FROM 'RETURNED_UNRESOLVED_INVOCATION'
  OR verdict->>'investigation_receipt_sha256' IS DISTINCT FROM rhash
  OR verdict->>'suspension_receipt_sha256' IS DISTINCT FROM p.independent_verdict->>'suspension_receipt_sha256'
 THEN RAISE EXCEPTION 'CURRENT_INVOCATION_VERIFIER_HANDOFF_UNVERIFIED %',verdict;END IF;
 SELECT * INTO STRICT review FROM reality_internal.final_loop_resume_events_v1
  WHERE signal_kind='VERIFIED_INVESTIGATION_REVIEW' AND source_receipt_sha256=rhash;
 SELECT * INTO STRICT e FROM reality_internal.final_loop_resume_events_v1 WHERE event_id=ev;
 IF review.continuity_revision<>4 OR review.original_work_id<>sub.original_work_id
  OR review.continuity_head_sha256<>sub.continuity_head_sha256
  OR review.governed_wake_request_id IS NOT NULL OR e.state<>'SHADOW_STALE'
  OR e.governed_wake_worker_run_id<>run OR e.governed_wake_nonce<>nonce
  OR e.governed_wake_request_id<>5000 OR e.observed_at IS NOT NULL
 THEN RAISE EXCEPTION 'CURRENT_INVOCATION_REVIEW_EVENT_OR_HISTORY_UNVERIFIED';END IF;
 IF reality_internal.stage_final_loop_independent_investigation_review_v1(req) IS NOT NULL
  OR reality_internal.read_final_loop_verified_investigation_v1(sub.owner_id,sub.shift_id,
   sub.original_work_id,sub.source_ref,'sha256:'||repeat('0',64),4) IS NOT NULL
  OR reality_internal.read_final_loop_verified_investigation_v1(gen_random_uuid(),sub.shift_id,
   sub.original_work_id,sub.source_ref,sub.continuity_head_sha256,4) IS NOT NULL
 THEN RAISE EXCEPTION 'DUPLICATE_OR_FOREIGN_CURRENT_INVOCATION_ACCEPTED';END IF;
 UPDATE reality_internal.owner_shift_continuity_incidents_v1
  SET source_evidence=reality_internal.owner_shift_continuity_incidents_v1.source_evidence||'{"replay_authorized":true}'::jsonb
  WHERE incident_id=incident;
 IF reality_internal.read_final_loop_verified_investigation_v1(sub.owner_id,sub.shift_id,
  sub.original_work_id,sub.source_ref,sub.continuity_head_sha256,4) IS NOT NULL
 THEN RAISE EXCEPTION 'TAMPERED_INVOCATION_AUTHORITY_ACCEPTED';END IF;
 IF EXISTS(SELECT 1 FROM reality_internal.governed_original_independent_final_receipts_v1
  WHERE original_work_id=sub.original_work_id) OR
  (snapshot->'recovery_terminal_history'->>'remaining_attempts')<>'0'
 THEN RAISE EXCEPTION 'RECOVERY_HANDOFF_INVENTED_OUTCOME_OR_BUDGET';END IF;
END $$;


-- Exercise the actual canonical return writer on disposable PostgreSQL.
-- The synthetic guard represents independently observed invocation evidence;
-- neither the fixture nor the writer calls a provider or grants authority.
BEGIN;
ALTER TABLE reality_internal.final_loop_resume_events_v1 DISABLE TRIGGER USER;
ALTER TABLE reality_internal.governed_worker_release_approvals_v1 DISABLE TRIGGER USER;
ALTER TABLE reality_internal.signed_worker_actual_runs_v1 DISABLE TRIGGER USER;
ALTER TABLE reality_internal.final_loop_transition_receipts_v1 ALTER COLUMN receipt_id SET DEFAULT gen_random_uuid();
ALTER TABLE reality_internal.owner_continuity_qualification_routes_v1 ADD COLUMN intake_family text DEFAULT 'SIGNED_SHIFT_SOURCE';
\ir ../sql/reality-final-loop-execution-spine-return-v1.sql
CREATE FUNCTION public.fixture_invocation_return_head() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $fixture$
BEGIN
 IF NEW.entity_type='reality_final_loop_invocation_observation_v1' THEN
  UPDATE public.suspension_fixture_proof SET
   proof=proof||pg_catalog.jsonb_build_object('continuity_head_sha256','sha256:'||NEW.lineage_hash,'revision',(proof->>'revision')::bigint+1),
   guard=guard||pg_catalog.jsonb_build_object('continuity_head_sha256','sha256:'||NEW.lineage_hash,'revision',(guard->>'revision')::bigint+1)
   WHERE shift_id=(NEW.payload->>'shift_id')::uuid;
 END IF;
 RETURN NEW;
END $fixture$;
CREATE TRIGGER fixture_invocation_head AFTER INSERT ON public.universe_events
 FOR EACH ROW EXECUTE FUNCTION public.fixture_invocation_return_head();
DO $$
DECLARE o uuid:=gen_random_uuid(); s uuid:=gen_random_uuid(); root uuid:=gen_random_uuid();
 world uuid:=gen_random_uuid(); tail uuid:=gen_random_uuid(); oldrun uuid:=gen_random_uuid();
 currentrun uuid:=gen_random_uuid(); oldclaim uuid:=gen_random_uuid(); currentclaim uuid:=gen_random_uuid();
 oldev uuid:=gen_random_uuid(); currentev uuid:=gen_random_uuid(); fenced uuid:=gen_random_uuid();
 oldreq uuid:=gen_random_uuid(); currentreq uuid:=gen_random_uuid(); child uuid:=gen_random_uuid();
 packet uuid:=gen_random_uuid(); nonce uuid:=gen_random_uuid(); t timestamptz:=clock_timestamp();
 work text:='work:'||repeat('a',32); src text:='https://github.com/fixture/ledger/pull/9';
 head text:='sha256:'||repeat('b',64); plan text:='sha256:'||repeat('c',64);
 q text; prior_q text:='sha256:'||repeat('e',64); causal text; snapshot jsonb; scope jsonb; observations jsonb; guard jsonb; proof jsonb; verdict jsonb; returned jsonb;
 staged_event uuid; newrun uuid:=gen_random_uuid(); newlease uuid:=gen_random_uuid(); newnonce uuid:=gen_random_uuid(); condition_hash text;
BEGIN
 snapshot:=jsonb_build_object('shift_id',s,'original_candidate_work_id',work,
  'next_action','VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM','unsatisfied_gates',jsonb_build_array('TERMINAL_BUILDER_DISTINCT_EVIDENCE_AND_BUDGET_REQUIRED'),
  'recovery_terminal_history',jsonb_build_object('remaining_attempts',0,'replay_permitted',false));
 q:='sha256:'||encode(sha256(convert_to(snapshot::text,'UTF8')),'hex');
 causal:='sha256:'||encode(sha256(convert_to(s::text||'|'||work||'|'||head||'|4|'||prior_q||'|'||q,'UTF8')),'hex');
 scope:=jsonb_build_object('original_work_id',work,'source_ref',src,'continuity_head_sha256',head,
  'target_environment','CANONICAL_BENCHMARK_PREVIEW','runtime_database_project_ref','hvkfreoagbrphwghjajw',
  'independent_gateway_ci_verified',true,'independent_qualification_branch_verified',true,'plan_fingerprint',plan,'continuity_root_id',root,
  'continuity_revision',4,'qualifier_receipt_sha256',q,'target_deployment_id','dpl_fixture_ledger',
  'exact_runtime_database_contract_verified',true,'child_execution_enabled',false,'parent_delivery_enabled',false,'production_changed',false);
 observations:=jsonb_build_array(jsonb_build_object('event_id',fenced,'model_artifact_recorded',false,'provider_outcome_verified',false,'replay_authorized',false));
 proof:=jsonb_build_object('status','FINAL_LOOP_FROZEN_SCOPE_VERIFIED_ORIGINAL_ACCEPTANCE_PENDING','owner_id',o,
  'continuity_root_id',root,'continuity_head_sha256',head,'revision',4,'frozen_shift_scope_sha256','sha256:'||repeat('d',64));
 guard:=jsonb_build_object('status','FINAL_LOOP_SHARED_CONTINUITY_CHECKED','continuity_head_sha256',head,'revision',4,
  'owner_id',o,'shift_id',s,'continuity_root_id',root,'execution_authorized',false,'original_job_completed',false,
  'obligations',jsonb_build_array(jsonb_build_object('original_work_id',work,'source_ref',src,
   'continuity_identity_verified',true,'qualifier_digest_verified',true,'source_proof_verified',true,
   'independent_original_outcome_verified',false,'qualifier_receipt_sha256',q,'next_qualified_action','VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM','execution_spine_readback',
   jsonb_build_object('status','SIGNED_INVOCATION_OBSERVATIONS_READY_FOR_CANONICAL_RETURN',
    'provider_outcome_verified',false,'replay_authorized',false,'canonical_return_committed',false,
    'observation_sha256','sha256:'||encode(sha256(convert_to(observations::text,'UTF8')),'hex'),'observations',observations))));
 INSERT INTO public.suspension_fixture_proof VALUES(s,proof,guard);
 INSERT INTO public.universe_events(event_id,continuity_root_id,worldline_id,entity_type,epistemic_status,
  lineage_hash,content_hash,payload,provenance,assertion_time)
 VALUES(tail,root,world,'fixture_prior','OBSERVED',substring(head from 8),repeat('1',64),
  jsonb_build_object('owner_id',o,'shift_id',s),'{}',t-interval '5 minutes');
 INSERT INTO reality_internal.governed_employee_shifts_v1 VALUES(s,o,plan,'AWAITING_EXACT_ORIGINAL_WORK',t-interval '10 minutes',t-interval '10 minutes','infinity',NULL,t);
 INSERT INTO reality_internal.governed_employee_completion_warrants_v1(shift_id,owner_id,plan_fingerprint,source_scope,mode,state)
 VALUES(s,o,plan,jsonb_build_array(jsonb_build_object('source_ref',src)),'UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS','ACTIVE');
 INSERT INTO reality_internal.owner_continuity_qualification_routes_v1(owner_id,source_ref,reconciliation_receipt_sha256,reconciliation_snapshot,reconciliation_next_action,reconciliation_checked_at)
 VALUES(o,src,q,snapshot,'VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM',t);
 INSERT INTO reality_internal.final_loop_resume_conditions_v1(shift_id,owner_id,original_work_id,source_ref,condition_kind,subscribed_receipt_sha256,
  continuity_head_sha256,continuity_revision,next_qualified_action,unresolved_proof_gates,proposed_transition,state)
 VALUES(s,o,work,src,'QUALIFIER_PROOF_CHANGED',prior_q,head,4,'VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM',snapshot->'unsatisfied_gates','RECOVER','SUSPENDED');
 INSERT INTO reality_internal.signed_worker_actual_runs_v1 VALUES
 (oldrun,'COMPLETED',t-interval '3 minutes',t-interval '2 minutes','SHARED_CONTINUITY_VERIFIER_RETURN_FENCE'),
 (currentrun,'STARTED',t,NULL,'SHIFT_DB_BOUNDARY');
 INSERT INTO reality_internal.governed_worker_release_approvals_v1(request_id,owner_id,shift_id,claim_id,capability_key,state,
  approval_receipt_sha256,claimed_at,provider_alias_observed_at,provider_alias_observed_deployment_id,runtime_scope,release_sha,release_ref)
 VALUES(oldreq,o,s,oldclaim,'VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM','CLAIMED_ONCE','sha256:'||repeat('1',64),
  t-interval '5 minutes',t-interval '4 minutes','dpl_fixture_ledger',scope,repeat('2',40),'fixture-old'),
 (currentreq,o,s,currentclaim,'VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM','CLAIMED_ONCE','sha256:'||repeat('2',64),
  t-interval '1 minute',t-interval '30 seconds','dpl_fixture_ledger',scope,repeat('3',40),'fixture-current');
 INSERT INTO reality_internal.governed_signed_worker_release_wakes_v1 VALUES
 (oldrun,o,s,oldclaim,repeat('2',40),'fixture-old','NORMAL_SIGNED_SHIFT','sha256:'||repeat('3',64)),
 (currentrun,o,s,currentclaim,repeat('3',40),'fixture-current','NORMAL_SIGNED_SHIFT','sha256:'||repeat('4',64));
 INSERT INTO reality_internal.final_loop_resume_events_v1(event_id,shift_id,owner_id,original_work_id,source_ref,
  signal_kind,source_receipt_sha256,previous_receipt_sha256,event_causality_sha256,continuity_head_sha256,continuity_revision,signal_next_action,state,
  governed_wake_requested_at,governed_wake_request_id,governed_wake_queued_at,governed_wake_nonce,governed_wake_worker_run_id,release_continuation_claim_id)
 VALUES(oldev,s,o,work,src,'QUALIFIER_PROOF_CHANGED',q,prior_q,causal,head,4,'VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM','SHADOW_PENDING',
  t-interval '3 minutes 2 seconds',9001,t-interval '3 minutes 1 second',nonce,oldrun,oldclaim),
 (currentev,s,o,work,src,'QUALIFIER_PROOF_CHANGED',q,prior_q,causal,head,4,'VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM','SHADOW_PENDING',
  t-interval '2 seconds',9002,t-interval '1 second',gen_random_uuid(),currentrun,currentclaim);
 -- Negative control: unrelated completed stage cannot be accepted.
 UPDATE reality_internal.signed_worker_actual_runs_v1 SET worker_stage='SHIFT_DB_BOUNDARY' WHERE run_id=oldrun;
 SET LOCAL ROLE service_role;
 verdict:=public.reality_return_final_loop_invocation_observations_v1(s,work,currentrun,head,4);
 RESET ROLE;
 IF verdict->>'status' IS DISTINCT FROM 'FINAL_LOOP_SPINE_RETURN_PENDING_EVENTS_REQUIRE_CAUSAL_RECONCILIATION'
 THEN RAISE EXCEPTION 'UNRELATED_STAGE_ACCEPTED %',verdict;END IF;
 UPDATE reality_internal.signed_worker_actual_runs_v1 SET worker_stage='SHARED_CONTINUITY_VERIFIER_RETURN_FENCE' WHERE run_id=oldrun;
 -- Negative control: missing nonce or actual child claim still blocks.
 UPDATE reality_internal.final_loop_resume_events_v1 SET governed_wake_nonce=NULL WHERE event_id=oldev;
 SET LOCAL ROLE service_role;
 verdict:=public.reality_return_final_loop_invocation_observations_v1(s,work,currentrun,head,4);
 RESET ROLE;
 IF verdict->>'status' IS DISTINCT FROM 'FINAL_LOOP_SPINE_RETURN_PENDING_EVENTS_REQUIRE_CAUSAL_RECONCILIATION'
 THEN RAISE EXCEPTION 'UNBOUND_NONCE_ACCEPTED %',verdict;END IF;
 UPDATE reality_internal.final_loop_resume_events_v1 SET governed_wake_nonce=nonce WHERE event_id=oldev;
 INSERT INTO reality_internal.final_loop_child_review_work_v1(child_work_id,packet_id,owner_id,shift_id,parent_original_work_id,phase,claimant_worker_run_id)
 VALUES(child,packet,o,s,work,'CLAIMED',oldrun);
 SET LOCAL ROLE service_role;
 verdict:=public.reality_return_final_loop_invocation_observations_v1(s,work,currentrun,head,4);
 RESET ROLE;
 IF verdict->>'status' IS DISTINCT FROM 'FINAL_LOOP_SPINE_RETURN_PENDING_EVENTS_REQUIRE_CAUSAL_RECONCILIATION'
 THEN RAISE EXCEPTION 'CHILD_CLAIM_TREATED_AS_PRECLAIM %',verdict;END IF;
 DELETE FROM reality_internal.final_loop_child_review_work_v1 WHERE child_work_id=child;
 -- Preflight uses the SAME corrected predicate without consuming a delivery.
 -- A currently running event is never a historical completion.
 SET LOCAL ROLE service_role;
 verdict:=reality_internal.read_final_loop_invocation_return_pending_v1(s,o,work,src,head,4,q,snapshot,
  guard->'obligations'->0->'execution_spine_readback',NULL,NULL);
 RESET ROLE;
 IF verdict->>'ready' IS DISTINCT FROM 'false' THEN RAISE EXCEPTION 'ACTIVE_EVENT_ACCEPTED_AS_HISTORICAL %',verdict;END IF;
 -- Model the already consumed delivery as a signed, completed preclaim run.
 UPDATE reality_internal.signed_worker_actual_runs_v1
 SET status='COMPLETED',worker_stage='WORKER_RESPONSE_PUBLICATION',finished_at=t+interval '1 second'
 WHERE run_id=currentrun;
 SET LOCAL ROLE service_role;
 verdict:=reality_internal.read_final_loop_invocation_return_pending_v1(s,o,work,src,head,4,q,snapshot,
  guard->'obligations'->0->'execution_spine_readback',NULL,NULL);
 RESET ROLE;
 IF verdict->>'ready' IS DISTINCT FROM 'true' OR jsonb_array_length(verdict->'prior_preclaim_events')<>2
 THEN RAISE EXCEPTION 'COMPLETED_EVENTS_NOT_ELIGIBLE_FOR_EVIDENCE_ONLY_RETURN %',verdict;END IF;
 IF (SELECT count(*) FROM reality_internal.final_loop_resume_events_v1 WHERE shift_id=s AND state='SHADOW_PENDING')<>2
  OR EXISTS(SELECT 1 FROM reality_internal.final_loop_transition_receipts_v1 WHERE shift_id=s)
  OR EXISTS(SELECT 1 FROM reality_internal.governed_original_independent_final_receipts_v1 WHERE shift_id=s)
 THEN RAISE EXCEPTION 'READ_ONLY_PREFLIGHT_CREATED_EFFECT';END IF;
 UPDATE reality_internal.final_loop_resume_events_v1 SET governed_wake_nonce=NULL WHERE event_id=oldev;
 SET LOCAL ROLE service_role;
 verdict:=reality_internal.read_final_loop_invocation_return_pending_v1(s,o,work,src,head,4,q,snapshot,
  guard->'obligations'->0->'execution_spine_readback',NULL,NULL);
 RESET ROLE;
 IF verdict->>'ready' IS DISTINCT FROM 'false' THEN RAISE EXCEPTION 'UNBOUND_HISTORICAL_EVENT_PREFLIGHT_ACCEPTED %',verdict;END IF;
 UPDATE reality_internal.final_loop_resume_events_v1 SET governed_wake_nonce=nonce WHERE event_id=oldev;
 -- Stage against the same consumed release; earlier history remains intact.
 SET LOCAL ROLE service_role;
 verdict:=public.reality_stage_final_loop_ledger_return_v1(s,currentclaim);
 RESET ROLE;
 IF verdict->>'status' IS DISTINCT FROM 'LEDGER_RETURN_EVENT_STAGED'
 OR verdict->>'execution_authorized' IS DISTINCT FROM 'false'
 OR verdict->>'replay_authorized' IS DISTINCT FROM 'false'
 THEN RAISE EXCEPTION 'DISTINCT_LEDGER_EVENT_NOT_STAGED %',verdict;END IF;
 staged_event:=(verdict->>'event_id')::uuid;condition_hash:=verdict->>'condition_sha256';
 SET LOCAL ROLE service_role;
 verdict:=public.reality_stage_final_loop_ledger_return_v1(s,currentclaim);
 RESET ROLE;
 IF verdict->>'status'='LEDGER_RETURN_EVENT_STAGED'
 OR (SELECT count(*) FROM reality_internal.final_loop_resume_events_v1 WHERE shift_id=s AND ledger_return_condition_sha256=condition_hash)<>1
 THEN RAISE EXCEPTION 'DUPLICATE_LEDGER_EVENT_STAGED %',verdict;END IF;
 -- Emulate the existing signed worker transport (triggers disabled in this
 -- fixture). The old protocol must not be able to claim the new event.
 UPDATE reality_internal.final_loop_resume_events_v1 SET governed_wake_requested_at=clock_timestamp(),
 governed_wake_request_id=9003,governed_wake_queued_at=clock_timestamp(),governed_wake_nonce=newnonce
 WHERE event_id=staged_event;
 INSERT INTO reality_internal.governed_preview_shift_worker_leases_v1
 (worker_key,claim_id,claimed_at,lease_expires_at,next_wake_at,released_at)
 VALUES('preview-governed-employee-shift-worker',newlease,clock_timestamp()-interval '1 second',clock_timestamp()+interval '1 minute',clock_timestamp(),NULL)
 ON CONFLICT(worker_key) DO UPDATE SET claim_id=EXCLUDED.claim_id,claimed_at=EXCLUDED.claimed_at,
 lease_expires_at=EXCLUDED.lease_expires_at,next_wake_at=EXCLUDED.next_wake_at,released_at=NULL;
 INSERT INTO reality_internal.signed_worker_actual_runs_v1(run_id,status,started_at,finished_at,worker_stage)
 VALUES(newrun,'STARTED',clock_timestamp(),NULL,'SHIFT_DB_BOUNDARY');
 SET LOCAL ROLE service_role;
 verdict:=public.reality_claim_canonical_governed_wake_v1(o,s,plan,staged_event,newnonce,'RESUME',repeat('3',40),newrun,newlease);
 RESET ROLE;
 IF verdict->>'status' IS DISTINCT FROM 'CANONICAL_GOVERNED_WAKE_MISSING_STALE_OR_CONSUMED'
 THEN RAISE EXCEPTION 'LEGACY_WORKER_ACCEPTED_LEDGER_ONLY_EVENT %',verdict;END IF;
 SET LOCAL ROLE service_role;
 verdict:=public.reality_claim_canonical_governed_wake_v1(o,s,plan,staged_event,newnonce,'RESUME_WITH_LEDGER_RETURN',repeat('3',40),newrun,newlease);
 RESET ROLE;
 IF verdict->>'status' IS DISTINCT FROM 'CANONICAL_GOVERNED_WAKE_DURABLY_CLAIMED'
 OR verdict->>'ledger_return_only' IS DISTINCT FROM 'true'
 OR verdict->>'original_work_id' IS DISTINCT FROM work
 OR verdict->>'execution_authorized' IS DISTINCT FROM 'false'
 THEN RAISE EXCEPTION 'LEDGER_ONLY_CLAIM_UNVERIFIED %',verdict;END IF;
 SET LOCAL ROLE service_role;
 verdict:=public.reality_claim_canonical_governed_wake_v1(o,s,plan,staged_event,newnonce,'RESUME_WITH_LEDGER_RETURN',repeat('3',40),newrun,newlease);
 RESET ROLE;
 IF verdict->>'status' IS DISTINCT FROM 'CANONICAL_GOVERNED_WAKE_MISSING_STALE_OR_CONSUMED'
 THEN RAISE EXCEPTION 'LEDGER_EVENT_REPLAY_ACCEPTED %',verdict;END IF;
 INSERT INTO reality_internal.governed_signed_worker_release_wakes_v1
 VALUES(newrun,o,s,currentclaim,repeat('3',40),'fixture-current','NORMAL_SIGNED_SHIFT','sha256:'||repeat('7',64));
 -- Positive control: both prior completed runs return as observations only.
 SET LOCAL ROLE service_role;
 verdict:=public.reality_return_final_loop_invocation_observations_v1(s,work,newrun,head,4);
 RESET ROLE;
 IF verdict->>'status' IS DISTINCT FROM 'FINAL_LOOP_SPINE_OBSERVATIONS_RETURNED_ORIGINAL_OPEN'
  OR verdict->>'canonical_return_committed' IS DISTINCT FROM 'true'
  OR verdict->>'revision' IS DISTINCT FROM '5'
  OR verdict->>'prior_preclaim_workers_observed' IS DISTINCT FROM '2'
  OR verdict->>'original_job_completed' IS DISTINCT FROM 'false'
  OR verdict->>'execution_authorized' IS DISTINCT FROM 'false'
  OR verdict->>'replay_authorized' IS DISTINCT FROM 'false'
 THEN RAISE EXCEPTION 'HISTORICAL_RETURN_DID_NOT_ADVANCE_SAME_ORIGINAL %',verdict;END IF;
 SELECT payload INTO STRICT returned FROM public.universe_events WHERE event_id=(verdict->>'event_id')::uuid;
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(returned->'prior_preclaim_worker_observations') a
   WHERE a->>'observed_worker_stage'='SHARED_CONTINUITY_VERIFIER_RETURN_FENCE' AND a->>'provider_outcome_verified'='false')
  OR EXISTS(SELECT 1 FROM jsonb_array_elements(returned->'prior_preclaim_worker_observations') a WHERE a->>'provider_outcome_verified' IS DISTINCT FROM 'false')
  OR returned->'terminal_recovery_history'->>'remaining_attempts' IS DISTINCT FROM '0'
  OR (SELECT count(*) FROM reality_internal.final_loop_resume_events_v1 WHERE shift_id=s AND state='SHADOW_OBSERVED')<>3
  OR NOT EXISTS(SELECT 1 FROM reality_internal.final_loop_resume_events_v1 WHERE event_id=oldev AND governed_wake_nonce=nonce AND governed_wake_request_id=9001 AND governed_wake_worker_run_id=oldrun)
  OR NOT EXISTS(SELECT 1 FROM reality_internal.final_loop_resume_conditions_v1 WHERE shift_id=s AND continuity_revision=5 AND original_work_id=work)
  OR EXISTS(SELECT 1 FROM reality_internal.governed_original_independent_final_receipts_v1 WHERE shift_id=s)
 THEN RAISE EXCEPTION 'RETURN_HISTORY_OR_AUTHORITY_DRIFT';END IF;
END $$;

-- Use the already proven ledger return above as the only successor evidence.
-- No synthetic release claim is created; the existing consumed approval stays
-- byte-for-byte unchanged throughout the new recovery dispatch.
\ir ../sql/reality-final-loop-verified-successor-authority-v1.sql
-- The actual qualification algorithm is independently exercised in the
-- governed-chat-connection smoke test. This fixture already has its
-- canonical qualifier receipt; record only the demand, not a new proof.
CREATE TABLE reality_internal.fixture_successor_qualification_demands(shift_id uuid);
CREATE FUNCTION reality_internal.reconcile_current_qualification_proofs_v1(p_shift_id uuid) RETURNS jsonb
 LANGUAGE plpgsql SET search_path='' AS $fixture$
 BEGIN INSERT INTO reality_internal.fixture_successor_qualification_demands VALUES(p_shift_id);
 RETURN pg_catalog.jsonb_build_object('scope','EVIDENCE_ONLY_NO_AUTHORITY_CHANGE');END $fixture$;
DO $$
DECLARE a record; c record; v jsonb; before_scope jsonb; before_count int; next_event uuid; current_head text; current_rev bigint; q text; old_guard jsonb; old_proof jsonb;
BEGIN
 SELECT r.* INTO STRICT a FROM reality_internal.governed_worker_release_approvals_v1 r
 WHERE r.release_ref='fixture-current' AND r.runtime_scope->>'source_ref'='https://github.com/fixture/ledger/pull/9';
 -- Fixture adapters supply the independent guard fields normally calculated
 -- by the canonical readback; the actual predecessor receipt and event are
 -- produced by the previous real SQL return test.
 UPDATE reality_internal.governed_worker_release_approvals_v1
 SET runtime_scope=runtime_scope||jsonb_build_object('independent_transport_proof_sha256','sha256:'||repeat('8',64))
 WHERE claim_id=a.claim_id RETURNING * INTO a;
 SELECT * INTO STRICT c FROM reality_internal.final_loop_resume_conditions_v1
 WHERE shift_id=a.shift_id AND condition_kind='QUALIFIER_PROOF_CHANGED';
 current_head:=c.continuity_head_sha256;current_rev:=c.continuity_revision;q:=c.subscribed_receipt_sha256;
 IF current_rev<>5 THEN RAISE EXCEPTION 'SUCCESSOR_FIXTURE_REVISION_NOT_ADVANCED';END IF;
 UPDATE public.suspension_fixture_proof SET
 proof=proof||jsonb_build_object('shift_id',a.shift_id,'plan_fingerprint',a.runtime_scope->>'plan_fingerprint'),
 guard=jsonb_set(guard||jsonb_build_object('no_new_executable_authority',true,'unverified_handoffs',0,
 'worldline_parent_links_verified',true,'shift_scope_authority_event_present',true,'production_changed',false,
 'frozen_shift_scope_sha256',proof->>'frozen_shift_scope_sha256'),'{obligations,0,execution_permitted_by_handoff}','false'::jsonb)
 WHERE shift_id=a.shift_id RETURNING guard,proof INTO old_guard,old_proof;
 before_scope:=a.runtime_scope;
 SELECT count(*) INTO before_count FROM reality_internal.governed_worker_release_approvals_v1 WHERE shift_id=a.shift_id;
 -- Existing child-plan prerequisite is a real precondition in this fixture.
 INSERT INTO reality_internal.final_loop_child_approval_packets_v1 VALUES(gen_random_uuid(),c.source_ref,'EFFECT_RESERVED_RECONCILE_ONLY');
 INSERT INTO reality_internal.final_loop_child_review_work_v1(child_work_id,packet_id,owner_id,shift_id,parent_original_work_id,phase)
 SELECT gen_random_uuid(),p.packet_id,a.owner_id,a.shift_id,c.original_work_id,'ADMITTED'
 FROM reality_internal.final_loop_child_approval_packets_v1 p WHERE p.source_ref=c.source_ref LIMIT 1;
 -- The real completion trigger, not a manual stage call, must request continuation.
 UPDATE reality_internal.signed_worker_actual_runs_v1 r SET status='COMPLETED',finished_at=clock_timestamp(),worker_stage='LEDGER_RETURN_RESPONSE_PUBLICATION'
 FROM reality_internal.final_loop_resume_events_v1 e WHERE e.shift_id=a.shift_id AND e.ledger_return_condition_sha256 IS NOT NULL
 AND r.run_id=e.governed_wake_worker_run_id;
 SELECT event_id INTO next_event FROM reality_internal.final_loop_resume_events_v1
 WHERE shift_id=a.shift_id AND continuity_revision=current_rev AND signal_kind='VERIFIED_SUSPENSION_INVESTIGATION';
 IF (SELECT count(*) FROM reality_internal.fixture_successor_qualification_demands WHERE shift_id=a.shift_id)<>1
 THEN RAISE EXCEPTION 'LEDGER_COMPLETION_DID_NOT_REQUEST_QUALIFICATION';END IF;
 -- Rejection controls: the same receipt cannot authorize another original,
 -- revision, or changed budget/authority.
 SET LOCAL ROLE service_role;
 v:=reality_internal.read_final_loop_release_successor_scope_v1(a.claim_id);
 RESET ROLE;
 IF v->>'continuity_revision' IS DISTINCT FROM '5' OR v->>'continuity_head_sha256' IS DISTINCT FROM current_head
 OR v->>'execution_authorized' IS DISTINCT FROM 'false' OR v->>'replay_authorized' IS DISTINCT FROM 'false'
 THEN RAISE EXCEPTION 'VERIFIED_SUCCESSOR_NOT_RECOGNIZED %',v;END IF;
 IF reality_internal.final_loop_release_successor_matches_v1(a.claim_id,a.owner_id,a.shift_id,'work:'||repeat('9',32),c.source_ref,current_head,current_rev)
 OR reality_internal.final_loop_release_successor_matches_v1(a.claim_id,a.owner_id,a.shift_id,c.original_work_id,c.source_ref,current_head,current_rev+1)
 THEN RAISE EXCEPTION 'WRONG_ORIGINAL_OR_REVISION_ACCEPTED';END IF;
 UPDATE public.suspension_fixture_proof SET guard=jsonb_set(guard,'{no_new_executable_authority}','false'::jsonb) WHERE shift_id=a.shift_id;
 IF reality_internal.read_final_loop_release_successor_scope_v1(a.claim_id) IS NOT NULL THEN RAISE EXCEPTION 'NEW_AUTHORITY_ACCEPTED';END IF;
 UPDATE public.suspension_fixture_proof SET guard=old_guard WHERE shift_id=a.shift_id;
 -- Independently check the automatically staged continuation.
 IF next_event IS NULL OR NOT EXISTS(SELECT 1 FROM reality_internal.final_loop_resume_events_v1 e
 WHERE e.event_id=next_event AND e.release_continuation_claim_id=a.claim_id
 AND e.continuity_revision=5 AND e.signal_kind='VERIFIED_SUSPENSION_INVESTIGATION'
 AND e.signal_next_action='INVESTIGATE_VERIFIED_SUSPENSION_NO_REPLAY')
 THEN RAISE EXCEPTION 'SAME_RELEASE_SUCCESSOR_NOT_STAGED';END IF;
 IF reality_internal.stage_final_loop_release_continuation_v1(a.request_id) IS NOT NULL
 OR (SELECT count(*) FROM reality_internal.governed_worker_release_approvals_v1 WHERE shift_id=a.shift_id)<>before_count
 OR (SELECT runtime_scope FROM reality_internal.governed_worker_release_approvals_v1 WHERE claim_id=a.claim_id) IS DISTINCT FROM before_scope
 OR EXISTS(SELECT 1 FROM reality_internal.governed_original_independent_final_receipts_v1 WHERE shift_id=a.shift_id)
 THEN RAISE EXCEPTION 'SUCCESSOR_DUPLICATE_OR_APPROVAL_DRIFT';END IF;
END $$;
SELECT 'VERIFIED_SUCCESSOR_REUSES_IMMUTABLE_RELEASE_NO_REPLAY' AS result;
ROLLBACK;

-- Separate disposable fixture for the technical-return -> approved review
-- handoff. The earlier test exercises the real technical return writer.
-- Here, frozen writer outputs are reconstructed from the exact receipt
-- formula, and the independent guard/preflight are fixture adapters.
BEGIN;
ALTER TABLE reality_internal.final_loop_resume_events_v1 DISABLE TRIGGER USER;
ALTER TABLE reality_internal.governed_worker_release_approvals_v1 DISABLE TRIGGER USER;
ALTER TABLE reality_internal.final_loop_child_review_work_v1 ADD COLUMN IF NOT EXISTS scope_sha256 text;
CREATE FUNCTION reality_internal.read_final_loop_child_approval_preflight_v1(p_shift_id uuid) RETURNS jsonb
 LANGUAGE sql AS $fixture$
 SELECT jsonb_build_object('plans',jsonb_build_array(jsonb_build_object('parent_original_work_id',reconciliation_snapshot->>'original_candidate_work_id',
 'source_ref',source_ref,'independent_goal_acceptance_verified',true,'owner_approval_claim_window_current',true,
 'canonical_review_handoff',reconciliation_snapshot->'accepted_review_scope')))
 FROM reality_internal.owner_continuity_qualification_routes_v1 WHERE reconciliation_snapshot->>'shift_id'=p_shift_id::text
 $fixture$;
CREATE FUNCTION reality_internal.reconcile_current_qualification_proofs_v1(p_shift_id uuid) RETURNS jsonb
 LANGUAGE sql AS $$SELECT jsonb_build_object('scope','EVIDENCE_ONLY_NO_AUTHORITY_CHANGE')$$;
\ir ../sql/reality-final-loop-verified-successor-authority-v1.sql
\ir ../sql/reality-final-loop-return-to-approved-review-v1.sql
DO $$
DECLARE o uuid:=gen_random_uuid(); s uuid:=gen_random_uuid(); root uuid:=gen_random_uuid(); world uuid:=gen_random_uuid();
 prior uuid:=gen_random_uuid(); obs uuid:=gen_random_uuid(); ev uuid:=gen_random_uuid(); run uuid:=gen_random_uuid();
 req uuid:=gen_random_uuid(); cl uuid:=gen_random_uuid(); pkt uuid:=gen_random_uuid(); newevent uuid;
 work text:='work:'||repeat('a',32); src text:='https://github.com/fixture/review-return/pull/1';
 plan text:='sha256:'||repeat('b',64); scope_hash text:='sha256:'||repeat('c',64); oldhead text:='sha256:'||repeat('d',64);
 head text:='sha256:'||repeat('e',64); review_hash text:='sha256:'||repeat('f',64);
 investigation_hash text:='sha256:'||repeat('1',64); q text; observed_hash text; checkpoint jsonb; receipt text; accepted jsonb; snap jsonb; payload jsonb; runtime jsonb; g jsonb; proof jsonb;
BEGIN
 accepted:=jsonb_build_object('packet_id',pkt,'parent_original_work_id',work,'source_ref',src,'effect_type','READ_ONLY_INTERNAL_PR_REVIEW',
 'execution_authorized',false,'scope_fingerprints',jsonb_build_array(jsonb_build_object('scope_sha256',scope_hash)));
 snap:=jsonb_build_object('shift_id',s,'original_candidate_work_id',work,'review_scope_qualified',true,
 'exact_goal_event_verified',true,'exact_acceptance_approval_verified',true,'accepted_review_scope',accepted);
 q:='sha256:'||encode(sha256(convert_to(snap::text,'UTF8')),'hex');
 runtime:=jsonb_build_object('continuity_root_id',root,'plan_fingerprint',plan,'original_work_id',work,'source_ref',src,
 'target_environment','CANONICAL_BENCHMARK_PREVIEW','runtime_database_project_ref','hvkfreoagbrphwghjajw','target_deployment_id','dpl_fixture_review_return',
 'exact_runtime_database_contract_verified',true,'independent_gateway_ci_verified',true,'independent_qualification_branch_verified',true,
 'child_execution_enabled',false,'parent_delivery_enabled',false,'production_changed',false);
 INSERT INTO reality_internal.governed_employee_shifts_v1 VALUES(s,o,plan,'AWAITING_EXACT_ORIGINAL_WORK',now(),now()-interval '1 minute','infinity',NULL,now());
 INSERT INTO reality_internal.governed_employee_completion_warrants_v1(shift_id,owner_id,plan_fingerprint,source_scope,mode,state)
 VALUES(s,o,plan,jsonb_build_array(jsonb_build_object('source_ref',src)),'UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS','ACTIVE');
 INSERT INTO reality_internal.governed_worker_release_approvals_v1(request_id,owner_id,shift_id,claim_id,capability_key,state,
 approval_receipt_sha256,claimed_at,provider_alias_observed_at,provider_alias_observed_deployment_id,runtime_scope,release_sha,release_ref,independent_isolation_proof_sha256)
 VALUES(req,o,s,cl,'VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM','CLAIMED_ONCE',scope_hash,now()-interval '2 minutes',now()-interval '1 minute',
 'dpl_fixture_review_return',runtime,repeat('9',40),'fixture-return',scope_hash);
 INSERT INTO reality_internal.signed_worker_actual_runs_v1(run_id,status,started_at,finished_at,worker_stage)
 VALUES(run,'STARTED',now()-interval '1 minute',NULL,'TERMINAL_TECHNICAL_EVIDENCE_RESPONSE_PUBLICATION');
 INSERT INTO reality_internal.governed_signed_worker_release_wakes_v1 VALUES(run,o,s,cl,repeat('9',40),'fixture-return','NORMAL_SIGNED_SHIFT',scope_hash);
 INSERT INTO reality_internal.owner_continuity_qualification_routes_v1 VALUES(o,src,q,snap,'VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM',clock_timestamp());
 INSERT INTO reality_internal.final_loop_child_review_work_v1(child_work_id,packet_id,owner_id,shift_id,parent_original_work_id,phase,scope_sha256)
 VALUES(gen_random_uuid(),pkt,o,s,work,'ADMITTED',scope_hash);
 INSERT INTO reality_internal.final_loop_resume_events_v1(event_id,shift_id,owner_id,original_work_id,source_ref,signal_kind,
 source_receipt_sha256,previous_receipt_sha256,event_causality_sha256,continuity_head_sha256,continuity_revision,signal_next_action,state,
 observed_at,governed_wake_nonce,governed_wake_worker_run_id,release_continuation_claim_id)
 VALUES(ev,s,o,work,src,'VERIFIED_REVIEW_TECHNICAL_EVIDENCE',review_hash,investigation_hash,scope_hash,oldhead,5,
 'READ_DISTINCT_TERMINAL_TECHNICAL_EVIDENCE_NO_REPLAY','SHADOW_OBSERVED',clock_timestamp(),gen_random_uuid(),run,cl);
 INSERT INTO public.universe_events(event_id,continuity_root_id,worldline_id,entity_type,epistemic_status,lineage_hash,content_hash,payload,provenance,assertion_time)
 VALUES(prior,root,world,'fixture_prior','OBSERVED',substring(oldhead from 8),repeat('2',64),'{}','{}',now()-interval '1 minute');
 payload:=jsonb_build_object('owner_id',o,'shift_id',s,'original_work_id',work,'source_ref',src,'prior_revision',5,'prior_head_sha256',oldhead,
 'review_receipt_sha256',review_hash,'investigation_receipt_sha256',investigation_hash,'qualifier_receipt_sha256',q,
 'previous_attempt_budget_preserved',true,'terminal_recovery_history',jsonb_build_object('remaining_attempts',0),
 'technical_evidence_only',true,'new_attempt_authorized',false,'original_business_red_verified',false,'original_job_completed',false,
 'execution_authorized',false,'replay_authorized',false,'production_changed',false,
 'technical_provider_proof',jsonb_build_object('independent_technical_ci_verified',true,'github_release_sha',repeat('9',40)));
 observed_hash:='sha256:'||encode(sha256(convert_to(payload::text,'UTF8')),'hex');
 INSERT INTO public.universe_events(event_id,continuity_root_id,worldline_id,parent_event_id,entity_type,epistemic_status,lineage_hash,content_hash,payload,provenance,assertion_time,evidence_refs)
 VALUES(obs,root,world,prior,'reality_final_loop_terminal_technical_observation_v1','OBSERVED',substring(head from 8),
 encode(sha256(convert_to(public.reality_continuity_canonical_json_v1(payload),'UTF8')),'hex'),payload,jsonb_build_object('worker_run_id',run),now(),jsonb_build_array(observed_hash));
 checkpoint:=jsonb_build_object('shift_id',s,'owner_id',o,'original_work_id',work,'source_ref',src,'plan_fingerprint',plan,
 'frozen_shift_scope_sha256',scope_hash,'continuity_root_id',root,'continuity_head_sha256',oldhead,'expected_revision',5,
 'worker_run_id',run,'decision','REFRESH','reason_code','BLOCKER_ATTESTATION_PENDING');
 receipt:='sha256:'||encode(sha256(convert_to(checkpoint::text,'UTF8')),'hex');
 INSERT INTO reality_internal.final_loop_transition_receipts_v1(receipt_id,owner_id,shift_id,original_work_id,source_ref,continuity_root_id,
 continuity_head_sha256,expected_revision,decision,reason_code,worker_run_id,receipt_sha256,plan_fingerprint,frozen_shift_scope_sha256)
 VALUES(gen_random_uuid(),o,s,work,src,root,oldhead,5,'REFRESH','BLOCKER_ATTESTATION_PENDING',run,receipt,plan,scope_hash);
 g:=jsonb_build_object('status','FINAL_LOOP_SHARED_CONTINUITY_CHECKED','owner_id',o,'shift_id',s,'continuity_root_id',root,
 'revision',6,'continuity_head_sha256',head,'no_new_executable_authority',true,'unverified_handoffs',0,'worldline_parent_links_verified',true,
 'execution_authorized',false,'original_job_completed',false,'production_changed',false,'frozen_shift_scope_sha256',scope_hash,
 'obligations',jsonb_build_array(jsonb_build_object('original_work_id',work,'source_ref',src,'continuity_identity_verified',true,
 'qualifier_digest_verified',true,'source_proof_verified',true,'independent_original_outcome_verified',false,'next_qualified_action','VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM')));
 proof:=jsonb_build_object('status','FINAL_LOOP_FROZEN_SCOPE_VERIFIED_ORIGINAL_ACCEPTANCE_PENDING','revision',6,
 'continuity_head_sha256',head,'plan_fingerprint',plan,'frozen_shift_scope_sha256',scope_hash);
 INSERT INTO public.suspension_fixture_proof VALUES(s,proof,g);
 INSERT INTO reality_internal.final_loop_resume_conditions_v1(shift_id,owner_id,original_work_id,source_ref,condition_kind,subscribed_receipt_sha256,
 continuity_head_sha256,continuity_revision,next_qualified_action,unresolved_proof_gates,proposed_transition,state)
 VALUES(s,o,work,src,'QUALIFIER_PROOF_CHANGED',q,head,6,'VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM','[]','RECOVER','SUSPENDED');
 IF reality_internal.stage_final_loop_verified_review_return_v1(run) IS NOT NULL THEN RAISE EXCEPTION 'ACTIVE_WORKER_RETURN_ACCEPTED';END IF;
 -- Deliberately mutate the proof only inside the disposable test. Both
 -- false-success and no-untouched-scope cases must fail closed.
 UPDATE reality_internal.signed_worker_actual_runs_v1 SET status='COMPLETED',finished_at=clock_timestamp() WHERE run_id=run;
 SELECT event_id INTO newevent FROM reality_internal.final_loop_resume_events_v1 WHERE shift_id=s AND continuity_revision=6 AND signal_kind='QUALIFIER_PROOF_CHANGED';
 IF newevent IS NULL OR NOT EXISTS(SELECT 1 FROM reality_internal.final_loop_resume_events_v1
 WHERE event_id=newevent AND release_continuation_claim_id=cl AND source_receipt_sha256=q AND previous_receipt_sha256=observed_hash
 AND signal_next_action='VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM' AND state='SHADOW_PENDING')
 THEN RAISE EXCEPTION 'VERIFIED_TECHNICAL_RETURN_NOT_CONNECTED_TO_APPROVED_REVIEW';END IF;
 IF reality_internal.stage_final_loop_verified_review_return_v1(run) IS NOT NULL
 OR (SELECT runtime_scope FROM reality_internal.governed_worker_release_approvals_v1 WHERE claim_id=cl) IS DISTINCT FROM runtime
 OR EXISTS(SELECT 1 FROM reality_internal.final_loop_child_review_work_v1 WHERE shift_id=s AND phase<>'ADMITTED')
 OR EXISTS(SELECT 1 FROM reality_internal.governed_original_independent_final_receipts_v1 WHERE shift_id=s)
 THEN RAISE EXCEPTION 'REVIEW_RETURN_REPLAY_OR_AUTHORITY_DRIFT';END IF;
END $$;
SELECT 'VERIFIED_TECHNICAL_RETURN_STAGES_SAME_APPROVED_READ_ONLY_REVIEW' AS result;
ROLLBACK;
