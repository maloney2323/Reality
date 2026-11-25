-- Restore the existing external infrastructure observer -> existing signed
-- Continuity incident ledger. Evidence-only; no new queue, shift or authority.
ALTER TABLE reality_internal.owner_shift_continuity_incidents_v1
 DROP CONSTRAINT owner_shift_continuity_incidents_v1_kind_check;
ALTER TABLE reality_internal.owner_shift_continuity_incidents_v1
 ADD CONSTRAINT owner_shift_continuity_incidents_v1_kind_check CHECK(kind IN (
 'ELIGIBLE_WORK_NO_DISPATCH','EMPLOYEE_INQUIRY_CLAIM_STALE','QUALIFIED_EVIDENCE_JOB_BLOCKED',
 'EMPLOYEE_QUALIFICATION_HANDOFF_STALLED','SIGNED_SHIFT_REPEATED_NO_PROGRESS',
 'SIGNED_CHAT_RECOVERY_REVIEW_STALLED','SIGNED_CHAT_RECOVERY_SYNTAX_STALLED',
 'SIGNED_CHAT_RECOVERY_MODEL_REJECTED','SIGNED_GOVERNED_TRANSITION_STALLED',
 'SIGNED_MAINTENANCE_BUILDER_FAILED','SIGNED_INFRASTRUCTURE_PROVISIONING_FAILED'));
CREATE OR REPLACE FUNCTION public.reality_observe_signed_infrastructure_blocker_v1(
 p_shift_id uuid,p_worker_run_id uuid,p_wake_claim_id uuid,p_owner_id uuid,
 p_original_work_id text,p_source_ref text,p_observation jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE e jsonb; h text; k text; i record;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'SIGNED_INFRASTRUCTURE_SERVICE_ONLY';END IF;
 IF p_shift_id IS NULL OR p_worker_run_id IS NULL OR p_wake_claim_id IS NULL
 OR p_owner_id IS NULL OR coalesce(p_original_work_id,'') !~ '^work:[a-f0-9]{32}$'
 OR coalesce(p_source_ref,'') !~ '^https://github[.]com/maloney2323/Reality/pull/[1-9][0-9]*$'
 OR pg_catalog.jsonb_typeof(p_observation) IS DISTINCT FROM 'object'
 OR pg_catalog.length(p_observation::text)>2000
 OR p_observation->>'provider' IS DISTINCT FROM 'supabase'
 OR coalesce(p_observation->>'project_ref','') !~ '^[a-z0-9]{20}$'
 OR coalesce(p_observation->>'parent_project_ref','') !~ '^[a-z0-9]{20}$'
 OR p_observation->>'project_ref'=p_observation->>'parent_project_ref'
 OR coalesce(p_observation->>'branch_name','') !~ '^[A-Za-z0-9][A-Za-z0-9._-]{1,127}$'
 OR coalesce(p_observation->>'branch_status','') NOT IN('MIGRATIONS_FAILED','FUNCTIONS_DEPLOY_FAILED','PROJECT_FAILED')
 OR coalesce(p_observation->>'preview_project_status','') !~ '^[A-Z_]{2,80}$'
 OR coalesce(p_observation->>'source_receipt_sha256','') !~ '^sha256:[a-f0-9]{64}$'
 OR coalesce(p_observation->>'provider_epoch','') !~ '^[0-9TZ:.+-]{10,45}$'
 OR p_observation->>'independent_provider_readback_verified' IS DISTINCT FROM 'true'
 THEN RAISE EXCEPTION 'SIGNED_INFRASTRUCTURE_EXACT_OBSERVATION_REQUIRED';END IF;
 -- The signed worker's current lease, actual process, canonical source
 -- and existing exact internal-maintenance warrant must all agree.
 PERFORM 1 FROM reality_internal.governed_employee_shifts_v1 s
 JOIN reality_internal.governed_employee_completion_warrants_v1 w
 ON w.shift_id=s.shift_id AND w.owner_id=s.owner_id AND w.plan_fingerprint=s.plan_fingerprint
 JOIN reality_internal.governed_employee_shift_worker_pulses_v1 pulse
 ON pulse.shift_id=s.shift_id AND pulse.owner_id=s.owner_id
 JOIN reality_internal.signed_worker_actual_runs_v1 run
 ON run.run_id=p_worker_run_id AND run.status='STARTED'
 JOIN reality_internal.governed_preview_shift_worker_leases_v1 l
 ON l.claim_id=p_wake_claim_id AND l.worker_key='preview-governed-employee-shift-worker'
 JOIN reality_internal.final_loop_pr_source_plans_v1 plan
 ON plan.shift_id=s.shift_id AND plan.owner_id=s.owner_id AND plan.plan_fingerprint=s.plan_fingerprint
 JOIN reality_internal.owner_internal_maintenance_jobs_v1 m
 ON m.claimed_shift_id=s.shift_id AND m.owner_id=s.owner_id AND m.source_ref=plan.source_ref
 JOIN reality_internal.owner_maintenance_signed_repair_handoffs_v1 mh
 ON mh.maintenance_id=m.incident_id AND mh.owner_id=s.owner_id AND mh.shift_id=s.shift_id AND mh.source_ref=m.source_ref
 WHERE s.shift_id=p_shift_id AND s.owner_id=p_owner_id AND s.authorized_at IS NOT NULL
 AND s.closed_at IS NULL AND s.planned_start_at<=pg_catalog.clock_timestamp()
 AND s.planned_end_at>pg_catalog.clock_timestamp()
 AND s.status IN('RUNNING','QUEUED','AWAITING_EXACT_ORIGINAL_WORK')
 AND w.state='ACTIVE' AND w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
 AND pulse.last_worker_status='WAKE_RECEIVED' AND pulse.last_worker_seen_at>pg_catalog.clock_timestamp()-interval '3 minutes'
 AND run.started_at>=l.claimed_at AND run.started_at>pg_catalog.clock_timestamp()-interval '3 minutes'
 AND l.released_at IS NULL AND l.lease_expires_at>pg_catalog.clock_timestamp()
 AND plan.source_ref=p_source_ref AND plan.parent_original_work_id=p_original_work_id
 AND mh.existing_original_work_id=p_original_work_id AND m.original_job_completed=false
 AND m.production_changed=false
 AND EXISTS (SELECT 1 FROM pg_catalog.jsonb_array_elements(w.source_scope) ws
  WHERE ws->>'maintenance_id'=m.incident_id::text AND ws->>'source_ref'=m.source_ref
    AND ws->>'origin_shift_id'=m.origin_shift_id::text
    AND ws->>'independent_review_receipt_sha256'=m.independent_review_receipt_sha256);
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object('status','SIGNED_INFRASTRUCTURE_SCOPE_UNVERIFIED',
 'execution_authorized',false,'original_job_completed',false,'production_changed',false);END IF;
 e:=pg_catalog.jsonb_build_object('schema','reality-signed-infrastructure-incident-v1',
 'provider','supabase','project_ref',p_observation->>'project_ref',
 'parent_project_ref',p_observation->>'parent_project_ref','branch_name',p_observation->>'branch_name',
 'branch_status',p_observation->>'branch_status','preview_project_status',p_observation->>'preview_project_status',
 'provider_epoch',p_observation->>'provider_epoch','source_receipt_sha256',p_observation->>'source_receipt_sha256',
 'original_work_id',p_original_work_id,'source_ref',p_source_ref,'owner_id',p_owner_id,'shift_id',p_shift_id,
 'investigation_only',true,'root_cause_verified',false,'original_job_completed',false,
 'installation_authorized',false,'production_changed',false);
 h:='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(e::text,'UTF8')),'hex');
 k:=pg_catalog.substring(h,8);
 INSERT INTO reality_internal.owner_shift_continuity_incidents_v1(owner_id,shift_id,kind,evidence_key,error_summary,evidence_sha256,source_evidence)
 VALUES(p_owner_id,p_shift_id,'SIGNED_INFRASTRUCTURE_PROVISIONING_FAILED',k,
 'Independently reobserved isolated Supabase provisioning failure. Diagnose exact provider migration evidence; no mutation authority.',h,e)
 ON CONFLICT(owner_id,shift_id,kind,evidence_key) DO NOTHING;
 SELECT incident_id,phase,evidence_sha256,source_evidence INTO i
 FROM reality_internal.owner_shift_continuity_incidents_v1 WHERE owner_id=p_owner_id AND shift_id=p_shift_id
 AND kind='SIGNED_INFRASTRUCTURE_PROVISIONING_FAILED' AND evidence_key=k;
 IF NOT FOUND OR i.evidence_sha256 IS DISTINCT FROM h OR i.source_evidence IS DISTINCT FROM e
 THEN RAISE EXCEPTION 'SIGNED_INFRASTRUCTURE_DURABLE_IDENTITY_MISMATCH';END IF;
 RETURN pg_catalog.jsonb_build_object('status','SIGNED_INFRASTRUCTURE_INCIDENT_RECORDED',
 'event_id',i.incident_id,'evidence_sha256',h,'source_receipt_sha256',e->>'source_receipt_sha256',
 'phase',i.phase,'execution_authorized',false,'original_job_completed',false,'production_changed',false);
END $fn$;
CREATE OR REPLACE FUNCTION public.reality_read_signed_infrastructure_blocker_v1(
 p_owner_id uuid,p_shift_id uuid,p_incident_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE i record;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'SIGNED_INFRASTRUCTURE_SERVICE_ONLY';END IF;
 SELECT incident_id,phase,evidence_sha256,source_evidence INTO i
 FROM reality_internal.owner_shift_continuity_incidents_v1 WHERE owner_id=p_owner_id AND shift_id=p_shift_id
 AND incident_id=p_incident_id AND kind='SIGNED_INFRASTRUCTURE_PROVISIONING_FAILED';
 IF NOT FOUND OR i.evidence_sha256 IS DISTINCT FROM
 'sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(i.source_evidence::text,'UTF8')),'hex')
 THEN RETURN pg_catalog.jsonb_build_object('status','SIGNED_INFRASTRUCTURE_INCIDENT_NOT_VERIFIED','independent_verified',false);END IF;
 RETURN pg_catalog.jsonb_build_object('status','SIGNED_INFRASTRUCTURE_INCIDENT_READBACK',
 'independent_verified',true,'event_id',i.incident_id,'source_receipt_sha256',i.source_evidence->>'source_receipt_sha256',
 'project_ref',i.source_evidence->>'project_ref','phase',i.phase,
 'state',CASE WHEN i.phase='RECOVERED_AFTER_OBSERVATION' THEN 'CLOSED' ELSE 'OPEN' END,
 'execution_authorized',false,'original_job_completed',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_observe_signed_infrastructure_blocker_v1(uuid,uuid,uuid,uuid,text,text,jsonb),
 public.reality_read_signed_infrastructure_blocker_v1(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_observe_signed_infrastructure_blocker_v1(uuid,uuid,uuid,uuid,text,text,jsonb),
 public.reality_read_signed_infrastructure_blocker_v1(uuid,uuid,uuid) TO service_role;
