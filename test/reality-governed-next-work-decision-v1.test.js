import test from 'node:test';
import assert from 'node:assert/strict';
import {selectNextGovernedWork}
 from '../src/reality-governed-next-work-decision-v1.js';
const w=n=>'work:'+n.repeat(32);
const id=n=>n.repeat(8)+'-'+n.repeat(4)+'-4'+n.repeat(3)+'-8'+n.repeat(3)+'-'+n.repeat(12);
const job=(n,phase,extras={})=>({
 original_work_id:w(n),trigger_id:id(n),
 environment:'ISOLATED_PREVIEW',phase,
 candidate_verified:phase==='AWAITING_OWNER_APPROVAL',
 owner_install_approved:phase==='ISOLATED_INSTALLED_PROBATION',
 isolated_installed:phase==='ISOLATED_INSTALLED_PROBATION',
 independently_settled:phase==='SETTLED_ISOLATED'?true:null,
 ...extras,
});
const loop=jobs=>({status:'OWNER_GOVERNED_LOOP_READBACK',
 jobs,owner_installation_authorized_by_read:false,
 external_action_performed:false,production_changed:false});
const shift={authorized:true,status:'RUNNING',
 read_only_sources_available:true,production_changed:false};
const q=n=>({original_work_id:w(n),qualification:{
 artifact_sha256:'e'.repeat(64),installation_authorized:false,
 original_job_completed:false}});
test('existing authorized unfinished original jobs outrank historical settlements',()=>{
 const v=selectNextGovernedWork({loop:loop([
  job('b','SETTLED_ISOLATED'),job('a','PENDING_FROZEN_REPRODUCTION')]),shift});
 assert.equal(v.next_action,'RECHECK_AND_WAKE_EXISTING_ORIGINAL_WORKER');
 assert.equal(v.original_work_id,w('a'));
 assert.equal(v.independently_settled_jobs,1);
 assert.equal(v.active_original_jobs,1);
 assert.equal(v.next_worker_must_revalidate_provider,true);
 assert.equal(v.external_effect_replay_authorized,false);
});
test('unapproved candidate awaits one exact Chat approval while safe work continues',()=>{
 const v=selectNextGovernedWork({loop:loop([
  job('d','AWAITING_OWNER_APPROVAL')]),qualified:[q('d')],shift});
 assert.equal(v.next_action,'EXACT_UPGRADE_APPROVAL_IN_REALITY_CHAT');
 assert.equal(v.owner_action_channel,'EXISTING_REALITY_CHAT');
 assert.equal(v.source_continuation,'MONITOR_AND_INVESTIGATE_ALREADY_AUTHORIZED_SOURCES');
 assert.equal(v.installation_authorized,false);
});
test('a candidate without verified qualification cannot enter owner approval',()=>{
 const v=selectNextGovernedWork({loop:loop([job('c','AWAITING_OWNER_APPROVAL')]),shift});
 assert.equal(v.next_action,'INDEPENDENT_CANDIDATE_READBACK_REQUIRED');
 assert.equal(v.owner_action_required,false);
});
test('installed probation is reconciled, not replayed or treated as settled',()=>{
 const v=selectNextGovernedWork({loop:loop([
  job('b','ISOLATED_INSTALLED_PROBATION'),
  job('a','SETTLED_ISOLATED')]),shift});
 assert.equal(v.next_action,'VERIFY_ORIGINAL_OUTCOME_NO_DUPLICATE_EXECUTION');
 assert.equal(v.original_work_id,w('b'));
 assert.equal(v.original_job_completed,false);
 assert.equal(v.external_effect_replay_authorized,false);
});
test('empty queue still offers bounded discovery, not forged customer work',()=>{
 const v=selectNextGovernedWork({loop:loop([]),shift});
 assert.equal(v.next_action,'NO_ELIGIBLE_JOB');
 assert.equal(v.no_new_executable_work,true);
 assert.equal(v.source_continuation,'MONITOR_AND_INVESTIGATE_ALREADY_AUTHORIZED_SOURCES');
 assert.equal(v.original_work_id,null);
 const without=selectNextGovernedWork({loop:loop([])});
 assert.equal(without.source_continuation,'NO_FURTHER_AUTHORIZED_DISCOVERY_SOURCES');
});
test('ambiguous, forged owner scope and invented state fail closed',()=>{
 const base=loop([job('a','PENDING_FROZEN_REPRODUCTION')]);
 for(const invalid of [
  {...base,production_changed:true},
  {...base,owner_installation_authorized_by_read:true},
  {...base,external_action_performed:true},
  {...base,jobs:[job('a','SETTLED_ISOLATED',{independently_settled:false})]},
  {...base,jobs:[job('a','ANOTHER_FAKE_PHASE')]},
  {...base,jobs:[job('a','SETTLED_ISOLATED'),job('a','PENDING_FROZEN_REPRODUCTION')]},
  {...base,jobs:[job('a','PENDING_FROZEN_REPRODUCTION',{trigger_id:'FAKE'})]}
 ])assert.throws(()=>selectNextGovernedWork({loop:invalid,shift}),/NEXT_WORK_UNTRUSTED_/);
 assert.throws(()=>selectNextGovernedWork({loop:base,shift:{
  ...shift,authorized:false}}),/NEXT_WORK_UNTRUSTED_/);
});
test('no cross-owner qualification can silently substitute for original work',()=>{
 const v=selectNextGovernedWork({loop:loop([job('a','AWAITING_OWNER_APPROVAL')]),
   qualified:[q('b')],shift});
 assert.equal(v.next_action,'INDEPENDENT_CANDIDATE_READBACK_REQUIRED');
 assert.equal(v.owner_action_required,false);
});
