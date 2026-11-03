-- Read-only, owner-scoped wake trace for Reality's signed-in conversation.
CREATE OR REPLACE FUNCTION public.reality_read_owner_governed_wakes_v1(p_owner_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE records jsonb;
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'WAKE_OWNER_SERVICE_ROLE_REQUIRED'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
    'approval_id',s.approval_id,
    'artifact_sha256',s.artifact_sha256,
    'original_work_id',s.original_work_id,
    'wake_state',s.wake_state,
    'dispatch_attempts',s.dispatch_attempts,
    'dispatched_at',s.dispatched_at,
    'worker_alive_at',s.first_worker_alive_at,
    'ledger_phase',s.phase,
    'last_updated_at',s.updated_at,
    'preview_only',true
   ) ORDER BY s.created_at DESC),'[]'::jsonb)
 INTO records
 FROM (
  SELECT w.approval_id,w.artifact_sha256,w.original_work_id,w.wake_state,w.dispatch_attempts,
    w.dispatched_at,w.first_worker_alive_at,w.updated_at,w.created_at,q.phase
  FROM reality_internal.governed_execution_wake_outbox_v1 w
  JOIN reality_internal.genuine_capability_queue_v1 q ON q.trigger_id=w.trigger_id
  JOIN reality_internal.genuine_preview_install_approvals_v1 a
    ON a.approval_id=w.approval_id
  WHERE w.owner_id=p_owner_id
    AND q.owner_id=p_owner_id
    AND a.owner_id=p_owner_id
    AND a.original_work_id=w.original_work_id
    AND a.artifact_hash=w.artifact_sha256
    AND w.target_environment='ISOLATED_PREVIEW'
  ORDER BY w.created_at DESC LIMIT 12
 ) s;
 RETURN jsonb_build_object('status','OWNER_GOVERNED_WAKE_READBACK',
  'wakes',records,'read_only',true,
  'production_changed',false,'execution_authorized_by_read',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_read_owner_governed_wakes_v1(uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_read_owner_governed_wakes_v1(uuid)
 TO service_role;
