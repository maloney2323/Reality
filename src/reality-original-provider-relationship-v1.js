// Source-bound, read-only provider relationship verification for a historical
// Reality job. The overall GitHub run may be failed while the two exact
// continuation/settlement jobs both succeeded. Never infer a digest or success.
const SHA256=/^sha256:[a-f0-9]{64}$/;
const REPO='maloney2323/Reality';
const BRANCH='feature/reality-general-capability-engine-20261101';
export function verifyReconciliationProviderEvidence(originalProvider,run,jobs,artifacts){
 const deny=()=>{throw Error('REALITY_RECONCILIATION_INDEPENDENT_PROVIDER_RELATIONSHIP_UNVERIFIED')};
 if(!originalProvider||!Number.isSafeInteger(originalProvider.run_id)||
  originalProvider.run_id<1||!run||run.id!==originalProvider.run_id||
  run.status!=='completed'||run.head_branch!==BRANCH||
  run.head_repository?.full_name!==REPO||
  run.conclusion!==originalProvider.run_conclusion||
  run.status!==originalProvider.run_status||
  !Array.isArray(jobs?.jobs)||!Array.isArray(artifacts?.artifacts))deny();
 const required=['resume_original_job','record_independent_original_settlement'];
 for(const name of required){
  const found=jobs.jobs.filter(j=>j.name===name&&
    j.status==='completed'&&j.conclusion==='success'&&
    j.run_id===run.id);
  if(found.length!==1)deny();
 }
 const unrelatedFailure=jobs.jobs.some(j=>j.status==='completed'&&
  j.conclusion==='failure'&&j.run_id===run.id&&
  !required.includes(j.name));
 if(run.conclusion==='failure'&&!unrelatedFailure)deny();
 if(!['success','failure'].includes(run.conclusion))deny();
 const name='reality-original-final-settlement-'+run.id;
 const proof=artifacts.artifacts.filter(a=>a.name===name&&
  a.expired===false&&SHA256.test(String(a.digest||'')));
 if(proof.length!==1)deny();
 return Object.freeze({...originalProvider,
  resume_job_success:true,settlement_job_success:true,
  unrelated_job_failure_verified:unrelatedFailure,
  settlement_artifact_digest:proof[0].digest.slice('sha256:'.length)});
}
