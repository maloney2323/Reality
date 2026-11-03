// Reality upgrade category intake: owner-only read of persisted source evidence.
// Connects market assessment, provider-audit, candidate handoff, genuine queue,
// and separately verified settled work. Never creates/qualifies/installs work.
import {authenticatedChatSession,privateChatConfig}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {resolveReliabilityBenchmarkDb}
 from '../../src/reality-reliability-db-boundary-v0.1.js';
const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const SHA=/^[a-f0-9]{64}$/;
const KINDS=new Set(['RESEARCH_OPPORTUNITY','CI_FAILURE_INVESTIGATION',
 'INDEPENDENTLY_TESTED_CANDIDATE','GOVERNED_ORIGINAL_JOB_GAP']);
const STAGES=new Set(['INSPECTED_NEEDS_INDEPENDENT_GAP_TEST',
 'OBSERVED_PROVIDER_FAILURE_ROOT_CAUSE_UNKNOWN',
 'TESTED_AWAITING_FRESH_OWNER_WORK_BINDING',
 'PENDING_FROZEN_REPRODUCTION','LEASED_FOR_INDEPENDENT_REPRODUCTION',
 'FROZEN_REPRODUCED_AWAITING_CANDIDATE',
 'AWAITING_OWNER_APPROVAL','AWAITING_INSTALLATION_APPROVAL']);
export const maxDuration=30;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 try{
  if(req.method!=='GET')
   return res.status(405).setHeader('Allow','GET')
    .json({ok:false,error:'CATEGORY_INTAKE_READ_ONLY'});
  if(Object.keys(req.query||{}).length)
   return res.status(400).json({ok:false,error:'CATEGORY_INTAKE_NO_CLIENT_SCOPE'});
  if(process.env.VERCEL_ENV!=='preview')
   return res.status(403).json({ok:false,error:'CATEGORY_INTAKE_PREVIEW_ONLY'});
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!session||!UUID.test(session.user_id))
   return res.status(401).json({ok:false,error:'CHAT_SIGN_IN_REQUIRED'});
  const db=resolveReliabilityBenchmarkDb();
  if(!db?.strictSecrets||!db.secretKey||db.url!==session.config.url||
   db.project!==process.env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
   db.project!=='hvkfreoagbrphwghjajw')
   throw Error('CATEGORY_INTAKE_ISOLATED_SCOPE_REQUIRED');
  const response=await fetch(db.url+'/rest/v1/rpc/reality_read_owner_capability_gap_feed_v1',{
   method:'POST',cache:'no-store',redirect:'error',headers:{
    apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
    accept:'application/json','content-type':'application/json'},
   body:JSON.stringify({p_owner_id:session.user_id})
  });
  const payload=await response.json().catch(()=>null);
  if(!response.ok||payload?.ok!==true||
   payload.status!=='OWNER_GAP_INTAKE_RECONCILED'||
   payload.owner_id!==session.user_id||
   payload.source_basis!=='PERSISTED_OWNER_EVIDENCE_NO_PROVIDER_LIVE_REFRESH'||
   payload.read_only!==true||
   payload.installation_authorized!==false||
   payload.work_started!==false||
   payload.production_changed!==false||
   !Array.isArray(payload.items)||payload.items.length>30||
   !Array.isArray(payload.settled_history)||payload.settled_history.length>12||
   !payload.counts||typeof payload.counts!=='object'||
   payload.counts.current_candidates!==payload.items.length||
   payload.counts.historical_completed!==payload.settled_history.length||
   !['research_assessed','provider_failures_to_investigate',
     'independently_tested_candidates','governed_active_queue',
     'verified_current_gaps'].every(key=>Number.isSafeInteger(payload.counts[key])&&
     payload.counts[key]>=0&&payload.counts[key]<=30)||
   payload.items.some(x=>!KINDS.has(x.kind)||!STAGES.has(x.stage)||
    !/^(?:research|ci|candidate|queue):[a-f0-9-]{32,64}$/.test(x.key||'')||
    typeof x.title!=='string'||x.title.length<5||x.title.length>220||
    typeof x.next_proof!=='string'||x.next_proof.length<20||
    !Array.isArray(x.pros)||!Array.isArray(x.cons)||
    !Number.isSafeInteger(x.priority)||x.priority<0||x.priority>10||
    x.installation_authorized!==false||x.executable_job!==false||
    x.verified_missing_capability!==true&&x.verified_missing_capability!==false||
    x.verified_missing_capability===true&&x.kind!=='GOVERNED_ORIGINAL_JOB_GAP'||
    typeof x.source_url==='string'&&!(
     /^https:\/\//.test(x.source_url)&&!/[\s<>]/.test(x.source_url))||
    x.source_url!=null&&typeof x.source_url!=='string')||
   new Set(payload.items.map(x=>x.key)).size!==payload.items.length||
   payload.settled_history.some(x=>x.stage!=='SETTLED_ISOLATED'||
    x.historical_settlement_verified!==true||
    x.new_installation_authorized!==false||
    x.verified_missing_capability!==false||
    !/^[a-f0-9]{40}$/.test(x.source_commit||''))||
   payload.counts.verified_current_gaps!==
    payload.items.filter(x=>x.verified_missing_capability===true).length)
   throw Error('CATEGORY_INTAKE_READBACK_INCONSISTENT');
  // Strictly bound to authenticated server session; no browser role or
  // model instruction can change eligibility, findings, or work authority.
  return res.status(200).json({
   ok:true,status:payload.status,
   counts:payload.counts,
   items:payload.items,
   settled_history:payload.settled_history,
   source_basis:payload.source_basis,
   read_only:true,installation_authorized:false,
   work_started:false,production_changed:false});
 }catch(error){
  console.warn('REALITY_GAP_CATEGORY_INTAKE_UNAVAILABLE',
   String(error?.message||'').startsWith('CATEGORY_INTAKE_')?
    'READBACK_OR_CONFIG':'PROVIDER_OR_AUTH');
  return res.status(503).json({
   ok:false,error:'CATEGORY_INTAKE_UNAVAILABLE',
   read_only:true,installation_authorized:false,
   work_started:false,production_changed:false});
 }
}
