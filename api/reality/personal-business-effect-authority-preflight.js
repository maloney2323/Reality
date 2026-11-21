// Owner-scoped, READ-ONLY exact business effect preflight.
// Classification or source discovery never authorizes sending, publishing,
// committing procurement or executing any consequential business action.
import {privateChatConfig,authenticatedChatSession}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {shiftDatabase,shiftRpc}
 from '../../src/reality-governed-shift-boundary-v1.js';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const WORK=/^work:[a-f0-9]{32}$/;
const CLASS=/^[a-z][a-z0-9_-]{2,90}$/;
const EFFECTS=new Set([
 'INTERNAL_READ','INTERNAL_DRAFT','CUSTOMER_SEND',
 'MARKETING_PUBLISH','PROCUREMENT_COMMIT','FINANCIAL_COMMIT'
]);
const GATES=new Set([
 'ADMIT_REAL_SOURCE_BACKED_ORIGINAL_WITH_OWNER_GOAL',
 'INDEPENDENT_FINAL_ORIGINAL_ALREADY_PRESENT_NO_REPLAY',
 'CURRENT_SOURCE_PROVENANCE_REQUALIFICATION_REQUIRED',
 'INDEPENDENT_OWNER_GOAL_ACCEPTANCE_WORLDLINE_REQUIRED',
 'EXACT_BUSINESS_ORIGINAL_SHIFT_WARRANT_REQUIRED',
 'OWNER_CONSENTED_PROVIDER_CONNECTION_PROOF_REQUIRED',
 'REGISTER_AND_INDEPENDENTLY_VERIFY_EXECUTOR_ADAPTER',
 'REGISTER_AND_INDEPENDENTLY_VERIFY_EFFECT_SPECIFIC_EXECUTOR',
 'RESOLVE_AMBIGUOUS_ORIGINAL_SOURCE_ROUTES',
 'OWNER_MUST_REVIEW_EXACT_EFFECT_TARGET_PAYLOAD_AND_ONE_USE_AUTHORIZATION'
]);
export const maxDuration=20;
export function checkExactEffectReadback(receipt,owner,original,jobClass,effect){
 if(!receipt||receipt.owner_id!==owner||
   receipt.original_work_id!==original||receipt.job_class!==jobClass||
   receipt.effect_type!==effect||
   receipt.read_only!==true||
   receipt.execution_authorized!==false||
   receipt.itemized_approval_granted!==false||
   receipt.new_shift_started!==false||
   receipt.production_changed!==false||
   receipt.installation_authorized!==false||
   receipt.original_job_completed_by_read!==false||
   receipt.execution_claim_created!==false||
   !GATES.has(receipt.next_gate)||
   typeof receipt.ready_for_exact_effect_review!=='boolean'||
   !['OWNER_EXACT_BUSINESS_EFFECT_AUTHORITY_PREFLIGHT',
     'EXACT_BUSINESS_EFFECT_ORIGINAL_NOT_ADMITTED'].includes(receipt.status))
  throw Error('EXACT_EFFECT_INDEPENDENT_OWNER_RECEIPT_UNVERIFIED');
 if(receipt.status==='EXACT_BUSINESS_EFFECT_ORIGINAL_NOT_ADMITTED'){
  if(receipt.ready_for_exact_effect_review!==false||
    !['ADMIT_REAL_SOURCE_BACKED_ORIGINAL_WITH_OWNER_GOAL',
      'RESOLVE_AMBIGUOUS_ORIGINAL_SOURCE_ROUTES'].includes(receipt.next_gate))
   throw Error('EXACT_EFFECT_INDEPENDENT_ORIGINAL_MISSING');
 }else{
  if(!UUID.test(receipt.shift_id||'')||
    typeof receipt.source_ref!=='string'||
    receipt.owner_review_before_execution_claim!==true||
    typeof receipt.canonical_original_admission_verified!=='boolean'||
    (receipt.ready_for_exact_effect_review===true&&
     receipt.canonical_original_admission_verified!==true)||
    receipt.ready_for_exact_effect_review===true&&(
     receipt.canonical_source_current!==true||
     receipt.exact_business_shift_warrant_verified!==true||
     receipt.independent_goal_acceptance_worldline_verified!==true||
     receipt.consented_business_provider_verified!==true||
     receipt.registered_executor_independently_verified!==true||
     receipt.independent_final_original_already_present!==false))
   throw Error('EXACT_EFFECT_READY_WITHOUT_INDEPENDENT_PROOFS');
 }
 return receipt;
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','private,no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET')
  return res.status(405).json({ok:false,error:'EXACT_BUSINESS_EFFECT_READ_ONLY'});
 const query=req.query||{};
 if(Object.keys(query).sort().join(',')!=='effect_type,job_class,original_work_id'||
  !WORK.test(query.original_work_id||'')||
  !CLASS.test(query.job_class||'')||
  !EFFECTS.has(query.effect_type))
  return res.status(400).json({ok:false,error:'EXACT_BUSINESS_EFFECT_SCOPE_REQUIRED'});
 try{
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!UUID.test(session?.user_id||''))
   return res.status(401).json({ok:false,error:'EXACT_EFFECT_OWNER_SIGN_IN_REQUIRED'});
  if(process.env.VERCEL_ENV!=='preview')
   return res.status(403).json({ok:false,error:'EXACT_EFFECT_ISOLATED_PREVIEW_ONLY'});
  const db=shiftDatabase();
  if(!db?.strictSecrets||!db.secretKey||
   db.url!==session.config?.url||
   db.project!==process.env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
   throw Error('EXACT_EFFECT_OWNER_SOURCE_DB_UNVERIFIED');
  const result=await shiftRpc(db,'reality_read_owner_exact_business_effect_preflight_v1',{
   p_owner_id:session.user_id,
   p_original_work_id:query.original_work_id,
   p_job_class:query.job_class,p_effect_type:query.effect_type
  },{timeoutMs:15000});
  checkExactEffectReadback(result,session.user_id,
   query.original_work_id,query.job_class,query.effect_type);
  return res.status(200).json({ok:true,...result});
 }catch(e){
  console.warn('REALITY_EXACT_BUSINESS_EFFECT_PREFLIGHT',
   String(e?.message||'').startsWith('EXACT_EFFECT_')?
    'CANONICAL_SCOPE_REJECTED':'PROVIDER_UNAVAILABLE');
  return res.status(503).json({ok:false,error:'EXACT_EFFECT_PROOF_UNAVAILABLE',
   ready_for_exact_effect_review:false,execution_authorized:false,
   itemized_approval_granted:false,installation_authorized:false,
   new_shift_started:false,production_changed:false});
 }
}
