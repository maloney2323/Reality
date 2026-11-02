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
