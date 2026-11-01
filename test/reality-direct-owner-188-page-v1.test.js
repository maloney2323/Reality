import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const page=readFileSync(new URL('../approve-188.html',import.meta.url),'utf8');
test('a signed-in human action, never page load, grants exact isolated repair scope',()=>{
 assert.match(page,/id="approve" disabled/);
 assert.match(page,/await fetch\('\/api\/reality\/personal-session'/);
 assert.match(page,/btn\.onclick=async\(\)=>/);
 assert.match(page,/method:'POST',credentials:'same-origin'/);
 assert.match(page,/OWNER_AUTHORIZE_PREPARE_AND_QUEUE_EXACT_REPAIR/);
 assert.match(page,/I_AUTHORIZE_THIS_EXACT_ISOLATED_REPAIR_AND_ORIGINAL_JOB_CONTINUATION/);
 assert.match(page,/4c95744d2935766e81c1b337bf4504ce1e614a4ae54a0ed159e77e7cc7fafd96/);
 assert.match(page,/work:1eecc0d71b21492e0cfdd527f9c257f3/);
 assert.doesNotMatch(page,/OWNER_APPROVE_EXACT_INSTALL/);
 assert.doesNotMatch(page,/window\.onload\s*=\s*approve/);
});
test('page never claims completion from a queued approval',()=>{
 assert.match(page,/data\.owner_approval_consumed!==true/);
 assert.match(page,/data\.original_job_completed!==false/);
 assert.match(page,/not yet independently verified/);
 assert.doesNotMatch(page,/result\.textContent=.*ORIGINAL_JOB_INDEPENDENTLY_SETTLED/);
});
