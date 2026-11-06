// Authenticated, owner-bound real original-job capability-gap investigation.
// This POST only runs provider GET/readback and can durably enqueue a discovered
// gap. Installation, generation, execution authority and settlement are separate.
import {authenticatedChatSession,privateChatConfig,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {validUuid} from '../../src/reality-private-chat-store-v0.1.js';
import {createGenuineOriginalWorkRunner}
 from '../../src/reality-genuine-capability-execution-runtime-v1.js';
import {createGenuineSourceBackedJobAdapters}
 from '../../src/reality-genuine-source-backed-job-v1.js';
const WORK=/^work:[a-f0-9]{32}$/;
const ERROR=/^GENUINE_(?:SOURCE_JOB|EXECUTION_RUNTIME|PREVIEW|CAPABILITY_INTAKE|WAKE_DISPATCH)_[A-Z0-9_]{3,110}$/;
export const maxDuration=60;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 try{
  privateChatConfig();
  if(req.method!=='POST')return res.status(405).json({
   ok:false,error:'OWNER_SIGNED_POST_REQUIRED'});
  if(!req.headers?.origin)return res.status(403).json({
   ok:false,error:'OWNER_ORIGIN_REQUIRED'});
  assertSameOrigin(req);
  if(!/^application\/json(?:;|$)/i.test(String(req.headers?.['content-type']||'')))
   return res.status(415).json({ok:false,error:'OWNER_JSON_REQUIRED'});
  const body=req.body;
  if(!body||Array.isArray(body)||typeof body!=='object'||
    Object.keys(body).sort().join(',')!==
     'conversation_id,intent,original_work_id'||
    body.intent!=='INVESTIGATE_VERIFIED_ORIGINAL_CAPABILITY_GAP'||
    !validUuid(body.conversation_id)||!WORK.test(body.original_work_id))
   return res.status(400).json({ok:false,
    error:'EXACT_ORIGINAL_INVESTIGATION_REQUEST_REQUIRED'});
  const session=await authenticatedChatSession(req,res);
  if(!session)return res.status(401).json({ok:false,
   error:'CHAT_SIGN_IN_REQUIRED'});
  const trusted=createGenuineSourceBackedJobAdapters({
   session,conversationId:body.conversation_id,
  });
  const run=createGenuineOriginalWorkRunner({
   session,conversationId:body.conversation_id,
   loadAuthorizedInternalJob:trusted.loadAuthorizedInternalJob,
   makeProviderReadback:trusted.makeProviderReadback,
  });
  const result=await run({originalWorkId:body.original_work_id});
  return res.status(200).json({ok:true,...result,
   investigation_only:true,installation_authorized:false,
   original_job_completed:false,production_changed:false});
 }catch(e){
  const raw=String(e?.message||'');
  const error=ERROR.test(raw)?raw:'GENUINE_ORIGINAL_INVESTIGATION_UNAVAILABLE';
  return res.status(503).json({ok:false,error,original_job_completed:false,
   production_changed:false,installation_authorized:false});
 }
}
