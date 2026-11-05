import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {processGovernedEmployeeShiftTick}
 from '../src/reality-governed-employee-shift-worker-v1.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const SQL=read('supabase/migrations/20261105_governed_shift_continuation_monitor_v1.sql');
const EDGE=read('supabase/functions/reality-governed-employee-shift-wake-v1/index.ts');
const SHIFT='11111111-2222-4333-8444-555555555555';
const CLAIM='99999999-2222-4333-8444-555555555555';
const SRC='https://github.com/maloney2323/Reality/issues/201';
const BUCKET='2026-11-05T12:15:00Z';
const HASH='sha256:'+'a'.repeat(64);
const database={url:'https://example.supabase.co',secretKey:'isolated-test-only'};
const respond=x=>({ok:true,json:async()=>x});
function fixture({monitorPatch={},state='CONTINUATION_SOURCE_READ_ONLY_CLAIMED',
 providerFailure=false}={}){
 const calls=[];
 const fetchImpl=async(url,options={})=>{
  calls.push({url,options});
  if(url.endsWith('/rpc/reality_close_employee_shift_v1'))
   return respond({status:'NO_SHIFT_DUE_FOR_CLOSE'});
  if(url.endsWith('/rpc/reality_reconcile_employee_shift_original_v1'))
   return respond({status:'NO_SHIFT_AWAITING_EXACT_WORK'});
  if(url.endsWith('/rpc/reality_claim_employee_shift_step_v1'))
   return respond({status:'SHIFT_FINAL_REPORT_NOT_DUE',shift_id:SHIFT});
  if(url.endsWith('/rpc/reality_claim_shift_continuation_monitor_v1'))
   return respond({status:state,shift_id:SHIFT,claim_id:CLAIM,
    monitor_bucket:BUCKET,source_step_index:2,source_ref:SRC,
    only_originally_approved_sources:true,
    no_external_write_authority:true,read_only:true,
    installation_authorized:false,original_job_completed:false,
    planned_end_at:'2099-11-05T16:28:00Z',
    production_changed:false,...monitorPatch});
  if(url==='https://api.github.com/repos/maloney2323/Reality/issues/201'){
   assert.equal(options.method,'GET');
   if(providerFailure)return {ok:false,status:503,json:async()=>null};
   return respond({id:201,html_url:SRC,state:'open'});
  }
  if(url.endsWith('/rpc/reality_settle_shift_continuation_monitor_v1')){
   const data=JSON.parse(options.body);
   assert.equal(data.p_shift_id,SHIFT);
   assert.equal(data.p_claim_id,CLAIM);
   assert.equal(data.p_monitor_bucket,BUCKET);
   assert.equal(data.p_proof.source_url,SRC);
   assert.equal(data.p_proof.read_only,true);
   assert.equal(data.p_proof.provider_checked,true);
   assert.equal(data.p_proof.production_changed,false);
   assert.equal(data.p_proof.provider_status,'OPEN_ISSUE');
   assert.equal(data.p_proof.original_job_completed,undefined);
   return respond({status:'CONTINUATION_SOURCE_OBSERVATION_RECORDED',
    shift_id:SHIFT,source_step_index:2,proof_sha256:HASH,
    customer_work_completed:false,human_hours_saved:null,
    installation_authorized:false,production_changed:false});
  }
  throw Error('UNEXPECTED_ENDPOINT_'+url);
 };
 return {calls,fetchImpl};
}
test('a signed shift worker monitors one previously authorized source while waiting to close',async()=>{
 const {calls,fetchImpl}=fixture();
 const out=await processGovernedEmployeeShiftTick(database,{fetchImpl});
 assert.equal(out.status,'AUTHORIZED_SHIFT_CONTINUES_WITH_NEW_READ_ONLY_EVIDENCE');
 assert.equal(out.monitoring_interval_minutes,15);
 assert.equal(out.evidence_digest,HASH);
 assert.equal(out.installation_authorized,false);
 assert.equal(out.job_completed,false);
 assert.equal(out.verified_human_hours_saved,null);
 assert.equal(out.production_changed,false);
 assert.equal(calls.length,6);
 assert.equal(calls.filter(x=>x.url.startsWith('https://api.github.com/')).length,1);
 assert.equal(calls.filter(x=>x.options.method==='GET').length,1);
 assert.ok(calls.every(x=>!x.url.includes('owner_approve')&&!x.url.includes('/install')));
});
test('same slot already verified is idempotent, no duplicate provider calls or receipts',async()=>{
 const {calls,fetchImpl}=fixture({state:'CONTINUATION_SOURCE_ALREADY_VERIFIED'});
 const out=await processGovernedEmployeeShiftTick(database,{fetchImpl});
 assert.equal(out.status,'CONTINUATION_SOURCE_ALREADY_VERIFIED');
 assert.equal(out.installation_authorized,false);
 assert.equal(calls.length,4);
 assert.equal(calls.filter(x=>x.url.startsWith('https://api.github.com/')).length,0);
});
test('a blocked source is not replayed in the same slot',async()=>{
 const {calls,fetchImpl}=fixture({state:'CONTINUATION_SOURCE_RETRY_BOUNDED'});
 const out=await processGovernedEmployeeShiftTick(database,{fetchImpl});
 assert.equal(out.status,'CONTINUATION_SOURCE_RETRY_BOUNDED');
 assert.equal(calls.length,4);
});
test('cross-shift, novel source, expired approval or forged authority fail closed',async()=>{
 for(const patch of [
  {shift_id:CLAIM},
  {source_ref:'https://github.com/other/repo/issues/201'},
  {source_step_index:6},
  {only_originally_approved_sources:false},
  {no_external_write_authority:false},
  {installation_authorized:true},
  {original_job_completed:true},
  {planned_end_at:'2020-01-01T00:00:00Z'}
 ]){
  const {calls,fetchImpl}=fixture({monitorPatch:patch});
  await assert.rejects(
   processGovernedEmployeeShiftTick(database,{fetchImpl}),
   /SHIFT_CONTINUATION_SCOPE_UNTRUSTED/,
   JSON.stringify(patch));
  assert.equal(calls.filter(x=>x.url.startsWith('https://api.github.com/')).length,0);
 }
});
test('provider failures leave fenced claim unverified for a bounded retry',async()=>{
 const {calls,fetchImpl}=fixture({providerFailure:true});
 await assert.rejects(processGovernedEmployeeShiftTick(database,{fetchImpl}),
  /SHIFT_GITHUB_PROVIDER_READBACK_UNAVAILABLE/);
 assert.equal(calls.filter(x=>x.url.endsWith('settle_shift_continuation_monitor_v1')).length,0);
});
test('SQL enforces approved scope, bounded retries, lease fencing and durable proof without job escalation',()=>{
 for(const pattern of [
  /current_user<>'service_role'/,
  /s\.planned_start_at<=v_now and s\.planned_end_at>v_now/,
  /s\.status in \('RUNNING','AWAITING_EXACT_ORIGINAL_WORK'\)/,
  /p\.state in \('QUEUED','CLAIMED','AWAITING_EXACT_WORK'\)/,\n  /p\.step_index between 1 and 5/,
  /e\.step_index=8 and e\.state='QUEUED'/,
  /t\.state='SOURCE_CHECKED'/,
  /t\.step_index between 2 and 5/,
  /date_bin\(interval '15 minutes'/,
  /v_row\.attempt_count>=2/,
  /for update of s skip locked/,
  /for update of m/,
  /v\.claim_id<>p_claim_id/,
  /v\.lease_expires_at<=v_now/,
  /p_proof->>'source_url' is distinct from v\.source_ref/,
  /p_proof->>'provider_checked' is distinct from 'true'/,
  /pg_catalog\.sha256/,
  /enable row level security/,
  /revoke all on function public\.reality_claim_shift_continuation_monitor_v1/,
  /customer_work_completed',false/,
  /human_hours_saved',null/,
  /production_changed',false/
 ])assert.match(SQL,pattern);
 assert.doesNotMatch(SQL,/owner_approve_qualified_preview|create\s+original_work|owner_install_auto_approved/i);
});
test('signed active edge wake follows same fenced monitoring contract, never model or new grant',()=>{
 assert.match(EDGE,/if\(claimed\.status==='SHIFT_FINAL_REPORT_NOT_DUE'\)/);
 assert.match(EDGE,/reality_claim_shift_continuation_monitor_v1/);
 assert.match(EDGE,/reality_settle_shift_continuation_monitor_v1/);
 assert.match(EDGE,/proof=await researchSourceWithoutStopping\(proof\)/);
 assert.match(EDGE,/only_originally_approved_sources!==true/);
 assert.match(EDGE,/no_external_write_authority!==true/);
 assert.match(EDGE,/installation_authorized:false,original_job_completed:false/);
 assert.doesNotMatch(EDGE,/api\.openai\.com|reality_owner_approve_qualified_preview_v1|github\.com\/repos\/maloney2323\/Reality\/dispatches/);
});
