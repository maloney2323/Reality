// Owner-driven first real self-upgrade proof #178.
// GET is read-only. POST requires signed-in session, same-origin request, and
// one exact fixed customer intent. No browser-supplied owner ID or work ID.
import {privateChatConfig,authenticatedChatSession,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {validUuid} from '../../src/reality-private-chat-store-v0.1.js';
import {inspectFirstUpgrade178,startFirstUpgrade178}
 from '../../src/reality-personal-first-upgrade-178-v0.1.js';
export const maxDuration=60;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 try{
  privateChatConfig();
  if(!['GET','POST'].includes(req.method)){
   res.setHeader('Allow','GET, POST');
   return res.status(405).json({ok:false,error:'FIRST_PROOF_METHOD_NOT_ALLOWED'});
  }
  const session=await authenticatedChatSession(req,res);
  if(!session)return res.status(401).json({ok:false,error:'CHAT_SIGN_IN_REQUIRED'});
  const conversationId=req.method==='GET'?
   req.query?.conversation_id:req.body?.conversation_id;
  if(!validUuid(conversationId)||
    (req.method==='GET'&&Object.keys(req.query||{}).length!==1))
   return res.status(400).json({ok:false,error:'FIRST_PROOF_EXACT_CONVERSATION_REQUIRED'});
  if(req.method==='GET'){
   const result=await inspectFirstUpgrade178({session,conversationId});
   return res.status(200).json({ok:true,...result});
  }
  if(!req.headers?.origin)
   return res.status(403).json({ok:false,error:'FIRST_PROOF_ORIGIN_REQUIRED'});
  assertSameOrigin(req);
  if(!String(req.headers?.['content-type']||'').includes('application/json'))
   return res.status(415).json({ok:false,error:'FIRST_PROOF_JSON_REQUIRED'});
  const body=req.body||{};
  if(typeof body!=='object'||Array.isArray(body)||
    Object.keys(body).sort().join(',')!=='conversation_id,intent'||
    body.intent!=='INVESTIGATE_VERIFIED_FIRST_CAPABILITY_GAP_178')
   return res.status(403).json({ok:false,
    error:'FIRST_PROOF_EXACT_OWNER_INVESTIGATION_CONFIRMATION_REQUIRED'});
  const result=await startFirstUpgrade178({session,conversationId});
  return res.status(result.status==='DISCOVERY_WORKER_DISPATCHED'?202:200)
   .json({ok:true,...result});
 }catch(error){
  const reason=String(error?.message||'');
  const safe=/^(?:FIRST_PROOF_|FIRST_GAP_|PERSONAL_GOAL_|CHAT_|PRIVATE_CHAT_)[A-Z0-9_]{4,100}$/;
  return res.status(error?.status||503).json({ok:false,
   error:safe.test(reason)?reason:'FIRST_PROOF_REQUEST_UNAVAILABLE',
   model_generated:false,installation_authorized:false,
   original_job_completed:false,production_changed:false});
 }
}
