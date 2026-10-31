// Only authenticated owner can trigger this ONE original-work generation run.
// No model-generated install, production deployment, or GitHub writes.
import {privateChatConfig,authenticatedChatSession,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {validUuid} from '../../src/reality-private-chat-store-v0.1.js';
import {executeFirst178Constitutional}
 from '../../src/reality-first178-constitutional-executor-v0.1.js';
export const maxDuration=300;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private,no-store');
 try{
  privateChatConfig();
  if(req.method!=='POST'){
   res.setHeader('Allow','POST');
   return res.status(405).json({ok:false,error:'FIRST178_EXECUTION_POST_ONLY'});
  }
  const session=await authenticatedChatSession(req,res);
  if(!session)return res.status(401).json({ok:false,error:'CHAT_SIGN_IN_REQUIRED'});
  if(!req.headers?.origin)
   return res.status(403).json({ok:false,error:'FIRST178_EXECUTION_ORIGIN_REQUIRED'});
  assertSameOrigin(req);
  if(!String(req.headers?.['content-type']||'').includes('application/json'))
   return res.status(415).json({ok:false,error:'FIRST178_EXECUTION_JSON_REQUIRED'});
  const body=req.body||{};
  if(typeof body!=='object'||Array.isArray(body)||
    Object.keys(body).sort().join(',')!=='conversation_id,intent'||
    body.intent!=='RUN_EXACT_OWNER_CONFIRMED_178_CONSTITUTIONAL')
   return res.status(403).json({ok:false,
    error:'FIRST178_EXECUTION_EXACT_OWNER_ACTION_REQUIRED'});
  if(!validUuid(body.conversation_id))
   return res.status(400).json({ok:false,
    error:'FIRST178_EXECUTION_ORIGINAL_CONVERSATION_INVALID'});
  const result=await executeFirst178Constitutional({
   session,conversationId:body.conversation_id,
  });
  return res.status(200).json({ok:true,...result});
 }catch(error){
  const msg=String(error?.message||'');
  const safe=/^(?:FIRST178_EXECUTION_|FIRST_GAP_|FIRST_PROOF_|FIRST_178_CONTINUITY_|SELF_IMPROVEMENT_|FOUNDATION_|CHAT_)[A-Z0-9_]{5,100}$/;
  return res.status(error?.status||503).json({
   ok:false,error:safe.test(msg)?msg:'FIRST178_EXECUTION_OUTCOME_UNRESOLVED',
   do_not_retry:true,installation_authorized:false,
   capability_installed:false,original_job_completed:false,
   production_changed:false,
  });
 }
}
