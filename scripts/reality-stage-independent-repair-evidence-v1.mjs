// Evidence-only staging of actual AI-generated repair source. This is DATA,
// not installed code. The pinned candidate and independently tested receipt
// come from separate source-linked GitHub Actions artifact downloads.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const fail=x=>{throw Error('REPAIR_REVIEW_'+x)};
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const hash=x=>createHash('sha256').update(x).digest('hex');
const canon=x=>x===null||typeof x!=='object'?x:Array.isArray(x)?x.map(canon):
 Object.fromEntries(Object.keys(x).sort().map(k=>[k,canon(x[k])]));
const stableHash=x=>hash(JSON.stringify(canon(x)));
const src=x=>typeof x==='string'&&/^(?:src\/reality-extensions\/[A-Za-z0-9._/-]+\.mjs|test\/reality-extensions\/[A-Za-z0-9._/-]+\.test\.(?:js|mjs))$/.test(x)&&!x.includes('//')&&!x.split('/').includes('..');
const req=read(process.argv[2]||'');
if(req.schema!=='reality-independent-candidate-review-request-v1'||
 !Number.isSafeInteger(req.issue_number)||req.issue_number<1||
 !Number.isSafeInteger(req.model_run_id)||
 !Number.isSafeInteger(req.verification_run_id)||
 !Number.isSafeInteger(req.original_failed_run_id)||
 !/^[a-f0-9]{64}$/.test(String(req.expected_candidate_hash||''))||
 !/^[a-f0-9]{64}$/.test(String(req.expected_frozen_sha||''))||
 !/^[a-f0-9]{40}$/.test(String(req.baseline_source_sha||'')))
 fail('PINNED_REQUEST_INVALID');
const candidate=read('review-artifacts/candidate/candidate.json');
const verification=read('review-artifacts/proof/artifact/verification.json');
const log=readFileSync('review-artifacts/proof/sandbox.log','utf8');
if(candidate.issue_number!==req.issue_number||
 candidate.failed_run_id!==req.original_failed_run_id||
 candidate.baseline_source_sha!==req.baseline_source_sha||
 candidate.generated_by_model!==true||
 candidate.installation_authorized!==false||
 candidate.original_job_completed!==false||
 !Array.isArray(candidate.files)||candidate.files.length<2||
 candidate.files.some(f=>!src(f.path)||typeof f.content!=='string'||
  !f.content.length||f.content.length>70000)||
 new Set(candidate.files.map(f=>f.path)).size!==candidate.files.length||
 !candidate.files.some(f=>f.path.startsWith('src/'))||
 !candidate.files.some(f=>f.path.startsWith('test/'))||
 stableHash(candidate.files.map(f=>({path:f.path,content:f.content})))!==
  req.expected_candidate_hash||
 candidate.artifact_sha256!==req.expected_candidate_hash||
 !candidate.model_response_id||!/^resp_[a-zA-Z0-9_-]+$/.test(candidate.model_response_id)||
 !verification||verification.passed!==true||
 verification.provider!=='ISOLATED_SECRET_FREE_DOCKER'||
 verification.network_disabled!==true||
 verification.credential_count!==0||
 verification.installed!==false||
 verification.original_job_completed!==false||
 verification.artifact_sha256!==req.expected_candidate_hash||
 verification.frozen_test_sha256!==req.expected_frozen_sha||
 verification.original_provider_run_id!==req.original_failed_run_id||
 verification.log_sha256!==hash(log)||
 !/# fail 0/.test(log)||!/# pass [1-9]/.test(log))
 fail('EXACT_GENERATED_AND_INDEPENDENTLY_TESTED_ARTIFACT_REQUIRED');
const file='reality-repair-evidence/issue-'+req.issue_number+'-candidate.json';
if(existsSync(file))fail('EXISTING_REVIEW_RECORD_NO_SILENT_OVERWRITE');
const out={
 schema:'reality-model-candidate-independent-review-v1',
 original_issue_number:req.issue_number,
 original_failed_provider_run_id:req.original_failed_run_id,
 frozen_test_sha256:req.expected_frozen_sha,
 baseline_source_sha:req.baseline_source_sha,
 candidate_artifact_sha256:req.expected_candidate_hash,
 model_source_run_id:req.model_run_id,
 independent_verification_run_id:req.verification_run_id,
 model_response_id:candidate.model_response_id,
 model_attempt:candidate.attempt,
 source_files:candidate.files,
 independent_sandbox:{
  passed:true,provider:verification.provider,
  artifact_sha256:verification.artifact_sha256,
  log_sha256:verification.log_sha256,
  original_provider_run_id:verification.original_provider_run_id,
  frozen_test_sha256:verification.frozen_test_sha256,
  network_disabled:true,credential_count:0,
 },
 installation_authorized:false,installed:false,
 original_job_resumed:false,original_job_settled:false,
 production_changed:false,
};
mkdirSync('reality-repair-evidence',{recursive:true});
writeFileSync(file,JSON.stringify(out,null,2)+'\n',{flag:'wx'});
console.log('REALITY_INERT_REPAIR_EVIDENCE_STAGED',JSON.stringify({
 review_path:file,artifact_sha256:out.candidate_artifact_sha256,
 model_response_id:out.model_response_id,
 independently_verified:true,
 installed:false,original_job_settled:false}));
