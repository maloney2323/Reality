// Reality Chat — authenticated, read-only self-repair stage events.
// The DB watchdog owns autonomous detection/reconciliation. No browser wake,
// retries, approval or installation is performed by this status endpoint.
import {privateChatConfig,authenticatedChatSession}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {resolveReliabilityBenchmarkDb}
 from '../../src/reality-reliability-db-boundary-v0.1.js';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{64}$/;
const STATES=new Set(['EVIDENCE_INSPECTED_INDEPENDENT_TEST_REQUIRED',
 'INVESTIGATION_ADMITTED_READ_ONLY']);
const EVENTS=new Set(['RESEARCH_HANDOFF_ABSENT_DETECTED',
 'AUTO_REPAIRED_INVESTIGATION_HANDOFF',
 'INDEPENDENT_FAILURE_PROOF_STILL_REQUIRED']);
export const maxDuration=30;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 try{
  if(req.method!=='GET')return res.status(405)
   .setHeader('Allow','GET').json({ok:false,error:'MARKET_STAGE_READ_ONLY'});
  if(Object.keys(req.query||{}).length)
   return res.status(400).json({ok:false,error:'MARKET_STAGE_CLIENT_SCOPE_FORBIDDEN'});
  if(process.env.VERCEL_ENV!=='preview')
   return res.status(403).json({ok:false,error:'MARKET_STAGE_PREVIEW_ONLY'});
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!session||!UUID.test(session.user_id))
   return res.status(401).json({ok:false,error:'CHAT_SIGN_IN_REQUIRED'});
  const db=resolveReliabilityBenchmarkDb();
  if(!db?.strictSecrets||!db.secretKey||db.url!==session.config.url||
     db.project!==process.env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
     db.project!=='hvkfreoagbrphwghjajw')
   throw Error('MARKET_STAGE_ISOLATED_DATABASE_REQUIRED');
  const response=await fetch(db.url+'/rest/v1/rpc/reality_read_owner_market_stage_v1',{
   method:'POST',cache:'no-store',redirect:'error',headers:{
    apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
    'content-type':'application/json',accept:'application/json'},
   body:JSON.stringify({p_owner_id:session.user_id})
  });
  const data=await response.json().catch(()=>null);
  if(!response.ok||data?.ok!==true||data.owner_id!==session.user_id||
     !['NO_SAVED_RESEARCH','RESEARCH_STALLED_NO_INVESTIGATION_HANDOFF',
       'AUTO_REPAIRED_RESEARCH_STAGE_HANDOFF'].includes(data.status)||
     data.read_only!==true||data.production_changed!==false||
     data.installation_authorized!==false||
     data.external_execution_authorized!==false||
     !Array.isArray(data.items)||data.items.length>4||
     !Array.isArray(data.events)||data.events.length>24||
     data.items.some(x=>!SHA.test(x.finding_fingerprint)||!STATES.has(x.phase)||
      !UUID.test(data.receipt_id)||!SHA.test(x.report_sha256)||
      !['RESEARCH_TO_INVESTIGATION_HANDOFF_MISSING',
       'INDEPENDENT_FROZEN_FAILURE_PROOF_MISSING'].includes(x.diagnosis_code)||
      x.owner_install_authorized!==false||
      x.verified_missing_capability!==false||
      x.stage_repair_verified!==true)||
     data.events.some(x=>!UUID.test(x.event_id)||
      !SHA.test(x.finding_fingerprint)||!EVENTS.has(x.event_code))||
     (data.status==='AUTO_REPAIRED_RESEARCH_STAGE_HANDOFF'&&
      (data.stage_handoff_verified!==true||data.expected_findings!==data.items.length||
       data.items.some(x=>x.phase!=='EVIDENCE_INSPECTED_INDEPENDENT_TEST_REQUIRED'))))
   throw Error('MARKET_STAGE_TRUSTED_READBACK_FAILED');
  return res.status(200).json({
   ok:true,status:data.status,
   receipt_id:data.receipt_id||null,
   expected_findings:data.expected_findings||0,
   items:data.items,
   events:data.events,
   read_only:true,
   stage_handoff_verified:data.stage_handoff_verified===true,
   installation_authorized:false,external_execution_authorized:false,
   executable_job_created:false,production_changed:false,
  });
 }catch(error){
  console.warn('REALITY_MARKET_STAGE_READBACK_FAILED',
    String(error?.message||'').startsWith('MARKET_STAGE_')?'STAGE_TRUST':'CONFIG_OR_PROVIDER');
  return res.status(503).json({
   ok:false,error:'MARKET_STAGE_READBACK_UNAVAILABLE',
   stage_handoff_verified:false,installation_authorized:false,
   production_changed:false,external_execution_authorized:false});
 }
}
