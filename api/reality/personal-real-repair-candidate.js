// Authenticated, read-only exact source proposal or owner-previously-authorized
// investigation checkpoint preparation. Cannot grant installation approval.
import {privateChatConfig,authenticatedChatSession,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {listAuthenticatedUnfinishedWork}
 from '../../src/reality-personal-unfinished-work-v0.1.js';
import {readExactModelRepairEvidence}
 from '../../src/reality-real-verified-repair-readback-v1.0.js';
import {prepareVerifiedOwnerRepairCandidate}
 from '../../src/reality-owner-repair-candidate-admission-v1.0.js';
import {verifyApprovedBackgroundReadiness}
 from '../../src/reality-approved-repair-background-readiness-v1.0.js';
export const maxDuration=150;
const WORK=/^work:[a-f0-9]{32}$/;
const fail=x=>{throw Error('REAL_REPAIR_CANDIDATE_'+x)};
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 try{
  privateChatConfig();
  if(!['GET','POST'].includes(req.method)){
   res.setHeader('Allow','GET, POST');
   return res.status(405).json({ok:false,error:'REAL_REPAIR_CANDIDATE_METHOD_REJECTED'});
  }
  const session=await authenticatedChatSession(req,res);
  if(!session)return res.status(401).json({ok:false,error:'CHAT_SIGN_IN_REQUIRED'});
  let originalWorkId,issueNumber;
  if(req.method==='GET'){
   if(Object.keys(req.query||{}).length)
    return res.status(400).json({ok:false,error:'REAL_REPAIR_CANDIDATE_NO_CLIENT_SCOPE'});
   const found=await listAuthenticatedUnfinishedWork({session});
   const jobs=(found.jobs||[]).filter(j=>j.state==='REAL_SOURCE_BACKED_REPAIR_PENDING'&&
    j.goal_still_current===true&&WORK.test(String(j.original_work_id||''))&&
    /^https:\/\/github\.com\/maloney2323\/Reality\/issues\/[1-9][0-9]*$/.test(String(j.issue_url||'')));
   if(!jobs.length)return res.status(200).json({
    ok:true,status:'NO_SIGNED_OWNER_REPAIR_WORK_AWAITING_INSTALL',
    installation_authorized:false,original_job_completed:false});
   const job=jobs[0];originalWorkId=job.original_work_id;
   issueNumber=Number(job.issue_url.split('/').at(-1));
  }else{
   if(!req.headers?.origin)
    return res.status(403).json({ok:false,error:'REAL_REPAIR_CANDIDATE_ORIGIN_REQUIRED'});
   assertSameOrigin(req);
   if(!String(req.headers?.['content-type']||'').includes('application/json'))
    return res.status(415).json({ok:false,error:'REAL_REPAIR_CANDIDATE_JSON_REQUIRED'});
   const b=req.body;
   if(!b||typeof b!=='object'||Array.isArray(b)||
    Object.keys(b).sort().join(',')!==
     'candidate_artifact_hash,expected_original_work_id,intent,issue_number'||
    b.intent!=='PREPARE_EXISTING_VERIFIED_CANDIDATE_FOR_OWNER_REVIEW'||
    !WORK.test(String(b.expected_original_work_id||''))||
    !Number.isSafeInteger(b.issue_number)||b.issue_number<1||
    !/^[a-f0-9]{64}$/.test(String(b.candidate_artifact_hash||'')))
    return res.status(403).json({ok:false,error:'REAL_REPAIR_CANDIDATE_EXACT_OWNER_REVIEW_REQUIRED'});
   originalWorkId=b.expected_original_work_id;
   issueNumber=b.issue_number;
  }
  const proof=await readExactModelRepairEvidence({issueNumber});
  if(proof.independently_verified!==true)
   fail('GITHUB_ORIGINAL_CANDIDATE_UNVERIFIED');
  if(req.method==='GET')return res.status(200).json({
   ok:true,status:'REAL_SOURCE_VERIFIED_OWNER_REVIEW_AVAILABLE',
   original_work_id:originalWorkId,issue_number:issueNumber,
   issue_url:proof.issue_url,candidate_artifact_hash:proof.candidate_artifact_sha256,
   source_files:proof.files.map(f=>f.path),
   model_response_ref:proof.model_response_id,
   original_provider_failed_run_id:proof.original_failed_run_id,
   independent_verification_run_id:proof.verified_sandbox_run_id,
   review_commit_sha:proof.review_commit_sha,
   independent_provider_readback:true,
   owner_installation_authorized:false,installed:false,
   original_job_completed:false,production_changed:false,
  });
  if(proof.candidate_artifact_sha256!==req.body.candidate_artifact_hash)
   fail('REVIEWED_CANDIDATE_BYTES_CHANGED');
  const ready=await prepareVerifiedOwnerRepairCandidate({
   session,expectedOriginalWorkId:originalWorkId,issueNumber,
  });
  if(ready.candidate_artifact_hash!==req.body.candidate_artifact_hash||
   ready.independent_readback_verified!==true)
   fail('CONSTITUTIONAL_CANDIDATE_CHECKPOINT_UNVERIFIED');
  const preflight=await verifyApprovedBackgroundReadiness();
  return res.status(200).json({ok:true,...ready,
   background_preflight_passed:preflight.ready===true,
   background_preflight_status:preflight.code,
  });
 }catch(error){
  const code=String(error?.message||'');
  return res.status(error?.status||503).json({
   ok:false,error:/^(?:REAL_OWNER_CANDIDATE_|REAL_REPAIR_READBACK_|REAL_REPAIR_CANDIDATE_|GENERAL_CHECKPOINT_)[A-Z0-9_]{4,140}$/.test(code)?
    code:'REAL_REPAIR_CANDIDATE_INDEPENDENT_PROVIDER_RECONCILIATION_REQUIRED',
   installation_authorized:false,original_job_completed:false,
   production_changed:false,
  });
 }
}
