// One signed-in entrypoint that advances the existing original work through
// only those upgrade-loop stages that already have their own exact approval.
// Caller supplies no code, warrant, reservation, PR, stage, or completion.
import {authenticatedChatSession,privateChatConfig,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {validUuid} from '../../src/reality-private-chat-store-v0.1.js';
import {runAuthenticatedOwnerAutonomousUpgradeLoop}
 from '../../src/reality-owner-autonomous-upgrade-loop-v0.1.js';
export const maxDuration=60;
const WORK=/^work:[a-f0-9]{32}$/;
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
  if(Object.keys(b).some(k=>!['conversation_id','original_work_id'].includes(k))||
     !validUuid(b.conversation_id)||
     !WORK.test(String(b.original_work_id||'')))
   return res.status(400).json({ok:false,error:'EXACT_ORIGINAL_WORK_REQUIRED'});
  const session=await authenticatedChatSession(req,res);
  if(!session)return res.status(401).json({ok:false,error:'CHAT_SIGN_IN_REQUIRED'});
  const result=await runAuthenticatedOwnerAutonomousUpgradeLoop({
   session,conversationId:b.conversation_id,originalWorkId:b.original_work_id,
  });
  return res.status(200).json({
   ok:true,...result,
   authenticated_owner:true,
   original_work_id:b.original_work_id,
  });
 }catch(error){
  const raw=String(error?.message||'');
  const safe=/^(AUTONOMOUS_LOOP|UPGRADE_(?:LOADER|DRAFT|CLOSURE|CONTINUATION|CI|INSTALL|STAGE))_[A-Z0-9_]+$/.test(raw)?
   raw:'AUTONOMOUS_LOOP_UNAVAILABLE_OR_UNVERIFIED';
  return res.status(503).json({
   ok:false,error:safe,original_job_completed:false,
   no_automatic_provider_retry:true,
  });
 }
}
