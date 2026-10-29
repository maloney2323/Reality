import test from 'node:test';
import assert from 'node:assert/strict';
import {executeOriginalMaintenanceRepair,ORIGINAL_REPAIR_WORK}
 from '../src/reality-extensions/reality-original-maintenance-executor.mjs';
import {readPublicOriginal143GitHubEvidence}
 from '../src/reality-original-143-public-evidence-v0.1.js';

test('REAL original #143 executor resumes using live public GitHub and takes no writes',async(t)=>{
 if(process.env.REALITY_ORIGINAL_143_LIVE!=='true'){
  t.skip('live evidence only in bounded secret-free CI');
  return;
 }
 const visited=[];
 const get=async(path)=>{
  visited.push(path);
  return readPublicOriginal143GitHubEvidence(path,{env:{VERCEL_ENV:'preview'}});
 };
 const result=await executeOriginalMaintenanceRepair({
  workId:ORIGINAL_REPAIR_WORK,
  get,
  // Deliberately NO owner session, write function, or grant; if actual source
  // is not already repaired, it must fail closed without executing a patch.
 });
 assert.equal(result.status,'PREEXISTING_FIX_NOT_EXECUTED_BY_REALITY');
 assert.equal(result.external_write_performed,false);
 assert.equal(result.repair_executed_by_reality,false);
 assert.equal(result.original_job_completed,false);
 assert.equal(visited.length,3);
 assert.ok(visited.some(x=>x.endsWith('/issues/143')));
 assert.ok(visited.some(x=>x.includes('/contents/test/reality-personal-discovered-work-handoff-v0.1.test.js?ref=')));
 assert.ok(visited.some(x=>x.includes('/git/ref/heads/experiment/reality-live-durable-adversarial-20261025')));
});