-- Existing signed maintenance work and Continuity incident admission.
ALTER TABLE reality_internal.owner_internal_maintenance_jobs_v1
 ADD COLUMN IF NOT EXISTS recovery_state text NOT NULL DEFAULT 'READY_FOR_BUILD',
 ADD COLUMN IF NOT EXISTS build_attempt_receipts jsonb NOT NULL DEFAULT '[]'::jsonb,
 ADD COLUMN IF NOT EXISTS build_reentry_not_before timestamptz,
 ADD COLUMN IF NOT EXISTS build_recovery_decisions jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE reality_internal.owner_internal_maintenance_jobs_v1
 ADD CONSTRAINT signed_builder_recovery_state_v1 CHECK(recovery_state IN ('READY_FOR_BUILD','CLAIM_ACTIVE','FAILED_PENDING_TRIAGE','REENTRY_AUTHORIZED','CANDIDATE_READY','TERMINAL_BOUNDARY')),
 ADD CONSTRAINT signed_builder_attempt_history_v1 CHECK(jsonb_typeof(build_attempt_receipts)='array' AND jsonb_array_length(build_attempt_receipts)<=3),
 ADD CONSTRAINT signed_builder_decision_history_v1 CHECK(jsonb_typeof(build_recovery_decisions)='array' AND jsonb_array_length(build_recovery_decisions)<=3);
ALTER TABLE reality_internal.owner_shift_continuity_incidents_v1 DROP CONSTRAINT owner_shift_continuity_incidents_v1_kind_check;
ALTER TABLE reality_internal.owner_shift_continuity_incidents_v1 ADD CONSTRAINT owner_shift_continuity_incidents_v1_kind_check CHECK(kind IN (
 'ELIGIBLE_WORK_NO_DISPATCH','EMPLOYEE_INQUIRY_CLAIM_STALE','QUALIFIED_EVIDENCE_JOB_BLOCKED','EMPLOYEE_QUALIFICATION_HANDOFF_STALLED',
 'SIGNED_SHIFT_REPEATED_NO_PROGRESS','SIGNED_CHAT_RECOVERY_REVIEW_STALLED','SIGNED_CHAT_RECOVERY_SYNTAX_STALLED',
 'SIGNED_CHAT_RECOVERY_MODEL_REJECTED','SIGNED_GOVERNED_TRANSITION_STALLED','SIGNED_MAINTENANCE_BUILDER_FAILED'));
CREATE OR REPLACE FUNCTION reality_internal.admit_signed_builder_failure_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $fn$
DECLARE b jsonb:=NEW.frozen_test_build;e jsonb;key text;h text;
BEGIN
 IF b IS NULL THEN RETURN NEW;END IF;
 IF b->>'state'='CLAIMED' THEN NEW.recovery_state:='CLAIM_ACTIVE';RETURN NEW;END IF;
 IF b->>'state' NOT IN ('DRAFT','PROVIDER_UNVERIFIED','INSUFFICIENT_EVIDENCE') OR
 coalesce(b->>'receipt_sha256','') !~ '^sha256:[a-f0-9]{64}$' OR
 b->'scope'->>'maintenance_id' IS DISTINCT FROM NEW.incident_id::text OR
 b->'scope'->>'owner_id' IS DISTINCT FROM NEW.owner_id::text OR
 b->'scope'->>'shift_id' IS DISTINCT FROM NEW.claimed_shift_id::text OR
 b->'scope'->>'source_ref' IS DISTINCT FROM NEW.source_ref THEN
 RAISE EXCEPTION 'BUILDER_ATTEMPT_SCOPE_INVALID';END IF;
 IF EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(NEW.build_attempt_receipts) x WHERE x->>'receipt_sha256'=b->>'receipt_sha256') THEN RETURN NEW;END IF;
 NEW.build_attempt_receipts:=NEW.build_attempt_receipts||pg_catalog.jsonb_build_array(b);
 IF b->>'state'='DRAFT' THEN NEW.recovery_state:='CANDIDATE_READY';RETURN NEW;END IF;
 NEW.recovery_state:='FAILED_PENDING_TRIAGE';
 e:=pg_catalog.jsonb_build_object('schema','reality-signed-maintenance-builder-failure-v1','maintenance_id',NEW.incident_id,
 'attempt_id',b->>'request_id','source_ref',NEW.source_ref,'failure_receipt_sha256',b->>'receipt_sha256',
 'observed_state',b->>'state','error_class',coalesce(b->'candidate'->'provider_diagnostic'->>'error_class','UNKNOWN_PROVIDER_OUTCOME'),
 'failure_reason',b->'candidate'->>'reason','source_release_sha',b->'scope'->>'release_sha','authority_receipt_sha256',b->'scope'->>'authority_receipt_sha256',
 'investigation_only',true,'original_job_completed',false,'installation_authorized',false,'production_changed',false);
 key:=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(NEW.incident_id::text||':'||coalesce(b->>'request_id','')||':'||(b->>'receipt_sha256'),'UTF8')),'hex');
 h:='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(e::text,'UTF8')),'hex');
 INSERT INTO reality_internal.owner_shift_continuity_incidents_v1(owner_id,shift_id,kind,evidence_key,source_claim_id,error_summary,evidence_sha256,source_evidence)
 VALUES(NEW.owner_id,NEW.claimed_shift_id,'SIGNED_MAINTENANCE_BUILDER_FAILED',key,(b->>'request_id')::uuid,
 'Signed maintenance builder attempt failed; investigate exact provider evidence before governed reentry.',h,e)
 ON CONFLICT(owner_id,shift_id,kind,evidence_key) DO NOTHING;
 RETURN NEW;
END $fn$;
DROP TRIGGER IF EXISTS signed_builder_failure_receipt_admission_v1 ON reality_internal.owner_internal_maintenance_jobs_v1;
CREATE TRIGGER signed_builder_failure_receipt_admission_v1 BEFORE UPDATE OF frozen_test_build ON reality_internal.owner_internal_maintenance_jobs_v1 FOR EACH ROW EXECUTE FUNCTION reality_internal.admit_signed_builder_failure_v1();
UPDATE reality_internal.owner_internal_maintenance_jobs_v1 SET frozen_test_build=frozen_test_build WHERE frozen_test_build IS NOT NULL AND build_attempt_receipts='[]'::jsonb;
CREATE OR REPLACE FUNCTION public.reality_claim_next_shift_continuity_investigation_v1(p_shift_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare i reality_internal.owner_shift_continuity_incidents_v1%rowtype;
 s record;
begin
 if current_user<>'service_role' or p_shift_id is null then
  raise exception 'CONTINUITY_INVESTIGATION_SIGNED_SERVICE_REQUIRED';end if;
 select a.owner_id,a.shift_id into s
 from reality_internal.governed_employee_shifts_v1 a
 join reality_internal.governed_employee_shift_worker_pulses_v1 wake
  on wake.shift_id=a.shift_id and wake.owner_id=a.owner_id
 where a.shift_id=p_shift_id and a.status in
   ('RUNNING','QUEUED','AWAITING_EXACT_ORIGINAL_WORK')
   and a.closed_at is null and a.authorized_at is not null
   and a.planned_start_at<=clock_timestamp()
   and a.planned_end_at>clock_timestamp()
   and wake.last_worker_status='WAKE_RECEIVED'
   and wake.last_worker_seen_at>clock_timestamp()-interval '3 minutes';
 if not found then return pg_catalog.jsonb_build_object(
  'status','NO_CURRENT_SIGNED_SHIFT_CONTINUITY_SCOPE',
  'model_inquiry_authorized',false,'execution_authorized',false,
  'installation_authorized',false,'production_changed',false);end if;
 select * into i from reality_internal.owner_shift_continuity_incidents_v1
 where shift_id=p_shift_id and owner_id=s.owner_id
  and kind<>'SIGNED_MAINTENANCE_BUILDER_FAILED'
  and phase in ('DETECTED','BLOCKED_NEEDS_EVIDENCE')
  and (investigation_attempts<3 or (investigation_attempts=3
   and remediation_granted_at is not null and remediation_used_at is null
   and remediation_release_commit~'^[a-f0-9]{40}$'
   and remediation_receipt_sha256~'^sha256:[a-f0-9]{64}$'
   and remediation_ci_run_id is not null))
  and (kind<>'SIGNED_CHAT_RECOVERY_REVIEW_STALLED' or (
   source_evidence->>'investigation_only'='true'
   and evidence_sha256='sha256:'||pg_catalog.encode(
       extensions.digest(source_evidence::text,'sha256'),'hex')
   and exists(select 1 from reality_internal.genuine_capability_queue_v1 g
     where g.owner_id=owner_shift_continuity_incidents_v1.owner_id
      and g.trigger_id::text=source_evidence->>'trigger_id'
      and g.claim_id=owner_shift_continuity_incidents_v1.source_claim_id
      and g.original_work_id=source_evidence->>'original_work_id'
      and g.qualified_candidate->>'candidate_sha256'=source_evidence->>'candidate_sha256'
      and g.qualification_receipt->>'target_review_failure_receipt_sha256'=
       source_evidence->>'failure_receipt_sha256'
      and g.phase='SIGNED_CHAT_RECOVERY_TARGET_REVIEW_UNVERIFIED'
      and g.quarantine_receipt_sha256 is null)))
  and (kind<>'SIGNED_CHAT_RECOVERY_SYNTAX_STALLED' or (
   source_evidence->>'schema'='reality-signed-chat-syntax-incident-source-v1'
   and source_evidence->>'investigation_only'='true'
   and evidence_sha256='sha256:'||pg_catalog.encode(extensions.digest(source_evidence::text,'sha256'),'hex')
   and source_evidence=reality_internal.signed_chat_syntax_exhaustion_evidence_v1((source_evidence->>'trigger_id')::uuid,p_shift_id)))
  and (kind<>'SIGNED_CHAT_RECOVERY_MODEL_REJECTED' or (
   source_evidence->>'schema'='reality-signed-rejected-source-incident-v1'
   and source_evidence->>'investigation_only'='true'
   and source_evidence->>'source_candidate_executed'='false'
   and evidence_sha256='sha256:'||pg_catalog.encode(extensions.digest(source_evidence::text,'sha256'),'hex')
   and source_evidence=reality_internal.signed_chat_model_rejection_evidence_v1(
    (source_evidence->>'trigger_id')::uuid,p_shift_id)))
  and (kind<>'SIGNED_GOVERNED_TRANSITION_STALLED' or (
   source_evidence->>'schema'='reality-source-bound-unsettled-transition-v1'
   and source_evidence->>'transition_family'='SIGNED_CHAT_DEVELOPMENT_RECOVERY'
   and source_evidence->>'investigation_only'='true'
   and source_evidence->>'provider_effect_known'='false'
   and source_evidence->>'provider_effect_replayed'='false'
   and evidence_sha256='sha256:'||pg_catalog.encode(extensions.digest(source_evidence::text,'sha256'),'hex')
   and source_evidence=reality_internal.signed_chat_fenced_transition_evidence_v1(
    (source_evidence->>'trigger_id')::uuid,p_shift_id)))
  and (next_investigation_at is null or next_investigation_at<=clock_timestamp())
 order by first_detected_at limit 1 for update skip locked;
 if not found then return pg_catalog.jsonb_build_object(
  'status','NO_DETECTED_SHIFT_CONTINUITY_INCIDENT',
  'model_inquiry_authorized',false,'execution_authorized',false,
  'installation_authorized',false,'production_changed',false);end if;
 update reality_internal.owner_shift_continuity_incidents_v1
 set phase='INVESTIGATION_CLAIMED',investigation_lease_id=gen_random_uuid(),
  investigation_claimed_at=clock_timestamp(),
  investigation_attempts=investigation_attempts+1,
  next_investigation_at=null,
  remediation_used_at=case when i.investigation_attempts=3 then clock_timestamp()
   else remediation_used_at end
 where incident_id=i.incident_id returning * into i;
 return pg_catalog.jsonb_build_object(
  'status','SIGNED_SHIFT_CONTINUITY_INVESTIGATION_CLAIMED',
  'owner_id',i.owner_id,'shift_id',i.shift_id,
  'incident_id',i.incident_id,'lease_id',i.investigation_lease_id,
  'kind',i.kind,'source_claim_id',i.source_claim_id,
  'source_evidence',i.source_evidence,
  'error_summary',i.error_summary,'evidence_sha256',i.evidence_sha256,
  'first_detected_at',i.first_detected_at,
  'investigation_attempt',i.investigation_attempts,
  'remediation_release_commit',i.remediation_release_commit,
  'remediation_ci_run_id',i.remediation_ci_run_id,
  'remediation_receipt_sha256',i.remediation_receipt_sha256,
  'previous_failure_reason',i.limitations,
  'failure_history',i.investigation_failure_history,
  'qualified_job_id',i.qualified_job_id,
  'failed_source_ref',coalesce(
   (select j.source_ref from reality_internal.owner_qualified_employee_evidence_jobs_v1 j
    where j.job_id=i.qualified_job_id and j.owner_id=i.owner_id and j.shift_id=i.shift_id),
   (select t.source_ref from reality_internal.employee_temporal_inquiries_v1 t
    where i.kind='EMPLOYEE_QUALIFICATION_HANDOFF_STALLED'
     and t.claim_id=i.source_claim_id and t.owner_id=i.owner_id
     and t.phase='RECORDED' and t.provider_proof_sha256~'^sha256:[a-f0-9]{64}$'
    limit 1)),
  'failed_job_phase',(select j.phase from reality_internal.owner_qualified_employee_evidence_jobs_v1 j where j.job_id=i.qualified_job_id),
  'failed_job_blocker',(select j.blocker from reality_internal.owner_qualified_employee_evidence_jobs_v1 j where j.job_id=i.qualified_job_id),
  'scope','SOURCE_BACKED_SHIFT_FAILURE_INVESTIGATION_ONLY',
  'model_inquiry_authorized',true,'new_original_jobs_created',0,
  'execution_authorized',false,'installation_authorized',false,
  'production_changed',false);
end $function$;
CREATE OR REPLACE FUNCTION public.reality_claim_signed_maintenance_frozen_test_draft_v1(
 p_shift_id uuid,p_worker_run_id uuid,p_release_sha text)
RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $fn$
DECLARE m record;v jsonb;lease jsonb;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'FROZEN_TEST_BUILD_SERVICE_ONLY';END IF;
 FOR m IN SELECT incident_id,recovery_state,frozen_test_build,build_attempt_receipts FROM reality_internal.owner_internal_maintenance_jobs_v1
 WHERE claimed_shift_id=p_shift_id AND recovery_state IN ('READY_FOR_BUILD','REENTRY_AUTHORIZED') AND original_job_completed=false
 AND (build_reentry_not_before IS NULL OR build_reentry_not_before<=pg_catalog.clock_timestamp())
 AND pg_catalog.jsonb_array_length(build_attempt_receipts)<3
 ORDER BY created_at,incident_id FOR UPDATE SKIP LOCKED LOOP
  v:=reality_internal.signed_frozen_test_build_scope_v1(p_shift_id,m.incident_id,p_worker_run_id,p_release_sha);
  IF v IS NULL THEN CONTINUE;END IF;
  IF m.recovery_state='REENTRY_AUTHORIZED' AND (m.frozen_test_build->'scope'->>'authority_receipt_sha256' IS DISTINCT FROM v->>'authority_receipt_sha256' OR m.frozen_test_build->'scope'->>'source_ref' IS DISTINCT FROM v->>'source_ref') THEN CONTINUE;END IF;
  lease:=pg_catalog.jsonb_build_object('state','CLAIMED','request_id',pg_catalog.gen_random_uuid(),
   'worker_run_id',p_worker_run_id,'scope',v,'claimed_at',pg_catalog.clock_timestamp(),'attempt_number',pg_catalog.jsonb_array_length(m.build_attempt_receipts)+1);
  UPDATE reality_internal.owner_internal_maintenance_jobs_v1 SET frozen_test_build=lease,recovery_state='CLAIM_ACTIVE',build_reentry_not_before=NULL WHERE incident_id=m.incident_id;
  RETURN v||pg_catalog.jsonb_build_object('status','SIGNED_FROZEN_TEST_DRAFT_LEASED',
   'request_id',lease->>'request_id','model_invocation_authorized',true,
   'independent_ci_verified',false,'installation_authorized',false,'original_job_completed',false,'production_changed',false);
 END LOOP;
 RETURN pg_catalog.jsonb_build_object('status','NO_NEW_SIGNED_FROZEN_TEST_DRAFT_READY',
  'model_invocation_authorized',false,'installation_authorized',false,'original_job_completed',false,'production_changed',false);
END $fn$;

CREATE OR REPLACE FUNCTION public.reality_claim_next_shift_continuity_investigation_v1(p_shift_id uuid,p_worker_run_id uuid)
RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $fn$
DECLARE i record;m record;v jsonb;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'CONTINUITY_INVESTIGATION_SIGNED_SERVICE_REQUIRED';END IF;
 -- An expired claim is not proof of no provider effect. Preserve it, and
 -- report the unresolved outcome; never automatically reissue the call.
 FOR m IN SELECT * FROM reality_internal.owner_internal_maintenance_jobs_v1
 WHERE claimed_shift_id=p_shift_id AND recovery_state='CLAIM_ACTIVE' AND original_job_completed=false
 AND (frozen_test_build->>'claimed_at')::timestamptz<pg_catalog.clock_timestamp()-interval '3 minutes'
 FOR UPDATE SKIP LOCKED LOOP
  v:=reality_internal.signed_frozen_test_build_scope_v1(p_shift_id,m.incident_id,p_worker_run_id,m.frozen_test_build->'scope'->>'release_sha');
  IF v IS NULL OR v->>'authority_receipt_sha256' IS DISTINCT FROM m.frozen_test_build->'scope'->>'authority_receipt_sha256' THEN CONTINUE;END IF;
  UPDATE reality_internal.owner_internal_maintenance_jobs_v1 SET recovery_state='TERMINAL_BOUNDARY'
   WHERE incident_id=m.incident_id;
 END LOOP;
 FOR m IN SELECT * FROM reality_internal.owner_internal_maintenance_jobs_v1
 WHERE claimed_shift_id=p_shift_id AND recovery_state='FAILED_PENDING_TRIAGE' AND original_job_completed=false
 ORDER BY (frozen_test_build->>'recorded_at') DESC NULLS LAST,incident_id FOR UPDATE SKIP LOCKED LOOP
  v:=reality_internal.signed_frozen_test_build_scope_v1(p_shift_id,m.incident_id,p_worker_run_id,m.frozen_test_build->'scope'->>'release_sha');
  IF v IS NULL OR v->>'authority_receipt_sha256' IS DISTINCT FROM m.frozen_test_build->'scope'->>'authority_receipt_sha256' THEN CONTINUE;END IF;
  SELECT * INTO i FROM reality_internal.owner_shift_continuity_incidents_v1 WHERE owner_id=m.owner_id AND shift_id=p_shift_id
   AND kind='SIGNED_MAINTENANCE_BUILDER_FAILED' AND phase='DETECTED' AND investigation_attempts=0
   AND source_evidence->>'maintenance_id'=m.incident_id::text AND source_evidence->>'failure_receipt_sha256'=m.frozen_test_build->>'receipt_sha256'
   ORDER BY first_detected_at DESC LIMIT 1 FOR UPDATE SKIP LOCKED;
  IF NOT FOUND THEN CONTINUE;END IF;
  UPDATE reality_internal.owner_shift_continuity_incidents_v1 SET phase='INVESTIGATION_CLAIMED',investigation_lease_id=pg_catalog.gen_random_uuid(),investigation_claimed_at=pg_catalog.clock_timestamp(),investigation_attempts=1
   WHERE incident_id=i.incident_id RETURNING * INTO i;
  RETURN pg_catalog.jsonb_build_object('status','SIGNED_BUILDER_FAILURE_INVESTIGATION_CLAIMED','owner_id',m.owner_id,
   'shift_id',p_shift_id,'incident_id',i.incident_id,'lease_id',i.investigation_lease_id,'maintenance_id',m.incident_id,
   'source_evidence',i.source_evidence,'evidence_sha256',i.evidence_sha256,'attempt_count',pg_catalog.jsonb_array_length(m.build_attempt_receipts),
   'investigation_only',true,'execution_authorized',false,'installation_authorized',false,'production_changed',false);
 END LOOP;
 RETURN public.reality_claim_next_shift_continuity_investigation_v1(p_shift_id);
END $fn$;
CREATE OR REPLACE FUNCTION public.reality_record_signed_builder_recovery_decision_v1(p_shift_id uuid,p_worker_run_id uuid,p_incident_id uuid,p_lease_id uuid,p_observation jsonb)
RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $fn$
DECLARE i record;m record;v jsonb;cl text;decision text;strategy text;receipt text;d jsonb;until_at timestamptz;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'CONTINUITY_INVESTIGATION_SIGNED_SERVICE_REQUIRED';END IF;
 SELECT * INTO i FROM reality_internal.owner_shift_continuity_incidents_v1 WHERE incident_id=p_incident_id AND shift_id=p_shift_id
 AND kind='SIGNED_MAINTENANCE_BUILDER_FAILED' AND phase='INVESTIGATION_CLAIMED' AND investigation_lease_id=p_lease_id
 AND investigation_claimed_at>pg_catalog.clock_timestamp()-interval '3 minutes';
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object('status','BUILDER_RECOVERY_LEASE_UNVERIFIED');END IF;
 SELECT * INTO m FROM reality_internal.owner_internal_maintenance_jobs_v1 WHERE incident_id=(i.source_evidence->>'maintenance_id')::uuid
 AND owner_id=i.owner_id AND claimed_shift_id=p_shift_id AND recovery_state='FAILED_PENDING_TRIAGE'
 AND frozen_test_build->>'receipt_sha256'=i.source_evidence->>'failure_receipt_sha256' FOR UPDATE;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object('status','BUILDER_RECOVERY_SOURCE_CHANGED');END IF;
 v:=reality_internal.signed_frozen_test_build_scope_v1(p_shift_id,m.incident_id,p_worker_run_id,m.frozen_test_build->'scope'->>'release_sha');
 IF v IS NULL OR v->>'authority_receipt_sha256' IS DISTINCT FROM i.source_evidence->>'authority_receipt_sha256' THEN RETURN pg_catalog.jsonb_build_object('status','BUILDER_RECOVERY_AUTHORITY_UNVERIFIED');END IF;
 PERFORM 1 FROM reality_internal.owner_shift_continuity_incidents_v1 WHERE incident_id=p_incident_id AND phase='INVESTIGATION_CLAIMED' AND investigation_lease_id=p_lease_id FOR UPDATE;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object('status','BUILDER_RECOVERY_LEASE_UNVERIFIED');END IF;
 cl:=p_observation->>'error_class';
 IF pg_catalog.jsonb_typeof(p_observation) IS DISTINCT FROM 'object' OR length(p_observation::text)>1500 OR
 coalesce(cl,'') NOT IN ('PROVIDER_READY','AUTH_OR_SECRET_MISSING','QUOTA_EXHAUSTED','RATE_LIMIT','TRANSIENT_INFRA','MODEL_CONFIG_OR_SCHEMA','UNKNOWN_PROVIDER_OUTCOME','SPEC_OR_TEST_FAILURE')
 OR coalesce(p_observation->>'model','') !~ '^[A-Za-z0-9._-]{3,80}$' OR coalesce(p_observation->>'probe_kind','')<>'BOUNDED_RESPONSES_SCHEMA_DIAGNOSTIC'
 OR (cl='PROVIDER_READY' AND (p_observation->>'http_status' IS DISTINCT FROM '200' OR coalesce(p_observation->>'response_id','') !~ '^resp_[A-Za-z0-9_-]{4,160}
 THEN RAISE EXCEPTION 'BUILDER_RECOVERY_OBSERVATION_INVALID';END IF;
 strategy:=CASE WHEN cl='PROVIDER_READY' THEN 'RETRY_AFTER_FRESH_PROVIDER_PROOF' WHEN cl IN ('RATE_LIMIT','TRANSIENT_INFRA') THEN 'BOUNDED_DELAYED_PROVIDER_RETRY' ELSE 'NO_REPLAY_EVIDENCE_BOUNDARY' END;
 decision:=CASE WHEN pg_catalog.jsonb_array_length(m.build_attempt_receipts)>=3 OR m.frozen_test_build->>'state'='INSUFFICIENT_EVIDENCE' OR cl NOT IN ('PROVIDER_READY','RATE_LIMIT','TRANSIENT_INFRA') THEN 'TERMINAL_BOUNDARY' ELSE 'REENTRY_AUTHORIZED' END;
 until_at:=CASE WHEN decision='REENTRY_AUTHORIZED' THEN pg_catalog.clock_timestamp()+interval '5 minutes' ELSE NULL END;
 d:=pg_catalog.jsonb_build_object('incident_id',p_incident_id,'attempt_id',m.frozen_test_build->>'request_id','prior_receipt_sha256',m.frozen_test_build->>'receipt_sha256',
 'observation',p_observation,'strategy',strategy,'strategy_fingerprint','sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(strategy||':'||cl||':'||coalesce(p_observation->>'model','')||':'||(m.frozen_test_build->>'receipt_sha256'),'UTF8')),'hex'),
 'state',decision,'remaining_build_attempts',greatest(0,3-pg_catalog.jsonb_array_length(m.build_attempt_receipts)),'not_before',until_at,
 'original_job_completed',false,'installation_authorized',false,'production_changed',false);
 receipt:='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(d::text,'UTF8')),'hex');
 UPDATE reality_internal.owner_internal_maintenance_jobs_v1 SET recovery_state=decision,build_reentry_not_before=until_at,
 build_recovery_decisions=build_recovery_decisions||pg_catalog.jsonb_build_array(d||pg_catalog.jsonb_build_object('receipt_sha256',receipt)) WHERE incident_id=m.incident_id;
 UPDATE reality_internal.owner_shift_continuity_incidents_v1 SET phase='INVESTIGATION_RECORDED_NEEDS_INDEPENDENT_PROOF',diagnosis='Bounded same-provider diagnostic: '||cl,
 proposed_upgrade=strategy,independent_test_requirement='Independent original frozen CI and settlement remain required.',
 limitations='Provider readback does not independently prove the repair or original work.',investigation_receipt_sha256=receipt,investigated_at=pg_catalog.clock_timestamp() WHERE incident_id=p_incident_id;
 RETURN pg_catalog.jsonb_build_object('status','SIGNED_BUILDER_RECOVERY_DECISION_RECORDED','incident_id',p_incident_id,'maintenance_id',m.incident_id,
 'recovery_state',decision,'error_class',cl,'strategy',strategy,'receipt_sha256',receipt,'not_before',until_at,
 'original_job_completed',false,'installation_authorized',false,'production_changed',false,'execution_authorized',false);
END $fn$;
REVOKE ALL ON FUNCTION reality_internal.admit_signed_builder_failure_v1(),public.reality_claim_next_shift_continuity_investigation_v1(uuid,uuid),
 public.reality_record_signed_builder_recovery_decision_v1(uuid,uuid,uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION reality_internal.admit_signed_builder_failure_v1(),public.reality_claim_next_shift_continuity_investigation_v1(uuid,uuid),
 public.reality_record_signed_builder_recovery_decision_v1(uuid,uuid,uuid,uuid,jsonb) TO service_role;))
 OR (cl='RATE_LIMIT' AND p_observation->>'http_status' IS DISTINCT FROM '429')
 OR (cl='TRANSIENT_INFRA' AND coalesce(p_observation->>'http_status','') NOT IN ('408','500','502','503','504'))
 THEN RAISE EXCEPTION 'BUILDER_RECOVERY_OBSERVATION_INVALID';END IF;
 strategy:=CASE WHEN cl='PROVIDER_READY' THEN 'RETRY_AFTER_FRESH_PROVIDER_PROOF' WHEN cl IN ('RATE_LIMIT','TRANSIENT_INFRA') THEN 'BOUNDED_DELAYED_PROVIDER_RETRY' ELSE 'NO_REPLAY_EVIDENCE_BOUNDARY' END;
 decision:=CASE WHEN pg_catalog.jsonb_array_length(m.build_attempt_receipts)>=3 OR m.frozen_test_build->>'state'='INSUFFICIENT_EVIDENCE' OR cl NOT IN ('PROVIDER_READY','RATE_LIMIT','TRANSIENT_INFRA') THEN 'TERMINAL_BOUNDARY' ELSE 'REENTRY_AUTHORIZED' END;
 until_at:=CASE WHEN decision='REENTRY_AUTHORIZED' THEN pg_catalog.clock_timestamp()+interval '5 minutes' ELSE NULL END;
 d:=pg_catalog.jsonb_build_object('incident_id',p_incident_id,'attempt_id',m.frozen_test_build->>'request_id','prior_receipt_sha256',m.frozen_test_build->>'receipt_sha256',
 'observation',p_observation,'strategy',strategy,'strategy_fingerprint','sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(strategy||':'||cl||':'||coalesce(p_observation->>'model','')||':'||(m.frozen_test_build->>'receipt_sha256'),'UTF8')),'hex'),
 'state',decision,'remaining_build_attempts',greatest(0,3-pg_catalog.jsonb_array_length(m.build_attempt_receipts)),'not_before',until_at,
 'original_job_completed',false,'installation_authorized',false,'production_changed',false);
 receipt:='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(d::text,'UTF8')),'hex');
 UPDATE reality_internal.owner_internal_maintenance_jobs_v1 SET recovery_state=decision,build_reentry_not_before=until_at,
 build_recovery_decisions=build_recovery_decisions||pg_catalog.jsonb_build_array(d||pg_catalog.jsonb_build_object('receipt_sha256',receipt)) WHERE incident_id=m.incident_id;
 UPDATE reality_internal.owner_shift_continuity_incidents_v1 SET phase='INVESTIGATION_RECORDED_NEEDS_INDEPENDENT_PROOF',diagnosis='Bounded same-provider diagnostic: '||cl,
 proposed_upgrade=strategy,independent_test_requirement='Independent original frozen CI and settlement remain required.',
 limitations='Provider readback does not independently prove the repair or original work.',investigation_receipt_sha256=receipt,investigated_at=pg_catalog.clock_timestamp() WHERE incident_id=p_incident_id;
 RETURN pg_catalog.jsonb_build_object('status','SIGNED_BUILDER_RECOVERY_DECISION_RECORDED','incident_id',p_incident_id,'maintenance_id',m.incident_id,
 'recovery_state',decision,'error_class',cl,'strategy',strategy,'receipt_sha256',receipt,'not_before',until_at,
 'original_job_completed',false,'installation_authorized',false,'production_changed',false,'execution_authorized',false);
END $fn$;
REVOKE ALL ON FUNCTION reality_internal.admit_signed_builder_failure_v1(),public.reality_claim_next_shift_continuity_investigation_v1(uuid,uuid),
 public.reality_record_signed_builder_recovery_decision_v1(uuid,uuid,uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION reality_internal.admit_signed_builder_failure_v1(),public.reality_claim_next_shift_continuity_investigation_v1(uuid,uuid),
 public.reality_record_signed_builder_recovery_decision_v1(uuid,uuid,uuid,uuid,jsonb) TO service_role;