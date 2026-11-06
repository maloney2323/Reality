// An actual new Reality model response is required to requalify a corrected
// missing capability. Never relabel a manually edited source as model-generated.
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createFoundationalBuildTicket,validateFoundationalCandidate}
 from '../src/reality-foundational-build-loop-v1.0.js';
import {createFoundationalModelGenerator}
 from '../src/reality-foundational-model-provider-v1.0.js';
const env=process.env;
const fail=x=>{throw Error('REALITY_201_MODEL_REQUALIFY_'+x)};
const sha=x=>createHash('sha256').update(x).digest('hex');
const branch='refs/heads/feature/reality-general-capability-engine-20261101';
const originalWork='work:bf17f1716f7c9550680d761e64f8b591';
const priorHash='943a1bc15cbce950bb56c4addb3f0a4d72ed9ed70eb06068b7a6083c77fec9d1';
const originalFrozen='03480c22c0ad896e732b5782c7f4edd9d0576c34dec42a2911db90c63dd31fe9';
const corrected='evidence/reality-201-corrected-candidate/reality-continuity-settlement-reconciler.mjs';
const correctionHash='f2b7c67b658f743c975728f89d9e750ed8a84d815f1f93d7ec32ecf5d32f2dd8';
if(env.GITHUB_ACTIONS!=='true'||env.GITHUB_EVENT_NAME!=='push'||
 env.GITHUB_REF!==branch||env.GITHUB_REPOSITORY!=='maloney2323/Reality'||
 !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA||''))
 fail('PINNED_SIGNED_ISOLATED_WORKFLOW_REQUIRED');
const previous=JSON.parse(readFileSync('previous/genuine-capability-model-proposal.json','utf8'));
const {version,ticket_hash,...oldInput}=previous.ticket||{};
const oldTicket=createFoundationalBuildTicket(oldInput);
const oldCandidate=validateFoundationalCandidate(oldTicket,previous.candidate);
if(previous.source!=='REAL_OPENAI_MODEL_GENERATION'||
 oldTicket.ticket_hash!==ticket_hash||
 oldTicket.original_work_id!==originalWork||
 oldCandidate.artifact_sha256!==priorHash||
 !/^resp_[A-Za-z0-9_-]{12,160}$/.test(oldCandidate.model_response_id)||
 previous.installation_authorized!==false||
 sha(readFileSync(corrected))!==correctionHash||
 sha(readFileSync(oldTicket.frozen_test_path))!==originalFrozen||
 oldTicket.frozen_regression_sha256!==originalFrozen)
 fail('ORIGINAL_CANDIDATE_AND_FROZEN_SOURCE_INTEGRITY_REQUIRED');
if(typeof env.OPENAI_API_KEY!=='string'||env.OPENAI_API_KEY.length<16)
 fail('REAL_MODEL_CREDENTIAL_REQUIRED');
const get=async path=>{
 const r=await fetch('https://api.github.com/repos/maloney2323/Reality'+path,{
  cache:'no-store',redirect:'error',headers:{authorization:'Bearer '+env.GH_TOKEN,
  accept:'application/vnd.github+json','x-github-api-version':'2022-11-28'}});
 if(!r.ok)fail('INDEPENDENT_GITHUB_READBACK_'+r.status);
 return r.json();
};
const run=await get('/actions/runs/41486008820');
const jobs=await get('/actions/runs/41486008820/jobs?per_page=100');
const artifacts=await get('/actions/runs/41486008820/artifacts?per_page=100');
if(run?.status!=='completed'||run?.conclusion!=='success'||
 run?.head_sha!=='33daab3c94c23ccb5160216dd25caf757af59d05'||
 run?.head_repository?.full_name!=='maloney2323/Reality'||
 jobs?.jobs?.filter(j=>j.name==='prove-corrected-reconciler'&&j.conclusion==='success').length!==1||
 !artifacts?.artifacts?.some(a=>a.name==='reality-201-independent-corrected-holdout-41486008820'&&
 a.expired===false&&a.digest==='sha256:1df25cff81af1f0f22f34b741e76b764ee1f4933ca49c4c162fdb81802ea1224'))
 fail('REAL_PROVIDER_CORRECTION_ATTESTATION_MISSING');
const ticket=createFoundationalBuildTicket({
 ...oldInput,repository_base_sha:env.GITHUB_SHA,max_attempts:3});
const originalFrozenSource=readFileSync(ticket.frozen_test_path,'utf8');
const holdoutPath='test/reality-201-provider-backed-relationship-holdout-v1.test.js';
const holdoutSource=readFileSync(holdoutPath,'utf8');
const holdoutSha256=sha(holdoutSource);
const model=createFoundationalModelGenerator({
 model:env.REALITY_REPAIR_MODEL||'gpt-5.6',
 apiKey:env.OPENAI_API_KEY,
 readFrozenRegression:async t=>{
  if(t.ticket_hash!==ticket.ticket_hash)fail('NEW_TICKET_CHANGED');
  return {source:'GITHUB_PINNED_READ_ONLY_TEST_FILES',
   repository_base_sha:ticket.repository_base_sha,
   frozen_regression_sha256:originalFrozen,
   files:[
    {path:ticket.frozen_test_path,content:originalFrozenSource,
     sha256:originalFrozen},
    {path:holdoutPath,content:holdoutSource,sha256:holdoutSha256}
   ]};
 }
});
const feedback={
 kind:'INDEPENDENT_SANDBOX_FAILURE',
 attestation_ref:'github:actions:run:41486008820:prove-corrected-reconciler',
 artifact_sha256:oldCandidate.artifact_sha256,
 classification:'TEST_REGRESSION',
 log_excerpt:[
  'Independent actual customer evidence: original Universe event content hash is not the',
  'owner-approved installation artifact SHA256; approval, installation and settlement hashes',
  'must match each other, but need not match source event hash.',
  'The old original event can be an independently verified ancestor of the current',
  'Universe head, without being the current tip. Require an explicit proof of ancestry.',
  'GitHub original workflow run 41390537103 overall conclusion is failure, but',
  'both resume_original_job and record_independent_original_settlement succeeded.',
  'Require independent job-level readback, an unrelated failed job and original',
  'settlement artifact digest before accepting the run as settlement evidence.',
  'Preserve frozen tests unchanged; no installation or settlement authority.'
 ].join(' ')
};
const candidate=await model({
 ticket,attempt:2,previous_candidate:oldCandidate,
 verified_feedback:feedback,execution_authority:false});
if(candidate.model_response_id===oldCandidate.model_response_id||
 !/^resp_[A-Za-z0-9_-]{12,160}$/.test(candidate.model_response_id)||
 candidate.original_work_id!==originalWork||
 candidate.installed!==false||candidate.authority_granted!==false||
 candidate.artifact_sha256===priorHash||
 !candidate.files.some(f=>f.path===ticket.source_entrypoint))
 fail('FRESH_REALITY_MODEL_CORRECTION_RESPONSE_REQUIRED');
const proposal={
 ticket,candidate,source:'REAL_OPENAI_MODEL_GENERATION',
 correction_origin:'INDEPENDENT_REAL_PROVIDER_HOLDOUT_FAILURE',
 prior_model_response_id:oldCandidate.model_response_id,
 prior_artifact_sha256:priorHash,
 holdout_github_run_id:'41486008820',
 holdout_source_sha256:correctionHash,
 installation_authorized:false,original_job_completed:false,production_changed:false
};
mkdirSync('artifact',{recursive:true});
writeFileSync('artifact/genuine-capability-model-proposal.json',JSON.stringify(proposal,null,2)+'\n');
console.log('REALITY_201_FRESH_MODEL_REQUALIFICATION_PROPOSAL',JSON.stringify({
 original_work_id:originalWork,
 prior_artifact_sha256:priorHash,
 corrected_artifact_sha256:candidate.artifact_sha256,
 model_response_id:candidate.model_response_id,
 prior_model_response_id:oldCandidate.model_response_id,
 independent_real_provider_holdout_run:41486008820,
 installation_authorized:false,
 qualified_in_database:false,
 production_changed:false
}));
