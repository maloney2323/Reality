import test from 'node:test';
import assert from 'node:assert/strict';
import {FOUNDER_REALITY_50,FOUNDER_REALITY_BUSINESS_BASELINE,FOUNDER_REALITY_PRE_REGISTERED_RUBRIC}
 from '../benchmarks/reality-take-intelligence-founder-50-v0.1.mjs';
test('50 cases are a single, frozen, naturally progressing REALITY FOUNDER conversation',()=>{
 assert.equal(FOUNDER_REALITY_50.length,50);
 assert.deepEqual(FOUNDER_REALITY_50.map(t=>t.turn),Array.from({length:50},(_,i)=>i+1));
 assert.deepEqual([...new Set(FOUNDER_REALITY_50.map(t=>t.phase))],
  ['foundation','marketing-detour','pilot-work','pressure','recovery']);
 assert.ok(FOUNDER_REALITY_50.every(t=>t.text.length>75&&!t.text.includes('GRADING_TRANSITION')));
 assert.equal(new Set(FOUNDER_REALITY_50.map(t=>t.text)).size,50);
 assert.equal(FOUNDER_REALITY_50[0].transition,'ONGOING');
 assert.equal(FOUNDER_REALITY_50.at(-1).transition,'FINAL_RECAP');
 assert.ok(FOUNDER_REALITY_50.some(t=>t.transition==='AUTHORIZED_PIVOT'));
 assert.ok(FOUNDER_REALITY_50.some(t=>t.transition==='RETURN_TO_GOAL'));
 assert.ok(FOUNDER_REALITY_50.some(t=>t.transition==='TEMPORARY_DETOUR'));
});
test('business baseline retains actual production-versus-preview and separates reports from attested revenue',()=>{
 assert.equal(FOUNDER_REALITY_BUSINESS_BASELINE.business,'Take Intelligence LLC');
 assert.equal(FOUNDER_REALITY_BUSINESS_BASELINE.product,'Reality');
 assert.equal(FOUNDER_REALITY_BUSINESS_BASELINE.experimental_pr_draft_at_freeze,true);
 assert.equal(FOUNDER_REALITY_BUSINESS_BASELINE.experimental_pr_merged_at_freeze,false);
 assert.ok(FOUNDER_REALITY_BUSINESS_BASELINE.current_claim_limits.some(t=>t.includes('Customer interest')));
 assert.ok(FOUNDER_REALITY_PRE_REGISTERED_RUBRIC.independent_score_categories.includes('UNAUTHORIZED_GOAL_SHIFT'));
 assert.ok(FOUNDER_REALITY_PRE_REGISTERED_RUBRIC.independent_score_categories.includes('LEGITIMATE_PIVOT_FALSE_ALARM'));
 assert.match(FOUNDER_REALITY_PRE_REGISTERED_RUBRIC.no_action,/no external/i);
});
