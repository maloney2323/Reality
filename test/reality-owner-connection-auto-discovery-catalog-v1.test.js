import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const api=read('api/reality/personal-connections.js');
const page=read('reality-connections-workspace-v1.js');
const css=read('reality-connections-workspace-v1.css');
const sql=read('supabase/migrations/20261117_owner_connector_setup_intake_v1.sql');
const boundary=read('src/reality-governed-shift-boundary-v1.js');
test('PayPal and relevant service-business apps are discoverable in one catalog',()=>{
 for(const id of ['paypal','square','shopify','google-drive','microsoft-365',
  'hubspot','mailchimp','xero','notion','asana','trello','zoom','airtable',
  'jobber','housecall-pro','servicetitan','google-analytics','meta-business'])
  assert.match(api,new RegExp("id:'"+id+"'"));
 assert.match(api,/PayPal Business transaction and subscription evidence/);
 assert.match(api,/developer\.paypal\.com\/api\/rest\//);
 assert.match(api,/https:\/\/docs\.stripe\.com\/connect/);
 assert.match(api,/auto_detect_supported:Boolean\(registered\)/);
 assert.match(page,/Search available business app integrations/);
 assert.match(page,/Browse all apps/);
 assert.match(page,/rx-connection-group-filter/);
 assert.match(page,/search\.addEventListener\('input'/);
 assert.match(page,/groups\.addEventListener\('change'/);
 assert.match(css,/rx-connection-catalog-tools/);
 assert.match(css,/@media\(max-width:600px\)/);
});
test('auto detect is observation, while new access requires explicit setup and consent',()=>{
 assert.match(page,/Auto-detect existing sources/);
 assert.match(page,/method:'GET',credentials:'same-origin'/);
 assert.match(page,/automatic_grant_of_new_provider_access!==false/);
 assert.match(api,/automatic_grant_of_new_provider_access:false/);
 assert.match(api,/provider_account_authenticated:false/);
 assert.match(api,/connection_action_available:false/);
 assert.match(page,/Request secure setup/);
 assert.match(page,/provider_connected===false|actual_provider_connected!==false/);
 assert.match(page,/result\.payment_action_authorized!==false/);
 assert.match(page,/result\.oauth_consent_granted!==false/);
 assert.match(page,/result\.credentials_saved!==false/);
 assert.match(page,/credentials:'same-origin'/);
 assert.match(page,/method:'POST'/);
 assert.match(page,/body:JSON\.stringify\(\{provider_id:providerId\}\)/);
 assert.doesNotMatch(api,/api-m\.paypal\.com\/v1\/oauth2\/token|https:\/\/api\.stripe\.com/);
});
test('setup write is owner-authenticated and rejects external origins and arbitrary bodies',()=>{
 assert.match(api,/authenticatedChatSession\(req,res\)/);
 assert.match(api,/VERCEL_ENV!=='preview'/);
 assert.match(api,/Object\.keys\(req\.query\|\|\{\}\)\.length/);
 assert.match(api,/origin!=='https:\/\/'\+host/);
 assert.match(api,/site&&site!=='same-origin'/);
 assert.match(api,/application\\\/json/);
 assert.match(api,/Object\.keys\(body\)\.length!==1/);
 assert.match(api,/SOURCES\.some\(x=>x\.id===body\.provider_id\)/);
 assert.match(api,/p_owner_id:session\.user_id/);
 assert.match(api,/p_provider_id:body\.provider_id/);
 assert.match(api,/reality_request_owner_connector_setup_v1/);
 assert.match(api,/reality_read_owner_connector_setup_v1/);
 assert.match(boundary,/request_owner_connector_setup_v1\|read_owner_connector_setup_v1/);
});
test('durable owner setup request is not a provider token, OAuth consent or work authorization',()=>{
 assert.match(sql,/CREATE TABLE IF NOT EXISTS reality_internal\.owner_connector_setup_requests_v1/);
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/REVOKE ALL ON reality_internal\.owner_connector_setup_requests_v1/);
 assert.match(sql,/current_user<>'service_role'/);
 assert.match(sql,/p_owner_id uuid,p_provider_id text/);
 assert.match(sql,/PRIMARY KEY\(owner_id,provider_id\)/);
 assert.match(sql,/SETUP_REQUESTED_NO_CREDENTIALS/);
 assert.match(sql,/credential_saved boolean NOT NULL DEFAULT false CHECK\(NOT credential_saved\)/);
 assert.match(sql,/oauth_consent_granted boolean NOT NULL DEFAULT false CHECK\(NOT oauth_consent_granted\)/);
 assert.match(sql,/provider_access_verified boolean NOT NULL DEFAULT false CHECK\(NOT provider_access_verified\)/);
 assert.match(sql,/external_action_authorized boolean NOT NULL DEFAULT false CHECK\(NOT external_action_authorized\)/);
 assert.match(sql,/owner_id=p_owner_id/);
 assert.match(sql,/provider_connection_claimed',false/);
 assert.match(sql,/oauth_credentials_returned',false/);
 assert.match(sql,/external_actions_authorized',false/);
 assert.doesNotMatch(sql,/client_secret|access_token|refresh_token|INSERT INTO[^;]*credential/i);
});
