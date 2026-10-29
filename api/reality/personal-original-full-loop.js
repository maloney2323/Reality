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
// Failure codes are server-generated from trusted modules. Only stable,
// allowlisted error identifiers are exposed; never return provider payloads,
// request cookies, tokens, stack traces, database SQL, or user records.
export function classifyOriginal143Error(error){
 const raw=String(error?.message||'');
 const recognized=/^(?:ORIGINAL_143_|ORIGINAL_UPGRADE_|PERSONAL_GOAL_|RELIABILITY_|USER_GOAL_AUTHORITY_|CONTINUITY_|UNIVERSE_|CHAT_|PRIVATE_CHAT_|GITHUB_CONNECTOR_)[A-Z0-9_]{3,100}$/;
 if(recognized.test(raw))return raw;
 if(raw==='CONNECTOR_CREDENTIAL_MISSING:github')return 'ORIGINAL_143_GITHUB_CREDENTIAL_MISSING';
 return 'ORIGINAL_143_ACTION_UNAVAILABLE';
}
export const maxDuration=60;
export default async function handler(req,res){
 let phase='CONFIG';
 res.setHeader('Cache-Control','private, no-store');
 try{
  privateChatConfig();
  if(!['GET','POST'].includes(req.method))
   return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
  phase='OWNER_SESSION';
  const session=await authenticatedChatSession(req,res);
  if(!session)return res.status(401).json({ok:false,error:'CHAT_SIGN_IN_REQUIRED'});
  phase='OWNER_SCOPE';
  const body=req.body&&typeof req.body==='object'&&!Array.isArray(req.body)?req.body:{};
  const conversationId=req.method==='GET'?req.query?.conversation_id:body.conversation_id;
  const workId=req.method==='GET'?req.query?.work_id:body.work_id;
  if(!validUuid(conversationId)||workId!==ORIGINAL_WORK)
   return res.status(400).json({ok:false,error:'ORIGINAL_143_EXACT_SCOPE_REQUIRED'});
  if(req.method==='GET'){
   phase='READINESS';
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
  phase='AUTHORIZED_ACTIVATION';
  const output=await completeOriginal143OwnerAction({
   session,conversationId,confirmation:body.confirmation
  });
  return res.status(200).json({ok:true,...output});
 }catch(e){
  const safe=classifyOriginal143Error(e);
  // No sensitive error payloads are written to logs; code+stage only.
  console.warn('REALITY_ORIGINAL_143_FAILED',phase,safe);
  return res.status(e?.status||503).json({
   ok:false,error:safe,failed_stage:phase,job_completion_not_proven:true,
  });
 }
}