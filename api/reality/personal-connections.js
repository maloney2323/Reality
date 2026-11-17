// Owner-scoped Reality Connections, not ChatGPT plugins.
// A saved source observation is not a provider OAuth connection, a write grant,
// or permission to perform financial, customer, or production actions.
import {privateChatConfig,authenticatedChatSession}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {inspectConnectorRegistry} from '../../src/reality-connector-registry-v1.0.js';
import {shiftDatabase,shiftRpc}
 from '../../src/reality-governed-shift-boundary-v1.js';
export const maxDuration=15;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const SOURCES=Object.freeze([
 {id:'github',label:'GitHub',group:'Engineering',roles:['Riley','Quinn','Taylor'],
  description:'Repository issues, pull requests, tests and workflow signals.'},
 {id:'supabase',label:'Supabase',group:'Business data',roles:['Taylor','Quinn','Sage'],
  description:'Reality’s owner-scoped continuity records, work evidence and receipts.'},
 {id:'vercel',label:'Vercel',group:'Operations',roles:['Taylor','Quinn'],
  description:'Deployment and hosting records; API access must be verified separately.'},
 {id:'stripe',label:'Stripe',group:'Finance',roles:['Sage','Jordan','Avery','Morgan'],
  description:'Payments, subscription and customer financial signals (not yet connected).'},
 {id:'gmail',label:'Gmail',group:'Communication',roles:['Jordan','Morgan'],
  description:'Owner-authorized customer communication and follow-up discovery.'},
 {id:'google-calendar',label:'Google Calendar',group:'Scheduling',roles:['Jordan','Taylor'],
  description:'Owner-authorized scheduling, commitments and missed follow-ups.'},
 {id:'quickbooks',label:'QuickBooks',group:'Accounting',roles:['Sage','Avery'],
  description:'Business cost and accounting evidence when an integration is available.'},
 {id:'slack',label:'Slack',group:'Team',roles:['Taylor','Jordan'],
  description:'Authorized team work signals, decisions and handoffs.'},
 {id:'paypal',label:'PayPal',group:'Finance',roles:["Sage","Jordan","Avery"],
  description:"PayPal Business transaction and subscription evidence; merchant consent required."},
 {id:'square',label:'Square',group:'Finance',roles:["Sage","Jordan"],
  description:"Point-of-sale payment and customer records when connected."},
 {id:'shopify',label:'Shopify',group:'Commerce',roles:["Jordan","Morgan","Sage"],
  description:"Store orders, inventory, and customer activity."},
 {id:'google-drive',label:'Google Drive',group:'Files',roles:["Avery","Jordan","Taylor"],
  description:"Customer documents, operating procedures and project files."},
 {id:'microsoft-365',label:'Microsoft 365',group:'Communication',roles:["Jordan","Taylor"],
  description:"Microsoft mail, files, and scheduling."},
 {id:'notion',label:'Notion',group:'Productivity',roles:["Avery","Taylor"],
  description:"Knowledge base, projects and documented decisions."},
 {id:'hubspot',label:'HubSpot',group:'Sales',roles:["Jordan","Morgan"],
  description:"Sales pipeline, contacts and customer lifecycle."},
 {id:'mailchimp',label:'Mailchimp',group:'Marketing',roles:["Morgan","Jordan"],
  description:"Marketing audiences, campaigns and reporting."},
 {id:'xero',label:'Xero',group:'Accounting',roles:["Sage"],
  description:"Accounting, invoices, and costs."},
 {id:'zoom',label:'Zoom',group:'Meetings',roles:["Jordan","Taylor"],
  description:"Meeting coordination and follow-up evidence."},
 {id:'meta-business',label:'Meta Business',group:'Marketing',roles:["Morgan","Jordan"],
  description:"Business social channels and marketing signals."},
 {id:'google-analytics',label:'Google Analytics',group:'Marketing',roles:["Morgan","Avery"],
  description:"Website engagement and conversion analytics."},
 {id:'asana',label:'Asana',group:'Projects',roles:["Taylor","Avery"],
  description:"Task assignments and project progress."},
 {id:'trello',label:'Trello',group:'Projects',roles:["Taylor","Avery"],
  description:"Task boards and customer project coordination."},
 {id:'jobber',label:'Jobber',group:'Field Services',roles:["Taylor","Jordan","Sage"],
  description:"Service scheduling, clients and job status."},
 {id:'housecall-pro',label:'Housecall Pro',group:'Field Services',roles:["Taylor","Jordan","Sage"],
  description:"Field service dispatch, invoices, and customer operations."},
 {id:'servicetitan',label:'ServiceTitan',group:'Field Services',roles:["Taylor","Jordan","Sage"],
  description:"Service operations, job workflows and revenue records."},
 {id:'airtable',label:'Airtable',group:'Productivity',roles:["Taylor","Avery"],
  description:"Custom work databases and process tracking."}
]);
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(!['GET','POST'].includes(req.method))
  return res.status(405).setHeader('Allow','GET, POST')
   .json({ok:false,error:'REALITY_CONNECTIONS_METHOD_DENIED'});
 if(Object.keys(req.query||{}).length)
  return res.status(400).json({ok:false,error:'REALITY_CONNECTIONS_CLIENT_SCOPE_DENIED'});
 try{
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!session||!UUID.test(session.user_id))
   return res.status(401).json({ok:false,error:'REALITY_CONNECTIONS_SIGN_IN_REQUIRED'});
  if(process.env.VERCEL_ENV!=='preview')
   return res.status(403).json({ok:false,error:'REALITY_CONNECTIONS_PREVIEW_ONLY'});
  const db=shiftDatabase(process.env);
  if(db.url!==session.config?.url)
   throw Error('REALITY_CONNECTIONS_OWNER_PROJECT_MISMATCH');
  if(req.method==='POST'){
   // An explicit click may request onboarding work. It cannot authorize a
   // provider, exchange credentials, grant permissions, or send a payment.
   const origin=req.headers?.origin||'';
   const host=req.headers?.host||'';
   const contentType=req.headers?.['content-type']||'';
   const site=req.headers?.['sec-fetch-site']||'';
   const body=req.body;
   if(!/^[-a-z0-9.]+(?::[0-9]{2,5})?$/.test(host)||
    origin!=='https://'+host||
    (site&&site!=='same-origin')||
    !/^application\/json(?:;|$)/i.test(contentType)||
    !body||typeof body!=='object'||Array.isArray(body)||
    Object.keys(body).length!==1||
    typeof body.provider_id!=='string'||
    !SOURCES.some(x=>x.id===body.provider_id))
    return res.status(403).json({ok:false,
     error:'REALITY_CONNECTION_SETUP_EXPLICIT_OWNER_SCOPE_REQUIRED',
     provider_connected:false,provider_authorized:false});
   const saved=await shiftRpc(db,'reality_request_owner_connector_setup_v1',{
    p_owner_id:session.user_id,p_provider_id:body.provider_id});
   if(saved?.status!=='OWNER_CONNECTION_SETUP_REQUEST_RECORDED'||
    saved.owner_id!==session.user_id||
    saved.provider_id!==body.provider_id||
    saved.setup_state!=='SETUP_REQUESTED_NO_CREDENTIALS'||
    saved.actual_provider_connected!==false||
    saved.credentials_saved!==false||
    saved.oauth_consent_granted!==false||
    saved.external_action_authorized!==false||
    saved.payment_action_authorized!==false)
    throw Error('REALITY_CONNECTION_SETUP_WRITE_READBACK_MISMATCH');
   return res.status(202).json({
    ok:true,status:'OWNER_CONNECTION_SETUP_REQUEST_RECORDED',
    provider_id:body.provider_id,setup_state:saved.setup_state,
    actual_provider_connected:false,credentials_saved:false,
    oauth_consent_granted:false,payment_action_authorized:false,
    external_execution_authorized:false
   });
  }
  // Reuse the independently saved discovery ledger: this verifies data read
  // inside Reality, not possession of a GitHub or Stripe OAuth token.
  const evidence=await shiftRpc(db,'reality_read_owner_employee_discovery_v1',{
   p_owner_id:session.user_id});
  if(evidence?.status!=='OWNER_EMPLOYEE_DISCOVERY_SOURCE_INVENTORY'||
   evidence.owner_id!==session.user_id||
   evidence.shift_authorized!==false||
   evidence.installation_authorized!==false||
   evidence.production_changed!==false||
   evidence.qualified_jobs!==0||
   !Array.isArray(evidence.roles)||evidence.roles.length!==8||
   !Array.isArray(evidence.items)||evidence.items.length>150||
   !evidence.items.every(x=>
    ['GITHUB_ISSUE','GITHUB_PULL_REQUEST','ROI_EVIDENCE_GAP',
     'MARKET_ASSESSMENT','CAPABILITY_AUDIT'].includes(x.source_family)&&
    x.qualified_job===false&&x.execution_authorized===false))
   throw Error('REALITY_CONNECTIONS_INDEPENDENT_READBACK_UNVERIFIED');
  const requested=await shiftRpc(db,'reality_read_owner_connector_setup_v1',{
   p_owner_id:session.user_id});
  if(requested?.status!=='OWNER_CONNECTION_SETUP_REQUESTS_READ'||
   requested.owner_id!==session.user_id||
   !Array.isArray(requested.requests)||
   requested.requests.length>SOURCES.length||
   requested.request_count!==requested.requests.length||
   requested.oauth_credentials_returned!==false||
   requested.provider_connection_claimed!==false||
   requested.billing_authorized!==false||
   requested.external_actions_authorized!==false||
   new Set(requested.requests.map(x=>x.provider_id)).size!==requested.requests.length||
   !requested.requests.every(x=>
    SOURCES.some(s=>s.id===x.provider_id)&&
    x.setup_state==='SETUP_REQUESTED_NO_CREDENTIALS'&&
    x.credentials_saved===false&&x.provider_connected===false&&
    x.external_action_authorized===false))
   throw Error('REALITY_CONNECTION_SETUP_OWNER_READBACK_UNVERIFIED');
  const requestIds=new Set(requested.requests.map(x=>x.provider_id));
  const registry=new Map(inspectConnectorRegistry(process.env)
   .map(x=>[x.id,x]));
  const ghObserved=evidence.items.filter(x=>
   ['GITHUB_ISSUE','GITHUB_PULL_REQUEST'].includes(x.source_family)&&
   /^https:\/\/github\.com\/maloney2323\/Reality\/(?:issues|pull)\/[1-9][0-9]*$/
    .test(x.source_ref||'')).length;
  const connectors=SOURCES.map(source=>{
   const registered=registry.get(source.id);
   const configured=registered?.credential_present===true;
   const sourceVerified=source.id==='github'&&ghObserved>0;
   const dbVerified=source.id==='supabase';
   return {
    id:source.id,label:source.label,group:source.group,
    description:source.description,employee_roles:source.roles,
    setup_requested:requestIds.has(source.id),
    setup_request_state:requestIds.has(source.id)?
     'SETUP_REQUESTED_NO_CREDENTIALS':'NOT_REQUESTED',
    setup_request_action_available:true,
    auto_detect_supported:Boolean(registered),
    documented_setup_url:source.id==='paypal'?
     'https://developer.paypal.com/api/rest/':
     source.id==='stripe'?'https://docs.stripe.com/connect':null,
    adapter_registered:Boolean(registered),
    credential_configured:configured,
    provider_account_authenticated:false,
    discovery_source_verified:sourceVerified||dbVerified,
    status:dbVerified?'OWNER_DATABASE_READBACK_VERIFIED':
      sourceVerified?'GITHUB_PUBLIC_SOURCE_OBSERVED_NO_OAUTH_CLAIM':
      registered&&configured?'ADAPTER_CONFIGURED_PROVIDER_AUTH_UNVERIFIED':
      registered?'ADAPTER_AVAILABLE_NEEDS_OWNER_SETUP':
      'INTEGRATION_NOT_YET_IMPLEMENTED',
    availability:registered?'EXISTING_REALITY_ADAPTER':'CONNECTOR_IMPLEMENTATION_REQUIRED',
    permission_scope:dbVerified?'EXISTING_OWNER_SCOPED_READ_ONLY':
      sourceVerified?'PUBLIC_REPOSITORY_READ_ONLY':'NO_OWNER_PERMISSION_GRANTED',
    credential_or_oauth_needed:!dbVerified&&!sourceVerified,
    connection_action_available:false,
    external_actions_authorized:false,
    production_changes_authorized:false,
    refunds_authorized:false,
    billing_changes_authorized:false
   };
  });
  return res.status(200).json({
   ok:true,status:'REALITY_OWNER_CONNECTIONS_READ_ONLY_INVENTORY',
   owner_scope_verified:true,read_only:true,
   connection_grants_created:0,oauth_flows_completed:0,
   owner_billing_authorized:false,external_execution_authorized:false,
   provider_oauth_verified_count:0,
   setup_requests_pending:requestIds.size,
   automatic_discovery_of_existing_sources:true,
   automatic_grant_of_new_provider_access:false,
   discovery_checked_at:evidence.checked_at,
   source_work_items_not_jobs:true,providers:connectors
  });
 }catch(err){
  console.warn('REALITY_CONNECTIONS',
   /^REALITY_CONNECTIONS_[A-Z0-9_]+$/.test(err?.message||'')?
    err.message:'OWNER_SOURCE_READBACK_UNAVAILABLE');
  return res.status(503).json({ok:false,
   error:'REALITY_CONNECTIONS_PRIVATE_READBACK_UNAVAILABLE',
   owner_scope_verified:false,external_execution_authorized:false});
 }
}
