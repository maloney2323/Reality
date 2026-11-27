-- Candidate only. Existing canonical Continuity incident ledger, no new table,
-- executor, credential operation, worker wake, or causal revision advance.
BEGIN;
ALTER TABLE reality_internal.owner_shift_continuity_incidents_v1
 DROP CONSTRAINT owner_shift_continuity_incidents_v1_kind_check;
ALTER TABLE reality_internal.owner_shift_continuity_incidents_v1
 ADD CONSTRAINT owner_shift_continuity_incidents_v1_kind_check CHECK(kind IN (
 'ELIGIBLE_WORK_NO_DISPATCH','EMPLOYEE_INQUIRY_CLAIM_STALE','QUALIFIED_EVIDENCE_JOB_BLOCKED',
 'EMPLOYEE_QUALIFICATION_HANDOFF_STALLED','SIGNED_SHIFT_REPEATED_NO_PROGRESS',
 'SIGNED_CHAT_RECOVERY_REVIEW_STALLED','SIGNED_CHAT_RECOVERY_SYNTAX_STALLED','SIGNED_CHAT_RECOVERY_MODEL_REJECTED',
 'SIGNED_GOVERNED_TRANSITION_STALLED','SIGNED_MAINTENANCE_BUILDER_FAILED','SIGNED_INFRASTRUCTURE_PROVISIONING_FAILED',
 'SIGNED_FINAL_LOOP_CONTINUITY_BLOCKED','GOVERNED_PROVIDER_CONNECTION_CHECKPOINT'));

CREATE OR REPLACE FUNCTION public.reality_record_governed_provider_checkpoint_v1(p_checkpoint jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE c jsonb:=p_checkpoint; identity_fields jsonb; e jsonb; h text; k text;
 s record; i record; p jsonb; g jsonb; j jsonb; handoff jsonb;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'PROVIDER_CHECKPOINT_SERVICE_ONLY'; END IF;
 IF pg_catalog.jsonb_typeof(c) IS DISTINCT FROM 'object' OR pg_catalog.length(c::text)>4000
 OR c->>'state' IS DISTINCT FROM 'CHECKPOINT_CANDIDATE_NOT_DURABLE'
 OR c->>'resume_permitted' IS DISTINCT FROM 'false'
 OR c->>'renewal_authority_verified' IS DISTINCT FROM 'false'
 OR c->>'durable_freeze_verified' IS DISTINCT FROM 'false'
 OR c->>'policy_id' IS DISTINCT FROM 'GOVERNED_GITHUB_READ_RECOVERY_V1'
 OR coalesce(c->>'original_work_id','') !~ '^work:[a-f0-9]{32}$'
 OR coalesce(c->>'owner_id','') !~ '^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$'
 OR coalesce(c->>'shift_id','') !~ '^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$'
 OR coalesce(c->>'continuity_root_id','') !~ '^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$'
 OR coalesce(c->>'continuity_revision','') !~ '^[1-9][0-9]{0,14}$'
 OR coalesce(c->>'continuity_head_sha256','') !~ '^sha256:[a-f0-9]{64}$'
 OR coalesce(c->>'plan_fingerprint','') !~ '^sha256:[a-f0-9]{64}$'
 OR coalesce(c->>'qualifier_receipt_sha256','') !~ '^sha256:[a-f0-9]{64}$'
 OR coalesce(c->>'provider_failure_fingerprint','') !~ '^sha256:[a-f0-9]{64}$'
 OR coalesce(c->>'input_digest','') !~ '^sha256:[a-f0-9]{64}$'
 OR c->>'idempotency_key' IS DISTINCT FROM c->>'input_digest'
 OR coalesce(c->>'source_ref','') !~ '^https://github[.]com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/(issues|pull)/[1-9][0-9]*$'
 OR coalesce(c->>'connection_id','') !~ '^GITHUB_RELEASE_CI_READ:[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$'
 OR coalesce(c->>'release_sha','') !~ '^[a-f0-9]{40}$'
 OR coalesce(c->>'release_ref','') !~ '^[A-Za-z0-9][A-Za-z0-9/_-]{3,145}$'
 OR coalesce(c->>'paused_step','') NOT IN ('GITHUB_PUBLIC_REPOSITORY_READ','GITHUB_LIFECYCLE_CI_READ','GITHUB_GATEWAY_CI_READ')
 OR (c->>'paused_step'='GITHUB_PUBLIC_REPOSITORY_READ' AND c->'run_id' IS DISTINCT FROM 'null'::jsonb)
 OR (c->>'paused_step'<>'GITHUB_PUBLIC_REPOSITORY_READ' AND coalesce(c->>'run_id','') !~ '^[1-9][0-9]{0,15}$')
 OR coalesce(c->>'provider_http_status','') !~ '^[45][0-9]{2}$'
 OR coalesce(c->>'evidence_signal','') NOT IN ('HTTP_STATUS','HTTP_STATUS_AND_SSO_REQUIRED_HEADER','HTTP_STATUS_AND_RATE_LIMIT_REMAINING_ZERO','HTTP_STATUS_AND_RETRY_AFTER_PRESENT')
 OR NOT coalesce((c->>'failure_class',c->>'route',c->>'renewal_eligibility') IN (
 ('BOUND_CREDENTIAL_REJECTED_CAUSE_UNVERIFIED','VERIFY_ISSUER_SCOPE_AND_RENEWAL_AUTHORITY','REQUIRES_VERIFIED_ISSUER_CAUSE_AND_AUTHORITY'),
 ('ANONYMOUS_READ_REJECTED','VERIFY_EXPLICIT_READ_POLICY','NO_CREDENTIAL_REPLACEMENT'),
 ('ORGANIZATION_SSO_AUTHORIZATION_REQUIRED','REQUEST_EXACT_REAUTHORIZATION','REAUTHORIZATION_ONLY'),
 ('PROVIDER_RATE_LIMIT_OBSERVED','SUSPEND_UNTIL_PROVIDER_RECHECK','NO_CREDENTIAL_REPLACEMENT'),
 ('RESOURCE_ACCESS_OR_SCOPE_UNVERIFIED','VERIFY_REPOSITORY_PERMISSION_AND_SSO','SCOPE_OR_AUTHORITY_REVIEW_ONLY'),
 ('PROVIDER_SERVER_FAILURE','SUSPEND_UNTIL_PROVIDER_RECHECK','NO_CREDENTIAL_REPLACEMENT'),
 ('PROVIDER_READ_CAUSE_UNVERIFIED','QUARANTINE_AND_INVESTIGATE','NOT_ESTABLISHED')),false)
 THEN RETURN pg_catalog.jsonb_build_object('status','PROVIDER_CHECKPOINT_INVALID','resume_permitted',false); END IF;
 -- Canonical serialization matches the sorted scalar checkpoint in JS.
 SELECT pg_catalog.jsonb_object_agg(key,value) INTO identity_fields
 FROM pg_catalog.jsonb_each(c) WHERE key IN
 ('owner_id','shift_id','original_work_id','continuity_root_id','continuity_revision','continuity_head_sha256',
 'plan_fingerprint','source_ref','qualifier_receipt_sha256','release_ref','release_sha','connection_id','paused_step','run_id','policy_id');
 IF (SELECT count(*) FROM pg_catalog.jsonb_object_keys(identity_fields))<>15
 OR 'sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
 public.reality_continuity_canonical_json_v1(identity_fields),'UTF8')),'hex') IS DISTINCT FROM c->>'idempotency_key'
 THEN RETURN pg_catalog.jsonb_build_object('status','PROVIDER_CHECKPOINT_FINGERPRINT_INVALID','resume_permitted',false); END IF;
 -- Existing shift lock serializes checkpoint with the canonical transition.
 SELECT shift_id,owner_id,plan_fingerprint INTO s FROM reality_internal.governed_employee_shifts_v1
 WHERE shift_id=(c->>'shift_id')::uuid AND owner_id=(c->>'owner_id')::uuid
 AND authorized_at IS NOT NULL AND closed_at IS NULL
 AND status IN ('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
 AND planned_start_at<=pg_catalog.clock_timestamp() AND planned_end_at>pg_catalog.clock_timestamp()
 FOR UPDATE;
 IF NOT FOUND OR s.plan_fingerprint IS DISTINCT FROM c->>'plan_fingerprint' THEN
 RETURN pg_catalog.jsonb_build_object('status','PROVIDER_CHECKPOINT_SHIFT_STALE','resume_permitted',false); END IF;
 k:=pg_catalog.substring(c->>'idempotency_key',8);
 SELECT * INTO i FROM reality_internal.owner_shift_continuity_incidents_v1
 WHERE owner_id=s.owner_id AND shift_id=s.shift_id AND kind='GOVERNED_PROVIDER_CONNECTION_CHECKPOINT' AND evidence_key=k;
 IF FOUND THEN
  IF i.source_evidence->'identity' IS DISTINCT FROM identity_fields OR i.evidence_sha256 IS DISTINCT FROM
   'sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(i.source_evidence::text,'UTF8')),'hex')
  THEN RAISE EXCEPTION 'PROVIDER_CHECKPOINT_EXISTING_IDENTITY_MISMATCH';END IF;
  RETURN pg_catalog.jsonb_build_object('status','PROVIDER_CHECKPOINT_RECORDED_OR_EXISTING','checkpoint_id',i.incident_id,
   'receipt_sha256',i.evidence_sha256,'idempotency_key',c->>'idempotency_key','resume_permitted',false);
 END IF;
 p:=public.reality_read_current_final_loop_proof_envelope_v1(s.shift_id);
 g:=public.reality_read_final_loop_shared_continuity_guard_v1(s.shift_id);
 SELECT value INTO j FROM pg_catalog.jsonb_array_elements(coalesce(p->'jobs','[]'::jsonb)) WHERE value->>'original_work_id'=c->>'original_work_id';
 SELECT value INTO handoff FROM pg_catalog.jsonb_array_elements(coalesce(g->'obligations','[]'::jsonb)) WHERE value->>'original_work_id'=c->>'original_work_id';
 IF p->>'status' IS DISTINCT FROM 'FINAL_LOOP_FROZEN_SCOPE_VERIFIED_ORIGINAL_ACCEPTANCE_PENDING'
 OR g->>'status' IS DISTINCT FROM 'FINAL_LOOP_SHARED_CONTINUITY_CHECKED'
 OR p->>'owner_id' IS DISTINCT FROM c->>'owner_id' OR g->>'owner_id' IS DISTINCT FROM c->>'owner_id'
 OR p->>'continuity_root_id' IS DISTINCT FROM c->>'continuity_root_id' OR g->>'continuity_root_id' IS DISTINCT FROM c->>'continuity_root_id'
 OR p->>'continuity_head_sha256' IS DISTINCT FROM c->>'continuity_head_sha256' OR g->>'continuity_head_sha256' IS DISTINCT FROM c->>'continuity_head_sha256'
 OR p->>'revision' IS DISTINCT FROM c->>'continuity_revision' OR g->>'revision' IS DISTINCT FROM c->>'continuity_revision'
 OR j->>'independent_source_proof_verified' IS DISTINCT FROM 'true' OR j->>'source_ref' IS DISTINCT FROM c->>'source_ref'
 OR handoff->>'source_ref' IS DISTINCT FROM c->>'source_ref'
 OR handoff->>'qualifier_digest_verified' IS DISTINCT FROM 'true'
 OR handoff->>'continuity_identity_verified' IS DISTINCT FROM 'true'
 OR handoff->>'qualifier_receipt_sha256' IS DISTINCT FROM c->>'qualifier_receipt_sha256'
 THEN RETURN pg_catalog.jsonb_build_object('status','PROVIDER_CHECKPOINT_CONTINUITY_STALE','resume_permitted',false); END IF;
 -- Store only the allowlisted fields, never headers, payloads or credentials.
 e:=pg_catalog.jsonb_build_object('schema','reality-governed-provider-checkpoint-v1','identity',identity_fields,
 'owner_id',s.owner_id,'shift_id',s.shift_id,'original_work_id',c->>'original_work_id','source_ref',c->>'source_ref',
 'idempotency_key',c->>'idempotency_key','failure_class',c->>'failure_class','route',c->>'route',
 'renewal_eligibility',c->>'renewal_eligibility','evidence_signal',c->>'evidence_signal',
 'provider_http_status',c->'provider_http_status','provider_failure_fingerprint',c->>'provider_failure_fingerprint',
 'actor_policy','AUTHENTICATED_EXISTING_RELEASE_CONTROLLER','investigation_only',true,
 'renewal_authority_verified',false,'resume_permitted',false,'production_changed',false);
 h:='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(e::text,'UTF8')),'hex');
 INSERT INTO reality_internal.owner_shift_continuity_incidents_v1
 (owner_id,shift_id,kind,evidence_key,error_summary,evidence_sha256,source_evidence,phase,next_investigation_at)
 VALUES(s.owner_id,s.shift_id,'GOVERNED_PROVIDER_CONNECTION_CHECKPOINT',k,
 'Provider read failed; preserve exact original operation pending independent connection authority.',h,e,'BLOCKED_NEEDS_EVIDENCE','infinity'::timestamptz)
 ON CONFLICT(owner_id,shift_id,kind,evidence_key) DO NOTHING RETURNING * INTO i;
 IF NOT FOUND THEN RAISE EXCEPTION 'PROVIDER_CHECKPOINT_CAS_CONFLICT_RECONCILE';END IF;
 RETURN pg_catalog.jsonb_build_object('status','PROVIDER_CHECKPOINT_RECORDED_OR_EXISTING','checkpoint_id',i.incident_id,
 'receipt_sha256',h,'idempotency_key',c->>'idempotency_key','resume_permitted',false);
END $fn$;

CREATE OR REPLACE FUNCTION public.reality_read_governed_provider_checkpoint_v1(p_owner_id uuid,p_shift_id uuid,p_checkpoint_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE i record; p jsonb; x jsonb;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'PROVIDER_CHECKPOINT_SERVICE_ONLY';END IF;
 SELECT * INTO i FROM reality_internal.owner_shift_continuity_incidents_v1 WHERE owner_id=p_owner_id AND shift_id=p_shift_id
 AND incident_id=p_checkpoint_id AND kind='GOVERNED_PROVIDER_CONNECTION_CHECKPOINT';
 IF NOT FOUND OR i.evidence_sha256 IS DISTINCT FROM 'sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(i.source_evidence::text,'UTF8')),'hex')
 THEN RETURN pg_catalog.jsonb_build_object('status','PROVIDER_CHECKPOINT_READBACK_UNVERIFIED','resume_permitted',false);END IF;
 x:=i.source_evidence->'identity'; p:=public.reality_read_current_final_loop_proof_envelope_v1(p_shift_id);
 RETURN pg_catalog.jsonb_build_object('status','PROVIDER_CHECKPOINT_DURABLE_READBACK',
 'checkpoint_id',i.incident_id,'receipt_sha256',i.evidence_sha256,'idempotency_key',i.source_evidence->>'idempotency_key',
 'original_work_id',x->>'original_work_id','continuity_revision',(x->>'continuity_revision')::bigint,
 'continuity_head_sha256',x->>'continuity_head_sha256','recorded_at',i.first_detected_at,
 'current_revision_matches',coalesce(p->>'revision'=x->>'continuity_revision' AND p->>'continuity_head_sha256'=x->>'continuity_head_sha256',false),
 'resume_permitted',false,'renewal_authority_verified',false,'lease_created',false,'credential_changed',false,
 'execution_freeze_verified',false,'recovery_budget_changed',false,'original_job_completed',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_record_governed_provider_checkpoint_v1(jsonb),public.reality_read_governed_provider_checkpoint_v1(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_record_governed_provider_checkpoint_v1(jsonb),public.reality_read_governed_provider_checkpoint_v1(uuid,uuid,uuid) TO service_role;
COMMIT;
