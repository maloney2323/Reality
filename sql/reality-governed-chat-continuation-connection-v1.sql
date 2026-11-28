-- Governed Chat continuation: replace the obsolete wake transport and reuse
-- the existing signed qualification -> continuation event -> broker pipeline.
-- No new worker, execution authority, budget reset, or historical replay.
-- Installation must be separately authorized for the benchmark database.

CREATE OR REPLACE FUNCTION public.reality_dispatch_existing_chat_maintenance_shift_v1(p_owner_id uuid, p_conversation_id uuid, p_request_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
 v_message record;v_shift record;v_existing record;
 v_created uuid;v_scope_count integer;
 v_clause text;
begin
 if current_user<>'service_role' or p_owner_id is null or
    p_conversation_id is null or p_request_id is null then
  raise exception 'CHAT_EXISTING_SHIFT_SIGNED_SERVICE_REQUIRED';
 end if;
 select m.id,m.content,m.created_at into v_message
 from public.reality_chat_messages m
 where m.user_id=p_owner_id and m.conversation_id=p_conversation_id
  and m.request_id=p_request_id and m.role='user' limit 1;
 if not found or v_message.content is null or
    length(v_message.content)>6000 or
    v_message.content !~*
     '^[[:space:]]*(reality[[:space:]]*[,.:]?[[:space:]]*)?(please[[:space:]]+)?(continue|resume|run|finish|execute)[[:space:]]+.{0,140}(shift|existing|original)' then
  return jsonb_build_object('status','CHAT_EXISTING_SHIFT_EXPLICIT_SIGNED_COMMAND_REQUIRED',
   'installation_authorized',false,'production_changed',false,
   'original_job_completed',false,'new_shift_started',false);
 end if;
 -- The owner may prohibit installation or production in a valid standing
 -- continuation instruction. The old whole-message keyword filter rejected
 -- "do not install without authorization" and silently disabled the signed
 -- worker route. Only independently NEGATED clauses are allowed here.
 -- Any affirmative or ambiguous high-consequence clause remains blocked.
 for v_clause in select pg_catalog.btrim(piece)
  from pg_catalog.regexp_split_to_table(v_message.content,
   '[.[:cntrl:];]+') as piece
 loop
  if v_clause ~* '(^|[^a-z])(install|deploy|production|approve)([^a-z]|$)'
   and (v_clause !~*
       '^[[:space:]]*(do[[:space:]]+not|don''t|never)[[:space:]]'
    or v_clause ~*
       '(^|[^a-z])(but|however|instead|then|also|afterward|unless|except)([^a-z]|$)')
  then
   return pg_catalog.jsonb_build_object(
    'status','CHAT_EXISTING_SHIFT_EXPLICIT_SIGNED_COMMAND_REQUIRED',
    'installation_authorized',false,'production_changed',false,
    'original_job_completed',false,'new_shift_started',false);
  end if;
 end loop;
 select s.shift_id,s.owner_id,s.authorized_at,w.source_scope into v_shift
 from reality_internal.governed_employee_shifts_v1 s
 join reality_internal.governed_employee_completion_warrants_v1 w
  on w.shift_id=s.shift_id and w.owner_id=s.owner_id
   and w.plan_fingerprint=s.plan_fingerprint
 where s.owner_id=p_owner_id and s.authorized_at is not null
  and s.closed_at is null and s.planned_start_at<=clock_timestamp()
  and s.planned_end_at='infinity'::timestamptz
  and s.status in ('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
  and w.state='ACTIVE'
  and w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
  and jsonb_typeof(w.source_scope)='array'
  and jsonb_array_length(w.source_scope) between 1 and 4
 order by s.planned_start_at limit 2;
 if not found then
  return jsonb_build_object('status','CHAT_EXISTING_SHIFT_NO_AUTHORIZED_MAINTENANCE_WARRANT',
   'installation_authorized',false,'production_changed',false,
   'original_job_completed',false,'new_shift_started',false);
 end if;
 if (select count(*) from reality_internal.governed_employee_shifts_v1 s
     join reality_internal.governed_employee_completion_warrants_v1 w
      on w.shift_id=s.shift_id and w.owner_id=s.owner_id
     where s.owner_id=p_owner_id and s.authorized_at is not null
      and s.closed_at is null and s.planned_end_at='infinity'::timestamptz
      and w.state='ACTIVE'
      and w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS')<>1 then
  return jsonb_build_object('status','CHAT_EXISTING_SHIFT_AMBIGUOUS_AUTHORIZED_SCOPE',
   'installation_authorized',false,'production_changed',false,
   'original_job_completed',false,'new_shift_started',false);
 end if;
 select count(*) into v_scope_count
 from pg_catalog.jsonb_array_elements(v_shift.source_scope) AS item(entry)
 join reality_internal.owner_internal_maintenance_jobs_v1 m
   on m.incident_id::text=item.entry->>'maintenance_id'
   and m.owner_id=p_owner_id
   and m.source_ref=item.entry->>'source_ref'
   and m.origin_shift_id::text=item.entry->>'origin_shift_id'
   and m.independent_review_receipt_sha256=
      item.entry->>'independent_review_receipt_sha256'
 where m.original_job_completed=false and m.production_changed=false;
 if v_scope_count<>jsonb_array_length(v_shift.source_scope) then
  return jsonb_build_object('status','CHAT_EXISTING_SHIFT_MAINTENANCE_SCOPE_DRIFT',
   'installation_authorized',false,'production_changed',false,
   'original_job_completed',false,'new_shift_started',false);
 end if;
 -- An authenticated continuation is a durable intent, not a worker lease.
 -- Preserve the original request and let the existing independent qualifier
 -- and governed-event broker decide if any work is currently permitted.
 if v_message.created_at<v_shift.authorized_at or not exists(
   select 1 from reality_internal.chat_work_handoffs_v1 h
   where h.message_id=v_message.id and h.owner_id=p_owner_id
    and h.conversation_id=p_conversation_id and h.request_id=p_request_id
    and h.message_sha256=pg_catalog.encode(pg_catalog.sha256(
      pg_catalog.convert_to(v_message.content,'UTF8')),'hex')
    and h.created_at>=v_shift.authorized_at
 ) then
  return jsonb_build_object('status','CHAT_EXISTING_SHIFT_SAVED_SOURCE_UNVERIFIED',
   'installation_authorized',false,'production_changed',false,
   'original_job_completed',false,'new_shift_started',false);
 end if;
 insert into reality_internal.owner_chat_existing_shift_wakes_v1(
  owner_id,conversation_id,request_id,shift_id,chat_source_ref)
 values(p_owner_id,p_conversation_id,p_request_id,v_shift.shift_id,
  'supabase:reality_chat_messages:'||v_message.id::text)
 on conflict do nothing returning owner_id into v_created;
 select w.shift_id,w.conversation_id,w.chat_source_ref,w.network_request_id
 into v_existing from reality_internal.owner_chat_existing_shift_wakes_v1 w
 where w.owner_id=p_owner_id and w.request_id=p_request_id;
 if not found or v_existing.shift_id<>v_shift.shift_id
  or v_existing.conversation_id<>p_conversation_id
  or v_existing.chat_source_ref<>'supabase:reality_chat_messages:'||v_message.id::text
 then raise exception 'CHAT_EXISTING_SHIFT_CONTINUATION_IDENTITY_MISMATCH';end if;
 return jsonb_build_object(
  'status','CHAT_EXISTING_SHIFT_CONTINUATION_INTENT_RECORDED',
  'owner_id',p_owner_id,'shift_id',v_shift.shift_id,'request_id',p_request_id,
  'source_ref',v_existing.chat_source_ref,
  'intent_recorded',true,'wake_enqueued',false,
  'worker_execution_verified',false,'execution_authorized',false,
  'installation_authorized',false,'production_changed',false,
  'original_job_completed',false,'new_shift_started',false);
end $function$;
REVOKE ALL ON FUNCTION public.reality_dispatch_existing_chat_maintenance_shift_v1(uuid,uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reality_dispatch_existing_chat_maintenance_shift_v1(uuid,uuid,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.reality_claim_signed_maintenance_chat_investigation_v1()
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
 chosen record;
 v_claim uuid;
 v_expiry timestamptz;
BEGIN
 IF current_user <> 'service_role' THEN
  RAISE EXCEPTION 'SIGNED_MAINTENANCE_CHAT_SERVICE_ROLE_REQUIRED';
 END IF;
 SELECT i.message_id,i.owner_id,i.conversation_id,i.request_id,
  i.message_sha256,m.content AS message,
  sh.shift_id,sh.plan_fingerprint,w.source_scope
 INTO chosen
 FROM reality_internal.chat_work_handoffs_v1 i
 JOIN public.reality_chat_messages m
  ON m.id=i.message_id AND m.user_id=i.owner_id
   AND m.conversation_id=i.conversation_id
   AND m.request_id=i.request_id AND m.role='user'
 JOIN LATERAL (
  SELECT s.shift_id,s.owner_id,s.plan_fingerprint,s.authorized_at
  FROM reality_internal.governed_employee_shifts_v1 s
  WHERE s.owner_id=i.owner_id AND s.authorized_at IS NOT NULL
   AND s.closed_at IS NULL
   AND s.status IN ('RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
   AND s.planned_start_at<=clock_timestamp()
   AND s.planned_end_at>clock_timestamp()
  ORDER BY s.authorized_at DESC LIMIT 1
 ) sh ON true
 JOIN reality_internal.governed_employee_completion_warrants_v1 w
  ON w.shift_id=sh.shift_id AND w.owner_id=sh.owner_id
  AND w.plan_fingerprint=sh.plan_fingerprint
  AND w.state='ACTIVE'
  AND w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
 WHERE i.status='PENDING'
  AND i.message_sha256=pg_catalog.encode(pg_catalog.sha256(
   pg_catalog.convert_to(m.content,'UTF8')),'hex')
  AND pg_catalog.jsonb_typeof(w.source_scope)='array'
  AND pg_catalog.jsonb_array_length(w.source_scope) BETWEEN 1 AND 4
  AND char_length(m.content) BETWEEN 1 AND 6000
  -- Intake is advisory only. The existing bounded worker classifier
  -- distinguishes conversation, existing work and missing exact scope.
  -- No magic sentence, product name, PR format or UUID is required.
  -- Never turn pre-authorization historical conversation into shift work.
  AND i.created_at>=sh.authorized_at
  -- Use the existing signed continuation-intent record; a generic Chat turn,
  -- installation approval, or older instruction cannot preempt this request.
  AND EXISTS (
   SELECT 1 FROM reality_internal.owner_chat_existing_shift_wakes_v1 intent
   WHERE intent.owner_id=i.owner_id AND intent.shift_id=sh.shift_id
    AND intent.conversation_id=i.conversation_id AND intent.request_id=i.request_id
    AND intent.chat_source_ref='supabase:reality_chat_messages:'||i.message_id::text
    AND intent.queued_at>=sh.authorized_at
    AND NOT EXISTS (
     SELECT 1 FROM reality_internal.owner_chat_existing_shift_wakes_v1 newer
     WHERE newer.owner_id=intent.owner_id AND newer.shift_id=intent.shift_id
      AND (newer.queued_at,newer.request_id)>(intent.queued_at,intent.request_id)
    )
  )
  -- Do not infer which shift is intended when multiple active windows exist.
  AND NOT EXISTS (
   SELECT 1 FROM reality_internal.governed_employee_shifts_v1 other
   JOIN reality_internal.governed_employee_completion_warrants_v1 ow
    ON ow.shift_id=other.shift_id AND ow.owner_id=other.owner_id
     AND ow.plan_fingerprint=other.plan_fingerprint AND ow.state='ACTIVE'
   WHERE other.owner_id=i.owner_id AND other.shift_id<>sh.shift_id
    AND other.authorized_at IS NOT NULL AND other.closed_at IS NULL
    AND other.status IN ('RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
    AND other.planned_start_at<=clock_timestamp()
    AND other.planned_end_at>clock_timestamp()
  )
  -- Independently recheck ALL frozen source-scoped maintenance receipts,
  -- rather than trusting the owner's wording or model interpretation.
  AND (
   SELECT count(*)
   FROM pg_catalog.jsonb_array_elements(w.source_scope) scope(entry)
   JOIN reality_internal.owner_internal_maintenance_jobs_v1 incident
    ON incident.incident_id::text=scope.entry->>'maintenance_id'
    AND incident.owner_id=i.owner_id
    AND incident.source_ref=scope.entry->>'source_ref'
    AND incident.origin_shift_id::text=scope.entry->>'origin_shift_id'
    AND incident.independent_review_receipt_sha256=
     scope.entry->>'independent_review_receipt_sha256'
    AND incident.original_job_completed IS FALSE
    AND incident.production_changed IS FALSE
  )=pg_catalog.jsonb_array_length(w.source_scope)
 ORDER BY i.created_at DESC,i.message_id DESC
 LIMIT 1
 FOR UPDATE OF i SKIP LOCKED;
 IF NOT FOUND THEN
  RETURN pg_catalog.jsonb_build_object(
   'status','NO_PENDING_SIGNED_MAINTENANCE_CHAT_INVESTIGATION',
   'execution_authorized',false,'new_shift_started',false,
   'installation_authorized',false,'original_job_completed',false,
   'production_changed',false
  );
 END IF;

 v_claim:=pg_catalog.gen_random_uuid();
 v_expiry:=clock_timestamp()+interval '5 minutes';
 UPDATE reality_internal.chat_work_handoffs_v1
 SET status='CLAIMED',claim_id=v_claim,claimed_at=clock_timestamp(),
  claim_expires_at=v_expiry,shift_id=chosen.shift_id,
  plan_fingerprint=chosen.plan_fingerprint
 WHERE message_id=chosen.message_id AND status='PENDING';
 IF NOT FOUND THEN RAISE EXCEPTION 'MAINTENANCE_CHAT_ATOMIC_CLAIM_LOST'; END IF;
 RETURN pg_catalog.jsonb_build_object(
  'status','AUTHENTICATED_CHAT_WORK_LEASED_TO_EXISTING_SHIFT',
  'message_id',chosen.message_id,'owner_id',chosen.owner_id,
  'conversation_id',chosen.conversation_id,
  'request_id',chosen.request_id,
  'message_sha256',chosen.message_sha256,
  'message',chosen.message,'shift_id',chosen.shift_id,
  'plan_fingerprint',chosen.plan_fingerprint,
  'source_scope',chosen.source_scope,
  'claim_id',v_claim,'claim_expires_at',v_expiry,
  'investigation_only',true,
  'new_job_created',false,'execution_authorized',false,
  'new_shift_started',false,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false
 );
END $function$;
REVOKE ALL ON FUNCTION public.reality_claim_signed_maintenance_chat_investigation_v1() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reality_claim_signed_maintenance_chat_investigation_v1() TO service_role;

-- Scoped on-demand qualification uses the same independent proof computation.
-- The legacy zero-argument scheduled caller is retained as a watchdog only.
CREATE OR REPLACE FUNCTION reality_internal.reconcile_current_qualification_proofs_v1(p_shift_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SET search_path TO '' AS $function$
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
    where (p_shift_id is null or p.shift_id=p_shift_id)
      and p.parent_original_work_id ~ '^work:[a-f0-9]{32}$'
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
     count(*) filter(where d.review_scope_qualified) over(partition by d.owner_id,d.shift_id) as qualified_review_count,
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
    ) || case when chat.intent_receipt is null then '{}'::jsonb else
      pg_catalog.jsonb_build_object('authenticated_chat_continuation',chat.intent_receipt) end as snapshot
    from categorized d
    -- Chat supplies only a new independently read saved-intent receipt. Its
    -- text does not supply a review result, a warrant or the source identity.
    -- If several original reviews are qualified, do not guess the target.
    left join lateral (
      select pg_catalog.jsonb_build_object(
       'owner_id',w.owner_id,'shift_id',w.shift_id,'request_id',w.request_id,
       'conversation_id',w.conversation_id,'message_id',i.message_id,
       'message_sha256',i.message_sha256,'original_work_id',d.parent_original_work_id,
       'source_ref',d.source_ref,'intent_only',true,'execution_authorized',false
      ) as intent_receipt
      from reality_internal.owner_chat_existing_shift_wakes_v1 w
      join reality_internal.chat_work_handoffs_v1 i on i.owner_id=w.owner_id
       and i.request_id=w.request_id and i.conversation_id=w.conversation_id
       and w.chat_source_ref='supabase:reality_chat_messages:'||i.message_id::text
      join public.reality_chat_messages m on m.id=i.message_id and m.user_id=i.owner_id
       and m.request_id=i.request_id and m.conversation_id=i.conversation_id and m.role='user'
      join reality_internal.governed_employee_shifts_v1 sh on sh.shift_id=w.shift_id
       and sh.owner_id=w.owner_id and sh.plan_fingerprint=d.plan_fingerprint
      where d.review_scope_qualified and d.qualified_review_count=1
       and w.owner_id=d.owner_id and w.shift_id=d.shift_id
       and w.queued_at>=sh.authorized_at and i.created_at>=sh.authorized_at
       and m.created_at>=sh.authorized_at
       and i.message_sha256=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(m.content,'UTF8')),'hex')
       and not exists(select 1 from reality_internal.owner_chat_existing_shift_wakes_v1 newer
         where newer.owner_id=w.owner_id and newer.shift_id=w.shift_id
          and (newer.queued_at,newer.request_id)>(w.queued_at,w.request_id))
      limit 1
    ) chat on true
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
        or (p_shift_id is not null and r.reconciliation_checked_at < pg_catalog.clock_timestamp()-interval '10 minutes')
        or (p_shift_id is null and r.reconciliation_checked_at < pg_catalog.clock_timestamp()-interval '15 minutes')
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
REVOKE ALL ON FUNCTION reality_internal.reconcile_current_qualification_proofs_v1(uuid) FROM PUBLIC,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION reality_internal.reconcile_current_qualification_proofs_v1()
 RETURNS jsonb LANGUAGE plpgsql SET search_path TO '' AS $function$
BEGIN RETURN reality_internal.reconcile_current_qualification_proofs_v1(NULL::uuid); END $function$;
REVOKE ALL ON FUNCTION reality_internal.reconcile_current_qualification_proofs_v1() FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION reality_internal.on_final_loop_governed_wake_v1()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE ledger_stage jsonb;
BEGIN
 -- Reuse the existing governed qualifier on receipt of a saved continuation.
 -- This is not a second executor, a direct HTTP wake, or an authority grant.
 IF TG_TABLE_NAME='owner_chat_existing_shift_wakes_v1' THEN
  BEGIN
   PERFORM reality_internal.reconcile_current_qualification_proofs_v1(NEW.shift_id);
  EXCEPTION WHEN OTHERS THEN
   RAISE WARNING 'CHAT_CONTINUATION_QUALIFICATION_PENDING_DURABLE_INTENT_RETAINED';
  END;
  RETURN NEW;
 END IF;
 IF TG_TABLE_NAME='governed_employee_completion_warrants_v1' THEN
  UPDATE reality_internal.governed_employee_completion_warrants_v1
   SET governed_start_requested_at=pg_catalog.clock_timestamp() WHERE shift_id=NEW.shift_id;
 ELSIF TG_TABLE_NAME='final_loop_resume_events_v1' THEN
  UPDATE reality_internal.final_loop_resume_events_v1
   SET governed_wake_requested_at=pg_catalog.clock_timestamp() WHERE event_id=NEW.event_id;
 END IF;
 -- Notification failures must not roll back durable authorization or evidence.
 BEGIN
  IF TG_TABLE_NAME='governed_worker_release_approvals_v1' THEN
   -- A verified release observation is a concrete proof demand. Recompute the
   -- existing source inventory for this shift before either continuation path.
   PERFORM reality_internal.reconcile_current_qualification_proofs_v1(NEW.shift_id);
   IF NEW.capability_key='VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM' THEN
    ledger_stage:=public.reality_stage_final_loop_ledger_return_v1(NEW.shift_id,NEW.claim_id);
   END IF;
   -- The qualified evidence-return route takes precedence. Never create an
   -- ordinary continuation alongside the distinct evidence-only event.
   IF coalesce(ledger_stage->>'status','') NOT IN
    ('LEDGER_RETURN_EVENT_STAGED','LEDGER_RETURN_CONDITION_ALREADY_STAGED_NO_REPLAY') THEN
    PERFORM reality_internal.stage_final_loop_release_continuation_v1(NEW.request_id);
   END IF;
   PERFORM reality_internal.notify_final_loop_governed_trigger_v1(NEW.shift_id);
  ELSIF TG_TABLE_NAME='signed_worker_actual_runs_v1' THEN
   -- Only a completed investigation may request a distinct review run.
   IF NEW.status='COMPLETED' AND OLD.status='STARTED'
    AND (NEW.worker_stage='SUSPENSION_INVESTIGATION_RESPONSE_PUBLICATION'
     OR (NEW.worker_stage='WORKER_RESPONSE_PUBLICATION' AND EXISTS(
       SELECT 1 FROM reality_internal.owner_shift_continuity_incidents_v1 i
        WHERE i.source_evidence->>'worker_run_id'=NEW.run_id::text
         AND i.source_evidence->>'blocker_code'='FINAL_LOOP_UNRESOLVED_INVOCATION_INVESTIGATION_REQUIRED'
         AND i.phase='INVESTIGATION_RECORDED_NEEDS_INDEPENDENT_PROOF'))) THEN
    PERFORM reality_internal.stage_final_loop_independent_investigation_review_v1(a.request_id)
    FROM reality_internal.governed_signed_worker_release_wakes_v1 w
    JOIN reality_internal.governed_worker_release_approvals_v1 a ON a.claim_id=w.release_claim_id
    WHERE w.worker_run_id=NEW.run_id AND w.operating_lane='NORMAL_SIGNED_SHIFT';
   ELSIF NEW.status='COMPLETED' AND OLD.status='STARTED'
    AND NEW.worker_stage='INDEPENDENT_INVESTIGATION_REVIEW_RESPONSE_PUBLICATION' THEN
    PERFORM reality_internal.stage_final_loop_terminal_technical_evidence_v1(a.request_id)
    FROM reality_internal.governed_signed_worker_release_wakes_v1 w
    JOIN reality_internal.governed_worker_release_approvals_v1 a ON a.claim_id=w.release_claim_id
    WHERE w.worker_run_id=NEW.run_id AND w.operating_lane='NORMAL_SIGNED_SHIFT';
   END IF;
  ELSIF TG_TABLE_NAME='governed_preview_shift_worker_leases_v1' THEN
   IF NEW.released_at IS NOT NULL AND OLD.released_at IS DISTINCT FROM NEW.released_at THEN
    PERFORM reality_internal.notify_final_loop_governed_trigger_v1(NULL);
   END IF;
  ELSE
   PERFORM reality_internal.notify_final_loop_governed_trigger_v1(NEW.shift_id);
  END IF;
 EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'GOVERNED_WAKE_NOT_QUEUED_DURABLE_STATE_RETAINED';
 END;
 RETURN NEW;
END $function$;
REVOKE ALL ON FUNCTION reality_internal.on_final_loop_governed_wake_v1() FROM PUBLIC,anon,authenticated,service_role;
DROP TRIGGER IF EXISTS final_loop_governed_chat_continuation_v1 ON reality_internal.owner_chat_existing_shift_wakes_v1;
CREATE TRIGGER final_loop_governed_chat_continuation_v1
 AFTER INSERT ON reality_internal.owner_chat_existing_shift_wakes_v1
 FOR EACH ROW EXECUTE FUNCTION reality_internal.on_final_loop_governed_wake_v1();
