// Owner-scoped original self-repair capability warrant-eligibility check.
// This is a REAL independent check of the missing original executor, NOT
// a backdoor to sign a warrant for a model patch proposal.
import {authenticatedChatSession,privateChatConfig,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {validUuid} from '../../src/reality-private-chat-store-v0.1.js';
import {ORIGINAL_OWNER_WORK_ID}
 from '../../src/reality-original-owner-console-v0.1.js';
import {recordOriginalOwnerWarrantEligibility}
 from '../../src/reality-original-owner-verifier-v0.1.js';
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
  const b=req.body;
  if(!b||typeof b!=='object'||Array.isArray(b)||
   Object.keys(b).sort().join(',')!=='conversation_id,intent,original_work_id'||
   b.intent!=='VERIFY_ORIGINAL_EXECUTOR_ELIGIBILITY_AND_RECORD_GAP'||
   b.original_work_id!==ORIGINAL_OWNER_WORK_ID||
   !validUuid(b.conversation_id))
   return res.status(400).json({ok:false,error:'EXACT_ORIGINAL_JOB_VERIFICATION_REQUIRED'});
  const session=await authenticatedChatSession(req,res);
  if(!session)return res.status(401).json({ok:false,error:'CHAT_SIGN_IN_REQUIRED'});
  const result=await recordOriginalOwnerWarrantEligibility({
   session,conversationId:b.conversation_id,
  });
  if(result.eligible_for_signed_execution_warrant!==false||
   result.execution_warrant_issued!==false||
   result.original_job_completed!==false)
   throw Error('OWNER_VERIFIER_UNAUTHORIZED_PROMOTION');
  return res.status(200).json(result);
 }catch(e){
  const message=String(e?.message||'');
  return res.status(503).json({ok:false,
   error:/^OWNER_VERIFIER_[A-Z0-9_]+$/.test(message)?message:
    'OWNER_VERIFIER_NOT_INDEPENDENTLY_VERIFIED',
   execution_warrant_issued:false,installation_authorized:false,
   original_job_completed:false});
 }
}
