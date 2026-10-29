// Authenticated, evidence-bound ORIGINAL job recovery loop, current stage.
// No consentless self-build, GitHub mutations, or settlement claim.
import {authenticatedChatSession,privateChatConfig,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {validUuid} from '../../src/reality-private-chat-store-v0.1.js';
import {inspectAuthenticatedOriginalJobRecoveryLoop}
 from '../../src/reality-real-recovery-coordinator-v0.1.js';
import {recordAuthenticatedRecoveryDiagnosis}
 from '../../src/reality-original-job-recovery-diagnosis-v0.1.js';
export const maxDuration=60;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 try{
  privateChatConfig();
  if(!['GET','POST'].includes(req.method))return res.status(405)
   .setHeader('Allow','GET, POST').json({ok:false,error:'RECOVERY_METHOD_NOT_ALLOWED',
    external_action_performed:false});
  if(req.method==='POST'){
   if(!req.headers?.origin)return res.status(403).json({ok:false,
    error:'RECOVERY_SAME_ORIGIN_REQUIRED',external_action_performed:false});
   assertSameOrigin(req);
   if(!String(req.headers?.['content-type']||'').includes('application/json'))
    return res.status(415).json({ok:false,error:'RECOVERY_JSON_REQUIRED'});
   const body=req.body||{};
   if(Object.keys(body).some(k=>!['intent','conversation_id','work_id'].includes(k))||
      body.intent!=='RUN_AND_RECORD_RECOVERY_DIAGNOSIS')
    return res.status(400).json({ok:false,
     error:'RECOVERY_UNTRUSTED_ACTION_INPUT',external_action_performed:false});
  }
  const conversationId=req.method==='POST'?req.body?.conversation_id:req.query?.conversation_id;
  const workId=req.method==='POST'?req.body?.work_id:req.query?.work_id;
  if(!validUuid(conversationId)||
     !/^work:[a-f0-9]{32}$/.test(String(workId||'')))
   return res.status(400).json({
    ok:false,error:'ORIGINAL_WORK_SCOPE_REQUIRED',external_action_performed:false});
  const session=await authenticatedChatSession(req,res);
  if(!session)return res.status(401).json({
   ok:false,error:'CHAT_SIGN_IN_REQUIRED',external_action_performed:false});
  const report=req.method==='POST'?
   await recordAuthenticatedRecoveryDiagnosis({session,conversationId,workId}):
   await inspectAuthenticatedOriginalJobRecoveryLoop({session,conversationId,workId});
  return res.status(200).json({ok:true,...report});
 }catch(error){
  const raw=String(error?.message||'');
  const errorCode=/^(?:LIVE_LOOP|RECOVERY)_[A-Z0-9_]{4,100}$/.test(raw)?
   raw:'LIVE_LOOP_READBACK_UNAVAILABLE';
  return res.status(503).json({ok:false,
   error:'RECOVERY_LOOP_NOT_VERIFIED',error_code:errorCode,
   original_job_completed:false,external_action_performed:false});
 }
}
