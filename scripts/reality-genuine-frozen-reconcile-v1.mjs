// Automatic reconciliation of Reality's already-consumed original claim.
// A new red-only Docker run does not re-claim, install, or touch production.
// All privileged DB state is re-read inside the signed Supabase service broker.
import {readFileSync,existsSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const env=process.env;
const die=c=>{throw Error('GENUINE_RECONCILE_'+c)};
const sha=v=>createHash('sha256').update(v).digest('hex');
if(!env.GH_TOKEN||env.GH_TOKEN.length<20)die('SIGNED_READ_ONLY_GITHUB_TOKEN_REQUIRED');
if(env.GITHUB_ACTIONS!=='true'||
 env.GITHUB_EVENT_NAME!=='push'||
 env.GITHUB_REPOSITORY!=='maloney2323/Reality'||
 env.GITHUB_REF!=='refs/heads/feature/reality-general-capability-engine-20261101')
 die('EXACT_GITHUB_ACTIONS_REQUIRED');
const admitted=JSON.parse(readFileSync(
 'artifact/genuine-capability-admitted-queue.json','utf8'));
const report=JSON.parse(readFileSync(
 'artifact/genuine-capability-auto-trigger.json','utf8'));
if(admitted.repository_sha!==env.GITHUB_SHA||
 report.repository_sha!==env.GITHUB_SHA||
 admitted.installation_authorized!==false||
 !Array.isArray(admitted.previously_claimed)||
 admitted.previously_claimed.length>10)
 die('SIGNED_ADMISSION_RECEIPT_MISSING');
// Same-run claims are persisted by the signed broker but must also be
// reconciled in this run. Otherwise the first real customer job waits for a
// second unrelated GitHub push before its frozen RED can become model-ready.
const claimArtifact='artifact/genuine-capability-worker-claim.json';
const newClaim=existsSync(claimArtifact)?
 JSON.parse(readFileSync(claimArtifact,'utf8')):null;
if(newClaim&&(newClaim.schema!=='reality-genuine-worker-claim-v1'||
 newClaim.repository_sha!==env.GITHUB_SHA||
 newClaim.installation_authorized!==false||
 newClaim.original_job_completed!==false||
 !Array.isArray(newClaim.claims)||newClaim.claims.length>10))
 die('SAME_RUN_SIGNED_WORKER_CLAIM_ARTIFACT_INVALID');
const newClaims=(newClaim?.claims||[]).map(claim=>{
 const pinned=(admitted.queued||[]).filter(q=>
  q.trigger_id===claim.trigger_id&&
  q.original_work_id===claim.original_work_id&&
  q.source_event_id===claim.source_event_id&&
  q.queue_phase==='PENDING_FROZEN_REPRODUCTION');
 if(pinned.length!==1||
    !/^[a-f0-9-]{36}$/.test(String(claim.claim_id||''))||
    claim.installation_authorized!==false||
    claim.original_job_completed!==false)
  die('SAME_RUN_ATOMIC_CLAIM_READBACK_CHANGED');
 return {...pinned[0],queue_phase:'LEASED_FOR_INDEPENDENT_REPRODUCTION'};
});
const selected=[...admitted.previously_claimed,...newClaims].filter(row=>
 row.queue_phase==='LEASED_FOR_INDEPENDENT_REPRODUCTION');
if(new Set(selected.map(x=>x.trigger_id)).size!==selected.length)
 die('DUPLICATE_ORIGINAL_REPRODUCTION_CLAIM');
const completed=[];
for(const row of selected){
 const potential=report.findings.filter(f=>
  f.kind==='UNVERIFIED_MISSING_CAPABILITY_CANDIDATE'&&
  /^test\/reality-frozen-regressions\/[a-z0-9._-]+\.test\.js$/.test(f.test_path)&&
  /^src\/reality-extensions\/[a-z0-9._-]+\.mjs$/.test(f.candidate_module_path)&&
  existsSync(f.test_path)&&!existsSync(f.candidate_module_path)&&
  sha(readFileSync(f.test_path))===f.frozen_sha256);
 for(const item of potential){
  // Docker is the independent worker: no network, writable repository,
  // host secrets, GitHub identity or capability installation credentials.
  const args=['run','--rm','--network','none','--read-only',
   '--cap-drop','ALL','--security-opt','no-new-privileges',
   '--memory','512m','--cpus','1','--user','65534:65534',
   '--tmpfs','/tmp:rw,noexec,nosuid,size=16m',
   '-v',process.cwd()+':/work:ro','-w','/work',
   'node:22','node','--test',item.test_path];
  const run=spawnSync('docker',args,{encoding:'utf8',timeout:120000,
   maxBuffer:200000,env:{PATH:env.PATH,HOME:env.HOME}});
  const output=String(run.stdout||'')+'\n'+String(run.stderr||'');
  if(!Number.isInteger(run.status)||run.status<1||
   !/ERR_MODULE_NOT_FOUND|Cannot find module/.test(output)||
   !output.includes(item.candidate_module_path))continue;
  const url=new URL(env.ACTIONS_ID_TOKEN_REQUEST_URL);
  url.searchParams.set('audience','reality-genuine-capability-auto-admit-v1');
  const o=await fetch(url,{headers:{
   authorization:'Bearer '+env.ACTIONS_ID_TOKEN_REQUEST_TOKEN},
   cache:'no-store',redirect:'error'});
  if(!o.ok)die('SIGNED_IDENTITY_PROVIDER_UNAVAILABLE');
  const jwt=(await o.json()).value;
  if(typeof jwt!=='string'||jwt.length<300)die('SIGNED_IDENTITY_INVALID');
  const proof={trigger_id:row.trigger_id,gap_event_id:row.source_event_id,
   original_work_id:row.original_work_id,
   frozen_test_path:item.test_path,
   frozen_sha256:item.frozen_sha256,
   candidate_source_path:item.candidate_module_path,
   runner_sha:env.GITHUB_SHA,
   status:'ORIGINAL_FROZEN_REPRODUCED_RED',exit_code:run.status,
   output_sha256:sha(output),network_disabled:true,
   installer_authorized:false,model_generated:false,production_changed:false};
  const response=await fetch(
   'https://hvkfreoagbrphwghjajw.supabase.co/functions/v1/reality-genuine-capability-auto-admit',{
   method:'POST',headers:{authorization:'Bearer '+jwt,
    'content-type':'application/json',
    'x-reality-github-provider-token':env.GH_TOKEN||''},cache:'no-store',redirect:'error',
   body:JSON.stringify({action:'reconcile',proof})});
  const outcome=await response.json().catch(()=>null);
  // Multiple unrelated frozen defects can exist. The signed broker owns
  // the original-work mapping; only its exact scope-mismatch rejection
  // is a safe negative match. Every other failure remains fatal.
  if(response.status===403&&outcome?.error==='AUTO_ADMIT_FROZEN_SOURCE_ORIGINAL_MISMATCH'){
   console.log('REALITY_FROZEN_TEST_NOT_THIS_ORIGINAL',item.test_path);
   continue;
  }
  if(!response.ok||outcome?.ok!==true)
   console.warn('REALITY_FROZEN_BROKER_SAFE_FAILURE',String(outcome?.error||'UNVERIFIED').slice(0,110),
    'http_status',response.status);
  if(!response.ok||outcome?.ok!==true||
    outcome.status!=='FROZEN_REPRODUCED_AWAITING_CANDIDATE'||
    outcome.original_work_id!==row.original_work_id||
    outcome.trigger_id!==row.trigger_id||
    outcome.installation_authorized!==false)
    die('SIGNED_FROZEN_REPRODUCTION_NOT_SETTLED');
  completed.push(outcome);
  break;
 }
 if(!completed.some(x=>x.trigger_id===row.trigger_id))
  die('ORIGINAL_FROZEN_TEST_NOT_INDEPENDENTLY_REPRODUCED');
}
writeFileSync('artifact/genuine-capability-reproduced.json',
 JSON.stringify({schema:'reality-genuine-frozen-reproduced-v1',
  repository_sha:env.GITHUB_SHA,reconciled:completed,
  installation_authorized:false,original_job_completed:false},null,2)+'\n');
console.log('REALITY_DURABLE_FROZEN_REPRODUCTION',JSON.stringify({
 original_work_ids:completed.map(x=>x.original_work_id),
 reproduced:completed.length,model_generated:false,installation_authorized:false
}));
