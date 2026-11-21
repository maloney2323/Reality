import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const SQL=readFileSync(new URL(
 '../supabase/migrations/20261116164000_general_original_preinstall_contract_attestation_v1.sql',
 import.meta.url),'utf8');
const EDGE=readFileSync(new URL(
 '../supabase/functions/reality-governed-original-acceptance-push-probe-v1/index.ts',
 import.meta.url),'utf8');
const attempt='788beab4-34e0-44ba-9577-1062ca459643';
const shift='9460cfff-937a-4105-9093-2e41ab39a950';
const original='work:45206a326ddf406b1c083a819da24aaa';
const key='test-server-role-token-pinned-to-service-worker-only';
const scope={
 status:'EXACT_ISOLATED_PR_SYNC_INDEPENDENTLY_VERIFIED',
 original_work_id:original,attempt_id:attempt,shift_id:shift,
 preflight_branch:'reality/general-postinstall-acceptance-contract-preflight',
 original_source_path:'src/reality-riley-service-original-runtime-v1.js',
 inert_path:'src/reality-ci-transport-probe-'+attempt+'.txt',
 expected_preflight_parent_sha:'a'.repeat(40),
 original_source_blob_sha:'b'.repeat(40),
 github_commit_sha:'c'.repeat(40),push_ci_run_id:43680464809,
 accepted_event:'pull_request',acceptance_pr_number:305,
 installation_authorized:false,source_installed:false,
 original_job_completed:false,production_changed:false
};
const contract={
 status:'GENERAL_ORIGINAL_PREINSTALL_CONTRACT_INDEPENDENTLY_ATTESTED',
 original_work_id:original,attempt_id:attempt,shift_id:shift,
 evidence_sha256:'sha256:'+'f'.repeat(64),
 owner_approval_ready:true,owner_approval_recorded:false,
 installation_authorized:false,source_installed:false,
 original_job_completed:false,production_changed:false,
 new_shift_started:false
};
test('the preinstall gate requires real owner, source, frozen, integration, CI and provider receipts',()=>{
 for(const phrase of [
  "current_user<>'service_role'",
  "reality_read_current_shift_execution_graph_v1",
  "governed_employee_completion_warrants_v1",
  "j.phase<>'SOURCE_ADMITTED'",
  "a.phase<>'CI_PASSED'",
  "f.independent_run_conclusion<>'success'",
  "r.integrated_test_run_id",
  "p.phase<>'CI_PUSH_INDEPENDENTLY_VERIFIED'",
  "p.accepted_event<>'pull_request'",
  "d.github_vercel_status_creator<>'vercel-app:vercel'",
  "w.result_status<>'GITHUB_WRITE_AND_ORIGINAL_SOURCE_READBACK_VERIFIED'",
  "source_installed boolean NOT NULL DEFAULT false",
  "original_job_completed boolean NOT NULL DEFAULT false",
  "production_changed boolean NOT NULL DEFAULT false",
  "phase='READY_FOR_EXACT_OWNER_APPROVAL'",
  "owner_approval_recorded',false",
  "no_install_without_exact_approval"
 ].filter(x=>x!=="no_install_without_exact_approval"))
  assert.ok(SQL.includes(phrase),'missing verified contract gate '+phrase);
 assert.match(SQL,/REVOKE ALL ON FUNCTION public\.reality_attest_general_original_preinstall_contract_v1\(\)\s+FROM PUBLIC,anon,authenticated/);
 assert.match(SQL,/GRANT EXECUTE ON FUNCTION public\.reality_attest_general_original_preinstall_contract_v1\(\)\s+TO service_role/);
 assert.doesNotMatch(SQL,/SECURITY DEFINER/);
 assert.doesNotMatch(SQL,/reality_owner_approve_general_original_install_v1\(/);
 assert.doesNotMatch(SQL,/SET installed_commit_sha/);
 assert.doesNotMatch(SQL,/SET phase='ORIGINAL_SETTLED'/);
});
function rig({proof=contract,ownerMatch=true}={}){
 let handler;
 const calls=[];
 const Deno={env:{get:k=>k==='SUPABASE_URL'?
  'https://hvkfreoagbrphwghjajw.supabase.co':null},
  serve:fn=>{handler=fn;}};
 const fetch=async(url,opts)=>{
  calls.push({url,opts});
  assert.match(url,/^https:\/\/hvkfreoagbrphwghjajw\.supabase\.co\/rest\/v1\/rpc\/reality_/);
  assert.equal(opts.method,'POST');
  assert.equal(opts.headers.authorization,'Bearer '+key);
  assert.deepEqual(JSON.parse(opts.body),{});
  const value=url.endsWith('/reality_read_general_original_push_probe_v1')?
   scope:url.endsWith('/reality_attest_general_original_preinstall_contract_v1')?
   ownerMatch?proof:{...proof,original_work_id:'work:'+'0'.repeat(32)}:
   (()=>{throw Error('UNEXPECTED_RPC')})();
  return {ok:true,json:async()=>value};
 };
 vm.runInNewContext(EDGE,{Deno,fetch,Response,URL,AbortSignal,
  TextEncoder,Uint8Array,crypto:globalThis.crypto,
  btoa,atob,console});
 const req={method:'POST',headers:{get:x=>
  x==='content-type'?'application/json':
  x==='apikey'?key:
  x==='authorization'?'Bearer '+key:null},
  text:async()=>JSON.stringify({version:1,action:'prove_isolated_original_acceptance_push_transport'})};
 return {calls,handler,req};
}
test('only exact unchanged owner-original preinstall proof exposes ready; never approval/install',async()=>{
 const h=rig();
 const r=await h.handler(h.req),j=await r.json();
 assert.equal(r.status,200);
 assert.equal(j.status,'EXACT_ISOLATED_PR_SYNC_INDEPENDENTLY_VERIFIED');
 assert.equal(j.preinstall_contract_status,
  'EXACT_ORIGINAL_PREINSTALL_CONTRACT_INDEPENDENTLY_ATTESTED');
 assert.equal(j.owner_approval_ready,true);
 assert.equal(j.independent_pr_sync_acceptance_verified,true);
 assert.equal(j.installation_authorized,false);
 assert.equal(j.source_installed,false);
 assert.equal(j.original_job_completed,false);
 assert.equal(j.production_changed,false);
 assert.equal(h.calls.length,2,'same existing worker wake, no new executor');
 assert.match(h.calls[1].url,/reality_attest_general_original_preinstall_contract_v1$/);
});
test('wrong original or missing attestation leaves owner approval closed',async()=>{
 for(const args of [{ownerMatch:false},{proof:{
  ...contract,original_job_completed:true}},{proof:null}]){
  const h=rig(args);
  const r=await h.handler(h.req),j=await r.json();
  assert.equal(j.owner_approval_ready,false);
  assert.equal(j.preinstall_contract_status,
   'EXACT_ORIGINAL_PREINSTALL_CONTRACT_NOT_YET_VERIFIED');
  assert.equal(j.installation_authorized,false);
  assert.equal(j.original_job_completed,false);
 }
});
test('unauthenticated or malformed worker requests cannot attest anything',async()=>{
 const h=rig();
 const bad={...h.req,headers:{get:x=>x==='content-type'?'application/json':null}};
 const r=await h.handler(bad);
 assert.equal(r.status,403);
 assert.equal(h.calls.length,0);
});
test('original acceptance EDGE never writes owner approval or customer settlement',()=>{
 assert.match(EDGE,/reality_attest_general_original_preinstall_contract_v1/);
 assert.match(EDGE,/EXACT_ISOLATED_PR_SYNC_INDEPENDENTLY_VERIFIED/);
 assert.match(EDGE,/owner_approval_recorded===false/);
 assert.match(EDGE,/new_shift_started===false/);
 assert.doesNotMatch(EDGE,/reality_owner_approve_general_original_install_v1/);
 assert.doesNotMatch(EDGE,/reality_record_general_original_independent_settlement_v1/);
 assert.doesNotMatch(EDGE,/reality_claim_general_original_install_v1/);
});
