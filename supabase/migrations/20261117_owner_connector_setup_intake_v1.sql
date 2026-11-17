-- Reality Connection setup intents: a signed-in owner can request setup,
-- never authorize provider access. No token, secret, OAuth code or PII stored.
CREATE TABLE IF NOT EXISTS reality_internal.owner_connector_setup_requests_v1(
 owner_id uuid NOT NULL,
 provider_id text NOT NULL CHECK(provider_id IN('github','supabase','vercel','stripe','paypal','gmail','google-calendar','quickbooks','slack','square','shopify','google-drive','microsoft-365','notion','hubspot','mailchimp','xero','zoom','meta-business','google-analytics','asana','trello','jobber','housecall-pro','servicetitan','airtable')),
 state text NOT NULL DEFAULT 'SETUP_REQUESTED_NO_CREDENTIALS'
  CHECK(state='SETUP_REQUESTED_NO_CREDENTIALS'),
 first_requested_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 last_requested_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 request_count integer NOT NULL DEFAULT 1 CHECK(request_count BETWEEN 1 AND 20),
 credential_saved boolean NOT NULL DEFAULT false CHECK(NOT credential_saved),
 oauth_consent_granted boolean NOT NULL DEFAULT false CHECK(NOT oauth_consent_granted),
 provider_access_verified boolean NOT NULL DEFAULT false CHECK(NOT provider_access_verified),
 external_action_authorized boolean NOT NULL DEFAULT false CHECK(NOT external_action_authorized),
 PRIMARY KEY(owner_id,provider_id)
);
ALTER TABLE reality_internal.owner_connector_setup_requests_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON reality_internal.owner_connector_setup_requests_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON reality_internal.owner_connector_setup_requests_v1 TO service_role;

CREATE OR REPLACE FUNCTION public.reality_request_owner_connector_setup_v1(
 p_owner_id uuid,p_provider_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE v_now timestamptz:=clock_timestamp();
BEGIN
 IF current_user<>'service_role' OR p_owner_id IS NULL OR p_provider_id IS NULL
  OR p_provider_id NOT IN('github','supabase','vercel','stripe','paypal','gmail','google-calendar','quickbooks','slack','square','shopify','google-drive','microsoft-365','notion','hubspot','mailchimp','xero','zoom','meta-business','google-analytics','asana','trello','jobber','housecall-pro','servicetitan','airtable')
 THEN RAISE EXCEPTION 'REALITY_CONNECTION_SETUP_SCOPE_DENIED';END IF;
 IF NOT EXISTS(SELECT 1 FROM auth.users u WHERE u.id=p_owner_id)
 THEN RAISE EXCEPTION 'REALITY_CONNECTION_SETUP_OWNER_UNKNOWN';END IF;
 INSERT INTO reality_internal.owner_connector_setup_requests_v1(
  owner_id,provider_id,last_requested_at)
 VALUES(p_owner_id,p_provider_id,v_now)
 ON CONFLICT(owner_id,provider_id) DO UPDATE SET
  last_requested_at=excluded.last_requested_at,
  request_count=least(20,
   reality_internal.owner_connector_setup_requests_v1.request_count+1);
 RETURN jsonb_build_object(
  'status','OWNER_CONNECTION_SETUP_REQUEST_RECORDED',
  'owner_id',p_owner_id,'provider_id',p_provider_id,
  'setup_state','SETUP_REQUESTED_NO_CREDENTIALS',
  'actual_provider_connected',false,'oauth_consent_granted',false,
  'credentials_saved',false,'external_action_authorized',false,
  'payment_action_authorized',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_request_owner_connector_setup_v1(uuid,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_request_owner_connector_setup_v1(uuid,text)
 TO service_role;

CREATE OR REPLACE FUNCTION public.reality_read_owner_connector_setup_v1(p_owner_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE v_rows jsonb;
BEGIN
 IF current_user<>'service_role' OR p_owner_id IS NULL
 THEN RAISE EXCEPTION 'REALITY_CONNECTION_SETUP_READ_SCOPE_DENIED';END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
  'provider_id',r.provider_id,'setup_state',r.state,
  'first_requested_at',r.first_requested_at,
  'last_requested_at',r.last_requested_at,
  'credentials_saved',false,'provider_connected',false,
  'external_action_authorized',false) ORDER BY r.provider_id),'[]'::jsonb)
 INTO v_rows FROM reality_internal.owner_connector_setup_requests_v1 r
 WHERE r.owner_id=p_owner_id;
 RETURN jsonb_build_object(
  'status','OWNER_CONNECTION_SETUP_REQUESTS_READ',
  'owner_id',p_owner_id,'requests',v_rows,'request_count',jsonb_array_length(v_rows),
  'oauth_credentials_returned',false,'provider_connection_claimed',false,
  'billing_authorized',false,'external_actions_authorized',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_read_owner_connector_setup_v1(uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_read_owner_connector_setup_v1(uuid)
 TO service_role;
