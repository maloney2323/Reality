// Owner invokes independent Reality verification only. Owner/model supplies
// NO source code, verifier receipt, test results, warranty fields, or authority.
// The trusted verifier reconstructs EVERYTHING from immutable GitHub CI and
// the signed-in owner's existing Continuity before any evidence signing.
import {authenticatedChatSession,privateChatConfig,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {validUuid} from '../../src/reality-private-chat-store-v0.1.js';
import {ORIGINAL_OWNER_WORK_ID}
 from '../../src/reality-original-owner-console-v0.1.js';
import {recordOriginalExecutorTrustedWarrant}
 from '../../src/reality-original-executor-trusted-warrant-recorder-v0.1.js';
export const maxDuration=60;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 try{
  privateChatConfig();
  if(req.method!=='POST')return res.status(405).json({ok:false,error:'POST_REQUIRED'});
  if(!req.headers?.origin)return res.status(403).json({ok:false,error:'ORIGIN_REQUIRED'});
  assertSameOrigin(req);
  if(!String(req.headers?.['content-type']||'').toLowerCase().includes('application/json'))
   return res.status(415).json({ok:false,error:'JSON_REQUIRED'});
  const b=req.body;
  if(!b||typeof b!=='object'||Array.isArray(b)||
     Object.keys(b).sort().join(',')!=='conversation_id,intent,original_work_id'||
     b.intent!=='VERIFY_FROZEN_MODEL_PACKAGE_AND_RECORD_NON_AUTHORIZING_WARRANT'||
     b.original_work_id!==ORIGINAL_OWNER_WORK_ID||!validUuid(b.conversation_id))
   return res.status(400).json({ok:false,error:'EXACT_ORIGINAL_JOB_VERIFICATION_REQUEST_REQUIRED'});
  const session=await authenticatedChatSession(req,res);
  if(!session)return res.status(401).json({ok:false,error:'CHAT_SIGN_IN_REQUIRED'});
  const result=await recordOriginalExecutorTrustedWarrant({
   session,conversationId:b.conversation_id});
  if(result?.status!=='ORIGINAL_EXECUTOR_NON_AUTHORIZING_WARRANT_DURABLY_VERIFIED'||
     result.original_job_completed!==false||
     result.github_write_authorized!==false||
     result.installation_authorized!==false)
   throw Error('ORIGINAL_EXECUTOR_WARRANT_INTERNAL_SCOPE_MISMATCH');
  return res.status(200).json({ok:true,...result});
 }catch(e){
  const v=String(e?.message||'');
  const safe=/^(?:ORIGINAL_EXECUTOR_WARRANT_|ORIGINAL_VERIFIER_|UPGRADE_LOADER_|UPGRADE_WARRANT_|OWNER_CONSOLE_)[A-Z0-9_]+$/.test(v)?
    v:'ORIGINAL_EXECUTOR_TRUSTED_VERIFIER_UNAVAILABLE';
  const status=/WARRANT_.*REQUIRED|WARRANT_.*MISMATCH|OWNER_CONSOLE_.*MISMATCH/.test(safe)?409:503;
  return res.status(status).json({ok:false,error:safe,
   original_job_completed:false,github_write_authorized:false,
   installation_authorized:false});
 }
}
