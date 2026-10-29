// Owner-scoped, exact-goal governed builder queue.
// GET is observation only. POST enqueues the next independently identified
// unfinished job for DISCOVERY; this does not execute code or approve install.
import {privateChatConfig,authenticatedChatSession,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {queueOwnerGovernedBuild,readOwnerGovernedBuild}
 from '../../src/reality-governed-build-chat-connection-v1.0.js';
export const maxDuration=60;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 try{
  privateChatConfig();
  if(req.method!=='GET'&&req.method!=='POST'){
   res.setHeader('Allow','GET, POST');
   return res.status(405).json({ok:false,error:'GOVERNED_BUILD_METHOD_NOT_ALLOWED'});
  }
  const session=await authenticatedChatSession(req,res);
  if(!session)return res.status(401).json({ok:false,error:'CHAT_SIGN_IN_REQUIRED'});
  if(Object.keys(req.query||{}).length)
   return res.status(400).json({ok:false,error:'GOVERNED_BUILD_CLIENT_SCOPE_FORBIDDEN'});
  if(req.method==='GET'){
   const state=await readOwnerGovernedBuild({session});
   return res.status(200).json({ok:true,...state});
  }
  if(!req.headers?.origin)
   return res.status(403).json({ok:false,error:'GOVERNED_BUILD_ORIGIN_REQUIRED'});
  assertSameOrigin(req);
  if(!String(req.headers?.['content-type']||'').includes('application/json'))
   return res.status(415).json({ok:false,error:'GOVERNED_BUILD_JSON_REQUIRED'});
  const body=req.body&&typeof req.body==='object'&&!Array.isArray(req.body)?req.body:{};
  if(Object.keys(body).length!==1||
   body.intent!=='QUEUE_SAFE_AUTONOMOUS_DISCOVERY')
   return res.status(403).json({ok:false,error:'GOVERNED_BUILD_EXPLICIT_INVESTIGATION_REQUIRED'});
  const job=await queueOwnerGovernedBuild({session});
  return res.status(202).json({ok:true,...job,
   message:'Safe discovery queued. Model generation and sandbox execution are not automatically started by this endpoint.',
   external_execution_authorized:false,production_changed:false});
 }catch(e){
  const message=String(e?.message||'');
  const allowed=/^(?:GOVERNED_BUILD_|SELF_IMPROVEMENT_|CHAT_|PRIVATE_CHAT_)[A-Z0-9_]{4,90}$/;
  return res.status(e?.status||503).json({ok:false,
   error:allowed.test(message)?message:'GOVERNED_BUILD_REQUEST_UNAVAILABLE',
   original_job_completed:false,model_generated:false,
   installation_authorized:false,production_changed:false});
 }
}