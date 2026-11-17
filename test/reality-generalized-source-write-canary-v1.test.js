import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {verifyGeneralizedOriginalSourceWriteTransport} from '../src/reality-generalized-original-source-write-canary-v1.js';

const src=readFileSync(new URL(
 '../supabase/functions/reality-governed-original-source-write-canary-v1/index.ts',
 import.meta.url),'utf8');
let handler;
const previousDeno=globalThis.Deno;
globalThis.Deno={serve:f=>{handler=f;},env:{get:n=>({
 SUPABASE_URL:'https://hvkfreoagbrphwghjajw.supabase.co',
 REALITY_GITHUB_BROKER_TOKEN:'fake-owner-scoped-broker-test-token-long'
})[n]||''}};
await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
assert.equal(typeof handler,'function');
const db={url:'https://hvkfreoagbrphwghjajw.supabase.co',
 project:'hvkfreoagbrphwghjajw',strictSecrets:true,
 secretKey:'service-role-test-key-without-live-access'};
const env={VERCEL_ENV:'preview',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:db.project};
const original='work:'+'a'.repeat(32),attempt='33333333-3333-4333-8333-333333333333';
const shift='44444444-4444-4444-8444-444444444444';
const branch='reality/test-isolated-proof-branch';
const sourcePath='src/reality-riley-service-original-runtime-v1.js';
const sourceBlob='b'.repeat(40),parent='c'.repeat(40),child='d'.repeat(40);
const probePath='evidence/reality-governed-original-canary-'+attempt+'.json';
const scope={status:'GENERALIZED_CANARY_EXACT_OWNER_PREAPPROVAL_SCOPE',
 original_work_id:original,attempt_id:attempt,shift_id:shift,
 target_branch:branch,source_path:sourcePath,
 expected_source_blob:sourceBlob,probe_path:probePath,
 installation_authorized:false,source_installed:false,
 original_job_completed:false,production_changed:false};
const claimed={...scope,status:'GENERALIZED_CANARY_EXACT_SINGLE_WRITE_CLAIMED',
 expected_parent_commit_sha:parent};
const blob=s=>createHash('sha1')
 .update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex');

function rig({alreadyFenced=false,driftAfterClaim=false,wrongSource=false}={}){
 const previousFetch=globalThis.fetch;
 let wrote=false, putCount=0, recordCount=0, recorded=null;
 let payload='';
 const calls=[];
 globalThis.fetch=async(url,opts={})=>{
  calls.push({url,method:opts.method});
  const route=url.startsWith(db.url)?url.slice(db.url.length):
   url.replace('https://api.github.com/repos/maloney2323/Reality','');
  let status=200,data;
  if(route==='/rest/v1/rpc/reality_read_generalized_source_write_canary_scope_v1')
   data=scope;
  else if(route==='/rest/v1/rpc/reality_claim_generalized_source_write_canary_v1')
   data=alreadyFenced?{status:'GENERALIZED_CANARY_ALREADY_FENCED_NO_REPEAT',
    original_work_id:original,shift_id:shift,result_status:'INTENT_FENCED_EFFECT_UNVERIFIED'}:claimed;
  else if(route==='/rest/v1/rpc/reality_record_generalized_source_write_canary_v1'){
   const input=JSON.parse(opts.body);recordCount++;recorded=input;
   const pass=input.p_result_status==='GITHUB_WRITE_AND_ORIGINAL_SOURCE_READBACK_VERIFIED';
   data={status:pass?'GENERALIZED_SOURCE_WRITE_TRANSPORT_INDEPENDENTLY_VERIFIED':
    'GENERALIZED_SOURCE_WRITE_TRANSPORT_EFFECT_NOT_VERIFIED',
    original_work_id:original,attempt_id:attempt,shift_id:shift,
    isolated_github_write_verified:pass,preview_auto_deploy_verified:false,
    installation_authorized:false,source_installed:false,
    original_job_completed:false,production_changed:false};
  }
  else if(route==='/git/ref/heads/'+branch)
   data={ref:'refs/heads/'+branch,object:{
    sha:wrote?child:driftAfterClaim&&
     calls.filter(x=>x.url.endsWith('/git/ref/heads/'+branch)).length>1?
     'e'.repeat(40):parent}};
  else if(route==='/contents/'+sourcePath+'?ref='+encodeURIComponent(branch))
   data={path:sourcePath,sha:wrongSource?'f'.repeat(40):sourceBlob};
  else if(route==='/contents/'+probePath+'?ref='+encodeURIComponent(branch)){
   if(!wrote){status=404;data={message:'Not Found'};}
   else data={path:probePath,sha:blob(payload),encoding:'base64',
    size:Buffer.byteLength(payload),
    content:Buffer.from(payload).toString('base64')};
  }
  else if(route==='/contents/'+probePath&&opts.method==='PUT'){
   putCount++;wrote=true;
   const input=JSON.parse(opts.body);
   assert.equal(input.branch,branch);
   assert.equal(input.sha,undefined);
   assert.equal(input.message.includes('inert'),true);
   payload=Buffer.from(input.content,'base64').toString('utf8');
   const object=JSON.parse(payload);
   assert.equal(object.candidate_installed,false);
   assert.equal(object.owner_installation_approved,false);
   assert.equal(object.unchanged_original_file_blob,sourceBlob);
   status=201;data={commit:{sha:child},content:{sha:blob(payload)}};
  }else throw Error('UNEXPECTED_EXTERNAL_CALL '+url);
  return new Response(JSON.stringify(data),{
   status,headers:{'content-type':'application/json'}});
 };
 return {calls,get putCount(){return putCount},get recordCount(){return recordCount},
  get recorded(){return recorded},restore(){globalThis.fetch=previousFetch}};
}
const request=(valid=true)=>new Request('https://test.invalid/',{
 method:'POST',headers:{apikey:valid?db.secretKey:'invalid',
 authorization:'Bearer '+(valid?db.secretKey:'invalid'),
 'content-type':'application/json'},
 body:'{"version":1,"action":"verify_exact_isolated_source_write_transport"}'
});
test('one original canary writes ONLY inert evidence, independently rereads same source, never installs',async()=>{
 const h=rig();
 try{
  const r=await handler(request());
  const d=await r.json();
  assert.equal(r.status,200);
  assert.equal(d.status,'GENERALIZED_SOURCE_WRITE_TRANSPORT_INDEPENDENTLY_VERIFIED');
  assert.equal(d.github_write_verified,true);
  assert.equal(d.automatic_preview_deploy_verified,false);
  assert.equal(d.installation_authorized,false);
  assert.equal(d.source_installed,false);
  assert.equal(d.original_job_completed,false);
  assert.equal(h.putCount,1);
  assert.equal(h.recordCount,1);
  assert.equal(h.recorded.p_result_status,'GITHUB_WRITE_AND_ORIGINAL_SOURCE_READBACK_VERIFIED');
  const puts=h.calls.filter(x=>x.method==='PUT');
  assert.deepEqual(puts.map(x=>x.url),
   ['https://api.github.com/repos/maloney2323/Reality/contents/'+probePath]);
 }finally{h.restore()}
});
test('already fenced durable original never makes a second GitHub write',async()=>{
 const h=rig({alreadyFenced:true});
 try{
  const d=await (await handler(request())).json();
  assert.equal(d.status,'GENERALIZED_CANARY_ALREADY_FENCED_NO_REPEAT');
  assert.equal(h.putCount,0);assert.equal(h.recordCount,0);
 }finally{h.restore()}
});
test('source bytes drift block before durable lease or provider effect',async()=>{
 const h=rig({wrongSource:true});
 try{
  const d=await (await handler(request())).json();
  assert.equal(d.status,'GENERALIZED_CANARY_CURRENT_SOURCE_DRIFT_NO_EFFECT');
  assert.equal(h.putCount,0);assert.equal(h.recordCount,0);
  assert.equal(h.calls.some(x=>x.url.includes('claim_generalized_source_write_canary')),false);
 }finally{h.restore()}
});
test('changed head after fence retains uncertain result without retrying',async()=>{
 const h=rig({driftAfterClaim:true});
 try{
  const d=await (await handler(request())).json();
  assert.equal(d.status,'GENERALIZED_SOURCE_WRITE_TRANSPORT_EFFECT_NOT_VERIFIED');
  assert.equal(h.putCount,0);assert.equal(h.recordCount,1);
  assert.equal(h.recorded.p_result_status,'GITHUB_EFFECT_UNCERTAIN');
 }finally{h.restore()}
});
test('invalid service identity cannot even read original review',async()=>{
 const h=rig();
 try{
  const r=await handler(request(false));
  assert.equal(r.status,403);assert.equal(h.calls.length,0);
 }finally{h.restore()}
});
test('worker wrapper requires isolated signing and never treats staged approval as write proof',async()=>{
 const ok=await verifyGeneralizedOriginalSourceWriteTransport({
  db,env:{...env,VERCEL_ENV:'production'},
  fetchImpl:async()=>{throw Error('MUST_NOT_CALL_PROVIDER')}});
 assert.equal(ok.status,'GENERALIZED_CANARY_SIGNED_ISOLATED_SERVICE_REQUIRED');
 assert.equal(ok.isolated_github_write_verified,false);
});
test('service RPC claim has atomic insertion-before-first-provider-effect with no repeat',()=>{
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261114_governed_generalized_source_write_canary_v1.sql',
  import.meta.url),'utf8');
 const worker=readFileSync(new URL(
  '../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 assert.match(sql,/ON CONFLICT \(original_work_id\) DO NOTHING RETURNING \* INTO a;/);
 assert.match(sql,/IF FOUND THEN[\s\S]*GENERALIZED_CANARY_EXACT_SINGLE_WRITE_CLAIMED/);
 assert.match(sql,/GENERALIZED_CANARY_ALREADY_FENCED_NO_REPEAT/);
 assert.match(sql,/g\.?->>'installation_authorized'<>'false'/);
 assert.match(sql,/current_user<>'service_role'/);
 assert.doesNotMatch(sql,/GRANT EXECUTE[^;]*authenticated/i);
 assert.match(worker,/verifyGeneralizedOriginalSourceWriteTransport/);
 assert.match(worker,/generalized_original_source_write_transport:generalizedSourceWriteTransport/);
});
