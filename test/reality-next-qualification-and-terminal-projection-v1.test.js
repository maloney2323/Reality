import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chooseNextOwnerQualification} from '../src/reality-next-qualification-v1.js';
const route=readFileSync(new URL('../api/reality/personal-genuine-loop-status.js',import.meta.url),'utf8');
const gap=readFileSync(new URL('../api/reality/personal-gap-intake.js',import.meta.url),'utf8');
const home=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const archive=readFileSync(new URL('../reality-past-jobs-receipts-v1.js',import.meta.url),'utf8');
const WORK='work:bf17f1716f7c9550680d761e64f8b591';
const base={source_url:'https://github.com/maloney2323/Reality/issues/188',
 title:'Source-verified capability candidate',next_proof:'Reproduce the exact owner-bound frozen failure before execution.',
 priority:2,installation_authorized:false,executable_job:false,
 verified_missing_capability:false,candidate_independently_tested:false};
test('owner status reads immutable #201 receipt only for already owner-scoped original work',()=>{
 for(const piece of ['reality_read_owner_genuine_loop_v1',
  'reality_read_genuine_historical_no_work_v1',
  'work:bf17f1716f7c9550680d761e64f8b591',
  "proof.original_work_id===noWorkJob.original_work_id",
  "proof.independent_database_readback===true",
  "proof.unresolved_reconciliation_targets===0",
  "proof.new_execution_claim_consumed===false",
  "proof.new_universe_settlement_written===false",
  "proof.original_job_completed===false",
  "proof.original_execution_replayed===false",
  "historical_no_work_final_disposition:noWorkDispositions.get",
  "terminal_no_new_work_verified:noWorkDispositions.has"]){
  assert.ok(route.includes(piece),'missing owner no-work verification: '+piece);
 }
 assert.doesNotMatch(route,/original_claim|original_settle\b|owner_approve/);
 assert.match(route,/catch\{\/\* Unavailable verification keeps the job pending, never closed/);
});
test('category independently verifies terminal receipt before removing stale #201',()=>{
 assert.match(gap,/reality_read_genuine_historical_no_work_v1/);
 assert.match(gap,/proof\?\.status==='HISTORICAL_OBJECTIVE_SATISFIED_NO_NEW_EXECUTION'/);
 assert.match(gap,/proof\.independent_database_readback===true/);
 assert.match(gap,/proof\.new_execution_claim_consumed===false/);
 assert.match(gap,/proof\.new_universe_settlement_written===false/);
 assert.match(gap,/const currentUnbound=noWorkClosed\?unboundItems\.filter/);
 assert.match(gap,/historical_no_work_final_dispositions:noWorkClosed\?\[noWorkClosed\]:\[\]/);
 assert.match(gap,/chooseNextOwnerQualification\(items/);
 assert.match(gap,/owner_approval_granted:false|next_qualification:nextQualification/);
 assert.doesNotMatch(gap,/reality_record_genuine_historical_no_work|original_claim|original_settle/);
});
test('live UI distinguishes verified closure from new settlement and prioritizes next work',()=>{
 assert.match(home,/Original #201 closed · Objective already satisfied/);
 assert.match(home,/noWork\.new_universe_settlement_written===false/);
 assert.match(home,/noWork\.original_job_completed===false/);
 assert.match(home,/verifiedNoWork=jobs\.filter/);
 assert.match(home,/Next qualification to review:/);
 assert.match(home,/Requires a fresh owner-bound original-job verification/);
 assert.match(archive,/VERIFIED CLOSED · OBJECTIVE ALREADY SATISFIED · NO NEW EXECUTION/);
 assert.match(archive,/closedNoWork \+ ' verified no-new-work final disposition/);
 assert.doesNotMatch(archive,/reality_record_genuine_historical_no_work_v1/);
});
test('verified present customer gap outranks old verified candidate; no automatic execution',()=>{
 const old={...base,key:'candidate:'+'a'.repeat(64),
  kind:'INDEPENDENTLY_TESTED_CANDIDATE',
  candidate_independently_tested:true,priority:1,
  original_work_id:'work:'+'b'.repeat(32)};
 const current={...base,key:'queue:'+'c'.repeat(32),
  kind:'GOVERNED_ORIGINAL_JOB_GAP',
  original_work_id:'work:'+'c'.repeat(32),verified_missing_capability:true,
  priority:8};
 const winner=chooseNextOwnerQualification([old,current]);
 assert.equal(winner.key,current.key);
 assert.equal(winner.verified_current_gap,true);
 assert.equal(winner.execution_started,false);
 assert.equal(winner.owner_approval_granted,false);
 assert.equal(winner.installation_authorized,false);
});
test('historical #188 is a review target, not newly owner authorized',()=>{
 const history={...base,key:'candidate:'+'a'.repeat(64),
  kind:'INDEPENDENTLY_TESTED_CANDIDATE',
  candidate_independently_tested:true,priority:1};
 const result=chooseNextOwnerQualification([history]);
 assert.equal(result.status,'CANDIDATE_REQUIRES_CURRENT_ORIGINAL_JOB_VERIFICATION');
 assert.equal(result.verified_current_gap,false);
 assert.equal(result.owner_approval_granted,false);
 assert.equal(result.execution_started,false);
 assert.equal(result.production_changed,false);
});
test('live independently verified budget defect ranks ahead of historical #188 candidate',()=>{
 const historical={...base,key:'candidate:'+'a'.repeat(64),
  kind:'INDEPENDENTLY_TESTED_CANDIDATE',priority:1,
  candidate_independently_tested:true};
 const repaired={...base,key:'research:'+'b'.repeat(64),
  kind:'RESEARCH_OPPORTUNITY',priority:5,
  next_proof:'Verify the exact tested implementation defect against a fresh owner-bound original job.',
  repair_proof:{
   status:'FROZEN_RED_TO_GREEN_CANDIDATE_VERIFIED',
   owner_install_authorized:false,fresh_original_work_verified:false,
   installed:false,repair_commit_sha:'8368c5db6d5d5e3546b69ab2b86b022e40a00ed9',
   independent_red_assertion_failures:1,independent_green_assertion_passes:5}};
 const result=chooseNextOwnerQualification([historical,repaired]);
 assert.equal(result.key,repaired.key);
 assert.equal(result.kind,'RESEARCH_OPPORTUNITY');
 assert.equal(result.verified_current_gap,false);
 assert.equal(result.owner_approval_granted,false);
 assert.equal(result.execution_started,false);
 assert.equal(result.installation_authorized,false);
 for(const patch of [
  {installed:true},{owner_install_authorized:true},
  {fresh_original_work_verified:true},
  {independent_red_assertion_failures:0},
  {repair_commit_sha:'forged'}
 ]){
  const unavailable={...repaired,repair_proof:{...repaired.repair_proof,...patch}};
  assert.equal(chooseNextOwnerQualification([historical,unavailable]).key,historical.key);
 }
});
test('signed-closed original never reappears as a next qualification',()=>{
 const closed={...base,kind:'GOVERNED_ORIGINAL_JOB_GAP',verified_missing_capability:true,
  key:'queue:'+'a'.repeat(32),original_work_id:WORK};
 assert.equal(chooseNextOwnerQualification([closed],{closedWorkIds:[WORK]}),null);
});
test('untrusted candidate evidence cannot enter next-work queue',()=>{
 const invalid={...base,kind:'INDEPENDENTLY_TESTED_CANDIDATE',
  candidate_independently_tested:true};
 for(const changed of [{installation_authorized:true},
  {executable_job:true},{title:''},{next_proof:'unsupported'},
  {priority:-1}])
  assert.equal(chooseNextOwnerQualification([{...invalid,...changed}]),null);
});
