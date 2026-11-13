import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dispatchGenuineCapabilityWake}
 from '../src/reality-genuine-capability-github-wakeup-v1.js';
const trigger='11111111-1111-4111-8111-111111111111';
const event='22222222-2222-4222-8222-222222222222';
const work='work:'+'a'.repeat(32);
const env={VERCEL_ENV:'preview',REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'hvkfreoagbrphwghjajw',
 REALITY_BUILDER_DISPATCH_GITHUB_TOKEN:'isolated-preview-only-test-token-abcdefghijklmnopqrstuvwxyz'};
const path='reality-genuine-triggers/'+trigger+'.json';
const original=JSON.stringify({trigger_id:trigger,source_event_id:event,original_work_id:work},null,2)+'\n';
function mock({existing=false,tamper=false}={}){
 const calls=[],base='a'.repeat(40),commit='b'.repeat(40);
 let created=existing;
 const fetchImpl=async(url,options)=>{
  const pathInfo=new URL(url).pathname;
  calls.push({path:pathInfo,method:options.method,body:options.body});
  let body,status=200;
  if(pathInfo.endsWith('/git/ref/heads/feature/reality-general-capability-engine-20261101')){
   body={object:{sha:base}};
  }else if(pathInfo.includes('/contents/reality-genuine-triggers/')){
   if(options.method==='PUT'){
    status=201;created=true;
    body={commit:{sha:commit},content:{path}};
   }else if(!created){status=404;body={message:'Not Found'}}
   else {body={path,content:Buffer.from(tamper?'other':original).toString('base64')}}
  }else throw Error('Unexpected GitHub API access '+pathInfo);
  return {ok:status<300,status,json:async()=>body};
 };
 return {fetchImpl,calls};
}
test('real source-bound gap performs exactly one isolated GitHub wake write',async()=>{
 const m=mock();
 const result=await dispatchGenuineCapabilityWake({
  trigger_id:trigger,source_event_id:event,original_work_id:work,env,
  fetchImpl:m.fetchImpl});
 assert.equal(result.dispatched,true);
 assert.equal(result.existing,false);
 assert.equal(result.installation_authorized,false);
 assert.equal(result.original_job_completed,false);
 const writes=m.calls.filter(c=>c.method==='PUT');
 assert.equal(writes.length,1);
 const submitted=JSON.parse(writes[0].body);
 assert.equal(submitted.branch,'feature/reality-general-capability-engine-20261101');
 assert.equal(Buffer.from(submitted.content,'base64').toString('utf8'),original);
});
test('identical existing wake is idempotent; changed source fails closed',async()=>{
 const a=mock({existing:true});
 const result=await dispatchGenuineCapabilityWake({
  trigger_id:trigger,source_event_id:event,original_work_id:work,
  env,fetchImpl:a.fetchImpl});
 assert.equal(result.existing,true);
 assert.equal(a.calls.filter(x=>x.method==='PUT').length,0);
 const b=mock({existing:true,tamper:true});
 await assert.rejects(dispatchGenuineCapabilityWake({
  trigger_id:trigger,source_event_id:event,original_work_id:work,
  env,fetchImpl:b.fetchImpl}),/GENUINE_WAKE_DISPATCH_EXISTING_WAKE_DIFFERENT_SOURCE/);
 assert.equal(b.calls.filter(x=>x.method==='PUT').length,0);
});
test('no production, missing credential, unrelated work, or forged scope can wake worker',async()=>{
 for(const inputs of [
  {env:{...env,VERCEL_ENV:'production'}},
  {env:{...env,REALITY_BUILDER_DISPATCH_GITHUB_TOKEN:''}},
  {trigger_id:'invalid'},
  {source_event_id:'invalid'},
  {original_work_id:'work:'+'x'.repeat(32)},
 ]){
  const m=mock();
  await assert.rejects(dispatchGenuineCapabilityWake({
   trigger_id:trigger,source_event_id:event,original_work_id:work,
   env,fetchImpl:m.fetchImpl,...inputs}),/GENUINE_WAKE_DISPATCH_/);
  assert.equal(m.calls.length,0);
 }
});

test('source-bound wake targets full governed pipeline, not inert inspection',()=>{
 const full=readFileSync(new URL('../.github/workflows/reality-genuine-capability-auto-trigger-v1.yml',import.meta.url),'utf8');
 const wake=readFileSync(new URL('../src/reality-genuine-capability-github-wakeup-v1.js',import.meta.url),'utf8');
 assert.ok(wake.includes("const BRANCH='feature/reality-general-capability-engine-20261101';"));
 assert.ok(wake.includes('reality-genuine-capability-auto-trigger-v1.yml'));
 assert.ok(full.includes('branches: [feature/reality-general-capability-engine-20261101]'));
 for(const required of [
  'Signed automatic owner-evidence admission',
  'Reconcile signed original frozen failure',
  'generate_missing_capability:',
  'verify_missing_capability:',
  'qualify_verified_capability:',
  'activate_owner_approved_preview:',
  'resume_original_job:',
  'record_independent_original_settlement:',
  'scripts/reality-genuine-qualify-v1.mjs',
  'scripts/reality-genuine-original-settle-v1.mjs'
 ])assert.ok(full.includes(required),'Full-loop stage absent: '+required);
});

const shiftId='33333333-3333-4333-8333-333333333333';
const issue='https://github.com/maloney2323/Reality/issues/263';
const sourceProof='sha256:'+'d'.repeat(64);
const isolatedDb={
 project:'hvkfreoagbrphwghjajw',
 url:'https://hvkfreoagbrphwghjajw.supabase.co',
 secretKey:'isolated-test-service-only-database-key'
};
const scoped={trigger_id:trigger,source_event_id:event,original_work_id:work,
 shift_id:shiftId,source_ref:issue,source_proof_sha256:sourceProof,
 db:isolatedDb,
 env:{VERCEL_ENV:'preview',
  REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'hvkfreoagbrphwghjajw'}
};
test('existing service-authenticated Supabase broker replaces a separate preview GitHub token',async()=>{
 const calls=[];
 const outcome=await dispatchGenuineCapabilityWake({...scoped,
  fetchImpl:async(url,options)=>{
   calls.push({url,options});
   return {ok:true,json:async()=>({
    ok:true,status:'EXISTING_CAPABILITY_WAKE_TRANSPORT_CONFIRMED',
    existing_idempotent_delivery:false,
    worker_acknowledged:false,installation_authorized:false,
    original_job_completed:false,production_changed:false,
    no_new_job_created:true
   })};
  }});
 assert.equal(outcome.dispatched,true);
 assert.equal(outcome.worker_execution_acknowledged,false);
 assert.equal(outcome.original_job_completed,false);
 assert.equal(outcome.installation_authorized,false);
 assert.equal(calls.length,1);
 assert.equal(calls[0].url,
  isolatedDb.url+'/functions/v1/reality-employee-capability-wake-broker-v1');
 assert.equal(calls[0].options.method,'POST');
 assert.deepEqual(JSON.parse(calls[0].options.body),{
  shift_id:shiftId,original_work_id:work,trigger_id:trigger,
  source_ref:issue,source_proof_sha256:sourceProof});
 assert.equal(calls[0].options.headers.apikey,isolatedDb.secretKey);
 assert.equal(calls[0].options.headers.authorization,
  'Bearer '+isolatedDb.secretKey);
 assert.equal(calls.some(x=>x.url.includes('github.com')),false);
});
test('broker source scope must match exact owner-approved original before network access',async()=>{
 let calls=0;
 for(const delta of [
  {shift_id:'another'},{source_ref:'https://example.org/issues/263'},
  {source_proof_sha256:'sha256:wrong'},
  {db:{...isolatedDb,project:'different'}},
  {db:{...isolatedDb,secretKey:''}},
  {env:{...scoped.env,VERCEL_ENV:'production'}}
 ]){
  await assert.rejects(dispatchGenuineCapabilityWake({...scoped,...delta,
   fetchImpl:async()=>{calls++;throw Error('NOT_REACHABLE')}}),
   /GENUINE_WAKE_DISPATCH_/);
 }
 assert.equal(calls,0);
});
test('broker unverified effect or stale source never falls back to a GitHub write',async()=>{
 for(const observed of [
  {ok:false,status:'BROKER_DELIVERY_REQUIRES_RECONCILIATION'},
  {ok:true,status:'NO_ELIGIBLE_CAPABILITY_WAKE'},
  {ok:true,status:'EXISTING_CAPABILITY_WAKE_TRANSPORT_CONFIRMED',
   existing_idempotent_delivery:false,worker_acknowledged:true,
   installation_authorized:false,original_job_completed:false,
   production_changed:false,no_new_job_created:true}
 ]){
  let calls=0;
  await assert.rejects(dispatchGenuineCapabilityWake({...scoped,
   fetchImpl:async()=>{calls++;return{
    ok:true,json:async()=>observed
   }}}),/GENUINE_WAKE_DISPATCH_INDEPENDENT_BROKER_DELIVERY_READBACK_REQUIRED/);
  assert.equal(calls,1);
 }
});
