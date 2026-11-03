import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import handler from '../api/reality/governed-wake-relay.js';

const nonce='11111111-1111-4111-8111-111111111111';
const claim={
 ok:true,status:'DELIVERY_CLAIMED_NOT_EXECUTION_AUTHORIZED',delivery_only:true,
 execution_authorized:false,owner_approval_created:false,
 approval_id:'22222222-2222-4222-8222-222222222222',
 trigger_id:'33333333-3333-4333-8333-333333333333',
 claim_id:'44444444-4444-4444-8444-444444444444',
 original_work_id:'work:'+'a'.repeat(32),
 artifact_sha256:'b'.repeat(64),pre_state_hash:'c'.repeat(64),
 target_environment:'ISOLATED_PREVIEW',dispatch_fence:1
};
const json=(v,status=200)=>({ok:status>=200&&status<300,status,json:async()=>v});
function response(){
 return {statusCode:200,headers:{},body:null,
  setHeader(k,v){this.headers[k]=v;return this},
  status(v){this.statusCode=v;return this},
  json(v){this.body=v;return this}};
}
const prior=process.env.REALITY_GITHUB_TOKEN;
const originalFetch=global.fetch;
const fakeToken='test-token-never-a-real-credential-123456';
test.after(()=>{global.fetch=originalFetch;
 if(prior===undefined)delete process.env.REALITY_GITHUB_TOKEN;
 else process.env.REALITY_GITHUB_TOKEN=prior;
});
test('route is valid JS, strict JSON POST, and never returns a token',async()=>{
 const source=readFileSync(new URL('../api/reality/governed-wake-relay.js',import.meta.url),'utf8');
 const p=spawnSync(process.execPath,['--check',
  new URL('../api/reality/governed-wake-relay.js',import.meta.url).pathname],{encoding:'utf8'});
 assert.equal(p.status,0,p.stderr);
 assert.doesNotMatch(source,/process\.env\.REALITY_GITHUB_TOKEN[^;]+json\(/);
 const r=response();await handler({method:'GET'},r);
 assert.equal(r.statusCode,405);
 assert.doesNotMatch(JSON.stringify(r.body),/Bearer|github_pat_|ghp_/);
});
test('forged or incorrectly scoped input never uses a GitHub credential',async()=>{
 let called=0;global.fetch=async()=>{called++;throw Error('MUST_NOT_FETCH')};
 process.env.REALITY_GITHUB_TOKEN=fakeToken;
 for(const body of [{version:1,relay_nonce:'bad'},{
  version:1,relay_nonce:nonce,approval_id:claim.approval_id
 },{version:0,relay_nonce:nonce},null]){
  const r=response();await handler({method:'POST',body},r);
  assert.equal(r.statusCode,400);assert.equal(r.body?.ok,false);
 }
 assert.equal(called,0);
});
test('missing production-only credential fails before consuming relay nonce',async()=>{
 delete process.env.REALITY_GITHUB_TOKEN;
 let called=0;global.fetch=async()=>{called++;return json({})};
 const r=response();
 await handler({method:'POST',body:{version:1,relay_nonce:nonce}},r);
 assert.equal(r.statusCode,503);
 assert.equal(called,0);
 assert.equal(r.body.production_changed,false);
});
test('valid production secret is not enough: revoked relay nonce fails closed',async()=>{
 process.env.REALITY_GITHUB_TOKEN=fakeToken;
 const calls=[];
 global.fetch=async(url,opts)=>{
  calls.push([String(url),opts?.method]);
  return json({ok:false,status:'RELAY_REJECTED'},403);
 };
 const r=response();
 await handler({method:'POST',body:{version:1,relay_nonce:nonce}},r);
 assert.equal(r.statusCode,503);
 assert.equal(r.body.worker_started,false);
 assert.equal(calls.length,1);
 assert.ok(calls[0][0].includes('supabase.co/functions/v1/'));
});
test('no approved durable work returns idle without GitHub writes',async()=>{
 process.env.REALITY_GITHUB_TOKEN=fakeToken;
 const calls=[];
 global.fetch=async(url,opts)=>{
  calls.push([String(url),opts?.method]);
  return json({ok:true,status:'NO_APPROVED_WAKE_READY',
   execution_authorized:false,approval_created:false});
 };
 const r=response();await handler({method:'POST',body:{version:1,relay_nonce:nonce}},r);
 assert.equal(r.statusCode,200);
 assert.equal(r.body.status,'NO_APPROVED_WAKE_READY');
 assert.equal(r.body.execution_authorized,false);
 assert.equal(calls.length,1);
});
test('a real bounded approval can deliver ONE exact preview wake with readback',async()=>{
 process.env.REALITY_GITHUB_TOKEN=fakeToken;
 const calls=[];let source=null;
 const endpoint='reality-approved-install-wakes/'+claim.approval_id+'-attempt-1.json';
 global.fetch=async(url,opts)=>{
  const u=String(url);calls.push([u,opts?.method]);
  if(u.includes('/functions/v1/reality-governed-wake-relay-v1')){
   const request=JSON.parse(opts.body);
   if(request.action==='claim')return json(claim);
   if(request.action==='ack'){
    assert.equal(request.approval_id,claim.approval_id);
    assert.equal(request.claim_id,claim.claim_id);
    assert.equal(request.fence,1);
    return json({ok:true,status:'DISPATCH_ACCEPTED_NOT_EXECUTION_PROVEN',
      approval_id:claim.approval_id,dispatch_fence:1,
      execution_authorized:false,worker_alive:false});
   }
  }
  if(u.includes('/contents/'+endpoint+'?ref=')){
   return source===null?json({},404):json({path:endpoint,
    content:Buffer.from(source).toString('base64')});
  }
  if(u.includes('/git/ref/heads/'))return json({object:{sha:'a'.repeat(40)}});
  if(u.includes('/contents/'+endpoint)&&opts.method==='PUT'){
   const payload=JSON.parse(opts.body);
   assert.equal(payload.branch,'feature/reality-general-capability-engine-20261101');
   assert.equal(payload.message,'Wake only existing approved isolated job '+claim.approval_id);
   source=Buffer.from(payload.content,'base64').toString('utf8');
   const obj=JSON.parse(source);
   assert.equal(obj.target_environment,'ISOLATED_PREVIEW');
   assert.equal(obj.dispatch_fence,1);
   assert.equal(obj.artifact_sha256,claim.artifact_sha256);
   assert.equal(obj.approval_id,claim.approval_id);
   return json({commit:{sha:'f'.repeat(40)},content:{path:endpoint}},201);
  }
  throw Error('UNEXPECTED_PROVIDER_CALL_'+u);
 };
 const r=response();
 await handler({method:'POST',body:{version:1,relay_nonce:nonce}},r);
 assert.equal(r.statusCode,200,JSON.stringify(r.body));
 assert.equal(r.body.status,'DISPATCH_ACCEPTED_NOT_EXECUTION_PROVEN');
 assert.equal(r.body.worker_started,false);
 assert.equal(r.body.execution_authorized,false);
 assert.equal(r.body.production_changed,false);
 assert.equal(calls.filter(x=>x[1]==='PUT').length,1);
 assert.ok(calls.every(x=>!x[0].includes('/git/refs')),'never target production refs');
 assert.ok(!JSON.stringify(r.body).includes(fakeToken));
});
test('fabricated claim never writes a file or reports a started worker',async()=>{
 process.env.REALITY_GITHUB_TOKEN=fakeToken;
 let writes=0;
 global.fetch=async(url,opts)=>{
  if(opts.method==='PUT')writes++;
  return json({...claim,artifact_sha256:'forged'});
 };
 const r=response();
 await handler({method:'POST',body:{version:1,relay_nonce:nonce}},r);
 assert.equal(r.statusCode,503);
 assert.equal(writes,0);
 assert.equal(r.body.worker_started,false);
});
