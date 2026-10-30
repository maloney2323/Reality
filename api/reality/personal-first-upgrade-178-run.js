// One owner click, one authenticated preview job #178. Existing
// constitutional services do everything until exact installation approval.
// Never infer an owner action from a model/chat message or cron.
import {privateChatConfig,authenticatedChatSession,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {validUuid}
 from '../../src/reality-private-chat-store-v0.1.js';
import {runFirst178SingleAction}
 from '../../src/reality-first178-single-action-v0.1.js';
export const maxDuration=300;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 try{
  privateChatConfig();
  if(req.method!=='POST'){
   res.setHeader('Allow','POST');
   return res.status(405).json({ok:false,error:'FIRST178_ONE_CLICK_POST_ONLY'});
  }
  const session=await authenticatedChatSession(req,res);
  if(!session)return res.status(401).json({ok:false,error:'CHAT_SIGN_IN_REQUIRED'});
  if(!req.headers?.origin)return res.status(403).json({ok:false,
   error:'FIRST178_OWNER_SAME_ORIGIN_REQUIRED'});
  assertSameOrigin(req);
  if(!String(req.headers?.['content-type']||'').includes('application/json'))
   return res.status(415).json({ok:false,error:'FIRST178_OWNER_JSON_REQUIRED'});
  const body=req.body;
  if(!body||typeof body!=='object'||Array.isArray(body)||
     Object.keys(body).sort().join(',')!=='conversation_id,intent'||
     body.intent!=='RUN_SAME_FIRST178_JOB_UNTIL_EXACT_INSTALL_APPROVAL'||
     !validUuid(body.conversation_id))
   return res.status(403).json({ok:false,
    error:'FIRST178_EXACT_ORIGINAL_OWNER_ACTION_REQUIRED'});
  const result=await runFirst178SingleAction({
   session,conversationId:body.conversation_id,
  });
  return res.status(200).json({ok:true,...result});
 }catch(error){
  const msg=String(error?.message||'');
  const safe=/^(?:FIRST178_SINGLE_ACTION_|FIRST178_EXECUTION_|FIRST_PROOF_|FIRST_GAP_|FIRST_178_CONTINUITY_|FOUNDATION_|SELF_IMPROVEMENT_|CHAT_|PRIVATE_CHAT_|PERSONAL_GOAL_)[A-Z0-9_]{3,110}$/;
  return res.status(error.status||503).json({ok:false,
   error:safe.test(msg)?msg:'FIRST178_ORIGINAL_JOB_OUTCOME_UNRESOLVED',
   do_not_retry:true,
   installation_authorized:false,capability_installed:false,
   original_job_completed:false,production_changed:false});
 }
}
