// Source-backed Github review of the EXACT source/model/sandbox evidence.
// No LLM output can authorize install. Only immutable candidate bytes in
// committed, CI-reconciled review JSON and provider run results count.
import {createHash} from 'node:crypto';
const ROOT='https://api.github.com/repos/maloney2323/Reality';
const fail=x=>{throw Error('REAL_REPAIR_READBACK_'+x)};
const sha=x=>createHash('sha256').update(x).digest('hex');
const canon=x=>x===null||typeof x!=='object'?x:Array.isArray(x)?x.map(canon):
 Object.fromEntries(Object.keys(x).sort().map(k=>[k,canon(x[k])]));
const hash=x=>sha(JSON.stringify(canon(x)));
const source=x=>typeof x==='string'&&
 /^(?:src\/reality-extensions\/[A-Za-z0-9._/-]+\.mjs|test\/reality-extensions\/[A-Za-z0-9._/-]+\.test\.(?:js|mjs))$/.test(x)&&
 !x.split('/').includes('..')&&!x.includes('//');
export async function readExactModelRepairEvidence({
 issueNumber,env=process.env,fetchImpl=fetch,branch=null,atCommitSha=null,sourceCommitSha=null,
}={}){
 if(!Number.isSafeInteger(issueNumber)||issueNumber<1||issueNumber>100000)
  fail('ISSUE_NOT_GROUNDED');
 const ref=branch||env.VERCEL_GIT_COMMIT_REF;
 if(typeof ref!=='string'||!/^feature\/reality-[a-z0-9][a-z0-9/-]{5,105}$/.test(ref)||
    ref.includes('..')||env.VERCEL_ENV!=='preview')
  fail('ISOLATED_PREVIEW_BRANCH_REQUIRED');
 if(sourceCommitSha!==null&&!/^[a-f0-9]{40}$/.test(String(sourceCommitSha)))
  fail('APPROVED_REVIEW_COMMIT_SHA_INVALID');
 const token=env.REALITY_BUILDER_DISPATCH_GITHUB_TOKEN||null;
 async function get(path){
  const response=await fetchImpl(ROOT+path,{method:'GET',
   cache:'no-store',redirect:'error',headers:{
    accept:'application/vnd.github+json',
    'x-github-api-version':'2022-11-28',
    'user-agent':'Reality-exact-model-source-review-v1',
    ...(typeof token==='string'&&token.length>20?
      {authorization:'Bearer '+token}:{})}});
  if(!response.ok)fail('GITHUB_PROVIDER_'+response.status);
  return response.json();
 }
 const br=await get('/git/ref/heads/'+ref);
 if(!/^[0-9a-f]{40}$/.test(String(br?.object?.sha||'')))
  fail('SOURCE_BRANCH_HEAD_UNVERIFIED');
 const commit=sourceCommitSha||br.object.sha;
 if(sourceCommitSha!==null){
  const pinned=await get('/git/commits/'+sourceCommitSha);
  if(!/^[a-f0-9]{40}$/.test(String(pinned?.tree?.sha||'')))
   fail('ORIGINAL_APPROVED_SOURCE_COMMIT_NOT_RETRIEVABLE');
 }
 const filename='reality-repair-evidence/issue-'+issueNumber+'-candidate.json';
 const file=await get('/contents/'+filename+'?ref='+commit);
 if(file?.path!==filename||file?.type!=='file'||
  file.encoding!=='base64'||typeof file.content!=='string')
  fail('INERT_REVIEW_SOURCE_NOT_FOUND');
 const json=Buffer.from(file.content.replace(/\s/g,''),'base64').toString('utf8');
 if(json.length<500||json.length>250000)fail('REVIEW_BYTES_INVALID');
 let record;try{record=JSON.parse(json)}catch{fail('REVIEW_JSON_INVALID')}
 const files=record.source_files;
 if(record.schema!=='reality-model-candidate-independent-review-v1'||
  record.original_issue_number!==issueNumber||
  !Array.isArray(files)||files.length<2||files.length>12||
  files.some(f=>!source(f.path)||typeof f.content!=='string'||!f.content||
    f.content.length>70000)||
  new Set(files.map(f=>f.path)).size!==files.length||
  !files.some(f=>f.path.startsWith('src/'))||
  !files.some(f=>f.path.startsWith('test/'))||
  !/^[a-f0-9]{40}$/.test(String(record.baseline_source_sha||''))||
  !/^[a-f0-9]{64}$/.test(String(record.candidate_artifact_sha256||''))||
  hash(files.map(f=>({path:f.path,content:f.content})))!==
   record.candidate_artifact_sha256||
  !/^[a-f0-9]{64}$/.test(String(record.frozen_test_sha256||''))||
  record.independent_sandbox?.passed!==true||
  record.independent_sandbox?.provider!=='ISOLATED_SECRET_FREE_DOCKER'||
  record.independent_sandbox?.network_disabled!==true||
  record.independent_sandbox?.credential_count!==0||
  record.independent_sandbox?.artifact_sha256!==record.candidate_artifact_sha256||
  record.independent_sandbox?.frozen_test_sha256!==record.frozen_test_sha256||
  record.independent_sandbox?.original_provider_run_id!==record.original_failed_provider_run_id||
  record.installed!==false||record.original_job_resumed!==false||
  record.original_job_settled!==false||record.installation_authorized!==false||
  record.production_changed!==false)
  fail('EXACT_CANDIDATE_OR_SANDBOX_PROOF_MISMATCH');
 const [failed,model,verified,issue]=await Promise.all([
  get('/actions/runs/'+record.original_failed_provider_run_id),
  get('/actions/runs/'+record.model_source_run_id),
  get('/actions/runs/'+record.independent_verification_run_id),
  get('/issues/'+issueNumber),
 ]);
 if(failed.id!==record.original_failed_provider_run_id||
  failed.conclusion!=='failure'||failed.status!=='completed'||
  failed.head_sha!==record.baseline_source_sha||
  model.id!==record.model_source_run_id||
  model.conclusion!=='failure'&&model.conclusion!=='success'||
  verified.id!==record.independent_verification_run_id||
  verified.conclusion!=='success'||verified.status!=='completed'||
  [failed,model,verified].some(x=>x.head_repository?.full_name!=='maloney2323/Reality')||
  issue.number!==issueNumber||issue.state!=='open'||issue.pull_request||
  issue.repository_url!==ROOT||
  !String(issue.body||'').includes('/actions/runs/'+failed.id))
  fail('INDEPENDENT_GITHUB_RUN_OR_ISSUE_READBACK_FAILED');
 return Object.freeze({
  status:'REAL_MODEL_CANDIDATE_INDEPENDENTLY_TESTED',
  issue_number:issueNumber,
  issue_url:'https://github.com/maloney2323/Reality/issues/'+issueNumber,
  original_failed_run_id:failed.id,
  frozen_test_sha256:record.frozen_test_sha256,
  original_source_sha:record.baseline_source_sha,
  model_source_run_id:model.id,
  verified_sandbox_run_id:verified.id,
  review_commit_sha:commit,review_file_path:filename,
  candidate_artifact_sha256:record.candidate_artifact_sha256,
  model_response_id:record.model_response_id,
  files:files.map(f=>({path:f.path,content:f.content})),
  independent_sandbox:record.independent_sandbox,
  source_sha256:sha(json),
  independently_verified:true,
  installation_authorized:false,installed:false,
  original_job_completed:false,production_changed:false,
 });
}
