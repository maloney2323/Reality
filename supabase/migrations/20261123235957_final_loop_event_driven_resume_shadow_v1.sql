-- Reality Final Loop — event-driven resume shadow contract
-- Canonical source is the installed, service-only Supabase schema.
-- This migration is replay-safe and DOES NOT deliver events, execute
-- capabilities, grant installation authority, or retire the signed cron.
-- Requires previously installed Final Loop canonical proof reader and
-- governed qualifier reconciliation. No PR-specific IDs are embedded.

CREATE TABLE IF NOT EXISTS reality_internal.final_loop_resume_conditions_v1 (
  shift_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  original_work_id text NOT NULL,
  source_ref text NOT NULL,
  condition_kind text DEFAULT 'QUALIFIER_PROOF_CHANGED'::text NOT NULL,
  subscribed_receipt_sha256 text NOT NULL,
  continuity_head_sha256 text NOT NULL,
  continuity_revision bigint NOT NULL,
  next_qualified_action text NOT NULL,
  unresolved_proof_gates jsonb NOT NULL,
  proposed_transition text NOT NULL,
  state text DEFAULT 'SUSPENDED'::text NOT NULL,
  last_signaled_receipt_sha256 text,
  registered_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
  updated_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
  CONSTRAINT final_loop_resume_conditions_last_signaled_receipt_sha256_check CHECK ((last_signaled_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'::text)),
  CONSTRAINT final_loop_resume_conditions_v1_condition_kind_check CHECK ((condition_kind = ANY (ARRAY['QUALIFIER_PROOF_CHANGED'::text, 'INDEPENDENT_FROZEN_CI_RECEIPT'::text]))),
  CONSTRAINT final_loop_resume_conditions_v1_continuity_head_sha256_check CHECK ((continuity_head_sha256 ~ '^sha256:[a-f0-9]{64}$'::text)),
  CONSTRAINT final_loop_resume_conditions_v1_continuity_revision_check CHECK ((continuity_revision > 0)),
  CONSTRAINT final_loop_resume_conditions_v1_next_qualified_action_check CHECK ((next_qualified_action ~ '^[A-Z][A-Z0-9_]{5,120}$'::text)),
  CONSTRAINT final_loop_resume_conditions_v1_original_work_id_check CHECK ((original_work_id ~ '^work:[a-f0-9]{32}$'::text)),
  CONSTRAINT final_loop_resume_conditions_v1_pkey PRIMARY KEY (shift_id, original_work_id, condition_kind),
  CONSTRAINT final_loop_resume_conditions_v1_proposed_transition_check CHECK ((proposed_transition = ANY (ARRAY['RECOVER'::text, 'SUSPEND'::text]))),
  CONSTRAINT final_loop_resume_conditions_v1_source_ref_check CHECK ((source_ref ~ '^https://github[.]com/[^/]+/[^/]+/(pull|issues)/[1-9][0-9]*$'::text)),
  CONSTRAINT final_loop_resume_conditions_v1_state_check CHECK ((state = ANY (ARRAY['SUSPENDED'::text, 'SHADOW_SIGNALED'::text]))),
  CONSTRAINT final_loop_resume_conditions_v1_subscribed_receipt_sha256_check CHECK ((subscribed_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'::text)),
  CONSTRAINT final_loop_resume_conditions_v1_unresolved_proof_gates_check CHECK ((jsonb_typeof(unresolved_proof_gates) = 'array'::text))
);

ALTER TABLE reality_internal.final_loop_resume_conditions_v1 ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON reality_internal.final_loop_resume_conditions_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON reality_internal.final_loop_resume_conditions_v1 TO service_role;

CREATE TABLE IF NOT EXISTS reality_internal.final_loop_resume_events_v1 (
  event_id uuid DEFAULT gen_random_uuid() NOT NULL,
  shift_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  original_work_id text NOT NULL,
  source_ref text NOT NULL,
  signal_kind text NOT NULL,
  source_receipt_sha256 text NOT NULL,
  previous_receipt_sha256 text NOT NULL,
  event_causality_sha256 text NOT NULL,
  continuity_head_sha256 text NOT NULL,
  continuity_revision bigint NOT NULL,
  signal_next_action text NOT NULL,
  state text DEFAULT 'SHADOW_PENDING'::text NOT NULL,
  observed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
  CONSTRAINT final_loop_resume_events_v1_continuity_head_sha256_check CHECK ((continuity_head_sha256 ~ '^sha256:[a-f0-9]{64}$'::text)),
  CONSTRAINT final_loop_resume_events_v1_continuity_revision_check CHECK ((continuity_revision > 0)),
  CONSTRAINT final_loop_resume_events_v1_event_causality_sha256_check CHECK ((event_causality_sha256 ~ '^sha256:[a-f0-9]{64}$'::text)),
  CONSTRAINT final_loop_resume_events_v1_original_work_id_check CHECK ((original_work_id ~ '^work:[a-f0-9]{32}$'::text)),
  CONSTRAINT final_loop_resume_events_v1_pkey PRIMARY KEY (event_id),
  CONSTRAINT final_loop_resume_events_v1_previous_receipt_sha256_check CHECK ((previous_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'::text)),
  CONSTRAINT final_loop_resume_events_v1_shift_id_original_work_id_sign_fkey FOREIGN KEY (shift_id, original_work_id, signal_kind) REFERENCES reality_internal.final_loop_resume_conditions_v1(shift_id, original_work_id, condition_kind),
  CONSTRAINT final_loop_resume_events_v1_shift_id_original_work_id_signa_key UNIQUE (shift_id, original_work_id, signal_kind, source_receipt_sha256),
  CONSTRAINT final_loop_resume_events_v1_signal_kind_check CHECK ((signal_kind = ANY (ARRAY['QUALIFIER_PROOF_CHANGED'::text, 'INDEPENDENT_FROZEN_CI_RECEIPT'::text]))),
  CONSTRAINT final_loop_resume_events_v1_source_receipt_sha256_check CHECK ((source_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'::text)),
  CONSTRAINT final_loop_resume_events_v1_state_check CHECK ((state = ANY (ARRAY['SHADOW_PENDING'::text, 'SHADOW_OBSERVED'::text, 'SHADOW_STALE'::text])))
);

ALTER TABLE reality_internal.final_loop_resume_events_v1 ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON reality_internal.final_loop_resume_events_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON reality_internal.final_loop_resume_events_v1 TO service_role;

CREATE INDEX IF NOT EXISTS final_loop_resume_events_shadow_pending_v1 ON reality_internal.final_loop_resume_events_v1 USING btree (shift_id, created_at) WHERE (state = 'SHADOW_PENDING'::text);

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
 SELECT coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'event_id',e.event_id,'original_work_id',e.original_work_id,
  'source_ref',e.source_ref,'event_kind',e.signal_kind,
  'source_receipt_sha256',e.source_receipt_sha256,
  'event_causality_sha256',e.event_causality_sha256,
  'event_state',e.state,
  'continuity_revision',e.continuity_revision,

  'source_current',case
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
   end,

  'would_resume_suspended_obligation',e.state='SHADOW_PENDING' AND
   e.continuity_revision=(v_proof->>'revision')::bigint AND
   e.continuity_head_sha256=v_proof->>'continuity_head_sha256' AND
  case when e.signal_kind='INDEPENDENT_FROZEN_CI_RECEIPT' then exists(
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
  end
 ) ORDER BY e.created_at),'[]'::jsonb) INTO v_events
 FROM reality_internal.final_loop_resume_events_v1 e
 WHERE e.shift_id=p_shift_id AND e.owner_id=(v_proof->>'owner_id')::uuid;
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

CREATE OR REPLACE FUNCTION reality_internal.on_final_loop_independent_frozen_ci_v1()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_sub reality_internal.final_loop_resume_conditions_v1%rowtype;
        v_event uuid;v_hash text;
BEGIN
 IF NEW.source_epoch_frozen_red_verified IS NOT TRUE
  OR NEW.code_correction_green_verified IS NOT TRUE
  OR NEW.original_customer_job_completed IS NOT FALSE
  OR NEW.artifact_installation_authorized IS NOT FALSE
  OR NEW.production_changed IS NOT FALSE
  OR NEW.case_specific_ci_receipt_sha256 !~ '^sha256:[a-f0-9]{64}$'
  OR NEW.github_run_id<1 OR NEW.github_job_id<1
  OR NEW.github_artifact_id<1
  OR NEW.github_artifact_digest !~ '^sha256:[a-f0-9]{64}$'
 THEN RETURN NEW;END IF;
 SELECT * INTO v_sub
 FROM reality_internal.final_loop_resume_conditions_v1 s
 WHERE s.condition_kind='INDEPENDENT_FROZEN_CI_RECEIPT'
  AND s.shift_id=NEW.shift_id AND s.owner_id=NEW.owner_id
  AND s.source_ref=NEW.source_ref
  AND s.subscribed_receipt_sha256<>NEW.case_specific_ci_receipt_sha256
  AND EXISTS(
   SELECT 1 FROM reality_internal.owner_internal_maintenance_jobs_v1 m
   JOIN reality_internal.owner_maintenance_signed_repair_handoffs_v1 h
    ON h.maintenance_id=m.incident_id AND h.owner_id=m.owner_id
     AND h.shift_id=s.shift_id AND h.source_ref=m.source_ref
   WHERE m.incident_id=NEW.maintenance_id AND m.owner_id=s.owner_id
    AND m.claimed_shift_id=s.shift_id AND m.source_ref=s.source_ref
    AND h.source_epoch_receipt_sha256=NEW.source_epoch_receipt_sha256
    AND h.handoff_receipt_sha256=NEW.signed_repair_handoff_receipt_sha256
    AND m.original_job_completed=false AND m.production_changed=false
  )
  AND EXISTS(
   SELECT 1 FROM reality_internal.governed_employee_shifts_v1 sh
   JOIN reality_internal.governed_employee_completion_warrants_v1 w
    ON w.shift_id=sh.shift_id AND w.owner_id=sh.owner_id
      AND w.plan_fingerprint=sh.plan_fingerprint
   WHERE sh.shift_id=s.shift_id AND sh.owner_id=s.owner_id
     AND sh.closed_at IS NULL AND sh.authorized_at IS NOT NULL
     AND w.state='ACTIVE'
     AND w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
  )
 FOR UPDATE OF s;
 IF NOT FOUND THEN RETURN NEW;END IF;
 v_hash:='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
  v_sub.shift_id::text||'|'||v_sub.original_work_id||'|'||
  v_sub.continuity_head_sha256||'|'||v_sub.continuity_revision::text||'|'||
  v_sub.subscribed_receipt_sha256||'|'||NEW.case_specific_ci_receipt_sha256,
  'UTF8')),'hex');
 INSERT INTO reality_internal.final_loop_resume_events_v1(
  shift_id,owner_id,original_work_id,source_ref,signal_kind,
  source_receipt_sha256,previous_receipt_sha256,event_causality_sha256,
  continuity_head_sha256,continuity_revision,signal_next_action
 ) VALUES (
  v_sub.shift_id,v_sub.owner_id,v_sub.original_work_id,v_sub.source_ref,
  'INDEPENDENT_FROZEN_CI_RECEIPT',NEW.case_specific_ci_receipt_sha256,
  v_sub.subscribed_receipt_sha256,v_hash,
  v_sub.continuity_head_sha256,v_sub.continuity_revision,
  'INDEPENDENT_CASE_CI_VERIFIED_REEVALUATE_SAME_ORIGINAL'
 ) ON CONFLICT DO NOTHING RETURNING event_id INTO v_event;
 IF v_event IS NOT NULL THEN
 UPDATE reality_internal.final_loop_resume_conditions_v1
 SET state='SHADOW_SIGNALED',
   last_signaled_receipt_sha256=NEW.case_specific_ci_receipt_sha256,
   updated_at=pg_catalog.clock_timestamp()
 WHERE shift_id=v_sub.shift_id
  AND original_work_id=v_sub.original_work_id
  AND condition_kind=v_sub.condition_kind;
 END IF;
 RETURN NEW;
END $function$;

REVOKE ALL ON FUNCTION reality_internal.on_final_loop_independent_frozen_ci_v1() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION reality_internal.on_final_loop_qualifier_receipt_change_v1()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_sub reality_internal.final_loop_resume_conditions_v1%rowtype;
        v_hash text;v_new_event uuid;
BEGIN
 -- Only a NEW independently reconciled digest is a wake condition.
 -- The recurring qualifier's unchanged heartbeat is not an event.
 IF NEW.reconciliation_receipt_sha256 IS NULL OR
    NEW.reconciliation_receipt_sha256=OLD.reconciliation_receipt_sha256 OR
    NEW.reconciliation_receipt_sha256 !~ '^sha256:[a-f0-9]{64}$'
 THEN RETURN NEW; END IF;

 -- The sole trusted scheduled qualifier computes a deterministic receipt
 -- from the canonical JSON snapshot; arbitrary updates are not events.
 IF NEW.intake_family<>'SIGNED_SHIFT_SOURCE'
   OR NEW.reconciliation_snapshot->>'schema'<>'reality-governed-qualifier-cross-layer-proof-v1'
   OR NEW.reconciliation_snapshot->>'next_action'
       IS DISTINCT FROM NEW.reconciliation_next_action
   OR NEW.reconciliation_receipt_sha256 IS DISTINCT FROM
      'sha256:'||pg_catalog.encode(pg_catalog.sha256(
       pg_catalog.convert_to(NEW.reconciliation_snapshot::text,'UTF8')),'hex')
   OR NEW.reconciliation_snapshot->>'shift_id' IS NULL
   OR NEW.reconciliation_snapshot->>'original_candidate_work_id' IS NULL
   OR NEW.reconciliation_snapshot->>'source_proof_bound'<>'true'
   OR NEW.reconciliation_snapshot->>'lineage_packet_found'<>'true'
   OR NEW.reconciliation_snapshot->>'original_final_receipt_verified'<>'false'
   OR NEW.reconciliation_checked_at<pg_catalog.clock_timestamp()-interval '10 minutes'
   OR NEW.reconciliation_checked_at>pg_catalog.clock_timestamp()+interval '1 minute'
 THEN RETURN NEW; END IF;
 IF NEW.reconciliation_snapshot->>'source_ref' IS DISTINCT FROM NEW.source_ref
    OR NEW.reconciliation_snapshot->>'owner_id' IS DISTINCT FROM NEW.owner_id::text
    OR NEW.reconciliation_snapshot->>'shift_id' IS NULL
    OR NEW.reconciliation_next_action IS NULL
 THEN RETURN NEW; END IF;
 SELECT * INTO v_sub FROM reality_internal.final_loop_resume_conditions_v1 sub
 WHERE sub.owner_id=NEW.owner_id AND sub.source_ref=NEW.source_ref
  AND sub.original_work_id=NEW.reconciliation_snapshot->>'original_candidate_work_id'
  AND sub.shift_id=(NEW.reconciliation_snapshot->>'shift_id')::uuid
  AND sub.condition_kind='QUALIFIER_PROOF_CHANGED'
  AND sub.subscribed_receipt_sha256<>NEW.reconciliation_receipt_sha256
  AND EXISTS(
   SELECT 1 FROM reality_internal.governed_employee_shifts_v1 s
   JOIN reality_internal.governed_employee_completion_warrants_v1 w
    ON w.shift_id=s.shift_id AND w.owner_id=s.owner_id
     AND w.plan_fingerprint=s.plan_fingerprint
   WHERE s.shift_id=sub.shift_id AND s.owner_id=sub.owner_id
    AND s.authorized_at IS NOT NULL AND s.closed_at IS NULL
    AND s.status IN ('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
    AND w.state='ACTIVE'
  ) FOR UPDATE OF sub;
 IF NOT FOUND THEN RETURN NEW; END IF;
 v_hash:='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
  v_sub.shift_id::text||'|'||v_sub.original_work_id||'|'||
  v_sub.continuity_head_sha256||'|'||v_sub.continuity_revision::text||'|'||
  v_sub.subscribed_receipt_sha256||'|'||NEW.reconciliation_receipt_sha256,
  'UTF8')),'hex');
 INSERT INTO reality_internal.final_loop_resume_events_v1(
  shift_id,owner_id,original_work_id,source_ref,signal_kind,
  source_receipt_sha256,previous_receipt_sha256,event_causality_sha256,
  continuity_head_sha256,continuity_revision,signal_next_action
 ) VALUES(
  v_sub.shift_id,v_sub.owner_id,v_sub.original_work_id,v_sub.source_ref,
  'QUALIFIER_PROOF_CHANGED',NEW.reconciliation_receipt_sha256,
  v_sub.subscribed_receipt_sha256,v_hash,
  v_sub.continuity_head_sha256,v_sub.continuity_revision,
  NEW.reconciliation_next_action
 ) ON CONFLICT DO NOTHING RETURNING event_id INTO v_new_event;
 IF v_new_event IS NOT NULL THEN
  UPDATE reality_internal.final_loop_resume_conditions_v1
  SET state='SHADOW_SIGNALED',
   last_signaled_receipt_sha256=NEW.reconciliation_receipt_sha256,
   updated_at=pg_catalog.clock_timestamp()
  WHERE shift_id=v_sub.shift_id
   AND original_work_id=v_sub.original_work_id
   AND condition_kind=v_sub.condition_kind;
 END IF;
 RETURN NEW;
END $function$;

REVOKE ALL ON FUNCTION reality_internal.on_final_loop_qualifier_receipt_change_v1() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION reality_internal.register_final_loop_resume_conditions_v1(p_shift_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE v_proof jsonb; v_h jsonb; v_added int:=0; v_seen int:=0;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'FINAL_LOOP_RESUME_SERVICE_ONLY'; END IF;
 v_proof:=public.reality_read_current_final_loop_proof_envelope_v1(p_shift_id);
 IF v_proof->>'status'<>'FINAL_LOOP_FROZEN_SCOPE_VERIFIED_ORIGINAL_ACCEPTANCE_PENDING'
  OR v_proof->>'shift_id'<>p_shift_id::text OR v_proof->>'read_only'<>'true'
  OR v_proof->>'execution_authorized'<>'false'
  OR v_proof->>'installation_authorized'<>'false'
  OR v_proof->>'original_job_completed'<>'false'
  OR (v_proof->>'continuity_head_sha256') !~ '^sha256:[a-f0-9]{64}$'
  OR (v_proof->>'revision')::bigint<1
 THEN RETURN jsonb_build_object('status','FINAL_LOOP_RESUME_CANONICAL_PROOF_NOT_READY',
  'registered',0,'execution_authorized',false); END IF;
 FOR v_h IN SELECT value FROM pg_catalog.jsonb_array_elements(
    coalesce(v_proof->'governed_qualification_handoffs','[]'::jsonb)
 ) LOOP
   IF v_h->>'diagnosis_consumable'<>'true'
    OR v_h->>'independent_source_proof_verified'<>'true'
    OR v_h->>'registered_capability_lease'<>'false'
    OR v_h->>'execution_authorized'<>'false'
    OR v_h->>'original_job_completed'<>'false'
    OR v_h->>'proposed_transition' NOT IN ('RECOVER','SUSPEND')
    OR (v_h->>'qualifier_receipt_sha256') !~ '^sha256:[a-f0-9]{64}$'
    OR (v_h->>'original_work_id') !~ '^work:[a-f0-9]{32}$'
    OR (v_h->>'qualifier_next_action') !~ '^[A-Z][A-Z0-9_]{5,120}$'
    OR NOT EXISTS(
       SELECT 1 FROM pg_catalog.jsonb_array_elements(v_proof->'jobs') j
       WHERE j->>'source_ref'=v_h->>'source_ref'
        AND j->>'original_work_id'=v_h->>'original_work_id'
        AND j->>'independent_source_proof_verified'='true')
   THEN RAISE EXCEPTION 'FINAL_LOOP_RESUME_HANDOFF_PROOF_UNVERIFIED'; END IF;
   v_seen:=v_seen+1;
   INSERT INTO reality_internal.final_loop_resume_conditions_v1(
     shift_id,owner_id,original_work_id,source_ref,
     subscribed_receipt_sha256,continuity_head_sha256,
     continuity_revision,next_qualified_action,
     unresolved_proof_gates,proposed_transition
   ) VALUES(
     p_shift_id,(v_proof->>'owner_id')::uuid,
     v_h->>'original_work_id',v_h->>'source_ref',
     v_h->>'qualifier_receipt_sha256',
     v_proof->>'continuity_head_sha256',
     (v_proof->>'revision')::bigint,
     v_h->>'qualifier_next_action',
     coalesce(v_h->'unresolved_proof_gates','[]'::jsonb),
     v_h->>'proposed_transition'
   )
   ON CONFLICT DO NOTHING;
   IF FOUND THEN v_added:=v_added+1; END IF;

   IF (v_h->'unresolved_proof_gates') ? 'CASE_SPECIFIC_FROZEN_RED_NOT_VERIFIED'
      AND v_h->>'proposed_transition'='RECOVER'
      AND v_h->>'recovery_authority_scope'='INTERNAL_MAINTENANCE_ONLY'
   THEN
     INSERT INTO reality_internal.final_loop_resume_conditions_v1(
       shift_id,owner_id,original_work_id,source_ref,condition_kind,
       subscribed_receipt_sha256,continuity_head_sha256,
       continuity_revision,next_qualified_action,
       unresolved_proof_gates,proposed_transition
     ) VALUES(
       p_shift_id,(v_proof->>'owner_id')::uuid,
       v_h->>'original_work_id',v_h->>'source_ref',
       'INDEPENDENT_FROZEN_CI_RECEIPT',
       v_h->>'qualifier_receipt_sha256',
       v_proof->>'continuity_head_sha256',
       (v_proof->>'revision')::bigint,
       v_h->>'qualifier_next_action',
       v_h->'unresolved_proof_gates',
       v_h->>'proposed_transition'
     ) ON CONFLICT DO NOTHING;
     IF FOUND THEN v_added:=v_added+1; END IF;
   END IF;

 END LOOP;
 RETURN jsonb_build_object(
  'schema','reality-final-loop-event-subscription-v1',
  'status','FINAL_LOOP_SOURCE_BOUND_RESUME_SUBSCRIPTIONS_REGISTERED',
  'shift_id',p_shift_id,'inspected',v_seen,'registered',v_added,
  'no_new_executable_authority',true,'event_execution_enabled',false,
  'execution_authorized',false,'production_changed',false);
END $function$;

REVOKE ALL ON FUNCTION reality_internal.register_final_loop_resume_conditions_v1(uuid) FROM PUBLIC,anon,authenticated;

GRANT EXECUTE ON FUNCTION reality_internal.register_final_loop_resume_conditions_v1(uuid) TO service_role;

DROP TRIGGER IF EXISTS reality_final_loop_resume_on_independent_case_ci_v1 ON reality_internal.owner_maintenance_independent_case_ci_v1;
CREATE TRIGGER reality_final_loop_resume_on_independent_case_ci_v1 AFTER INSERT ON reality_internal.owner_maintenance_independent_case_ci_v1 FOR EACH ROW EXECUTE FUNCTION reality_internal.on_final_loop_independent_frozen_ci_v1();

DROP TRIGGER IF EXISTS reality_final_loop_resume_on_qualification_change_v1 ON reality_internal.owner_continuity_qualification_routes_v1;
CREATE TRIGGER reality_final_loop_resume_on_qualification_change_v1 AFTER UPDATE OF reconciliation_receipt_sha256 ON reality_internal.owner_continuity_qualification_routes_v1 FOR EACH ROW EXECUTE FUNCTION reality_internal.on_final_loop_qualifier_receipt_change_v1();
