// Authenticated Reality Chat bridge for provider-verified research stage state.
// The model sees a compact, trusted *observation*, not permissions or instructions.
import {resolveReliabilityBenchmarkDb}
 from './reality-reliability-db-boundary-v0.1.js';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const REPORT=/^[a-f0-9]{64}$/;
const EVENT=new Set(['RESEARCH_HANDOFF_ABSENT_DETECTED',
 'AUTO_REPAIRED_INVESTIGATION_HANDOFF',
 'INDEPENDENT_FAILURE_PROOF_STILL_REQUIRED']);
const allowText=t=>/\b(reality|repair|upgrade|research|capabilit(?:y|ies)|market|competitor|fix|broken|stuck|stage|progress|investigat(?:e|ion)|why|next step|automation|self.?heal|self.?improve)\b/i.test(t||'');
export async function readVerifiedMarketStageForChat({
 session,message,env=process.env,db=resolveReliabilityBenchmarkDb(env),
 fetchImpl=fetch
}={}){
 if(!allowText(message))return [];
 if(env.VERCEL_ENV!=='preview'||!UUID.test(session?.user_id)||
  !db?.strictSecrets||!db.secretKey||db.url!==session?.config?.url||
  db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
  db.project!=='hvkfreoagbrphwghjajw')return [];
 try{
  const response=await fetchImpl(db.url+
   '/rest/v1/rpc/reality_read_owner_market_stage_v1',{
   method:'POST',redirect:'error',cache:'no-store',
   headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
    'content-type':'application/json',accept:'application/json'},
   body:JSON.stringify({p_owner_id:session.user_id})});
  const data=await response.json().catch(()=>null);
  if(!response.ok||data?.ok!==true||
   data.owner_id!==session.user_id||data.read_only!==true||
   data.installation_authorized!==false||
   data.external_execution_authorized!==false||
   data.production_changed!==false||
   data.status!=='AUTO_REPAIRED_RESEARCH_STAGE_HANDOFF'||
   data.stage_handoff_verified!==true||
   !UUID.test(data.receipt_id)||!REPORT.test(data.report_sha256)||
   !Array.isArray(data.items)||!data.items.length||
   data.items.length>4||data.expected_findings!==data.items.length||
   !Array.isArray(data.events)||data.events.length>24||
   data.items.some(x=>x.phase!=='EVIDENCE_INSPECTED_INDEPENDENT_TEST_REQUIRED'||
    x.stage_repair_verified!==true||
    x.verified_missing_capability!==false||
    x.owner_install_authorized!==false||
    x.report_sha256!==data.report_sha256)||
   !['RESEARCH_HANDOFF_ABSENT_DETECTED',
    'AUTO_REPAIRED_INVESTIGATION_HANDOFF',
    'INDEPENDENT_FAILURE_PROOF_STILL_REQUIRED'].every(name=>
     data.events.some(e=>e.event_code===name&&EVENT.has(e.event_code))))
   return [];
  // NO model-authored fields are copied; user and model cannot choose the
  // job, source claim, permission, stage, repair outcome or installation.
  const count=data.items.length;
  const eventTime=data.events.map(x=>Date.parse(x.observed_at)).filter(Number.isFinite);
  const mostRecent=eventTime.length?new Date(Math.max(...eventTime)).toISOString():null;
  return [Object.freeze({
   entry_id:'market-stage:'+data.receipt_id,
   event_kind:'reality_internal_stage_repair_receipt',
   source_kind:'AUTHENTICATED_OWNER_SERVICE_ROLE_SUPABASE_READBACK',
   source_ref:'reality:market-stage-receipt:'+data.receipt_id,
   assertion_time:mostRecent,
   epistemic_status:'OBSERVED_STAGE_STATE_NOT_CAPABILITY_VERIFICATION',
   summary:'REALITY VERIFIED WORKFLOW STAGE: Market research captured '+count+
    ' source-linked hypotheses. Reality independently detected that no research-to-investigation handoff existed, and the database watchdog restored the READ-ONLY investigation stage. Its subsequent evidence-sufficiency assessment found no independently reproduced frozen original-job failure yet. NEXT BLOCKER: independent source/runtime reproduction must establish a real missing capability before the existing repair engine may generate an upgrade. This is NOT a verified missing capability, an executed repair, a completed customer job or an authorization.',
   stage_handoff_verified:true,
   verified_missing_capabilities:0,
   installation_authorized:false,external_execution_authorized:false,
   production_changed:false,
  })];
 }catch{return []}
}
