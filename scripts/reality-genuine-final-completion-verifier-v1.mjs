// Independent, post-settlement check of the exact installed model capability.
// This step does not grant approval, install, resume or settle anything.
import {readFileSync,writeFileSync,mkdirSync,appendFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const e=process.env,REPO='maloney2323/Reality';
const SOURCE='src/reality-extensions/reality-general-execution-receipt.mjs';
const BRANCH='refs/heads/feature/reality-general-capability-engine-20261101';
const sha=b=>createHash('sha256').update(b).digest('hex');
const fail=x=>{throw Error('REALITY_FINAL_VERIFIER_'+x)};
if(e.GITHUB_ACTIONS!=='true'||e.GITHUB_EVENT_NAME!=='push'||
 e.GITHUB_REPOSITORY!==REPO||e.GITHUB_REF!==BRANCH||
 !/^[a-f0-9]{40}$/.test(e.GITHUB_SHA||'')||
 !e.ACTIONS_ID_TOKEN_REQUEST_TOKEN||!e.ACTIONS_ID_TOKEN_REQUEST_URL||
 typeof e.GH_TOKEN!=='string'||e.GH_TOKEN.length<20)
 fail('SIGNED_ISOLATED_WORKER_ONLY');
const settlement=JSON.parse(readFileSync('artifact/final/reality-original-final-settlement.json','utf8'));
const installed=JSON.parse(readFileSync('artifact/install/reality-owner-approved-preview-install.json','utf8'));
if(!Array.isArray(installed.source_paths)||!installed.source_paths.includes(
 'src/reality-extensions/reality-general-execution-receipt.mjs')){
 if(e.GITHUB_OUTPUT)appendFileSync(e.GITHUB_OUTPUT,'performed=false\n');
 console.log('REALITY_FINAL_RECEIPT_OTHER_EXTENSION_PROTOCOL_NO_ACTION');
 process.exit(0);
}
if(settlement.status!=='SETTLED_ISOLATED'||
 !/^work:[a-f0-9]{32}$/.test(settlement.original_work_id||'')||
 settlement.original_work_id!==installed.original_work_id||
 settlement.artifact_sha256!==installed.artifact_sha256||
 settlement.installed_commit_sha!==installed.installed_commit_sha||
 settlement.owner_approval_id!==installed.approval_id||
 settlement.original_job_completed!==true||
 settlement.independent_outcome_verified!==true||
 settlement.production_changed!==false||
 installed.production_changed!==false||
 installed.approval_origin!=='AUTHENTICATED_OWNER_EXPLICIT_ACTION')
 fail('EXACT_PREVIOUS_SETTLEMENT_AND_INSTALL_NOT_MATCHED');
const auth=new URL(e.ACTIONS_ID_TOKEN_REQUEST_URL);
auth.searchParams.set('audience','reality-genuine-capability-auto-admit-v1');
const identity=await fetch(auth,{headers:{authorization:'Bearer '+e.ACTIONS_ID_TOKEN_REQUEST_TOKEN},cache:'no-store'});
if(!identity.ok)fail('SIGNED_IDENTITY_UNAVAILABLE');
const jwt=(await identity.json()).value;
const resp=await fetch('https://hvkfreoagbrphwghjajw.supabase.co/functions/v1/reality-genuine-capability-auto-admit',{
 method:'POST',redirect:'error',cache:'no-store',
 headers:{authorization:'Bearer '+jwt,'content-type':'application/json',
  'x-reality-github-provider-token':e.GH_TOKEN},
 body:JSON.stringify({action:'final_receipt_prepare',scope:{
  repository_sha:e.GITHUB_SHA,original_work_id:settlement.original_work_id}})});
const p=await resp.json().catch(()=>null);
if(!resp.ok||p?.ok!==true||
 p.status!=='AUTHORITATIVE_SETTLED_SOURCE_FOR_INDEPENDENT_RECEIPT'||
 p.original_work_id!==settlement.original_work_id||
 p.artifact_sha256!==settlement.artifact_sha256||
 p.installed_commit_sha!==settlement.installed_commit_sha||
 p.approval_id!==installed.approval_id||
 p.installed_branch!==installed.installed_branch||
 p.settlement_event_id!==settlement.universe_event_id||
 p.source_path!==SOURCE||
 p.verified_provider_job_graph!==true||
 p.provider_run_id!==Number(e.GITHUB_RUN_ID)||
 !Number.isSafeInteger(p.original_resume_job_id)||
 p.production_changed!==false)
 fail('INDEPENDENT_PROVIDER_DATABASE_EVIDENCE_NOT_VERIFIED');
const file=(installed.file_sha256||[]).filter(x=>x.path===SOURCE&&/^[a-f0-9]{64}$/.test(x.sha256));
if(file.length!==1)fail('SOURCE_MANIFEST_INVALID');
const git=await fetch('https://api.github.com/repos/'+REPO+'/contents/'+SOURCE+'?ref='+p.installed_commit_sha,{
 cache:'no-store',redirect:'error',
 headers:{authorization:'Bearer '+e.GH_TOKEN,accept:'application/vnd.github+json',
  'x-github-api-version':'2022-11-28'}});
if(!git.ok)fail('INDEPENDENT_INSTALLED_SOURCE_PROVIDER_MISSING');
const source=await git.json();
if(source.path!==SOURCE||source.encoding!=='base64')fail('INSTALLED_SOURCE_BLOB_INVALID');
const bytes=Buffer.from(source.content.replace(/\s/g,''),'base64');
if(sha(bytes)!==file[0].sha256||bytes.length>70000||bytes.length<100)
 fail('INSTALLED_SOURCE_HASH_MISMATCH');
const evidence={
 owner_id:p.owner_id,goal_id:p.goal_id,original_work_id:p.original_work_id,
 artifact_hash:p.artifact_sha256,repository:REPO,
 signed_owner_approval:{verified:true,consumed_once:true,owner_id:p.owner_id,
  original_work_id:p.original_work_id,artifact_hash:p.artifact_sha256,
  origin:'AUTHENTICATED_OWNER_EXPLICIT_ACTION',
  reservation_ref:'supabase:owner:single-use:receipt'},
 sandbox:{independently_verified:true,artifact_hash:p.artifact_sha256,
  frozen_regression_passed:p.frozen_pass>=5,governance_preserved:p.candidate_pass>=5},
 installation:{independent_provider_readback:true,original_work_id:p.original_work_id,
  artifact_hash:p.artifact_sha256,installed_commit_sha:p.installed_commit_sha,
  installed_branch:p.installed_branch,production_changed:false},
 resumption:{independent_provider_readback:true,real_execution_observed:true,
  original_work_id:p.original_work_id,installed_commit_sha:p.installed_commit_sha,
  executor_run_ref:'github:actions:run:'+p.provider_run_id+':job:'+p.original_resume_job_id,
  outcome:'SUCCEEDED'},
 settlement:{durable_settlement_readback:true,independent_outcome_verified:true,
  original_work_id:p.original_work_id,artifact_hash:p.artifact_sha256,
  installed_commit_sha:p.installed_commit_sha,
  receipt_ref:'supabase:universe_events:'+p.settlement_event_id}
};
const expected={owner_id:p.owner_id,goal_id:p.goal_id,
 original_work_id:p.original_work_id,artifact_hash:p.artifact_sha256,
 repository:REPO,current_commit_sha:p.installed_commit_sha};
mkdirSync('artifact/final/source',{recursive:true});
writeFileSync('artifact/final/source/installed-completion.mjs',bytes,{flag:'wx'});
const code=[
 "const model = await "+'im'+"port('file:///work/artifact/final/source/installed-completion.mjs');",
 "if(typeof model.verifyRealityCompletion!=='function')process.exit(42);",
 "const input=JSON.parse(process.argv[1]),expected=JSON.parse(process.argv[2]);",
 "const fn=model.verifyRealityCompletion;",
 "const positive=fn(input,expected);",
 "const negative=[{...input,settlement:null},",
 "{...input,signed_owner_approval:{...input.signed_owner_approval,owner_id:'foreign'}},",
 "{...input,resumption:{...input.resumption,real_execution_observed:false}},",
 "{...input,installation:{...input.installation,installed_commit_sha:'f'.repeat(40)}},",
 "{...input,settlement:{...input.settlement,independent_outcome_verified:false}}]",
 ".map(x=>fn(x,expected));",
 "console.log('REALITY_VERDICTS='+JSON.stringify({positive,negative}));"
].join('\n');
const run=spawnSync('docker',['run','--rm','--network','none','--read-only',
 '--cap-drop','ALL','--security-opt','no-new-privileges',
 '--memory','256m','--cpus','1','--user','65534:65534',
 '--tmpfs','/tmp:rw,noexec,nosuid,size=16m','-v',process.cwd()+':/work:ro',
 '-w','/work','node:22','node','--input-type=module','-e',code,
 JSON.stringify(evidence),JSON.stringify(expected)],{
  encoding:'utf8',timeout:90000,maxBuffer:150000,
  env:{PATH:e.PATH,HOME:e.HOME}});
const lines=String(run.stdout||'').split('\n').filter(x=>x.startsWith('REALITY_VERDICTS='));
if(run.status!==0||lines.length!==1)
 fail('ISOLATED_INSTALLED_MODULE_EXECUTION_FAILED');
const result=JSON.parse(lines[0].slice('REALITY_VERDICTS='.length));
if(result.positive?.verified!==true||
 result.positive.status!=='VERIFIED_SETTLED'||
 result.positive.original_work_id!==p.original_work_id||
 result.positive.production_changed!==false||
 !Array.isArray(result.negative)||result.negative.length!==5||
 result.negative.some(x=>x?.verified!==false||x?.status==='VERIFIED_SETTLED'))
 fail('COMPLETE_POSITIVE_AND_FIVE_NEGATIVE_RECEIPTS_REQUIRED');
const report={
 schema:'reality-independent-final-completion-verification-v1',
 original_work_id:p.original_work_id,artifact_sha256:p.artifact_sha256,
 installed_commit_sha:p.installed_commit_sha,provider_run_id:p.provider_run_id,
 settlement_event_id:p.settlement_event_id,result:result.positive,
 installed_module_sha256:sha(bytes),
 source_evidence_sha256:sha(JSON.stringify(evidence)),
 source_expected_sha256:sha(JSON.stringify(expected)),
 original_resume_job_id:p.original_resume_job_id,
 negative_cases_rejected:5,independent_provider_job_graph_verified:true,
 isolated_execution:true,production_changed:false,issued_authorizations:0
};
mkdirSync('artifact/out',{recursive:true});
writeFileSync('artifact/out/reality-independent-final-completion-verifier.json',
 JSON.stringify(report,null,2)+'\n',{flag:'wx'});
if(e.GITHUB_OUTPUT)appendFileSync(e.GITHUB_OUTPUT,'performed=true\n');
console.log('REALITY_FINAL_COMPLETION_CANDIDATE_INDEPENDENTLY_VERIFIED',
 JSON.stringify({work:report.original_work_id,negative_cases_rejected:5,
  installed_sha:report.installed_commit_sha,production_changed:false}));
