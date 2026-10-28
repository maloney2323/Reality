// Explicit opt-in only: bind the independently verified historical controlled
// self-correction to this signed-in owner's current confirmed goal. This is
// NOT a post-hoc sandbox warrant, GitHub merge or job settlement.
import {authenticatedChatSession,privateChatConfig,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {validUuid} from '../../src/reality-private-chat-store-v0.1.js';
import {adoptControlledFinaleIntoOwnerContinuity,FINALE_OWNER_ADOPTION_INTENT}
 from '../../src/reality-finale-owner-adoption-v0.1.js';
export const maxDuration=60;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 try{
  privateChatConfig();
  if(req.method!=='POST')return res.status(405).json({ok:false,error:'POST_REQUIRED'});
  if(!req.headers?.origin)return res.status(403).json({ok:false,error:'ORIGIN_REQUIRED'});
  assertSameOrigin(req);
  if(!String(req.headers?.['content-type']||'').includes('application/json'))
   return res.status(415).json({ok:false,error:'JSON_REQUIRED'});
  const b=req.body||{};
  if(!b||typeof b!=='object'||Array.isArray(b)||
     Object.keys(b).sort().join(',')!=='confirmation,conversation_id'||
     b.confirmation!==FINALE_OWNER_ADOPTION_INTENT||
     !validUuid(b.conversation_id))
   return res.status(400).json({ok:false,error:'EXACT_OWNER_ADOPTION_CONFIRMATION_REQUIRED'});
  const session=await authenticatedChatSession(req,res);
  if(!session)return res.status(401).json({ok:false,error:'CHAT_SIGN_IN_REQUIRED'});
  const result=await adoptControlledFinaleIntoOwnerContinuity({
   session,conversationId:b.conversation_id,confirmation:b.confirmation,
  });
  return res.status(200).json({ok:true,...result});
 }catch(error){
  const raw=String(error?.message||'');
  return res.status(503).json({
   ok:false,error:/^(FINALE_OWNER|FINALE_)_[A-Z0-9_]+$/.test(raw)?
    raw:'FINALE_OWNER_ADOPTION_UNAVAILABLE',
   owner_sandbox_verified:false,warrant_issued:false,
   installation_authorized:false,original_job_completed:false,
  });
 }
}
