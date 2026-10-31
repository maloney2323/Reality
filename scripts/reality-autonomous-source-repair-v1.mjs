// ONE real source-backed repair request. No owner approvals, model-triggered
// installs or production writes. Model generation runs in a credentialed CI
// job; code executes ONLY in a separate no-secret, network-denied container.
// The original frozen tests and expected GitHub failed run are immutable.
import {readFileSync,writeFileSync,mkdirSync,existsSync,statSync}
 from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const sha=x=>createHash('sha256').update(x).digest('hex');
const fail=x=>{throw Error('REALITY_AUTOREPAIR_'+x)};
const gitBase='https://api.github.com/repos/maloney2323/Reality/';
const TICKET_PATH=process.env.REALITY_REPAIR_TICKET_PATH||
 'reality-repair-jobs/source-verified-general-receipt-v1.json';
if(!['reality-repair-jobs/source-verified-general-receipt-v1.json',
 'reality-worker-result/ticket.json'].includes(TICKET_PATH))
 fail('UNTRUSTED_TICKET_PATH');
const ROOT=process.cwd();
const text=path=>readFileSync(path,'utf8');
const mode=process.argv[2],attempt=Number(process.argv[3]||1);
const ticket=JSON.parse(text(TICKET_PATH));
const allowedPath=p=>typeof p==='string'&&
 /^(?:src\/reality-extensions\/[A-Za-z0-9._/-]+\.mjs|test\/reality-extensions\/[A-Za-z0-9._/-]+\.test\.(?:js|mjs))$/.test(p)&&
 !p.split('/').includes('..')&&!p.includes('//');
if(ticket.schema!=='reality-source-verified-repair-job-v1'||
 !Number.isSafeInteger(ticket.issue_number)||ticket.issue_number<1||
 !Number.isSafeInteger(ticket.failed_run_id)||ticket.failed_run_id<1||
 !/^[a-f0-9]{40}$/.test(ticket.baseline_source_sha||'')||
 !/^test\/reality-frozen-regressions\/[a-z0-9._/-]+\.test\.js$/.test(ticket.frozen_test_path||'')||
 !/^[a-f0-9]{64}$/.test(ticket.frozen_test_sha256||'')||
 !allowedPath(ticket.expected_source_path)||
 !ticket.expected_source_path.startsWith('src/')||
 ticket.expected_source_path.includes('..'))
 fail('TRUSTED_SOURCE_TICKET_REQUIRED');
const frozen=text(ticket.frozen_test_path);
if(sha(frozen)!==ticket.frozen_test_sha256)fail('FROZEN_ACCEPTANCE_BYTES_CHANGED');
if(mode!=='receipt'&&existsSync(ticket.expected_source_path))
 fail('GAP_ALREADY_FILLED_IN_TRUSTED_BASE');
const stable=x=>x===null||typeof x!=='object'?x:Array.isArray(x)?x.map(stable):
 Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])]));
const canonicalHash=x=>sha(JSON.stringify(stable(x)));
async function githubGet(path,token=process.env.GITHUB_TOKEN){
 const headers={accept:'application/vnd.github+json',
  'x-github-api-version':'2022-11-28',
  'user-agent':'Reality-frozen-provider-acceptance'};
 if(token)headers.authorization='Bearer '+token;
 const res=await fetch(gitBase+path,{method:'GET',cache:'no-store',
  redirect:'error',headers});
 if(!res.ok)fail('GITHUB_PROVIDER_READBACK_'+res.status);
 return res.json();
}
async function checkOriginalFailure(){
 const run=await githubGet('actions/runs/'+ticket.failed_run_id);
 if(run.id!==ticket.failed_run_id||run.conclusion!=='failure'||
    run.status!=='completed'||run.head_sha!==ticket.baseline_source_sha||
    run.head_repository?.full_name!=='maloney2323/Reality')
  fail('INDEPENDENT_ORIGINAL_FAILED_RUN_UNVERIFIED');
 const jobs=await githubGet('actions/runs/'+ticket.failed_run_id+'/jobs?per_page=100');
 const failures=(jobs.jobs||[]).filter(j=>j.run_id===run.id&&
  j.head_sha===run.head_sha&&j.conclusion==='failure'&&
  j.steps?.some(s=>s.conclusion==='failure'&&
    /^Frozen (?:same-work|customer acceptance)/.test(String(s.name||''))));
 if(failures.length!==1)fail('EXACT_ORIGINAL_FAILED_JOB_NOT_FOUND');
 const issue=await githubGet('issues/'+ticket.issue_number);
 if(issue.state!=='open'||issue.pull_request||
  issue.repository_url!==gitBase.slice(0,-1)||
  !String(issue.body||'').includes('/actions/runs/'+ticket.failed_run_id))
  fail('ORIGINAL_ISSUE_NOT_BOUND_TO_PROVIDER_RUN');
 return {run_id:run.id,source_sha:run.head_sha,job_id:failures[0].id,
  issue_number:issue.number,
  frozen_test_sha256:ticket.frozen_test_sha256,
  provider_verified:true};
}
function checkCandidate(value){
 if(!value||typeof value!=='object'||!Array.isArray(value.files)||
  value.files.length<2||value.files.length>8||
  value.files.some(f=>!allowedPath(f.path)||typeof f.content!=='string'||
   f.content.length===0||f.content.length>70000)||
  new Set(value.files.map(f=>f.path)).size!==value.files.length||
  !value.files.some(f=>f.path===ticket.expected_source_path)||
  !value.files.some(f=>f.path.startsWith('test/'))||
  value.baseline_source_sha!==ticket.baseline_source_sha||
  value.failed_run_id!==ticket.failed_run_id)
  fail('MODEL_PROPOSAL_SOURCE_BOUNDARY_INVALID');
 for(const file of value.files){
  if(existsSync(file.path))fail('MODEL_PROPOSAL_EXISTING_FILE_OVERWRITE_DENIED');
 }
 return {files:value.files,rationale:String(value.rationale||'').slice(0,1500),
  baseline_source_sha:ticket.baseline_source_sha,
  failed_run_id:ticket.failed_run_id,
  issue_number:ticket.issue_number,
  artifact_sha256:canonicalHash(value.files.map(f=>({path:f.path,content:f.content}))),
  generated_by_model:true,installation_authorized:false,
  original_job_completed:false,production_changed:false};
}
if(mode==='generate'){
 if(![1,2,3].includes(attempt))fail('FINITE_ATTEMPT_REQUIRED');
 const original=await checkOriginalFailure();
 let previous=null,feedback=null;
 if(attempt>1){
  previous=JSON.parse(text('prior/candidate.json'));
  feedback=JSON.parse(text('prior/verification.json'));
  if(previous.failed_run_id!==ticket.failed_run_id||
   feedback.artifact_sha256!==previous.artifact_sha256||
   feedback.provider!=='ISOLATED_SECRET_FREE_DOCKER'||
   feedback.passed===true||
   !/^[a-f0-9]{64}$/.test(String(feedback.log_sha256||'')))
   fail('INDEPENDENT_PRIOR_FAILED_FEEDBACK_REQUIRED');
 }
 const key=process.env.OPENAI_API_KEY||'';
 if(key.length<20)fail('OPENAI_API_KEY_NOT_CONNECTED_TO_GITHUB_WORKER');
 const task={task:'Implement missing existing Reality capability, actual original frozen acceptance fails. Return only proposal; do not install or claim completion.',
  original_provider_failure:original,exact_source_path:ticket.expected_source_path,
  frozen_acceptance_test:frozen,attempt,previous_candidate:previous?.files||null,
  independent_prior_failed_feedback:feedback?{
   log_excerpt:String(feedback.log_excerpt||'').slice(0,8000),
   log_sha256:feedback.log_sha256,
   verified_failed_attempt:attempt-1}:null,
  hard_boundaries:['Only new files in src/reality-extensions or test/reality-extensions',
   'Never modify frozen tests, policy, auth or API', 'No model self-approval',
   'Provide real, correct independent provider receipt and scope checks',
   'Return 1 source implementation and 1 model-authored test']};
 const schema={type:'object',additionalProperties:false,
  properties:{baseline_source_sha:{type:'string'},failed_run_id:{type:'integer'},
   rationale:{type:'string'},files:{type:'array',items:{type:'object',
    additionalProperties:false,properties:{path:{type:'string'},content:{type:'string'}},
    required:['path','content']}}},
  required:['baseline_source_sha','failed_run_id','rationale','files']};
 const model=process.env.REALITY_REPAIR_MODEL||'gpt-5.6';
 const result=await fetch('https://api.openai.com/v1/responses',{
  method:'POST',headers:{authorization:'Bearer '+key,'content-type':'application/json'},
  body:JSON.stringify({model,max_output_tokens:12500,
   text:{format:{type:'json_schema',name:'reality_actual_repair_proposal',strict:true,
    schema}},
   input:[{role:'system',content:[{type:'input_text',text:
    'You are Reality coding model. Implement the missing extension based on the frozen original test. Your code is never authorization or evidence. Do not change source tests or scope. Return strict JSON only.'}]},
    {role:'user',content:[{type:'input_text',text:JSON.stringify(task)}]}]}),
 });
 if(!result.ok)fail('OPENAI_PROVIDER_'+result.status);
 const body=await result.json();
 const raw=body.output_text||
  (body.output||[]).flatMap(o=>o.content||[]).filter(x=>x.type==='output_text')
   .map(x=>x.text||'').join('');
 let proposal;try{proposal=JSON.parse(raw)}catch{fail('MODEL_RESPONSE_NOT_JSON')}
 const checked=checkCandidate(proposal);
 const final={...checked,attempt,model_response_id:body.id||null,
  actual_provider_evidence:original};
 mkdirSync('artifact',{recursive:true});
 writeFileSync('artifact/candidate.json',JSON.stringify(final,null,2)+'\n');
 console.log('REALITY_GENERATION_RECEIPT',JSON.stringify({
  attempt,model_response_id:body.id,
  artifact_sha256:final.artifact_sha256,
  original_run_id:original.run_id,installation_authorized:false,
  original_job_completed:false}));
}else if(mode==='prepare'){
 const candidate=JSON.parse(text('candidate/candidate.json'));
 const checked=checkCandidate(candidate);
 if(checked.artifact_sha256!==candidate.artifact_sha256)
  fail('CANDIDATE_HASH_CHANGED');
 for(const file of checked.files){
  mkdirSync(resolve(ROOT,file.path).slice(0,resolve(ROOT,file.path).lastIndexOf('/')),
   {recursive:true});
  writeFileSync(file.path,file.content,{flag:'wx'});
 }
 console.log('SOURCE_STAGED_UNEXECUTED',candidate.artifact_sha256);
}else if(mode==='receipt'){
 const candidate=JSON.parse(text('candidate/candidate.json'));
 if(!Array.isArray(candidate?.files)||
  candidate.baseline_source_sha!==ticket.baseline_source_sha||
  candidate.failed_run_id!==ticket.failed_run_id||
  candidate.files.some(f=>!allowedPath(f.path))||
  candidate.artifact_sha256!==canonicalHash(
   candidate.files.map(f=>({path:f.path,content:f.content}))))
  fail('RECEIPT_ARTIFACT_CHANGED');
 const log=text('sandbox.log');
 const exitCode=Number(process.argv[4]);
 const passed=exitCode===0&&/# fail 0/.test(log)&&/# pass [1-9]/.test(log);
 const out={schema:'reality-independent-docker-original-verification-v1',
  attempt,artifact_sha256:candidate.artifact_sha256,
  frozen_test_sha256:ticket.frozen_test_sha256,
  original_provider_run_id:ticket.failed_run_id,
  provider:'ISOLATED_SECRET_FREE_DOCKER',network_disabled:true,
  credential_count:0,governance_change_authorized:false,
  passed,exit_code:exitCode,
  log_sha256:sha(log),log_excerpt:log.slice(-11000),
  installed:false,original_job_completed:false,production_changed:false};
 mkdirSync('artifact',{recursive:true});
 writeFileSync('artifact/verification.json',JSON.stringify(out,null,2)+'\n');
 console.log('REALITY_VERIFICATION_RECEIPT',JSON.stringify({
  passed,attempt,artifact_sha256:out.artifact_sha256,
  log_sha256:out.log_sha256,installed:false,original_job_completed:false}));
}else fail('COMMAND_UNSUPPORTED');
