import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {classifyOriginal143Error} from '../api/reality/personal-original-full-loop.js';
test('Actual owner goal failure is shown rather than misleading generic unavailable',()=>{
 assert.equal(classifyOriginal143Error(Error('ORIGINAL_UPGRADE_OWNER_GOAL_NOT_VERIFIED')),
 'ORIGINAL_UPGRADE_OWNER_GOAL_NOT_VERIFIED');
});
test('Actual provider failure is classified without disclosing provider payload',()=>{
 assert.equal(classifyOriginal143Error(Error('GITHUB_CONNECTOR_403')),'GITHUB_CONNECTOR_403');
 assert.equal(classifyOriginal143Error(Error('CONNECTOR_CREDENTIAL_MISSING:github')),
 'ORIGINAL_143_GITHUB_CREDENTIAL_MISSING');
});
test('private preview database mismatch has a precise safe code',()=>{
 assert.equal(classifyOriginal143Error(Error('PERSONAL_GOAL_ISOLATED_PROJECT_MISMATCH')),
  'PERSONAL_GOAL_ISOLATED_PROJECT_MISMATCH');
 assert.equal(classifyOriginal143Error(Error('RELIABILITY_BENCHMARK_PROJECT_NOT_ALLOWLISTED')),
  'RELIABILITY_BENCHMARK_PROJECT_NOT_ALLOWLISTED');
});
test('unknown exceptions never disclose tokens, SQL or arbitrary provider text',()=>{
 for(const value of [
  'Bearer super-secret-key',
  'invalid input syntax for type uuid: secret',
  'original failed\npassword=abc',
  'https://test.invalid/path?apikey=secret',
  'ORIGINAL_UPGRADE_'+'A'.repeat(500),
 ]){
  assert.equal(classifyOriginal143Error(Error(value)), 'ORIGINAL_143_ACTION_UNAVAILABLE');
 }
});
test('readiness failures are reported with a bounded stage and never auto-enable activation',()=>{
 const source=readFileSync('api/reality/personal-original-full-loop.js','utf8');
 assert.match(source,/phase='READINESS'/);
 assert.match(source,/failed_stage:phase/);
 assert.match(source,/job_completion_not_proven:true/);
 assert.match(source,/ACTIVATE_RESUME_SETTLE_ORIGINAL_143/);
 assert.match(source,/assertSameOrigin\(req\)/);
 assert.doesNotMatch(source,/req\.method==='GET'[\s\S]{0,350}completeOriginal143OwnerAction/);
});