import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const api=read('api/reality/personal-connections.js');
const registry=read('src/reality-connector-registry-v1.0.js');
const ui=read('reality-connections-workspace-v1.js');
const shell=read('reality-unified-shell-v1.js');
const css=read('reality-connections-workspace-v1.css');
const html=read('index.html');
const vercel=JSON.parse(read('vercel.json'));
test('Connections is a real Reality route on mobile and desktop',()=>{
 assert.ok(vercel.rewrites.some(x=>x.source==='/connections'&&x.destination==='/index.html'));
 assert.match(shell,/'\/connections':'connections'/);
 assert.match(shell,/label:'Connections',url:'\/connections'/);
 assert.match(shell,/id='realityOwnerConnections'/);
 assert.match(html,/reality-connections-workspace-v1\.js/);
 assert.match(html,/reality-connections-workspace-v1\.css/);
 assert.match(html,/'employees','work','shifts','connections'/);
 assert.match(css,/data-reality-route="connections"/);
 assert.match(css,/grid-template-columns:1fr/);
 assert.match(ui,/window\.location\.pathname!=='\/connections'/);
});
test('Connection inventory is authenticated, owner-scoped and read-only',()=>{
 assert.match(api,/privateChatConfig\(\)/);
 assert.match(api,/authenticatedChatSession\(req,res\)/);
 assert.match(api,/VERCEL_ENV!=='preview'/);
 assert.match(api,/REALITY_CONNECTION_SETUP_EXPLICIT_OWNER_SCOPE_REQUIRED/);
 assert.match(api,/origin!=='https:\/\/'+host/);
 assert.match(api,/reality_request_owner_connector_setup_v1/);
 assert.match(api,/reality_read_owner_connector_setup_v1/);
 assert.match(api,/!\['GET','POST'\]\.includes\(req\.method\)/);
 assert.match(api,/Object\.keys\(req\.query\|\|\{\}\)\.length/);
 assert.match(api,/db\.url!==session\.config\?\.url/);
 assert.match(api,/reality_read_owner_employee_discovery_v1/);
 assert.match(api,/p_owner_id:session\.user_id/);
 assert.match(api,/evidence\.owner_id!==session\.user_id/);
 assert.match(api,/evidence\.qualified_jobs===0/);
 assert.match(api,/evidence\.shift_authorized===false/);
 assert.match(api,/evidence\.installation_authorized===false/);
 assert.match(api,/external_execution_authorized:false/);
 assert.match(api,/owner_billing_authorized:false/);
 assert.match(api,/connection_grants_created:0/);
 assert.match(api,/oauth_flows_completed:0/);
 assert.match(api,/provider_oauth_verified_count:0/);
 assert.match(api,/connection_action_available:false/);
 assert.match(api,/setup_request_action_available:true/);
 assert.match(api,/automatic_grant_of_new_provider_access:false/);
 assert.match(api,/automatic_discovery_of_existing_sources:true/);
 assert.doesNotMatch(api,/https:\/\/api\.stripe\.com|stripe\.refunds\.create|create_checkout/i);
});
test('Reality connector registry is not ChatGPT and never equates credential to proof',()=>{
 assert.match(registry,/dependency_on_chatgpt_plugins: false/);
 for(const provider of ['github','vercel','supabase'])
  assert.match(registry,new RegExp('\\b'+provider+':'));
 for(const provider of ['github','vercel','supabase','stripe','gmail',
  'google-calendar','quickbooks','slack','paypal','square','shopify',
  'google-drive','microsoft-365','notion','hubspot','mailchimp','xero',
  'zoom','meta-business','google-analytics','asana','trello',
  'jobber','housecall-pro','servicetitan','airtable'])
  assert.match(api,new RegExp("id:'"+provider+"'"));
 assert.match(api,/GITHUB_PUBLIC_SOURCE_OBSERVED_NO_OAUTH_CLAIM/);
 assert.match(api,/OWNER_DATABASE_READBACK_VERIFIED/);
 assert.match(api,/ADAPTER_CONFIGURED_PROVIDER_AUTH_UNVERIFIED/);
 assert.match(api,/INTEGRATION_NOT_YET_IMPLEMENTED/);
 assert.match(api,/provider_account_authenticated:false/);
 assert.match(ui,/provider_account_authenticated===false/);
 assert.match(ui,/connection_action_available===false/);
 assert.match(ui,/No account changes · no payment authority/);
 assert.match(ui,/ChatGPT connections do not transfer to Reality/);
});
test('No old connection data survives signout or a broken readback',()=>{
 assert.match(ui,/grid\.replaceChildren\(\)/);
 assert.match(ui,/epoch\+\+/);
 assert.match(ui,/signed out|Signed out/i);
 assert.match(ui,/OWNER_CONNECTIONS_UNVERIFIED/);
 assert.match(ui,/Connection status could not be verified/);
 assert.match(ui,/credentials:'same-origin'/);
 assert.match(ui,/cache:'no-store'/);
});

test('PayPal appears in the 26-provider catalog without pretending to connect',()=>{
 assert.match(api,/id:'paypal',label:'PayPal'/);
 assert.match(api,/developer\\.paypal\\.com\/api\/rest\//);
 assert.match(ui,/Browse all apps/);
 assert.match(ui,/Auto-detect existing sources/);
 assert.match(ui,/Request secure setup/);
 assert.match(ui,/source\.setup_requested\?'Setup requested':'Request secure setup'/);
 assert.match(ui,/setup_state!=='SETUP_REQUESTED_NO_CREDENTIALS'/);
 assert.match(ui,/actual_provider_connected!==false/);
 assert.match(ui,/payment_action_authorized!==false/);
 assert.match(ui,/new account access still requires permission/);
 assert.doesNotMatch(api,/https:\/\/api\.paypal\.com\/v[12]\/|PAYPAL_CLIENT_SECRET/);
});
test('a new business can request first integration before discovery exists',()=>{
 assert.match(api,/reality_read_owner_employee_discovery_v1/);
 assert.match(api,/\.catch\(\(\)=>null\)/);
 assert.match(api,/sourceReadbackVerified/);
 assert.match(api,/requested\.owner_id!==session\.user_id/);
 assert.match(api,/requested\.request_count!==requested\.requests\.length/);
 assert.match(api,/SOURCES\.some\(s=>s\.id===x\.provider_id\)/);
});
