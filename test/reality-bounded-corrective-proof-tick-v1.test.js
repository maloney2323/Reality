import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isBoundedCorrectiveProofWake,classifyCorrectiveProofTick}
 from '../src/reality-bounded-corrective-proof-tick-v1.js';
const SHIFT='9460cfff-937a-4105-9093-2e41ab39a950';
const authorized={status:'SHIFT_WORKER_PULSE_DURABLY_RECORDED',
 shift_id:SHIFT,wake_count:1,
 installation_authorized:false,production_changed:false};
const ready={status:'EXACT_SAME_SHIFT_CORRECTIVE_DRAFT_READY_FOR_CI',
 shift_id:SHIFT,original_work_id:'work:'+'a'.repeat(32),
 original_job_completed:false,installation_authorized:false,
 production_changed:false};
const result={status:'CORRECTIVE_CANDIDATE_STAGED_AWAITING_INDEPENDENT_CI',
 original_job_completed:false,installation_authorized:false,
 production_changed:false,new_shift_started:false};
test('only independently warranted pending corrective work takes the bounded lane',()=>{
 assert.equal(isBoundedCorrectiveProofWake(authorized,ready),true);
 assert.equal(isBoundedCorrectiveProofWake({...authorized,wake_count:8740},ready),true);
 assert.equal(isBoundedCorrectiveProofWake(authorized,null),false);
 for(const change of [
  {status:'CLIENT_REQUESTED_WORKER_START'},
  {shift_id:'not-a-uuid'},
  {installation_authorized:true},
  {production_changed:true},
 ])assert.equal(isBoundedCorrectiveProofWake({...authorized,...change},ready),false);
 for(const change of [
  {status:'NO_UNTESTED_SAME_ORIGINAL_CORRECTIVE_REVISION'},
  {shift_id:'00000000-0000-0000-0000-000000000001'},
  {original_work_id:'not-a-work-id'},
  {original_job_completed:true},
  {installation_authorized:true},
  {production_changed:true},
 ])assert.equal(isBoundedCorrectiveProofWake(authorized,{...ready,...change}),false);
});
test('pending CI is a completed worker check, never a completed customer job',()=>{
 const evidence=classifyCorrectiveProofTick(result);
 assert.equal(evidence.worker_status,'WAKE_COMPLETED');
 assert.equal(evidence.worker_result,'CORRECTIVE_CANDIDATE_INDEPENDENT_CI_PENDING');
 assert.equal(evidence.proof_verified,false);
 assert.equal(evidence.http_status,200);
});
test('a passing CI status requires independently bound run evidence',()=>{
 const noProof=classifyCorrectiveProofTick({...result,
  status:'CORRECTIVE_CI_PASSED_EXACT_INSTALL_REVIEW_REQUIRED'});
 assert.equal(noProof.worker_status,'WAKE_FAILED');
 assert.equal(noProof.proof_verified,false);
 const proof=classifyCorrectiveProofTick({...result,
  status:'CORRECTIVE_CI_PASSED_EXACT_INSTALL_REVIEW_REQUIRED',
  independent_ci_verified:true,
  independent_run_url:'https://github.com/owner/repo/actions/runs/43597545469'});
 assert.equal(proof.worker_status,'WAKE_COMPLETED');
 assert.equal(proof.proof_verified,true);
 assert.equal(proof.worker_result,'CORRECTIVE_CI_PASSED_EXACT_REVIEW_REQUIRED');
});
test('failed CI remains open, no receipt or installation is fabricated',()=>{
 const proof=classifyCorrectiveProofTick({...result,
  status:'CORRECTIVE_CI_REJECTED_ORIGINAL_REMAINS_OPEN',
  independent_ci_verified:true,
  independent_run_url:'https://github.com/owner/repo/actions/runs/43597545469'});
 assert.equal(proof.worker_result,'CORRECTIVE_CI_FAILED_REPAIR_REVISION_REQUIRED');
 assert.equal(proof.proof_verified,true);
});
test('unverified broker replies and forged authority never become completion',()=>{
 for(const bad of [
  {status:'ISOLATED_CORRECTIVE_CI_BROKER_EFFECT_UNVERIFIED'},
  {status:'CORRECTIVE_CI_PASSED_EXACT_INSTALL_REVIEW_REQUIRED',
   installation_authorized:true},
  {status:'NO_UNTESTED_SAME_ORIGINAL_CORRECTIVE_REVISION',
   original_job_completed:true},
  {status:'NO_UNTESTED_SAME_ORIGINAL_CORRECTIVE_REVISION',
   production_changed:true},
  {status:'NO_UNTESTED_SAME_ORIGINAL_CORRECTIVE_REVISION',
   new_shift_started:true},
 ])assert.equal(classifyCorrectiveProofTick({...result,...bad}).worker_status,
   'WAKE_FAILED');
});
test('bounded broker reconciliation executes ahead of all-in-one shift pipeline',()=>{
 const code=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',
  import.meta.url),'utf8');
 const bounded=code.indexOf('if(isBoundedCorrectiveProofWake(wakeReceipt,boundedCorrectiveScope))');
 const entire=code.indexOf('await processGovernedEmployeeShiftTick(db,');
 const selected=code.indexOf("'reality_read_next_riley_auto_corrective_ci_v1',{}");
 assert.ok(selected>0&&bounded>selected&&entire>bounded);
 assert.match(code,/return res\.status\(classification\.http_status\)/);
 assert.match(code,/new_shift_started:false,installation_authorized:false/);
 assert.match(code,/WAKE_RECEIVED/);
});
