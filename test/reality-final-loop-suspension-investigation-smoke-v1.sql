-- Disposable CI database only. No real credentials, network, provider calls,
-- production access, original settlement, or owner approval is manufactured.
CREATE SCHEMA reality_internal;
CREATE SCHEMA vault;
CREATE SCHEMA net;
GRANT USAGE ON SCHEMA reality_internal TO service_role;
CREATE TABLE vault.decrypted_secrets(name text,decrypted_secret text);
CREATE TABLE net.fake_requests(id bigint GENERATED ALWAYS AS IDENTITY,target text,headers jsonb);
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
 installation_authorized boolean DEFAULT false,production_changed boolean DEFAULT false,original_job_completed boolean DEFAULT false);
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
SET ROLE service_role;
DO $$
DECLARE e record; run uuid:=gen_random_uuid(); lease uuid:=gen_random_uuid(); plan text; ctx jsonb; r jsonb; proof jsonb;
BEGIN
 SELECT * INTO e FROM reality_internal.final_loop_resume_events_v1 WHERE signal_kind='VERIFIED_REVIEW_TECHNICAL_EVIDENCE';
 SELECT plan_fingerprint INTO plan FROM reality_internal.governed_employee_shifts_v1 WHERE shift_id=e.shift_id;
 UPDATE reality_internal.governed_preview_shift_worker_leases_v1 SET claim_id=lease,claimed_at=clock_timestamp()-interval '1 second',
 released_at=NULL,lease_expires_at=clock_timestamp()+interval '2 minutes';
 INSERT INTO reality_internal.signed_worker_actual_runs_v1 VALUES(run,'STARTED',clock_timestamp(),NULL,'FIXTURE_TERMINAL_READBACK');
 INSERT INTO reality_internal.governed_signed_worker_release_wakes_v1 VALUES(run,e.owner_id,e.shift_id,e.release_continuation_claim_id,
 repeat('2',40),'fixture-corrected','NORMAL_SIGNED_SHIFT','sha256:'||repeat('2',64));
 UPDATE reality_internal.governed_employee_shift_worker_pulses_v1 SET last_worker_seen_at=clock_timestamp(),last_worker_status='WAKE_RECEIVED'
 WHERE shift_id=e.shift_id;
 r:=public.reality_claim_canonical_governed_wake_v1(e.owner_id,e.shift_id,plan,e.event_id,e.governed_wake_nonce,'RESUME',repeat('2',40),run,lease);
 IF r->>'status'<>'CANONICAL_GOVERNED_WAKE_DURABLY_CLAIMED' OR r->>'terminal_technical_evidence_only'<>'true' OR r->>'execution_authorized'<>'false'
 THEN RAISE EXCEPTION 'TERMINAL_EVIDENCE_CLAIM_UNVERIFIED %',r;END IF;
 ctx:=public.reality_read_final_loop_terminal_technical_context_v1(e.shift_id,e.event_id,run);
 IF ctx->>'status'<>'TERMINAL_TECHNICAL_CONTEXT_VERIFIED_READ_ONLY' OR ctx->>'original_work_id'<>e.original_work_id
 THEN RAISE EXCEPTION 'TERMINAL_CONTEXT_UNVERIFIED %',ctx;END IF;
 proof:=jsonb_build_object('status','RECOVERY_TERMINAL_TECHNICAL_CI_ATTESTED_BUDGET_UNCHANGED','contract_id',NULL,
 'owner_id',e.owner_id,'shift_id',e.shift_id,'obligation_id',e.original_work_id,'source_ref',e.source_ref,
 'source_revision',ctx->>'frozen_source_head_sha','qualifier_receipt_sha256',ctx->>'qualifier_receipt_sha256',
 'maintenance_id',ctx->'terminal_history'->>'maintenance_id','existing_diagnostic_receipt_sha256',ctx->'terminal_history'->>'independent_diagnostic_receipt_sha256',
 'independent_technical_ci_verified',true,'frozen_technical_red_verified',true,'independent_ci_provider_observation',true,
 'original_business_case_red_verified',false,'business_original_warrant_verified',false,'original_job_completed',false,
 'previous_attempt_budget_preserved',true,'new_attempt_authorized',false,'repeat_prior_ci_dispatch_permitted',false,
 'execution_authorized',false,'production_changed',false,'github_artifact_digest','sha256:'||repeat('9',64),
 'signed_case_spec_git_blob_sha',repeat('a',40),'github_run_id',123,'github_job_id',456,'github_artifact_id',789,'github_release_sha',repeat('2',40));
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
