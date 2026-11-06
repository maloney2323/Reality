import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {deriveGenuineActivationSuite} from '../src/reality-genuine-activation-suite-v1.js';

const settlement='src/reality-extensions/reality-continuity-settlement-reconciler.mjs';
const companion='test/reality-extensions/reality-continuity-settlement-reconciler.test.js';
function proof(source=settlement){return {file_sha256:[
 {path:source,sha256:'a'.repeat(64)},
 {path:companion,sha256:'b'.repeat(64)}
]};}
test('installed settlement reconciler must rerun its own frozen original suite and real provider relationship holdout',()=>{
 const v=deriveGenuineActivationSuite(proof());
 assert.equal(v.capability,'REALITY_CONTINUITY_SETTLEMENT_RECONCILER');
 assert.ok(v.tests.includes('test/reality-frozen-regressions/reality-continuity-settlement-reconciler-v1.test.js'));
 assert.ok(v.tests.includes('test/reality-201-provider-backed-relationship-holdout-v1.test.js'));
 assert.ok(v.tests.includes(companion));
 assert.ok(!v.tests.includes('test/reality-frozen-regressions/first-reality-ci-evidence-gap.test.js'));
 assert.ok(v.minimum_verified_tests>=44);
});
test('other genuine missing capabilities retain original baseline and mandatory companion suite',()=>{
 const other=deriveGenuineActivationSuite(proof('src/reality-extensions/ci-provider-evidence.mjs'));
 assert.equal(other.capability,'GENERIC_GENUINE_CAPABILITY');
 assert.ok(other.tests.includes('test/reality-frozen-regressions/first-reality-ci-evidence-gap.test.js'));
 assert.ok(!other.tests.includes('test/reality-201-provider-backed-relationship-holdout-v1.test.js'));
});
test('source manifest cannot replace frozen tests or import arbitrary executable paths',()=>{
 for(const files of [[],[{path:settlement}],[
   {path:settlement},{path:companion},{path:companion}],
   [{path:settlement},{path:'test/reality-extensions/../foo.test.js'}],
   [{path:'src/other/evil.mjs'},{path:companion}]
 ]){
  assert.throws(()=>deriveGenuineActivationSuite({file_sha256:files}));
 }
});
test('real installed monitor consumes capability-specific activation suite without weakening isolation',()=>{
 const code=readFileSync(new URL('../scripts/reality-genuine-monitor-installed-preview-v1.mjs',import.meta.url),'utf8');
 assert.match(code,/deriveGenuineActivationSuite\(evidence\)/);
 assert.match(code,/const testPath=activation\.frozen_test_path/);
 assert.match(code,/const suite=activation\.tests/);
 assert.match(code,/observations\.length===5/);
 assert.match(code,/x\.tests>=44/);
 assert.match(code,/--network','none'/);
 assert.match(code,/--read-only/);
 assert.match(code,/--cap-drop','ALL'/);
 assert.match(code,/process\.exitCode=2/);
});

// The genuine #188 capability must NEVER be monitored against the unrelated
// CI-evidence fixture. Its frozen suite is source-bound and remains immutable.
test('general completion receipt gets the exact frozen acceptance and governance regressions',()=>{
 const evidence={file_sha256:[
  {path:'src/reality-extensions/reality-general-execution-receipt.mjs',sha256:'c'.repeat(64)},
  {path:'test/reality-extensions/reality-general-execution-receipt.test.js',sha256:'d'.repeat(64)}
 ]};
 const result=deriveGenuineActivationSuite(evidence);
 assert.equal(result.capability,'REALITY_GENERAL_EXECUTION_RECEIPT');
 assert.equal(result.frozen_test_path,
  'test/reality-frozen-regressions/reality-general-execution-receipt-v1.test.js');
 assert.ok(result.tests.includes(result.frozen_test_path));
 assert.ok(result.tests.includes('test/reality-governed-self-improvement-spine-v1.0.test.js'));
 assert.ok(result.tests.includes('test/reality-genuine-original-resume-contract-v1.test.js'));
 assert.ok(result.tests.includes('test/reality-genuine-activation-suite-v1.test.js'));
 assert.ok(result.tests.includes('test/reality-extensions/reality-general-execution-receipt.test.js'));
 assert.ok(!result.tests.includes('test/reality-frozen-regressions/first-reality-ci-evidence-gap.test.js'));
 assert.ok(result.minimum_verified_tests>=44);
});
