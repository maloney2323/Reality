import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {wakeApprovedIsolatedInstall} from '../src/reality-genuine-approved-install-wake-v1.js';
const receipt={status:'OWNER_APPROVED_ISOLATED_INSTALL_PENDING',target_environment:'ISOLATED_PREVIEW',
 approval_origin:'AUTHENTICATED_OWNER_EXPLICIT_ACTION',source_installation_completed:false,
 production_changed:false,original_job_completed:false,
 approval_id:'11111111-1111-4111-8111-111111111111',
 trigger_id:'22222222-2222-4222-8222-222222222222',
 original_work_id:'work:'+'a'.repeat(32),artifact_sha256:'b'.repeat(64)};
const env={VERCEL_ENV:'preview',REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'hvkfreoagbrphwghjajw',
 REALITY_BUILDER_DISPATCH_GITHUB_TOKEN:'test-token-with-sufficient-length-123'};
function provider(){let content=null,writes=0;return {
 get writes(){return writes},
 fetchImpl:async(url,options)=>{
  const m=options.method;
  if(url.includes('/git/ref/heads/'))return {ok:true,status:200,json:async()=>({object:{sha:'a'.repeat(40)}})};
  if(url.includes('/contents/')&&m==='GET')return content===null?
   {ok:false,status:404,json:async()=>({})}:
   {ok:true,status:200,json:async()=>({path:'reality-approved-install-wakes/'+receipt.approval_id+'.json',
    content:Buffer.from(content).toString('base64')})};
  if(url.includes('/contents/')&&m==='PUT'){
   writes++;content=Buffer.from(JSON.parse(options.body).content,'base64').toString('utf8');
   return {ok:true,status:201,json:async()=>({commit:{sha:'c'.repeat(40)},
    content:{path:'reality-approved-install-wakes/'+receipt.approval_id+'.json'}})};
  }
  throw Error('UNEXPECTED_GITHUB_ACTION');
 }};}
test('a single exact owner approval wakes only its existing isolated worker',async()=>{
 const p=provider();
 const first=await wakeApprovedIsolatedInstall({receipt,env,fetchImpl:p.fetchImpl});
 assert.equal(first.status,'SIGNED_WORKER_WAKE_COMMITTED');
 assert.equal(first.worker_execution_started,false);
 assert.equal(first.production_changed,false);
 const second=await wakeApprovedIsolatedInstall({receipt,env,fetchImpl:p.fetchImpl});
 assert.equal(second.status,'SIGNED_WORKER_WAKE_ALREADY_PRESENT');
 assert.equal(p.writes,1);
});
test('missing preview write credentials, forged approval or production must fail closed',async()=>{
 const p=provider();
 await assert.rejects(()=>wakeApprovedIsolatedInstall({receipt,env:{...env,REALITY_BUILDER_DISPATCH_GITHUB_TOKEN:''},fetchImpl:p.fetchImpl}),/TOKEN_REQUIRED/);
 for(const incorrect of [
  {...receipt,approval_origin:'MODEL'},
  {...receipt,artifact_sha256:'bad'},
  {...receipt,production_changed:true},
 ])await assert.rejects(()=>wakeApprovedIsolatedInstall({receipt:incorrect,env,fetchImpl:p.fetchImpl}),/EXACT_DURABLE_OWNER_APPROVAL/);
 assert.equal(p.writes,0);
});

test('actual owner approval route parses as a valid module and dispatches only after database proof',()=>{
 const routePath=new URL('../api/reality/personal-qualified-capability-approve.js',import.meta.url);
 const source=readFileSync(routePath,'utf8');
 const parse=spawnSync(process.execPath,['--check',fileURLToPath(routePath)],{encoding:'utf8'});
 assert.equal(parse.status,0,parse.stderr);
 assert.doesNotMatch(source,/\\n from '\.\.\//);
 const rpc=source.indexOf('reality_owner_approve_qualified_preview_v1');
 const validate=source.indexOf("receipt?.approval_origin!=='AUTHENTICATED_OWNER_EXPLICIT_ACTION'");
 const wake=source.indexOf('wake=await wakeApprovedIsolatedInstall({receipt})');
 assert.ok(rpc>0&&validate>rpc&&wake>validate,'wake only after exact durable signed owner receipt');
 assert.match(source,/SIGNED_WORKER_WAKE_COMMITTED/);
 assert.match(source,/SIGNED_WORKER_WAKE_ALREADY_PRESENT/);
 assert.match(source,/WORKER_WAKE_NOT_VERIFIED/);
 assert.match(source,/SIGNED_DEFAULT_BRANCH_SCHEDULER_POLL/);
 assert.match(source,/AWAITING_INDEPENDENT_GITHUB_SCHEDULED_DISPATCH/);
 assert.match(source,/AUTO_TRIGGER_PENDING_NO_SECOND_OWNER_ACTION/);
 assert.match(source,/auto_trigger_instant:false/);
 assert.match(source,/retry_owner_approval:false/);
 assert.match(source,/worker_execution_started:false/);
 assert.match(source,/installation_completed:false/);
 assert.match(source,/original_job_completed:false/);
});

// The default-branch GitHub Actions worker is the credential-free fallback:
// it obtains a short-lived GITHUB_TOKEN and verifies the durable owner approval
// with signed OIDC; the preview's absent token cannot grant model authority.
test('signed automatic fallback is independent of the browser and fails closed before actual worker execution',()=>{
 const route=readFileSync('api/reality/personal-qualified-capability-approve.js','utf8');
 const home=readFileSync('index.html','utf8');
 const broker=readFileSync('.github/workflows/reality-governed-approved-scheduler-v1.yml','utf8');
 assert.match(route,/auto_trigger_fallback:'SIGNED_DEFAULT_BRANCH_SCHEDULER_POLL'/);
 assert.match(route,/auto_trigger_instant:false/);
 assert.match(route,/worker_execution_started:false/);
 assert.match(home,/worker start is NOT yet verified/);
 assert.match(broker,/reality-governed-approved-scheduler/);
 assert.match(broker,/genuine_pending_approvals/);
 assert.match(broker,/id-token: write/);
 assert.match(broker,/actions: write/);
 assert.match(broker,/workflow_dispatch/);
 assert.match(broker,/original_work_id/);
 assert.match(broker,/SIGNED_APPROVED_ISOLATED_WORKER_DISPATCHED/);
});
