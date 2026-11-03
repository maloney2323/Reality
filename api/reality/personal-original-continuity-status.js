// Read-only owner continuity status for existing source-backed original jobs.
// It cannot enqueue, wake, install, resume or settle. Every queue is matched
// by exact owner, conversation AND original work, then independently verified.
import {privateChatConfig,authenticatedChatSession}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {validUuid}
 from '../../src/reality-private-chat-store-v0.1.js';
import {resolveReliabilityBenchmarkDb}
 from '../../src/reality-reliability-db-boundary-v0.1.js';
import {listAuthenticatedUnfinishedWork}
 from '../../src/reality-personal-unfinished-work-v0.1.js';
import {readFreshPersonalGoalState}
 from '../../src/reality-personal-goal-readback-v0.1.js';
import {verifyGovernedOriginalContinuity}
 from '../../src/reality-governed-original-continuity-v1.0.js';
export const maxDuration=60;
const WORK=/^work:[a-f0-9]{32}$/;
const SOURCE=/^[a-f0-9]{40}$/;
const ISSUE=/^https:\/\/github\.com\/maloney2323\/Reality\/issues\/[1-9][0-9]*$/;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 try{
  privateChatConfig();
  if(req.method!=='GET'||Object.keys(req.query||{}).length)
   return res.status(405).json({ok:false,error:'OWNER_CONTINUITY_READ_ONLY_REQUIRED'});
  const session=await authenticatedChatSession(req,res);
  if(!session)return res.status(401).json({ok:false,error:'CHAT_SIGN_IN_REQUIRED'});
  const env=process.env,db=resolveReliabilityBenchmarkDb(env);
  if(env.VERCEL_ENV!=='preview'||!validUuid(session.user_id)||
     !db?.strictSecrets||!db.secretKey||
     db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
     db.url!==session.config?.url)
   return res.status(403).json({ok:false,error:'OWNER_CONTINUITY_ISOLATED_SCOPE_REQUIRED'});
  const pending=await listAuthenticatedUnfinishedWork({session,env});
  if(pending.status!=='SCOPED_READ_ONLY'||pending.coverage_limited!==false||
     pending.result_truncated!==false||!Array.isArray(pending.jobs)||
     pending.jobs.length>30)
   return res.status(503).json({ok:false,error:'OWNER_CONTINUITY_LEDGER_COVERAGE_REQUIRED'});
  const sources=pending.jobs.filter(j=>
   j.state==='REAL_SOURCE_BACKED_REPAIR_PENDING'&&
   j.action_completed===true&&j.goal_still_current===true&&
   j.job_completed===false&&WORK.test(String(j.original_work_id||''))&&
   validUuid(j.conversation_id)&&validUuid(j.source_receipt_id)&&
   SOURCE.test(String(j.original_source_sha||''))&&ISSUE.test(String(j.issue_url||''))&&
   Number.isSafeInteger(j.original_provider_failed_run_id)&&
   j.original_provider_failed_run_id>0);
  if(sources.length>12)
   return res.status(503).json({ok:false,error:'OWNER_CONTINUITY_JOBS_LIMIT_REVIEW_REQUIRED'});
  const jobs=[];
  for(const j of sources){
   // Every independent verifier is scoped to the authenticated owner.
   const goal=await readFreshPersonalGoalState({
    session,conversationId:j.conversation_id,env});
   const original={...j,goal_id:goal.state?.active_goal_id,
    original_conversation_id:j.conversation_id};
   const r=await fetch(db.url+
    '/rest/v1/rpc/reality_read_exact_original_queue_v1',{
    method:'POST',redirect:'error',cache:'no-store',
    headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
     'content-type':'application/json',accept:'application/json'},
    body:JSON.stringify({p_owner_id:session.user_id,
     p_conversation_id:j.conversation_id,p_original_work_id:j.original_work_id})
   });
   const q=await r.json().catch(()=>null);
   if(!r.ok||!q||typeof q!=='object')
    throw Error('OWNER_CONTINUITY_EXACT_QUEUE_UNAVAILABLE');
   if(!q.queue_id){
    jobs.push({original_work_id:j.original_work_id,
     decision:'VERIFIED_OWNER_ORIGINAL_AWAITING_FIRST_QUEUE',
     queue_id:null,queue_phase:null,worker_run_ref:null});
    continue;
   }
   const verified=await verifyGovernedOriginalContinuity({
    session,work:original,goal,queue:q,env});
   jobs.push({original_work_id:j.original_work_id,
    queue_id:verified.queue_id,queue_phase:verified.queue_phase,
    decision:verified.decision,
    worker_run_ref:verified.worker_observation?.worker_run_ref||null,
    worker_run_status:verified.worker_observation?.worker_run_status||null});
  }
  return res.status(200).json({ok:true,
   status:'OWNER_ORIGINAL_CONTINUITY_VERIFIED_READ_ONLY',
   jobs,installation_authorized:false,original_job_completed:false,
   production_changed:false,external_action_performed:false});
 }catch{
  return res.status(503).json({ok:false,error:'OWNER_CONTINUITY_VERIFIED_READBACK_UNAVAILABLE',
   installation_authorized:false,original_job_completed:false,
   production_changed:false});
 }
}
