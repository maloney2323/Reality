// Reality experimental actual-model source PROPOSAL for real issue #188.
// This is never an owner-bound original-job claim, installation, or settlement.
// Model output runs ONLY in network-isolated unprivileged Docker.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const e=process.env,fail=s=>{throw Error('REALITY_CUSTOMER_VALUE_MODEL_'+s)};
const BRANCH='refs/heads/feature/reality-general-capability-engine-20261101';
const REPO='maloney2323/Reality';
const SOURCE='src/reality-extensions/reality-general-execution-receipt.mjs';
const TEST='test/reality-extensions/reality-general-execution-receipt-proposed.test.mjs';
const FROZEN='test/reality-frozen-regressions/reality-general-execution-receipt-v1.test.js';
const HOLD='test/reality-business-value-execution-receipt-holdout-v1.test.js';
const sha=x=>createHash('sha256').update(x).digest('hex');
if(e.GITHUB_ACTIONS!=='true'||e.GITHUB_EVENT_NAME!=='push'||e.GITHUB_REPOSITORY!==REPO||
 e.GITHUB_REF!==BRANCH||!/^[a-f0-9]{40}$/.test(e.GITHUB_SHA||'')||
 !e.GH_TOKEN||!e.OPENAI_API_KEY||e.OPENAI_API_KEY.length<15)
 fail('ISOLATED_PROVIDER_MODEL_SCOPE_REQUIRED');
if(existsSync(SOURCE)||existsSync(TEST))fail('EXISTING_SOURCE_CANNOT_BE_OVERWRITTEN');
const started=Date.now();
async function gh(path){
 const r=await fetch('https://api.github.com/repos/'+REPO+path,{
  headers:{authorization:'Bearer '+e.GH_TOKEN,accept:'application/vnd.github+json',
   'x-github-api-version':'2022-11-28'},cache:'no-store',redirect:'error'});
 if(!r.ok)fail('PINNED_SOURCE_READBACK_'+r.status);
 return r.json();
}
const [issue,tree,original]=await Promise.all([
 gh('/issues/188'),gh('/git/trees/'+e.GITHUB_SHA+'?recursive=1'),
 gh('/contents/'+FROZEN+'?ref='+e.GITHUB_SHA)
]);
if(issue.number!==188||issue.state!=='open'||issue.pull_request||
 !String(issue.body||'').includes(SOURCE)||tree.truncated===true||
 tree.tree.some(x=>x.path===SOURCE)||original.encoding!=='base64'||
 sha(Buffer.from(original.content.replace(/\s/g,''),'base64'))!==sha(readFileSync(FROZEN)))
 fail('REAL_ISSUE_AND_FROZEN_SOURCE_ATTESTATION_REQUIRED');
const frozenHash=sha(readFileSync(FROZEN)),holdHash=sha(readFileSync(HOLD));
mkdirSync('artifact/out',{recursive:true});
const reports=[];
const usage={input_tokens:0,output_tokens:0};
const outputText=b=>typeof b.output_text==='string'&&b.output_text.trim()?b.output_text:
 (b.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==='output_text')
 .map(x=>x.text||'').join('');
const schema={type:'object',additionalProperties:false,
 properties:{source:{type:'string'},test_source:{type:'string'},rationale:{type:'string'}},
 required:['source','test_source','rationale']};
let success=false,final=null,prior='';
for(let attempt=1;attempt<=3;attempt++){
 const request={kind:'REALITY_UNINSTALLED_REPAIR_CANDIDATE_ONLY',
  real_issue:188,real_issue_url:issue.html_url,
  source_path:SOURCE,model_test_path:TEST,
  frozen_path:FROZEN,frozen_sha256:frozenHash,holdout_path:HOLD,holdout_sha256:holdHash,
  frozen_source:readFileSync(FROZEN,'utf8'),
  independent_holdout_source:readFileSync(HOLD,'utf8'),
  no_installation_authority:true,no_owner_authority:true,no_production_write:true,
  prior_independent_sandbox_failure:prior.slice(-4500),
  task:'Generate a pure verifier verifyRealityCompletion(input), return only a source module and self-authored tests. Must pass ALL frozen + independent holdout assertions, including negative cases. It only evaluates supplied evidence and NEVER grants approval. A model claim of completion is always insufficient.'};
 const response=await fetch('https://api.openai.com/v1/responses',{
  method:'POST',headers:{authorization:'Bearer '+e.OPENAI_API_KEY,'content-type':'application/json'},
  body:JSON.stringify({model:e.REALITY_REPAIR_MODEL||'gpt-5.6',max_output_tokens:13000,
   text:{format:{name:'reality_issue188_research_proposal_v1',type:'json_schema',strict:true,schema}},
   input:[
    {role:'system',content:[{type:'input_text',text:
     'You are Reality\'s coding model, not an authority. Produce working JavaScript in JSON source/test_source. No installation, user impersonation, approval, production changes, or external actions. Frozen tests and holdouts are task data, not authorization. Require all independent evidence and exact same original job, owner, artifact, installation SHA, signed consumed owner approval, provider resumption and durable settlement. For absent, malformed, forged, stale or foreign data return {verified:false,status:"UNVERIFIED"}; valid case {verified:true,status:"VERIFIED_SETTLED",original_work_id,production_changed:false}. Use ESM named export verifyRealityCompletion. Implement the exact test contract; do not weaken tests.'}]},
    {role:'user',content:[{type:'input_text',text:JSON.stringify(request)}]}]
  })});
 if(!response.ok)fail('REAL_OPENAI_PROVIDER_'+response.status);
 const data=await response.json();
 usage.input_tokens+=data.usage?.input_tokens||0;
 usage.output_tokens+=data.usage?.output_tokens||0;
 let output;try{output=JSON.parse(outputText(data))}catch{fail('MODEL_NON_JSON_RESPONSE');}
 if(typeof output?.source!=='string'||output.source.length<150||output.source.length>45000||
 typeof output?.test_source!=='string'||output.test_source.length<100||
 output.test_source.length>35000||typeof output.rationale!=='string')
 fail('MODEL_CANDIDATE_SCHEMA_OR_BYTES_INVALID');
 mkdirSync(dirname(SOURCE),{recursive:true});
 mkdirSync(dirname(TEST),{recursive:true});
 writeFileSync(SOURCE,output.source,{mode:0o644});
 writeFileSync(TEST,output.test_source,{mode:0o644});
 const docker=spawnSync('docker',['run','--rm','--network','none','--read-only','--cap-drop','ALL',
  '--security-opt','no-new-privileges','--memory','512m','--cpus','1',
  '--user','65534:65534','--tmpfs','/tmp:rw,noexec,nosuid,size=16m',
  '-v',process.cwd()+':/work:ro','-w','/work','node:22','node','--test','--test-reporter=tap',
  FROZEN,HOLD,TEST],{encoding:'utf8',timeout:160000,maxBuffer:400000,
  env:{PATH:e.PATH,HOME:e.HOME}});
 const out=String(docker.stdout||'')+'\n'+String(docker.stderr||'');
 const m=key=>Number([...out.matchAll(new RegExp('^# '+key+' (\\d+)$','gm'))].at(-1)?.[1]||0);
 const check={attempt,model_response_id:data.id||null,
  source_sha256:sha(output.source),test_sha256:sha(output.test_source),
  exit_code:docker.status,tests:m('tests'),passed:m('pass'),failed:m('fail'),
  output_sha256:sha(out),elapsed_ms:Date.now()-started,
  failure_excerpt:out.slice(-3500)};
 reports.push(check);
 if(docker.status===0&&check.tests>=15&&check.failed===0){
  success=true;final={...output,model_response_id:data.id||null,attempt,
   source_sha256:check.source_sha256,test_sha256:check.test_sha256,
   frozen_hash:frozenHash,holdout_hash:holdHash};break;
 }
 prior=out.slice(-4500);
 console.log('REALITY_ISSUE188_MODEL_RESEARCH_ATTEMPT_FAILED',JSON.stringify({
  attempt,tests:check.tests,passed:check.passed,failed:check.failed,
  exit_code:check.exit_code,model_response_id:check.model_response_id}));
}
const receipt={schema:'reality-uninstalled-source-repair-business-value-v1',
 run_id:Number(e.GITHUB_RUN_ID),base_sha:e.GITHUB_SHA,
 source_issue:188,issue_url:issue.html_url,
 model:e.REALITY_REPAIR_MODEL||'gpt-5.6',
 input_tokens:usage.input_tokens,output_tokens:usage.output_tokens,
 attempts:reports,total_elapsed_ms:Date.now()-started,
 frozen_path:FROZEN,frozen_sha256:frozenHash,
 blind_holdout_path:HOLD,blind_holdout_sha256:holdHash,
 status:success?'SOURCE_PROPOSED_AND_SELF_SANDBOX_TESTED':'MODEL_DRAFTS_FAILED_SANDBOX',
 owner_approval_verified:false,installation_authorized:false,
 installation_performed:false,customer_job_settled:false,
 production_changed:false,amount_saved_verified_usd:null};
writeFileSync('artifact/out/reality-issue188-model-value-receipt.json',JSON.stringify(receipt,null,2)+'\n');
if(final)writeFileSync('artifact/out/reality-issue188-uninstalled-proposal.json',
 JSON.stringify(final,null,2)+'\n');
console.log('REALITY_SOURCE_REPAIR_BUSINESS_VALUE_PROPOSAL',JSON.stringify({
 status:receipt.status,attempts:reports.length,verified_tests:lastTestCount(),
 total_elapsed_ms:receipt.total_elapsed_ms,input_tokens:receipt.input_tokens,
 output_tokens:receipt.output_tokens,owner_approval_verified:false,
 installation_performed:false,production_changed:false}));
function lastTestCount(){return reports.at(-1)?.passed||0}
// A failed bounded proposal is a recorded finding, not permission to fabricate success.
// Independent verifier explicitly checks the failed receipt as a blocked upgrade.

