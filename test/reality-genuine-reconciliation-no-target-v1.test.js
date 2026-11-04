import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const root=resolve(import.meta.dirname,'..');
const migration=readFileSync(join(root,
 'supabase/migrations/20261104_reconciliation_zero_target_verified_historical_v1.sql'),'utf8');
const broker=readFileSync(join(root,
 'supabase/functions/reality-genuine-capability-auto-admit/index.ts'),'utf8');
const script=readFileSync(join(root,'scripts/reality-genuine-original-resume-v1.mjs'),'utf8');
test('no target needs one exact same-provider historical repair with BOTH immutable Universe settlements',()=>{
 assert.match(migration,/if n=0 then/);
 assert.match(migration,/if matched_count<>1 or matched_work is null then/);
 for(const field of ['issue_number','original_source_sha',
  'original_provider_failed_run_id','original_provider_failed_job_id',
  'source_path','frozen_test_sha256','original_work_id']){
  assert.match(migration,new RegExp(field));
 }
 assert.match(migration,/previous_repairing_original_work_id/);
 assert.match(migration,/previous_target_universe_event_id/);
 assert.match(migration,/previous_original_universe_event_id/);
 assert.match(migration,/RECONCILIATION_NO_TARGET_UNIQUE_HISTORICAL_PROOF_REQUIRED/);
 assert.match(migration,/RECONCILIATION_TARGET_CHAIN_TAIL_AMBIGUOUS/);
 assert.match(migration,/RECONCILIATION_TARGET_ORIGINAL_CHAIN_ANCESTRY_MISSING/);
 assert.match(migration,/current_user<>'service_role'/);
 assert.match(migration,/SECURITY INVOKER/i);
 assert.match(migration,/original_job_completed',false/);
 assert.match(migration,/new_reconciliation_proposed',false/);
 assert.match(migration,/revoke all on function public.reality_read_genuine_reconciliation_target_v1/);
});
test('broker never interprets historical Universe settlement as current original completion',()=>{
 assert.match(broker,/target\?\.status==='RECONCILIATION_ALREADY_SATISFIED_BY_VERIFIED_UNIVERSE'/);
 assert.match(broker,/status:'HISTORICAL_RECONCILIATION_ALREADY_SATISFIED'/);
 assert.match(broker,/current_job_execution_claimed:false,original_job_completed:false/);
 assert.match(broker,/installation_replay_authorized:false,production_changed:false/);
 assert.match(script,/ready\.status==='HISTORICAL_RECONCILIATION_ALREADY_SATISFIED'/);
});
const work=x=>'work:'+x.repeat(32);
const valid={
 ok:true,status:'HISTORICAL_RECONCILIATION_ALREADY_SATISFIED',
 original_work_id:work('a'),
 previous_repairing_original_work_id:work('b'),
 previous_reconciliation_target_work_id:work('c'),
 independent_database_readback:true,
 current_job_execution_claimed:false,original_job_completed:false,
 installation_replay_authorized:false,production_changed:false,
};
function runMock(proof){
 const dir=mkdtempSync(join(tmpdir(),'reality-no-target-'));
 const outputPath=join(dir,'output');
 const preload=join(dir,'mock.mjs');
 // No real provider calls: the signed broker response is an isolated fixture.
 const js=`const proof=${JSON.stringify(proof)};
 globalThis.fetch=async(url,options)=>{
  const u=String(url);
  if(u.includes('oidc.example'))return {ok:true,json:async()=>({value:'x'.repeat(330)})};
  if(u.includes('/functions/v1/reality-genuine-capability-auto-admit'))
   return {ok:true,json:async()=>proof};
  throw Error('UNAUTHORIZED_EXTERNAL_EFFECT_'+u);
 };`;
 writeFileSync(preload,js);
 const env={...process.env,
  GITHUB_ACTIONS:'true',GITHUB_EVENT_NAME:'push',
  GITHUB_REPOSITORY:'maloney2323/Reality',
  GITHUB_REF:'refs/heads/feature/reality-general-capability-engine-20261101',
  GITHUB_SHA:'d'.repeat(40),GH_TOKEN:'secret-'.repeat(5),
  ACTIONS_ID_TOKEN_REQUEST_URL:'https://oidc.example/token',
  ACTIONS_ID_TOKEN_REQUEST_TOKEN:'mock-oidc-token',GITHUB_OUTPUT:outputPath};
 const p=spawnSync(process.execPath,['--import',preload,
  'scripts/reality-genuine-original-resume-v1.mjs'],{
   cwd:root,env,encoding:'utf8',timeout:15000});
 const output=readFileSync(outputPath,{encoding:'utf8',flag:'a+'});
 rmSync(dir,{recursive:true,force:true});
 return {p,output};
}
test('exact independent historical witness finishes as no-effect observation, never replays original',()=>{
 const {p,output}=runMock(valid);
 assert.equal(p.status,0,p.stderr);
 assert.match(p.stdout,/REALITY_HISTORICAL_UNIVERSE_ALREADY_SATISFIED/);
 assert.match(p.stdout,/"original_execution_replayed":false/);
 assert.match(p.stdout,/"current_original_job_completed":false/);
 assert.equal(output,'performed=false\n');
});
test('forged historical witness cannot claim no-effect completion',()=>{
 for(const patch of [
  {independent_database_readback:false},
  {original_job_completed:true},
  {production_changed:true},
  {installation_replay_authorized:true},
  {current_job_execution_claimed:true},
  {previous_repairing_original_work_id:'work:invalid'},
 ]){
  const {p,output}=runMock({...valid,...patch});
  assert.notEqual(p.status,0);
  assert.match(p.stderr,/HISTORICAL_NO_TARGET_WITNESS_INVALID/);
  assert.equal(output,'');
 }
});
