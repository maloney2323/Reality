// REAL unattended Riley + Taylor recurring failure investigation: #143.
// Exactly one owner-authorized shift source, currently fresh GitHub evidence,
// one shared OpenAI model. No repair, installation or financial ROI inferred.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const ROOT='https://api.github.com/repos/maloney2323/Reality';
const REPO='maloney2323/Reality',ISSUE=143,OLD=40591283500;
const SHIFT='21dff8db-6f46-444d-a149-ab15f1caf8fe';
const SOURCE='https://github.com/'+REPO+'/issues/'+ISSUE;
const path='reality-riley-repair-intents/143-live-shift.json';
const manifest=JSON.parse(fs.readFileSync(path,'utf8'));
const deny=x=>{throw Error('RILEY_FAILURE_TRIAGE_'+x)};
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const changes=execFileSync('git',['diff','--name-only','HEAD^','HEAD'],{encoding:'utf8'})
 .trim().split(/\r?\n/).filter(Boolean);
if(process.env.GITHUB_ACTIONS!=='true'||
 process.env.GITHUB_REPOSITORY!==REPO||
 process.env.GITHUB_REF!=='refs/heads/fix/reality-governed-riley-original-driver-20261107'||
 process.env.GITHUB_SHA!==commit||
 Object.keys(manifest).sort().join(',')!==
 'historical_failed_run_id,issue_number,original_work_id,shift_id,source_proof_sha256,source_ref,version'||
 manifest.version!=='reality-riley-shift-current-failure-recheck-v1'||
 manifest.issue_number!==ISSUE||manifest.shift_id!==SHIFT||
 manifest.source_ref!==SOURCE||
 manifest.source_proof_sha256!=='sha256:PLACEHOLDER_SOURCE_DIGEST'||
 manifest.historical_failed_run_id!==OLD||
 !/^work:[a-f0-9]{32}$/.test(manifest.original_work_id||'')||
 changes.length!==1||changes[0]!==path)
 deny('ACTUAL_OWNER_SHIFT_AND_CURRENT_SOURCE_WARRANT_REQUIRED');
const key=process.env.GITHUB_TOKEN;
async function get(relative){
 if(!/^\/(?:issues\/143|actions\/runs(?:\?per_page=100|\/[1-9]\d+))$/.test(relative))
  deny('UNAPPROVED_GITHUB_EVIDENCE_RESOURCE');
 const res=await fetch(ROOT+relative,{
  headers:{accept:'application/vnd.github+json',
   ...(typeof key==='string'&&key.length>10?{authorization:'Bearer '+key}:{}),
   'user-agent':'Reality-Unattended-Employee-Shift-143',
   'x-github-api-version':'2022-11-28'},
  method:'GET',cache:'no-store',redirect:'error',
  signal:AbortSignal.timeout(20000)
 });
 if(!res.ok)deny('GITHUB_SOURCE_HTTP_'+res.status);
 return res.json();
}
const [issue,original,list]=await Promise.all([
 get('/issues/143'),get('/actions/runs/'+OLD),
 get('/actions/runs?per_page=100')
]);
if(issue?.number!==ISSUE||issue.state!=='open'||issue.html_url!==SOURCE||
 !String(issue.body||'').includes(String(OLD))||
 original.id!==OLD||original.name!=='Reality Governed Execution Engine v0.1'||
 original.conclusion!=='failure'||original.status!=='completed'||
 !Array.isArray(list?.workflow_runs)||list.workflow_runs.length<3)
 deny('HISTORICAL_SOURCE_PROVIDER_FAILURE_NOT_VERIFIED');
const recent=list.workflow_runs.filter(x=>x.name===original.name&&
 x.status==='completed'&&x.conclusion==='success'&&
 x.html_url==='https://github.com/'+REPO+'/actions/runs/'+x.id&&
 x.id>OLD&&Date.parse(x.created_at)>Date.parse(original.created_at));
const current=recent.slice(0,3);
if(current.length!==3||new Set(current.map(x=>x.id)).size!==3)
 deny('CURRENT_THREE_SUCCESSFUL_EXECUTION_ENGINE_RUNS_NOT_VERIFIED');
const apiKey=process.env.OPENAI_API_KEY;
if(typeof apiKey!=='string'||apiKey.length<12)deny('OPENAI_SHIFT_MODEL_CREDENTIAL_MISSING');
const ctx={
 source_issue:SOURCE,historical_failed_run:OLD,
 older_run_commit:original.head_sha,
 current_success_run_ids:current.map(x=>x.id),
 current_commits:current.map(x=>x.head_sha),
 old_created_at:original.created_at,
 current_created_at:current.map(x=>x.created_at)
};
const response=await fetch('https://api.openai.com/v1/responses',{
 method:'POST',cache:'no-store',redirect:'error',
 signal:AbortSignal.timeout(40000),
 headers:{authorization:'Bearer '+apiKey,'content-type':'application/json'},
 body:JSON.stringify({model:'gpt-4.1-mini',tool_choice:'none',
 max_output_tokens:800,input:[
  {role:'system',content:[{type:'input_text',text:
   'You are Riley (software engineering) and Taylor (operations), jointly '+
   'investigating a real recurring CI failure. Your observations are ONLY '+
   'the independently read GitHub run statuses and commit SHAs. '+
   'Write an engineering-oriented concise current-state diagnosis and '+
   'reliability follow-up in plain English. You may say historical runs '+
   'failed and current runs succeeded. You MUST NOT assert that the exact '+
   'historical root cause was identified or fixed, or that any code repair '+
   'was installed or the whole shift finished. Recommend an exact next '+
   'test or source review to isolate historical cause. No tools.'}]},
  {role:'user',content:[{type:'input_text',
   text:'Evidence JSON from GitHub: '+JSON.stringify(ctx)}]}
 ]})});
if(!response.ok)deny('OPENAI_SHIFT_TRIAGE_HTTP_'+response.status);
const o=await response.json();
const answer=(typeof o.output_text==='string'?o.output_text:
 (o.output||[]).flatMap(x=>x.content||[])
 .filter(x=>x.type==='output_text'&&typeof x.text==='string')
 .map(x=>x.text).join('\n')).trim();
if(o.status!=='completed'||!/^resp_[A-Za-z0-9_-]{4,160}$/.test(o.id||'')||
 answer.length<100||answer.length>2200)
 deny('CURRENT_STATE_MODEL_ADVICE_NOT_GROUNDED');
const content=[
 '## Reality · Riley + Taylor — Current CI reliability investigation',
 'Original job: `'+manifest.original_work_id+'`',
 'Source issue: '+SOURCE,
 'Historical failure run: `'+OLD+'`',
 'Current success run IDs: `'+current.map(x=>x.id).join(',')+'`',
 '',
 '### Current verified outcome',
 'The earlier execution-engine CI failure is independently confirmed, but '+
 'the three most recent qualifying runs examined were successful. '+
 'There is **no fresh CI failure demonstrated by these checks**. '+
 'This completes a current-state investigation; it does not prove the '+
 'historical underlying defect was identified or repaired.',
 '',
 '### Shared OpenAI engineering and reliability assessment',
 answer,
 '',
 '### Evidence / boundaries',
 'This is a real source-backed investigation under the same authorized '+
 'Riley + Taylor shift, not a code fix, capability installation, production '+
 'change, employee replacement or measured labor saving.',
 '<!-- reality-riley-triage-original:'+manifest.original_work_id+' -->'
].join('\n');
fs.mkdirSync('benchmark-results/riley-unattended-143',{recursive:true});
const artifact={
 version:'reality-riley-143-actual-provider-model-investigation-v1',
 original_work_id:manifest.original_work_id,
 shift_id:SHIFT,source_ref:SOURCE,
 source_proof_sha256:manifest.source_proof_sha256,
 request_commit_sha:commit,
 historical_failed_run_id:OLD,
 current_verified_success_run_ids:current.map(x=>x.id),
 current_run_head_shas:current.map(x=>x.head_sha),
 model_response_id:o.id,
 finding:'HISTORICAL_FAILURE_VERIFIED_CURRENT_EXECUTION_ENGINE_PASSES',
 historical_root_cause_proven_fixed:false,
 independent_provider_run_statuses_verified:true,
 code_repair_completed:false,
 original_job_completed:false,
 installation_authorized:false,production_changed:false,
 issue_comment_body:content,
 issue_comment_body_sha256:'sha256:'+
  createHash('sha256').update(content).digest('hex')
};
fs.writeFileSync('benchmark-results/riley-unattended-143/investigation.json',
 JSON.stringify(artifact,null,2)+'\n');
console.log('RILEY_SECOND_REAL_JOB_INVESTIGATION',JSON.stringify({
 original_work_id:manifest.original_work_id,
 historical_run_id:OLD,
 current_success_runs:current.map(x=>x.id),
 model_response_id:o.id,
 no_current_failure_proven:true,
 issue_comment_pending:true,
 original_job_completed:false,
 production_changed:false
}));
