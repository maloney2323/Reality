import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const workflow=readFileSync(new URL('../.github/workflows/reality-genuine-capability-auto-trigger-v1.yml',import.meta.url),'utf8');
const section=(start,end)=>{
 const a=workflow.indexOf('  '+start+':');
 const b=workflow.indexOf('  '+end+':',a+3);
 assert.ok(a>=0&&b>a,'Expected original-work sections');
 return workflow.slice(a,b);
};
test('independent settlement runs after successful performed original job despite unrelated skipped needs',()=>{
 const segment=section('record_independent_original_settlement','independently_measure_production_readiness');
 assert.match(segment,/needs: resume_original_job/);
 assert.ok(segment.includes("always() && needs.resume_original_job.result == 'success' && needs.resume_original_job.outputs.performed == 'true'"));
 assert.match(segment,/reality-original-resumption-\$\{\{ github.run_id \}\}/);
 assert.match(segment,/node scripts\/reality-genuine-original-settle-v1\.mjs/);
 assert.match(segment,/id-token: write/);
});
test('normal job continuation remains gated by verified activation or recovery not unrelated approval',()=>{
 const segment=section('resume_original_job','record_independent_original_settlement');
 assert.match(segment,/needs: \[record_owner_approved_activation, recover_consumed_preview_install, record_consumed_preview_recovery, reconcile_all_settled_outcomes\]/);
 assert.match(segment,/always\(\)/);
 assert.match(segment,/needs.record_owner_approved_activation.result == 'success'/);
 assert.match(segment,/needs.record_consumed_preview_recovery.result == 'success'/);
 assert.match(segment,/needs.reconcile_all_settled_outcomes.result == 'success'/);
 assert.match(segment,/needs.recover_consumed_preview_install.result == 'success'/);
 assert.match(segment,/node scripts\/reality-genuine-original-resume-v1\.mjs/);
});
