import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyGeneralOriginalAcceptancePushTransport} from
 '../src/reality-general-original-acceptance-push-bridge-v1.js';
const url='https://hvkfreoagbrphwghjajw.supabase.co';
const db={url,project:'hvkfreoagbrphwghjajw',strictSecrets:true,secretKey:'x'.repeat(36)};
const env={VERCEL_ENV:'preview',REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:db.project};
const valid={status:'EXACT_ISOLATED_PR_SYNC_INDEPENDENTLY_VERIFIED',
 original_work_id:'work:'+'a'.repeat(32),github_commit_sha:'b'.repeat(40),
 push_ci_run_id:43679502391,independent_pr_sync_acceptance_verified:true,
 acceptance_event:'pull_request',acceptance_pr_number:305,
 installation_authorized:false,source_installed:false,
 original_job_completed:false,production_changed:false};
test('only signed isolated worker can contact the one-shot transport broker',async()=>{
 let called=0;
 const fetchImpl=async()=>{called++;return new Response('{}')};
 for(const patch of [
  {db:{...db,strictSecrets:false}}, {db:{...db,secretKey:'x'}},
  {env:{...env,VERCEL_ENV:'production'}},
  {env:{...env,REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'foreign'}}
 ]){
  const result=await verifyGeneralOriginalAcceptancePushTransport({db,env,fetchImpl,...patch});
  assert.equal(result.independent_pr_sync_acceptance_verified,false);
  assert.equal(result.installation_authorized,false);
  assert.equal(result.original_job_completed,false);
  assert.equal(result.production_changed,false);
 }
 assert.equal(called,0);
});
test('request has zero model/owner-supplied scope and cannot mutate original job',async()=>{
 let n=0;
 const fetchImpl=async(u,opts)=>{
  n++;
  assert.equal(u,url+'/functions/v1/reality-governed-original-acceptance-push-probe-v1');
  assert.equal(opts.method,'POST');
  assert.equal(opts.body,'{"version":1,"action":"prove_isolated_original_acceptance_push_transport"}');
  assert.equal(opts.headers.authorization,'Bearer '+db.secretKey);
  return new Response(JSON.stringify(valid),{status:200,headers:{'content-type':'application/json'}});
 };
 const r=await verifyGeneralOriginalAcceptancePushTransport({db,env,fetchImpl});
 assert.equal(n,1);assert.equal(r.independent_pr_sync_acceptance_verified,true);
 assert.equal(r.original_work_id,valid.original_work_id);
 assert.equal(r.github_commit_sha,valid.github_commit_sha);
 assert.equal(r.push_ci_run_id,valid.push_ci_run_id);
 assert.equal(r.acceptance_event,'pull_request');
 assert.equal(r.acceptance_pr_number,305);
 assert.equal(r.installation_authorized,false);
 assert.equal(r.source_installed,false);
 assert.equal(r.original_job_completed,false);
 assert.equal(r.production_changed,false);
});
test('rejected, partial and forged success do not release approval',async()=>{
 for(const v of [
  {...valid,installation_authorized:true},
  {...valid,source_installed:true},
  {...valid,original_job_completed:true},
  {...valid,production_changed:true},
  {...valid,push_ci_run_id:1},
  {...valid,github_commit_sha:'bad'},
  {...valid,acceptance_event:'push'},
  {...valid,acceptance_pr_number:null},
  {...valid,independent_pr_sync_acceptance_verified:false},
  {...valid,status:'PUSH_VERIFIED_AWAITING_CI'},
  {status:'NO_CURRENT_AUTHORIZED_PUSH_PROBE',installation_authorized:false,
   source_installed:false,original_job_completed:false,production_changed:false}
 ]){
  const fetchImpl=async()=>new Response(JSON.stringify(v),{status:200});
  const r=await verifyGeneralOriginalAcceptancePushTransport({db,env,fetchImpl});
  assert.equal(r.independent_pr_sync_acceptance_verified,false);
  assert.equal(r.installation_authorized,false);
  assert.equal(r.original_job_completed,false);
  assert.equal(r.production_changed,false);
 }
});
test('network outage and untrusted HTTP error fail closed',async()=>{
 for(const fetchImpl of [
  async()=>{throw Error('network')},
  async()=>new Response(JSON.stringify(valid),{status:403})
 ]){
  const r=await verifyGeneralOriginalAcceptancePushTransport({db,env,fetchImpl});
  assert.equal(r.independent_pr_sync_acceptance_verified,false);
  assert.equal(r.original_job_completed,false);
 }
});
test('static boundaries keep probe and original owner approval distinct',async()=>{
 const {readFileSync}=await import('node:fs');
 const edge=readFileSync(new URL(
  '../supabase/functions/reality-governed-original-acceptance-push-probe-v1/index.ts',
  import.meta.url),'utf8');
 const worker=readFileSync(new URL(
  '../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261115_governed_original_acceptance_push_transport_preflight_v1.sql',
  import.meta.url),'utf8');
 assert.match(edge,/REALITY_GITHUB_BROKER_TOKEN/);
 assert.match(edge,/ONE_USE_FENCE_IDENTITY_MISMATCH/);
 assert.match(edge,/event=push/);
 assert.match(edge,/CI_PATH/);
 assert.match(edge,/status!=='added'/);
 assert.match(edge,/reality_record_general_original_push_ci_v1/);
 assert.doesNotMatch(edge,/reality_owner_approve_general_original_install_v1/);
 assert.doesNotMatch(edge,/reality_record_general_original_independent_settlement_v1/);
 assert.match(worker,/verifyGeneralOriginalAcceptancePushTransport/);
 assert.match(sql,/CREATE TABLE IF NOT EXISTS reality_internal.governed_original_acceptance_push_probes_v1/);
 assert.match(sql,/fence_at timestamptz/);
 assert.match(sql,/current_user<>'service_role'/);
 assert.doesNotMatch(sql,/GRANT EXECUTE[^;]*authenticated/i);
});
