// Signed-in owner console for the SAME real Reality maintenance work #143.
// GET is read-only; PREPARE only issues a bound, non-authorizing approval
// request. The existing independent action-authority and autonomous loop
// endpoints record approval and execute, respectively.
import {authenticatedChatSession,privateChatConfig,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {validUuid} from '../../src/reality-private-chat-store-v0.1.js';
import {
 inspectOriginalOwnerConsole,prepareOriginalOwnerStage,
 ORIGINAL_OWNER_WORK_ID,
} from '../../src/reality-original-owner-console-v0.1.js';

export const maxDuration=60;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 try {
  privateChatConfig();
  if(!['GET','POST'].includes(req.method))
   return res.status(405).json({ok:false,error:'GET_OR_POST_REQUIRED'});
  if(req.method==='POST'){
   if(!req.headers?.origin)return res.status(403).json({ok:false,error:'ORIGIN_REQUIRED'});
   assertSameOrigin(req);
   if(!String(req.headers?.['content-type']||'').includes('application/json'))
    return res.status(415).json({ok:false,error:'JSON_REQUIRED'});
  }
  const session=await authenticatedChatSession(req,res);
  if(!session)return res.status(401).json({ok:false,error:'CHAT_SIGN_IN_REQUIRED'});
  const input=req.method==='GET'?req.query:req.body;
  const conversationId=String(input?.conversation_id||'');
  const workId=String(input?.original_work_id||'');
  if(!validUuid(conversationId)||workId!==ORIGINAL_OWNER_WORK_ID)
   return res.status(400).json({ok:false,error:'EXACT_ORIGINAL_WORK_AND_CONVERSATION_REQUIRED'});
  if(req.method==='GET'){
   const result=await inspectOriginalOwnerConsole({session,conversationId});
   return res.status(200).json({ok:true,...result});
  }
  const allowed=['intent','conversation_id','original_work_id'];
  if(!input||typeof input!=='object'||Array.isArray(input)||
     Object.keys(input).some(k=>!allowed.includes(k))||
     !['PREPARE_INSTALL_APPROVAL','PREPARE_RESUME_APPROVAL'].includes(input.intent))
   return res.status(400).json({ok:false,error:'EXACT_APPROVAL_PREPARATION_REQUIRED'});
  const result=await prepareOriginalOwnerStage({
   session,conversationId,stage:input.intent==='PREPARE_INSTALL_APPROVAL'?'INSTALL':'RESUME',
  });
  return res.status(200).json({ok:true,...result});
 }catch(error){
  const e=String(error?.message||'');
  const known=/^(OWNER_CONSOLE|UPGRADE_|AUTONOMOUS_LOOP_)[A-Z0-9_]+$/;
  return res.status(503).json({
   ok:false,error:known.test(e)?e:'OWNER_CONSOLE_UNAVAILABLE',
   installation_authorized:false,original_job_completed:false,
   no_automatic_provider_retry:true,
  });
 }
}
