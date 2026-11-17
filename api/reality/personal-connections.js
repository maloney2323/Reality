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
  description:'Authorized team work signals, decisions and handoffs.'}
]);
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET')return res.status(405).setHeader('Allow','GET')
  .json({ok:false,error:'REALITY_CONNECTIONS_READ_ONLY'});
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
