// Signed-in real-owner work intake. Read-only discovery is never authority.
// POST binds ONE independently failing existing GitHub issue to the confirmed
// personal GoalState in Continuity, then dispatches isolated investigation.
// Installation and settlement remain separate owner-gated consequences.
import {privateChatConfig,authenticatedChatSession,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {
 discoverRealRepairOpportunities,authorizeExistingRealRepairWork
} from '../../src/reality-real-repair-opportunity-intake-v1.0.js';
import {queueOwnerGovernedBuild}
 from '../../src/reality-governed-build-chat-connection-v1.0.js';
import {queueVerifiedOriginalRepair}
 from '../../src/reality-original-repair-worker-handoff-v1.0.js';
import {autoPrepareOriginalJobCandidate}
 from '../../src/reality-governed-auto-trigger-candidate-v1.0.js';
import {prepareVerifiedOwnerRepairCandidate}
 from '../../src/reality-owner-repair-candidate-admission-v1.0.js';
export const maxDuration=120;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 try{
  privateChatConfig();
  if(!['GET','POST'].includes(req.method)){
   res.setHeader('Allow','GET, POST');
   return res.status(405).json({ok:false,error:'REAL_REPAIR_METHOD_REJECTED'});
  }
  const session=await authenticatedChatSession(req,res);
  if(!session)return res.status(401).json({ok:false,error:'CHAT_SIGN_IN_REQUIRED'});
  if(Object.keys(req.query||{}).length)
   return res.status(400).json({ok:false,error:'REAL_REPAIR_CLIENT_SCOPE_REJECTED'});
  if(req.method==='GET'){
   const found=await discoverRealRepairOpportunities();
   return res.status(200).json({ok:true,...found});
  }
  if(!req.headers?.origin)
   return res.status(403).json({ok:false,error:'REAL_REPAIR_ORIGIN_REQUIRED'});
  assertSameOrigin(req);
  if(!String(req.headers?.['content-type']||'').includes('application/json'))
   return res.status(415).json({ok:false,error:'REAL_REPAIR_JSON_REQUIRED'});
  const data=req.body;
  if(!data||typeof data!=='object'||Array.isArray(data)||
   Object.keys(data).sort().join(',')!==
    'conversation_id,expected_failed_run_id,expected_source_sha,intent,issue_number'||
   data.intent!=='AUTHORIZE_SOURCE_VERIFIED_ORIGINAL_REPAIR'||
   !Number.isSafeInteger(data.issue_number)||data.issue_number<1||
   !Number.isSafeInteger(data.expected_failed_run_id)||
   !/^[a-f0-9]{40}$/.test(String(data.expected_source_sha||''))||
   !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(
     String(data.conversation_id||'')))
   return res.status(403).json({ok:false,error:'REAL_REPAIR_EXACT_OWNER_CONSENT_REQUIRED'});
  const work=await authorizeExistingRealRepairWork({
   session,conversationId:data.conversation_id,
   issueNumber:data.issue_number,
   expectedFailedRunId:data.expected_failed_run_id,
   expectedSourceSha:data.expected_source_sha,
  });
  // Existing owner-authorized work already has generated, independently tested
  // candidate evidence. Prepare that exact work for owner review first,
  // without dispatching a second job or granting installation authority.
  let candidateReadbackError=null;
  try{
   const ready=await prepareVerifiedOwnerRepairCandidate({
    session,expectedOriginalWorkId:work.original_work_id,
    issueNumber:data.issue_number,
   });
   if(ready.status!=='EXACT_CANDIDATE_AWAITING_SIGNED_OWNER_INSTALL_APPROVAL'||
      ready.original_work_id!==work.original_work_id||
      ready.independent_readback_verified!==true||
      ready.owner_installation_approved!==false||
      ready.original_job_completed!==false||
      ready.production_changed!==false)
    throw Error('REAL_REPAIR_CANDIDATE_UNTRUSTED_PREPARATION');
   return res.status(202).json({
    ok:true,...ready,
    original_conversation_id:work.original_conversation_id,
    owner_work_receipt_ref:work.source_receipt_id,
    investigation_authorized:true,installation_authorized:false,
    owner_action_required:true,worker_dispatch_started:false,
    original_job_completed:false,production_changed:false,
   });
  }catch(error){
   const code=String(error?.message||'');
   candidateReadbackError=/^(?:REAL_OWNER_CANDIDATE_|REAL_REPAIR_READBACK_|GENERAL_CHECKPOINT_)[A-Z0-9_]{4,140}$/.test(code)?
    code:'REAL_REPAIR_CANDIDATE_RECONCILIATION_REQUIRED';
  }
  // Governed auto-trigger: after the existing signed-in owner-authorized
  // investigation, continue automatically into the ALREADY independently
  // verified candidate/checkpoint if present. This does not install anything.
  // If no candidate is ready yet, preserve the original source and continue
  // to the existing separate model-generation/discovery worker path.
  let autoTriggerCandidate=null;
  if(process.env.REALITY_GOVERNED_AUTO_TRIGGER_ENABLED==='true'&&
    work.governed_auto_trigger?.status==='PENDING_VERIFIED_GAP_REOBSERVATION'){
   try{
    autoTriggerCandidate=await autoPrepareOriginalJobCandidate({
     session,trigger:work.governed_auto_trigger,
     originalWorkId:work.original_work_id,issueNumber:data.issue_number,
    });
   }catch{
    autoTriggerCandidate=null;
   }
  }
  if(autoTriggerCandidate)return res.status(202).json({
   ok:true,...autoTriggerCandidate,
   original_conversation_id:work.original_conversation_id,
   owner_work_receipt_ref:work.source_receipt_id,
   investigation_authorized:true,installation_authorized:false,
   original_job_completed:false,production_changed:false,
  });
  // The first action has already persisted independently. A failed worker
  // dispatch must remain recoverable without duplicating this original job.
  let queued;
  try{
   queued=process.env.REALITY_GOVERNED_AUTO_TRIGGER_ENABLED==='true'?
    await queueVerifiedOriginalRepair({session,work}):
    await queueOwnerGovernedBuild({
     session,expectedOriginalWorkId:work.original_work_id,
    });
  }catch(error){
   const code=String(error?.message||'');
   return res.status(202).json({
    ok:true,status:'REAL_OWNER_WORK_SAVED_WORKER_DISPATCH_BLOCKED',
    candidate_readback_error:candidateReadbackError,
    original_work_id:work.original_work_id,
    original_conversation_id:work.original_conversation_id,
    issue_url:work.issue_url,
    owner_work_receipt_ref:work.source_receipt_id,
    worker_dispatch_error:/^(?:GOVERNED_BUILD_|REAL_ORIGINAL_BUILD_)[A-Z0-9_]+$/.test(code)?
     code:'GOVERNED_BUILD_WORKER_NOT_DISPATCHED',
    investigation_authorized:true,installation_authorized:false,
    original_job_completed:false,production_changed:false,
   });
  }
  return res.status(202).json({
   ok:true,status:'REAL_OWNER_REPAIR_INVESTIGATION_QUEUED',
   original_work_id:work.original_work_id,
   original_conversation_id:work.original_conversation_id,
   issue_url:work.issue_url,queue_id:queued.queue_id,
   phase:queued.phase,worker_dispatch_started:
    queued.worker_dispatch_started===true,
   owner_work_receipt_ref:work.source_receipt_id,
   investigation_authorized:true,installation_authorized:false,
   original_job_completed:false,production_changed:false,
  });
 }catch(error){
  const code=String(error?.message||'');
  const allowed=/^(?:REALITY_REAL_REPAIR_|REAL_REPAIR_|GOVERNED_BUILD_|PERSONAL_GOAL_|UNIVERSE_|CHAT_)[A-Z0-9_]{4,110}$/;
  return res.status(error?.status||503).json({ok:false,
   error:allowed.test(code)?code:'REAL_REPAIR_SOURCE_OR_GOAL_READBACK_UNAVAILABLE',
   investigation_authorized:false,installation_authorized:false,
   original_job_completed:false,production_changed:false});
 }
}
