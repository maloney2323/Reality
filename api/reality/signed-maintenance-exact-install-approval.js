// One exact signed owner click in Reality Chat. This is approval transport,
// NOT an installer, new shift or final receipt. The already signed worker
// automatically invokes the existing privileged isolated installer afterward.
import {privateChatConfig,authenticatedChatSession,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {resolveReliabilityBenchmarkDb}
 from '../../src/reality-reliability-db-boundary-v0.1.js';
import {shiftRpc} from '../../src/reality-governed-shift-boundary-v1.js';
export const maxDuration=25;
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^sha256:[a-f0-9]{64}$/;
const INTENT='OWNER_APPROVE_EXACT_SIGNED_ISOLATED_MAINTENANCE_REPAIR';
function respond(res,code,status,other={}){
 return res.status(code).json({ok:code===202,status,
  installation_completed:false,original_job_completed:false,
  production_changed:false,new_shift_started:false,...other});
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','private,no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 try{
  if(req.method!=='POST'||Object.keys(req.query||{}).length)
   return respond(res,405,'EXACT_SIGNED_MAINTENANCE_OWNER_POST_ONLY');
  if(req.headers?.['sec-fetch-site']==='cross-site'||
   !req.headers?.origin||
   !String(req.headers?.['content-type']||'').toLowerCase()
     .startsWith('application/json'))
   return respond(res,403,'EXACT_SIGNED_MAINTENANCE_SAME_ORIGIN_CLICK_REQUIRED');
  assertSameOrigin(req);
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!session?.user_id||!session?.access_token)
   return respond(res,401,'EXACT_SIGNED_OWNER_SESSION_REQUIRED');
  const db=resolveReliabilityBenchmarkDb();
  if(process.env.VERCEL_ENV!=='preview'||
   db?.strictSecrets!==true||
   db.project!==process.env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
   db.url!=='https://'+db.project+'.supabase.co'||
   db.url!==session.config.url||
   typeof db.secretKey!=='string'||db.secretKey.length<25)
   return respond(res,503,'EXACT_SIGNED_PREVIEW_SERVICE_SCOPE_INVALID');
  const b=req.body;
  if(!b||typeof b!=='object'||Array.isArray(b)||
   Object.getPrototypeOf(b)!==Object.prototype||
   Object.keys(b).sort().join(',')!==
    'candidate_commit_sha,intent,maintenance_id,request_id,shift_id,target_review_receipt_sha256'||
   !UUID.test(b.maintenance_id||'')||!UUID.test(b.shift_id||'')||
   !UUID.test(b.request_id||'')||!SHA.test(b.candidate_commit_sha||'')||
   !HASH.test(b.target_review_receipt_sha256||'')||b.intent!==INTENT)
   return respond(res,403,'EXACT_SIGNED_MAINTENANCE_ARTIFACT_CLICK_REQUIRED');
  const card=await shiftRpc(db,
   'reality_read_owner_signed_maintenance_install_decision_v1',{
    p_owner_id:session.user_id
   });
  if(card?.status!=='EXACT_OWNER_MAINTENANCE_INSTALL_APPROVAL_READY'||
   card.owner_id!==session.user_id||
   card.shift_id!==b.shift_id||card.maintenance_id!==b.maintenance_id||
   card.candidate_commit_sha!==b.candidate_commit_sha||
   card.target_review_receipt_sha256!==b.target_review_receipt_sha256||
   card.target_branch!=='reality/chat-direct-work-handoff-20261115'||
   !SHA.test(card.target_head_sha||'')||
   !SHA.test(card.candidate_source_blob_sha||'')||
   !HASH.test(card.artifact_receipt_sha256||'')||
   !HASH.test(card.case_ci_receipt_sha256||'')||
   card.owner_approval_ready!==true||
   card.installation_authorized!==false||
   card.repair_installed!==false||card.original_job_completed!==false||
   card.production_changed!==false||card.new_shift_started!==false)
   return respond(res,409,'EXACT_SIGNED_OWNER_INSTALL_REVIEW_CHANGED_REFRESH_REQUIRED');
  const r=await shiftRpc(db,
   'reality_record_owner_signed_maintenance_install_decision_v1',{
    p_owner_id:session.user_id,p_shift_id:b.shift_id,
    p_maintenance_id:b.maintenance_id,p_request_id:b.request_id,
    p_candidate_commit_sha:b.candidate_commit_sha,
    p_target_review_receipt_sha256:b.target_review_receipt_sha256,
    p_intent:INTENT
   });
  if(r?.status!=='EXACT_OWNER_MAINTENANCE_INSTALL_APPROVED_FOR_AUTOMATIC_CONTINUATION'||
   r.owner_id!==session.user_id||r.maintenance_id!==b.maintenance_id||
   r.shift_id!==b.shift_id||r.candidate_commit_sha!==b.candidate_commit_sha||
   r.target_review_receipt_sha256!==b.target_review_receipt_sha256||
   !UUID.test(r.approval_id||'')||!HASH.test(r.approval_receipt_sha256||'')||
   r.owner_approval_recorded!==true||r.installation_authorized!==true||
   r.repair_installed!==false||r.original_job_completed!==false||
   r.production_changed!==false||r.new_shift_started!==false)
   return respond(res,409,'EXACT_SIGNED_OWNER_APPROVAL_READBACK_UNVERIFIED_NO_RETRY',{
    retry_owner_approval:false});
  return respond(res,202,'EXACT_SIGNED_OWNER_APPROVAL_RECORDED_AUTO_CONTINUATION',{
   maintenance_id:r.maintenance_id,shift_id:r.shift_id,approval_id:r.approval_id,
   approval_receipt_sha256:r.approval_receipt_sha256,
   owner_approval_recorded:true,installation_authorized:true,
   next_gate:'AUTOMATIC_SAME_SIGNED_SHIFT_INSTALL_AND_INDEPENDENT_RECHECK',
   retry_owner_approval:false,no_third_confirmation:true});
 }catch{
  return respond(res,503,'EXACT_SIGNED_OWNER_APPROVAL_OUTCOME_UNCERTAIN_CHECK_READBACK',{
   retry_owner_approval:false});
 }
}
