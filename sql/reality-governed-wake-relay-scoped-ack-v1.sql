-- One-use acknowledgment binding: after an authenticated delivery claim,
-- an independent nonce is minted for THAT approval, claim and fencing epoch.
-- The nonce is consumed ATOMICALLY with the existing delivery receipt.
CREATE TABLE IF NOT EXISTS reality_internal.governed_wake_relay_acks_v1 (
 ack_nonce uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 approval_id uuid NOT NULL REFERENCES reality_internal.governed_execution_wake_outbox_v1(approval_id),
 claim_id uuid NOT NULL,
 dispatch_fence bigint NOT NULL CHECK (dispatch_fence BETWEEN 1 AND 5),
 issued_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 expires_at timestamptz NOT NULL DEFAULT (clock_timestamp()+interval '90 seconds'),
 consumed_at timestamptz
);
ALTER TABLE reality_internal.governed_wake_relay_acks_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON reality_internal.governed_wake_relay_acks_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON reality_internal.governed_wake_relay_acks_v1 TO service_role;

CREATE OR REPLACE FUNCTION public.reality_issue_governed_relay_ack_v1(
 p_approval_id uuid,p_claim_id uuid,p_fence bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE wake reality_internal.governed_execution_wake_outbox_v1%rowtype;
        nonce uuid;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'ACK_SERVICE_ROLE_REQUIRED'; END IF;
 SELECT * INTO wake FROM reality_internal.governed_execution_wake_outbox_v1
 WHERE approval_id=p_approval_id FOR UPDATE;
 IF wake.approval_id IS NULL OR wake.wake_state<>'DISPATCH_CLAIMED'
  OR wake.dispatch_claim_id IS DISTINCT FROM p_claim_id
  OR wake.dispatch_fence IS DISTINCT FROM p_fence
  OR wake.dispatch_lease_expires_at<=clock_timestamp()
 THEN RAISE EXCEPTION 'ACK_CURRENT_DISPATCH_CLAIM_REQUIRED'; END IF;
 INSERT INTO reality_internal.governed_wake_relay_acks_v1
 (approval_id,claim_id,dispatch_fence)
 VALUES(p_approval_id,p_claim_id,p_fence)
 RETURNING ack_nonce INTO nonce;
 RETURN jsonb_build_object('status','EXACT_DELIVERY_ACK_NONCE_ISSUED',
  'ack_nonce',nonce,'expires_in_seconds',90,
  'approval_id',p_approval_id,'claim_id',p_claim_id,
  'dispatch_fence',p_fence,'execution_authorized',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_issue_governed_relay_ack_v1(uuid,uuid,bigint)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_issue_governed_relay_ack_v1(uuid,uuid,bigint)
 TO service_role;

CREATE OR REPLACE FUNCTION public.reality_record_governed_relay_delivery_v1(
 p_ack_nonce uuid,p_approval_id uuid,p_claim_id uuid,p_fence bigint,p_delivery_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE ack reality_internal.governed_wake_relay_acks_v1%rowtype;
        receipt jsonb;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'ACK_SERVICE_ROLE_REQUIRED'; END IF;
 SELECT * INTO ack FROM reality_internal.governed_wake_relay_acks_v1
 WHERE ack_nonce=p_ack_nonce FOR UPDATE;
 IF ack.ack_nonce IS NULL OR ack.consumed_at IS NOT NULL
  OR ack.expires_at<=clock_timestamp()
  OR ack.approval_id IS DISTINCT FROM p_approval_id
  OR ack.claim_id IS DISTINCT FROM p_claim_id
  OR ack.dispatch_fence IS DISTINCT FROM p_fence
 THEN RAISE EXCEPTION 'ACK_NONCE_EXPIRED_REPLAYED_OR_SCOPE_MISMATCH'; END IF;
 receipt:=public.reality_record_governed_delivery_v1(
 p_approval_id,p_claim_id,p_fence,p_delivery_id);
 IF receipt->>'status'<>'DISPATCH_ACCEPTED_NOT_EXECUTION_PROVEN'
  OR receipt->>'execution_authorized'<>'false'
  OR receipt->>'worker_alive'<>'false'
 THEN RAISE EXCEPTION 'ACK_DELIVERY_RECEIPT_UNVERIFIED'; END IF;
 UPDATE reality_internal.governed_wake_relay_acks_v1
 SET consumed_at=clock_timestamp() WHERE ack_nonce=p_ack_nonce
 AND consumed_at IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'ACK_DOUBLE_CONSUMPTION'; END IF;
 RETURN receipt;
END $fn$;
REVOKE ALL ON FUNCTION public.reality_record_governed_relay_delivery_v1(
 uuid,uuid,uuid,bigint,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_record_governed_relay_delivery_v1(
 uuid,uuid,uuid,bigint,uuid) TO service_role;
