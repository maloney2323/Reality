-- Reality Final Loop Engine: parent delivery and Universe continuity.
-- Development-only append after source-plan, child and integration migrations.
-- This is a native subtransition of the existing parent, not another engine.
-- GitHub writes require separate explicit owner approval and one-use reservation.

CREATE TABLE IF NOT EXISTS reality_internal.final_loop_parent_deliveries_v1 (
 delivery_id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
 plan_id uuid NOT NULL UNIQUE REFERENCES reality_internal.final_loop_pr_source_plans_v1(plan_id),
 packet_id uuid NOT NULL REFERENCES reality_internal.final_loop_child_approval_packets_v1(packet_id),
 owner_id uuid NOT NULL, shift_id uuid NOT NULL,
 parent_original_work_id text NOT NULL CHECK
  (parent_original_work_id ~ '^work:[a-f0-9]{32}$'),
 source_ref text NOT NULL,
 source_head_sha text NOT NULL CHECK(source_head_sha ~ '^[a-f0-9]{40}$'),
 source_manifest_sha256 text NOT NULL CHECK
  (source_manifest_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 acceptance_contract_sha256 text NOT NULL CHECK
  (acceptance_contract_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 cross_scope_receipt_sha256 text NOT NULL CHECK
  (cross_scope_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 delivery_body text NOT NULL,
 delivery_body_sha256 text NOT NULL CHECK
  (delivery_body_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 proposal_fingerprint text NOT NULL CHECK
  (proposal_fingerprint ~ '^sha256:[a-f0-9]{64}$'),
 status text NOT NULL DEFAULT 'AWAITING_EXACT_PUBLICATION_APPROVAL'
  CHECK(status IN (
   'AWAITING_EXACT_PUBLICATION_APPROVAL','APPROVED_ONCE',
   'POST_RESERVED_RECONCILE_ONLY','SETTLED')),
 owner_publication_approval_request_id uuid,
 owner_publication_receipt_sha256 text CHECK
  (owner_publication_receipt_sha256 IS NULL OR
   owner_publication_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 owner_approved_at timestamptz,
 publication_claim_id uuid,
 publisher_worker_run_id uuid,
 publication_reserved_at timestamptz,
 provider_comment_id bigint,
 provider_comment_url text,
 independent_verifier_worker_run_id uuid,
 independent_provider_body_sha256 text,
 universe_goal_event_id uuid,
 universe_outcome_event_id uuid,
 original_settlement_receipt_id uuid,
 settled_at timestamptz,
 prepared_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
 UNIQUE(parent_original_work_id)
);
ALTER TABLE reality_internal.final_loop_parent_deliveries_v1
 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON reality_internal.final_loop_parent_deliveries_v1
 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON
 reality_internal.final_loop_parent_deliveries_v1 TO service_role;

-- The FIRST owner approval accepts the source-bound goal. Append its
-- exact signed evidence to the SAME Universe ledger transactionally.
-- A proposed goal without this event can never be called owner accepted.
CREATE OR REPLACE FUNCTION
 reality_internal.reality_final_loop_record_owner_goal_acceptance_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $goal$
DECLARE p record;s record;w record;r record;
 v_event uuid;v_payload jsonb;v_provenance jsonb;v_refs jsonb;
 v_basis jsonb;v_ch text;v_lh text;v_iso text;v_now timestamptz;
BEGIN
 IF TG_OP<>'UPDATE' THEN
  RAISE EXCEPTION 'FINAL_LOOP_GOAL_ACCEPTANCE_UPDATE_ONLY';END IF;
 -- Subsequent authorized reservation is a separate phase, not a second
 -- owner-goal acceptance. Preserve the existing signed Universe event.
 IF OLD.state<>'AWAITING_EXACT_OWNER_APPROVAL' OR
   NEW.state<>'APPROVED_ONCE' THEN RETURN NEW; END IF;
 IF current_user<>'service_role' OR
  NEW.owner_approval_request_id IS NULL OR
  NEW.owner_approval_receipt_sha256 !~ '^sha256:[a-f0-9]{64}
 SELECT * INTO p FROM reality_internal.final_loop_pr_source_plans_v1
 WHERE plan_id=NEW.plan_id AND shift_id=NEW.shift_id
  AND owner_id=NEW.owner_id
  AND parent_original_work_id=NEW.parent_original_work_id
  AND source_manifest_sha256=NEW.source_manifest_sha256
  AND source_ref=NEW.source_ref;
 SELECT * INTO s FROM reality_internal.governed_employee_shifts_v1
 WHERE shift_id=NEW.shift_id AND owner_id=NEW.owner_id
  AND authorized_at IS NOT NULL AND closed_at IS NULL
  AND planned_end_at='infinity'::timestamptz;
 SELECT * INTO w FROM reality_internal.governed_employee_completion_warrants_v1
 WHERE shift_id=NEW.shift_id AND owner_id=NEW.owner_id
  AND plan_fingerprint=s.plan_fingerprint AND state='ACTIVE';
 SELECT * INTO r FROM reality_internal.riley_pr_review_originals_v1
 WHERE original_work_id=NEW.parent_original_work_id
  AND shift_id=NEW.shift_id AND owner_id=NEW.owner_id
  AND source_ref=NEW.source_ref AND phase='BLOCKED'
  AND provider_comment_id IS NULL AND settlement_receipt_id IS NULL;
 IF p.plan_id IS NULL OR s.shift_id IS NULL OR w.shift_id IS NULL OR
  r.original_work_id IS NULL OR
  NEW.acceptance_contract_sha256 IS DISTINCT FROM
   reality_internal.final_loop_pr_review_acceptance_digest_v1(NEW.plan_id) OR
  NOT EXISTS(SELECT 1 FROM reality_internal.governed_employee_shift_steps_v1 step
   WHERE step.shift_id=NEW.shift_id
    AND step.source_ref=NEW.source_ref
    AND step.proof_sha256=p.source_proof_sha256
    AND step.state='SOURCE_CHECKED') OR
  EXISTS(SELECT 1 FROM public.universe_events e
   WHERE e.continuity_root_id=NEW.shift_id AND e.worldline_id=NEW.plan_id)
 THEN RAISE EXCEPTION 'FINAL_LOOP_GOAL_ACCEPTANCE_SOURCE_OR_LINEAGE_INVALID';END IF;
 v_now:=pg_catalog.clock_timestamp();
 v_iso:=pg_catalog.to_char(v_now AT TIME ZONE 'UTC',
  'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
 v_event:=pg_catalog.gen_random_uuid();
 v_payload:=pg_catalog.jsonb_build_object(
  'schema','reality-final-loop-owner-accepted-pr-goal-v1',
  'owner_id',NEW.owner_id,'shift_id',NEW.shift_id,
  'original_work_id',NEW.parent_original_work_id,
  'source_ref',NEW.source_ref,
  'source_head_sha',p.source_head_sha,
  'source_manifest_sha256',p.source_manifest_sha256,
  'acceptance_contract_sha256',NEW.acceptance_contract_sha256,
  'owner_approval_request_id',NEW.owner_approval_request_id,
  'owner_approval_receipt_sha256',NEW.owner_approval_receipt_sha256,
  'goal_accepted',true,'original_job_completed',false,
  'external_effect_performed',false,'production_changed',false);
 v_refs:=pg_catalog.jsonb_build_array(
  NEW.source_ref,'supabase:final_loop_child_approval_packets_v1:'||
   NEW.packet_id::text);
 v_provenance:=pg_catalog.jsonb_build_object(
  'source','SIGNED_SHIFT_FROZEN_SOURCE_AND_OWNER_CHAT_APPROVAL',
  'principal_id',NEW.owner_id::text,
  'plan_fingerprint',s.plan_fingerprint,
  'source_proof_sha256',p.source_proof_sha256,
  'owner_approval_request_id',NEW.owner_approval_request_id,
  'continuity_spine',pg_catalog.jsonb_build_object(
   'version','reality-continuity-spine-v2.1',
   'source_event_id',null,'prior_lineage_hash',null,
   'transformation_receipt_id',null));
 v_ch:=pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
  public.reality_continuity_canonical_json_v1(v_payload),'UTF8'),'sha256'),'hex');
 v_basis:=pg_catalog.jsonb_build_object(
  'spine_version','reality-continuity-spine-v2.1',
  'continuity_root_id',NEW.shift_id::text,
  'worldline_id',NEW.plan_id::text,
  'parent_event_id',null,'prior_lineage_hash',null,
  'stage','WORK','entity_id',NEW.plan_id::text,
  'evidence_refs',v_refs,'transformation_receipt_id',null,
  'effective_time',v_iso,'assertion_time',v_iso,
  'epistemic_status','VERIFIED','payload',v_payload,
  'provenance',v_provenance);
 v_lh:=pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
  public.reality_continuity_canonical_json_v1(v_basis),'UTF8'),'sha256'),'hex');
 INSERT INTO public.universe_events(
  event_id,event_kind,entity_type,entity_id,continuity_root_id,
  worldline_id,parent_event_id,effective_time,assertion_time,
  epistemic_status,payload,evidence_refs,provenance,
  content_hash,lineage_hash)
 VALUES(v_event,'WORK','reality_final_loop_owner_accepted_goal_v1',
  NEW.plan_id,NEW.shift_id,NEW.plan_id,NULL,v_now,v_now,
  'VERIFIED',v_payload,v_refs,v_provenance,v_ch,v_lh);
 RETURN NEW;
END $goal$;
DROP TRIGGER IF EXISTS reality_final_loop_owner_goal_accepted_v1
 ON reality_internal.final_loop_child_approval_packets_v1;
CREATE TRIGGER reality_final_loop_owner_goal_accepted_v1
 AFTER UPDATE OF state ON reality_internal.final_loop_child_approval_packets_v1
 FOR EACH ROW WHEN (OLD.state IS DISTINCT FROM NEW.state)
 EXECUTE FUNCTION
 reality_internal.reality_final_loop_record_owner_goal_acceptance_v1();
REVOKE ALL ON FUNCTION
 reality_internal.reality_final_loop_record_owner_goal_acceptance_v1()
 FROM PUBLIC,anon,authenticated;

-- Full integrated readback plus existing signed original and Universe
-- owner-goal receipt create ONE deterministic parent deliverable candidate.
CREATE OR REPLACE FUNCTION public.reality_prepare_final_loop_parent_delivery_v1(
 p_plan_id uuid,p_worker_run_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE p record;a record;r record;s record;
 v_recovery jsonb;v_goal uuid;v_reviews text;v_batches text;
 v_review text;v_body text;v_body_hash text;v_fp text;
 v_id uuid;v_delivery record;v_count integer;
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'FINAL_LOOP_PARENT_DELIVERY_SERVICE_ONLY';END IF;
 IF p_plan_id IS NULL OR p_worker_run_id IS NULL OR NOT EXISTS(
  SELECT 1 FROM reality_internal.signed_worker_actual_runs_v1 w
  WHERE w.run_id=p_worker_run_id AND w.status='STARTED'
   AND w.finished_at IS NULL
   AND w.started_at>=pg_catalog.clock_timestamp()-interval '10 minutes')
 THEN RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_PARENT_DELIVERY_SIGNED_WORKER_REQUIRED',
  'publication_authorized',false,'original_job_completed',false);END IF;
 SELECT * INTO p FROM reality_internal.final_loop_pr_source_plans_v1
 WHERE plan_id=p_plan_id AND parent_original_work_id IS NOT NULL;
 SELECT * INTO a FROM reality_internal.final_loop_child_approval_packets_v1
 WHERE plan_id=p_plan_id AND shift_id=p.shift_id AND owner_id=p.owner_id
  AND state='EFFECT_RESERVED_RECONCILE_ONLY'
  AND owner_approval_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$';
 SELECT * INTO r FROM reality_internal.riley_pr_review_originals_v1
 WHERE original_work_id=p.parent_original_work_id
  AND owner_id=p.owner_id AND shift_id=p.shift_id
  AND source_ref=p.source_ref AND source_proof_sha256=p.source_proof_sha256
  AND phase='BLOCKED' AND model_response_id IS NULL
  AND review_body IS NULL AND provider_comment_id IS NULL
  AND settlement_receipt_id IS NULL;
 SELECT e.event_id INTO v_goal FROM public.universe_events e
 WHERE e.continuity_root_id=p.shift_id AND e.worldline_id=p.plan_id
  AND e.parent_event_id IS NULL
  AND e.event_kind='WORK'
  AND e.entity_type='reality_final_loop_owner_accepted_goal_v1'
  AND e.epistemic_status='VERIFIED'
  AND e.payload->>'original_work_id'=p.parent_original_work_id
  AND e.payload->>'owner_id'=p.owner_id::text
  AND e.payload->>'acceptance_contract_sha256'=a.acceptance_contract_sha256
  AND e.payload->>'owner_approval_receipt_sha256'=
   a.owner_approval_receipt_sha256
  AND e.payload->>'goal_accepted'='true'
  AND e.payload->>'original_job_completed'='false';
 IF p.plan_id IS NULL OR a.packet_id IS NULL OR r.original_work_id IS NULL
  OR v_goal IS NULL OR a.acceptance_contract_sha256 IS DISTINCT FROM
   reality_internal.final_loop_pr_review_acceptance_digest_v1(p.plan_id)
 THEN RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_PARENT_GOAL_OR_OWNER_AUTHORITY_NOT_VERIFIED',
  'publication_authorized',false,'original_job_completed',false);END IF;
 v_recovery:=public.reality_read_final_loop_child_recovery_v1(p.shift_id,p.plan_id);
 IF v_recovery->>'status'<>
   'FINAL_LOOP_CANONICAL_CHILD_RECOVERY_PROOF_NOT_PARENT_SETTLEMENT'
  OR v_recovery->>'independent_service_readback_verified'<>'true'
  OR v_recovery->'cross_scope'->>'independently_verified'<>'true'
  OR v_recovery->'capacity'->>'independently_attested'<>'true'
  OR coalesce(v_recovery->>'provider_effect_uncertain','true')<>'false'
  OR v_recovery->>'acceptance_contract_sha256'<>a.acceptance_contract_sha256
  OR (SELECT count(*) FROM reality_internal.final_loop_child_review_work_v1 c
   WHERE c.plan_id=p.plan_id AND c.packet_id=a.packet_id
    AND c.phase='INDEPENDENTLY_VERIFIED'
    AND c.independent_review_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'
    AND c.claimant_worker_run_id<>c.independent_verifier_run_id
   )<>p.proposed_scope_count
 THEN RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_PARENT_ALL_INDEPENDENT_PROOFS_REQUIRED',
  'publication_authorized',false,'original_job_completed',false);END IF;
 SELECT string_agg(
   '### Scope '||(c.scope_index+1)::text||' / '||
    p.proposed_scope_count::text||E'\nFiles: '||
   (SELECT string_agg(f.value->>'path',', ' ORDER BY f.ordinality)
    FROM pg_catalog.jsonb_array_elements(
     p.source_plan->'bounded_scopes'->c.scope_index->'files')
     WITH ORDINALITY f(value,ordinality))||
   E'\nIndependent receipt: '||c.independent_review_receipt_sha256||
   E'\nReview:\n'||pg_catalog.left(c.review_body,780),
   E'\n\n' ORDER BY c.scope_index) INTO v_reviews
 FROM reality_internal.final_loop_child_review_work_v1 c
 WHERE c.plan_id=p.plan_id AND c.packet_id=a.packet_id
  AND c.phase='INDEPENDENTLY_VERIFIED';
 SELECT string_agg(
  'Batch '||(i.batch_index+1)::text||': '||
   i.cross_scope_receipt_sha256,E'\n' ORDER BY i.batch_index)
 INTO v_batches FROM reality_internal.final_loop_parent_integration_batches_v1 i
 WHERE i.plan_id=p.plan_id AND i.packet_id=a.packet_id AND i.phase='VERIFIED';
 v_review:='Reality · independently reviewed PR work'||E'\nOriginal: '||
   p.parent_original_work_id||E'\nSource: '||p.source_ref||
   E'\nPinned head: '||p.source_head_sha||
   E'\nFull manifest: '||p.source_manifest_sha256||
   E'\nOwner-accepted goal: '||a.acceptance_contract_sha256||
   E'\n\nThis review is source-bound, not a code installation. No tests or source changes are claimed beyond independently recorded evidence.'||
   E'\n\n## Independently verified bounded reviews\n'||
   v_reviews||E'\n\n## Cross-scope integration receipts\n'||
   v_batches||E'\n\nFinal publication requires a separate exact owner approval.';
 IF pg_catalog.length(v_review) NOT BETWEEN 500 AND 58000 THEN
  RETURN pg_catalog.jsonb_build_object(
   'status','FINAL_LOOP_PARENT_REVIEW_EXCEEDS_SAFE_DELIVERY_BOUNDS',
   'publication_authorized',false,'original_job_completed',false);END IF;
 v_fp:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to(v_review,'UTF8')),'hex');
 v_body:='<!-- REALITY-FINAL-LOOP-PARENT:'||p.parent_original_work_id||
  ':'||v_fp||' -->'||E'\n'||v_review;
 v_body_hash:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to(v_body,'UTF8')),'hex');
 IF pg_catalog.octet_length(v_body)>62000 THEN
  RETURN pg_catalog.jsonb_build_object(
   'status','FINAL_LOOP_PARENT_COMMENT_BYTE_LIMIT_EXCEEDED',
   'publication_authorized',false,'original_job_completed',false);END IF;
 INSERT INTO reality_internal.final_loop_parent_deliveries_v1
 (plan_id,packet_id,owner_id,shift_id,parent_original_work_id,
  source_ref,source_head_sha,source_manifest_sha256,
  acceptance_contract_sha256,cross_scope_receipt_sha256,
  delivery_body,delivery_body_sha256,proposal_fingerprint,universe_goal_event_id)
 VALUES(p.plan_id,a.packet_id,p.owner_id,p.shift_id,p.parent_original_work_id,
  p.source_ref,p.source_head_sha,p.source_manifest_sha256,
  a.acceptance_contract_sha256,
  v_recovery->'cross_scope'->>'receipt_sha256',
  v_body,v_body_hash,v_fp,v_goal)
 ON CONFLICT(plan_id) DO NOTHING RETURNING delivery_id INTO v_id;
 SELECT * INTO v_delivery FROM reality_internal.final_loop_parent_deliveries_v1
 WHERE plan_id=p.plan_id;
 IF NOT FOUND OR v_delivery.delivery_body_sha256<>v_body_hash OR
   v_delivery.cross_scope_receipt_sha256<>
   v_recovery->'cross_scope'->>'receipt_sha256' OR
   v_delivery.universe_goal_event_id<>v_goal
 THEN RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_PARENT_DELIVERY_FINGERPRINT_CONFLICT_NO_REPLAY',
  'publication_authorized',false,'original_job_completed',false);END IF;
 RETURN pg_catalog.jsonb_build_object(
  'status',CASE WHEN v_delivery.status='AWAITING_EXACT_PUBLICATION_APPROVAL'
    THEN 'FINAL_LOOP_PARENT_DELIVERY_EXACT_OWNER_PUBLICATION_REQUIRED'
    ELSE 'FINAL_LOOP_PARENT_DELIVERY_ALREADY_APPROVED_OR_RESERVED' END,
  'delivery_id',v_delivery.delivery_id,
  'owner_id',v_delivery.owner_id,'shift_id',v_delivery.shift_id,
  'parent_original_work_id',v_delivery.parent_original_work_id,
  'source_ref',v_delivery.source_ref,
  'source_head_sha',v_delivery.source_head_sha,
  'source_manifest_sha256',v_delivery.source_manifest_sha256,
  'acceptance_contract_sha256',v_delivery.acceptance_contract_sha256,
  'review_body_sha256',v_delivery.delivery_body_sha256,
  'proposal_fingerprint',v_delivery.proposal_fingerprint,
  'universe_goal_event_id',v_goal,
  'owner_publication_approved',v_delivery.status<>'AWAITING_EXACT_PUBLICATION_APPROVAL',
  'publication_authorized',false,'original_job_completed',false,
  'production_changed',false);
END $fn$;

 THEN RAISE EXCEPTION 'FINAL_LOOP_GOAL_ACCEPTANCE_EXACT_OWNER_TRANSITION_REQUIRED';END IF;
 SELECT * INTO p FROM reality_internal.final_loop_pr_source_plans_v1
 WHERE plan_id=NEW.plan_id AND shift_id=NEW.shift_id
  AND owner_id=NEW.owner_id
  AND parent_original_work_id=NEW.parent_original_work_id
  AND source_manifest_sha256=NEW.source_manifest_sha256
  AND source_ref=NEW.source_ref;
 SELECT * INTO s FROM reality_internal.governed_employee_shifts_v1
 WHERE shift_id=NEW.shift_id AND owner_id=NEW.owner_id
  AND authorized_at IS NOT NULL AND closed_at IS NULL
  AND planned_end_at='infinity'::timestamptz;
 SELECT * INTO w FROM reality_internal.governed_employee_completion_warrants_v1
 WHERE shift_id=NEW.shift_id AND owner_id=NEW.owner_id
  AND plan_fingerprint=s.plan_fingerprint AND state='ACTIVE';
 SELECT * INTO r FROM reality_internal.riley_pr_review_originals_v1
 WHERE original_work_id=NEW.parent_original_work_id
  AND shift_id=NEW.shift_id AND owner_id=NEW.owner_id
  AND source_ref=NEW.source_ref AND phase='BLOCKED'
  AND provider_comment_id IS NULL AND settlement_receipt_id IS NULL;
 IF p.plan_id IS NULL OR s.shift_id IS NULL OR w.shift_id IS NULL OR
  r.original_work_id IS NULL OR
  NEW.acceptance_contract_sha256 IS DISTINCT FROM
   reality_internal.final_loop_pr_review_acceptance_digest_v1(NEW.plan_id) OR
  NOT EXISTS(SELECT 1 FROM reality_internal.governed_employee_shift_steps_v1 step
   WHERE step.shift_id=NEW.shift_id
    AND step.source_ref=NEW.source_ref
    AND step.proof_sha256=p.source_proof_sha256
    AND step.state='SOURCE_CHECKED') OR
  EXISTS(SELECT 1 FROM public.universe_events e
   WHERE e.continuity_root_id=NEW.shift_id AND e.worldline_id=NEW.plan_id)
 THEN RAISE EXCEPTION 'FINAL_LOOP_GOAL_ACCEPTANCE_SOURCE_OR_LINEAGE_INVALID';END IF;
 v_now:=pg_catalog.clock_timestamp();
 v_iso:=pg_catalog.to_char(v_now AT TIME ZONE 'UTC',
  'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
 v_event:=pg_catalog.gen_random_uuid();
 v_payload:=pg_catalog.jsonb_build_object(
  'schema','reality-final-loop-owner-accepted-pr-goal-v1',
  'owner_id',NEW.owner_id,'shift_id',NEW.shift_id,
  'original_work_id',NEW.parent_original_work_id,
  'source_ref',NEW.source_ref,
  'source_head_sha',p.source_head_sha,
  'source_manifest_sha256',p.source_manifest_sha256,
  'acceptance_contract_sha256',NEW.acceptance_contract_sha256,
  'owner_approval_request_id',NEW.owner_approval_request_id,
  'owner_approval_receipt_sha256',NEW.owner_approval_receipt_sha256,
  'goal_accepted',true,'original_job_completed',false,
  'external_effect_performed',false,'production_changed',false);
 v_refs:=pg_catalog.jsonb_build_array(
  NEW.source_ref,'supabase:final_loop_child_approval_packets_v1:'||
   NEW.packet_id::text);
 v_provenance:=pg_catalog.jsonb_build_object(
  'source','SIGNED_SHIFT_FROZEN_SOURCE_AND_OWNER_CHAT_APPROVAL',
  'principal_id',NEW.owner_id::text,
  'plan_fingerprint',s.plan_fingerprint,
  'source_proof_sha256',p.source_proof_sha256,
  'owner_approval_request_id',NEW.owner_approval_request_id,
  'continuity_spine',pg_catalog.jsonb_build_object(
   'version','reality-continuity-spine-v2.1',
   'source_event_id',null,'prior_lineage_hash',null,
   'transformation_receipt_id',null));
 v_ch:=pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
  public.reality_continuity_canonical_json_v1(v_payload),'UTF8'),'sha256'),'hex');
 v_basis:=pg_catalog.jsonb_build_object(
  'spine_version','reality-continuity-spine-v2.1',
  'continuity_root_id',NEW.shift_id::text,
  'worldline_id',NEW.plan_id::text,
  'parent_event_id',null,'prior_lineage_hash',null,
  'stage','WORK','entity_id',NEW.plan_id::text,
  'evidence_refs',v_refs,'transformation_receipt_id',null,
  'effective_time',v_iso,'assertion_time',v_iso,
  'epistemic_status','VERIFIED','payload',v_payload,
  'provenance',v_provenance);
 v_lh:=pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
  public.reality_continuity_canonical_json_v1(v_basis),'UTF8'),'sha256'),'hex');
 INSERT INTO public.universe_events(
  event_id,event_kind,entity_type,entity_id,continuity_root_id,
  worldline_id,parent_event_id,effective_time,assertion_time,
  epistemic_status,payload,evidence_refs,provenance,
  content_hash,lineage_hash)
 VALUES(v_event,'WORK','reality_final_loop_owner_accepted_goal_v1',
  NEW.plan_id,NEW.shift_id,NEW.plan_id,NULL,v_now,v_now,
  'VERIFIED',v_payload,v_refs,v_provenance,v_ch,v_lh);
 RETURN NEW;
END $goal$;
DROP TRIGGER IF EXISTS reality_final_loop_owner_goal_accepted_v1
 ON reality_internal.final_loop_child_approval_packets_v1;
CREATE TRIGGER reality_final_loop_owner_goal_accepted_v1
 AFTER UPDATE OF state ON reality_internal.final_loop_child_approval_packets_v1
 FOR EACH ROW WHEN (OLD.state IS DISTINCT FROM NEW.state)
 EXECUTE FUNCTION
 reality_internal.reality_final_loop_record_owner_goal_acceptance_v1();
REVOKE ALL ON FUNCTION
 reality_internal.reality_final_loop_record_owner_goal_acceptance_v1()
 FROM PUBLIC,anon,authenticated;

-- Full integrated readback plus existing signed original and Universe
-- owner-goal receipt create ONE deterministic parent deliverable candidate.
CREATE OR REPLACE FUNCTION public.reality_prepare_final_loop_parent_delivery_v1(
 p_plan_id uuid,p_worker_run_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE p record;a record;r record;s record;
 v_recovery jsonb;v_goal uuid;v_reviews text;v_batches text;
 v_review text;v_body text;v_body_hash text;v_fp text;
 v_id uuid;v_delivery record;v_count integer;
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'FINAL_LOOP_PARENT_DELIVERY_SERVICE_ONLY';END IF;
 IF p_plan_id IS NULL OR p_worker_run_id IS NULL OR NOT EXISTS(
  SELECT 1 FROM reality_internal.signed_worker_actual_runs_v1 w
  WHERE w.run_id=p_worker_run_id AND w.status='STARTED'
   AND w.finished_at IS NULL
   AND w.started_at>=pg_catalog.clock_timestamp()-interval '10 minutes')
 THEN RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_PARENT_DELIVERY_SIGNED_WORKER_REQUIRED',
  'publication_authorized',false,'original_job_completed',false);END IF;
 SELECT * INTO p FROM reality_internal.final_loop_pr_source_plans_v1
 WHERE plan_id=p_plan_id AND parent_original_work_id IS NOT NULL;
 SELECT * INTO a FROM reality_internal.final_loop_child_approval_packets_v1
 WHERE plan_id=p_plan_id AND shift_id=p.shift_id AND owner_id=p.owner_id
  AND state='EFFECT_RESERVED_RECONCILE_ONLY'
  AND owner_approval_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$';
 SELECT * INTO r FROM reality_internal.riley_pr_review_originals_v1
 WHERE original_work_id=p.parent_original_work_id
  AND owner_id=p.owner_id AND shift_id=p.shift_id
  AND source_ref=p.source_ref AND source_proof_sha256=p.source_proof_sha256
  AND phase='BLOCKED' AND model_response_id IS NULL
  AND review_body IS NULL AND provider_comment_id IS NULL
  AND settlement_receipt_id IS NULL;
 SELECT e.event_id INTO v_goal FROM public.universe_events e
 WHERE e.continuity_root_id=p.shift_id AND e.worldline_id=p.plan_id
  AND e.parent_event_id IS NULL
  AND e.event_kind='WORK'
  AND e.entity_type='reality_final_loop_owner_accepted_goal_v1'
  AND e.epistemic_status='VERIFIED'
  AND e.payload->>'original_work_id'=p.parent_original_work_id
  AND e.payload->>'owner_id'=p.owner_id::text
  AND e.payload->>'acceptance_contract_sha256'=a.acceptance_contract_sha256
  AND e.payload->>'owner_approval_receipt_sha256'=
   a.owner_approval_receipt_sha256
  AND e.payload->>'goal_accepted'='true'
  AND e.payload->>'original_job_completed'='false';
 IF p.plan_id IS NULL OR a.packet_id IS NULL OR r.original_work_id IS NULL
  OR v_goal IS NULL OR a.acceptance_contract_sha256 IS DISTINCT FROM
   reality_internal.final_loop_pr_review_acceptance_digest_v1(p.plan_id)
 THEN RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_PARENT_GOAL_OR_OWNER_AUTHORITY_NOT_VERIFIED',
  'publication_authorized',false,'original_job_completed',false);END IF;
 v_recovery:=public.reality_read_final_loop_child_recovery_v1(p.shift_id,p.plan_id);
 IF v_recovery->>'status'<>
   'FINAL_LOOP_CANONICAL_CHILD_RECOVERY_PROOF_NOT_PARENT_SETTLEMENT'
  OR v_recovery->>'independent_service_readback_verified'<>'true'
  OR v_recovery->'cross_scope'->>'independently_verified'<>'true'
  OR v_recovery->'capacity'->>'independently_attested'<>'true'
  OR coalesce(v_recovery->>'provider_effect_uncertain','true')<>'false'
  OR v_recovery->>'acceptance_contract_sha256'<>a.acceptance_contract_sha256
  OR (SELECT count(*) FROM reality_internal.final_loop_child_review_work_v1 c
   WHERE c.plan_id=p.plan_id AND c.packet_id=a.packet_id
    AND c.phase='INDEPENDENTLY_VERIFIED'
    AND c.independent_review_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'
    AND c.claimant_worker_run_id<>c.independent_verifier_run_id
   )<>p.proposed_scope_count
 THEN RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_PARENT_ALL_INDEPENDENT_PROOFS_REQUIRED',
  'publication_authorized',false,'original_job_completed',false);END IF;
 SELECT string_agg(
   '### Scope '||(c.scope_index+1)::text||' / '||
    p.proposed_scope_count::text||E'\nFiles: '||
   (SELECT string_agg(f.value->>'path',', ' ORDER BY f.ordinality)
    FROM pg_catalog.jsonb_array_elements(
     p.source_plan->'bounded_scopes'->c.scope_index->'files')
     WITH ORDINALITY f(value,ordinality))||
   E'\nIndependent receipt: '||c.independent_review_receipt_sha256||
   E'\nReview:\n'||pg_catalog.left(c.review_body,780),
   E'\n\n' ORDER BY c.scope_index) INTO v_reviews
 FROM reality_internal.final_loop_child_review_work_v1 c
 WHERE c.plan_id=p.plan_id AND c.packet_id=a.packet_id
  AND c.phase='INDEPENDENTLY_VERIFIED';
 SELECT string_agg(
  'Batch '||(i.batch_index+1)::text||': '||
   i.cross_scope_receipt_sha256,E'\n' ORDER BY i.batch_index)
 INTO v_batches FROM reality_internal.final_loop_parent_integration_batches_v1 i
 WHERE i.plan_id=p.plan_id AND i.packet_id=a.packet_id AND i.phase='VERIFIED';
 v_review:='Reality · independently reviewed PR work'||E'\nOriginal: '||
   p.parent_original_work_id||E'\nSource: '||p.source_ref||
   E'\nPinned head: '||p.source_head_sha||
   E'\nFull manifest: '||p.source_manifest_sha256||
   E'\nOwner-accepted goal: '||a.acceptance_contract_sha256||
   E'\n\nThis review is source-bound, not a code installation. No tests or source changes are claimed beyond independently recorded evidence.'||
   E'\n\n## Independently verified bounded reviews\n'||
   v_reviews||E'\n\n## Cross-scope integration receipts\n'||
   v_batches||E'\n\nFinal publication requires a separate exact owner approval.';
 IF pg_catalog.length(v_review) NOT BETWEEN 500 AND 58000 THEN
  RETURN pg_catalog.jsonb_build_object(
   'status','FINAL_LOOP_PARENT_REVIEW_EXCEEDS_SAFE_DELIVERY_BOUNDS',
   'publication_authorized',false,'original_job_completed',false);END IF;
 v_fp:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to(v_review,'UTF8')),'hex');
 v_body:='<!-- REALITY-FINAL-LOOP-PARENT:'||p.parent_original_work_id||
  ':'||v_fp||' -->'||E'\n'||v_review;
 v_body_hash:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to(v_body,'UTF8')),'hex');
 IF pg_catalog.octet_length(v_body)>62000 THEN
  RETURN pg_catalog.jsonb_build_object(
   'status','FINAL_LOOP_PARENT_COMMENT_BYTE_LIMIT_EXCEEDED',
   'publication_authorized',false,'original_job_completed',false);END IF;
 INSERT INTO reality_internal.final_loop_parent_deliveries_v1
 (plan_id,packet_id,owner_id,shift_id,parent_original_work_id,
  source_ref,source_head_sha,source_manifest_sha256,
  acceptance_contract_sha256,cross_scope_receipt_sha256,
  delivery_body,delivery_body_sha256,proposal_fingerprint,universe_goal_event_id)
 VALUES(p.plan_id,a.packet_id,p.owner_id,p.shift_id,p.parent_original_work_id,
  p.source_ref,p.source_head_sha,p.source_manifest_sha256,
  a.acceptance_contract_sha256,
  v_recovery->'cross_scope'->>'receipt_sha256',
  v_body,v_body_hash,v_fp,v_goal)
 ON CONFLICT(plan_id) DO NOTHING RETURNING delivery_id INTO v_id;
 SELECT * INTO v_delivery FROM reality_internal.final_loop_parent_deliveries_v1
 WHERE plan_id=p.plan_id;
 IF NOT FOUND OR v_delivery.delivery_body_sha256<>v_body_hash OR
   v_delivery.cross_scope_receipt_sha256<>
   v_recovery->'cross_scope'->>'receipt_sha256' OR
   v_delivery.universe_goal_event_id<>v_goal
 THEN RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_PARENT_DELIVERY_FINGERPRINT_CONFLICT_NO_REPLAY',
  'publication_authorized',false,'original_job_completed',false);END IF;
 RETURN pg_catalog.jsonb_build_object(
  'status',CASE WHEN v_delivery.status='AWAITING_EXACT_PUBLICATION_APPROVAL'
    THEN 'FINAL_LOOP_PARENT_DELIVERY_EXACT_OWNER_PUBLICATION_REQUIRED'
    ELSE 'FINAL_LOOP_PARENT_DELIVERY_ALREADY_APPROVED_OR_RESERVED' END,
  'delivery_id',v_delivery.delivery_id,
  'owner_id',v_delivery.owner_id,'shift_id',v_delivery.shift_id,
  'parent_original_work_id',v_delivery.parent_original_work_id,
  'source_ref',v_delivery.source_ref,
  'source_head_sha',v_delivery.source_head_sha,
  'source_manifest_sha256',v_delivery.source_manifest_sha256,
  'acceptance_contract_sha256',v_delivery.acceptance_contract_sha256,
  'review_body_sha256',v_delivery.delivery_body_sha256,
  'proposal_fingerprint',v_delivery.proposal_fingerprint,
  'universe_goal_event_id',v_goal,
  'owner_publication_approved',v_delivery.status<>'AWAITING_EXACT_PUBLICATION_APPROVAL',
  'publication_authorized',false,'original_job_completed',false,
  'production_changed',false);
END $fn$;
