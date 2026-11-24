import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {verifySourceBoundTechnicalRecoveryCi as verify}
 from '../src/reality-final-loop-technical-ci-evidence-verifier-v1.js';
const sha=x=>'sha256:'+x.repeat(64);
const source='https://github.com/maloney2323/Reality/pull/307';
const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const shift='ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce';
const obligation='work:315562fe1bd66b30a48bb9be4f1d162a';
const root='36f0ad48-f391-549f-8622-66cd493977e7';
const incident='b7181e5b-a01c-4cb2-b191-10dea9dbe04f';
const head='ef66038297480f5da9444072e5e79f5c59b27184';
const commit='d81f6c0e64360fc33d3d61668a2c84fc7c4e647b';
const id='reality-final-loop-recovery-case-specs/sample-case.json';
const diag='sha256:336e6cfc1ed67599d5478d32e9a5288034678cde90caa6e6e8f3fba17e365e0f';
const contractProposal={status:'RECOVERY_PROOF_CONTRACT_CANDIDATE_NEEDS_DURABLE_FREEZE',read_only:true,
 contract_candidate:{owner_id:owner,shift_id:shift,continuity_root_id:root,
  obligation_id:obligation,source_ref:source,source_revision:head,
  contract_id:sha('a'),ledger_freeze_verified:false}};
const existingCiRoute={status:'RECOVERY_REUSE_VERIFIED_CI_DIAGNOSTIC_FROZEN_CASE_SPEC_MISSING',
 owner_id:owner,shift_id:shift,obligation_id:obligation,source_ref:source,
 contract_id:sha('a'),maintenance_id:incident,
 existing_diagnostic_receipt_sha256:diag,
 prior_diagnostic_verified:true,repeat_prior_ci_dispatch_permitted:false,
 original_job_completed:false,installation_authorized:false,production_changed:false};
const db={project:'isolated',strictSecrets:true};
const env={VERCEL_ENV:'preview',REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'isolated',
 VERCEL_GIT_COMMIT_SHA:commit,
 VERCEL_GIT_COMMIT_REF:'feature/final-loop-governed-qualification-handoff-20261123',
 REALITY_BUILDER_DISPATCH_GITHUB_TOKEN:'test-github-token-with-adequate-length'};
const spec={
 schema:'reality-final-loop-sourcebound-frozen-recovery-v1',
 source_ref:source,source_head_sha:head,owner_id:owner,shift_id:shift,
 original_work_id:obligation,maintenance_id:incident,continuity_root_id:root,
 independent_prior_ci_diagnostic_receipt_sha256:diag,
 scope:'PR307_LINKED_TECHNICAL_RECOVERY_HANDOFF_ONLY',
 independently_verified_original_customer_admission:false,
 case_specific_original_business_red_proven:false,
 model_generated_verdict_allowed:false,original_job_completed:false,
 installation_authorized:false,production_changed:false,
 description:'test fixture for independent GitHub file content validation '+
 'and other source-bound recovery content verification controls'
};
const buf=Buffer.from(JSON.stringify(spec,null,2));
const gitsha=b=>createHash('sha1').update(Buffer.concat([
 Buffer.from('blob '+b.length+'\0'),b])).digest('hex');
function runtime({run={},jobs={},artifact={},caseSpec=spec,
 sourceBlob=null,unauthorized=false}={}){
 const body=Buffer.from(JSON.stringify(caseSpec,null,2));
 const blob=sourceBlob||gitsha(body);
 const paths=[];
 const headSha=run.head_sha||commit;
 const normalizedRun={
  id:100019,head_sha:headSha,head_branch:env.VERCEL_GIT_COMMIT_REF,
  name:'Reality shared Continuity and independent verifier handoff acceptance',
  path:'.github/workflows/reality-shared-continuity-verifier-handoff-v1.yml',
  repository:{full_name:'maloney2323/Reality'},event:'push',
  status:'completed',conclusion:'success',...run};
 const normalizedJob={
  id:200020,run_id:normalizedRun.id,head_sha:headSha,
  name:'prove-cross-layer-continuity',status:'completed',conclusion:'success',
  steps:[
   {name:'Execute genuine historical RED and corrected GREEN for source-bound technical blocker',conclusion:'success'},
   {name:'Preserve case-specific RED and GREEN proof as CI artifact only',conclusion:'success'}
  ],...jobs};
 const normalizedArtifact={
  id:300030,name:'reality-final-loop-technical-recovery-frozen-red-green',
  digest:sha('f'),expired:false,size_in_bytes:1415,
  workflow_run:{id:normalizedRun.id,head_sha:headSha},...artifact};
 const fetchImpl=async(url,opts)=>{
  assert.equal(opts.method,'GET');
  assert.equal(opts.redirect,'error');
  assert.ok(opts.headers.authorization.startsWith('Bearer test-github-'));
  const path=new URL(url).pathname;
  paths.push(path);
  if(unauthorized)return {ok:false,status:403};
  let value;
  if(path.endsWith('/runs')&&path.includes('/actions/workflows/')){
   value={workflow_runs:[normalizedRun]};
  }else if(path.endsWith('/contents/reality-final-loop-recovery-case-specs')){
   value=[{type:'file',name:'sample-case.json',path:id,sha:blob}];
  }else if(path.endsWith('/contents/'+id)){
   value={path:id,sha:blob,size:body.length,encoding:'base64',
    content:body.toString('base64')};
  }else if(path.endsWith('/jobs'))value={jobs:[normalizedJob]};
  else if(path.endsWith('/artifacts'))value={artifacts:[normalizedArtifact]};
  else throw Error('unexpected provider request '+path);
  return {ok:true,json:async()=>value};
 };
 return {paths,fetchImpl};
}
const args=(fetchImpl,more={})=>({db,env,contractProposal,existingCiRoute,
 fetchImpl,...more});
test('pinned GitHub success + exact source manifest and artifact create technical observation ONLY',async()=>{
 const r=runtime();
 const result=await verify(args(r.fetchImpl));
 assert.equal(result.status,'RECOVERY_TECHNICAL_CI_PROVIDER_ATTESTED_BUSINESS_PROOF_PENDING');
 assert.equal(result.independent_technical_ci_verified,true);
 assert.equal(result.frozen_technical_red_verified,true);
 assert.equal(result.artifact_content_independently_read,false);
 assert.equal(result.github_artifact_digest,sha('f'));
 assert.equal(result.signed_database_receipt_recorded,false);
 assert.equal(result.obligation_id,obligation);
 assert.equal(result.next_governed_action,
  'INDEPENDENTLY_QUALIFY_BUSINESS_ORIGINAL_AND_CASE_SPECIFIC_RED');
 for(const k of ['original_business_case_red_verified',
  'business_original_warrant_verified','original_job_completed',
  'original_job_claim_admitted','proof_gate_advanced','repair_executed',
  'execution_authorized','external_effect_performed','production_changed']){
  assert.equal(result[k],false,k);
 }
 assert.ok(r.paths.some(x=>x.endsWith('/jobs')));
 assert.ok(r.paths.some(x=>x.endsWith('/artifacts')));
});
test('CI from a different release/commit is not reusable',async()=>{
 const r=runtime({run:{head_sha:'b'.repeat(40)}});
 const result=await verify(args(r.fetchImpl));
 assert.equal(result.status,'RECOVERY_TECHNICAL_CI_EXACT_SIGNED_RUN_PENDING');
 assert.equal(result.independent_technical_ci_verified,false);
});
test('spec for sibling PR308 may not certify PR307',async()=>{
 const r=runtime({caseSpec:{...spec,source_ref:
  'https://github.com/maloney2323/Reality/pull/308'}});
 const result=await verify(args(r.fetchImpl));
 assert.equal(result.status,'RECOVERY_TECHNICAL_CI_SPEC_NOT_LINKED_TO_CANONICAL_ORIGINAL');
 assert.equal(result.frozen_technical_red_verified,false);
});
test('wrong scope and forged admission fail even with a green Github run',async()=>{
 for(const modifications of [
  {source_head_sha:'a'.repeat(40)},
  {continuity_root_id:'11111111-1111-4111-8111-111111111111'},
  {case_specific_original_business_red_proven:true},
  {independently_verified_original_customer_admission:true},
  {installation_authorized:true},
  {independent_prior_ci_diagnostic_receipt_sha256:sha('a')}
 ]){
  const r=runtime({caseSpec:{...spec,...modifications}});
  const result=await verify(args(r.fetchImpl));
  assert.equal(result.status,'RECOVERY_TECHNICAL_CI_SPEC_NOT_LINKED_TO_CANONICAL_ORIGINAL');
 }
});
test('Git blob hash tampering cannot become verified proof',async()=>{
 const r=runtime({sourceBlob:'f'.repeat(40)});
 const result=await verify(args(r.fetchImpl));
 assert.equal(result.status,'RECOVERY_TECHNICAL_CI_CASE_BLOB_HASH_MISMATCH');
 assert.equal(result.independent_technical_ci_verified,false);
});
test('green job without exact frozen worktree test or valid provider artifact rejected',async()=>{
 const variants=[
  {jobs:{steps:[{name:'Execute generic CI',conclusion:'success'}]}},
  {artifact:{digest:'invalid'}},
  {artifact:{expired:true}},
  {artifact:{workflow_run:{id:999,head_sha:commit}}},
  {run:{path:'.github/workflows/other.yml'}}
 ];
 for(const variant of variants){
  const r=runtime(variant);
  const result=await verify(args(r.fetchImpl));
  assert.notEqual(result.status,
   'RECOVERY_TECHNICAL_CI_PROVIDER_ATTESTED_BUSINESS_PROOF_PENDING');
  assert.equal(result.independent_technical_ci_verified,false);
 }
});
test('GitHub provider failure becomes reconciliation, not retry or invented success',async()=>{
 const r=runtime({unauthorized:true});
 const result=await verify(args(r.fetchImpl));
 assert.equal(result.status,'RECOVERY_TECHNICAL_CI_PROVIDER_RECONCILIATION_RETRY_DUE');
 assert.equal(result.external_effect_performed,false);
 assert.equal(result.independent_technical_ci_verified,false);
});
test('missing preview GitHub token gives explicit activation gap without a provider request',async()=>{
 const r=runtime();
 const result=await verify(args(r.fetchImpl,{env:{
  ...env,REALITY_BUILDER_DISPATCH_GITHUB_TOKEN:null}}));
 assert.equal(result.status,
  'RECOVERY_TECHNICAL_CI_PREVIEW_SOURCE_OR_PROVIDER_AUTH_UNAVAILABLE');
 assert.equal(r.paths.length,0);
});
test('wrong original, owner or worker scope fails before a provider call',async()=>{
 const cases=[{...existingCiRoute,source_ref:
   'https://github.com/maloney2323/Reality/pull/308'},
  {...existingCiRoute,contract_id:sha('b')},
  {...existingCiRoute,original_job_completed:true}];
 for(const invalid of cases){
  const r=runtime();
  const result=await verify(args(r.fetchImpl,{existingCiRoute:invalid}));
  assert.equal(result.status,'RECOVERY_TECHNICAL_CI_EXACT_SOURCE_AND_WARRANT_REQUIRED');
  assert.equal(r.paths.length,0);
 }
});
