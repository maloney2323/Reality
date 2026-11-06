// Authenticated, preview-only, READ-ONLY candidate review.
// Never rewrites an already settled original job and never exposes an
// approval button for a candidate not qualified into an owner's new work.
import {authenticatedChatSession,privateChatConfig}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {resolveReliabilityBenchmarkDb}
 from '../../src/reality-reliability-db-boundary-v0.1.js';
import {createAutomaticCandidateReceipt,independentlyReadBackReleasedCandidate}
 from '../../src/reality-automatic-candidate-receipt-v1.js';
import {projectDiscoveryEconomicContext}
 from '../../src/reality-discovery-value-v1.js';
const REPO='maloney2323/Reality';
const ID=41547631404;
const HISTORICAL='work:1eecc0d71b21492e0cfdd527f9c257f3';
const SOURCE='d084f46d840027acd412b67fceb1636fd35a64f2cc08b9ebb6666d470d1af43d';
const PROPOSAL_ARCHIVE='sha256:a15f718461a9af61663f10797088df28abac312bf338269bb16b16f6cd0122b4';
const VERIFIER_ARCHIVE='sha256:166309eddaef9878341871551283989b5da0d612ebb799d2647d8163d8250bdd';
const VERIFIER_REPORT='cc51acf1bee7f88e7e8e49cb586dd325a5ccb0aa1ee8f5a6406d7580e31d67ae';
async function provider(path){
 const response=await fetch('https://api.github.com/repos/'+REPO+path,{
  method:'GET',cache:'no-store',redirect:'error',headers:{
   accept:'application/vnd.github+json',
   'x-github-api-version':'2022-11-28',
   'user-agent':'Reality-independent-owner-uninstalled-proposal-review-v1',
   ...(String(process.env.REALITY_BUILDER_DISPATCH_GITHUB_TOKEN||'').length>20?
      {authorization:'Bearer '+process.env.REALITY_BUILDER_DISPATCH_GITHUB_TOKEN}:{})}});
 if(!response.ok)throw Error('PROVIDER_PROPOSAL_READBACK_FAILED');
 return response.json();
}
export const maxDuration=45;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 try{
  privateChatConfig();
  if(req.method!=='GET'||Object.keys(req.query||{}).length)
   return res.status(405).json({ok:false,error:'REVIEW_ONLY_NO_CLIENT_SCOPE'});
  const session=await authenticatedChatSession(req,res);
  if(!session)return res.status(401).json({ok:false,error:'CHAT_SIGN_IN_REQUIRED'});
  const report=await verifiedOwnerCandidateReview(session);
  return res.status(200).json(report);
 }catch{
  return res.status(503).json({ok:false,
   error:'EXACT_PROPOSAL_OWNER_REVIEW_NOT_INDEPENDENTLY_AVAILABLE',
   owner_approval_issued:false,installation_performed:false,
   original_job_completed:false,production_changed:false});
 }
}

// Shared source of truth for both on-screen receipt and authenticated PDF export.
export async function verifiedOwnerCandidateReview(session){
 if(!session?.user_id||!session?.config?.url)
  throw Error('RECEIPT_AUTHENTICATED_OWNER_SCOPE_REQUIRED');
  const db=resolveReliabilityBenchmarkDb();
  if(process.env.VERCEL_ENV!=='preview'||
   process.env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF!=='hvkfreoagbrphwghjajw'||
   !db?.strictSecrets||!db.secretKey||
   db.url!==session.config.url||db.project!=='hvkfreoagbrphwghjajw')
   throw Error('ISOLATED_OWNER_REVIEW_PROJECT_MISMATCH');
  const [run,artifacts,old,released]=await Promise.all([
   provider('/actions/runs/'+ID),
   provider('/actions/runs/'+ID+'/artifacts?per_page=30'),
   fetch(db.url+'/rest/v1/rpc/reality_read_owner_genuine_loop_v1',{
    method:'POST',cache:'no-store',redirect:'error',headers:{
     apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
     'content-type':'application/json',accept:'application/json'},
    body:JSON.stringify({p_owner_id:session.user_id})}),
   fetch(db.url+'/rest/v1/rpc/reality_read_owner_released_capability_receipts_v1',{
    method:'POST',cache:'no-store',redirect:'error',headers:{
     apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
     'content-type':'application/json',accept:'application/json'},
    body:JSON.stringify({p_owner_id:session.user_id})})
  ]);
  if(!old.ok||!released.ok)throw Error('OWNER_RECEIPT_DURABLE_READBACK_UNAVAILABLE');
  const owner=await old.json();
  if(run.id!==ID||run.status!=='completed'||run.conclusion!=='success'||
    run.head_repository?.full_name!==REPO||
    run.head_branch!=='feature/reality-general-capability-engine-20261101'||
    !Array.isArray(artifacts.artifacts)||
    !artifacts.artifacts.some(a=>a.name==='reality-customer-issue188-model-research-'+ID&&
      a.digest===PROPOSAL_ARCHIVE&&!a.expired)||
    !artifacts.artifacts.some(a=>a.name==='reality-customer-issue188-independent-sandbox-'+ID&&
      a.digest===VERIFIER_ARCHIVE&&!a.expired)||
    owner?.status!=='OWNER_GOVERNED_LOOP_READBACK'||!Array.isArray(owner.jobs)||
    owner.jobs.length>12||
    owner.jobs.some(x=>x.original_work_id===HISTORICAL&&
      x.phase!=='SETTLED_ISOLATED'&&x.phase!=='SETTLED'))
   throw Error('PROPOSAL_OR_HISTORICAL_GUARD_READBACK_FAILED');
  const sourceReceipt=createAutomaticCandidateReceipt({
   run,artifacts,expectedRunId:ID,expectedSourceSha256:SOURCE,
   expectedProposalDigest:PROPOSAL_ARCHIVE.slice('sha256:'.length),
   expectedVerifierDigest:VERIFIER_ARCHIVE.slice('sha256:'.length),
   expectedTests:21,ownerScopeVerified:owner.status==='OWNER_GOVERNED_LOOP_READBACK'&&
    Array.isArray(owner.jobs),
  });
  const ownerReleased=await released.json();
  const automaticReceipt=independentlyReadBackReleasedCandidate({
   candidateReceipt:sourceReceipt,
   ownerReadback:ownerReleased,
   expectedVerifierReportSha256:VERIFIER_REPORT,
  });
  const economicRows=ownerReleased.receipts.filter(x=>
   x.receipt_id===automaticReceipt.receipt_id);
  if(economicRows.length!==1)throw Error('RECEIPT_VALUE_EVIDENCE_NOT_UNIQUE');
  const discoveryValue=projectDiscoveryEconomicContext({
   candidateReceipt:automaticReceipt,
   ownerEconomicReadback:economicRows[0],
  });
  const all=owner.jobs.filter(x=>x.capability_id==='reality-general-execution-receipt');
  const active=all.filter(x=>x.phase==='AWAITING_OWNER_APPROVAL'&&x.candidate_verified===true);
  if(active.length>1)throw Error('CANDIDATE_OWNER_REVIEW_AMBIGUOUS_ACTIVE_WORK');
  const fresh=active.length===1?Object.freeze({
   original_work_id:active[0].original_work_id,
   status:'AWAITING_OWNER_APPROVAL',
   independently_verified:true,
   artifact_is_distinct_from_earlier_21_check_receipt:true,
   owner_approval_issued:false,production_changed:false
  }):null;
  // Even with an existing qualified *different* candidate, this specific
  // uninstalled proposal is not automatically bound to it.
  return ({
   ok:true,status:'HARDENED_SOURCE_VERIFIED_NOT_OWNER_WORK_BOUND',
   automatic_candidate_receipt:automaticReceipt,
   discovery_value:discoveryValue,
   proposal_title:'Independent execution-receipt verification upgrade',
   issue_number:188,previous_owner_work_id:HISTORICAL,
   previous_owner_work_already_settled:true,
   source_sha256:SOURCE,independent_run_id:ID,
   independent_run_url:'https://github.com/'+REPO+'/actions/runs/'+ID,
   draft_review_url:'https://github.com/'+REPO+'/actions/runs/'+ID,
   independent_tests_passed:21,
   security_regressions_remaining:0,
   installed:false,qualified_for_owner_installation:false,
   owner_approval_issued:false,new_original_work_id:null,
   new_owner_work_binding_required:true,
   next_step:'CONFIRM_NEW_FOLLOWON_OWNER_WORK_AND_QUALIFY_EXACT_ARTIFACT',
   existing_qualified_other_candidates:active.length,
   new_job_scoped_candidate_review:fresh,
   external_action_performed:false,original_job_completed_by_this_review:false,
   production_changed:false
  });
}
