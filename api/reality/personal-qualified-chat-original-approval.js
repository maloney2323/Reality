// Existing signed Reality Chat work + Continuity qualifier -> exact owner
// original admission. No model interpretation, UI bubble, or evidence routing
// can approve itself. Works only in the isolated preview.
import {privateChatConfig,authenticatedChatSession,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {readPrivateChat,validUuid}
 from '../../src/reality-private-chat-store-v0.1.js';
import {shiftDatabase,shiftRpc}
 from '../../src/reality-governed-shift-boundary-v1.js';
import {inspectSavedChatWork}
 from '../../src/reality-saved-chat-work-adapter-v1.js';
import {readOwnerNewDevelopment}
 from '../../src/reality-chat-new-development-adapter-v1.js';

const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const ROUTE=/^reality:qualification:[a-f0-9]{64}$/;
const FINGERPRINT=/^sha256:[a-f0-9]{64}$/;
const WORK=/^work:[a-f0-9]{32}$/;
const NEW='governed-chat-new-development';
export const maxDuration=90;
const safe=(res,status,code,extra={})=>res.status(code).json({
 ok:code===200||code===202,status,
 installation_authorized:false,model_execution_authorized:false,
 original_job_completed:false,production_changed:false,
 new_shift_started:false,...extra
});
export function exactQualifiedChatReview(r,ownerId){
 return r?.status==='QUALIFIED_CHAT_EXACT_OWNER_ADMISSION_APPROVAL_READY'&&
  r.owner_id===ownerId&&UUID.test(r.packet_id||'')&&
  UUID.test(r.conversation_id||'')&&UUID.test(r.request_id||'')&&
  UUID.test(r.message_id||'')&&ROUTE.test(r.continuity_ref||'')&&
  FINGERPRINT.test(r.proposal_fingerprint||'')&&
  /^[a-f0-9]{64}$/.test(r.signed_source_sha256||'')&&
  r.source_ref==='supabase:reality_chat_messages:'+r.message_id&&
  r.capability_id===NEW&&typeof r.objective==='string'&&
  typeof r.source_quote==='string'&&
  r.owner_approval_ready===true&&r.original_already_admitted===false&&
  r.new_original_admitted===false&&r.model_execution_authorized===false&&
  r.installation_authorized===false&&r.production_changed===false&&
  r.new_shift_started===false;
}

export default async function handler(req,res){
 res.setHeader('Cache-Control','private,no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 let phase='AUTHENTICATE';
 try{
  if(!['GET','POST'].includes(req.method)||
     Object.keys(req.query||{}).length)
   return safe(res,'OWNER_EXACT_REVIEW_GET_OR_POST_ONLY',405);
  if(req.method==='POST'&&(!req.headers?.origin||
    !String(req.headers?.['content-type']||'').toLowerCase().startsWith('application/json')))
   return safe(res,'OWNER_EXACT_APPROVAL_SAME_ORIGIN_JSON_REQUIRED',403);
  assertSameOrigin(req);
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!session||!validUuid(session.user_id))
   return safe(res,'OWNER_CHAT_SIGN_IN_REQUIRED',401);
  if(process.env.VERCEL_ENV!=='preview')
   return safe(res,'OWNER_EXACT_PREVIEW_ONLY',403);
  const db=shiftDatabase();
  if(!db?.strictSecrets||!db.secretKey||db.url!==session.config?.url||
     db.project!==process.env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
   return safe(res,'OWNER_EXACT_DATABASE_SCOPE_UNVERIFIED',503);
  const owner=session.user_id;
  if(req.method==='GET'){
   const result=await shiftRpc(db,'reality_read_owner_qualified_chat_original_reviews_v1',
    {p_owner_id:owner},{timeoutMs:12000});
   if(result?.status!=='OWNER_QUALIFIED_CHAT_ORIGINAL_EXACT_REVIEWS'||
      result.owner_id!==owner||result.read_only!==true||
      result.owner_approval_granted_by_read!==false||
      result.execution_authorized!==false||
      result.installation_authorized!==false||
      result.production_changed!==false||
      !Array.isArray(result.items)||result.items.length>20)
    return safe(res,'EXACT_REVIEWS_OWNER_READBACK_UNVERIFIED',503);
   return safe(res,result.status,200,{items:result.items});
  }
  const b=req.body;
  if(!b||typeof b!=='object'||Array.isArray(b))
   return safe(res,'EXACT_OWNER_BODY_REQUIRED',400);
  if(b.action==='INSPECT_QUALIFIED_CHAT_ORIGINAL'){
   if(Object.keys(b).sort().join(',')!=='action,continuity_ref,message_id'||
      !UUID.test(b.message_id||'')||!ROUTE.test(b.continuity_ref||''))
    return safe(res,'EXACT_SIGNED_CHAT_SOURCE_REQUIRED',400);
   phase='READ_SIGNED_CONTINUITY_SOURCE';
   const source=await shiftRpc(db,'reality_read_owner_qualified_chat_original_source_v1',{
    p_owner_id:owner,p_message_id:b.message_id,p_continuity_ref:b.continuity_ref
   },{timeoutMs:12000});
   if(source?.status!=='QUALIFIED_CHAT_SIGNED_SOURCE_VERIFIED'||
      source.owner_id!==owner||source.message_id!==b.message_id||
      source.continuity_ref!==b.continuity_ref||
      source.signed_user_message_verified!==true||
      source.model_did_not_grant_authority!==true||
      !UUID.test(source.conversation_id||'')||
      !UUID.test(source.request_id||'')||
      !/^[a-f0-9]{64}$/.test(source.signed_source_sha256||''))
    return safe(res,'EXACT_CHAT_SOURCE_REQUALIFICATION_REQUIRED',409);
   if(source.already_admitted_original)
    return safe(res,'EXACT_CHAT_ORIGINAL_ALREADY_ADMITTED_NO_REPLAY',200,{
     original_work_id:WORK.test(source.already_admitted_original)?
      source.already_admitted_original:null});
   phase='CLASSIFY_VERIFIED_SAVED_OWNER_INSTRUCTION';
   const {messages}=await readPrivateChat(session,source.conversation_id);
   const original=messages.filter(m=>m.role==='user'&&
    m.request_id===source.request_id&&m.source_ref===source.source_ref);
   if(original.length!==1)
    return safe(res,'SIGNED_CHAT_OWNER_MESSAGE_READBACK_UNVERIFIED',409);
   const inspection=await inspectSavedChatWork({
    session,conversationId:source.conversation_id,
    requestId:source.request_id,messages
   });
   if(inspection?.status!=='CHAT_WORK_NEW_DEVELOPMENT_ELIGIBLE'||
      inspection.request_id!==source.request_id||
      inspection.source_ref!==source.source_ref||
      inspection.capability_id!==NEW||
      inspection.intent_kind!=='WORK_REQUEST'||inspection.action_eligible!==true||
      typeof inspection.objective!=='string'||
      typeof inspection.source_quote!=='string'||
      inspection.installation_authorized!==false||
      inspection.production_changed!==false)
    return safe(res,'QUALIFIED_CHAT_NO_NEW_ORIGINAL_ADMISSION_SCOPE',200,{
     next_evidence_action:'CONTINUE_EXISTING_SIGNED_WORK_CLASSIFICATION_OR_VERIFY_REGISTERED_ADAPTER',
     classification_status:String(inspection?.status||'INTENT_UNVERIFIED').slice(0,110),
     approval_ready:false});
   phase='STAGE_EXACT_OWNER_REVIEW';
   const packet=await shiftRpc(db,'reality_stage_qualified_chat_original_review_v1',{
    p_owner_id:owner,p_message_id:b.message_id,p_continuity_ref:b.continuity_ref,
    p_signed_source_sha256:source.signed_source_sha256,
    p_source_quote:inspection.source_quote,p_objective:inspection.objective
   },{timeoutMs:17000});
   if(!exactQualifiedChatReview(packet,owner))
    return safe(res,'QUALIFIED_CHAT_REVIEW_NOT_PROVEN_OR_SCOPE_CHANGED',409,{
     approval_ready:false});
   return safe(res,packet.status,200,{
    packet_id:packet.packet_id,message_id:packet.message_id,
    conversation_id:packet.conversation_id,request_id:packet.request_id,
    continuity_ref:packet.continuity_ref,source_ref:packet.source_ref,
    signed_source_sha256:packet.signed_source_sha256,
    objective:packet.objective,source_quote:packet.source_quote,
    capability_id:packet.capability_id,
    proposal_fingerprint:packet.proposal_fingerprint,
    owner_approval_ready:true,original_work_id:null,
    original_not_yet_admitted:true,
    approval_scope:'ISOLATED_NEW_DEVELOPMENT_ADMISSION_ONLY'
   });
  }
  if(b.action==='APPROVE_EXACT_QUALIFIED_CHAT_ORIGINAL'){
   if(Object.keys(b).sort().join(',')!==
      'action,approval_request_id,packet_id,proposal_fingerprint'||
      !UUID.test(b.packet_id||'')||!UUID.test(b.approval_request_id||'')||
      !FINGERPRINT.test(b.proposal_fingerprint||''))
    return safe(res,'EXACT_OWNER_APPROVAL_PACKET_AND_CLICK_REQUIRED',403);
   if(!/^[a-f0-9]{40}$/.test(process.env.VERCEL_GIT_COMMIT_SHA||''))
    return safe(res,'OWNER_SIGNED_PREVIEW_RELEASE_UNVERIFIED',503);
   phase='ATOMIC_EXACT_OWNER_ADMISSION';
   const receipt=await shiftRpc(db,'reality_owner_approve_qualified_chat_original_v1',{
    p_owner_id:owner,p_packet_id:b.packet_id,
    p_proposal_fingerprint:b.proposal_fingerprint,
    p_approval_request_id:b.approval_request_id,
    p_preview_release_sha:process.env.VERCEL_GIT_COMMIT_SHA
   },{timeoutMs:19000});
   if(!['QUALIFIED_CHAT_ORIGINAL_ADMITTED_OWNER_APPROVAL_RECEIPTED',
     'QUALIFIED_CHAT_ORIGINAL_ALREADY_ADMITTED_NO_REPLAY'].includes(receipt?.status)||
      receipt.owner_id!==owner||receipt.packet_id!==b.packet_id||
      !WORK.test(receipt.original_work_id||'')||
      !FINGERPRINT.test(receipt.approval_receipt_sha256||'')||
      receipt.original_admitted!==true||
      receipt.model_execution_authorized!==false||
      receipt.installation_authorized!==false||
      receipt.production_changed!==false||receipt.new_shift_started!==false)
    return safe(res,'EXACT_OWNER_ADMISSION_RECEIPT_UNCERTAIN_CHECK_STATUS',409,{
     retry_owner_approval:false});
   // The atomic insert may already have committed; a failing GET never
   // permits a second authorization or an implied executor start.
   phase='INDEPENDENT_OWNER_ORIGINAL_READBACK';
   const reviews=await shiftRpc(db,'reality_read_owner_qualified_chat_original_reviews_v1',
    {p_owner_id:owner},{timeoutMs:12000});
   const confirmed=reviews?.items?.filter(x=>x.packet_id===b.packet_id&&
    x.proposal_fingerprint===b.proposal_fingerprint&&
    x.original_work_id===receipt.original_work_id&&
    x.approval_receipt_sha256===receipt.approval_receipt_sha256&&
    x.review_state==='ORIGINAL_ADMITTED_IN_EXISTING_CHAT_WORK_ADAPTER'&&
    x.canonical_chat_original_readback_verified===true)||[];
   if(confirmed.length!==1)
    return safe(res,'EXACT_OWNER_ADMISSION_COMMITTED_READBACK_UNCERTAIN',409,{
     retry_owner_approval:false,check_status_required:true});
   return safe(res,'QUALIFIED_CHAT_EXACT_ORIGINAL_ADMISSION_INDEPENDENTLY_READ_BACK',202,{
    packet_id:b.packet_id,original_work_id:receipt.original_work_id,
    source_ref:confirmed[0].source_ref,
    approval_receipt_sha256:receipt.approval_receipt_sha256,
    original_admitted:true,
    owner_approval_recorded:true,
    execution_started:false,
    next_action:'EXISTING_GOVERNED_NEW_DEVELOPMENT_WORKER_REQUIRES_OWN_SCOPE_CHECK',
    no_second_shift:true
   });
  }
  return safe(res,'EXACT_CHAT_QUALIFICATION_ACTION_UNSUPPORTED',400);
 }catch(e){
  const raw=String(e?.message||'');
  const known=/^(?:QUALIFIED_CHAT_|CHAT_WORK_)[A-Z0-9_]{3,120}$/.test(raw)?
   raw:'EXACT_QUALIFICATION_PROVIDER_OR_SCOPE_UNVERIFIED';
  console.warn('REALITY_EXACT_CHAT_ORIGINAL_HANDOFF',phase,known);
  return safe(res,known,503,{
   retry_owner_approval:false,check_status_required:true
  });
 }
}
