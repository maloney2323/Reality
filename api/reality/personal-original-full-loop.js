// Signed-in isolated Reality owner endpoint for original customer work #143.
// GET is read-only; only a deliberate same-origin POST with exact confirmation
// can consume single-use authority and reconcile the original Reality job.
import {authenticatedChatSession,privateChatConfig,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {validUuid} from '../../src/reality-private-chat-store-v0.1.js';
import {ORIGINAL_WORK}
 from '../../src/reality-original-upgrade-readback-v0.1.js';
import {inspectOriginal143OwnerAction,completeOriginal143OwnerAction,
 ORIGINAL_143_CONFIRMATION}
 from '../../src/reality-original-143-real-activation-v0.1.js';
export const maxDuration=60;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 try{
  privateChatConfig();
  if(!['GET','POST'].includes(req.method))
   return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
  const session=await authenticatedChatSession(req,res);
  if(!session)return res.status(401).json({ok:false,error:'CHAT_SIGN_IN_REQUIRED'});
  const body=req.body&&typeof req.body==='object'&&!Array.isArray(req.body)?req.body:{};
  const conversationId=req.method==='GET'?req.query?.conversation_id:body.conversation_id;
  const workId=req.method==='GET'?req.query?.work_id:body.work_id;
  if(!validUuid(conversationId)||workId!==ORIGINAL_WORK)
   return res.status(400).json({ok:false,error:'ORIGINAL_143_EXACT_SCOPE_REQUIRED'});
  if(req.method==='GET'){
   const result=await inspectOriginal143OwnerAction({session,conversationId});
   return res.status(200).json({ok:true,...result});
  }
  if(!req.headers?.origin)
   return res.status(403).json({ok:false,error:'OWNER_ORIGIN_REQUIRED'});
  assertSameOrigin(req);
  if(!String(req.headers?.['content-type']||'').includes('application/json'))
   return res.status(415).json({ok:false,error:'OWNER_JSON_REQUIRED'});
  if(body.intent!=='ACTIVATE_RESUME_SETTLE_ORIGINAL_143'||
   body.confirmation!==ORIGINAL_143_CONFIRMATION||
   body.authorization!==undefined||body.owner_id!==undefined||
   body.goal_id!==undefined||body.registryRecord!==undefined)
   return res.status(403).json({ok:false,error:'EXPLICIT_OWNER_ACTIVATION_CONFIRMATION_REQUIRED'});
  const output=await completeOriginal143OwnerAction({
   session,conversationId,confirmation:body.confirmation
  });
  return res.status(200).json({ok:true,...output});
 }catch(e){
  const raw=String(e?.message||'');
  const safe=/^ORIGINAL_143_[A-Z0-9_]+$/.test(raw)?raw:'ORIGINAL_143_ACTION_UNAVAILABLE';
  return res.status(e?.status||503).json({
   ok:false,error:safe,job_completion_not_proven:true,
  });
 }
}