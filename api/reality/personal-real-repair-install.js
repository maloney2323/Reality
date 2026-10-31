// The ONLY owner-facing install/continue entrypoint. A signed-in, same-origin,
// exact-source click creates atomic Supabase owner authority; continuation may
// consume that authority but can never create it. No model approval, no main.
import {privateChatConfig,authenticatedChatSession,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {createLiveGeneralRepairService}
 from '../../src/reality-live-approved-install-to-settlement-v1.0.js';
export const maxDuration=300;
const WORK=/^work:[a-f0-9]{32}$/,HASH=/^[a-f0-9]{64}$/;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 try{
  privateChatConfig();
  if(req.method!=='POST'){
   res.setHeader('Allow','POST');
   return res.status(405).json({ok:false,error:'REAL_INSTALL_POST_ONLY'});
  }
  if(!req.headers?.origin)
   return res.status(403).json({ok:false,error:'REAL_INSTALL_ORIGIN_REQUIRED'});
  assertSameOrigin(req);
  if(!String(req.headers['content-type']||'').toLowerCase().includes('application/json'))
   return res.status(415).json({ok:false,error:'REAL_INSTALL_JSON_REQUIRED'});
  if(Object.keys(req.query||{}).length)
   return res.status(403).json({ok:false,error:'REAL_INSTALL_CLIENT_SCOPE_REJECTED'});
  const session=await authenticatedChatSession(req,res);
  if(!session)return res.status(401).json({ok:false,error:'CHAT_SIGN_IN_REQUIRED'});
  const b=req.body;
  if(!b||Array.isArray(b)||typeof b!=='object'||
    !Number.isSafeInteger(b.issue_number)||b.issue_number<1||
    !WORK.test(String(b.expected_original_work_id||'')))
   return res.status(400).json({ok:false,error:'REAL_INSTALL_EXACT_ORIGINAL_WORK_REQUIRED'});
  const service=createLiveGeneralRepairService({session});
  if(b.intent==='OWNER_APPROVE_EXACT_INSTALL'){
   if(Object.keys(b).sort().join(',')!==
     'candidate_artifact_hash,expected_checkpoint_hash,expected_original_work_id,intent,issue_number'||
     !HASH.test(String(b.candidate_artifact_hash||''))||
     !HASH.test(String(b.expected_checkpoint_hash||'')))
    return res.status(403).json({ok:false,error:'REAL_INSTALL_EXPLICIT_EXACT_SOURCE_APPROVAL_REQUIRED'});
   const result=await service.ownerApproveAndInstall({
    originalWorkId:b.expected_original_work_id,issueNumber:b.issue_number,
    expectedArtifactHash:b.candidate_artifact_hash,
    expectedCheckpointHash:b.expected_checkpoint_hash});
   return res.status(202).json({ok:true,...result});
  }
  if(b.intent==='CONTINUE_PREVIOUSLY_APPROVED_INSTALL'){
   if(Object.keys(b).sort().join(',')!==
      'expected_original_work_id,intent,issue_number')
    return res.status(403).json({ok:false,error:'REAL_INSTALL_CONTINUATION_SCOPE_REJECTED'});
   const result=await service.continueAfterInstall({
    originalWorkId:b.expected_original_work_id,issueNumber:b.issue_number});
   return res.status(result.original_job_completed===true?200:202).json({
    ok:true,...result});
  }
  return res.status(403).json({ok:false,error:'REAL_INSTALL_UNKNOWN_AUTHORITY_INTENT'});
 }catch(error){
  const code=String(error?.message||'');
  const safe=/^(?:REAL_LIVE_INSTALL_|REAL_INSTALLED_WORK_|REAL_REPAIR_READBACK_|REAL_OWNER_CANDIDATE_|GENERAL_CHECKPOINT_|GENERAL_PREVIEW_INSTALL_|GENERAL_PREVIEW_REGISTRY_|GENERAL_SETTLEMENT_|SELF_IMPROVEMENT_|GENERAL_REPAIR_CONTINUATION_)[A-Z0-9_]{3,140}$/;
  return res.status(error?.status||409).json({
   ok:false,error:safe.test(code)?code:'REAL_INSTALL_TRUSTED_PROVIDER_RECONCILIATION_REQUIRED',
   original_job_completed:false,production_changed:false,
  });
 }
}
