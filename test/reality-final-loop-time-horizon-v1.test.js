import test from 'node:test';
import assert from 'node:assert/strict';
import {projectRealityFinalLoopTimeHorizon as project}
 from '../src/reality-final-loop-time-horizon-v1.js';
import {evaluateRealityFinalLoopEngine} from
 '../src/reality-shift-unified-execution-controller-v1.js';
import {readFileSync} from 'node:fs';

const owner='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const shift='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
const hash=s=>'sha256:'+s.repeat(64);
const original='work:'+'1'.repeat(32);
const source='https://github.com/maloney2323/Reality/issues/301';
const base={
 schema:'reality-final-loop-engine-v1',
 owner_id:owner,shift_id:shift,continuity_head_sha256:hash('a'),
 original_job_completed:false,shift_completed:false,
 installation_authorized:false,production_changed:false,
 decisions:[{
  original_work_id:original,source_ref:source,decision:'SETTLE',
  next_governed_action:'REQUEST_ATOMIC_ORIGINAL_SETTLEMENT_AND_INDEPENDENT_READBACK',
  reason:'FOUR_PROOFS_AND_UNIVERSE_OUTCOME_REQUIRE_DURABLE_CLOSURE',
  transition_committed:false
 }]
};
const past={
 status:'INDEPENDENT_HISTORY_VERIFIED',
 receipt_scope:'INDEPENDENT_SETTLED_FULL_LOOP_ONLY',
 verified_final_loop_receipts:3,
 most_recent_verified_at:'2026-11-21T15:00:00Z'
};
test('Past reflects independent receipts, not proposed SETTLE requests',()=>{
 const p=project({engine:base,independentHistory:past});
 assert.equal(p.status,'FINAL_LOOP_TIME_HORIZONS_PROJECTED_READ_ONLY');
 assert.equal(p.past.independently_verified_full_loop_receipts,3);
 assert.equal(p.present.uncommitted_settlement_requests,1);
 assert.equal(p.future.preparations[0].automatically_executable,false);
 assert.equal(p.settlement_committed,false);
 assert.equal(p.original_job_completed,false);
 assert.equal(p.universe_return_independently_verified,false);
});
test('Past history cannot be manufactured from Final Loop Engine proposal',()=>{
 const p=project({engine:base});
 assert.equal(p.past.status,'INDEPENDENT_PAST_READBACK_REQUIRED');
 assert.equal(p.past.independently_verified_full_loop_receipts,null);
 assert.equal(p.present.obligations[0].decision,'SETTLE');
});
test('source-only original remains an unfinished proof obligation, not an admitted job',()=>{
 const b={...base,schema:'reality-final-loop-signed-worker-bridge-v1',
 status:'FINAL_LOOP_ORIGINAL_GOAL_ACCEPTANCE_PENDING',
 decisions:[{...base.decisions[0],original_work_id:null,
  decision:'REFRESH',
  next_governed_action:'INDEPENDENTLY_BIND_FROZEN_ORIGINAL_GOAL_ACCEPTANCE_AND_FOUR_PROOFS'
 }]};
 const p=project({engine:b});
 assert.equal(p.present.status,'CURRENT_VERIFIED_SHIFT_ACCEPTANCE_PENDING');
 assert.equal(p.present.obligations[0].source_admission_verified,false);
 assert.equal(p.future.preparations[0].automatically_executable,false);
 assert.equal(p.new_work_authorized,false);
});
test('cross-scope, unknown action, or fabricated transition fails closed',()=>{
 const mutations=[
  {...base,owner_id:null},
  {...base,decisions:[{...base.decisions[0],decision:'RESTART_NOW'}]},
  {...base,decisions:[{...base.decisions[0],transition_committed:true}]},
  {...base,original_job_completed:true}
 ];
 for(const x of mutations){
  const p=project({engine:x,independentHistory:past});
  assert.equal(p.status,'NO_SIGNED_FINAL_LOOP_ENGINE_READBACK');
  assert.equal(p.future.preparations.length,0);
  assert.equal(p.execution_authorized,false);
 }
});
test('existing Past, Present, Future frontend is not another control plane',()=>{
 const ui=readFileSync(new URL('../reality-past-present-future-v1.js',import.meta.url),'utf8');
 const worker=readFileSync(new URL('../src/reality-final-loop-signed-worker-bridge-v1.js',import.meta.url),'utf8');
 const controller=readFileSync(new URL('../src/reality-shift-unified-execution-controller-v1.js',import.meta.url),'utf8');
 assert.match(ui,/matrixPastCount/);
 assert.match(ui,/matrixPresentCount/);
 assert.match(ui,/matrixFutureCount/);
 assert.match(worker,/time_horizon:evaluation.time_horizon/);
 assert.match(controller,/time_horizon:projectRealityFinalLoopTimeHorizon/);
 assert.doesNotMatch(worker,/grantFinalLoopAuthorityFromFuture/);
});
