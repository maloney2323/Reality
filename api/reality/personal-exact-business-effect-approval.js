// Source-neutral Reality Chat business effect approval, not a job engine.
// Exact human target and payload are staged in isolated private service data.
// Model inference, marketing labels or preflight reads never grant authority.
// The click approves ONE source-epoch-bound effect; it does not execute it.
import {createHash} from 'node:crypto';
import {privateChatConfig,authenticatedChatSession,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {shiftDatabase,shiftRpc}
 from '../../src/reality-governed-shift-boundary-v1.js';
import {checkExactEffectReadback}
 from './personal-business-effect-authority-preflight.js';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const WORK=/^work:[a-f0-9]{32}$/;
const SHA=/^sha256:[a-f0-9]{64}$/;
const CLASS=/^[a-z][a-z0-9_-]{2,90}$/;
const ADAPTER=/^reality_[a-z0-9_]+_v[0-9]+$/;
const EFFECTS=new Set(['INTERNAL_READ','INTERNAL_DRAFT','CUSTOMER_SEND',
 'MARKETING_PUBLISH','PROCUREMENT_COMMIT','FINANCIAL_COMMIT']);
export const maxDuration=30;
const safe=(res,status,code,other={})=>res.status(code).json({
 ok:code===200,status,model_execution_authorized:false,
 effect_executed:false,external_effect_performed:false,
 original_job_completed:false,installation_authorized:false,
 new_shift_started:false,production_changed:false,...other
});
export function verifyExactBusinessEffectPacket(p,owner,body,payloadSha){
 return p?.status==='EXACT_BUSINESS_EFFECT_OWNER_REVIEW_STAGED'&&
  p.owner_id===owner&&p.original_work_id===body.original_work_id&&
  p.job_class===body.job_class&&p.effect_type===body.effect_type&&
  p.target_ref===body.target_ref.trim()&&
  p.payload_sha256===payloadSha&&UUID.test(p.packet_id||'')&&
  UUID.test(p.shift_id||'')&&SHA.test(p.proposal_fingerprint||'')&&
  /^[a-f0-9]{64}$/.test(p.source_epoch_fingerprint||'')&&
  ADAPTER.test(p.registered_execution_adapter||'')&&
  p.owner_approval_ready===true&&p.owner_approval_granted===false&&
  p.execution_authorized===false&&p.effect_reserved===false&&
  p.original_job_completed===false&&p.new_shift_started===false&&
  p.production_changed===false;
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','private,no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='POST'||Object.keys(req.query||{}).length)
  return safe(res,'EXACT_BUSINESS_OWNER_POST_ONLY',405);
 if(!req.headers?.origin||
    !String(req.headers['content-type']||'').toLowerCase().startsWith('application/json'))
  return safe(res,'EXACT_BUSINESS_OWNER_SAME_ORIGIN_JSON_REQUIRED',403);
 let phase='AUTHENTICATE';
 try{
  assertSameOrigin(req);
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!UUID.test(session?.user_id||''))
   return safe(res,'EXACT_BUSINESS_OWNER_SIGN_IN_REQUIRED',401);
  if(process.env.VERCEL_ENV!=='preview')
   return safe(res,'EXACT_BUSINESS_EFFECT_ISOLATED_PREVIEW_ONLY',403);
  const db=shiftDatabase();
  if(!db?.strictSecrets||db.url!==session.config?.url||
     db.project!==process.env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
   return safe(res,'EXACT_BUSINESS_OWNER_DATABASE_SCOPE_UNVERIFIED',503);
  const body=req.body;
  if(!body||typeof body!=='object'||Array.isArray(body))
   return safe(res,'EXACT_BUSINESS_OWNER_BODY_INVALID',400);
  const owner=session.user_id;
  if(body.action==='PREPARE_EXACT_BUSINESS_EFFECT'){
   if(Object.keys(body).sort().join(',')!==
     'action,effect_type,job_class,original_work_id,payload_text,target_ref'||
     !WORK.test(body.original_work_id||'')||
     !CLASS.test(body.job_class||'')||
     !EFFECTS.has(body.effect_type)||
     typeof body.target_ref!=='string'||
     body.target_ref.trim().length<6||body.target_ref.trim().length>450||
     typeof body.payload_text!=='string'||
     body.payload_text.length<8||body.payload_text.length>4000)
    return safe(res,'EXACT_BUSINESS_EFFECT_TARGET_AND_PAYLOAD_REQUIRED',400);
   phase='REVERIFY_ORIGINAL_PRECLAIM';
   const current=await shiftRpc(db,'reality_read_owner_exact_business_effect_preflight_v1',{
    p_owner_id:owner,p_original_work_id:body.original_work_id,
    p_job_class:body.job_class,p_effect_type:body.effect_type
   },{timeoutMs:12000});
   checkExactEffectReadback(current,owner,body.original_work_id,
    body.job_class,body.effect_type);
   // Staging an itemized warrant may be offered BEFORE the old shift-wide
   // business warrant exists, but only for real signed source+goal+adapter.
   if(current.status!=='OWNER_EXACT_BUSINESS_EFFECT_AUTHORITY_PREFLIGHT'||
      current.canonical_original_admission_verified!==true||
      current.canonical_source_current!==true||
      current.consented_business_provider_verified!==true||
      current.registered_executor_independently_verified!==true||
      current.independent_final_original_already_present!==false||
      current.execution_claim_created!==false||
      !UUID.test(current.shift_id||''))
    return safe(res,'EXACT_BUSINESS_EFFECT_ORIGINAL_PROOF_REQUIRED',409,{
     next_gate:current.next_gate,owner_approval_ready:false});
   const payloadSha='sha256:'+createHash('sha256')
    .update(body.payload_text,'utf8').digest('hex');
   phase='STAGE_SOURCE_BOUND_EFFECT';
   const packet=await shiftRpc(db,'reality_stage_exact_business_original_effect_review_v1',{
    p_owner_id:owner,p_original_work_id:body.original_work_id,
    p_job_class:body.job_class,p_effect_type:body.effect_type,
    p_target_ref:body.target_ref.trim(),p_payload_sha256:payloadSha,
    p_effect_payload:body.payload_text
   },{timeoutMs:17000});
   if(!verifyExactBusinessEffectPacket(packet,owner,body,payloadSha))
    return safe(res,'EXACT_BUSINESS_EFFECT_PACKET_NOT_PROVEN',409,{
     owner_approval_ready:false});
   return safe(res,packet.status,200,{
    packet_id:packet.packet_id,original_work_id:packet.original_work_id,
    job_class:packet.job_class,effect_type:packet.effect_type,
    target_ref:packet.target_ref,payload_sha256:packet.payload_sha256,
    proposal_fingerprint:packet.proposal_fingerprint,
    registered_execution_adapter:packet.registered_execution_adapter,
    owner_approval_ready:true,exact_payload_stored_privately:true,
    authorization_scope:'EXACT_ONE_USE_EFFECT_ONLY',execution_started:false
   });
  }
  if(body.action==='APPROVE_EXACT_BUSINESS_EFFECT'){
   if(Object.keys(body).sort().join(',')!==
     'action,approval_request_id,packet_id,proposal_fingerprint'||
    !UUID.test(body.packet_id||'')||!UUID.test(body.approval_request_id||'')||
    !SHA.test(body.proposal_fingerprint||''))
    return safe(res,'EXACT_BUSINESS_EFFECT_OWNER_CLICK_REQUIRED',400);
   phase='ATOMIC_OWNER_EFFECT_APPROVAL';
   const receipt=await shiftRpc(db,'reality_owner_approve_exact_business_original_effect_v1',{
    p_owner_id:owner,p_packet_id:body.packet_id,
    p_proposal_fingerprint:body.proposal_fingerprint,
    p_approval_request_id:body.approval_request_id
   },{timeoutMs:17000});
   if(receipt?.status!=='EXACT_BUSINESS_EFFECT_OWNER_APPROVED_ONE_USE'||
      receipt.owner_id!==owner||receipt.packet_id!==body.packet_id||
      !WORK.test(receipt.original_work_id||'')||
      !SHA.test(receipt.approval_receipt_sha256||'')||
      receipt.itemized_owner_approval_recorded!==true||
      receipt.execution_authorized!==false||
      receipt.effect_reserved!==false||
      receipt.original_job_completed!==false||
      receipt.production_changed!==false)
    return safe(res,'EXACT_BUSINESS_EFFECT_APPROVAL_OUTCOME_UNCERTAIN',409,{
     check_status_required:true,retry_owner_approval:false});
   return safe(res,receipt.status,200,{
    packet_id:receipt.packet_id,original_work_id:receipt.original_work_id,
    approval_receipt_sha256:receipt.approval_receipt_sha256,
    itemized_owner_approval_recorded:true,
    execution_started:false,provider_effect_performed:false,
    next_action:'SIGNED_WORKER_MUST_INDEPENDENTLY_RESERVE_EXACT_APPROVED_EFFECT'
   });
  }
  return safe(res,'EXACT_BUSINESS_OWNER_ACTION_NOT_REGISTERED',400);
 }catch(e){
  const err=String(e?.message||'');
  console.warn('REALITY_EXACT_BUSINESS_OWNER_APPROVAL',phase,
   /^EXACT_BUSINESS_[A-Z_]{5,100}$/.test(err)?err:'PROVIDER_OR_SCOPE_UNVERIFIED');
  return safe(res,'EXACT_BUSINESS_EFFECT_SOURCE_OR_APPROVAL_UNVERIFIED',503,{
   retry_owner_approval:false,check_status_required:true
  });
 }
}