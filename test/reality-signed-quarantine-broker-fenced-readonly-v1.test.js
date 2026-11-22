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
test('initial GitHub branch-write refusal is passed intact as typed no-replay evidence',async()=>{
 for(const [status,diagnostic] of [
  [403,'GITHUB_BRANCH_CREATE_PROVIDER_AUTH_REJECTED'],
  [422,'GITHUB_BRANCH_CREATE_REF_CONFLICT_UNVERIFIED'],
  [500,'GITHUB_BRANCH_CREATE_EFFECT_UNKNOWN']
 ]){
  const result=await stage('RECOVERY_GITHUB_BRANCH_EFFECT_UNKNOWN_NO_REPLAY',{
   broker_read_only_diagnosis:diagnostic,
   provider_write_http_status:status,
   provider_effect_settled:false,write_replay_authorized:false});
  assert.equal(result.provider_write_http_status,status);
  assert.equal(result.broker_read_only_diagnosis,diagnostic);
  assert.equal(result.write_replay_authorized,false);
  assert.equal(result.installation_authorized,false);
 }
 const malformed=await stage('RECOVERY_GITHUB_BRANCH_EFFECT_UNKNOWN_NO_REPLAY',{
  broker_read_only_diagnosis:'GITHUB_BRANCH_CREATE_EFFECT_UNKNOWN',
  provider_write_http_status:'403',
  provider_effect_settled:false,write_replay_authorized:false});
 assert.equal(malformed.provider_write_http_status,undefined);
 assert.equal(malformed.installation_authorized,false);
});
test('authenticated broker identity is receipted read-only without turning a repo push flag into contents-write authority',async()=>{
 const proof={
  schema:'reality-broker-read-only-credential-provenance-v1',
  repository:'maloney2323/Reality',
  credential_kind:'USER_ACCESS_TOKEN',
  github_actor_login:'authorized-user',
  github_actor_user_http_status:200,
  installation_repository_access_verified:false,
  installation_repository_http_status:403,
  classic_repo_scope_observed:false,
  oauth_scopes_header_available:false,
  rulesets_read_http_status:200,ruleset_count:0,
  contents_write_effectively_tested:false,
  exact_ref_write_authorized:false,provider_effect_replayed:false,
  action:'VERIFY_EXACT_BROKER_CONTENTS_WRITE_OR_REQUEST_OWNER_PROVIDER_CORRECTION'
 };
 const r=await stage('RECOVERY_FENCED_PROVIDER_EFFECT_UNVERIFIED_NO_REPLAY',{
  broker_read_only_diagnosis:'GITHUB_REF_NOT_OBSERVED_PUSH_PERMISSION_PRESENT',
  provider_ref_http_status:404,broker_push_permission_verified:true,
  provider_effect_settled:false,write_replay_authorized:false,
  broker_credential_readback:proof});
 assert.equal(r.broker_credential_readback?.github_actor_login,'authorized-user');
 assert.equal(r.broker_credential_readback?.contents_write_effectively_tested,false);
 assert.equal(r.broker_credential_readback?.exact_ref_write_authorized,false);
 const misleading=await stage('RECOVERY_FENCED_PROVIDER_EFFECT_UNVERIFIED_NO_REPLAY',{
  broker_read_only_diagnosis:'GITHUB_REF_NOT_OBSERVED_PUSH_PERMISSION_PRESENT',
  provider_ref_http_status:404,broker_push_permission_verified:true,
  provider_effect_settled:false,write_replay_authorized:false,
  broker_credential_readback:{...proof,contents_write_effectively_tested:true,
   exact_ref_write_authorized:true}});
 assert.equal(misleading.broker_credential_readback,null);
 assert.equal(misleading.installation_authorized,false);
});
test('the credential probe is GET-only and never touches pending reference mutation',()=>{
 const begin=broker.indexOf('async function githubCredentialReadback(token)');
 const end=broker.indexOf('const bytes=x=>',begin);
 assert.ok(begin>0&&end>begin);
 const path=broker.slice(begin,end);
 assert.match(path,/method:'GET'/);
 assert.match(path,/get\\('user'\\)/);
 assert.match(path,/get\\('installation\\/repositories'\\)/);
 assert.match(path,/provider_effect_replayed:false/);
 assert.doesNotMatch(path,/method:'POST'|method:'PUT'|method:'PATCH'|method:'DELETE'/);
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
