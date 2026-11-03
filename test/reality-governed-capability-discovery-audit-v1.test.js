import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {
 inspectCurrentWorkflowRegressions,inspectSourceVerifiedGaps,
 discoverGovernedCapabilityAudit,saveGovernedCapabilityAudit,
} from '../src/reality-customer-capability-discovery-audit-v1.js';
const now=Date.parse('2026-11-03T17:00:00Z');
const base='https://github.com/maloney2323/Reality/';
const sha='a'.repeat(40);
function run(id,{conclusion='failure',at=now-1000,branch='feature/reality',
 workflow_id=412,name='Worker failure',repo='maloney2323/Reality'}={}){
 return {id,workflow_id,name,conclusion,status:'completed',
  html_url:base+'actions/runs/'+id,head_sha:sha,
  head_branch:branch,head_repository:{full_name:repo},
  updated_at:new Date(at).toISOString()};
}
const gap={
 independently_verified:true,owner_goal_bound:false,
 installation_authorized:false,job_completed:false,
 issue_number:777,issue_title:'Missing exact receipt verifier',
 issue_url:base+'issues/777',
 original_provider_failed_run_id:1234567,
 source_sha:sha,source_path:'src/reality-extensions/receipt.mjs',
 original_work_id_for_provider_observation:'work:'+'b'.repeat(32),
};
test('two current independent failures without a later success are a review candidate, NOT a verified missing capability',()=>{
 const result=inspectCurrentWorkflowRegressions({
  workflow_runs:[run(101),run(102,{at:now-2000})],
 },{now});
 assert.equal(result.length,1);
 assert.equal(result[0].kind,'REPEATED_CI_FAILURE');
 assert.equal(result[0].observed_failure_count,2);
 assert.match(result[0].evidence_status,/MISSING_CAPABILITY_UNPROVEN/);
 assert.equal(result[0].original_work_id,null);
 assert.equal(result[0].evidence_url,base+'actions/runs/101');
});
test('fresh success, 7-day stale failures, foreign repos and invalid URLs do not produce false candidates',()=>{
 const examples=[
  [run(101),run(102,{at:now-2000}),run(103,{conclusion:'success',at:now-500})],
  [run(101,{at:now-8*86400000}),run(102,{at:now-8*86400000-500})],
  [run(101,{repo:'attacker/other'}),run(102,{repo:'attacker/other'})],
  [{...run(101),html_url:'https://evil.invalid/a'},run(102)],
 ];
 for(const workflow_runs of examples)
  assert.equal(inspectCurrentWorkflowRegressions({workflow_runs},{now}).length,0);
});
test('failed run on another branch is not conflated with other workflow',()=>{
 const candidates=inspectCurrentWorkflowRegressions({
  workflow_runs:[run(101,{branch:'main'}),run(102,{branch:'preview'})],
 },{now});
 assert.equal(candidates.length,0);
});
test('frozen-source gap requires independent source proof and no authority',()=>{
 const candidates=inspectSourceVerifiedGaps({opportunities:[
  gap,{...gap,issue_number:778,issue_url:base+'issues/778',job_completed:true},
  {...gap,issue_number:779,issue_url:base+'issues/779',independently_verified:false},
 ]});
 assert.equal(candidates.length,1);
 assert.equal(candidates[0].kind,'SOURCE_VERIFIED_GAP');
 assert.match(candidates[0].evidence_status,/CURRENT_INSTALLATION_UNVERIFIED/);
 assert.equal(candidates[0].original_work_id,gap.original_work_id_for_provider_observation);
 assert.equal(candidates[0].evidence_url,gap.issue_url);
});
test('audit reports independent provider coverage, hashes and 2 classes without mutating a job',async()=>{
 const report=await discoverGovernedCapabilityAudit({
  now,readRuns:async()=>({workflow_runs:[run(101),run(102)]}),
  readGaps:async()=>({opportunities:[gap]}),
 });
 assert.equal(report.candidates.length,2);
 assert.deepEqual(report.candidates.map(x=>x.kind),
  ['SOURCE_VERIFIED_GAP','REPEATED_CI_FAILURE']);
 assert.match(report.report_sha256,/^[a-f0-9]{64}$/);
 assert.equal(report.installation_authorized,false);
 assert.equal(report.worker_started,false);
 assert.equal(report.production_changed,false);
 assert.equal(report.source_coverage.github_frozen_source,'INDEPENDENT_SOURCE_CHECKED');
});
test('one failed source is partial, all failed sources refuse an audit',async()=>{
 const partial=await discoverGovernedCapabilityAudit({
  now,readRuns:async()=>{throw Error('rate limited')},
  readGaps:async()=>({opportunities:[gap]}),
 });
 assert.equal(partial.source_coverage.github_recent_actions,'UNAVAILABLE');
 assert.equal(partial.candidates.length,1);
 await assert.rejects(discoverGovernedCapabilityAudit({
  now,readRuns:async()=>{throw Error('not available')},
  readGaps:async()=>{throw Error('not available')},
 }),/ALL_LIVE_PROVIDER_SOURCES_UNAVAILABLE/);
});
test('durable audited candidates are owner bound; database novelty is verified against exact source fingerprint',async()=>{
 const report=await discoverGovernedCapabilityAudit({
  now,readRuns:async()=>({workflow_runs:[run(101),run(102)]}),
  readGaps:async()=>({opportunities:[]}),
 });
 const owner='22222222-2222-4222-8222-222222222222';
 let calls=0;
 const saved=await saveGovernedCapabilityAudit({
  report,ownerId:owner,db:{strictSecrets:true,secretKey:'test-service-key',
   url:'https://hvkfreoagbrphwghjajw.supabase.co'},
  fetchImpl:async(url,opts)=>{
   calls++;
   assert.match(url,/\/rpc\/reality_record_owner_capability_discovery_audit_v1$/);
   assert.equal(opts.method,'POST');
   const sent=JSON.parse(opts.body);
   assert.equal(sent.p_owner_id,owner);
   assert.equal(sent.p_report.report_sha256,report.report_sha256);
   return {ok:true,json:async()=>({
    ok:true,status:'GOVERNED_AUDIT_RECORDED',
    audit_id:'11111111-1111-4111-8111-111111111111',
    candidates:report.candidates.map(x=>({
     ...x,novelty:'FIRST_OBSERVED_IN_OWNER_AUDIT'})),
    new_evidence_count:1,
    installation_authorized:false,job_started:false,production_changed:false,
   })};
  }
 });
 assert.equal(calls,1);
 assert.equal(saved.audit_executed,true);
 assert.equal(saved.candidates[0].novelty,'FIRST_OBSERVED_IN_OWNER_AUDIT');
 assert.equal(saved.original_job_completed,false);
});
test('tampered provider novelty or unauthorized installation cannot be presented',async()=>{
 const report=await discoverGovernedCapabilityAudit({
  now,readRuns:async()=>({workflow_runs:[run(101),run(102)]}),
  readGaps:async()=>({opportunities:[]}),
 });
 const db={strictSecrets:true,secretKey:'test-service-key',
  url:'https://hvkfreoagbrphwghjajw.supabase.co'};
 for(const poison of [
  {novelty:'INSTALL_APPROVED'},
  {novelty:'FIRST_OBSERVED_IN_OWNER_AUDIT',fingerprint:'x'.repeat(64)},
 ]){
  await assert.rejects(saveGovernedCapabilityAudit({
   report,ownerId:'22222222-2222-4222-8222-222222222222',db,
   fetchImpl:async()=>({ok:true,json:async()=>({
    ok:true,status:'GOVERNED_AUDIT_RECORDED',
    audit_id:'11111111-1111-4111-8111-111111111111',
    candidates:report.candidates.map(x=>({...x,...poison})),
    installation_authorized:false,job_started:false,production_changed:false,
   })}),
  }),/OWNER_AUDIT_SOURCE_RECONCILIATION_FAILED/);
 }
});
test('route requires an explicit POST and does not grant access with an unauthenticated GET',async()=>{
 const {default:handler}=await import('../api/reality/personal-capability-discovery-audit.js');
 const captured={};
 const res={
  setHeader(){return this},
  status(code){captured.status=code;return this},
  json(data){captured.data=data;return this},
 };
 await handler({method:'GET',headers:{},query:{}},res);
 assert.equal(captured.status,405);
 assert.equal(captured.data.ok,false);
 assert.match(captured.data.error,/EXPLICIT_POST_REQUIRED/);
});
