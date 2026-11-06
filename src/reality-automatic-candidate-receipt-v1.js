// Evidence-only projection of independent GitHub Actions candidate verification.
// Creating/reading this receipt never creates an owner job or grants installation.
import {createHash} from 'node:crypto';
const fail=x=>{throw Error('REALITY_AUTO_RECEIPT_'+x)};
const sha=/^[a-f0-9]{64}$/,commit=/^[a-f0-9]{40}$/;
const repo='maloney2323/Reality';
export function createAutomaticCandidateReceipt({
 run,artifacts,expectedRunId,expectedSourceSha256,
 expectedProposalDigest,expectedVerifierDigest,
 expectedTests,ownerScopeVerified=false,
}={}){
 if(!Number.isSafeInteger(expectedRunId)||expectedRunId<1||
  !sha.test(expectedSourceSha256)||!sha.test(expectedProposalDigest)||
  !sha.test(expectedVerifierDigest)||!Number.isSafeInteger(expectedTests)||
  expectedTests<1||ownerScopeVerified!==true||
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

export function independentlyReadBackReleasedCandidate({
 candidateReceipt, ownerReadback, expectedVerifierReportSha256,
}={}){
 if(candidateReceipt?.schema!=='reality-automatic-verified-candidate-receipt-v1'||
   candidateReceipt.status!=='VERIFIED_CANDIDATE_SOURCE_OBSERVED'||
   candidateReceipt.installation_authorized!==false||
   !sha.test(expectedVerifierReportSha256)||
   ownerReadback?.schema!=='reality-owner-released-capability-receipts-v1'||
   ownerReadback.owner_work_authorized_by_receipts!==false||
   ownerReadback.installation_authorized!==false||
   ownerReadback.production_changed!==false||
   !Array.isArray(ownerReadback.receipts)||ownerReadback.receipts.length>20)
   fail('DURABLE_OWNER_RELEASE_READBACK_REQUIRED');
 const found=ownerReadback.receipts.filter(r=>
   r.receipt_id===candidateReceipt.receipt_id);
 if(found.length!==1)fail('DURABLE_RECEIPT_NOT_UNIQUE');
 const r=found[0];
 if(r.status!=='RELEASED_VERIFIED_PROVIDER_EVIDENCE'||
   r.durable_readback_verified!==true||
   r.receipt_id!==candidateReceipt.receipt_id||
   r.source_issue!==candidateReceipt.source_issue||
   r.source_sha256!==candidateReceipt.source_sha256||
   r.provider_run_id!==candidateReceipt.provider_run_id||
   r.verified_checks_passed!==candidateReceipt.verification_checks_passed||
   r.verifier_archive_sha256!==candidateReceipt.independent_verification_archive_sha256||
   r.verifier_report_sha256!==expectedVerifierReportSha256||
   r.owner_work_binding_verified!==false||
   r.installation_authorized!==false||r.installed!==false||
   r.original_job_settled_by_this_receipt!==false||
   r.production_changed!==false||
   typeof r.released_at!=='string'||!Number.isFinite(Date.parse(r.released_at)))
   fail('DURABLE_RECEIPT_SOURCE_OR_AUTHORITY_MISMATCH');
 return Object.freeze({
   ...candidateReceipt,
   status:'INDEPENDENTLY_VERIFIED_AND_DURABLY_RELEASED',
   durable_release_readback_verified:true,
   durable_release_at:r.released_at,
   record_is_immutable:true,
   new_owner_job_created:false,owner_work_authorized:false,
   installation_authorized:false,installed:false,
   original_job_settled_by_candidate:false,production_changed:false,
 });
}
