// Frozen acceptance based on REAL original job failure: GitHub Actions
// https://github.com/maloney2323/Reality/actions/runs/41929840317
// Original work bf17... remains ACCEPTED_FOR_ISOLATED_RESUMPTION, not SETTLED.
// No new execution, new settlement, claimed ROI, or production change is permitted.
// This is owner-unbound gap evidence, not authorization to install capability.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHistoricalNoWorkReceipt} from '../../src/reality-extensions/reality-historical-no-work-receipt.mjs';

const valid=()=>({
 status:'HISTORICAL_RECONCILIATION_ALREADY_SATISFIED',
 original_work_id:'work:bf17f1716f7c9550680d761e64f8b591',
 previous_repairing_original_work_id:'work:d90acd41ed1b1116ee74086846d61d42',
 previous_reconciliation_target_work_id:'work:31bf26a5459f5c2d3039da69c39783c8',
 previous_original_universe_event_id:'dfe99dea-62b4-41de-8f94-97ad06c54131',
 previous_target_universe_event_id:'fdbe18d3-ab21-471f-981d-b83ded8286ee',
 independent_database_readback:true,
 current_job_execution_claimed:false,
 original_job_completed:false,
 installation_replay_authorized:false,
 production_changed:false,
});
test('real historical satisfaction yields only a proposed no-new-work receipt',()=>{
 const e=valid(),r=createHistoricalNoWorkReceipt(e);
 assert.deepEqual(r,{
  schema:'reality-historical-no-work-receipt-v1',
  status:'HISTORICAL_OBJECTIVE_SATISFIED_NO_NEW_EXECUTION',
  original_work_id:e.original_work_id,
  historical_repairing_original_work_id:e.previous_repairing_original_work_id,
  historical_target_work_id:e.previous_reconciliation_target_work_id,
  historical_repairing_universe_event_id:e.previous_original_universe_event_id,
  historical_target_universe_event_id:e.previous_target_universe_event_id,
  independent_database_readback:true,
  original_job_completed:false,
  original_execution_replayed:false,
  new_universe_settlement_written:false,
  installation_replay_authorized:false,
  measured_roi_claimed:false,
  production_changed:false,
  durable_terminal_readback_required:true
 });
});
test('proposal is deterministic, with no invented receipt ID or money saved',()=>{
 const a=createHistoricalNoWorkReceipt(valid()),b=createHistoricalNoWorkReceipt(valid());
 assert.deepEqual(a,b);
 for(const key of ['receipt_id','settled_at','saved_labor_hours','roi_usd','owner_approval_id'])
  assert.equal(key in a,false);
});
test('strict provenance: missing evidence field fails closed',()=>{
 for(const field of Object.keys(valid())){
  const e=valid();delete e[field];
  assert.throws(()=>createHistoricalNoWorkReceipt(e),field);
 }
});
test('status must be exact, not a fabricated new settlement',()=>{
 for(const status of ['SETTLED_ISOLATED','ALREADY_SETTLED','NO_ELIGIBLE_ORIGINAL',null])
  assert.throws(()=>createHistoricalNoWorkReceipt({...valid(),status}));
});
test('cannot claim original execution, approval reuse, or production effects',()=>{
 for(const field of ['current_job_execution_claimed','original_job_completed',
  'installation_replay_authorized','production_changed','independent_database_readback']){
  const e=valid();e[field]=!e[field];
  assert.throws(()=>createHistoricalNoWorkReceipt(e),field);
 }
});
test('reject malformed or colliding original job identities',()=>{
 const e=valid();
 for(const field of ['original_work_id','previous_repairing_original_work_id',
  'previous_reconciliation_target_work_id']){
  for(const value of [null,'work:bad','work:'+'x'.repeat(32)])
   assert.throws(()=>createHistoricalNoWorkReceipt({...e,[field]:value}),field);
 }
 assert.throws(()=>createHistoricalNoWorkReceipt({...e,
  previous_repairing_original_work_id:e.original_work_id}));
 assert.throws(()=>createHistoricalNoWorkReceipt({...e,
  previous_reconciliation_target_work_id:e.previous_repairing_original_work_id}));
});
test('reject forged or identical historical SETTLED Universe events',()=>{
 const e=valid();
 for(const field of ['previous_original_universe_event_id','previous_target_universe_event_id'])
  assert.throws(()=>createHistoricalNoWorkReceipt({...e,[field]:'not-verified'}),field);
 assert.throws(()=>createHistoricalNoWorkReceipt({...e,
  previous_target_universe_event_id:e.previous_original_universe_event_id}));
});
test('no evidence means no proposed completion',()=>{
 for(const v of [undefined,null,false,[],{},'source-backed claim'])
  assert.throws(()=>createHistoricalNoWorkReceipt(v));
});
