import test from 'node:test';
import assert from 'node:assert/strict';
const project='hvkfreoagbrphwghjajw'; // Existing broker's canonical runtime pin, not a live call.
const url='https://'+project+'.supabase.co';
const service='fixture-service-key-not-a-secret';
const github='fixture-github-token-not-a-secret';
const h=x=>'sha256:'+x.repeat(64);
const scope={mode:'release_ci',owner_id:'11111111-1111-4111-8111-111111111111',
 shift_id:'22222222-2222-4222-8222-222222222222',continuity_root_id:'33333333-3333-4333-8333-333333333333',
 original_work_id:'work:'+'4'.repeat(32),source_ref:'https://github.com/maloney2323/Reality/pull/1',
 continuity_revision:3,continuity_head_sha256:h('a'),plan_fingerprint:h('b'),qualifier_receipt_sha256:h('c'),
 release_sha:'d'.repeat(40),release_ref:'feature/broker-fixture',lifecycle_run_id:100,gateway_run_id:101};
const exact={owner_id:scope.owner_id,shift_id:scope.shift_id,continuity_root_id:scope.continuity_root_id,
 continuity_head_sha256:scope.continuity_head_sha256,revision:scope.continuity_revision};
const original={original_work_id:scope.original_work_id,source_ref:scope.source_ref,independent_source_proof_verified:true};
let handler;
globalThis.Deno={env:{get:k=>({SUPABASE_URL:url,SUPABASE_SERVICE_ROLE_KEY:service,REALITY_GITHUB_BROKER_TOKEN:github})[k]},
 serve:fn=>{handler=fn}};
await import('../supabase/functions/reality-signed-maintenance-repair-source-broker-v1/index.ts');
assert.equal(typeof handler,'function');
const nativeFetch=globalThis.fetch;
const reply=(status,value)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
async function run({body=scope,authorized=true,stale=false,changedAfter=false,foreignRepo=false,providerDenied=false}={}){
 const calls=[];
 globalThis.fetch=async (target,init)=>{
  calls.push({target:String(target),method:init.method});
  if(String(target).startsWith(url+'/rest/v1/rpc/')){
   assert.equal(init.method,'POST');assert.equal(init.headers.authorization,'Bearer '+service);
   assert.deepEqual(JSON.parse(init.body),{p_shift_id:scope.shift_id});
   const changed=stale||(changedAfter&&calls.filter(x=>x.target.includes('/actions/runs/')).length===2);
   const identity=changed?{...exact,revision:4}:exact;
   if(String(target).endsWith('/reality_read_current_final_loop_proof_envelope_v1'))
    return reply(200,{...identity,status:'FINAL_LOOP_FROZEN_SCOPE_VERIFIED_ORIGINAL_ACCEPTANCE_PENDING',
     read_only:true,independent_owner_scope_verified:true,plan_fingerprint:scope.plan_fingerprint,jobs:[original]});
   if(String(target).endsWith('/reality_read_final_loop_shared_continuity_guard_v1'))
    return reply(200,{...identity,status:'FINAL_LOOP_SHARED_CONTINUITY_CHECKED',obligations:[{...original,
     qualifier_digest_verified:true,continuity_identity_verified:true,independent_original_outcome_verified:false,
     qualifier_receipt_sha256:scope.qualifier_receipt_sha256}]});
  }
  const prefix='https://api.github.com/repos/maloney2323/Reality/actions/runs/';
  assert.ok(String(target).startsWith(prefix),'no arbitrary provider requests');
  assert.equal(init.method,'GET');assert.equal(init.headers.authorization,'Bearer '+github);
  const id=Number(String(target).slice(prefix.length));assert.ok([100,101].includes(id));
  if(providerDenied)return reply(401,{message:'synthetic provider rejection'});
  return reply(200,{id,head_sha:scope.release_sha,head_branch:scope.release_ref,
   repository:{full_name:foreignRepo?'example/foreign':'maloney2323/Reality'},
   name:id===100?'Reality Final Loop Engine lifecycle acceptance':'Reality — Isolated governed OpenAI gateway proof',
   path:id===100?'.github/workflows/reality-final-loop-engine-v1-ci.yml':'.github/workflows/reality-governed-openai-gateway-isolated-20261108.yml',
   status:'completed',conclusion:'success',event:'push',sensitive_unused_field:'synthetic-not-returned'});
 };
 try{
  const req=new Request(url+'/functions/v1/reality-signed-maintenance-repair-source-broker-v1',{
   method:'POST',headers:{apikey:authorized?service:'wrong',authorization:'Bearer '+service,'content-type':'application/json'},
   body:JSON.stringify(body)});
  const res=await handler(req);const value=await res.json();
  assert.equal(value.installation_authorized,false);assert.equal(value.original_job_completed,false);
  assert.equal(value.production_changed,false);assert.ok(!JSON.stringify(value).includes(github));
  assert.ok(!JSON.stringify(value).includes(service));assert.ok(!JSON.stringify(value).includes('synthetic-not-returned'));
  return {status:res.status,value,calls};
 }finally{globalThis.fetch=nativeFetch}
}
test('actual broker handler rejects unauthenticated and arbitrary scope without reaching provider',async()=>{
 let r=await run({authorized:false});assert.equal(r.status,403);assert.equal(r.calls.length,0);
 r=await run({body:{...scope,target_url:'https://example.invalid'}});assert.equal(r.status,400);assert.equal(r.calls.length,0);
 r=await run({stale:true});assert.equal(r.status,409);assert.equal(r.calls.filter(x=>x.target.includes('/actions/runs/')).length,0);
});
test('actual broker reads only two exact CI runs and rechecks original revision before returning bounded evidence',async()=>{
 const r=await run();assert.equal(r.status,200);assert.equal(r.value.status,'RELEASE_CI_BROKER_EXACT_READBACK');
 assert.deepEqual(r.value.scope,scope);assert.equal(r.value.lifecycle.id,100);assert.equal(r.value.gateway.id,101);
 assert.equal(r.calls.filter(x=>x.target.includes('/actions/runs/')).length,2);
 assert.equal(r.calls.filter(x=>x.target.includes('/rest/v1/rpc/')).length,4);
});
test('actual broker rejects provider denial, wrong repository and continuity drift after read',async()=>{
 let r=await run({providerDenied:true});assert.equal(r.status,503);
 assert.equal(r.calls.filter(x=>x.target.includes('/actions/runs/')).length,1);
 r=await run({foreignRepo:true});assert.equal(r.status,409);
 r=await run({changedAfter:true});assert.equal(r.status,409);assert.equal(r.value.status,'RELEASE_CI_BROKER_CONTINUITY_CHANGED');
 assert.equal(r.value.lifecycle,undefined);
});
