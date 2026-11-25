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
      end as next_action
    from observed o
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
          (7,'ORIGINAL_CLAIM_NOT_ADMITTED',not d.original_claim_admitted)
         ) as gates(priority,gate,unmet) where unmet and not d.original_final_receipt_verified),
      'next_action',d.next_action,
      'claim_created',false,'owner_approval_granted',false,
      'warrant_modified',false,'execution_authorized',false,
      'production_changed',false
    ) snapshot
    from decision d
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
