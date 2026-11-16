// A separate, signed, owner-click-only exact recovery authorization.
// The prior installation permission was consumed and cannot be replayed.
// This endpoint never writes GitHub, starts another shift, or settles work.
import {privateChatConfig,authenticatedChatSession,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {resolveReliabilityBenchmarkDb}
 from '../../src/reality-reliability-db-boundary-v0.1.js';
import {shiftRpc}
 from '../../src/reality-governed-shift-boundary-v1.js';
export const maxDuration=25;
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^sha256:[a-f0-9]{64}$/;
const WORK=/^work:[a-f0-9]{32}$/;
const INTENT='OWNER_APPROVE_ONE_EXACT_FENCED_ORIGINAL_RECOVERY_PUBLICATION';
function answer(res,status,code=200,more={}){
 return res.status(code).json({ok:status==='ACCEPTED',status,
  source_installed:false,original_job_completed:false,
  production_changed:false,...more});
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 try{
  if(req.method!=='POST'||Object.keys(req.query||{}).length)
   return answer(res,'EXACT_RECOVERY_OWNER_POST_ONLY',405);
  if(!req.headers?.origin||
     req.headers?.['sec-fetch-site']==='cross-site'||
     !String(req.headers?.['content-type']||'').toLowerCase()
      .startsWith('application/json'))
   return answer(res,'EXACT_RECOVERY_OWNER_SAME_ORIGIN_REQUIRED',403);
  assertSameOrigin(req);
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!session?.user_id||!session?.access_token)
   return answer(res,'EXACT_RECOVERY_SIGNED_IN_OWNER_REQUIRED',401);
  const db=resolveReliabilityBenchmarkDb();
  if(db?.strictSecrets!==true||
    db.project!==process.env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
    db.url!==session.config.url||
    typeof db.secretKey!=='string'||db.secretKey.length<25)
   throw Error('EXACT_RECOVERY_ISOLATED_SERVICE_SCOPE_REQUIRED');
  const current=await shiftRpc(db,
   'reality_read_general_original_recovery_review_v1',{
    p_owner_id:session.user_id});
  if(current?.status!=='GENERAL_ORIGINAL_EXACT_RECOVERY_PUBLICATION_REVIEW'||
    current.phase!=='READY_FOR_EXACT_RECOVERY_APPROVAL'||
    current.owner_approval_ready!==true||
    current.owner_approval_id!==null||
    current.production_changed!==false||
    current.original_job_completed!==false||
    !UUID.test(current.recovery_publication_id||'')||
    !UUID.test(current.attempt_id||'')||
    !UUID.test(current.shift_id||'')||
    !WORK.test(current.original_work_id||'')||
    !SHA.test(current.candidate_commit_sha||'')||
    !SHA.test(current.expected_parent_commit_sha||'')||
    !HASH.test(current.candidate_artifact_sha256||'')||
    !Number.isSafeInteger(current.independent_recovery_test_run_id)||
    current.independent_recovery_test_run_id<10001||
    !SHA.test(current.proof_commit_sha||''))
   return answer(res,'EXACT_RECOVERY_INDEPENDENT_RELEASE_NOT_READY',409);
  const b=req.body;
  if(!b||typeof b!=='object'||Array.isArray(b)||
    Object.getPrototypeOf(b)!==Object.prototype||
    Object.keys(b).sort().join(',')!==
     'artifact_sha256,attempt_id,candidate_commit_sha,expected_parent_sha,intent,original_work_id,recovery_publication_id,request_id'||
    b.recovery_publication_id!==current.recovery_publication_id||
    b.original_work_id!==current.original_work_id||
    b.attempt_id!==current.attempt_id||
    b.candidate_commit_sha!==current.candidate_commit_sha||
    b.artifact_sha256!==current.candidate_artifact_sha256||
    b.expected_parent_sha!==current.expected_parent_commit_sha||
    b.intent!==INTENT||!UUID.test(b.request_id||''))
   return answer(res,'EXACT_RECOVERY_SINGLE_ARTIFACT_CLICK_REQUIRED',403);
  const response=await fetch(db.url+
   '/rest/v1/rpc/reality_owner_approve_general_original_recovery_v1',{
    method:'POST',cache:'no-store',redirect:'error',
    signal:AbortSignal.timeout(16000),
    headers:{apikey:session.config.key,
     authorization:'Bearer '+session.access_token,
     'content-type':'application/json',accept:'application/json'},
    body:JSON.stringify({
     p_recovery_publication_id:b.recovery_publication_id,
     p_original_work_id:b.original_work_id,p_attempt_id:b.attempt_id,
     p_candidate_commit_sha:b.candidate_commit_sha,
     p_artifact_sha256:b.artifact_sha256,
     p_expected_parent_sha:b.expected_parent_sha,
     p_intent:INTENT,p_request_id:b.request_id
    })
   });
  if(!response.ok)return answer(res,
   'RECOVERY_APPROVAL_PROVIDER_RESULT_UNCERTAIN_CHECK_READBACK',409,{
    retry_owner_approval:false});
  const receipt=await response.json().catch(()=>null);
  if(receipt?.status!=='ONE_EXACT_RECOVERY_PUBLICATION_OWNER_APPROVED'||
    receipt.recovery_publication_id!==current.recovery_publication_id||
    receipt.original_work_id!==current.original_work_id||
    receipt.shift_id!==current.shift_id||
    !UUID.test(receipt.owner_approval_id||'')||
    receipt.source_installed!==false||
    receipt.original_job_completed!==false||
    receipt.production_changed!==false||
    receipt.no_third_confirmation!==true)
   return answer(res,'RECOVERY_APPROVAL_RECEIPT_NOT_VERIFIED',503,{
    retry_owner_approval:false});
  return answer(res,'ACCEPTED',202,{
   recovery_publication_id:receipt.recovery_publication_id,
   original_work_id:receipt.original_work_id,
   approval_id:receipt.owner_approval_id,
   approval_recorded:true,one_use_recovery_authorized:true,
   next_gate:'EXACT_RECOVERY_SOURCE_PUBLICATION_THEN_ORIGINAL_SETTLEMENT',
   no_third_confirmation:true,retry_owner_approval:false});
 }catch{
  return answer(res,'EXACT_RECOVERY_OWNER_AUTHORITY_UNVERIFIED',503,{
   retry_owner_approval:false});
 }
}
