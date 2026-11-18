import test from 'node:test';
import assert from 'node:assert/strict';
import { settleShift } from '../src/reality-shift-settlement-v1.js';

const jobs=[
  {work_item_id:'a',continuity_root_id:'root-a'},
  {work_item_id:'b',continuity_root_id:'root-b'},
];
const history={
  a:[{
    shift_id:'shift-1',work_item_id:'a',continuity_root_id:'root-a',
    stage:'VERIFIED_COMPLETION',attempt:2,
    detail:{execution_id:'execution-a',verification_id:'readback-a',
      evidence_refs:['https://github.com/maloney2323/Reality/issues/111']},
  }],
  b:[{
    shift_id:'shift-1',work_item_id:'b',continuity_root_id:'root-b',
    stage:'AWAITING_WORK_AUTHORIZATION',attempt:1,detail:{},
  }],
};

test('partial work is not misrepresented as a completed shift',()=>{
  const result=settleShift({shiftId:'shift-1',jobs,stageHistoryByJob:history});
  assert.equal(result.status,'SHIFT_CLOSED_WITH_UNFINISHED_WORK');
  assert.equal(result.verified_count,1);
  assert.equal(result.unfinished_count,1);
  assert.equal(result.jobs[0].independently_verified,true);
  assert.equal(result.jobs[0].recovery_attempts,1);
  assert.equal(result.jobs[1].state,'AWAITING_AUTHORIZATION');
  assert.equal(result.financial.status,'NOT_MEASURED');
  assert.equal(result.financial.roi_percent,null);
});

test('verified completed shift requires every source-backed job with an independent receipt',()=>{
  const both={...history,b:[{
    shift_id:'shift-1',work_item_id:'b',continuity_root_id:'root-b',
    stage:'VERIFIED_COMPLETION',attempt:1,
    detail:{execution_id:'execution-b',verification_id:'readback-b',
      evidence_refs:['https://github.com/maloney2323/Reality/issues/112']},
  }]};
  const result=settleShift({shiftId:'shift-1',jobs,stageHistoryByJob:both});
  assert.equal(result.status,'ALL_SELECTED_WORK_VERIFIED');
  assert.equal(result.verified_count,2);
  assert.equal(result.repaired_and_resumed_count,1);
});

test('no invented financial ROI; measured versus estimated distinctly labeled',()=>{
  const valuation={
    baseline_manual_minutes:90,hourly_labor_rate_usd:30,
    actual_automation_cost_usd:5,baseline_kind:'ESTIMATED',
    evidence_refs:['time-study:sample-1','invoice:actual-automation-cost'],
  };
  const result=settleShift({shiftId:'shift-1',jobs,stageHistoryByJob:history,valuation});
  assert.equal(result.financial.status,'EVIDENCE_BACKED_ESTIMATE');
  assert.equal(result.financial.gross_labor_value,45);
  assert.equal(result.financial.automation_cost,5);
  assert.equal(result.financial.net_value,40);
  assert.equal(result.financial.roi_percent,800);
  const ungrounded=settleShift({shiftId:'shift-1',jobs,stageHistoryByJob:history,
    valuation:{...valuation,evidence_refs:[]}});
  assert.equal(ungrounded.financial.status,'NOT_MEASURED');
});

test('zero jobs must never be described as a completed shift',()=>{
  const result=settleShift({shiftId:'empty',jobs:[]});
  assert.equal(result.verified_count,0);
  assert.equal(result.status,'SHIFT_CLOSED_WITH_UNFINISHED_WORK');
});