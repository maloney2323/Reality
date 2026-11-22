// One explicit owner click in Reality Chat authorizes the exact independently
// tested original repair, after all release/settlement preflight gates passed.
// The worker resumes automatically; this route does not write source or start
// a second job, and there is NO third confirmation.
import {privateChatConfig,authenticatedChatSession,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {resolveReliabilityBenchmarkDb}
 from '../../src/reality-reliability-db-boundary-v0.1.js';
import {shiftRpc} from '../../src/reality-governed-shift-boundary-v1.js';
export const maxDuration=25;
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^sha256:[a-f0-9]{64}$/;
const WORK=/^work:[a-f0-9]{32}$/;
const INTENT='OWNER_APPROVE_EXACT_INDEPENDENTLY_VERIFIED_ISOLATED_REPAIR';
function response(res,status,code=200,fields={}){
 return res.status(code).json({ok:status==='ACCEPTED',
  status,installation_completed:false,original_job_completed:false,
  production_changed:false,...fields});
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 try{
  if(req.method!=='POST'||Object.keys(req.query||{}).length)
   return response(res,'EXACT_OWNER_APPROVAL_POST_ONLY',405);
  if(!req.headers?.origin||
     req.headers?.['sec-fetch-site']==='cross-site'||
     !String(req.headers?.['content-type']||'').toLowerCase()
       .startsWith('application/json'))
   return response(res,'EXACT_OWNER_SAME_ORIGIN_CLICK_REQUIRED',403);
  assertSameOrigin(req);
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!session?.user_id||!session?.access_token)
   return response(res,'SIGNED_IN_ORIGINAL_OWNER_REQUIRED',401);
  const db=resolveReliabilityBenchmarkDb();
  if(db?.strictSecrets!==true||
     db.project!==process.env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
     db.url!==session.config.url||
     typeof db.secretKey!=='string'||db.secretKey.length<25)
   throw Error('EXACT_ISOLATED_SERVICE_WARRANT_REQUIRED');
  const body=req.body;
  const signedChat=await shiftRpc(db,'reality_read_signed_chat_general_install_card_v1',{p_owner_id:session.user_id});
  const card=signedChat?.status==='GENERALIZED_VERIFIED_ORIGINAL_INSTALL_REVIEW'&&
   signedChat.original_work_id===body?.original_work_id&&signedChat.attempt_id===body?.attempt_id?
   signedChat:await shiftRpc(db,'reality_read_generalized_original_install_review_v1',{p_owner_id:session.user_id});
  const isChat=card?.source_family==='SIGNED_CHAT_DEVELOPMENT_RECOVERY';
  if(card?.status!=='GENERALIZED_VERIFIED_ORIGINAL_INSTALL_REVIEW'||
    card.owner_id!==session.user_id||
    !WORK.test(card.original_work_id||'')||
    !SHA.test(card.candidate_commit_sha||'')||
    !HASH.test(card.candidate_artifact_sha256||'')||
    !UUID.test(card.attempt_id||'')||
    !UUID.test(card.shift_id||'')||
    card.production_changed!==false)
   return response(res,'GENERAL_ORIGINAL_OWNER_SCOPE_OR_REVIEW_UNVERIFIED',409);
  if(!body||typeof body!=='object'||Array.isArray(body)||
    Object.getPrototypeOf(body)!==Object.prototype||
    Object.keys(body).sort().join(',')!==
      'artifact_sha256,attempt_id,candidate_commit_sha,intent,original_work_id,request_id'||
    body.original_work_id!==card.original_work_id||
    body.attempt_id!==card.attempt_id||
    body.candidate_commit_sha!==card.candidate_commit_sha||
    body.artifact_sha256!==card.candidate_artifact_sha256||
    body.intent!==INTENT||!UUID.test(body.request_id||''))
   return response(res,'GENERAL_ORIGINAL_EXACT_ARTIFACT_CLICK_REQUIRED',403);
  if(card.owner_approval_ready!==true||
    card.phase!=='READY_FOR_EXACT_OWNER_APPROVAL'||
    card.isolated_github_write_verified!==true||
    card.preview_auto_deploy_verified!==true||
    card.same_original_execution_and_settlement_contract_verified!==true||
    card.approval_receipt_id!==null||
    card.installation_authorized!==false||
    card.original_job_completed!==false)
   return response(res,'GENERAL_ORIGINAL_FINAL_RELEASE_CONTINUATION_NOT_READY',409,{
     owner_approval_ready:false});
  // Signed Chat original consent binds to the current isolated preview's
  // exact base SHA and current authenticated owner; no generic Chat message
  // or permission expansion can supply the installation decision.
  if(isChat&&(process.env.VERCEL_ENV!=='preview'||process.env.VERCEL_GIT_COMMIT_REF!==card.target_branch||
   process.env.VERCEL_GIT_COMMIT_SHA!==card.target_base_sha))
   return response(res,'SIGNED_CHAT_EXACT_PREVIEW_RELEASE_CHANGED',409,{owner_approval_ready:false});
  if(isChat){
   const ref=await fetch('https://api.github.com/repos/maloney2323/Reality/git/ref/heads/'+card.target_branch,{
    method:'GET',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(6000),headers:{accept:'application/vnd.github+json','user-agent':'Reality-exact-owner-approval'}});
   const b=await ref.json().catch(()=>null);
   if(!ref.ok||b?.ref!=='refs/heads/'+card.target_branch||b.object?.sha!==card.target_base_sha)
    return response(res,'SIGNED_CHAT_EXACT_PREVIEW_RELEASE_CHANGED',409,{owner_approval_ready:false});
  }
  const r=isChat?null:await fetch(db.url+
   '/rest/v1/rpc/reality_owner_approve_general_original_install_v1',{
   method:'POST',cache:'no-store',redirect:'error',
   signal:AbortSignal.timeout(15000),
   headers:{apikey:session.config.key,
    authorization:'Bearer '+session.access_token,
    'content-type':'application/json',accept:'application/json'},
   body:JSON.stringify({
    p_original_work_id:card.original_work_id,
    p_attempt_id:card.attempt_id,
    p_candidate_commit_sha:card.candidate_commit_sha,
    p_artifact_sha256:card.candidate_artifact_sha256,
    p_intent:INTENT,p_request_id:body.request_id
   })});
  if(r&&!r.ok)return response(res,
   'GENERAL_ORIGINAL_APPROVAL_PROVIDER_OUTCOME_UNCERTAIN_CHECK_READBACK',409,
   {retry_owner_approval:false});
  const receipt=isChat?await shiftRpc(db,'reality_owner_approve_signed_chat_general_install_v1',{
   p_owner_id:session.user_id,p_original_work_id:card.original_work_id,p_attempt_id:card.attempt_id,
   p_candidate_commit_sha:card.candidate_commit_sha,p_artifact_sha256:card.candidate_artifact_sha256,
   p_intent:INTENT,p_request_id:body.request_id}):await r.json().catch(()=>null);
  if(receipt?.status!=='GENERAL_ORIGINAL_OWNER_APPROVED_AUTO_CONTINUATION'||
    receipt.original_work_id!==card.original_work_id||
    receipt.shift_id!==card.shift_id||
    receipt.attempt_id!==card.attempt_id||
    receipt.candidate_commit_sha!==card.candidate_commit_sha||
    receipt.artifact_sha256!==card.candidate_artifact_sha256||
    !UUID.test(receipt.approval_id||'')||
    receipt.approval_recorded!==true||
    receipt.installation_authorized!==true||
    receipt.installation_completed!==false||
    receipt.original_job_completed!==false||
    receipt.production_changed!==false||
    receipt.no_third_confirmation!==true)
   return response(res,'GENERAL_ORIGINAL_EXACT_APPROVAL_READBACK_UNVERIFIED',503,
    {retry_owner_approval:false});
  return response(res,'ACCEPTED',202,{
   original_work_id:receipt.original_work_id,
   shift_id:receipt.shift_id,
   approval_id:receipt.approval_id,
   approval_recorded:true,installation_authorized:true,
   next_gate:'AUTO_INSTALL_THEN_INDEPENDENT_SAME_ORIGINAL_SETTLEMENT',
   no_third_confirmation:true,retry_owner_approval:false
  });
 }catch{
  return response(res,'GENERAL_ORIGINAL_OWNER_APPROVAL_SCOPE_UNVERIFIED',503,
   {retry_owner_approval:false});
 }
}
