-- Replace the existing invoker-only maintenance advisory claim; preserve all
-- immutable source receipt checks, service role, claim fencing and authority.
-- No live installation or warrant change is part of this candidate.
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
