import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stageNextSignedChatRecoveryQuarantine}
 from '../src/reality-chat-recovery-quarantine-publisher-v1.js';

const broker=readFileSync(new URL(
 '../supabase/functions/reality-chat-recovery-quarantine-broker-v1/index.ts',
 import.meta.url),'utf8');
const publisher=readFileSync(new URL(
 '../src/reality-chat-recovery-quarantine-publisher-v1.js',
 import.meta.url),'utf8');
const db={strictSecrets:true,project:'fixture-tenant',url:'https://fixture-tenant.supabase.co',
 secretKey:'x'.repeat(42)};
const env={VERCEL_ENV:'preview',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'fixture-tenant',
 VERCEL_GIT_COMMIT_SHA:'a'.repeat(40),
 VERCEL_GIT_COMMIT_REF:'repair/verified-signed-original-fixture'};
const base={
 source_installed:false,feature_acceptance_verified:false,
 independent_ci_verified:false,installation_authorized:false,
 original_job_completed:false,production_changed:false,new_shift_started:false
};
async function stage(status,extra){
 const calls=[];
 const response=await stageNextSignedChatRecoveryQuarantine({
  db,env,fetchImpl:async(url,opts)=>{
   calls.push([url,opts.method,JSON.parse(opts.body).action]);
   return {ok:true,json:async()=>({...base,status,...extra})};
  }});
 assert.deepEqual(calls,[[
  db.url+'/functions/v1/reality-chat-recovery-quarantine-broker-v1',
  'POST','stage_signed_chat_recovery_quarantine'
 ]]);
 assert.equal(response.source_installed,false);
 assert.equal(response.installation_authorized,false);
 assert.equal(response.original_job_completed,false);
 return response;
}
test('independent broker credential status is disclosed as typed evidence, never replay authority',async()=>{
 const res=await stage('RECOVERY_FENCED_PROVIDER_EFFECT_UNVERIFIED_NO_REPLAY',{
  broker_read_only_diagnosis:'GITHUB_BROKER_PUSH_PERMISSION_MISSING',
  broker_push_permission_verified:false,provider_ref_http_status:404,
  provider_effect_settled:false,write_replay_authorized:false});
 assert.equal(res.broker_read_only_diagnosis,'GITHUB_BROKER_PUSH_PERMISSION_MISSING');
 assert.equal(res.broker_push_permission_verified,false);
 assert.equal(res.provider_ref_http_status,404);
 assert.equal(res.write_replay_authorized,false);
});
test('unrecognized provider statuses and missing no-replay proof do not gain trusted diagnostic fields',async()=>{
 const wrong=await stage('RECOVERY_FENCED_PROVIDER_EFFECT_UNVERIFIED_NO_REPLAY',{
  broker_read_only_diagnosis:'INVENTED_PERMISSION_GRANT',
  broker_push_permission_verified:true,provider_ref_http_status:404,
  provider_effect_settled:true,write_replay_authorized:true});
 assert.equal(wrong.broker_read_only_diagnosis,undefined);
 assert.equal(wrong.installation_authorized,false);
 const clean=await stage('RECOVERY_FENCED_PROVIDER_EFFECT_UNVERIFIED_NO_REPLAY',{});
 assert.equal(clean.broker_read_only_diagnosis,undefined);
});
test('fenced broker path only performs GET reobservations and cannot recreate an uncertain branch',()=>{
 const fenced=broker.indexOf("if(s.phase==='SIGNED_CHAT_RECOVERY_PUBLISH_FENCED')");
 const fresh=broker.indexOf("const before=await gh(token,'/git/ref/heads/'+branch)");
 assert.ok(fenced>0&&fresh>fenced);
 const block=broker.slice(fenced,fresh);
 assert.match(block,/existing\(s,token,base,prepared\)/);
 assert.match(block,/gh\(token,'\/git\/ref\/heads\/'\+branch\)/);
 assert.match(block,/gh\(token,''\)/);
 assert.match(block,/GITHUB_BROKER_PUSH_PERMISSION_MISSING/);
 assert.match(block,/provider_effect_settled:false/);
 assert.match(block,/write_replay_authorized:false/);
 assert.doesNotMatch(block,/gh\(token,.*?'(?:POST|PATCH|PUT|DELETE)'/s);
 assert.match(broker,/if\(b\.status!==201\|\|b\.data\?\.object\?\.sha!==s\.release_sha\)/);
 assert.match(publisher,/provider_ref_http_status/);
});
