import test from 'node:test';
import assert from 'node:assert/strict';
import {acceptIsolatedInstallation} from '../src/reality-genuine-original-continuation-v1.mjs';
test('no acceptance without independent evidence',()=>{
 assert.throws(()=>acceptIsolatedInstallation({}),/REALITY_CONTINUATION_/);
});
test('an unverified source cannot gain acceptance',()=>{
 assert.throws(()=>acceptIsolatedInstallation({
  scope:{original_work_id:'work:'+'a'.repeat(32),artifact_sha256:'b'.repeat(64),installed_commit_sha:'c'.repeat(40)},
  approval:{approval_id:'x',consumed_at:null},installation:{},observations:[],provider:{}
 }),/REALITY_CONTINUATION_/);
});
