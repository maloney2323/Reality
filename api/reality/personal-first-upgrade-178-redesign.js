// One explicit authenticated owner grant after ORIGINAL #178 exhausted 8/8.
// This cannot authorize installation, create new work, or reset its history.
import {privateChatConfig,authenticatedChatSession,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {dbFor,rpc}
 from '../../src/reality-personal-first-upgrade-178-v0.1.js';
import {resolveOriginalFirst178OwnerQueue}
 from '../../src/reality-first178-single-action-v0.1.js';
import {original178OwnerApprovalView}
 from '../../src/reality-first178-live-owner-completion-v0.1.js';
import {executeFirst178Constitutional}
 from '../../src/reality-first178-constitutional-executor-v0.1.js';
export const maxDuration=300;
const WORK='work:9b9578b3c65427589c4c6da68fe0fc87';
const err=(s,code=409)=>{throw Object.assign(Error('FIRST178_REDESIGN_'+s),{status:code})};
export async function authorizeAndRunOriginal178Redesign({
 session,env=process.env,view=original178OwnerApprovalView,
 resolve=resolveOriginalFirst178OwnerQueue,dbReader=dbFor,
 call=rpc,run=executeFirst178Constitutional,action,
}={}){
 if(env.VERCEL_ENV!=='preview'||env.VERCEL_GIT_COMMIT_REF!==
    'feature/first178-live-single-claim-execution-20261029')
  err('ISOLATED_PREVIEW_REQUIRED',403);
 const original=await resolve({session,env});
 const state=await view({session,env});
 if(!original||state.status!=='EXHAUSTED_CORRECTION_ATTEMPTS'||
    state.original_work_id!==WORK||
    original.original_work_id!==WORK||
    state.queue_id!==original.queue_id||
    state.attempt_limit!==8||state.attempts_used!==8||
    state.installation_authorized!==false||
    state.original_job_completed!==false||
    state.last_failure_kind!=='REGRESSION'||
    !state.last_failure_evidence_ref)
  err('EIGHT_FAILED_ATTEMPTS_NOT_SOURCE_VERIFIED');
 if(action?.intent!=='AUTHORIZE_ONE_ORIGINAL_178_SOURCE_REDESIGN_ATTEMPT'||
    action.original_work_id!==WORK||
    action.checkpoint_hash!==state.checkpoint_hash||
    action.checkpoint_receipt_id!==state.checkpoint_receipt_id||
    action.owner_confirms_one_attempt!==true||
    action.owner_confirms_installation!==false)
  err('EXPLICIT_BOUND_OWNER_REDESIGN_CONSENT_REQUIRED',403);
 const db=dbReader(session,env);
 const claimed=await call(db,'reality_authorize_first178_one_redesign_v1',{
   p_owner_id:session.user_id,
   p_conversation_id:original.conversation_id,
   p_queue_id:original.queue_id,
   p_original_work_id:WORK,
   p_checkpoint_hash:state.checkpoint_hash,
   p_checkpoint_receipt_id:state.checkpoint_receipt_id,
   p_failure_evidence_ref:state.last_failure_evidence_ref,
   p_owner_confirms_one_attempt:true,
 });
 const read=await call(db,'reality_read_first178_one_redesign_v1',{
   p_owner_id:session.user_id,
   p_conversation_id:original.conversation_id,
   p_queue_id:original.queue_id,p_original_work_id:WORK,
 });
 if(claimed?.reserved_once!==true||
    read?.reserved_once!==true||
    read.reservation_id!==claimed.reservation_id||
    read.checkpoint_hash!==state.checkpoint_hash||
    read.checkpoint_receipt_id!==state.checkpoint_receipt_id||
    read.queue_id!==original.queue_id||
    read.owner_confirmed!==true||
    read.authorization_scope!=='ONE_ORIGINAL178_REDESIGN_ATTEMPT'||
    read.installation_authorized!==false||
    read.job_completed!==false)
  err('OWNER_RESERVATION_INDEPENDENT_READBACK_FAILED',503);
 // The same constitutional driver owns the one attempt, and every transition
 // must persist/read back independently. No code installation authority.
 try{
  const executed=await run({session,conversationId:original.conversation_id,env});
  if(executed?.original_work_id!==WORK||
     executed.attempt_count!==9||
     executed.installation_authorized!==false||
     executed.original_job_completed!==false||
     !['AWAITING_OWNER_APPROVAL','ESCALATED','EXECUTION_UNRESOLVED'].includes(executed.status))
   err('CONSTITUTIONAL_RESULT_NOT_SOURCE_VERIFIED',503);
  return Object.freeze({...executed,
   single_use_redesign_reservation_id:read.reservation_id,
   owner_confirmation_consumed:true,another_attempt_authorized:false,
   original_history_preserved:true});
 }catch(e){
  // Once reserved, NEVER issue a duplicate grant or auto-run a second draft.
  // Read saved original checkpoint to reconcile the exact provider outcome.
  return Object.freeze({
   status:'REDESIGN_RESERVED_EXECUTION_NEEDS_READBACK',
   original_work_id:WORK,queue_id:original.queue_id,
   single_use_redesign_reservation_id:read.reservation_id,
   execution_error_code:String(e?.message||'UNRESOLVED')
    .replace(/[^A-Z0-9_]/gi,'_').slice(0,110),
   owner_confirmation_consumed:true,another_attempt_authorized:false,
   original_history_preserved:true,
   installation_authorized:false,original_job_completed:false,
   production_changed:false,do_not_repeat_grant:true});
 }
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 try{
  if(req.method!=='POST'){res.setHeader('Allow','POST');
   return res.status(405).json({ok:false,error:'FIRST178_REDESIGN_POST_ONLY'});}
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!session)return res.status(401).json({ok:false,error:'CHAT_SIGN_IN_REQUIRED'});
  if(!req.headers?.origin)
   return res.status(403).json({ok:false,error:'FIRST178_REDESIGN_ORIGIN_REQUIRED'});
  assertSameOrigin(req);
  if(!String(req.headers?.['content-type']||'').includes('application/json'))
   return res.status(415).json({ok:false,error:'FIRST178_REDESIGN_JSON_REQUIRED'});
  const b=req.body;
  if(!b||typeof b!=='object'||Array.isArray(b)||
   Object.keys(b).sort().join(',')!==
    ['checkpoint_hash','checkpoint_receipt_id','intent','original_work_id',
     'owner_confirms_installation','owner_confirms_one_attempt'].sort().join(','))
   return res.status(403).json({ok:false,error:'FIRST178_REDESIGN_EXACT_OWNER_INTENT_REQUIRED'});
  const out=await authorizeAndRunOriginal178Redesign({session,action:b});
  return res.status(200).json({ok:true,...out});
 }catch(e){
  const message=String(e?.message||'');
  return res.status(e?.status||503).json({ok:false,
   error:/^FIRST178_REDESIGN_[A-Z0-9_]+$/.test(message)?
    message:'FIRST178_REDESIGN_DURABLE_READBACK_REQUIRED',
   original_job_completed:false,installation_authorized:false,
   do_not_retry:true});
 }
}