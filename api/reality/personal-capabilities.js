// Existing Reality capability ledger + expiring owner standing delegation.
// A page read never grants work authority. A signed, same-origin owner POST
// may enable/pause only bounded evidence-only autonomous investigation.
import {privateChatConfig,authenticatedChatSession,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {shiftDatabase,shiftRpc}
 from '../../src/reality-governed-shift-boundary-v1.js';
export const maxDuration=45;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const kinds=new Set(['RESEARCH_OPPORTUNITY','INDEPENDENTLY_TESTED_CANDIDATE',
 'FROZEN_UNBOUND_SOURCE','VERIFIED_SOURCE_CANDIDATE']);
const actions=new Set(['ENABLE_ROUTINE_DISCOVERY','PAUSE_ROUTINE_DISCOVERY']);
export function projectOwnerCapabilityWorkspace({ownerId,feed,grant}={}){
 if(!UUID.test(ownerId||'')||
  feed?.status!=='OWNER_GAP_INTAKE_RECONCILED'||
  feed.ok!==true||feed.owner_id!==ownerId||
  feed.read_only!==true||feed.work_started!==false||
  feed.production_changed!==false||
  !Array.isArray(feed.items)||feed.items.length>20||
  feed.counts?.current_candidates!==feed.items.length||
  !Number.isSafeInteger(feed.counts.verified_current_gaps)||
  feed.counts.verified_current_gaps<0||
  !Number.isSafeInteger(feed.counts.governed_active_queue)||
  feed.counts.governed_active_queue<0||
  grant?.status!=='OWNER_STANDING_ROUTINE_DELEGATION_READ_ONLY'||
  grant.owner_id!==ownerId||grant.owner_scope_verified!==true||
  grant.read_only!==true||
  grant.scope!=='EVIDENCE_ONLY_EMPLOYEE_DISCOVERY_V1'||
  grant.external_actions_authorized!==false||
  grant.installation_authorized!==false||
  grant.shift_execution_authorized!==false||
  grant.production_changed!==false)
  throw Error('CAPABILITIES_OWNER_SOURCE_OR_DELEGATION_NOT_VERIFIED');
 const seen=new Set();
 const items=feed.items.map(x=>{
  if(!kinds.has(x?.kind)||
   typeof x.key!=='string'||!x.key||x.key.length>180||seen.has(x.key)||
   typeof x.title!=='string'||!x.title.trim()||x.title.length>240||
   x.executable_job!==false||
   x.installation_authorized!==false||
   x.verified_missing_capability!==false||
   (x.source_url!=null&&!/^https:\/\//.test(x.source_url)))
   throw Error('CAPABILITY_UNVERIFIED_OR_DUPLICATE');
  seen.add(x.key);
  return Object.freeze({
   key:x.key,title:x.title,kind:x.kind,
   stage:typeof x.stage==='string'?x.stage:'UNVERIFIED',
   priority:Number.isFinite(x.priority)?x.priority:null,
   next_proof:typeof x.next_proof==='string'?x.next_proof.slice(0,900):null,
   potential_value:typeof x.potential_value==='string'?
    x.potential_value.slice(0,500):null,
   last_seen_at:x.last_seen_at||null,
   source_url:x.source_url||null,
   assigned_employee:null,
   owner_assignment_status:'AWAITING_EMPLOYEE_OWNED_QUALIFICATION',
   estimated_hours:null,
   estimate_confidence:'NOT_SCOPED_NO_FABRICATED_HOURS',
   executable_job:false,
   execution_authorized:false,
   installation_authorized:false
  });
 });
 return Object.freeze({
  status:'OWNER_CAPABILITY_AND_ROUTINE_DELEGATION_WORKSPACE',
  owner_scope_verified:true,read_only:true,
  source_basis:feed.source_basis,
  candidate_count:items.length,
  verified_current_gaps:feed.counts.verified_current_gaps,
  active_capability_queue:feed.counts.governed_active_queue,
  independently_tested_candidates:feed.counts.independently_tested_candidates,
  items:Object.freeze(items),
  standing_delegation:Object.freeze({
   enabled:grant.enabled===true,active:grant.currently_active===true,
   scope:grant.scope,expires_at:grant.expires_at,
   max_daily_inquiries:grant.max_daily_inquiries,
   today_reserved:grant.today_reserved,
   external_actions_authorized:false,
   installation_authorized:false
  }),
  jobs_created_by_read:0,production_changed:false
 });
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(!['GET','POST'].includes(req.method))
  return res.status(405).setHeader('Allow','GET, POST').json({ok:false,error:'CAPABILITY_METHOD_NOT_ALLOWED'});
 if(process.env.VERCEL_ENV!=='preview')
  return res.status(403).json({ok:false,error:'CAPABILITIES_PREVIEW_ONLY'});
 if(Object.keys(req.query||{}).length)
  return res.status(400).json({ok:false,error:'CAPABILITIES_CLIENT_SCOPE_FORBIDDEN'});
 try{
  if(req.method==='POST'){
   if(!req.headers?.origin)throw Error('CAPABILITY_SAME_ORIGIN_REQUIRED');
   assertSameOrigin(req);
   if(!String(req.headers?.['content-type']||'').includes('application/json')||
    !req.body||typeof req.body!=='object'||Array.isArray(req.body)||
    Object.keys(req.body).length!==1||
    !actions.has(req.body.action))
    return res.status(400).json({ok:false,error:'CAPABILITY_EXPLICIT_OWNER_ACTION_REQUIRED'});
  }
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!session||!UUID.test(session.user_id))
   return res.status(401).json({ok:false,error:'CAPABILITY_OWNER_SIGN_IN_REQUIRED'});
  const db=shiftDatabase(process.env);
  if(db.url!==session.config?.url||db.project!==
   process.env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
   return res.status(403).json({ok:false,error:'CAPABILITY_OWNER_DATABASE_SCOPE_UNVERIFIED'});
  if(req.method==='POST'){
   const enabled=req.body.action==='ENABLE_ROUTINE_DISCOVERY';
   const grant=await shiftRpc(db,'reality_set_owner_routine_delegation_v1',{
    p_owner_id:session.user_id,p_enabled:enabled
   });
   if(grant?.owner_id!==session.user_id||grant.enabled!==enabled||
      grant.scope!=='EVIDENCE_ONLY_EMPLOYEE_DISCOVERY_V1'||
      grant.shift_execution_authorized!==false||
      grant.original_job_admission_authorized!==false||
      grant.external_actions_authorized!==false||
      grant.installation_authorized!==false||
      grant.production_changed!==false)
    throw Error('CAPABILITY_GRANT_DURABLE_RECEIPT_NOT_VERIFIED');
   const read=await shiftRpc(db,'reality_read_owner_routine_delegation_v1',{
    p_owner_id:session.user_id
   });
   if(read?.owner_id!==session.user_id||read.enabled!==enabled||
      read.currently_active!==enabled||read.production_changed!==false)
    throw Error('CAPABILITY_GRANT_READBACK_FAILED');
   return res.status(200).json({ok:true,
    status:enabled?'OWNER_ROUTINE_DISCOVERY_ENABLED':'OWNER_ROUTINE_DISCOVERY_PAUSED',
    standing_delegation:read,work_created:0,
    execution_authorized:false,installation_authorized:false,
    production_changed:false});
  }
  const [feed,grant]=await Promise.all([
   shiftRpc(db,'reality_read_owner_capability_gap_feed_v1',{
    p_owner_id:session.user_id
   }),
   shiftRpc(db,'reality_read_owner_routine_delegation_v1',{
    p_owner_id:session.user_id
   })
  ]);
  return res.status(200).json({ok:true,
   ...projectOwnerCapabilityWorkspace({ownerId:session.user_id,feed,grant})});
 }catch{
  return res.status(503).json({ok:false,
   error:'OWNER_CAPABILITIES_OR_DELEGATION_PROOF_UNAVAILABLE',
   work_created:0,execution_authorized:false,
   installation_authorized:false,production_changed:false});
 }
}
