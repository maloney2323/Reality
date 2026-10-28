// Signed-in, read-only status of Reality's actual original-job model executor.
import {authenticatedChatSession,privateChatConfig}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {validUuid} from '../../src/reality-private-chat-store-v0.1.js';
import {ORIGINAL_OWNER_WORK_ID} from '../../src/reality-original-owner-console-v0.1.js';
import {inspectOriginalExecutorRun}
 from '../../src/reality-original-executor-run-monitor-v0.1.js';
export const maxDuration=60;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 try{
  privateChatConfig();
  if(req.method!=='GET')return res.status(405).json({ok:false,error:'GET_REQUIRED'});
  const conversationId=String(req.query?.conversation_id||'');
  if(!validUuid(conversationId)||req.query?.original_work_id!==ORIGINAL_OWNER_WORK_ID)
   return res.status(400).json({ok:false,error:'EXACT_ORIGINAL_JOB_REQUIRED'});
  const session=await authenticatedChatSession(req,res);
  if(!session)return res.status(401).json({ok:false,error:'CHAT_SIGN_IN_REQUIRED'});
  const proof=await inspectOriginalExecutorRun({session,conversationId});
  return res.status(200).json({ok:true,...proof,authenticated_original_owner:true});
 }catch(e){
  const code=String(e?.message||'');
  return res.status(503).json({ok:false,
   error:/^ORIGINAL_EXECUTOR_[A-Z0-9_]+$/.test(code)?code:'ORIGINAL_EXECUTOR_MONITOR_UNAVAILABLE',
   original_job_completed:false,installation_authorized:false});
 }
}
