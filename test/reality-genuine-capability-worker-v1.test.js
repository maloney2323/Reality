import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectSignedInertWake}
 from '../scripts/reality-genuine-capability-worker-v1.mjs';
import {readFileSync} from 'node:fs';

const trigger='11111111-1111-4111-8111-111111111111';
const source='22222222-2222-4222-8222-222222222222';
const work='work:'+'a'.repeat(32);
const sha='f'.repeat(40);
const env={
 GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:'maloney2323/Reality',
 GITHUB_REF:'refs/heads/feature/reality-genuine-capability-worker-20261101',
 GITHUB_EVENT_NAME:'push',GITHUB_SHA:sha,
 ACTIONS_ID_TOKEN_REQUEST_URL:'https://example.invalid/oidc',
 ACTIONS_ID_TOKEN_REQUEST_TOKEN:'test-actions-oidc-request-token',
};
const request={trigger_id:trigger,source_event_id:source,original_work_id:work};
function provider({bad=false}={}){
 const calls=[];
 const fetchImpl=async(url,options)=>{
  calls.push({url,method:options.method,authorization:options.headers?.authorization,
   body:options.body});
  if(url.startsWith('https://example.invalid/oidc')){
   return {ok:true,json:async()=>({value:'a'.repeat(350)})};
  }
  assert.match(url,/hvkfreoagbrphwghjajw\.supabase\.co\/functions\/v1\/reality-genuine-capability-wake/);
  const json=JSON.parse(options.body);
  assert.equal(json.action,'inspect');
  assert.equal(json.trigger_id,trigger);
  assert.equal(json.source_event_id,source);
  return {ok:!bad,json:async()=>({
   ok:!bad,
   status:bad?'UNVERIFIED':'GENUINE_GAP_VERIFIED_AWAITING_PROVIDER_FROZEN_REPRODUCTION',
   trigger_id:trigger,source_event_id:source,original_work_id:work,
   github_oidc_verified:true,claim_consumed:false,
   service_credential_returned:false,installation_authorized:false,
   original_job_completed:false})};
 };
 return {fetchImpl,calls};
}
test('signed unattended wake independently rechecks source and does not claim or install',async()=>{
 const p=provider();
 const observed=await inspectSignedInertWake({env,request,checkoutSha:sha,
  fetchImpl:p.fetchImpl});
 assert.equal(observed.status,'GENUINE_GAP_AWAITING_INDEPENDENT_FROZEN_REPRODUCTION');
 assert.equal(observed.original_job_completed,false);
 assert.equal(observed.claim_consumed,false);
 assert.equal(p.calls.length,2);
 assert.equal(p.calls[1].authorization,'Bearer '+'a'.repeat(350));
 assert.ok(!JSON.stringify(observed).includes('a'.repeat(300)));
});
test('no unverified provider response or improper workflow identity can consume claim',async()=>{
 const f=provider({bad:true});
 await assert.rejects(inspectSignedInertWake({env,request,checkoutSha:sha,
  fetchImpl:f.fetchImpl}),/GENUINE_CAPABILITY_WORKER_INDEPENDENT_PROVIDER_AND_CURRENT_GOAL_READBACK_REQUIRED/);
 for(const change of [
  {GITHUB_EVENT_NAME:'workflow_dispatch'},
  {GITHUB_REF:'refs/heads/main'},
  {GITHUB_SHA:'changed'},
  {GITHUB_REPOSITORY:'attacker/repo'},
 ]){
  let invoked=false;
  await assert.rejects(inspectSignedInertWake({
   env:{...env,...change},request,checkoutSha:sha,
   fetchImpl:async()=>{invoked=true;throw Error('FAIL')},
  }),/GENUINE_CAPABILITY_WORKER_EXACT_ISOLATED_ACTIONS_IDENTITY_REQUIRED/);
  assert.equal(invoked,false);
 }
});
test('inert request must preserve exact identity and never contain extra authority fields',async()=>{
 const f=provider();
 await assert.rejects(inspectSignedInertWake({
  env,checkoutSha:sha,request:{...request,installation_authorized:true},
  fetchImpl:f.fetchImpl}),/GENUINE_CAPABILITY_WORKER_SOURCE_BOUND_INERT_REQUEST_REQUIRED/);
 assert.equal(f.calls.length,0);
});
test('signed Edge function verifies GitHub JWT and never returns the service role key',()=>{
 const text=readFileSync(new URL('../supabase/functions/reality-genuine-capability-wake/index.ts',import.meta.url),'utf8');
 assert.match(text,/crypto\.subtle\.verify\(/);
 assert.match(text,/claims\.workflow_ref!==REF/);
 assert.match(text,/claims\.event_name!=='push'/);
 assert.match(text,/metadata\.head_sha!==claims\.sha/);
 assert.match(text,/reality_read_genuine_capability_wake_v1/);
 assert.match(text,/service_credential_returned:false/);
 assert.doesNotMatch(text,/return response\(\{[^}]*secret/);
});
