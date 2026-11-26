-- PR #444: additive candidate for existing function replacement, not a live migration.
-- Apply ONLY after isolated integration/return proof and independently qualified release.
-- No table, trigger, new scheduler, grant of authority, provider action or data replay.
-- Existing owner approval remains the only source of review acceptance.
BEGIN;
CREATE OR REPLACE FUNCTION reality_internal.read_final_loop_child_approval_preflight_v1(
 p_shift_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE v_shift record;v_plans jsonb;
BEGIN
 IF current_user NOT IN ('service_role','postgres') THEN
  RAISE EXCEPTION 'FINAL_LOOP_CHILD_PREFLIGHT_SERVICE_ONLY';END IF;
 SELECT s.shift_id,s.owner_id,s.plan_fingerprint INTO v_shift FROM
 reality_internal.governed_employee_shifts_v1 s
 JOIN reality_internal.governed_employee_completion_warrants_v1 w
  ON w.shift_id=s.shift_id AND w.owner_id=s.owner_id
  AND w.plan_fingerprint=s.plan_fingerprint
 WHERE s.shift_id=p_shift_id AND s.closed_at IS NULL
  AND s.planned_end_at='infinity'::timestamptz
  AND s.authorized_at IS NOT NULL AND w.state='ACTIVE';
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_CHILD_PREFLIGHT_NO_CURRENT_SIGNED_SHIFT',
  'owner_acceptance_verified',false,'execution_authorized',false); END IF;
 SELECT coalesce(pg_catalog.jsonb_agg(
  pg_catalog.jsonb_build_object(
   'plan_id',p.plan_id,'source_ref',p.source_ref,
   'parent_original_work_id',p.parent_original_work_id,
   'source_manifest_sha256',p.source_manifest_sha256,
   'acceptance_contract_sha256',
    u.acceptance_hash,
   'verified_signed_source_goal_contract_prepared',
    u.acceptance_hash IS NOT NULL,
   'owner_goal_acceptance_pending',u.acceptance_hash IS NOT NULL AND NOT proof.accepted,
   'independent_goal_acceptance_verified',proof.accepted,
   'owner_approval_claim_window_current',proof.current_window,
   'owner_approval_expired',proof.accepted AND NOT proof.current_window,
   'pending_exact_owner_approval',u.acceptance_hash IS NOT NULL AND NOT EXISTS(
    SELECT 1 FROM reality_internal.final_loop_child_approval_packets_v1 a
    WHERE a.plan_id=p.plan_id AND
     a.acceptance_contract_sha256=u.acceptance_hash),
   'canonical_review_handoff',CASE WHEN proof.accepted AND proof.current_window
    THEN pg_catalog.jsonb_build_object(
     'schema','reality-canonical-approved-review-scope-v1',
     'packet_id',proof.packet_id,'approval_request_id',proof.approval_request_id,
     'owner_approval_receipt_sha256',proof.approval_receipt,
     'acceptance_event_id',proof.event_id,'acceptance_event_content_hash',proof.event_hash,
     'owner_id',p.owner_id,'shift_id',p.shift_id,'plan_id',p.plan_id,
     'plan_fingerprint',p.plan_fingerprint,'parent_original_work_id',p.parent_original_work_id,
     'source_ref',p.source_ref,'source_head_sha',p.source_head_sha,
     'source_proof_sha256',p.source_proof_sha256,
     'source_manifest_sha256',p.source_manifest_sha256,
     'acceptance_contract_sha256',u.acceptance_hash,
     'scope_count',p.proposed_scope_count,
     'scope_fingerprints',(SELECT pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object('index',(item.value->>'index')::integer,
       'scope_sha256',item.value->>'proposed_scope_sha256')
      ORDER BY (item.value->>'index')::integer)
      FROM pg_catalog.jsonb_array_elements(p.source_plan->'bounded_scopes') item(value)),
     'effect_type','READ_ONLY_INTERNAL_PR_REVIEW',
     'canonical_claim_required',true,'execution_authorized',false,
     'original_job_completed',false,'production_changed',false)
    ELSE NULL END,
   'child_review_automatically_authorized',false
  ) ORDER BY p.staged_at),'[]'::jsonb) INTO v_plans
 FROM reality_internal.final_loop_pr_source_plans_v1 p
 CROSS JOIN LATERAL (
  SELECT reality_internal.final_loop_pr_review_acceptance_digest_v1(p.plan_id)
   AS acceptance_hash
 ) u
 CROSS JOIN LATERAL (
  SELECT count(e.event_id)=1 AS accepted,
   min(a.packet_id::text) AS packet_id,
   min(a.owner_approval_request_id::text) AS approval_request_id,
   min(a.owner_approval_receipt_sha256) AS approval_receipt,
   min(e.event_id::text) AS event_id,min(e.content_hash) AS event_hash,
   -- Compatibility field: current means exact accepted scope on an active
   -- signed shift, not time elapsed since the owner accepted the goal.
   count(e.event_id)=1 AND coalesce(bool_and(a.approved_at IS NOT NULL
    AND a.approved_at<=pg_catalog.clock_timestamp()
    AND a.owner_approval_request_id IS NOT NULL),false) AS current_window
  FROM reality_internal.final_loop_child_approval_packets_v1 a
  JOIN public.universe_events e ON e.continuity_root_id=p.shift_id AND e.worldline_id=p.plan_id AND e.entity_id=p.plan_id
  WHERE a.plan_id=p.plan_id AND a.shift_id=p.shift_id AND a.owner_id=p.owner_id
   AND a.source_manifest_sha256=p.source_manifest_sha256 AND a.parent_original_work_id=p.parent_original_work_id AND a.source_ref=p.source_ref
   AND a.acceptance_contract_sha256=u.acceptance_hash
   AND a.state IN ('APPROVED_ONCE','EFFECT_RESERVED_RECONCILE_ONLY')
   AND a.authority_effect='READ_ONLY_INTERNAL_PR_REVIEW'
   AND e.entity_type='reality_final_loop_owner_accepted_goal_v1'
   AND e.epistemic_status='VERIFIED' AND e.event_kind='WORK'
   AND e.payload->>'owner_approval_receipt_sha256'=a.owner_approval_receipt_sha256
   AND e.payload->>'owner_approval_request_id'=a.owner_approval_request_id::text
   AND e.payload->>'acceptance_contract_sha256'=a.acceptance_contract_sha256
   AND e.payload->>'goal_accepted'='true'
   AND e.payload->>'original_job_completed'='false'
   AND e.payload->>'production_changed'='false'
   AND e.payload->>'source_head_sha'=p.source_head_sha
   AND e.payload->>'source_manifest_sha256'=p.source_manifest_sha256
   AND e.payload->>'owner_id'=p.owner_id::text
   AND e.payload->>'shift_id'=p.shift_id::text
   AND e.payload->>'original_work_id'=p.parent_original_work_id
   AND e.payload->>'source_ref'=p.source_ref
   AND e.content_hash=pg_catalog.encode(extensions.digest(pg_catalog.convert_to(public.reality_continuity_canonical_json_v1(e.payload),'UTF8'),'sha256'),'hex')
 ) proof
 WHERE p.shift_id=p_shift_id AND p.owner_id=v_shift.owner_id
  AND p.parent_original_work_id IS NOT NULL;
 RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_CHILD_GOAL_ACCEPTANCE_PREFLIGHT_READ_ONLY',
  'owner_id',v_shift.owner_id,'shift_id',v_shift.shift_id,
  'plan_fingerprint',v_shift.plan_fingerprint,
  'plans',v_plans,'read_only',true,
  'execution_authorized',false,'original_job_completed',false);
END $fn$;

REVOKE ALL ON FUNCTION reality_internal.read_final_loop_child_approval_preflight_v1(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION reality_internal.read_final_loop_child_approval_preflight_v1(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.reality_read_final_loop_child_approval_preflight_v1(p_shift_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'FINAL_LOOP_CHILD_PREFLIGHT_SERVICE_ONLY';END IF;
 RETURN reality_internal.read_final_loop_child_approval_preflight_v1(p_shift_id);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_read_final_loop_child_approval_preflight_v1(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_read_final_loop_child_approval_preflight_v1(uuid) TO service_role;

-- Extend existing scheduled evidence-only qualifier with exact terminal builder readback.
-- No model claim, new budget, replay, owner grant, or original settlement.
CREATE OR REPLACE FUNCTION reality_internal.reconcile_current_qualification_proofs_v1()
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_seen integer:=0; v_changed integer:=0;
begin
  if current_user <> 'postgres' then
    raise exception 'QUALIFIER_RECONCILIATION_SCHEDULED_POSTGRES_ONLY';
  end if;
  -- This extends existing qualification routing with a current independent
  -- proof inventory. It does not admit originals, grant authority, execute
  -- models, replay an existing receipt, or modify an established warrant.
  with candidates as (
    select p.plan_id,p.shift_id,p.owner_id,p.source_ref,
      p.parent_original_work_id,p.source_proof_sha256,
      p.source_manifest_sha256,p.source_head_sha,p.state plan_state,
      s.plan_fingerprint,s.status shift_status,
      w.mode warrant_mode,w.state warrant_state,
      st.step_index,st.proof_sha256 shift_source_sha,
      reality_internal.final_loop_pr_review_acceptance_digest_v1(p.plan_id)
        acceptance_digest
    from reality_internal.final_loop_pr_source_plans_v1 p
    join reality_internal.governed_employee_shifts_v1 s
      on s.shift_id=p.shift_id and s.owner_id=p.owner_id
       and s.plan_fingerprint=p.plan_fingerprint
    join reality_internal.governed_employee_completion_warrants_v1 w
      on w.shift_id=p.shift_id and w.owner_id=p.owner_id
       and w.plan_fingerprint=s.plan_fingerprint and w.state='ACTIVE'
    join reality_internal.governed_employee_shift_steps_v1 st
      on st.shift_id=p.shift_id and st.source_ref=p.source_ref
       and st.state='SOURCE_CHECKED'
    where p.parent_original_work_id ~ '^work:[a-f0-9]{32}$'
      and p.state='PROPOSED_SOURCE_PLAN_AWAITING_INDEPENDENT_ADMISSION'
      and s.closed_at is null and s.authorized_at is not null
      and s.planned_start_at<=pg_catalog.clock_timestamp()
      and s.planned_end_at>pg_catalog.clock_timestamp()
      and s.status in ('RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
  ), observed as (
    select c.*,
      accepted.scope as accepted_review_scope,
      coalesce(recovery.exact_history,'null'::jsonb) as recovery_terminal_history,
      (recovery.exact_history is not null) as recovery_terminal_boundary,
      (c.source_proof_sha256=c.shift_source_sha) source_proof_bound,
      exists(select 1 from reality_internal.signed_original_lineage_packets_v1 l
        where l.shift_id=c.shift_id and l.owner_id=c.owner_id
        and l.source_ref=c.source_ref and
        l.original_work_id=c.parent_original_work_id) lineage_packet_found,
      exists(select 1 from public.universe_events e
        where e.epistemic_status='VERIFIED'
        and e.payload->>'original_work_id'=c.parent_original_work_id
        and e.payload->>'source_ref'=c.source_ref
        and e.payload->>'acceptance_contract_sha256'=c.acceptance_digest
        and (e.payload->>'owner_id'=c.owner_id::text
             or e.payload->>'principal_id'=c.owner_id::text)
        and e.continuity_root_id=c.shift_id
        and e.worldline_id=c.plan_id) exact_goal_event_verified,
      exists(select 1 from reality_internal.final_loop_child_approval_packets_v1 a
        where a.owner_id=c.owner_id and a.shift_id=c.shift_id
        and a.plan_id=c.plan_id
        and a.parent_original_work_id=c.parent_original_work_id
        and a.acceptance_contract_sha256=c.acceptance_digest
        and a.owner_approval_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'
        and a.state in ('APPROVED_ONCE','EFFECT_RESERVED_RECONCILE_ONLY'))
         exact_acceptance_approval_verified,
      exists(select 1 from reality_internal.governed_employee_original_claims_v1 x
        where x.shift_id=c.shift_id and x.owner_id=c.owner_id
        and x.source_ref=c.source_ref
        and x.original_work_id=c.parent_original_work_id)
         original_claim_admitted,
      exists(select 1 from reality_internal.signed_maintenance_executor_claims_v1 m
        where m.shift_id=c.shift_id and m.owner_id=c.owner_id
        and m.source_ref=c.source_ref and m.state='COMPLETED'
        and m.ci_independent_verified_at is not null)
         prior_independent_maintenance_diagnostic_completed,
      exists(select 1 from reality_internal.owner_maintenance_independent_case_ci_v1 ci
        where ci.shift_id=c.shift_id and ci.owner_id=c.owner_id
        and ci.source_ref=c.source_ref
        and ci.source_epoch_frozen_red_verified=true)
         case_specific_frozen_red_verified,
      exists(select 1 from reality_internal.governed_original_independent_final_receipts_v1 f
        where f.shift_id=c.shift_id and f.owner_id=c.owner_id
        and f.original_work_id=c.parent_original_work_id
        and f.source_ref=c.source_ref and f.outcome='SUCCEEDED'
        and f.final_evidence_sha256 ~ '^sha256:[a-f0-9]{64}$')
         original_final_receipt_verified
    from candidates c
    -- Reuse the exact canonical preflight proof, not an owner approval
    -- inferred from maintenance or an independently accepted source alone.
    left join lateral (
      select case when count(*)=1 then pg_catalog.jsonb_agg(p.value->'canonical_review_handoff')->0 else null end as scope
      from pg_catalog.jsonb_array_elements(
        reality_internal.read_final_loop_child_approval_preflight_v1(c.shift_id)->'plans') p(value)
      where p.value->>'plan_id'=c.plan_id::text
       and p.value->>'independent_goal_acceptance_verified'='true'
       and p.value->>'owner_approval_claim_window_current'='true'
       and p.value->>'owner_approval_expired'='false'
       and p.value->>'child_review_automatically_authorized'='false'
       and p.value->'canonical_review_handoff'->>'effect_type'='READ_ONLY_INTERNAL_PR_REVIEW'
       and p.value->'canonical_review_handoff'->>'owner_id'=c.owner_id::text
       and p.value->'canonical_review_handoff'->>'shift_id'=c.shift_id::text
       and p.value->'canonical_review_handoff'->>'parent_original_work_id'=c.parent_original_work_id
       and p.value->'canonical_review_handoff'->>'source_ref'=c.source_ref
       and p.value->'canonical_review_handoff'->>'plan_fingerprint'=c.plan_fingerprint
       and p.value->'canonical_review_handoff'->>'source_proof_sha256'=c.source_proof_sha256
       and p.value->'canonical_review_handoff'->>'source_head_sha'=c.source_head_sha
       and p.value->'canonical_review_handoff'->>'source_manifest_sha256'=c.source_manifest_sha256
       and p.value->'canonical_review_handoff'->>'acceptance_contract_sha256'=c.acceptance_digest
       and p.value->'canonical_review_handoff'->>'execution_authorized'='false'
    ) accepted on true
    -- Same existing owner, shift, original and exact maintenance warrant.
    -- A terminal builder outcome remains open work, but is NOT replayable.
    left join lateral (
      select pg_catalog.jsonb_build_object(
        'maintenance_id',m.incident_id,
        'original_work_id',h.existing_original_work_id,
        'last_attempt_receipt_sha256',m.frozen_test_build->>'receipt_sha256',
        'last_decision_receipt_sha256',m.build_recovery_decisions->-1->>'receipt_sha256',
        'terminal_reason',m.frozen_test_build->>'state',
        'attempt_count',pg_catalog.jsonb_array_length(m.build_attempt_receipts),
        'remaining_attempts',greatest(0,3-pg_catalog.jsonb_array_length(m.build_attempt_receipts)),
        'prior_bound_evidence_payload_present',m.frozen_test_build->'scope'?'failure_evidence',
        'independent_baseline_receipt_sha256',m.independent_failure_baseline_receipt_sha256,
        'independent_diagnostic_receipt_sha256',h.independent_diagnostic_receipt_sha256,
        'replay_permitted',false,'new_attempt_authorized',false,
        'fresh_causal_failure_verified',false
      ) exact_history
      from reality_internal.owner_internal_maintenance_jobs_v1 m
      join reality_internal.owner_maintenance_signed_repair_handoffs_v1 h
        on h.maintenance_id=m.incident_id and h.owner_id=m.owner_id
       and h.shift_id=c.shift_id and h.source_ref=m.source_ref
       and h.existing_original_work_id=c.parent_original_work_id
      join reality_internal.governed_employee_completion_warrants_v1 mw
        on mw.shift_id=c.shift_id and mw.owner_id=c.owner_id
       and mw.plan_fingerprint=c.plan_fingerprint and mw.state='ACTIVE'
       and mw.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
      where m.owner_id=c.owner_id and m.claimed_shift_id=c.shift_id
       and m.source_ref=c.source_ref and m.recovery_state='TERMINAL_BOUNDARY'
       and not m.original_job_completed
       and m.frozen_test_build->'scope'->>'existing_original_work_id'=c.parent_original_work_id
       and m.frozen_test_build->'scope'->>'authority_receipt_sha256'=h.handoff_receipt_sha256
       and m.frozen_test_build->'scope'->>'authority_basis'='SIGNED_EXISTING_WARRANT'
       and m.frozen_test_build->>'receipt_sha256'~'^sha256:[a-f0-9]{64}$'
       and m.frozen_test_build->>'receipt_sha256'=m.build_attempt_receipts->-1->>'receipt_sha256'
       and m.frozen_test_build->>'receipt_sha256'=m.build_recovery_decisions->-1->>'prior_receipt_sha256'
       and m.build_recovery_decisions->-1->>'state'='TERMINAL_BOUNDARY'
       and m.build_recovery_decisions->-1->>'receipt_sha256'~'^sha256:[a-f0-9]{64}$'
       and m.independent_failure_baseline_receipt_sha256~'^sha256:[a-f0-9]{64}$'
       and h.independent_diagnostic_receipt_sha256~'^sha256:[a-f0-9]{64}$'
       and exists(select 1 from pg_catalog.jsonb_array_elements(mw.source_scope) w
        where w->>'source_ref'=m.source_ref and w->>'maintenance_id'=m.incident_id::text
          and w->>'origin_shift_id'=m.origin_shift_id::text
          and w->>'independent_review_receipt_sha256'=m.independent_review_receipt_sha256)
      order by m.incident_id limit 1
    ) recovery on true
  ), decision as (
    select o.*,
      (o.warrant_mode in (
        'UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS',
        'UNTIL_ALL_INDEPENDENT_FINAL_RECEIPTS'
      )) internal_maintenance_scope_allowed,
      (o.warrant_mode='UNTIL_ALL_INDEPENDENT_FINAL_RECEIPTS')
         business_original_warrant_present,
      case
        when o.original_final_receipt_verified
          then 'RECONCILE_EXISTING_FINAL_RECEIPT_NO_REPLAY'
        when not o.source_proof_bound or not o.lineage_packet_found
          then 'REQUALIFY_EXACT_SOURCE_EVIDENCE_NO_NEW_AUTHORITY'
        when not o.case_specific_frozen_red_verified and o.recovery_terminal_boundary
          then 'QUALIFY_DISTINCT_RECOVERY_EVIDENCE_AND_EXACT_BUDGET_NO_REPLAY'
        when not o.case_specific_frozen_red_verified
             and o.prior_independent_maintenance_diagnostic_completed
          then 'VERIFY_DISTINCT_CASE_SPECIFIC_FROZEN_CI_REUSE_PRIOR_DIAGNOSTIC'
        when not o.case_specific_frozen_red_verified
          then 'COMPLETE_EXISTING_SIGNED_MAINTENANCE_FROZEN_CI'
        when not o.exact_goal_event_verified
             or not o.exact_acceptance_approval_verified
          then 'RECONCILE_EXISTING_EXACT_GOAL_ACCEPTANCE_NO_REPLAY'
        when o.warrant_mode<>'UNTIL_ALL_INDEPENDENT_FINAL_RECEIPTS'
          then 'REPORT_EXACT_BUSINESS_ORIGINAL_WARRANT_MISMATCH'
        when not o.original_claim_admitted
          then 'INDEPENDENTLY_ADMIT_EXISTING_SOURCE_BACKED_ORIGINAL'
        else 'USE_EXISTING_REGISTERED_FINAL_LOOP_CONTINUATION'
      end as prior_next_action,
      (o.accepted_review_scope is not null and o.source_proof_bound
       and o.lineage_packet_found and o.exact_goal_event_verified
       and o.exact_acceptance_approval_verified
       and not o.original_final_receipt_verified) as review_scope_qualified
    from observed o
  ), categorized as (
    select d.*,
     case when d.review_scope_qualified then 'VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM'
      else d.prior_next_action end as next_action
    from decision d
  ), assembled as (
    select d.*,pg_catalog.jsonb_build_object(
      'schema','reality-governed-qualifier-cross-layer-proof-v1',
      'shift_id',d.shift_id,'owner_id',d.owner_id,
      'plan_id',d.plan_id,'source_ref',d.source_ref,
      'original_candidate_work_id',d.parent_original_work_id,
      'source_manifest_sha256',d.source_manifest_sha256,
      'source_head_sha',d.source_head_sha,
      'expected_acceptance_contract_sha256',d.acceptance_digest,
      'source_proof_bound',d.source_proof_bound,
      'lineage_packet_found',d.lineage_packet_found,
      'recovery_terminal_boundary',d.recovery_terminal_boundary,
      'recovery_terminal_history',d.recovery_terminal_history,
      -- Retain the old maintenance decision and exhausted attempt history.
      -- Choosing read-only review qualification never restarts that repair.
      'maintenance_recovery_next_action',case when d.prior_next_action in
       ('QUALIFY_DISTINCT_RECOVERY_EVIDENCE_AND_EXACT_BUDGET_NO_REPLAY',
        'VERIFY_DISTINCT_CASE_SPECIFIC_FROZEN_CI_REUSE_PRIOR_DIAGNOSTIC',
        'COMPLETE_EXISTING_SIGNED_MAINTENANCE_FROZEN_CI') then d.prior_next_action else null end,
      'review_scope_qualified',d.review_scope_qualified,
      'review_authority_scope',case when d.review_scope_qualified
       then 'EXACT_ACCEPTED_READ_ONLY_REVIEW' else null end,
      'accepted_review_scope',case when d.review_scope_qualified then d.accepted_review_scope else null end,
      'prior_independent_maintenance_diagnostic_completed',
         d.prior_independent_maintenance_diagnostic_completed,
      'case_specific_frozen_red_verified',d.case_specific_frozen_red_verified,
      'exact_goal_event_verified',d.exact_goal_event_verified,
      'exact_acceptance_approval_verified',
         d.exact_acceptance_approval_verified,
      'warrant_mode',d.warrant_mode,
      'internal_maintenance_scope_allowed',d.internal_maintenance_scope_allowed,
      'business_original_warrant_present',d.business_original_warrant_present,
      'original_claim_admitted',d.original_claim_admitted,
      'original_final_receipt_verified',d.original_final_receipt_verified,
      'unsatisfied_gates',(select coalesce(pg_catalog.jsonb_agg(gate order by priority),'[]'::jsonb)
        from (values
          (1,'SOURCE_PROOF_MISMATCH',not d.source_proof_bound),
          (2,'SOURCE_LINEAGE_UNVERIFIED',not d.lineage_packet_found),
          (3,'CASE_SPECIFIC_FROZEN_RED_NOT_VERIFIED',not d.case_specific_frozen_red_verified),
          (4,'OWNER_GOAL_ACCEPTANCE_EVENT_MISSING',not d.exact_goal_event_verified),
          (8,'TERMINAL_BUILDER_DISTINCT_EVIDENCE_AND_BUDGET_REQUIRED',d.recovery_terminal_boundary and not d.case_specific_frozen_red_verified),
          (5,'EXACT_ACCEPTANCE_APPROVAL_MISSING',not d.exact_acceptance_approval_verified),
          (6,'BUSINESS_ORIGINAL_WARRANT_MISMATCH',not d.business_original_warrant_present),
          (7,'ORIGINAL_CLAIM_NOT_ADMITTED',not d.original_claim_admitted),
          (9,'EXACT_CANONICAL_REVIEW_CLAIM_REQUIRED',d.review_scope_qualified)
         ) as gates(priority,gate,unmet) where unmet and not d.original_final_receipt_verified),
      'next_action',d.next_action,
      'claim_created',false,'owner_approval_granted',false,
      'warrant_modified',false,'execution_authorized',false,
      'production_changed',false
    ) snapshot
    from categorized d
  ), signed as (
    select a.*, 'sha256:'||pg_catalog.encode(pg_catalog.sha256(
      pg_catalog.convert_to(a.snapshot::text,'UTF8')),'hex') receipt_hash
    from assembled a
  ), changed as (
    update reality_internal.owner_continuity_qualification_routes_v1 r
    set reconciliation_receipt_sha256=s.receipt_hash,
      reconciliation_snapshot=s.snapshot,
      reconciliation_next_action=s.next_action,
      reconciliation_checked_at=pg_catalog.clock_timestamp()
    from signed s
    where r.owner_id=s.owner_id
      and r.intake_family='SIGNED_SHIFT_SOURCE'
      and r.intake_key=s.shift_id::text||':'||s.step_index::text
      and r.source_ref=s.source_ref
      and (r.reconciliation_receipt_sha256 is distinct from s.receipt_hash
        or r.reconciliation_checked_at < pg_catalog.clock_timestamp()-interval '15 minutes'
        or r.reconciliation_checked_at is null)
    returning r.owner_id,r.reconciliation_receipt_sha256,r.reconciliation_next_action
  ) select count(*)::integer into v_changed from changed;

  select count(*)::integer into v_seen
  from reality_internal.owner_continuity_qualification_routes_v1 r
  where r.intake_family='SIGNED_SHIFT_SOURCE'
    and r.reconciliation_receipt_sha256 is not null
    and r.reconciliation_checked_at > pg_catalog.clock_timestamp()-interval '24 hours';
  return pg_catalog.jsonb_build_object(
    'status','GOVERNED_QUALIFIER_PROOF_RECONCILIATION_COMPLETE',
    'reconciled_sources_last_24h',v_seen,
    'updated_sources',v_changed,
    'scope','EVIDENCE_ONLY_NO_AUTHORITY_CHANGE',
    'automatic_execution_authorized',false,
    'new_original_admitted',false,
    'warrant_changed',false,
    'production_changed',false);
end;
$function$;

-- Keep the existing notifier definition identical across upgrade files.
ALTER TABLE reality_internal.governed_worker_release_approvals_v1
 ADD COLUMN IF NOT EXISTS provider_alias_observed_at timestamptz,
 ADD COLUMN IF NOT EXISTS provider_alias_observed_deployment_id text;
CREATE OR REPLACE FUNCTION reality_internal.notify_final_loop_governed_trigger_v1(p_shift_id uuid DEFAULT NULL)
 RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE w record; l record; e record; target text; token text; bypass text;
        req bigint; now_at timestamptz:=pg_catalog.clock_timestamp(); is_start boolean;
        approved_sha text; nonce uuid; wake_event_id uuid; release_claim uuid; review_release boolean:=false;
BEGIN
 -- Reuse the existing Vault credentials; never expose or copy their values.
 -- Transport is deliberately inert until an independently qualified canonical
 -- release is activated, its completed signed worker receipt is observed, and
 -- the exact release is pinned in the canonical transport configuration.
 SELECT max(decrypted_secret) FILTER (WHERE name='reality_final_loop_canonical_worker_url_v1'),
        max(decrypted_secret) FILTER (WHERE name='reality_riley_preview_worker_token_20261107'),
        max(decrypted_secret) FILTER (WHERE name='reality_riley_preview_vercel_bypass_20261107'),
        max(decrypted_secret) FILTER (WHERE name='reality_final_loop_canonical_worker_release_sha_v1')
 INTO target,token,bypass,approved_sha FROM vault.decrypted_secrets
 WHERE name IN ('reality_final_loop_canonical_worker_url_v1','reality_riley_preview_worker_token_20261107',
 'reality_riley_preview_vercel_bypass_20261107','reality_final_loop_canonical_worker_release_sha_v1');
 IF token IS NULL OR token !~ '^[a-f0-9]{64}$'
 OR bypass IS NULL OR length(bypass)<10 THEN RETURN NULL; END IF;
 -- Never preempt the actual running worker. The release trigger drains a new
 -- event after its lease is released, not after an arbitrary cooldown.
 SELECT * INTO l FROM reality_internal.governed_preview_shift_worker_leases_v1
 WHERE worker_key='preview-governed-employee-shift-worker' FOR UPDATE;
 -- Refresh the clock after waiting for the lease row: a release may have
 -- committed while this notifier was waiting for that same row lock.
 IF FOUND AND l.lease_expires_at>pg_catalog.clock_timestamp() THEN RETURN NULL;END IF;
 now_at:=pg_catalog.clock_timestamp();
 IF (SELECT count(*) FROM reality_internal.governed_employee_shifts_v1 s
     JOIN reality_internal.governed_employee_completion_warrants_v1 x
       ON x.shift_id=s.shift_id AND x.owner_id=s.owner_id AND x.plan_fingerprint=s.plan_fingerprint
     WHERE s.closed_at IS NULL AND s.authorized_at IS NOT NULL
       AND s.status IN ('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
       AND s.planned_start_at<=now_at AND s.planned_end_at='infinity'::timestamptz
       AND x.state='ACTIVE')<>1 THEN RETURN NULL; END IF;
 SELECT x.* INTO w FROM reality_internal.governed_employee_completion_warrants_v1 x
 JOIN reality_internal.governed_employee_shifts_v1 s
  ON s.shift_id=x.shift_id AND s.owner_id=x.owner_id AND s.plan_fingerprint=x.plan_fingerprint
 WHERE (p_shift_id IS NULL OR x.shift_id=p_shift_id)
  AND s.closed_at IS NULL AND s.authorized_at IS NOT NULL
  AND s.status IN ('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
  AND s.planned_start_at<=now_at AND s.planned_end_at='infinity'::timestamptz
  AND x.state='ACTIVE' AND x.mode IN ('UNTIL_ALL_INDEPENDENT_FINAL_RECEIPTS',
   'UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS')
  AND x.plan_fingerprint ~ '^sha256:[a-f0-9]{64}$'
 FOR UPDATE OF x SKIP LOCKED;
 IF NOT FOUND THEN RETURN NULL; END IF;
 -- A verified one-use review release supplies its own pinned alias/commit.
 -- The provider GET readback is recorded only by the trusted release
 -- controller after delivery. The receiver still must attest before work.
 SELECT a.claim_id,a.release_sha INTO release_claim,approved_sha
 FROM reality_internal.governed_worker_release_approvals_v1 a
 WHERE a.owner_id=w.owner_id AND a.shift_id=w.shift_id
 AND a.capability_key='VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM'
 AND a.state='CLAIMED_ONCE' AND a.claim_id IS NOT NULL
 AND a.scheduled_alias='reality-signed-worker-maloney2323-5310s-projects.vercel.app'
 AND a.provider_alias_observed_at>=a.claimed_at
 AND a.provider_alias_observed_deployment_id=a.runtime_scope->>'target_deployment_id'
 AND a.runtime_scope->>'exact_runtime_database_contract_verified'='true'
 AND a.runtime_scope->>'runtime_database_project_ref'='hvkfreoagbrphwghjajw'
 AND a.runtime_scope->>'child_execution_enabled'='false'
 AND a.runtime_scope->>'parent_delivery_enabled'='false'
 ORDER BY a.provider_alias_observed_at DESC LIMIT 1;
 IF FOUND THEN
  review_release:=true;
  target:='https://'||'reality-signed-worker-maloney2323-5310s-projects.vercel.app'||'/api/reality/governed-employee-shift-worker';
 ELSE
 -- Legacy releases still require their existing Vault pin and completed witness.
 SELECT max(decrypted_secret) FILTER(WHERE name='reality_final_loop_canonical_worker_url_v1'),
        max(decrypted_secret) FILTER(WHERE name='reality_final_loop_canonical_worker_release_sha_v1')
 INTO target,approved_sha FROM vault.decrypted_secrets
 WHERE name IN('reality_final_loop_canonical_worker_url_v1','reality_final_loop_canonical_worker_release_sha_v1');
 IF target IS DISTINCT FROM 'https://reality-signed-worker-maloney2323-5310s-projects.vercel.app/api/reality/governed-employee-shift-worker'
 OR approved_sha IS NULL OR approved_sha !~ '^[a-f0-9]{40}$' THEN RETURN NULL; END IF;
 SELECT a.claim_id INTO release_claim FROM reality_internal.governed_worker_release_approvals_v1 a
 WHERE a.owner_id=w.owner_id AND a.shift_id=w.shift_id AND a.release_sha=approved_sha
 AND a.state='CLAIMED_ONCE' AND a.scheduled_alias='reality-signed-worker-maloney2323-5310s-projects.vercel.app'
 AND a.runtime_scope->>'runtime_database_project_ref'='hvkfreoagbrphwghjajw'
 AND a.runtime_scope->>'child_execution_enabled'='false' AND a.runtime_scope->>'parent_delivery_enabled'='false'
 AND EXISTS(SELECT 1 FROM reality_internal.governed_signed_worker_release_wakes_v1 v
   JOIN reality_internal.signed_worker_actual_runs_v1 run ON run.run_id=v.worker_run_id
   WHERE v.release_claim_id=a.claim_id AND v.owner_id=w.owner_id AND v.shift_id=w.shift_id
   AND v.running_release_sha=a.release_sha AND v.running_release_ref=a.release_ref
   AND a.capability_key=ANY(v.registered_capabilities) AND run.status='COMPLETED'
   AND run.worker_stage='WORKER_RESPONSE_PUBLICATION' AND run.finished_at IS NOT NULL)
 ORDER BY a.claimed_at DESC LIMIT 1;
 IF NOT FOUND THEN RETURN NULL;END IF;
 END IF;
 is_start:=NOT review_release AND w.governed_start_requested_at IS NOT NULL AND w.governed_start_request_id IS NULL
  AND NOT EXISTS(SELECT 1 FROM reality_internal.governed_employee_shift_worker_pulses_v1 p
   WHERE p.shift_id=w.shift_id AND p.owner_id=w.owner_id
    AND p.last_worker_seen_at>=w.governed_start_requested_at);
 IF NOT is_start THEN
  -- Reuse the existing event inbox; one new current source receipt is a hint.
  -- The receiver MUST run the shared Continuity guard and governed policy again.
  SELECT ev.* INTO e FROM reality_internal.final_loop_resume_events_v1 ev
  JOIN reality_internal.final_loop_resume_conditions_v1 c
   ON c.owner_id=ev.owner_id AND c.shift_id=ev.shift_id AND c.original_work_id=ev.original_work_id
    AND c.source_ref=ev.source_ref AND c.condition_kind=ev.signal_kind
    AND c.continuity_revision=ev.continuity_revision
    AND c.continuity_head_sha256=ev.continuity_head_sha256
    AND c.subscribed_receipt_sha256=ev.previous_receipt_sha256
  WHERE ev.shift_id=w.shift_id AND ev.owner_id=w.owner_id AND ev.state='SHADOW_PENDING'
   AND ev.governed_wake_requested_at IS NOT NULL AND ev.governed_wake_request_id IS NULL
   AND ev.source_receipt_sha256<>ev.previous_receipt_sha256
   AND (NOT review_release OR (ev.signal_kind='QUALIFIER_PROOF_CHANGED'
    AND ev.signal_next_action='VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM'
    AND EXISTS(SELECT 1 FROM reality_internal.governed_worker_release_approvals_v1 a
     WHERE a.claim_id=release_claim AND a.runtime_scope->>'original_work_id'=ev.original_work_id
     AND a.runtime_scope->>'source_ref'=ev.source_ref)))
   -- A distinct current qualifier receipt at a terminal boundary can request
   -- evidence-only investigation. The worker MUST preserve the hard budget;
   -- the existing verifier route cannot dispatch old CI for this action.
   AND (ev.signal_kind='INDEPENDENT_FROZEN_CI_RECEIPT' OR
    (ev.signal_kind='QUALIFIER_PROOF_CHANGED' AND ev.signal_next_action IN
     ('VERIFY_DISTINCT_CASE_SPECIFIC_FROZEN_CI_REUSE_PRIOR_DIAGNOSTIC',
      'QUALIFY_DISTINCT_RECOVERY_EVIDENCE_AND_EXACT_BUDGET_NO_REPLAY',
      'VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM')))
   AND ev.event_causality_sha256='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
    ev.shift_id::text||'|'||ev.original_work_id||'|'||ev.continuity_head_sha256||'|'||
    ev.continuity_revision::text||'|'||ev.previous_receipt_sha256||'|'||ev.source_receipt_sha256,'UTF8')),'hex')
   AND EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(w.source_scope) item
    WHERE item->>'source_ref'=ev.source_ref)
   AND ((ev.signal_kind='QUALIFIER_PROOF_CHANGED' AND EXISTS(
     SELECT 1 FROM reality_internal.owner_continuity_qualification_routes_v1 q
     WHERE q.owner_id=ev.owner_id AND q.source_ref=ev.source_ref
      AND q.reconciliation_receipt_sha256=ev.source_receipt_sha256
      AND q.reconciliation_snapshot->>'shift_id'=ev.shift_id::text
      AND q.reconciliation_snapshot->>'original_candidate_work_id'=ev.original_work_id
      AND q.reconciliation_next_action=ev.signal_next_action
      AND (
       (ev.signal_next_action='VERIFY_DISTINCT_CASE_SPECIFIC_FROZEN_CI_REUSE_PRIOR_DIAGNOSTIC'
        AND NOT coalesce(q.reconciliation_snapshot->'unsatisfied_gates' ? 'TERMINAL_BUILDER_DISTINCT_EVIDENCE_AND_BUDGET_REQUIRED',false))
       OR (ev.signal_next_action='QUALIFY_DISTINCT_RECOVERY_EVIDENCE_AND_EXACT_BUDGET_NO_REPLAY'
        AND q.reconciliation_snapshot->>'recovery_terminal_boundary'='true'
        AND q.reconciliation_snapshot->'unsatisfied_gates' ? 'TERMINAL_BUILDER_DISTINCT_EVIDENCE_AND_BUDGET_REQUIRED'
        AND q.reconciliation_snapshot->'recovery_terminal_history'->>'original_work_id'=ev.original_work_id
        AND q.reconciliation_snapshot->'recovery_terminal_history'->>'remaining_attempts'='0'
        AND q.reconciliation_snapshot->'recovery_terminal_history'->>'replay_permitted'='false'
        AND q.reconciliation_snapshot->'recovery_terminal_history'->>'new_attempt_authorized'='false'
        AND q.reconciliation_snapshot->'recovery_terminal_history'->>'last_attempt_receipt_sha256' ~ '^sha256:[a-f0-9]{64}$'
        AND q.reconciliation_snapshot->'recovery_terminal_history'->>'last_decision_receipt_sha256' ~ '^sha256:[a-f0-9]{64}$')
       -- A different, independently accepted review effect may qualify
       -- even when its maintenance strategy is terminal. Do not transport
       -- it through an unqualified maintenance/packet-only release.
       OR (ev.signal_next_action='VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM'
        AND q.reconciliation_snapshot->>'review_scope_qualified'='true'
        AND q.reconciliation_snapshot->>'review_authority_scope'='EXACT_ACCEPTED_READ_ONLY_REVIEW'
        AND q.reconciliation_snapshot->>'exact_goal_event_verified'='true'
        AND q.reconciliation_snapshot->>'exact_acceptance_approval_verified'='true'
        AND q.reconciliation_snapshot->'accepted_review_scope'->>'effect_type'='READ_ONLY_INTERNAL_PR_REVIEW'
        AND q.reconciliation_snapshot->'accepted_review_scope'->>'owner_id'=ev.owner_id::text
        AND q.reconciliation_snapshot->'accepted_review_scope'->>'shift_id'=ev.shift_id::text
        AND q.reconciliation_snapshot->'accepted_review_scope'->>'parent_original_work_id'=ev.original_work_id
        AND q.reconciliation_snapshot->'accepted_review_scope'->>'source_ref'=ev.source_ref
        AND q.reconciliation_snapshot->'accepted_review_scope'->>'plan_fingerprint'=w.plan_fingerprint
        AND q.reconciliation_snapshot->'accepted_review_scope'->>'execution_authorized'='false'
        AND q.reconciliation_snapshot->'accepted_review_scope'->>'owner_approval_receipt_sha256' ~ '^sha256:[a-f0-9]{64}$'
        AND pg_catalog.to_regprocedure('public.reality_claim_final_loop_child_review_v1(uuid,uuid,jsonb)') IS NOT NULL
        AND EXISTS(SELECT 1 FROM reality_internal.governed_worker_release_approvals_v1 a
         WHERE a.claim_id=release_claim AND a.owner_id=ev.owner_id AND a.shift_id=ev.shift_id
          AND a.capability_key='VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM'
          AND a.runtime_scope->>'target_environment'='CANONICAL_BENCHMARK_PREVIEW'
          AND a.runtime_scope->>'original_work_id'=ev.original_work_id
          AND a.runtime_scope->>'source_ref'=ev.source_ref
          AND a.runtime_scope->>'plan_fingerprint'=w.plan_fingerprint
          AND a.runtime_scope->>'independent_qualification_branch_verified'='true'
          AND a.runtime_scope->>'independent_gateway_ci_verified'='true'
          AND a.runtime_scope->>'exact_runtime_database_contract_verified'='true'
          AND a.provider_alias_observed_at>=a.claimed_at
          AND a.provider_alias_observed_deployment_id=a.runtime_scope->>'target_deployment_id'
          AND a.runtime_scope->>'child_execution_enabled'='false'
          AND a.runtime_scope->>'parent_delivery_enabled'='false'
          AND a.runtime_scope->>'production_changed'='false'
          AND a.independent_isolation_proof_sha256 ~ '^sha256:[a-f0-9]{64}$')))
      AND q.reconciliation_receipt_sha256='sha256:'||pg_catalog.encode(pg_catalog.sha256(
        pg_catalog.convert_to(q.reconciliation_snapshot::text,'UTF8')),'hex')
    )) OR (ev.signal_kind='INDEPENDENT_FROZEN_CI_RECEIPT' AND EXISTS(
     SELECT 1 FROM reality_internal.owner_maintenance_independent_case_ci_v1 ci
     WHERE ci.owner_id=ev.owner_id AND ci.shift_id=ev.shift_id AND ci.source_ref=ev.source_ref
      AND ci.case_specific_ci_receipt_sha256=ev.source_receipt_sha256
      AND ci.source_epoch_frozen_red_verified AND ci.code_correction_green_verified
      AND NOT ci.original_customer_job_completed AND NOT ci.artifact_installation_authorized
      AND NOT ci.production_changed)))
  ORDER BY ev.created_at,ev.event_id LIMIT 1 FOR UPDATE OF ev SKIP LOCKED;
  IF NOT FOUND THEN RETURN NULL;END IF;
 END IF;
 -- A new authorized start or current evidence can clear only the idle cooldown.
 UPDATE reality_internal.governed_preview_shift_worker_leases_v1
 SET next_wake_at=now_at WHERE worker_key='preview-governed-employee-shift-worker'
  AND lease_expires_at<=now_at;
 nonce:=pg_catalog.gen_random_uuid();
 wake_event_id:=CASE WHEN is_start THEN w.shift_id ELSE e.event_id END;
 req:=net.http_post(url:=target,body:='{}'::jsonb,headers:=pg_catalog.jsonb_build_object(
  'Authorization','Bearer '||token,'x-vercel-protection-bypass',bypass,
  'Content-Type','application/json','x-reality-governed-owner-id',w.owner_id::text,
  'x-reality-governed-shift-id',w.shift_id::text,'x-reality-governed-plan-fingerprint',w.plan_fingerprint,
  'x-reality-governed-event-id',wake_event_id::text,'x-reality-governed-wake-nonce',nonce::text,
  'x-reality-governed-wake-kind',CASE WHEN is_start THEN 'START' ELSE 'RESUME' END,
  'x-reality-governed-release-sha',approved_sha),
  timeout_milliseconds:=45000);
 IF req IS NULL OR req<1 THEN RAISE EXCEPTION 'GOVERNED_WAKE_TRANSPORT_UNVERIFIED';END IF;
 IF is_start THEN
  UPDATE reality_internal.governed_employee_completion_warrants_v1
   SET governed_start_request_id=req,governed_start_queued_at=now_at,governed_start_nonce=nonce WHERE shift_id=w.shift_id;
 ELSE
  UPDATE reality_internal.final_loop_resume_events_v1
   SET governed_wake_request_id=req,governed_wake_queued_at=now_at,governed_wake_nonce=nonce WHERE event_id=e.event_id;
 END IF;
 RETURN req;
END $$;
REVOKE ALL ON FUNCTION reality_internal.notify_final_loop_governed_trigger_v1(uuid) FROM PUBLIC,anon,authenticated,service_role;
COMMIT;
