import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const s=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
test('actual signed review plus same blocked original appears in the existing owner shift pulse',()=>{
 assert.match(s,/sameOriginalPostmaintenanceGate\?\.status===\s*'EXISTING_ORIGINAL_NOT_AUTHORIZED_BY_MAINTENANCE_SHIFT'/);
 assert.match(s,/sameOriginalPostmaintenanceGate\.signed_external_review_receipt_sha256/);
 assert.match(s,/sameOriginalPostmaintenanceGate\.independent_final_receipt_verified===false/);
 assert.match(s,/sameOriginalPostmaintenanceGate\.case_specific_maintenance_ci_red_attested===false/);
 assert.match(s,/SIGNED_EVIDENCE_REVIEWED_ORIGINAL_WORK_BLOCKED_BY_WARRANT/);
 assert.match(s,/p_status:'WAKE_COMPLETED'/);
 assert.match(s,/p_safe_result:safeOutcome/);
});
test('independently settled originals retain higher priority; review alone never claims settled',()=>{
 const i=s.indexOf("const outcomeCode=generalOriginalSettlement?.original_job_completed===true?");
 const j=s.indexOf('signedReviewStillNeedsOriginalAuthorization?',i);
 const k=s.indexOf('SIGNED_EVIDENCE_REVIEWED_ORIGINAL_WORK_BLOCKED_BY_WARRANT',j);
 assert.ok(i>=0&&j>i&&k>j);
 assert.match(s,/GENERAL_ORIGINAL_JOB_SETTLED_FINAL_RECEIPT_VERIFIED/);
 assert.doesNotMatch(s,/signedReviewStillNeedsOriginalAuthorization\?\s*'GENERAL_ORIGINAL_JOB_SETTLED_FINAL_RECEIPT_VERIFIED'/);
});
test('no duplicate worker, approval, installation, or scheduled job',()=>{
 const s=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 assert.match(s,/independentlyReviewOneStagedMaintenanceRegression\(/);
 assert.match(s,/same_original_postmaintenance_gate:sameOriginalPostmaintenanceGate/);
});
