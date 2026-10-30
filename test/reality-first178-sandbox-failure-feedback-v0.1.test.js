import test from 'node:test';
import assert from 'node:assert/strict';
import {extractSandboxFailureEvidence}
 from '../src/reality-foundational-vercel-sandbox-adapter-v1.0.js';
test('original #178: model receives the failing frozen assertion, not 8 KB of successful test tail',()=>{
 const early=[
  'TAP version 13',
  '# Subtest: superseding success prevents upgrade',
  'not ok 5 - superseding success prevents upgrade',
  '  ---',
  '  error: |-',
  '    Expected values to be strictly equal:',
  "    + 'MISSING_CAPABILITY'",
  "    - 'NO_UPGRADE_NEEDED'",
  "    code: 'ERR_ASSERTION'",
  '  ...',
 ].join('\n');
 const late=Array.from({length:220},(_,i)=>
  '# Subtest: unrelated passing constitutional test '+i+
  '\nok '+(i+6)+' - unrelated passing constitutional test '+i+
  '\n  ---\n  duration_ms: 0.2\n  ...').join('\n');
 const out=extractSandboxFailureEvidence(early+'\n'+late+'\n# tests 225\n# pass 224\n# fail 1',
  '# Subtest: model authored test\nok 1 - model authored test\n# tests 1\n# pass 1\n# fail 0');
 assert.match(out,/not ok 5 - superseding success prevents upgrade/);
 assert.match(out,/NO_UPGRADE_NEEDED/);
 assert.match(out,/MISSING_CAPABILITY/);
 assert.match(out,/\[MODEL_CANDIDATE independent sandbox diagnostics\]/);
 assert.ok(!out.includes('unrelated passing constitutional test 219'));
 assert.ok(out.length<=8000);
});
test('independent provider output exposes multiple failure blocks instead of first or last only',()=>{
 const out=extractSandboxFailureEvidence([
  'not ok 3 - insufficient evidence',
  '  error: |-',
  '    actual: MISSING_CAPABILITY',
  '    expected: INSUFFICIENT_EVIDENCE',
  '  ...',
  'ok 4 - good test',
  'not ok 5 - superseding success',
  "  error: Superseded run must not trigger upgrade",
  '  ...',
  '# tests 8','# pass 6','# fail 2',
 ].join('\n'),[
  'not ok 1 - model-authored test',
  '  error: ReferenceError: describe is not defined',
  '  ...',
  '# tests 1','# pass 0','# fail 1',
 ].join('\n'));
 assert.match(out,/not ok 3 - insufficient evidence/);
 assert.match(out,/not ok 5 - superseding success/);
 assert.match(out,/ReferenceError: describe is not defined/);
 assert.match(out,/\[FROZEN independent sandbox diagnostics\]/);
});
