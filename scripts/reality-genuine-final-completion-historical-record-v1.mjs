// Separately signed, provider-readback final receipt recorder.
// No owner action, install, source modification or replay is performed.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const e=process.env,REPO='maloney2323/Reality';
const fail=x=>{throw Error('REALITY_HISTORICAL_FINAL_RECEIPT_RECORDER_'+x)};
const HISTORICAL_RUN=41639811554;
const WORK='work:61aa43a890e57eba12b16953a9b883c1';
if(e.GITHUB_ACTIONS!=='true'||e.GITHUB_EVENT_NAME!=='push'||
 e.GITHUB_REPOSITORY!==REPO||
 e.GITHUB_REF!=='refs/heads/feature/reality-general-capability-engine-20261101'||
 !/^[a-f0-9]{40}$/.test(e.GITHUB_SHA||'')||
 typeof e.GH_TOKEN!=='string'||e.GH_TOKEN.length<20||
 !e.ACTIONS_ID_TOKEN_REQUEST_TOKEN||!e.ACTIONS_ID_TOKEN_REQUEST_URL)
 fail('PINNED_SIGNED_WORKER_REQUIRED');
const report=JSON.parse(readFileSync(
 'artifact/verify/reality-independent-final-completion-verifier.json','utf8'));
if(report.schema!=='reality-independent-final-completion-verification-v1'||
 !/^work:[a-f0-9]{32}$/.test(report.original_work_id||'')||
 !/^[a-f0-9]{64}$/.test(report.artifact_sha256||'')||
 !/^[a-f0-9]{40}$/.test(report.installed_commit_sha||'')||
 !/^[a-f0-9-]{36}$/.test(report.settlement_event_id||'')||
 report.original_work_id!==WORK||
 report.provider_run_id!==HISTORICAL_RUN||
 report.historical_original_run_id!==HISTORICAL_RUN||
 report.historical_recovery_run_id!==Number(e.GITHUB_RUN_ID)||
 report.negative_cases_rejected!==5||
 report.independent_provider_job_graph_verified!==true||
 report.isolated_execution!==true||
 report.issued_authorizations!==0||
 report.production_changed!==false||
 report.result?.verified!==true||
 report.result.status!=='VERIFIED_SETTLED'||
 report.result.original_work_id!==report.original_work_id||
 report.result.production_changed!==false)
 fail('INDEPENDENT_FINAL_VERIFIER_REPORT_NOT_VALID');
const provider=await fetch(
 'https://api.github.com/repos/'+REPO+'/actions/runs/'+e.GITHUB_RUN_ID+'/artifacts?per_page=100',{
 cache:'no-store',redirect:'error',
 headers:{authorization:'Bearer '+e.GH_TOKEN,
  accept:'application/vnd.github+json','x-github-api-version':'2022-11-28'}});
if(!provider.ok)fail('VERIFIER_ARCHIVE_PROVIDER_UNAVAILABLE');
const archives=(await provider.json()).artifacts||[];
const exact=archives.filter(a=>
 a.name==='reality-independent-historical-final-completion-verifier-'+e.GITHUB_RUN_ID&&
 a.expired===false&&/^sha256:[a-f0-9]{64}$/.test(String(a.digest||'')));
if(exact.length!==1)fail('SIGNED_PROVIDER_VERIFIER_ARTIFACT_NOT_UNIQUE');
const auth=new URL(e.ACTIONS_ID_TOKEN_REQUEST_URL);
auth.searchParams.set('audience','reality-genuine-capability-auto-admit-v1');
const id=await fetch(auth,{cache:'no-store',redirect:'error',
 headers:{authorization:'Bearer '+e.ACTIONS_ID_TOKEN_REQUEST_TOKEN}});
if(!id.ok)fail('GITHUB_SIGNED_IDENTITY_UNAVAILABLE');
const jwt=(await id.json()).value;
const proof={
 schema:report.schema,original_work_id:report.original_work_id,
 artifact_sha256:report.artifact_sha256,
 installed_commit_sha:report.installed_commit_sha,
 provider_run_id:report.provider_run_id,
 settlement_event_id:report.settlement_event_id,
 result:report.result,verifier_artifact_digest:exact[0].digest
};
const r=await fetch(
 'https://hvkfreoagbrphwghjajw.supabase.co/functions/v1/reality-genuine-capability-auto-admit',{
 method:'POST',redirect:'error',cache:'no-store',
 headers:{authorization:'Bearer '+jwt,'content-type':'application/json',
  'x-reality-github-provider-token':e.GH_TOKEN},
 body:JSON.stringify({action:'final_receipt_historical_record',
  scope:{repository_sha:e.GITHUB_SHA,original_work_id:report.original_work_id},proof})});
const receipt=await r.json().catch(()=>null);
if(!r.ok||receipt?.ok!==true||
 receipt.status!=='FULL_LOOP_INDEPENDENTLY_VERIFIED'||
 receipt.original_work_id!==report.original_work_id||
 receipt.artifact_sha256!==report.artifact_sha256||
 receipt.installed_commit_sha!==report.installed_commit_sha||
 receipt.provider_run_id!==report.provider_run_id||
 receipt.settlement_event_id!==report.settlement_event_id||
 receipt.verifier_artifact_digest!==exact[0].digest||
 receipt.independent_readback_verified!==true||
 receipt.production_changed!==false)
 fail('FINAL_RECEIPT_DURABLE_INDEPENDENT_READBACK_FAILED');
mkdirSync('artifact/out',{recursive:true});
writeFileSync('artifact/out/reality-final-original-customer-receipt.json',
 JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
console.log('REALITY_FULL_LOOP_FINAL_RECEIPT_DURABLY_VERIFIED',
 JSON.stringify({original_work_id:receipt.original_work_id,
  artifact_sha256:receipt.artifact_sha256,
  settlement_event_id:receipt.settlement_event_id,
  independent_readback_verified:true,production_changed:false}));
