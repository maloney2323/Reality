-- Gate all production-held GitHub credential use behind a valid one-use
-- unconsumed database nonce. Read only: validation cannot reserve a job.
CREATE OR REPLACE FUNCTION public.reality_verify_governed_wake_relay_nonce_v1(
 p_relay_nonce uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE proof reality_internal.governed_wake_relay_tokens_v1%rowtype;
BEGIN
 IF current_user <> 'service_role' THEN
  RAISE EXCEPTION 'RELAY_NONCE_PREFLIGHT_SERVICE_ROLE_REQUIRED'; END IF;
 SELECT * INTO proof
 FROM reality_internal.governed_wake_relay_tokens_v1
 WHERE relay_nonce=p_relay_nonce AND consumed_at IS NULL
 AND expires_at>clock_timestamp();
 IF proof.relay_nonce IS NULL OR
    proof.source<>'HMAC_VERIFIED_EDGE_BROKER' THEN
  RAISE EXCEPTION 'RELAY_NONCE_NOT_VALID_UNCONSUMED'; END IF;
 RETURN jsonb_build_object('status','ONE_TIME_DELIVERY_NONCE_VALID',
  'execution_authorized',false,'owner_approval_created',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_verify_governed_wake_relay_nonce_v1(uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_verify_governed_wake_relay_nonce_v1(uuid)
 TO service_role;