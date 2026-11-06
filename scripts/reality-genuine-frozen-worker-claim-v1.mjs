// No service credentials in GitHub. Reproduce the exact current frozen RED
// before obtaining a single-use owner-goal-bound queue claim via signed OIDC.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const sha=x=>createHash('sha256').update(x).digest('hex');
const fail=x=>{throw Error('GENUINE_FROZEN_WORKER_'+x)};
const env=process.env;
if(env.GITHUB_ACTIONS!=='true'||env.GITHUB_EVENT_NAME!=='push'||
 env.GITHUB_REPOSITORY!=='maloney2323/Reality'||
 env.GITHUB_REF!=='refs/heads/feature/reality-general-capability-engine-20261101')
 fail('SIGNED_ISOLATED_CI_REQUIRED');
const source=JSON.parse(readFileSync(
 'artifact/genuine-capability-admitted-queue.json','utf8'));
if(source.schema!=='reality-genuine-admitted-queue-v1'||
 source.repository_sha!==env.GITHUB_SHA||
 source.installation_authorized!==false||
 source.original_job_completed!==false||
 !Array.isArray(source.queued)||source.queued.length>10)
 fail('ADMISSION_ARTIFACT_SOURCE_CHANGED');
if(source.queued.length===0){
 console.log('REALITY_UNATTENDED_WORKER_NO_NEW_PENDING_GAPS');
 process.exit(0);
}
const receipts=[];
for(const item of source.queued){
 if(item.queue_phase!=='PENDING_FROZEN_REPRODUCTION'||
   !/^work:[a-f0-9]{32}$/.test(item.original_work_id)||
   !/^[a-f0-9-]{36}$/.test(item.trigger_id)||
   !/^[a-f0-9-]{36}$/.test(item.source_event_id))
  fail('QUEUED_ORIGINAL_SCOPE_INVALID');
 // The checked-in detector is the only source of candidate names.
 const observed=JSON.parse(readFileSync(
  'artifact/genuine-capability-auto-trigger.json','utf8'));
 const possibilities=observed.findings.filter(f=>
  f.kind==='UNVERIFIED_MISSING_CAPABILITY_CANDIDATE'&&
  /^test\/reality-frozen-regressions\/[a-z0-9._-]+\.test\.js$/.test(f.test_path)&&
  /^src\/reality-extensions\/[a-z0-9._-]+\.mjs$/.test(f.candidate_module_path)&&
  !existsSync(f.candidate_module_path)&&
  existsSync(f.test_path)&&
  sha(readFileSync(f.test_path))===f.frozen_sha256);
 // A candidate is matched to the actual queued ORIGINAL by broker source
 // verification, never by order or a predetermined module.
 if(!possibilities.length)fail('INDEPENDENT_FROZEN_CANDIDATE_REQUIRED');
 const attempted=[];
 for(const test of possibilities){
  const run=spawnSync(process.execPath,['--test',test.test_path],{
   encoding:'utf8',timeout:60000,maxBuffer:200000,
   env:{PATH:env.PATH,HOME:env.HOME,CI:'true',NODE_OPTIONS:'--no-warnings'}});
  const output=String(run.stdout||'')+'\n'+String(run.stderr||'');
  if(run.status!==0&&Number.isInteger(run.status)&&
     /ERR_MODULE_NOT_FOUND|Cannot find module/.test(output)&&
     output.includes(test.candidate_module_path))
   attempted.push({...test,exit_code:run.status,output_sha256:sha(output)});
 }
 // Contact the provider with bounded original candidates; it will only
 // claim the one whose owner, original job, goal, frozen path and source match.
 let claimed=null;
 for(const test of attempted){
  const u=new URL(env.ACTIONS_ID_TOKEN_REQUEST_URL||'');
  u.searchParams.set('audience','reality-genuine-capability-auto-admit-v1');
  const id=await fetch(u,{method:'GET',cache:'no-store',redirect:'error',
   headers:{authorization:'Bearer '+(env.ACTIONS_ID_TOKEN_REQUEST_TOKEN||'')}});
  if(!id.ok)fail('OIDC_PROVIDER_UNAVAILABLE');
  const jwt=(await id.json()).value;
  if(typeof jwt!=='string'||jwt.length<300)fail('OIDC_TOKEN_UNAVAILABLE');
  const proof={trigger_id:item.trigger_id,source_event_id:item.source_event_id,
   original_work_id:item.original_work_id,
   frozen_test_path:test.test_path,
   candidate_module_path:test.candidate_module_path,
   frozen_test_sha256:test.frozen_sha256,
   repository_sha:env.GITHUB_SHA,
   reproduced_failure:true,exit_code:test.exit_code,
   output_sha256:test.output_sha256,
   external_action_performed:false,installation_authorized:false};
  const response=await fetch(
   'https://hvkfreoagbrphwghjajw.supabase.co/functions/v1/reality-genuine-capability-auto-admit',{
   method:'POST',cache:'no-store',redirect:'error',
   headers:{authorization:'Bearer '+jwt,'content-type':'application/json'},
   body:JSON.stringify({action:'claim',proof})});
  const answer=await response.json().catch(()=>null);
  if(response.ok&&answer?.ok===true&&
     answer.status==='ORIGINAL_FROZEN_FAILURE_CLAIMED'&&
     answer.original_work_id===item.original_work_id&&
     answer.trigger_id===item.trigger_id&&
     answer.source_event_id===item.source_event_id&&
     answer.model_generated===false&&
     answer.installation_authorized===false&&
     answer.original_job_completed===false){
   claimed=answer;break;
  }
  // A denial may mean a different frozen test or a stale goal. Do not
  // self-authorize or brute-force a source; preserve original id unchanged.
 }
 if(!claimed)fail('GOVERNED_ATOMIC_CLAIM_NOT_VERIFIED');
 receipts.push(claimed);
}
writeFileSync('artifact/genuine-capability-worker-claim.json',
 JSON.stringify({schema:'reality-genuine-worker-claim-v1',
 repository_sha:env.GITHUB_SHA,claims:receipts,
 installation_authorized:false,original_job_completed:false},null,2)+'\n');
console.log('REALITY_GENUINE_WORKER_REPRODUCED_AND_CLAIMED',
 JSON.stringify({count:receipts.length,
  original_work_ids:receipts.map(r=>r.original_work_id),
  claim_ids:receipts.map(r=>r.claim_id),model_generated:false,
  installation_authorized:false,original_job_completed:false}));
