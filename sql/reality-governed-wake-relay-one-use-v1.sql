-- Transport-only one-use token for an existing production-hosted GitHub secret.
-- GitHub credential NEVER leaves Vercel; a relay token grants neither
-- installation permission nor work authority, only an outbox pickup attempt.
CREATE TABLE IF NOT EXISTS reality_internal.governed_wake_relay_tokens_v1 (
 relay_nonce uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 issued_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 expires_at timestamptz NOT NULL DEFAULT (clock_timestamp()+interval '90 seconds'),
 consumed_at timestamptz,
 source text NOT NULL DEFAULT 'HMAC_VERIFIED_EDGE_BROKER'
  CHECK (source='HMAC_VERIFIED_EDGE_BROKER')
);
ALTER TABLE reality_internal.governed_wake_relay_tokens_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON reality_internal.governed_wake_relay_tokens_v1
 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON reality_internal.governed_wake_relay_tokens_v1 TO service_role;

CREATE OR REPLACE FUNCTION public.reality_issue_governed_wake_relay_v1()
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE n uuid;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'RELAY_SERVICE_ROLE_REQUIRED'; END IF;
 INSERT INTO reality_internal.governed_wake_relay_tokens_v1 DEFAULT VALUES
 RETURNING relay_nonce INTO n;
 RETURN jsonb_build_object('status','ONE_TIME_DELIVERY_TOKEN_ISSUED',
  'relay_nonce',n,'expires_in_seconds',90,
  'execution_authorized',false,'owner_approval_created',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_issue_governed_wake_relay_v1()
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_issue_governed_wake_relay_v1()
 TO service_role;

CREATE OR REPLACE FUNCTION public.reality_consume_governed_wake_relay_v1(p_relay_nonce uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE token reality_internal.governed_wake_relay_tokens_v1%rowtype;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'RELAY_SERVICE_ROLE_REQUIRED'; END IF;
 SELECT * INTO token FROM reality_internal.governed_wake_relay_tokens_v1
 WHERE relay_nonce=p_relay_nonce FOR UPDATE;
 IF token.relay_nonce IS NULL OR token.consumed_at IS NOT NULL
  OR token.expires_at<=clock_timestamp() THEN
   RAISE EXCEPTION 'RELAY_NOT_FOUND_EXPIRED_OR_REPLAYED';
 END IF;
 UPDATE reality_internal.governed_wake_relay_tokens_v1
 SET consumed_at=clock_timestamp()
 WHERE relay_nonce=p_relay_nonce AND consumed_at IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'RELAY_ALREADY_CONSUMED'; END IF;
 RETURN jsonb_build_object('status','ONE_TIME_DELIVERY_TOKEN_CONSUMED',
  'execution_authorized',false,'owner_approval_created',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_consume_governed_wake_relay_v1(uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_consume_governed_wake_relay_v1(uuid)
 TO service_role;
