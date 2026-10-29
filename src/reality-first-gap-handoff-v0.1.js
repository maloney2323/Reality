// First real owner challenge: turn observed independent Github CI evidence into
// an immutable, scoped build ticket. This file does NOT generate a candidate,
// dispatch work, grant approval, or claim a capability was installed.
// Trusted callers must obtain the owner's current goal and durable checkpoint
// from the authenticated server; never forward caller-provided evidence as truth.
import {createHash} from 'node:crypto';
import {createFoundationalBuildTicket,runFoundationalGenerationSandboxLoop}
 from './reality-foundational-build-loop-v1.0.js';

export const REALITY_FIRST_GAP_HANDOFF_VERSION='reality-first-gap-handoff-v0.1';
export const FIRST_GAP_PROOF=Object.freeze({
 repository:'maloney2323/Reality',
 issue_number:178,
 run_id:40962921090,
 run_head_sha:'6e6014f38f9fea382ea93b38418ec77e9158c1ef',
 head_branch:'proof/first-self-upgrade-red-contract-20261029',
 workflow_path:'.github/workflows/reality-first-customer-self-upgrade-red-v1.yml',
 job_name:'frozen-customer-acceptance',
 manifest_path:'test/reality-frozen-regressions/first-ci-evidence-gap-v1.json',
 manifest_ref:'first-ci-evidence-gap-v1',
 manifest_sha256:'7d0c6aee561c6e6ca4360f80789574b9c11f26729f575858861e18ce647cd4be',
 missing_source:'src/reality-extensions/reality-ci-failure-evidence.mjs',
 frozen_test:'test/reality-frozen-regressions/first-reality-ci-evidence-gap.test.js',
});
const WORK=/^work:[a-f0-9]{32}$/;
const SHA40=/^[a-f0-9]{40}$/;
const SHA64=/^[a-f0-9]{64}$/;
const fail=(code)=>{throw Error('FIRST_GAP_'+code);};
const hex=s=>createHash('sha256').update(s).digest('hex');
const canonical=x=>x===null||typeof x!=='object'?x:Array.isArray(x)?
 x.map(canonical):Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])]));
const digest=x=>hex(JSON.stringify(canonical(x)));
function strictScope(s){
 if(!s||typeof s!=='object'||!s.owner_id||!s.goal_id||
   !WORK.test(s.original_work_id||'')||
   !s.continuity_root_id||!s.worldline_id||
   !s.goal_transition_receipt_ref||!s.goal_evidence_ref||
   s.environment!=='ISOLATED_PREVIEW'||s.user_confirmed!==true||
   s.owner_session_verified!==true||s.goal_current_verified!==true||
   s.original_issue_number!==FIRST_GAP_PROOF.issue_number)
  fail('OWNER_WORK_SCOPE_NOT_VERIFIED');
}
function evidence(result){
 return Object.freeze({version:REALITY_FIRST_GAP_HANDOFF_VERSION,
  status:'INDEPENDENT_CI_MISSING_CAPABILITY_OBSERVED',
  ...result,model_generated:false,sandbox_verified:false,
  installation_authorized:false,capability_installed:false,
  original_job_resumed:false,original_job_settled:false,
  production_changed:false});
}
// Provider inputs must be fetched from pinned URLs by the trusted adapter.
// Run, job, and logs are not user/model text. The failure log alone cannot
// establish owner permission or prove the full work is finished.
export function attestFirstGapProviderSnapshot({
 run,jobs,log,manifest,scope,
}={}){
 strictScope(scope);
 const p=FIRST_GAP_PROOF;
 if(run?.id!==p.run_id||run?.head_sha!==p.run_head_sha||
  run?.head_branch!==p.head_branch||run?.path!==p.workflow_path||
  run?.event!=='push'||run?.status!=='completed'||run?.conclusion!=='failure'||
  run?.html_url!=='https://github.com/'+p.repository+'/actions/runs/'+p.run_id||
  run?.repository?.full_name!==p.repository)
  fail('PINNED_RUN_NOT_VERIFIED');
 if(!Array.isArray(jobs)||jobs.length<1||jobs.length>100)
  fail('PROVIDER_JOB_LIST_INVALID');
 const matches=jobs.filter(j=>j.name===p.job_name&&j.run_id===p.run_id&&
  j.head_sha===p.run_head_sha&&j.status==='completed'&&
  j.conclusion==='failure'&&Number.isSafeInteger(j.id)&&j.id>0);
 if(matches.length!==1)fail('UNIQUE_FAILED_JOB_REQUIRED');
 const job=matches[0], steps=job.steps||[];
 if(!steps.some(x=>x.name==='Independently check the constitutional baseline'&&
     x.conclusion==='success')||
    !steps.some(x=>x.name?.startsWith('Frozen customer acceptance')&&
     x.conclusion==='failure'))
  fail('FROZEN_FAILURE_STEP_NOT_INDEPENDENT');
 if(typeof log!=='string'||log.length<100||log.length>800000||
    !log.includes('ERR_MODULE_NOT_FOUND')||
    !log.includes(p.missing_source)||
    !log.includes(p.frozen_test)||
    !/# pass 26(?:\r?\n|\b)/.test(log)||
    !/# fail 0(?:\r?\n|\b)/.test(log)||
    !/# fail 1(?:\r?\n|\b)/.test(log))
  fail('EXACT_MISSING_EXTENSION_NOT_PROVEN');
 if(typeof manifest!=='string'||hex(manifest)!==p.manifest_sha256)
  fail('FROZEN_MANIFEST_HASH_CHANGED');
 let m;try{m=JSON.parse(manifest)}catch{fail('MANIFEST_INVALID')}
 if(m?.manifest_ref!==p.manifest_ref||
    !Array.isArray(m.tests)||m.tests.length!==2||
    !m.tests.includes(p.frozen_test)||
    !m.tests.includes('test/reality-governed-self-improvement-spine-v1.0.test.js'))
  fail('FROZEN_MANIFEST_SCOPE_INVALID');
 const link={
  original_work_id:scope.original_work_id,
  goal_id:scope.goal_id,owner_id:scope.owner_id,
  owner_goal_transition_receipt_ref:scope.goal_transition_receipt_ref,
  run_id:p.run_id,job_id:job.id,run_sha:p.run_head_sha,
  run_url:run.html_url,manifest_sha256:p.manifest_sha256,
  error:'ERR_MODULE_NOT_FOUND',missing_source:p.missing_source,
  log_sha256:hex(log),
 };
 return evidence({
  ...link,source_kind:'GITHUB_ACTIONS_PINNED_PROVIDER_READBACK',
  evidence_hash:digest(link),
  provider_receipt_ref:'github:actions:run:'+p.run_id+':job:'+job.id,
  verified_capability_gap:'reality.ci-failure-evidence-v1',
  generated_source_absent_in_failed_baseline:true,
 });
}

// No model is invoked before a *separate, durable* Continuity receipt links
// the provider observation to the current original owner/goal/worldline.
// This requires a real authenticated Reality work ID, NOT the fixture 'work:e...'.
export async function admitFirstGapBuildTicket({
 scope,providerEvidence,persistGap,readBackGap,
}={}){
 strictScope(scope);
 if(providerEvidence?.status!=='INDEPENDENT_CI_MISSING_CAPABILITY_OBSERVED'||
  providerEvidence.original_work_id!==scope.original_work_id||
  providerEvidence.goal_id!==scope.goal_id||
  providerEvidence.owner_id!==scope.owner_id||
  providerEvidence.run_id!==FIRST_GAP_PROOF.run_id||
  providerEvidence.run_sha!==FIRST_GAP_PROOF.run_head_sha||
  providerEvidence.manifest_sha256!==FIRST_GAP_PROOF.manifest_sha256||
  !SHA64.test(providerEvidence.evidence_hash||'')||
  !SHA64.test(providerEvidence.log_sha256||'')||
  providerEvidence.model_generated!==false||
  providerEvidence.installation_authorized!==false)
  fail('PROVIDER_GAP_SCOPE_MISMATCH');
 if(typeof persistGap!=='function'||typeof readBackGap!=='function')
  fail('DURABLE_CONTINUITY_ADAPTER_REQUIRED');
 const write=await persistGap(Object.freeze({
  owner_id:scope.owner_id,goal_id:scope.goal_id,
  original_work_id:scope.original_work_id,worldline_id:scope.worldline_id,
  evidence_hash:providerEvidence.evidence_hash,
  provider_receipt_ref:providerEvidence.provider_receipt_ref,
 }));
 if(write?.committed!==true||!write?.receipt_id)fail('GAP_NOT_COMMITTED');
 const read=await readBackGap(Object.freeze({
  owner_id:scope.owner_id,goal_id:scope.goal_id,
  original_work_id:scope.original_work_id,receipt_id:write.receipt_id,
 }));
 if(read?.receipt_id!==write.receipt_id||
    read?.verified!==true||read?.source==='MODEL_CLAIM'||
    read?.owner_id!==scope.owner_id||read?.goal_id!==scope.goal_id||
    read?.original_work_id!==scope.original_work_id||
    read?.worldline_id!==scope.worldline_id||
    read?.evidence_hash!==providerEvidence.evidence_hash||
    read?.provider_receipt_ref!==providerEvidence.provider_receipt_ref)
   fail('GAP_CONTINUITY_READBACK_MISMATCH');
 const ticket=createFoundationalBuildTicket({
  owner_id:scope.owner_id,goal_id:scope.goal_id,
  goal_transition_receipt_ref:scope.goal_transition_receipt_ref,
  goal_evidence_ref:scope.goal_evidence_ref,
  original_work_id:scope.original_work_id,
  continuity_root_id:scope.continuity_root_id,
  worldline_id:scope.worldline_id,
  confirmed_gap_receipt_ref:write.receipt_id,
  confirmed_gap_evidence_hash:providerEvidence.evidence_hash,
  confirmed_gap_source:'INDEPENDENT_PROVIDER_READBACK',
  frozen_regression_manifest_ref:FIRST_GAP_PROOF.manifest_ref,
  frozen_regression_sha256:FIRST_GAP_PROOF.manifest_sha256,
  repository_base_sha:FIRST_GAP_PROOF.run_head_sha,
  environment:'ISOLATED_PREVIEW',max_attempts:3,
  allowed_source_roots:['src/reality-extensions/','test/reality-extensions/'],
 });
 return Object.freeze({ticket,
  proof:'OWNER_SCOPED_PROVIDER_GAP_DURABLY_READ_BACK',
  model_generated:false,installation_authorized:false,
  original_job_completed:false});
}

// The trusted runner supplies REAL model, independently isolated sandbox,
// attestation and persisted-checkpoint adapters. Never accept from the browser.
export async function generateAfterTrustedGap({
 admitted,adapters,
}={}){
 if(admitted?.proof!=='OWNER_SCOPED_PROVIDER_GAP_DURABLY_READ_BACK'||
  admitted?.ticket?.version!=='reality-foundational-build-loop-v1.0'||
  admitted?.ticket?.original_work_id==null)
  fail('NO_TRUSTED_TICKET');
 const result=await runFoundationalGenerationSandboxLoop({
  ticket:admitted.ticket,adapters,
 });
 if(result?.status!=='AWAITING_EXACT_OWNER_APPROVAL')
  return Object.freeze({...result,installation_authorized:false,
   original_job_completed:false});
 return Object.freeze({...result,installation_authorized:false,
  capability_installed:false,original_job_completed:false,
  production_changed:false});
}
