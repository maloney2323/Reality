// Reality Chat: one exact owner decision to investigate and independently
// test a source-pinned repair. It is NOT an installation approval.
import {privateChatConfig,authenticatedChatSession,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {resolveReliabilityBenchmarkDb}
 from '../../src/reality-reliability-db-boundary-v0.1.js';
import {shiftRpc} from '../../src/reality-governed-shift-boundary-v1.js';
export const maxDuration=60;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const SHA=/^sha256:[a-f0-9]{64}$/;
const GIT=/^[a-f0-9]{40}$/;
const REF=/^https:\/\/github\.com\/maloney2323\/Reality\/pull\/[1-9][0-9]*$/;
const INTENT='OWNER_APPROVE_EXACT_REPAIR_INVESTIGATION_AND_INDEPENDENT_TESTING';
const respond=(res,code,status,detail={})=>res.status(code).json({
 ok:code===200||code===202,status,...detail,
 installation_authorized:false,original_job_completed:false,
 production_changed:false,new_shift_started:false
});
export function verifyOwnerRepairScopeCard(card,ownerId){
 if(!card||card.owner_id!==ownerId||!UUID.test(card.handoff_id||'')||
  !UUID.test(card.shift_id||'')||!REF.test(card.source_ref||'')||
  !/^src\/[a-zA-Z0-9_./-]+\.js$/.test(card.source_file||'')||
  card.source_file.includes('..')||!GIT.test(card.candidate_commit_sha||'')||
  !GIT.test(card.current_blob_sha||'')||!GIT.test(card.candidate_blob_sha||'')||
  card.current_blob_sha===card.candidate_blob_sha||
  !Number.isSafeInteger(card.baseline_run_id)||card.baseline_run_id<1||
  !Number.isSafeInteger(card.green_run_id)||card.green_run_id<1||
  !/^[a-f0-9]{64}$/.test(card.frozen_test_sha256||'')||
  !SHA.test(card.work_order_fingerprint||'')||
  card.installation_authorized!==false||
  card.original_job_completed!==false||
  card.production_changed!==false||card.new_shift_started!==false||
  card.read_only!==true)return null;
 if(card.status==='EXACT_OWNER_REPAIR_WORK_SCOPE_APPROVAL_READY'&&
    card.owner_approval_ready===true&&
    card.owner_work_scope_approved===false&&
    card.approval_receipt_sha256===null&&
    card.continuation_state==='PREPARED')
  return Object.freeze({...card,owner_scope_action:'APPROVE_WORK_SCOPE_ONLY'});
 if(card.status==='EXACT_OWNER_REPAIR_WORK_SCOPE_DECISION_RECORDED'&&
   card.owner_approval_ready===false&&
   card.owner_work_scope_approved===true&&
   SHA.test(card.approval_receipt_sha256||'')&&
   ['APPROVED','SOURCE_RECHECKED'].includes(card.continuation_state))
  return Object.freeze({...card,owner_scope_action:'ALREADY_APPROVED_NO_REPLAY'});
 return null;
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','private,no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 let stage='REQUEST';
 try{
  if(!['GET','POST'].includes(req.method)||
   Object.keys(req.query||{}).length)
   return respond(res,405,'REPAIR_WORK_SCOPE_GET_OR_POST_ONLY');
  if(req.headers?.['sec-fetch-site']==='cross-site'||
    req.method==='POST'&&(!req.headers?.origin||
    !String(req.headers?.['content-type']||'').toLowerCase()
      .startsWith('application/json')))
   return respond(res,403,'REPAIR_WORK_SCOPE_SAME_ORIGIN_CLICK_REQUIRED');
  assertSameOrigin(req);
  stage='AUTHENTICATE';
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!UUID.test(session?.user_id||'')||!session?.access_token)
   return respond(res,401,'REPAIR_WORK_SCOPE_OWNER_SIGN_IN_REQUIRED');
  const db=resolveReliabilityBenchmarkDb();
  if(process.env.VERCEL_ENV!=='preview'||db?.strictSecrets!==true||
     db.project!==process.env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
     db.url!==session.config?.url||
     typeof db.secretKey!=='string'||db.secretKey.length<25)
   return respond(res,503,'REPAIR_WORK_SCOPE_ISOLATED_SERVICE_UNVERIFIED');
  let b=null;
  if(req.method==='POST'){
   b=req.body;
   if(!b||typeof b!=='object'||Array.isArray(b)||
      Object.getPrototypeOf(b)!==Object.prototype||
      Object.keys(b).sort().join(',')!==
       'handoff_id,intent,request_id,shift_id,work_order_fingerprint'||
      !UUID.test(b.handoff_id||'')||!UUID.test(b.request_id||'')||
      !UUID.test(b.shift_id||'')||
      !SHA.test(b.work_order_fingerprint||'')||b.intent!==INTENT)
    return respond(res,403,'REPAIR_WORK_SCOPE_EXACT_CLICK_REQUIRED');
  }
  stage='READ_OWNER_CARD';
  const card=await shiftRpc(db,'reality_read_owner_repair_scope_decision_v1',{
   p_owner_id:session.user_id
  },{timeoutMs:15000});
  if(req.method==='GET'){
   if(card?.status==='NO_SIGNED_REPAIR_WORK_SCOPE_DECISION'&&
      card.owner_approval_ready===false&&
      card.installation_authorized===false)
    return respond(res,200,'NO_VERIFIED_REPAIR_SCOPE_DECISION',{
     card:null,owner_approval_recorded:false});
   const safe=verifyOwnerRepairScopeCard(card,session.user_id);
   if(!safe)return respond(res,503,'REPAIR_WORK_SCOPE_CARD_UNVERIFIED');
   return respond(res,200,safe.status,{card:safe,
    owner_approval_recorded:safe.owner_work_scope_approved===true});
  }
  const verified=verifyOwnerRepairScopeCard(card,session.user_id);
  if(!verified||verified.owner_scope_action!=='APPROVE_WORK_SCOPE_ONLY'||
    verified.handoff_id!==b.handoff_id||
    verified.shift_id!==b.shift_id||
    verified.work_order_fingerprint!==b.work_order_fingerprint)
   return respond(res,409,'REPAIR_WORK_SCOPE_SOURCE_CHANGED_REFRESH_REQUIRED');
  stage='RECORD_EXACT_OWNER_DECISION';
  const receipt=await shiftRpc(db,'reality_record_owner_repair_scope_decision_v1',{
   p_owner_id:session.user_id,p_shift_id:b.shift_id,
   p_handoff_id:b.handoff_id,p_request_id:b.request_id,
   p_work_order_fingerprint:b.work_order_fingerprint,
   p_intent:INTENT
  },{timeoutMs:20000});
  if(receipt?.status!=='EXACT_OWNER_REPAIR_WORK_SCOPE_APPROVED'||
    receipt.handoff_id!==b.handoff_id||
    receipt.shift_id!==b.shift_id||
    receipt.owner_id!==session.user_id||
    !SHA.test(receipt.approval_receipt_sha256||'')||
    receipt.scope_approval_recorded!==true||
    receipt.installation_authorized!==false||
    receipt.production_changed!==false)
   return respond(res,409,'REPAIR_WORK_SCOPE_RECORD_OUTCOME_UNCERTAIN_CHECK_STATUS',{
    retry_owner_approval:false});
  stage='INDEPENDENT_OWNER_READBACK';
  const reread=await shiftRpc(db,'reality_read_owner_repair_scope_decision_v1',{
   p_owner_id:session.user_id
  },{timeoutMs:15000});
  const confirmed=verifyOwnerRepairScopeCard(reread,session.user_id);
  if(!confirmed||
   confirmed.owner_scope_action!=='ALREADY_APPROVED_NO_REPLAY'||
   confirmed.handoff_id!==b.handoff_id||
   confirmed.approval_receipt_sha256!==receipt.approval_receipt_sha256)
   return respond(res,409,'REPAIR_WORK_SCOPE_READBACK_UNCERTAIN_CHECK_STATUS',{
    retry_owner_approval:false});
  return respond(res,202,'EXACT_REPAIR_OWNER_SCOPE_APPROVED_SAME_SHIFT_CONTINUES',{
   owner_approval_recorded:true,handoff_id:confirmed.handoff_id,
   shift_id:confirmed.shift_id,
   approval_receipt_sha256:confirmed.approval_receipt_sha256,
   next_action:'AUTOMATIC_SAME_SHIFT_INDEPENDENT_SOURCE_RECHECK',
   retry_owner_approval:false,no_second_scope_approval_required:true
  });
 }catch(error){
  const msg=String(error?.message||'');
  const category=msg.includes('SHIFT_DATABASE_RPC_')?'DATABASE_OR_TIMEOUT':
   msg.includes('CHAT_AUTH')?'OWNER_SESSION':'EXACT_SCOPE_UNVERIFIED';
  console.warn('REALITY_REPAIR_SCOPE_DECISION_UNVERIFIED',stage,category);
  return respond(res,503,'REPAIR_SCOPE_OUTCOME_UNVERIFIED_CHECK_STATUS',{
   failed_stage:stage,failure_category:category,
   retry_owner_approval:false
  });
 }
}
