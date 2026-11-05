import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const root=resolve(import.meta.dirname,'..');
const sql=readFileSync(join(root,'supabase/migrations/20261104_reality_201_signed_historical_no_work_final_disposition_v1.sql'),'utf8');
const broker=readFileSync(join(root,'supabase/functions/reality-genuine-capability-auto-admit/index.ts'),'utf8');
const script=readFileSync(join(root,'scripts/reality-genuine-historical-no-work-final-disposition-v1.mjs'),'utf8');
const workflow=readFileSync(join(root,'.github/workflows/reality-genuine-capability-auto-trigger-v1.yml'),'utf8');
const WORK='work:bf17f1716f7c9550680d761e64f8b591';
const receipt=()=>({
 status:'HISTORICAL_OBJECTIVE_SATISFIED_NO_NEW_EXECUTION',
 receipt_id:'a8a8a8a8-a8a8-4a8a-8a8a-a8a8a8a8a8a8',
 original_work_id:WORK,
 previous_repairing_original_work_id:'work:d90acd41ed1b1116ee74086846d61d42',
 previous_reconciliation_target_work_id:'work:31bf26a5459f5c2d3039da69c39783c8',
 previous_original_universe_event_id:'dfe99dea-62b4-41de-8f94-97ad06c54131',
 previous_target_universe_event_id:'fdbe18d3-ab21-471f-981d-b83ded8286ee',
 previous_original_event_content_hash:'a'.repeat(64),
 previous_target_event_content_hash:'b'.repeat(64),
 independent_database_readback:true,
 unresolved_reconciliation_targets:0,
 original_job_completed:false,
 original_execution_replayed:false,
 new_execution_claim_consumed:false,
 new_universe_settlement_written:false,
 installation_replay_authorized:false,
 measured_roi_claimed:false,
 production_changed:false
});
test('database disposition is separate, terminal, immutable and never changes Universe',()=>{
 for(const phrase of [
  'create table if not exists reality_internal.genuine_historical_no_work_dispositions_v1',
  'HISTORICAL_OBJECTIVE_SATISFIED_NO_NEW_EXECUTION',
  'immutable_genuine_historical_no_work_disposition_v1',
  'before update or delete',
  'on conflict (original_work_id) do nothing',
  'reality_prepare_genuine_historical_no_work_v1',
  'reality_record_genuine_historical_no_work_v1',
  'reality_read_genuine_historical_no_work_v1',
  'reality_read_genuine_reconciliation_target_v1',
  "c.claim_run_id is not null",
  "c.claimed_at is not null",
  "c.settled_at is not null",
  "c.state is distinct from 'ACCEPTED_FOR_ISOLATED_RESUMPTION'",
  'new_universe_settlement_written',
  'new_execution_claim_consumed',
  'previous_original_universe_event_id',
  'previous_target_universe_event_id',
  'grant execute on function public.reality_record_genuine_historical_no_work_v1'
 ])assert.ok(sql.includes(phrase),'missing invariant: '+phrase);
 assert.doesNotMatch(sql,/update\s+reality_internal\.genuine_original_continuations_v1/i);
 assert.doesNotMatch(sql,/insert\s+into\s+public\.universe_events/i);
 assert.doesNotMatch(sql,/delete\s+from\s+public\.universe_events/i);
 for(const fn of [
  'reality_prepare_genuine_historical_no_work_v1(text)',
  'reality_read_genuine_historical_no_work_v1(text)',
  'reality_record_genuine_historical_no_work_v1(text,bigint,text)'
 ])assert.ok(sql.includes('grant execute on function public.'+fn+'\n to service_role'));
 assert.match(sql,/security invoker/);
 assert.match(sql,/enable row level security/);
 assert.match(sql,/if current_user is distinct from 'service_role'/);
 assert.ok(sql.includes(WORK));
});
test('signed broker independently reads after recording and returns no original settlement',()=>{
 assert.match(broker,/action==='historical_no_work_final_record'/);
 assert.match(broker,/const signed=await verify\(bearer,input\.scope\.repository_sha,ghProviderToken\)/);
 assert.match(broker,/rpc\/reality_prepare_genuine_historical_no_work_v1/);
 assert.match(broker,/rpc\/reality_record_genuine_historical_no_work_v1/);
 assert.match(broker,/rpc\/reality_read_genuine_historical_no_work_v1/);
 assert.match(broker,/HISTORICAL_DISPOSITION_PERSISTED_INDEPENDENT_READBACK_REQUIRED/);
 assert.match(broker,/HISTORICAL_NO_NEW_WORK_FINAL_RECEIPT_VERIFIED/);
 assert.match(broker,/new_universe_settlement_written:false/);
});
test('signed worker only requests a no-work disposition, not an execution claim',()=>{
 assert.ok(script.includes("action:'historical_no_work_final_record'"));
 assert.ok(script.includes("GITHUB_EVENT_NAME!=='push'"));
 assert.ok(script.includes("GITHUB_REF!=='refs/heads/feature/reality-general-capability-engine-20261101'"));
 assert.ok(script.includes('receipt?.independent_database_readback!==true'));
 assert.doesNotMatch(script,/action:'original_claim'|action:'original_settle'|workflow_dispatch/);
 assert.match(workflow,/record_201_historical_no_work_final_disposition:/);
 assert.match(workflow,/needs\.resume_original_job\.outputs\.performed == 'false'/);
 assert.match(workflow,/needs\.reconcile_all_settled_outcomes\.result == 'success'/);
 assert.match(workflow,/id-token: write/);
 assert.match(workflow,/scripts\/reality-genuine-historical-no-work-final-disposition-v1\.mjs/);
});
function runMock(disposition){
 const dir=mkdtempSync(join(tmpdir(),'reality-201-disposition-'));
 const preload=join(dir,'mock.mjs');
 const proof={ok:true,status:'HISTORICAL_NO_NEW_WORK_FINAL_RECEIPT_VERIFIED',
  receipt:disposition,signed_worker_run_id:41959745318,
  original_execution_replayed:false,new_universe_settlement_written:false,
  production_changed:false};
 const mock=`const proof=${JSON.stringify(proof)};
 globalThis.fetch=async(url,options)=>{
  const u=String(url);
  if(u.startsWith('https://oidc.example/'))return {ok:true,json:async()=>({value:'x'.repeat(330)})};
  if(u==='https://hvkfreoagbrphwghjajw.supabase.co/functions/v1/reality-genuine-capability-auto-admit'){
   const body=JSON.parse(options.body);
   if(body.action!=='historical_no_work_final_record'||body.scope.original_work_id!==${JSON.stringify(WORK)})
    throw Error('UNEXPECTED_MUTATION');
   return {ok:true,json:async()=>proof};
  }
  throw Error('UNAUTHORIZED_EXTERNAL_REQUEST_'+u);
 };`;
 writeFileSync(preload,mock);
 const env={...process.env,
  GITHUB_ACTIONS:'true',GITHUB_EVENT_NAME:'push',
  GITHUB_REPOSITORY:'maloney2323/Reality',
  GITHUB_REF:'refs/heads/feature/reality-general-capability-engine-20261101',
  GITHUB_SHA:'c'.repeat(40),GITHUB_RUN_ID:'41959745318',
  GH_TOKEN:'mock-gh-token-'.repeat(3),
  ACTIONS_ID_TOKEN_REQUEST_URL:'https://oidc.example/token',
  ACTIONS_ID_TOKEN_REQUEST_TOKEN:'mock-token'};
 const p=spawnSync(process.execPath,['--import',preload,
  join(root,'scripts/reality-genuine-historical-no-work-final-disposition-v1.mjs')],
  {cwd:dir,env,encoding:'utf8',timeout:12000});
 const artifact=join(dir,'artifact/out/reality-201-historical-no-work-final-disposition.json');
 const recorded=existsSync(artifact)?JSON.parse(readFileSync(artifact,'utf8')):null;
 rmSync(dir,{recursive:true,force:true});
 return {p,recorded};
}
test('exact signed prior Universe witness records only independent no-work receipt',()=>{
 const {p,recorded}=runMock(receipt());
 assert.equal(p.status,0,p.stderr);
 assert.match(p.stdout,/REALITY_201_HISTORICAL_NO_NEW_WORK_FINAL_RECEIPT_VERIFIED/);
 assert.equal(recorded.status,'HISTORICAL_OBJECTIVE_SATISFIED_NO_NEW_EXECUTION');
 assert.equal(recorded.no_new_work,true);
 assert.equal(recorded.receipt.original_job_completed,false);
});
test('forged receipt or implied duplicate settlement is rejected before publication',()=>{
 for(const patch of [
  {status:'SETTLED_ISOLATED'},
  {new_universe_settlement_written:true},
  {original_job_completed:true},
  {new_execution_claim_consumed:true},
  {independent_database_readback:false},
  {previous_target_universe_event_id:'a8a8a8a8-a8a8-4a8a-8a8a-a8a8a8a8a8a8'},
  {production_changed:true}
 ]){
  const {p,recorded}=runMock({...receipt(),...patch});
  assert.notEqual(p.status,0);
  assert.match(p.stderr,/REALITY_SIGNED_HISTORICAL_NO_WORK_FINAL_DISPOSITION_NOT_INDEPENDENTLY_VERIFIED/);
  assert.equal(recorded,null);
 }
});
