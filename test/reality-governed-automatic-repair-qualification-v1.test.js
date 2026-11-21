import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {automaticallyQualifyVerifiedRepairOpportunity}
 from '../src/reality-governed-automatic-repair-qualification-v1.js';
const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const shift='ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce';
const worker='cfb32b5a-02a7-4679-a93a-bfa53a218d30';
const baseline='26c09499f5a9d59de9dda0f81db7127403a1062e';
const candidate='8368c5db6d5d5e3546b69ab2b86b022e40a00ed9';
const preview='c82742849b98c2ce9bd11384f837b42f9c696bae';
const sourceFile='src/reality-cognitive-research-engine-v0.1.js';
const url='https://github.com/maloney2323/Reality/pull/211';
const proof={
 key:'research:'+'a'.repeat(64),finding_fingerprint:'a'.repeat(64),
 frozen_test_sha256:'b'.repeat(64),
 status:'FROZEN_RED_TO_GREEN_CANDIDATE_VERIFIED',
 proof_kind:'EXISTING_CAPABILITY_IMPLEMENTATION_DEFECT',
 baseline_run_id:41712961166,green_run_id:41713111625,
 pull_request_number:211,source_file:sourceFile,
 baseline_commit_sha:baseline,repair_commit_sha:candidate,
 independent_red_assertion_failures:3,independent_green_assertion_passes:5,
 owner_install_authorized:false,fresh_original_work_verified:false,
 installed:false,production_changed:false,
 candidate_created_by:'ASSISTANT_AUTHORED_IN_ISOLATED_FEATURE_BRANCH'
};
const graph={status:'UNIFIED_OWNER_JOB_CONTROL_READY',
 owner_id:owner,shift_id:shift,jobs:[
 {source_ref:'https://github.com/maloney2323/Reality/pull/307'},
 {source_ref:'https://github.com/maloney2323/Reality/pull/308'}
 ]};
const env={VERCEL_ENV:'preview',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'hvkfreoagbrphwghjajw',
 VERCEL_GIT_COMMIT_SHA:preview};
const db={strictSecrets:true,secretKey:'test-inert-not-a-real-key',
 project:'hvkfreoagbrphwghjajw'};
function setup({record=proof,repairSource='different',greenConclusion='success',
 existing=false,prSha=candidate,readError=false}={}){
 const actualGraph=existing?{...graph,jobs:[...graph.jobs,{
  source_ref:url,original_work_id:'work:'+'1'.repeat(32),
  independent_source_proof_verified:true}]}:graph;
 const call=async (_,name,args)=>{
  assert.equal(name,'reality_read_owner_market_repair_proofs_v1');
  assert.deepEqual(args,{p_owner_id:owner});
  return {ok:true,status:'SOURCE_PINNED_BUDGET_REPAIR_CANDIDATE_READBACK',
   owner_id:owner,items:[record],read_only:true,
   installation_authorized:false,production_changed:false};
 };
 const urls=[];
 const fetchImpl=async address=>{
  urls.push(address);
  assert.match(address,/^https:\/\/api\.github\.com\/repos\/maloney2323\/Reality\//);
  if(readError)throw Error('provider unavailable');
  let v;
  if(address.endsWith('/actions/runs/41712961166'))
   v={status:'completed',conclusion:'failure',head_sha:baseline};
  else if(address.endsWith('/actions/runs/41713111625'))
   v={status:'completed',conclusion:greenConclusion,head_sha:candidate};
  else if(address.endsWith('/pulls/211'))
   v={state:'open',head:{sha:prSha,repo:{full_name:'maloney2323/Reality'}},
    base:{repo:{full_name:'maloney2323/Reality'}}};
  else if(address.includes('ref='+baseline))
   v={path:sourceFile,sha:'1'.repeat(40)};
  else if(address.includes('ref='+preview))
   v={path:sourceFile,sha:repairSource==='baseline'?
    '1'.repeat(40):repairSource==='installed'?
    '2'.repeat(40):'3'.repeat(40)};
  else if(address.includes('ref='+candidate))
   v={path:sourceFile,sha:'2'.repeat(40)};
  else throw Error('unexpected source request');
  return {ok:true,json:async()=>v};
 };
 const originalGate=existing?{
  status:'EXISTING_ORIGINAL_AUTHORIZED_INTERNAL_MAINTENANCE',
  owner_id:owner,shift_id:shift,original_work_id:'work:'+'1'.repeat(32),
  source_ref:url,warrant_mode:'UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS',
  read_only:true,canonical_owner_business_original_missing:false,
  original_job_completed:false,installation_authorized:false,
  production_changed:false
 }:null;
 return {actualGraph,originalGate,call,fetchImpl,urls};
}
async function run(x){
 return automaticallyQualifyVerifiedRepairOpportunity({
  db,env,shiftId:shift,workerRunId:worker,
  graph:x.actualGraph,originalGate:x.originalGate,
  call:x.call,fetchImpl:x.fetchImpl
 });
}
test('real RED/GREEN #211 packet is automatically qualified but cannot widen signed #307/#308 warrant',async()=>{
 const x=setup({repairSource:'baseline'});
 const r=await run(x);
 assert.equal(r.status,'AUTOMATIC_VERIFIED_REPAIR_OPPORTUNITIES_QUALIFIED');
 assert.equal(r.owner_scope_decisions_pending,1);
 assert.equal(r.reviewed_candidate_count,1);
 const w=r.work_orders[0];
 assert.equal(x.urls.length,6);
 assert.equal(w.status,'REPAIR_REQUIRES_EXACT_OWNER_ORIGINAL_WORK_BINDING');
 assert.equal(w.source_ref,url);
 assert.equal(w.candidate_commit_sha,candidate);
 assert.equal(w.next_governed_action,'PRESENT_SOURCE_BOUND_OWNER_SCOPE_DECISION');
 assert.equal(w.exact_owner_work_binding_required,true);
 assert.equal(w.owner_scope_decision_ready,true);
 assert.equal(w.inside_existing_original_warrant,false);
 assert.equal(w.installation_authorized,false);
 assert.equal(w.original_job_completed,false);
 assert.equal(w.production_changed,false);
 assert.equal(r.scope_approval_granted,false);
 assert.equal(r.external_effect_performed,false);
});
test('same candidate inside independently proven original scope can prepare review but never install',async()=>{
 const r=await run(setup({repairSource:'baseline',existing:true}));
 const w=r.work_orders[0];
 assert.equal(w.status,'EXISTING_WARRANT_REPAIR_REQUIRES_INDEPENDENT_INSTALL_REVIEW');
 assert.equal(w.next_governed_action,
  'PREPARE_EXISTING_WARRANT_EXACT_INSTALL_TARGET_REVIEW');
 assert.equal(w.inside_existing_original_warrant,true);
 assert.equal(w.owner_scope_decision_ready,false);
 assert.equal(w.exact_install_approval_required,true);
 assert.equal(w.installation_authorized,false);
});
test('a candidate appearing in the source graph remains out of scope without a fresh exact service gate',async()=>{
 const g=setup({repairSource:'baseline',existing:true});
 g.originalGate.canonical_owner_business_original_missing=true;
 const r=await run(g);
 assert.equal(r.work_orders[0].status,
  'REPAIR_REQUIRES_EXACT_OWNER_ORIGINAL_WORK_BINDING');
 assert.equal(r.work_orders[0].installation_authorized,false);
});
test('already-installed bytes are not installed twice, and drift requires new frozen proof',async()=>{
 const installed=await run(setup({repairSource:'installed'}));
 assert.equal(installed.work_orders[0].status,
  'SOURCE_ALREADY_CONTAINS_REPAIR_RECONCILE_ORIGINAL');
 const changed=await run(setup({repairSource:'different'}));
 assert.equal(changed.work_orders[0].status,
  'REPAIR_SOURCE_DRIFT_REBASE_AND_FROZEN_RETEST_REQUIRED');
 for(const x of [installed,changed])
  assert.equal(x.work_orders[0].external_effect_performed,false);
});
test('stale provider PR or invalid green CI cannot be treated as verified',async()=>{
 const moved=await run(setup({repairSource:'baseline',prSha:baseline}));
 assert.equal(moved.work_orders[0].status,
  'REPAIR_INDEPENDENT_SOURCE_OR_CI_PROOF_NOT_CURRENT');
 const failed=await run(setup({repairSource:'baseline',greenConclusion:'failure'}));
 assert.equal(failed.work_orders[0].status,
  'REPAIR_INDEPENDENT_SOURCE_OR_CI_PROOF_NOT_CURRENT');
 const outage=await run(setup({readError:true}));
 assert.equal(outage.work_orders[0].status,'REPAIR_PROVIDER_READBACK_UNAVAILABLE');
 assert.equal(outage.work_orders[0].installation_authorized,false);
});
test('owner scope, forged evidence and unauthorized install assertion fail before any provider GET',async()=>{
 for(const mutated of [
  {...proof,owner_install_authorized:true},
  {...proof,fresh_original_work_verified:true},
  {...proof,frozen_test_sha256:'invalid'},
  {...proof,source_file:'../evil.js'},
  {...proof,independent_red_assertion_failures:0},
  {...proof,installed:true}
 ]){
  const x=setup({record:mutated});
  await assert.rejects(run(x),/AUTO_REPAIR_QUALIFICATION_INDEPENDENT_OWNER_REPAIR_RECEIPT_UNVERIFIED/);
  assert.equal(x.urls.length,0);
 }
 const x=setup();
 await assert.rejects(automaticallyQualifyVerifiedRepairOpportunity({
  db,env:{...env,VERCEL_ENV:'production'},
  graph:x.actualGraph,shiftId:shift,workerRunId:worker,
  call:x.call,fetchImpl:x.fetchImpl
 }),/AUTO_REPAIR_QUALIFICATION_EXISTING_SIGNED_SHIFT_PREVIEW_REQUIRED/);
 assert.equal(x.urls.length,0);
});
test('the signed worker automatically runs qualified opportunity review without minting authority',()=>{
 const source=readFileSync(new URL(
  '../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 assert.match(source,/await automaticallyQualifyVerifiedRepairOpportunity\(/);
 assert.match(source,/automatic_repair_work_order_qualification:/);
 assert.match(source,/WEEKLY_AND_HOMEPAGE_INTAKE_PROVIDER_READ_UNAVAILABLE/);
 assert.match(source,/AUTOMATIC_OWNER_REPAIR_SOURCE_AND_SCOPE_QUALIFICATION/);
});
