-- Read-only, service-only race inspection for the exact OIDC-authenticated
-- approval and fence. A provider wake may start before GitHub delivery
-- readback has been committed to the outbox. This endpoint never advances
-- a state, retries an execution, or grants installation authority.
CREATE OR REPLACE FUNCTION public.reality_check_governed_worker_dispatch_v1(
  p_approval_id uuid,p_fence bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE w reality_internal.governed_execution_wake_outbox_v1%rowtype;
BEGIN
 IF current_user <> 'service_role' THEN
  RAISE EXCEPTION 'DISPATCH_INSPECTION_SERVICE_ROLE_REQUIRED'; END IF;
 SELECT * INTO w FROM reality_internal.governed_execution_wake_outbox_v1
 WHERE approval_id=p_approval_id;
 IF w.approval_id IS NULL OR w.dispatch_fence IS DISTINCT FROM p_fence
 OR w.dispatch_lease_expires_at IS NULL
 OR w.dispatch_lease_expires_at<=clock_timestamp() OR
 w.target_environment<>'ISOLATED_PREVIEW' THEN
  RETURN jsonb_build_object('status','DISPATCH_NOT_CURRENT',
   'execution_authorized',false);
 END IF;
 IF w.wake_state='DISPATCH_CLAIMED' THEN
  RETURN jsonb_build_object('status','DISPATCH_RECEIPT_PENDING',
   'execution_authorized',false,'retry_signed_life_only',true);
 END IF;
 IF w.wake_state IN ('DISPATCH_ACCEPTED','WORKER_ALIVE') THEN
  RETURN jsonb_build_object('status','DISPATCH_RECEIPT_VERIFIED',
   'execution_authorized',false,'retry_signed_life_only',false);
 END IF;
 RETURN jsonb_build_object('status','DISPATCH_NOT_CURRENT',
  'execution_authorized',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_check_governed_worker_dispatch_v1(uuid,bigint)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_check_governed_worker_dispatch_v1(uuid,bigint)
 TO service_role;
