-- Read-only request-local verification reuse. Never persist proof results or change a proof predicate.
-- Preserve current authority, exact receipts, and historical signal visibility.
CREATE OR REPLACE FUNCTION reality_internal.read_final_loop_verified_investigation_v1(
 p_owner_id uuid,p_shift_id uuid,p_original_work_id text,p_source_ref text,p_head text,p_revision bigint)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $fn$
 WITH suspension AS MATERIALIZED (
  SELECT reality_internal.read_final_loop_verified_suspension_v1(p_owner_id,p_shift_id,p_original_work_id,p_source_ref,p_head,p_revision) AS value
 )
 SELECT pg_catalog.jsonb_build_object('incident_id',i.incident_id,
  'investigation_receipt_sha256',i.investigation_receipt_sha256,'investigation_worker_run_id',run.run_id,
  'investigation_event_id',ev.event_id,'suspension_receipt_sha256',ev.source_receipt_sha256,
  'frozen_source_head_sha',q.reconciliation_snapshot->>'source_head_sha',
  'unresolved_proof_gates',q.reconciliation_snapshot->'unsatisfied_gates')
 FROM reality_internal.owner_shift_continuity_incidents_v1 i
 JOIN reality_internal.final_loop_resume_events_v1 ev ON ev.event_id::text=i.source_evidence->>'event_id'
  AND ev.owner_id=i.owner_id AND ev.shift_id=i.shift_id AND ev.original_work_id=p_original_work_id
  AND ev.source_ref=p_source_ref AND ev.continuity_head_sha256=p_head AND ev.continuity_revision=p_revision
  AND ev.signal_kind='VERIFIED_SUSPENSION_INVESTIGATION' AND ev.signal_next_action='INVESTIGATE_VERIFIED_SUSPENSION_NO_REPLAY'
  AND ev.state='SHADOW_OBSERVED' AND ev.observed_at>=i.investigated_at
 JOIN reality_internal.signed_worker_actual_runs_v1 run ON run.run_id=ev.governed_wake_worker_run_id
  AND run.status='COMPLETED' AND run.finished_at>=ev.observed_at
  AND run.worker_stage='SUSPENSION_INVESTIGATION_RESPONSE_PUBLICATION'
 JOIN reality_internal.governed_signed_worker_release_wakes_v1 wake ON wake.worker_run_id=run.run_id
  AND wake.release_claim_id=ev.release_continuation_claim_id AND wake.owner_id=i.owner_id AND wake.shift_id=i.shift_id
  AND wake.operating_lane='NORMAL_SIGNED_SHIFT'
 JOIN reality_internal.owner_continuity_qualification_routes_v1 q ON q.owner_id=i.owner_id AND q.source_ref=p_source_ref
  AND q.reconciliation_snapshot->>'shift_id'=p_shift_id::text
  AND q.reconciliation_snapshot->>'original_candidate_work_id'=p_original_work_id
  AND q.reconciliation_snapshot->>'source_proof_bound'='true'
  AND q.reconciliation_snapshot->>'review_scope_qualified'='true'
  AND q.reconciliation_snapshot->>'exact_goal_event_verified'='true'
  AND q.reconciliation_snapshot->>'exact_acceptance_approval_verified'='true'
  AND q.reconciliation_snapshot->'accepted_review_scope'->>'source_head_sha'=q.reconciliation_snapshot->>'source_head_sha'
  AND q.reconciliation_snapshot->'accepted_review_scope'->>'parent_original_work_id'=p_original_work_id
  AND q.reconciliation_snapshot->'accepted_review_scope'->>'source_ref'=p_source_ref
  AND q.reconciliation_snapshot->'accepted_review_scope'->>'execution_authorized'='false'
  AND q.reconciliation_snapshot->'recovery_terminal_history'->>'remaining_attempts'='0'
  AND q.reconciliation_snapshot->'recovery_terminal_history'->>'replay_permitted'='false'
  AND q.reconciliation_snapshot->'recovery_terminal_history'->>'new_attempt_authorized'='false'
  AND q.reconciliation_receipt_sha256='sha256:'||pg_catalog.encode(pg_catalog.sha256(
   pg_catalog.convert_to(q.reconciliation_snapshot::text,'UTF8')),'hex')
 CROSS JOIN suspension sus
 WHERE i.owner_id=p_owner_id AND i.shift_id=p_shift_id AND i.kind='SIGNED_FINAL_LOOP_CONTINUITY_BLOCKED'
  AND i.phase='INVESTIGATION_RECORDED_NEEDS_INDEPENDENT_PROOF' AND i.qualified_job_id IS NULL
  AND i.reviewer_function_id IS NOT NULL AND i.reviewer_function_id<>i.assigned_function_id
  AND i.source_evidence->>'original_work_id'=p_original_work_id
  AND i.source_evidence->>'source_ref'=p_source_ref AND i.source_evidence->>'continuity_head_sha256'=p_head
  AND i.source_evidence->>'worker_run_id'=run.run_id::text
  AND i.source_evidence->>'verified_suspension_receipt_sha256'=ev.source_receipt_sha256
  AND i.source_evidence->>'previous_attempt_budget_preserved'='true'
  AND i.source_evidence->>'replay_authorized'='false' AND i.source_evidence->>'new_attempt_authorized'='false'
  AND i.evidence_sha256='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(i.source_evidence::text,'UTF8')),'hex')
  AND i.investigation_receipt_sha256='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
   pg_catalog.jsonb_build_object('owner_id',i.owner_id,'incident_id',i.incident_id,
    'evidence_sha256',i.evidence_sha256,'model_response_id',i.model_response_id,
    'assigned_employee',i.assigned_employee,'reviewer',i.independent_reviewer,
    'diagnosis',i.diagnosis,'proposed_upgrade',i.proposed_upgrade,
    'required_independent_test',i.independent_test_requirement,'limitations',i.limitations,
    'new_original_jobs_created',0,'installation_authorized',false)::text,'UTF8')),'hex')
  AND ev.source_receipt_sha256=(sus.value->>'receipt_sha256')
 ORDER BY q.reconciliation_checked_at DESC NULLS LAST,i.investigated_at DESC LIMIT 1;
$fn$;
REVOKE ALL ON FUNCTION reality_internal.read_final_loop_verified_investigation_v1(uuid,uuid,text,text,text,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION reality_internal.read_final_loop_verified_investigation_v1(uuid,uuid,text,text,text,bigint) TO service_role;

CREATE OR REPLACE FUNCTION reality_internal.read_final_loop_verified_terminal_review_v1(
 p_owner_id uuid,p_shift_id uuid,p_original_work_id text,p_source_ref text,p_head text,p_revision bigint)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $fn$
DECLARE result jsonb;
BEGIN
 WITH guard AS MATERIALIZED (
  SELECT public.reality_read_final_loop_shared_continuity_guard_v1(p_shift_id) AS value
 ), investigation AS MATERIALIZED (
  SELECT reality_internal.read_final_loop_verified_investigation_v1(p_owner_id,p_shift_id,p_original_work_id,p_source_ref,p_head,p_revision) AS value
 )
 SELECT r.independent_verdict||pg_catalog.jsonb_build_object(
  'review_receipt_sha256',r.receipt_sha256,'review_event_id',e.event_id,
  'qualifier_receipt_sha256',q.reconciliation_receipt_sha256,
  'continuity_root_id',g.value->>'continuity_root_id',
  'terminal_history',q.reconciliation_snapshot->'recovery_terminal_history') INTO result
 FROM reality_internal.shift_continuity_independent_reviews_v1 r
 JOIN reality_internal.final_loop_resume_events_v1 e ON e.event_id=r.review_event_id
  AND e.owner_id=r.owner_id AND e.shift_id=r.shift_id AND e.original_work_id=r.original_work_id
  AND e.source_ref=r.source_ref AND e.continuity_head_sha256=r.continuity_head_sha256
  AND e.state='SHADOW_OBSERVED' AND e.signal_kind='VERIFIED_INVESTIGATION_REVIEW'
  AND e.governed_wake_worker_run_id=r.worker_run_id AND e.source_receipt_sha256=r.investigation_receipt_sha256
 JOIN reality_internal.signed_worker_actual_runs_v1 run ON run.run_id=r.worker_run_id AND run.status='COMPLETED'
  AND run.worker_stage='INDEPENDENT_INVESTIGATION_REVIEW_RESPONSE_PUBLICATION' AND run.finished_at>=r.completed_at
 JOIN reality_internal.governed_signed_worker_release_wakes_v1 wake ON wake.worker_run_id=run.run_id
  AND wake.owner_id=r.owner_id AND wake.shift_id=r.shift_id AND wake.release_claim_id=e.release_continuation_claim_id
  AND wake.operating_lane='NORMAL_SIGNED_SHIFT'
 JOIN reality_internal.governed_worker_release_approvals_v1 a ON a.claim_id=wake.release_claim_id
  AND a.owner_id=r.owner_id AND a.shift_id=r.shift_id AND a.state='CLAIMED_ONCE'
  AND a.release_sha=wake.running_release_sha AND a.provider_alias_observed_at>=a.claimed_at
 JOIN reality_internal.owner_continuity_qualification_routes_v1 q ON q.owner_id=r.owner_id AND q.source_ref=r.source_ref
  AND q.reconciliation_snapshot->>'shift_id'=r.shift_id::text
  AND q.reconciliation_snapshot->>'original_candidate_work_id'=r.original_work_id
  AND q.reconciliation_snapshot->>'source_head_sha'=r.frozen_source_head_sha
  AND q.reconciliation_snapshot->>'recovery_terminal_boundary'='true'
  AND q.reconciliation_snapshot->'recovery_terminal_history'->>'original_work_id'=r.original_work_id
  AND q.reconciliation_snapshot->'recovery_terminal_history'->>'remaining_attempts'='0'
  AND q.reconciliation_snapshot->'recovery_terminal_history'->>'replay_permitted'='false'
  AND q.reconciliation_snapshot->'recovery_terminal_history'->>'new_attempt_authorized'='false'
  AND q.reconciliation_receipt_sha256='sha256:'||pg_catalog.encode(pg_catalog.sha256(
   pg_catalog.convert_to(q.reconciliation_snapshot::text,'UTF8')),'hex')
 CROSS JOIN guard g
 CROSS JOIN investigation i
 WHERE r.owner_id=p_owner_id AND r.shift_id=p_shift_id AND r.original_work_id=p_original_work_id
  AND r.source_ref=p_source_ref AND r.continuity_head_sha256=p_head AND e.continuity_revision=p_revision
  AND r.status='SOURCE_MATCHED_NEEDS_FROZEN_TEST' AND r.source_head_sha=r.frozen_source_head_sha
  AND r.independent_verdict->>'review_worker_run_id'=r.worker_run_id::text
  AND r.independent_verdict->>'investigation_worker_run_id'=i.value->>'investigation_worker_run_id'
  AND r.worker_run_id::text<>i.value->>'investigation_worker_run_id'
  AND r.investigation_receipt_sha256=i.value->>'investigation_receipt_sha256'
  AND r.independent_verdict->>'investigation_receipt_sha256'=r.investigation_receipt_sha256
  AND r.independent_verdict->>'frozen_source_head_sha'=r.frozen_source_head_sha
  AND r.independent_verdict->>'previous_attempt_budget_preserved'='true'
  AND r.independent_verdict->>'new_attempt_authorized'='false'
  AND r.independent_verdict->>'replay_authorized'='false'
  AND r.independent_verdict->>'execution_authorized'='false'
  AND r.independent_verdict->>'original_job_completed'='false'
  AND r.independent_verdict->>'production_changed'='false'
  AND r.receipt_sha256='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(r.independent_verdict::text,'UTF8')),'hex')
  AND g.value->>'status'='FINAL_LOOP_SHARED_CONTINUITY_CHECKED'
  AND g.value->>'owner_id'=p_owner_id::text AND g.value->>'shift_id'=p_shift_id::text
  AND g.value->>'continuity_head_sha256'=p_head AND g.value->>'revision'=p_revision::text
  AND EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(g.value->'obligations') ob
   WHERE ob->>'original_work_id'=p_original_work_id AND ob->>'source_ref'=p_source_ref
    AND ob->>'qualifier_digest_verified'='true' AND ob->>'qualifier_receipt_sha256'=q.reconciliation_receipt_sha256
    AND ob->>'independent_original_outcome_verified'='false')
 ORDER BY r.completed_at DESC LIMIT 1;
 RETURN result;
END $fn$;
REVOKE ALL ON FUNCTION reality_internal.read_final_loop_verified_terminal_review_v1(uuid,uuid,text,text,text,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION reality_internal.read_final_loop_verified_terminal_review_v1(uuid,uuid,text,text,text,bigint) TO service_role;

CREATE OR REPLACE FUNCTION public.reality_read_final_loop_event_resume_shadow_v1(p_shift_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE v_proof jsonb;v_subs jsonb;v_events jsonb;
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'FINAL_LOOP_EVENT_SHADOW_SERVICE_ONLY';END IF;
 v_proof:=public.reality_read_current_final_loop_proof_envelope_v1(p_shift_id);
 IF v_proof->>'shift_id'<>p_shift_id::text OR
    v_proof->>'independent_owner_scope_verified'<>'true' THEN
  RETURN jsonb_build_object('status','FINAL_LOOP_EVENT_SHADOW_SCOPE_UNVERIFIED',
   'event_dispatch_enabled',false,'execution_authorized',false);END IF;
 SELECT coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'original_work_id',s.original_work_id,'source_ref',s.source_ref,
  'condition_kind',s.condition_kind,'subscribed_receipt_sha256',s.subscribed_receipt_sha256,
  'unresolved_proof_gates',s.unresolved_proof_gates,
  'next_qualified_action',s.next_qualified_action,
  'state',s.state,'continuity_revision',s.continuity_revision
 ) ORDER BY s.original_work_id),'[]'::jsonb) INTO v_subs
 FROM reality_internal.final_loop_resume_conditions_v1 s
 WHERE s.shift_id=p_shift_id AND s.owner_id=(v_proof->>'owner_id')::uuid;
 WITH event_scope AS MATERIALIZED (
  SELECT e.* FROM reality_internal.final_loop_resume_events_v1 e
  WHERE e.shift_id=p_shift_id AND e.owner_id=(v_proof->>'owner_id')::uuid
 ), proof_keys AS MATERIALIZED (
  SELECT DISTINCT owner_id,shift_id,original_work_id,source_ref,continuity_head_sha256,continuity_revision,
   signal_kind,source_receipt_sha256 FROM event_scope
 ), proofs AS MATERIALIZED (
  SELECT e.*,case
   when e.signal_kind='VERIFIED_REVIEW_TECHNICAL_EVIDENCE' then coalesce(
    e.source_receipt_sha256=(reality_internal.read_final_loop_verified_terminal_review_v1(
      e.owner_id,e.shift_id,e.original_work_id,e.source_ref,e.continuity_head_sha256,e.continuity_revision)->>'review_receipt_sha256'),false)
   when e.signal_kind='VERIFIED_INVESTIGATION_REVIEW' then coalesce(
    e.source_receipt_sha256=(reality_internal.read_final_loop_verified_investigation_v1(
      e.owner_id,e.shift_id,e.original_work_id,e.source_ref,e.continuity_head_sha256,e.continuity_revision)->>'investigation_receipt_sha256'),false)
   when e.signal_kind='VERIFIED_SUSPENSION_INVESTIGATION' then coalesce(
    e.source_receipt_sha256=(reality_internal.read_final_loop_verified_suspension_v1(
      e.owner_id,e.shift_id,e.original_work_id,e.source_ref,e.continuity_head_sha256,e.continuity_revision)->>'receipt_sha256'),false)
   when e.signal_kind='INDEPENDENT_FROZEN_CI_RECEIPT' then exists(
    select 1 from reality_internal.owner_maintenance_independent_case_ci_v1 ci
    where ci.shift_id=e.shift_id and ci.owner_id=e.owner_id
      and ci.source_ref=e.source_ref
      and ci.case_specific_ci_receipt_sha256=e.source_receipt_sha256
      and ci.source_epoch_frozen_red_verified=true
      and ci.code_correction_green_verified=true
      and ci.original_customer_job_completed=false
      and ci.artifact_installation_authorized=false
      and ci.production_changed=false)
   else exists(
    select 1 from pg_catalog.jsonb_array_elements(
      coalesce(v_proof->'governed_qualification_handoffs','[]'::jsonb)) h
    where h->>'source_ref'=e.source_ref
      and h->>'original_work_id'=e.original_work_id
      and h->>'qualifier_receipt_sha256'=e.source_receipt_sha256)
   end AS source_current
  FROM proof_keys e
 )
 SELECT coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'event_id',e.event_id,'original_work_id',e.original_work_id,
  'source_ref',e.source_ref,'event_kind',e.signal_kind,
  'source_receipt_sha256',e.source_receipt_sha256,
  'event_causality_sha256',e.event_causality_sha256,
  'event_state',e.state,
  'continuity_revision',e.continuity_revision,
  'signal_next_action',e.signal_next_action,

  'source_current',p.source_current,

  'would_resume_suspended_obligation',e.state='SHADOW_PENDING' AND
   e.continuity_revision=(v_proof->>'revision')::bigint AND
   e.continuity_head_sha256=v_proof->>'continuity_head_sha256' AND p.source_current
 ) ORDER BY e.created_at),'[]'::jsonb) INTO v_events
 FROM event_scope e
 JOIN proofs p ON p.owner_id IS NOT DISTINCT FROM e.owner_id
  AND p.shift_id IS NOT DISTINCT FROM e.shift_id
  AND p.original_work_id IS NOT DISTINCT FROM e.original_work_id
  AND p.source_ref IS NOT DISTINCT FROM e.source_ref
  AND p.continuity_head_sha256 IS NOT DISTINCT FROM e.continuity_head_sha256
  AND p.continuity_revision IS NOT DISTINCT FROM e.continuity_revision
  AND p.signal_kind IS NOT DISTINCT FROM e.signal_kind
  AND p.source_receipt_sha256 IS NOT DISTINCT FROM e.source_receipt_sha256;
 RETURN jsonb_build_object(
  'schema','reality-final-loop-event-resume-shadow-v1',
  'status','FINAL_LOOP_EVENT_SUBSCRIPTIONS_AND_SIGNAL_TRACE_READ_ONLY',
  'shift_id',p_shift_id,'subscriptions',v_subs,'events',v_events,
  'event_dispatch_enabled',false,'execution_authorized',false,
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false);
END $function$;

REVOKE ALL ON FUNCTION public.reality_read_final_loop_event_resume_shadow_v1(uuid) FROM PUBLIC,anon,authenticated;

GRANT EXECUTE ON FUNCTION public.reality_read_final_loop_event_resume_shadow_v1(uuid) TO service_role;
