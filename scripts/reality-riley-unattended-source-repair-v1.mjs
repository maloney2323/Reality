// Unattended Riley coding job: ONE real frozen failing test, one real model
// response, one exact current source file. This runs in a read-only GitHub
// Actions job with no GitHub writer or Supabase service credentials.
// It produces INERT candidate bytes; the separate verified staging job owns
// isolated GitHub writes. NEVER install or settle original work here.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
const REPO='maloney2323/Reality';
const BRANCH='fix/reality-governed-riley-original-driver-20261107';
const TARGET='src/reality-riley-authorized-pr-review-job-v1.js';
const FROZEN='test/reality-frozen-regressions/riley-pr-credential-preflight.test.js';
const INTENT='reality-riley-repair-intents/263-live-shift.json';
const ISSUE='https://github.com/'+REPO+'/issues/263';
const BASE='1b5ae3e3d94c817f1ab3c705003057f44eae95ff';
const hash=x=>createHash('sha256').update(x).digest('hex');
const deny=x=>{throw Error('RILEY_UNATTENDED_REPAIR_'+x)};
const jsonFile=p=>JSON.parse(readFileSync(p,'utf8'));
const code=readFileSync(TARGET,'utf8'),frozen=readFileSync(FROZEN,'utf8');
const intent=jsonFile(INTENT);
if(process.env.GITHUB_ACTIONS!=='true'||
 process.env.GITHUB_EVENT_NAME!=='push'||
 process.env.GITHUB_REPOSITORY!==REPO||
 process.env.GITHUB_REF!=='refs/heads/'+BRANCH||
 !/^[a-f0-9]{40}$/.test(process.env.GITHUB_SHA||'')||
 process.env.GITHUB_SHA!==execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()||
 Object.keys(intent).sort().join(',')!==
 'attempt,baseline_failure_run_id,issue_number,issue_url,original_work_id,shift_id,source_proof_sha256,version'||
 intent.version!=='reality-riley-unattended-source-repair-warrant-v1'||
 intent.issue_number!==263||intent.issue_url!==ISSUE||
 intent.shift_id!=='21dff8db-6f46-444d-a149-ab15f1caf8fe'||
 intent.source_proof_sha256!=='sha256:e6a68e0bac2f8465da13b00fcc808eacba11ec1c0cfbd07497bdb5f7a95d09b6'||
 !/^work:[a-f0-9]{32}$/.test(intent.original_work_id||'')||
 intent.baseline_failure_run_id!==42450082737||
 !Number.isInteger(intent.attempt)||intent.attempt<2||intent.attempt>3)
 deny('PINNED_AUTHORIZED_SHIFT_AND_PROVIDER_FAILURE_REQUIRED');
const changed=execFileSync('git',['diff','--name-only','HEAD^','HEAD'],{encoding:'utf8'})
 .trim().split(/\r?\n/).filter(Boolean);
if(changed.length!==1||changed[0]!==INTENT)
 deny('ONE_SIGNED_ORIGINAL_SOURCE_REQUEST_PER_RUN');
const baseline=spawnSync('node',['--test',FROZEN],{
 encoding:'utf8',timeout:25000,maxBuffer:2000000
});
const exactFailure='missing GitHub writer preserves PREPARED';
if(baseline.status===0||
 !baseline.stdout.includes(exactFailure)||
 !baseline.stdout.includes('not ok '))
 deny('SOURCE_DEFECT_NOT_INDEPENDENTLY_REPRODUCED');
const apiKey=process.env.OPENAI_API_KEY;
if(!apiKey||apiKey.length<12)deny('REAL_OPENAI_CREDENTIAL_UNAVAILABLE');
if(!code.includes("if(c.phase==='PREPARED'){")||
 !code.includes('PR_REVIEW_GITHUB_WRITER_CREDENTIAL_MISSING_PUBLISH_INTENT_FENCED'))
 deny('SOURCE_DEFECT_NO_LONGER_CURRENT');
const excerpt=code.slice(code.indexOf("if(c.phase==='PREPARED'){"),
 code.indexOf("if(c.phase==='PUBLISHING'){"));
const schema={
 type:'object',additionalProperties:false,
 properties:{
  guard_js:{type:'string'},root_cause:{type:'string'}
 },required:['guard_js','root_cause']
};
const request={
 model:process.env.REALITY_RILEY_AUTOMATED_REPAIR_MODEL||'gpt-4.1-mini',
 max_output_tokens:2400,tool_choice:'none',
 text:{format:{type:'json_schema',name:'riley_single_existing_file_fix',
  schema,strict:true}},
 input:[
  {role:'system',content:[{type:'input_text',text:
   'You are Riley, the software engineer operating under Reality governance. '+
   'Fix ONE concrete independently reproduced regression. Generate one SHORT '+
   'JavaScript early-return guard to insert at the very beginning of the '+
   "PREPARED branch before it marks durable publishing intent. "+
   'If githubToken is missing or less than 25 chars, return '+
   "unavailable('PR_REVIEW_GITHUB_WRITER_CREDENTIAL_MISSING'). "+
   'Preserve normal authenticated publication and all independent readbacks. '+
   'Do not alter any other code or mint approval or execution. '+
   'Return guard_js (only the guard statement, without markdown) and root_cause.'}]},
  {role:'user',content:[{type:'input_text',text:
   'REALITY AUTHORISED SHIFT SOURCE: '+ISSUE+
   '\\nObserved failing GitHub CI run: https://github.com/'+REPO+
     '/actions/runs/'+intent.baseline_failure_run_id+
   '\\nFrozen test: '+FROZEN+'\\n'+frozen+
   '\\nCurrent real source excerpt from '+TARGET+':\\n'+excerpt+
   '\\nFix the missing-writer PREPARED-to-PUBLISHING corruption so '+
   'the exact frozen regression passes without skipping any normal '+
   'independent Github readback, or authorizing installation.'}]}
 ]
};
const response=await fetch('https://api.openai.com/v1/responses',{
 method:'POST',redirect:'error',cache:'no-store',
 signal:AbortSignal.timeout(75000),
 headers:{authorization:'Bearer '+apiKey,'content-type':'application/json'},
 body:JSON.stringify(request)
});
if(!response.ok)deny('OPENAI_PROVIDER_HTTP_'+response.status);
const out=await response.json();
const answer=typeof out.output_text==='string'?out.output_text:
 (out.output||[]).flatMap(x=>x.content||[])
  .filter(x=>x.type==='output_text').map(x=>x.text).join('\n');
if(out.status!=='completed'||!/^resp_[a-zA-Z0-9_-]{4,160}$/.test(out.id||''))
 deny('REAL_MODEL_COMPLETION_NOT_VERIFIED');
let change;
try{change=JSON.parse(answer);}catch{deny('MODEL_REPAIR_PATCH_NOT_JSON');}
if(!change||typeof change.guard_js!=='string'||
 typeof change.root_cause!=='string'||
 change.guard_js.length<75||change.guard_js.length>500||
 change.root_cause.length<12||change.root_cause.length>600||
 !change.guard_js.includes('githubToken')||
 !change.guard_js.includes('return unavailable')||
 !change.guard_js.includes('PR_REVIEW_GITHUB_WRITER_CREDENTIAL_MISSING')||
 change.guard_js.includes('process.env')||
 change.guard_js.includes('fetch(')||
 change.guard_js.includes('eval(')||
 change.guard_js.includes('require(')||
 change.guard_js.includes('import('))
 deny('MODEL_SOURCE_BOUND_WRITER_PREFLIGHT_GUARD_REQUIRED');
const insertion="if(c.phase==='PREPARED'){";
if(code.split(insertion).length!==2||
 excerpt.split(insertion).length!==2||
 code.includes("return unavailable('PR_REVIEW_GITHUB_WRITER_CREDENTIAL_MISSING');"))
 deny('EXACT_SINGLE_MISSING_WRITER_GUARD_LOCATION_REQUIRED');
const candidate=code.replace(insertion,insertion+'\n  '+change.guard_js.trim()+'\n');
if(candidate===code||candidate.length>code.length+550||
 candidate.length<code.length)deny('UNTRUSTED_FILE_REPLACEMENT');
mkdirSync('benchmark-results/riley-unattended-263',{recursive:true});
writeFileSync(TARGET,candidate);
const syntax=spawnSync('node',['--check',TARGET],{encoding:'utf8',timeout:20000});
const frozenResult=spawnSync('node',['--test',FROZEN],{
 encoding:'utf8',timeout:35000,maxBuffer:2000000
});
const existing=spawnSync('node',['--test','test/reality-riley-authorized-pr-review-job-v1.test.js'],{
 encoding:'utf8',timeout:35000,maxBuffer:2000000
});
const diff=execFileSync('git',['diff','--name-only'],{encoding:'utf8'}).trim();
const pass=syntax.status===0&&frozenResult.status===0&&
 frozenResult.stdout.includes('# fail 0')&&
 existing.status===0&&existing.stdout.includes('# fail 0')&&diff===TARGET;
const report={
 version:'reality-riley-real-original-existing-file-model-repair-proof-v1',
 status:pass?'MODEL_WRITTEN_REPAIR_FROZEN_AND_EXISTING_CHECKS_PASSED':
  'MODEL_WRITTEN_REPAIR_NOT_INDEPENDENTLY_VERIFIED',
 issue_url:ISSUE,original_work_id:intent.original_work_id,
 shift_id:intent.shift_id,shift_source_proof_sha256:intent.source_proof_sha256,
 original_failing_run_id:intent.baseline_failure_run_id,
 workflow_run_id:Number(process.env.GITHUB_RUN_ID),
 request_commit_sha:process.env.GITHUB_SHA,
 baseline_source_sha256:hash(code),candidate_source_sha256:hash(candidate),
 frozen_test_sha256:hash(frozen),
 model_response_id:out.id,model_name:request.model,
 independent_baseline_reproduced:true,
 independent_frozen_passed:frozenResult.status===0,
 independent_existing_tests_passed:existing.status===0,
 independent_candidate_syntax_passed:syntax.status===0,
 changed_files:diff===TARGET?[TARGET]:[],
 model_patch_root_cause:change.root_cause.slice(0,200),
 original_job_completed:false,owner_installation_authorized:false,
 production_changed:false,provider_comment_published:false,
 actual_labor_cost_saved_usd:null
};
writeFileSync('benchmark-results/riley-unattended-263/repair-proof.json',
 JSON.stringify(report,null,2)+'\n');
writeFileSync('benchmark-results/riley-unattended-263/candidate-source.js',candidate);
console.log('RILEY_UNATTENDED_ORIGINAL_CANDIDATE',JSON.stringify({
 status:report.status,original_work_id:report.original_work_id,
 model_response_id:report.model_response_id,
 failing_original_reproduced:true,
 frozen_tests_passed:report.independent_frozen_passed,
 existing_tests_passed:report.independent_existing_tests_passed,
 original_settlement:false,production_changed:false
}));
if(!pass)process.exitCode=1;
