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
 -- The accepted goal is recorded only once, never again on child claims.
 IF OLD.state<>'AWAITING_EXACT_OWNER_APPROVAL' OR
    NEW.state<>'APPROVED_ONCE' THEN RETURN NEW; END IF;
 IF current_user<>'service_role' OR
  NEW.owner_approval_request_id IS NULL OR
  NEW.owner_approval_receipt_sha256 !~ '^sha256:[a-f0-9]{64}$'
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


-- Authenticated owner Chat reads the same underlying durable parent packet.
CREATE OR REPLACE FUNCTION public.reality_read_owner_final_loop_parent_deliveries_v1(
 p_owner_id uuid,p_shift_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE v_packets jsonb;
BEGIN
 IF current_user<>'service_role' OR p_owner_id IS NULL OR
  p_shift_id IS NULL THEN
  RAISE EXCEPTION 'FINAL_LOOP_PARENT_OWNER_SCOPE_SERVICE_ONLY';END IF;
 SELECT coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'delivery_id',d.delivery_id,
  'parent_original_work_id',d.parent_original_work_id,
  'source_ref',d.source_ref,'source_head_sha',d.source_head_sha,
  'source_manifest_sha256',d.source_manifest_sha256,
  'acceptance_contract_sha256',d.acceptance_contract_sha256,
  'delivery_body_sha256',d.delivery_body_sha256,
  'proposal_fingerprint',d.proposal_fingerprint,
  'delivery_preview',pg_catalog.left(d.delivery_body,1500),
  'cross_scope_receipt_sha256',d.cross_scope_receipt_sha256,
  'status',d.status,
  'publication_approved',d.status<>'AWAITING_EXACT_PUBLICATION_APPROVAL',
  'original_job_completed',d.status='SETTLED'
 ) ORDER BY d.prepared_at),'[]'::jsonb) INTO v_packets
 FROM reality_internal.final_loop_parent_deliveries_v1 d
 JOIN reality_internal.governed_employee_shifts_v1 s
  ON s.shift_id=d.shift_id AND s.owner_id=d.owner_id
 WHERE d.owner_id=p_owner_id AND d.shift_id=p_shift_id
  AND s.authorized_at IS NOT NULL;
 RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_OWNER_PARENT_DELIVERY_PACKET_READ_ONLY',
  'owner_id',p_owner_id,'shift_id',p_shift_id,
  'deliveries',v_packets,'read_only',true,'publication_authorized',false);
END $fn$;

-- A SECOND exact owner action is needed for this external GitHub effect.
-- The first approval only allowed read-only internal work and goal acceptance.
CREATE OR REPLACE FUNCTION public.reality_owner_approve_final_loop_parent_delivery_v1(
 p_owner_id uuid,p_delivery_id uuid,p_fingerprint text,
 p_review_body_sha256 text,p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE d record;p record;a record;r record;v_receipt text;v_recovery jsonb;
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'FINAL_LOOP_PARENT_PUBLISH_OWNER_SERVICE_ONLY';END IF;
 IF p_owner_id IS NULL OR p_delivery_id IS NULL OR p_request_id IS NULL OR
  coalesce(p_fingerprint,'') !~ '^sha256:[a-f0-9]{64}$' OR
  coalesce(p_review_body_sha256,'') !~ '^sha256:[a-f0-9]{64}$'
 THEN RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_PARENT_PUBLISH_APPROVAL_INVALID_INPUT',
  'publication_approved',false,'original_job_completed',false);END IF;
 SELECT * INTO d FROM reality_internal.final_loop_parent_deliveries_v1
 WHERE delivery_id=p_delivery_id FOR UPDATE;
 SELECT * INTO p FROM reality_internal.final_loop_pr_source_plans_v1
 WHERE plan_id=d.plan_id;
 SELECT * INTO a FROM reality_internal.final_loop_child_approval_packets_v1
 WHERE packet_id=d.packet_id;
 SELECT * INTO r FROM reality_internal.riley_pr_review_originals_v1
 WHERE original_work_id=d.parent_original_work_id
  AND owner_id=d.owner_id AND shift_id=d.shift_id
  AND source_ref=d.source_ref AND phase='BLOCKED'
  AND review_body IS NULL AND provider_comment_id IS NULL
  AND settlement_receipt_id IS NULL;
 IF d.delivery_id IS NULL OR d.owner_id<>p_owner_id OR
  d.status<>'AWAITING_EXACT_PUBLICATION_APPROVAL' OR
  d.proposal_fingerprint<>p_fingerprint OR
  d.delivery_body_sha256<>p_review_body_sha256 OR
  d.owner_publication_receipt_sha256 IS NOT NULL OR
  a.state<>'EFFECT_RESERVED_RECONCILE_ONLY' OR
  a.owner_approval_receipt_sha256 IS NULL OR
  r.original_work_id IS NULL OR
  p.source_head_sha<>d.source_head_sha OR
  p.source_manifest_sha256<>d.source_manifest_sha256 OR
  p.parent_original_work_id<>d.parent_original_work_id OR
  a.acceptance_contract_sha256 IS DISTINCT FROM
   reality_internal.final_loop_pr_review_acceptance_digest_v1(p.plan_id) OR
  NOT EXISTS(SELECT 1 FROM public.universe_events e
   WHERE e.event_id=d.universe_goal_event_id
    AND e.continuity_root_id=d.shift_id AND e.worldline_id=d.plan_id
    AND e.event_kind='WORK' AND e.epistemic_status='VERIFIED'
    AND e.payload->>'original_work_id'=d.parent_original_work_id
    AND e.payload->>'goal_accepted'='true')
 THEN RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_PARENT_PUBLISH_APPROVAL_SCOPE_STALE',
  'publication_approved',false,'original_job_completed',false);END IF;
 v_recovery:=public.reality_read_final_loop_child_recovery_v1(d.shift_id,d.plan_id);
 IF v_recovery->'cross_scope'->>'receipt_sha256'<>
   d.cross_scope_receipt_sha256 OR
   v_recovery->'cross_scope'->>'independently_verified'<>'true' OR
   v_recovery->>'provider_effect_uncertain'<>'false'
 THEN RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_PARENT_PUBLISH_CHILD_INTEGRATION_DRIFT',
  'publication_approved',false,'original_job_completed',false);END IF;
 v_receipt:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to(pg_catalog.jsonb_build_object(
   'owner_id',p_owner_id,'delivery_id',d.delivery_id,
   'original_work_id',d.parent_original_work_id,
   'source_head_sha',d.source_head_sha,
   'source_manifest_sha256',d.source_manifest_sha256,
   'delivery_body_sha256',d.delivery_body_sha256,
   'cross_scope_receipt_sha256',d.cross_scope_receipt_sha256,
   'request_id',p_request_id,'effect','GITHUB_PR_REVIEW_COMMENT_ONCE')::text,
   'UTF8')),'hex');
 UPDATE reality_internal.final_loop_parent_deliveries_v1
 SET status='APPROVED_ONCE',
  owner_publication_approval_request_id=p_request_id,
  owner_publication_receipt_sha256=v_receipt,
  owner_approved_at=pg_catalog.clock_timestamp()
 WHERE delivery_id=d.delivery_id AND status='AWAITING_EXACT_PUBLICATION_APPROVAL';
 RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_EXACT_PARENT_GITHUB_PUBLICATION_OWNER_APPROVED_ONCE',
  'delivery_id',d.delivery_id,'owner_id',p_owner_id,
  'parent_original_work_id',d.parent_original_work_id,
  'source_ref',d.source_ref,
  'source_head_sha',d.source_head_sha,
  'delivery_body_sha256',d.delivery_body_sha256,
  'publication_approval_receipt_sha256',v_receipt,
  'publication_approved',true,
  'publication_effect_reserved',false,
  'original_job_completed',false,'production_changed',false);
END $fn$;

-- Exactly one durable claim before external POST. From this point on,
-- failed/unknown provider effects are READBACK ONLY; no second POST.
CREATE OR REPLACE FUNCTION public.reality_claim_final_loop_parent_publish_v1(
 p_shift_id uuid,p_worker_run_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE d record;p record;v_rec jsonb;v_claim uuid;
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'FINAL_LOOP_PARENT_PUBLISH_SERVICE_ONLY';END IF;
 IF p_shift_id IS NULL OR p_worker_run_id IS NULL OR NOT EXISTS(
  SELECT 1 FROM reality_internal.signed_worker_actual_runs_v1 r
  WHERE r.run_id=p_worker_run_id AND r.status='STARTED'
   AND r.finished_at IS NULL
   AND r.started_at>=pg_catalog.clock_timestamp()-interval '10 minutes')
 THEN RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_PARENT_PUBLISH_SIGNED_WORKER_REQUIRED',
  'publication_effect_reserved',false,'original_job_completed',false);END IF;
 SELECT * INTO d FROM reality_internal.final_loop_parent_deliveries_v1
 WHERE shift_id=p_shift_id AND status='APPROVED_ONCE'
  AND owner_publication_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'
  AND publication_claim_id IS NULL AND publisher_worker_run_id IS NULL
  AND EXISTS(SELECT 1 FROM reality_internal.governed_employee_shifts_v1 s
   JOIN reality_internal.governed_employee_completion_warrants_v1 w
    ON w.shift_id=s.shift_id AND w.owner_id=s.owner_id
    AND w.plan_fingerprint=s.plan_fingerprint
   WHERE s.shift_id=p_shift_id AND s.owner_id=
    reality_internal.final_loop_parent_deliveries_v1.owner_id
    AND s.closed_at IS NULL AND s.authorized_at IS NOT NULL
    AND s.planned_end_at='infinity'::timestamptz AND w.state='ACTIVE')
 ORDER BY owner_approved_at,delivery_id LIMIT 1 FOR UPDATE SKIP LOCKED;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_NO_EXACT_PARENT_PUBLICATION_APPROVED',
  'publication_effect_reserved',false,'original_job_completed',false);END IF;
 SELECT * INTO p FROM reality_internal.final_loop_pr_source_plans_v1
 WHERE plan_id=d.plan_id AND owner_id=d.owner_id AND shift_id=d.shift_id
  AND parent_original_work_id=d.parent_original_work_id
  AND source_head_sha=d.source_head_sha
  AND source_manifest_sha256=d.source_manifest_sha256;
 v_rec:=public.reality_read_final_loop_child_recovery_v1(d.shift_id,d.plan_id);
 IF p.plan_id IS NULL OR
  v_rec->'cross_scope'->>'receipt_sha256'<>
    d.cross_scope_receipt_sha256 OR
  v_rec->'cross_scope'->>'independently_verified'<>'true' OR
  v_rec->>'provider_effect_uncertain'<>'false' OR
  NOT EXISTS(SELECT 1 FROM reality_internal.riley_pr_review_originals_v1 r
   WHERE r.original_work_id=d.parent_original_work_id
    AND r.shift_id=d.shift_id AND r.owner_id=d.owner_id
    AND r.phase='BLOCKED' AND r.provider_comment_id IS NULL
    AND r.settlement_receipt_id IS NULL)
 THEN RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_PARENT_PUBLICATION_CURRENT_PROOFS_MISSING',
  'publication_effect_reserved',false,'original_job_completed',false);END IF;
 v_claim:=pg_catalog.gen_random_uuid();
 UPDATE reality_internal.final_loop_parent_deliveries_v1
 SET status='POST_RESERVED_RECONCILE_ONLY',
  publication_claim_id=v_claim,
  publisher_worker_run_id=p_worker_run_id,
  publication_reserved_at=pg_catalog.clock_timestamp()
 WHERE delivery_id=d.delivery_id AND status='APPROVED_ONCE';
 RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_PARENT_GITHUB_WRITE_RESERVED_ONCE',
  'delivery_id',d.delivery_id,'claim_id',v_claim,
  'owner_id',d.owner_id,'shift_id',d.shift_id,
  'publisher_worker_run_id',p_worker_run_id,
  'parent_original_work_id',d.parent_original_work_id,
  'source_ref',d.source_ref,'source_head_sha',d.source_head_sha,
  'source_manifest_sha256',d.source_manifest_sha256,
  'delivery_body',d.delivery_body,
  'delivery_body_sha256',d.delivery_body_sha256,
  'approval_receipt_sha256',d.owner_publication_receipt_sha256,
  'publication_effect_reserved',true,'external_effect_performed',false,
  'original_job_completed',false,'production_changed',false);
END $fn$;

-- A DIFFERENT signed worker performs the provider readback; the publisher
-- can never self-verify a GitHub comment or a Universe settlement receipt.
CREATE OR REPLACE FUNCTION public.reality_read_final_loop_parent_publish_verify_v1(
 p_shift_id uuid,p_verifier_worker_run_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE d record;
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'FINAL_LOOP_PARENT_PROVIDER_VERIFIER_SERVICE_ONLY';END IF;
 IF p_shift_id IS NULL OR p_verifier_worker_run_id IS NULL OR NOT EXISTS(
  SELECT 1 FROM reality_internal.signed_worker_actual_runs_v1 r
  WHERE r.run_id=p_verifier_worker_run_id AND r.status='STARTED'
   AND r.finished_at IS NULL
   AND r.started_at>=pg_catalog.clock_timestamp()-interval '10 minutes')
 THEN RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_PARENT_PROVIDER_SIGNED_VERIFIER_REQUIRED',
  'read_only',true,'original_job_completed',false);END IF;
 SELECT * INTO d FROM reality_internal.final_loop_parent_deliveries_v1
 WHERE shift_id=p_shift_id AND status='POST_RESERVED_RECONCILE_ONLY'
  AND publisher_worker_run_id IS NOT NULL
  AND publisher_worker_run_id<>p_verifier_worker_run_id
  AND publication_claim_id IS NOT NULL
  AND owner_publication_receipt_sha256 IS NOT NULL
  AND EXISTS(SELECT 1 FROM reality_internal.riley_pr_review_originals_v1 r
   WHERE r.original_work_id=
    reality_internal.final_loop_parent_deliveries_v1.parent_original_work_id
    AND r.shift_id=p_shift_id
    AND r.phase='BLOCKED' AND r.provider_comment_id IS NULL
    AND r.settlement_receipt_id IS NULL)
 ORDER BY publication_reserved_at LIMIT 1;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_NO_PENDING_INDEPENDENT_PROVIDER_READBACK',
  'read_only',true,'original_job_completed',false);END IF;
 RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_PARENT_GITHUB_EFFECT_UNCERTAIN_READBACK_ONLY',
  'delivery_id',d.delivery_id,'publication_claim_id',d.publication_claim_id,
  'owner_id',d.owner_id,'shift_id',d.shift_id,
  'parent_original_work_id',d.parent_original_work_id,
  'source_ref',d.source_ref,'source_head_sha',d.source_head_sha,
  'source_manifest_sha256',d.source_manifest_sha256,
  'delivery_body',d.delivery_body,
  'delivery_body_sha256',d.delivery_body_sha256,
  'owner_publication_receipt_sha256',d.owner_publication_receipt_sha256,
  'publisher_worker_run_id',d.publisher_worker_run_id,
  'verifier_worker_run_id',p_verifier_worker_run_id,
  'publication_reserved_at',d.publication_reserved_at,
  'read_only',true,'post_retry_authorized',false,
  'original_job_completed',false,'production_changed',false);
END $fn$;


-- Independent provider verification and canonical Universe OUTCOME are one
-- atomic database transaction. A signed receipt is never sufficient alone:
-- the outside GitHub comment must be reread in full by a DIFFERENT run.
CREATE OR REPLACE FUNCTION public.reality_record_final_loop_parent_settlement_v1(
 p_delivery_id uuid,p_publication_claim_id uuid,
 p_verifier_worker_run_id uuid,p_provider_evidence jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE d record;p record;a record;parent record;goal record;v_rec jsonb;
 v_outcome uuid;v_settlement uuid;v_now timestamptz;v_iso text;
 v_payload jsonb;v_provenance jsonb;v_refs jsonb;v_basis jsonb;
 v_body_sha text;v_content_sha text;v_lineage_sha text;
 v_comment_id bigint;v_url text;v_provider_time timestamptz;
 v_updated integer;
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'FINAL_LOOP_PARENT_FINAL_SETTLEMENT_SERVICE_ONLY';END IF;
 IF p_delivery_id IS NULL OR p_publication_claim_id IS NULL OR
   p_verifier_worker_run_id IS NULL OR
   pg_catalog.jsonb_typeof(p_provider_evidence)<>'object' OR
   p_provider_evidence->>'schema'<>
     'reality-final-loop-independent-github-parent-verification-v1' OR
   p_provider_evidence->>'independent_provider_readback'<>'true' OR
   p_provider_evidence->>'full_comment_body_verified'<>'true' OR
   p_provider_evidence->>'source_head_current'<>'true' OR
   p_provider_evidence->>'authenticated_writer_verified'<>'true' OR
   p_provider_evidence->>'provider_comment_unique'<>'true' OR
   p_provider_evidence->>'external_effect_performed'<>'true' OR
   p_provider_evidence->>'production_changed'<>'false' OR
   p_provider_evidence->>'comment_id' !~ '^[1-9][0-9]{0,17}$' OR
   p_provider_evidence->>'provider_actor_id' !~ '^[1-9][0-9]{0,17}$' OR
   p_provider_evidence->>'authenticated_actor_id'<>
     p_provider_evidence->>'provider_actor_id' OR
   coalesce(p_provider_evidence->>'body_sha256','') !~
     '^sha256:[a-f0-9]{64}$' OR
   coalesce(p_provider_evidence->>'source_head_sha','') !~
     '^[a-f0-9]{40}$' OR
   coalesce(p_provider_evidence->>'provider_comment_created_at','') !~
     '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]{8,15}Z$'
 THEN RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_PARENT_INDEPENDENT_PROVIDER_PROOF_INVALID',
  'original_job_completed',false,'universe_reconciled',false);END IF;
 SELECT * INTO d FROM reality_internal.final_loop_parent_deliveries_v1
 WHERE delivery_id=p_delivery_id AND
  publication_claim_id=p_publication_claim_id
  AND status='POST_RESERVED_RECONCILE_ONLY' FOR UPDATE;
 IF NOT FOUND OR d.publisher_worker_run_id=p_verifier_worker_run_id OR
   NOT EXISTS(SELECT 1 FROM reality_internal.signed_worker_actual_runs_v1 vr
    WHERE vr.run_id=p_verifier_worker_run_id AND vr.status='STARTED'
     AND vr.finished_at IS NULL AND
     vr.started_at>=pg_catalog.clock_timestamp()-interval '10 minutes') OR
   NOT EXISTS(SELECT 1 FROM reality_internal.signed_worker_actual_runs_v1 pr
    WHERE pr.run_id=d.publisher_worker_run_id AND pr.started_at IS NOT NULL)
 THEN RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_PARENT_DIFFERENT_SIGNED_PROVIDER_VERIFIER_REQUIRED',
  'original_job_completed',false,'universe_reconciled',false);END IF;
 SELECT * INTO p FROM reality_internal.final_loop_pr_source_plans_v1
 WHERE plan_id=d.plan_id AND owner_id=d.owner_id AND shift_id=d.shift_id
  AND parent_original_work_id=d.parent_original_work_id
  AND source_ref=d.source_ref
  AND source_manifest_sha256=d.source_manifest_sha256
  AND source_head_sha=d.source_head_sha;
 SELECT * INTO a FROM reality_internal.final_loop_child_approval_packets_v1
 WHERE packet_id=d.packet_id AND plan_id=d.plan_id
  AND owner_id=d.owner_id AND shift_id=d.shift_id
  AND state='EFFECT_RESERVED_RECONCILE_ONLY'
  AND owner_approval_receipt_sha256 IS NOT NULL;
 SELECT * INTO parent FROM reality_internal.riley_pr_review_originals_v1
 WHERE original_work_id=d.parent_original_work_id
  AND owner_id=d.owner_id AND shift_id=d.shift_id
  AND source_ref=d.source_ref FOR UPDATE;
 SELECT * INTO goal FROM public.universe_events e
 WHERE e.event_id=d.universe_goal_event_id
  AND e.continuity_root_id=d.shift_id AND e.worldline_id=d.plan_id
  AND e.parent_event_id IS NULL AND e.event_kind='WORK'
  AND e.entity_type='reality_final_loop_owner_accepted_goal_v1'
  AND e.epistemic_status='VERIFIED'
  AND e.payload->>'owner_id'=d.owner_id::text
  AND e.payload->>'original_work_id'=d.parent_original_work_id
  AND e.payload->>'source_head_sha'=d.source_head_sha
  AND e.payload->>'acceptance_contract_sha256'=
    d.acceptance_contract_sha256
  AND e.payload->>'original_job_completed'='false';
 v_rec:=public.reality_read_final_loop_child_recovery_v1(d.shift_id,d.plan_id);
 v_body_sha:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to(d.delivery_body,'UTF8')),'hex');
 IF p.plan_id IS NULL OR a.packet_id IS NULL OR
   parent.original_work_id IS NULL OR
   parent.phase<>'BLOCKED' OR parent.review_body IS NOT NULL OR
   parent.provider_comment_id IS NOT NULL OR
   parent.settlement_receipt_id IS NOT NULL OR
   goal.event_id IS NULL OR goal.lineage_hash !~ '^[a-f0-9]{64}$' OR
   goal.content_hash<>pg_catalog.encode(extensions.digest(
     pg_catalog.convert_to(public.reality_continuity_canonical_json_v1(
       goal.payload),'UTF8'),'sha256'),'hex') OR
   (SELECT count(*) FROM public.universe_events e
    WHERE e.continuity_root_id=d.shift_id AND e.worldline_id=d.plan_id)<>1 OR
   d.owner_publication_receipt_sha256 IS NULL OR
   d.owner_publication_approval_request_id IS NULL OR
   a.acceptance_contract_sha256<>d.acceptance_contract_sha256 OR
   a.acceptance_contract_sha256 IS DISTINCT FROM
     reality_internal.final_loop_pr_review_acceptance_digest_v1(p.plan_id) OR
   v_body_sha<>d.delivery_body_sha256 OR
   v_rec->'cross_scope'->>'independently_verified'<>'true' OR
   v_rec->'cross_scope'->>'receipt_sha256'<>
     d.cross_scope_receipt_sha256 OR
   v_rec->>'provider_effect_uncertain'<>'false' OR
   p_provider_evidence->>'delivery_id'<>d.delivery_id::text OR
   p_provider_evidence->>'publication_claim_id'<>d.publication_claim_id::text OR
   p_provider_evidence->>'verifier_worker_run_id'<>
     p_verifier_worker_run_id::text OR
   p_provider_evidence->>'source_ref'<>d.source_ref OR
   p_provider_evidence->>'parent_original_work_id'<>
     d.parent_original_work_id OR
   p_provider_evidence->>'source_head_sha'<>d.source_head_sha OR
   p_provider_evidence->>'source_manifest_sha256'<>
     d.source_manifest_sha256 OR
   p_provider_evidence->>'body_sha256'<>d.delivery_body_sha256 OR
   p_provider_evidence->>'approval_receipt_sha256'<>
     d.owner_publication_receipt_sha256
 THEN RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_PARENT_FINAL_SCOPE_OR_UNIVERSE_MISMATCH',
  'original_job_completed',false,'universe_reconciled',false);END IF;
 v_comment_id:=(p_provider_evidence->>'comment_id')::bigint;
 v_url:='https://github.com/maloney2323/Reality/pull/'||
  pg_catalog.split_part(d.source_ref,'/pull/',2)||
  '#issuecomment-'||v_comment_id::text;
 IF p_provider_evidence->>'provider_comment_url'<>v_url THEN
  RETURN pg_catalog.jsonb_build_object(
   'status','FINAL_LOOP_PARENT_PROVIDER_URL_NOT_EXACT',
   'original_job_completed',false,'universe_reconciled',false);END IF;
 BEGIN
  v_provider_time:=(p_provider_evidence->>'provider_comment_created_at')::timestamptz;
 EXCEPTION WHEN others THEN
  RETURN pg_catalog.jsonb_build_object(
   'status','FINAL_LOOP_PARENT_PROVIDER_TIME_UNVERIFIED',
   'original_job_completed',false,'universe_reconciled',false);
 END;
 IF v_provider_time<d.owner_approved_at-interval '2 minutes' OR
  v_provider_time>pg_catalog.clock_timestamp()+interval '3 minutes' THEN
  RETURN pg_catalog.jsonb_build_object(
   'status','FINAL_LOOP_PARENT_PROVIDER_COMMENT_PREDATES_APPROVAL',
   'original_job_completed',false,'universe_reconciled',false);END IF;
 -- A single canonical workline within the existing Universe; the goal
 -- created at the first owner click is the exact verified predecessor.
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
  'reality:final-loop-parent-universe:'||d.plan_id::text,0));
 IF EXISTS(SELECT 1 FROM public.universe_events e
   WHERE e.parent_event_id=goal.event_id) THEN
  RETURN pg_catalog.jsonb_build_object(
   'status','FINAL_LOOP_PARENT_UNIVERSE_PRIOR_SETTLEMENT_OR_FORK',
   'original_job_completed',false,'universe_reconciled',false);END IF;
 v_now:=pg_catalog.clock_timestamp();
 v_iso:=pg_catalog.to_char(v_now AT TIME ZONE 'UTC',
  'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
 v_outcome:=pg_catalog.gen_random_uuid();
 v_settlement:=pg_catalog.gen_random_uuid();
 v_payload:=pg_catalog.jsonb_build_object(
  'schema','reality-final-loop-verified-pr-review-outcome-v1',
  'owner_id',d.owner_id,'shift_id',d.shift_id,
  'original_work_id',d.parent_original_work_id,
  'source_ref',d.source_ref,'source_head_sha',d.source_head_sha,
  'source_manifest_sha256',d.source_manifest_sha256,
  'acceptance_contract_sha256',d.acceptance_contract_sha256,
  'owner_approval_receipt_sha256',a.owner_approval_receipt_sha256,
  'owner_publication_receipt_sha256',d.owner_publication_receipt_sha256,
  'independent_cross_scope_receipt_sha256',d.cross_scope_receipt_sha256,
  'provider_comment_id',v_comment_id,
  'provider_comment_url',v_url,
  'provider_comment_body_sha256',d.delivery_body_sha256,
  'independent_verifier_worker_run_id',p_verifier_worker_run_id,
  'independent_outcome_verified',true,
  'original_job_completed',true,'constitutional_phase','SETTLED',
  'external_effect_performed',true,'production_changed',false);
 v_refs:=pg_catalog.jsonb_build_array(
  d.source_ref,v_url,
  'supabase:final_loop_parent_deliveries_v1:'||d.delivery_id::text);
 v_provenance:=pg_catalog.jsonb_build_object(
  'source','SIGNED_FINAL_LOOP_OWNER_APPROVAL_GITHUB_PROVIDER_READBACK',
  'principal_id',d.owner_id::text,'parent_original_work_id',
    d.parent_original_work_id,
  'publisher_worker_run_id',d.publisher_worker_run_id,
  'independent_verifier_worker_run_id',p_verifier_worker_run_id,
  'provider_actor_id',p_provider_evidence->>'provider_actor_id',
  'continuity_spine',pg_catalog.jsonb_build_object(
   'version','reality-continuity-spine-v2.1',
   'source_event_id',goal.event_id::text,
   'prior_lineage_hash',goal.lineage_hash,
   'transformation_receipt_id',null));
 v_content_sha:=pg_catalog.encode(extensions.digest(
  pg_catalog.convert_to(public.reality_continuity_canonical_json_v1(
   v_payload),'UTF8'),'sha256'),'hex');
 v_basis:=pg_catalog.jsonb_build_object(
  'spine_version','reality-continuity-spine-v2.1',
  'continuity_root_id',d.shift_id::text,
  'worldline_id',d.plan_id::text,'parent_event_id',goal.event_id,
  'prior_lineage_hash',goal.lineage_hash,
  'stage','OUTCOME','entity_id',d.plan_id::text,
  'evidence_refs',v_refs,'transformation_receipt_id',null,
  'effective_time',v_iso,'assertion_time',v_iso,
  'epistemic_status','VERIFIED','payload',v_payload,
  'provenance',v_provenance);
 v_lineage_sha:=pg_catalog.encode(extensions.digest(
  pg_catalog.convert_to(public.reality_continuity_canonical_json_v1(
   v_basis),'UTF8'),'sha256'),'hex');
 INSERT INTO public.universe_events(
  event_id,event_kind,entity_type,entity_id,continuity_root_id,
  worldline_id,parent_event_id,effective_time,assertion_time,
  epistemic_status,payload,evidence_refs,provenance,
  content_hash,lineage_hash)
 VALUES(v_outcome,'OUTCOME','reality_final_loop_verified_original_outcome_v1',
  d.plan_id,d.shift_id,d.plan_id,goal.event_id,
  v_now,v_now,'VERIFIED',v_payload,v_refs,v_provenance,
  v_content_sha,v_lineage_sha);
 UPDATE reality_internal.riley_pr_review_originals_v1
 SET phase='SETTLED',source_head_sha=d.source_head_sha,
  review_body=d.delivery_body,review_digest=d.delivery_body_sha256,
  provider_comment_id=v_comment_id,provider_comment_url=v_url,
  settlement_receipt_id=v_settlement,
  independent_provider_digest=d.delivery_body_sha256,
  settled_at=pg_catalog.clock_timestamp(),
  updated_at=pg_catalog.clock_timestamp()
 WHERE original_work_id=d.parent_original_work_id
  AND shift_id=d.shift_id AND owner_id=d.owner_id
  AND phase='BLOCKED' AND provider_comment_id IS NULL
  AND settlement_receipt_id IS NULL;
 GET DIAGNOSTICS v_updated=ROW_COUNT;
 IF v_updated<>1 THEN
  RAISE EXCEPTION 'FINAL_LOOP_PARENT_ATOMIC_NATIVE_SETTLEMENT_FAILED';END IF;
 UPDATE reality_internal.final_loop_parent_deliveries_v1
 SET status='SETTLED',provider_comment_id=v_comment_id,
  provider_comment_url=v_url,
  independent_verifier_worker_run_id=p_verifier_worker_run_id,
  independent_provider_body_sha256=d.delivery_body_sha256,
  universe_outcome_event_id=v_outcome,
  original_settlement_receipt_id=v_settlement,
  settled_at=pg_catalog.clock_timestamp()
 WHERE delivery_id=d.delivery_id
  AND publication_claim_id=p_publication_claim_id
  AND status='POST_RESERVED_RECONCILE_ONLY';
 GET DIAGNOSTICS v_updated=ROW_COUNT;
 IF v_updated<>1 THEN
  RAISE EXCEPTION 'FINAL_LOOP_PARENT_ATOMIC_DELIVERY_SETTLEMENT_FAILED';END IF;
 RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_PARENT_ORIGINAL_AND_UNIVERSE_ATOMICALLY_SETTLED',
  'delivery_id',d.delivery_id,
  'owner_id',d.owner_id,'shift_id',d.shift_id,
  'original_work_id',d.parent_original_work_id,
  'parent_settlement_receipt_id',v_settlement,
  'universe_goal_event_id',goal.event_id,
  'verified_universe_outcome_event_id',v_outcome,
  'provider_comment_id',v_comment_id,'provider_comment_url',v_url,
  'independent_provider_readback_verified',true,
  'universe_reconciled',true,'original_job_completed',true,
  'production_changed',false);
END $fn$;

-- Read-only receipts drive Universe, Past/Present/Future and Reality CEO.
-- Neither an AI text claim nor a single GitHub comment can rewrite status.
CREATE OR REPLACE FUNCTION public.reality_read_final_loop_parent_settlement_v1(
 p_owner_id uuid,p_original_work_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE d record;r record;goal record;outcome record;
BEGIN
 IF current_user<>'service_role' OR p_owner_id IS NULL OR
  coalesce(p_original_work_id,'') !~ '^work:[a-f0-9]{32}$' THEN
  RAISE EXCEPTION 'FINAL_LOOP_PARENT_SETTLEMENT_OWNER_SERVICE_ONLY';END IF;
 SELECT * INTO d FROM reality_internal.final_loop_parent_deliveries_v1
 WHERE owner_id=p_owner_id AND parent_original_work_id=p_original_work_id;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_PARENT_NOT_DELIVERED',
  'owner_id',p_owner_id,'original_work_id',p_original_work_id,
  'original_job_completed',false);END IF;
 SELECT * INTO r FROM reality_internal.riley_pr_review_originals_v1
 WHERE original_work_id=d.parent_original_work_id
  AND shift_id=d.shift_id AND owner_id=d.owner_id;
 SELECT * INTO goal FROM public.universe_events e
 WHERE event_id=d.universe_goal_event_id;
 SELECT * INTO outcome FROM public.universe_events e
 WHERE event_id=d.universe_outcome_event_id;
 IF d.status='SETTLED' AND
   r.phase='SETTLED' AND
   r.provider_comment_id=d.provider_comment_id AND
   r.provider_comment_url=d.provider_comment_url AND
   r.settlement_receipt_id=d.original_settlement_receipt_id AND
   r.independent_provider_digest=d.delivery_body_sha256 AND
   goal.epistemic_status='VERIFIED' AND
   goal.continuity_root_id=d.shift_id AND goal.worldline_id=d.plan_id AND
   outcome.epistemic_status='VERIFIED' AND
   outcome.event_kind='OUTCOME' AND
   outcome.parent_event_id=goal.event_id AND
   outcome.continuity_root_id=d.shift_id AND
   outcome.worldline_id=d.plan_id AND
   outcome.payload->>'original_job_completed'='true' AND
   outcome.payload->>'original_work_id'=d.parent_original_work_id AND
   outcome.payload->>'owner_id'=d.owner_id::text AND
   outcome.payload->>'provider_comment_url'=d.provider_comment_url AND
   outcome.payload->>'acceptance_contract_sha256'=d.acceptance_contract_sha256
 THEN RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_PARENT_AND_UNIVERSE_INDEPENDENT_READBACK_SETTLED',
  'owner_id',d.owner_id,'shift_id',d.shift_id,
  'original_work_id',d.parent_original_work_id,
  'source_ref',d.source_ref,
  'verified_provider_comment_url',d.provider_comment_url,
  'independent_provider_body_sha256',d.independent_provider_body_sha256,
  'parent_settlement_receipt_id',d.original_settlement_receipt_id,
  'universe_goal_event_id',goal.event_id,
  'verified_universe_outcome_event_id',outcome.event_id,
  'independent_database_readback',true,'original_job_completed',true,
  'universe_reconciled',true,'production_changed',false);END IF;
 RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_PARENT_SETTLEMENT_STILL_OPEN_OR_DISPUTED',
  'owner_id',d.owner_id,'shift_id',d.shift_id,
  'original_work_id',d.parent_original_work_id,
  'phase',d.status,'original_job_completed',false,
  'universe_reconciled',false,'production_changed',false);
END $fn$;

REVOKE ALL ON FUNCTION
 public.reality_prepare_final_loop_parent_delivery_v1(uuid,uuid),
 public.reality_read_owner_final_loop_parent_deliveries_v1(uuid,uuid),
 public.reality_owner_approve_final_loop_parent_delivery_v1(uuid,uuid,text,text,uuid),
 public.reality_claim_final_loop_parent_publish_v1(uuid,uuid),
 public.reality_read_final_loop_parent_publish_verify_v1(uuid,uuid),
 public.reality_record_final_loop_parent_settlement_v1(uuid,uuid,uuid,jsonb),
 public.reality_read_final_loop_parent_settlement_v1(uuid,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION
 public.reality_prepare_final_loop_parent_delivery_v1(uuid,uuid),
 public.reality_read_owner_final_loop_parent_deliveries_v1(uuid,uuid),
 public.reality_owner_approve_final_loop_parent_delivery_v1(uuid,uuid,text,text,uuid),
 public.reality_claim_final_loop_parent_publish_v1(uuid,uuid),
 public.reality_read_final_loop_parent_publish_verify_v1(uuid,uuid),
 public.reality_record_final_loop_parent_settlement_v1(uuid,uuid,uuid,jsonb),
 public.reality_read_final_loop_parent_settlement_v1(uuid,text)
 TO service_role;


-- Existing signed worker asks for the next parent proof obligation. The
-- canonical child + integration verifier decides whether it is ready.
CREATE OR REPLACE FUNCTION public.reality_prepare_next_final_loop_parent_delivery_v1(
 p_shift_id uuid,p_worker_run_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE v_plan uuid;v_pending jsonb;
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'FINAL_LOOP_PARENT_NEXT_SERVICE_ONLY';END IF;
 IF p_shift_id IS NULL OR p_worker_run_id IS NULL OR NOT EXISTS(
  SELECT 1 FROM reality_internal.signed_worker_actual_runs_v1 r
  WHERE r.run_id=p_worker_run_id AND r.status='STARTED'
   AND r.finished_at IS NULL)
 THEN RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_PARENT_NEXT_SIGNED_WORKER_REQUIRED',
  'parent_obligation_remains_open',true);END IF;
 SELECT p.plan_id INTO v_plan
 FROM reality_internal.final_loop_pr_source_plans_v1 p
 JOIN reality_internal.final_loop_child_approval_packets_v1 a
  ON a.plan_id=p.plan_id AND a.owner_id=p.owner_id
  AND a.shift_id=p.shift_id
  AND a.state='EFFECT_RESERVED_RECONCILE_ONLY'
 WHERE p.shift_id=p_shift_id AND p.parent_original_work_id IS NOT NULL
  AND NOT EXISTS(SELECT 1 FROM reality_internal.final_loop_parent_deliveries_v1 d
   WHERE d.plan_id=p.plan_id AND d.status='SETTLED')
 ORDER BY p.staged_at,p.plan_id LIMIT 1;
 IF v_plan IS NULL THEN RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_NO_UNFINISHED_APPROVED_PARENT_RECOVERY_PLAN',
  'parent_obligation_remains_open',true);END IF;
 v_pending:=public.reality_prepare_final_loop_parent_delivery_v1(
  v_plan,p_worker_run_id);
 RETURN v_pending;
END $fn$;
REVOKE ALL ON FUNCTION
 public.reality_prepare_next_final_loop_parent_delivery_v1(uuid,uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION
 public.reality_prepare_next_final_loop_parent_delivery_v1(uuid,uuid)
 TO service_role;
