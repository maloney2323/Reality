// Stage ONLY independently verified model source as inert JSON for exact
// owner review. The executable extension is NEVER installed here.
import {readFileSync,writeFileSync,mkdirSync,existsSync,copyFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const fail=x=>{throw Error('REALITY_SOURCE_REVIEW_'+x)};
const raw=x=>readFileSync(x,'utf8');
const read=x=>JSON.parse(raw(x));
const hash=x=>createHash('sha256').update(x).digest('hex');
const canon=x=>x===null||typeof x!=='object'?x:Array.isArray(x)?x.map(canon):
 Object.fromEntries(Object.keys(x).sort().map(k=>[k,canon(x[k])]));
const stableHash=x=>hash(JSON.stringify(canon(x)));
const path=x=>typeof x==='string'&&
 /^(?:src\/reality-extensions\/[A-Za-z0-9._/-]+\.mjs|test\/reality-extensions\/[A-Za-z0-9._/-]+\.test\.(?:js|mjs))$/.test(x)&&
 !x.includes('//')&&!x.split('/').includes('..');
export function verifyReadyForInertReview({ticket,candidate,proof,log,runId}){
 if(ticket?.schema!=='reality-source-verified-repair-job-v1'||
  !/^work:[a-f0-9]{32}$/.test(ticket.original_work_id)||
  !Number.isSafeInteger(ticket.issue_number)||ticket.issue_number<1||
  !Number.isSafeInteger(runId)||runId<1||
  candidate?.issue_number!==ticket.issue_number||
  candidate.baseline_source_sha!==ticket.baseline_source_sha||
  candidate.failed_run_id!==ticket.failed_run_id||
  candidate.generated_by_model!==true||
  !/^resp_[A-Za-z0-9_-]+$/.test(String(candidate.model_response_id||''))||
  !Array.isArray(candidate.files)||candidate.files.length<2||
  candidate.files.some(f=>!path(f.path)||typeof f.content!=='string'||
   !f.content.length||f.content.length>70000)||
  new Set(candidate.files.map(f=>f.path)).size!==candidate.files.length||
  !candidate.files.some(f=>f.path===ticket.expected_source_path)||
  !candidate.files.some(f=>f.path.startsWith('test/'))||
  candidate.artifact_sha256!==stableHash(candidate.files.map(x=>({
   path:x.path,content:x.content})))||
  proof?.schema!=='reality-independent-docker-original-verification-v1'||
  proof.passed!==true||proof.exit_code!==0||
  proof.provider!=='ISOLATED_SECRET_FREE_DOCKER'||
  proof.network_disabled!==true||proof.credential_count!==0||
  proof.artifact_sha256!==candidate.artifact_sha256||
  proof.original_provider_run_id!==ticket.failed_run_id||
  proof.frozen_test_sha256!==ticket.frozen_test_sha256||
  proof.log_sha256!==hash(log)||
  !/# fail 0/.test(log)||!/# pass [1-9]/.test(log))
  fail('PINNED_ORIGINAL_INDEPENDENTLY_PASSING_CANDIDATE_REQUIRED');
 return Object.freeze({
  schema:'reality-model-candidate-independent-review-v1',
  original_issue_number:ticket.issue_number,
  original_work_id:ticket.original_work_id,
  original_failed_provider_run_id:ticket.failed_run_id,
  frozen_test_sha256:ticket.frozen_test_sha256,
  baseline_source_sha:ticket.baseline_source_sha,
  candidate_artifact_sha256:candidate.artifact_sha256,
  model_source_run_id:ticket.original_model_run_id||runId,
  independent_verification_run_id:runId,
  model_response_id:candidate.model_response_id,
  model_attempt:candidate.attempt,
  source_files:candidate.files,
  independent_sandbox:{
   passed:true,provider:proof.provider,
   artifact_sha256:proof.artifact_sha256,
   log_sha256:proof.log_sha256,
   original_provider_run_id:proof.original_provider_run_id,
   frozen_test_sha256:proof.frozen_test_sha256,
   network_disabled:true,credential_count:0,
  },
  installation_authorized:false,installed:false,
  original_job_resumed:false,original_job_settled:false,
  production_changed:false,
 });
}
if(import.meta.url===new URL('file://'+process.argv[1]).href){
 try{
  const ticket=read('../baseline/reality-worker-result/ticket.json');
  const record=verifyReadyForInertReview({
   ticket,candidate:read('../baseline/artifact/candidate.json'),
   proof:read('../baseline/artifact/verification.json'),
   log:raw('../baseline/sandbox.log'),
   runId:Number(process.env.GITHUB_RUN_ID),
  });
  const out='reality-repair-evidence/issue-'+ticket.issue_number+'-candidate.json';
  if(existsSync(out))fail('PREVIOUS_EVIDENCE_EXISTS_NO_OVERWRITE');
  mkdirSync('reality-repair-evidence',{recursive:true});
  writeFileSync(out,JSON.stringify(record,null,2)+'\n',{flag:'wx'});
  // The ORIGINAL frozen test is source-pinned at the failed provider commit.
  // Preserve its exact bytes before installing source; never rewrite tests.
  const frozen=raw('../baseline/'+ticket.frozen_test_path);
  if(hash(frozen)!==ticket.frozen_test_sha256)
   fail('ORIGINAL_FROZEN_TEST_CHANGED');
  if(!existsSync(ticket.frozen_test_path)){
   mkdirSync(ticket.frozen_test_path.slice(0,ticket.frozen_test_path.lastIndexOf('/')),
    {recursive:true});
   copyFileSync('../baseline/'+ticket.frozen_test_path,
    ticket.frozen_test_path);
  }else if(hash(raw(ticket.frozen_test_path))!==ticket.frozen_test_sha256)
   fail('FROZEN_TEST_EXISTING_SOURCE_CONFLICT');
  console.log('REALITY_INERT_MODEL_CANDIDATE_READY',JSON.stringify({
   original_work_id:ticket.original_work_id,issue_number:ticket.issue_number,
   artifact_sha256:record.candidate_artifact_sha256,
   verified_original_frozen_tests:true,owner_approval_required:true,
   installation_authorized:false,original_job_settled:false}));
 }catch(e){
  const safe=String(e?.message||'');
  console.error(/^REALITY_SOURCE_REVIEW_[A-Z0-9_]+$/.test(safe)?
   safe:'REALITY_SOURCE_REVIEW_INDEPENDENT_READBACK_REQUIRED');
  process.exitCode=1;
 }
}
