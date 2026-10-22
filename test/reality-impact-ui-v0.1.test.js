import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const page=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('customer UI exposes evidence-first drift, correction, promotion and ROI placeholders',()=>{
 for(const id of ['realityImpact','impactDataStatus','impactDriftRate','impactCaughtCount','impactContainedCount','impactCorrectionCount','impactUpgradeCount','impactROI','impactEventHistory'])
  assert.ok(page.includes('id="'+id+'"'),'missing UI field '+id);
 assert.ok(page.includes('Not measured'));
 assert.ok(page.includes('No authenticated, independently verified event feed is connected'));
 assert.ok(page.includes('VERIFIED ERRORS CAUGHT'));
 assert.ok(page.includes('CONTAINED BEFORE ACTION'));
 assert.ok(!page.includes('100% hallucination-free'));
});
