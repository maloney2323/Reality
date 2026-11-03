// Explicit signed-in owner action: create a NEW source-backed original job
// for the independently verified #188 candidate, then perform read-only
// investigation and enqueue capability-gap discovery in existing governor.
// NEVER reuses historical #188 approval, installs, or settles a job.
import {authenticatedChatSession,privateChatConfig,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {validUuid} from '../../src/reality-private-chat-store-v0.1.js';
import {createIssue188OwnerFollowon}
 from '../../src/reality-issue188-owner-followon-binding-v1.js';
import {createGenuineSourceBackedJobAdapters}
 from '../../src/reality-genuine-source-backed-job-v1.js';
import {createGenuineOriginalWorkRunner}
 from '../../src/reality-genuine-capability-execution-runtime-v1.js';
export const maxDuration=120;
const SHA='d084f46d840027acd412b67fceb1636fd35a64f2cc08b9ebb6666d470d1af43d';
const safe=/^FOLLOWON_188_[A-Z0-9_]{5,130}$/;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 try{
  privateChatConfig();
  if(req.method!=='POST'){
   res.setHeader('Allow','POST');
   return res.status(405).json({ok:false,error:'EXPLICIT_OWNER_FOLLOWON_POST_REQUIRED'});
  }
  if(!req.headers?.origin||!/^application\/json(?:;|$)/i.test(
     String(req.headers['content-type']||'')))
   return res.status(403).json({ok:false,error:'SAME_ORIGIN_JSON_REQUIRED'});
  assertSameOrigin(req);
  const session=await authenticatedChatSession(req,res);
  if(!session)return res.status(401).json({ok:false,error:'CHAT_SIGN_IN_REQUIRED'});
  const body=req.body;
  if(!body||Array.isArray(body)||typeof body!=='object'||
   Object.keys(body).sort().join(',')!=='conversation_id,intent,source_sha256'||
   body.intent!=='CREATE_FRESH_ISSUE188_FOLLOWON_INVESTIGATION'||
   !validUuid(body.conversation_id)||body.source_sha256!==SHA)
   return res.status(403).json({ok:false,error:'EXACT_NEW_OWNER_WORK_CONFIRMATION_REQUIRED'});
  const created=await createIssue188OwnerFollowon({
   session,conversationId:body.conversation_id,requestedSourceHash:SHA
  });
  if(created.status!=='FRESH_FOLLOWON_OWNER_INVESTIGATION_BOUND'||
    created.model_candidate_sha256!==SHA||
    created.investigation_authorized!==true||
    created.installation_authorized!==false||
    created.original_job_completed!==false)
   throw Error('FOLLOWON_188_SOURCE_BOUND_READBACK_MISMATCH');
  // This is a separately recoverable, READ-ONLY internal operation. If the
  // existing worker connector is unavailable, preserve the new owner source
  // instead of claiming that an upgrade was queued or completed.
  let investigation=null,investigationError=null;
  try{
   const trusted=createGenuineSourceBackedJobAdapters({
    session,conversationId:body.conversation_id
   });
   const run=createGenuineOriginalWorkRunner({
    session,conversationId:body.conversation_id,
    loadAuthorizedInternalJob:trusted.loadAuthorizedInternalJob,
    makeProviderReadback:trusted.makeProviderReadback,
   });
   investigation=await run({originalWorkId:created.new_original_work_id});
   if(investigation.original_work_id!==created.new_original_work_id||
      investigation.original_job_completed!==false||
      investigation.production_changed!==false)
    throw Error('FOLLOWON_188_INVESTIGATION_RESPONSE_CONFLICT');
  }catch(error){
   const raw=String(error?.message||'');
   investigationError=/^(GENUINE_SOURCE_JOB_|GENUINE_EXECUTION_RUNTIME_|GENUINE_PREVIEW_)[A-Z0-9_]{5,100}$/.test(raw)?
     raw:'FOLLOWON_INVESTIGATION_NEEDS_RECONCILIATION';
  }
  return res.status(202).json({
   ok:true,...created,
   investigation_status:investigation?.capability_response||'SAVED_PENDING_INVESTIGATION',
   governed_worker_wake_status:investigation?.worker_wake_status||null,
   queue_trigger_id:investigation?.queue_trigger_id||null,
   investigation_error:investigationError,
   owner_approval_issued:false,
   exact_candidate_qualified:false,
   installation_performed:false,
   original_job_completed:false,production_changed:false
  });
 }catch(error){
  const raw=String(error?.message||'');
  return res.status(503).json({ok:false,
   error:safe.test(raw)?raw:'FOLLOWON_188_OWNER_SOURCE_OR_PROVIDER_UNAVAILABLE',
   owner_approval_issued:false,installation_performed:false,
   original_job_completed:false,production_changed:false});
 }
}
