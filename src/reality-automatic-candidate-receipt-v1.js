// Evidence-only projection of independent GitHub Actions candidate verification.
// Creating/reading this receipt never creates an owner job or grants installation.
import {createHash} from 'node:crypto';
const fail=x=>{throw Error('REALITY_AUTO_RECEIPT_'+x)};
const sha=/^[a-f0-9]{64}$/,commit=/^[a-f0-9]{40}$/;
const repo='maloney2323/Reality';
export function createAutomaticCandidateReceipt({
 run,artifacts,expectedRunId,expectedSourceSha256,
 expectedProposalDigest,expectedVerifierDigest,
 expectedTests,ownerHistoricalScopeVerified=false,
}={}){
 if(!Number.isSafeInteger(expectedRunId)||expectedRunId<1||
  !sha.test(expectedSourceSha256)||!sha.test(expectedProposalDigest)||
  !sha.test(expectedVerifierDigest)||!Number.isSafeInteger(expectedTests)||
  expectedTests<1||ownerHistoricalScopeVerified!==true||
  run?.id!==expectedRunId||run?.status!=='completed'||
  run?.conclusion!=='success'||run?.head_repository?.full_name!==repo||
  run?.head_branch!=='feature/reality-general-capability-engine-20261101'||
  !commit.test(run?.head_sha)||!Array.isArray(artifacts?.artifacts))
  fail('INDEPENDENT_PROVIDER_AND_OWNER_SCOPE_REQUIRED');
 const prefix='reality-customer-issue188-';
 for(const [name,hash] of [
  [prefix+'model-research-'+expectedRunId,expectedProposalDigest],
  [prefix+'independent-sandbox-'+expectedRunId,expectedVerifierDigest],
 ]){
  const found=artifacts.artifacts.filter(a=>a.name===name&&
   a.digest==='sha256:'+hash&&a.expired===false);
  if(found.length!==1)fail('PINNED_VERIFIER_ARTIFACT_CHANGED');
 }
 const id='candidate-receipt:'+createHash('sha256')
  .update([repo,expectedRunId,run.head_sha,expectedSourceSha256,
    expectedProposalDigest,expectedVerifierDigest].join('|'))
  .digest('hex').slice(0,32);
 return Object.freeze({
  schema:'reality-automatic-verified-candidate-receipt-v1',
  receipt_id:id,
  evidence_kind:'PROVIDER_INDEPENDENT_CANDIDATE_VERIFICATION',
  source_issue:188,source_sha256:expectedSourceSha256,
  provider_run_id:expectedRunId,
  provider_run_url:'https://github.com/'+repo+'/actions/runs/'+expectedRunId,
  provider_repository_sha:run.head_sha,
  verification_checks_passed:expectedTests,
  proposal_archive_sha256:expectedProposalDigest,
  independent_verification_archive_sha256:expectedVerifierDigest,
  status:'VERIFIED_CANDIDATE_SOURCE_OBSERVED',
  saved_provider_artifact_receipt:true,
  new_owner_job_created:false,owner_work_authorized:false,
  exact_install_approval_ready:false,installation_authorized:false,
  installed:false,original_job_settled_by_candidate:false,
  production_changed:false,
 });
}
