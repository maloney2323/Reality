-- Reality independent wake notifier and watchdog v1.
-- All outbound hints are signed with a Vault-held random HMAC key, not authority.
-- The outbox remains the source of truth when pg_net loses a notification.
CREATE TABLE IF NOT EXISTS reality_internal.governed_wake_hint_nonces_v1(
 nonce uuid PRIMARY KEY,
 issued_at timestamptz NOT NULL,
 received_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE reality_internal.governed_wake_hint_nonces_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON reality_internal.governed_wake_hint_nonces_v1 FROM PUBLIC,anon,authenticated;
GRANT INSERT,SELECT ON reality_internal.governed_wake_hint_nonces_v1 TO service_role;

-- Never transmit or return the key. The vault key is generated in the database.
DO $guard$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM vault.secrets
 WHERE name='reality_governed_wake_hint_hmac_v1') THEN
   PERFORM vault.create_secret(
     encode(extensions.gen_random_bytes(32),'hex'),
     'reality_governed_wake_hint_hmac_v1',
     'Reality isolated preview wake notification authentication');
 END IF;
END $guard$;

-- SECURITY DEFINER is strictly private and returns only a boolean: no
-- decryption API or signing oracle is granted to ordinary application roles.
CREATE OR REPLACE FUNCTION reality_internal.verify_governed_wake_hmac_v1(
 p_nonce uuid,p_issued_at bigint,p_cause text,p_signature text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO '' AS $fn$
DECLARE secret text; actual text; msg text;
BEGIN
 IF p_cause NOT IN ('approval','watchdog','audit')
    OR p_issued_at IS NULL OR p_signature !~ '^[a-f0-9]{64}$'
    OR abs(extract(epoch from clock_timestamp())-p_issued_at)>90
 THEN RETURN false; END IF;
 SELECT decrypted_secret INTO secret FROM vault.decrypted_secrets
 WHERE name='reality_governed_wake_hint_hmac_v1';
 IF secret IS NULL OR length(secret)<>64 THEN RETURN false; END IF;
 msg:='v1|'||p_nonce::text||'|'||p_issued_at::text||'|'||p_cause;
 actual:=encode(extensions.hmac(convert_to(msg,'UTF8'),
   convert_to(secret,'UTF8'),'sha256'),'hex');
 RETURN actual=p_signature;
END $fn$;
REVOKE ALL ON FUNCTION reality_internal.verify_governed_wake_hmac_v1(uuid,bigint,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION reality_internal.verify_governed_wake_hmac_v1(uuid,bigint,text,text)
 TO service_role;

CREATE OR REPLACE FUNCTION public.reality_authenticate_governed_wake_hint_v1(
 p_nonce uuid,p_issued_at bigint,p_cause text,p_signature text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER
SET search_path TO '' AS $fn$
BEGIN
 IF current_user<>'service_role' THEN
   RAISE EXCEPTION 'WAKE_HINT_SERVICE_ROLE_REQUIRED'; END IF;
 IF reality_internal.verify_governed_wake_hmac_v1(
    p_nonce,p_issued_at,p_cause,p_signature) IS DISTINCT FROM true THEN
   RAISE EXCEPTION 'WAKE_HINT_SIGNATURE_OR_TIME_INVALID'; END IF;
 INSERT INTO reality_internal.governed_wake_hint_nonces_v1(nonce,issued_at)
 VALUES(p_nonce,to_timestamp(p_issued_at))
 ON CONFLICT DO NOTHING;
 IF NOT FOUND THEN RAISE EXCEPTION 'WAKE_HINT_REPLAY_BLOCKED'; END IF;
 RETURN jsonb_build_object('status','SIGNED_WAKE_HINT_VERIFIED',
   'delivery_not_execution',true,'permission_granted',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_authenticate_governed_wake_hint_v1(
 uuid,bigint,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_authenticate_governed_wake_hint_v1(
 uuid,bigint,text,text) TO service_role;

-- Private notifier owns the only outbound endpoint and never passes approval
-- IDs, service keys or candidate source to the network.
CREATE OR REPLACE FUNCTION reality_internal.send_governed_wake_hint_v1(p_cause text)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO '' AS $fn$
DECLARE secret text; nonce uuid; stamp bigint; sig text; msg text;
BEGIN
 IF p_cause NOT IN ('approval','watchdog','audit') THEN
  RAISE EXCEPTION 'WAKE_HINT_CAUSE_UNSUPPORTED'; END IF;
 SELECT decrypted_secret INTO secret FROM vault.decrypted_secrets
 WHERE name='reality_governed_wake_hint_hmac_v1';
 IF secret IS NULL OR length(secret)<>64 THEN
   RAISE EXCEPTION 'WAKE_HINT_SIGNING_KEY_UNAVAILABLE'; END IF;
 nonce:=gen_random_uuid();
 stamp:=floor(extract(epoch from clock_timestamp()))::bigint;
 msg:='v1|'||nonce::text||'|'||stamp::text||'|'||p_cause;
 sig:=encode(extensions.hmac(convert_to(msg,'UTF8'),
   convert_to(secret,'UTF8'),'sha256'),'hex');
 RETURN net.http_post(
  url:='https://hvkfreoagbrphwghjajw.supabase.co/functions/v1/reality-governed-wake-broker-v1',
  body:=jsonb_build_object('version',1,'action','wake',
    'nonce',nonce,'issued_at',stamp,'cause',p_cause),
  headers:=jsonb_build_object('content-type','application/json',
    'x-reality-wake-signature',sig),
  timeout_milliseconds:=5000);
END $fn$;
REVOKE ALL ON FUNCTION reality_internal.send_governed_wake_hint_v1(text)
 FROM PUBLIC,anon,authenticated;
-- Exactly the signed owner-approval trigger (service_role) may enqueue hints;
-- the regular watchdog runs as postgres.
GRANT EXECUTE ON FUNCTION reality_internal.send_governed_wake_hint_v1(text)
 TO service_role;

CREATE OR REPLACE FUNCTION reality_internal.wake_approved_on_outbox_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path TO '' AS $fn$
BEGIN
 IF NEW.wake_state<>'WAKE_PENDING' OR NEW.target_environment<>'ISOLATED_PREVIEW' THEN
  RAISE EXCEPTION 'WAKE_OUTBOX_NOTIFY_INVALID'; END IF;
 PERFORM reality_internal.send_governed_wake_hint_v1('approval');
 RETURN NEW;
END $fn$;
DROP TRIGGER IF EXISTS reality_governed_wake_signal_after_commit_v1
 ON reality_internal.governed_execution_wake_outbox_v1;
CREATE TRIGGER reality_governed_wake_signal_after_commit_v1
 AFTER INSERT ON reality_internal.governed_execution_wake_outbox_v1
 FOR EACH ROW EXECUTE FUNCTION reality_internal.wake_approved_on_outbox_v1();

CREATE OR REPLACE FUNCTION reality_internal.watch_governed_wake_outbox_v1()
RETURNS text LANGUAGE plpgsql SECURITY INVOKER
SET search_path TO '' AS $fn$
BEGIN
 -- A stale dispatch claim only becomes eligible after its current lease expires.
 IF EXISTS(SELECT 1 FROM reality_internal.governed_execution_wake_outbox_v1
   WHERE (wake_state IN ('WAKE_PENDING','RETRY_PENDING')
       AND next_attempt_at<=now())
      OR (wake_state IN ('DISPATCH_CLAIMED','DISPATCH_ACCEPTED')
       AND dispatch_lease_expires_at<=now())) THEN
  PERFORM reality_internal.send_governed_wake_hint_v1('watchdog');
  RETURN 'WAKE_HINT_QUEUED_WITHOUT_AUTHORITY';
 END IF;
 RETURN 'NO_WAKE_DUE';
END $fn$;
REVOKE ALL ON FUNCTION reality_internal.watch_governed_wake_outbox_v1()
 FROM PUBLIC,anon,authenticated;
-- Postgres cron is independent of GitHub Actions scheduling.
SELECT cron.schedule('reality-governed-wake-watchdog-v1',
  '* * * * *', 'SELECT reality_internal.watch_governed_wake_outbox_v1();');
