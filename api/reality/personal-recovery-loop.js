// Authenticated, evidence-bound ORIGINAL job recovery loop, current stage.
// No consentless self-build, GitHub mutations, or settlement claim.
import {authenticatedChatSession,privateChatConfig}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {validUuid} from '../../src/reality-private-chat-store-v0.1.js';
import {inspectAuthenticatedOriginalJobRecoveryLoop}
 from '../../src/reality-real-recovery-coordinator-v0.1.js';
export const maxDuration=60;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 try{
  privateChatConfig();
  if(req.method!=='GET')return res.status(405)
   .setHeader('Allow','GET').json({ok:false,error:'READ_ONLY_GET_REQUIRED',
    external_action_performed:false});
  const conversationId=req.query?.conversation_id;
  const workId=req.query?.work_id;
  if(!validUuid(conversationId)||
     !/^work:[a-f0-9]{32}$/.test(String(workId||'')))
   return res.status(400).json({
    ok:false,error:'ORIGINAL_WORK_SCOPE_REQUIRED',external_action_performed:false});
  const session=await authenticatedChatSession(req,res);
  if(!session)return res.status(401).json({
   ok:false,error:'CHAT_SIGN_IN_REQUIRED',external_action_performed:false});
  const report=await inspectAuthenticatedOriginalJobRecoveryLoop({
   session,conversationId,workId,
  });
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
