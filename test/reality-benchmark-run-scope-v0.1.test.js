import test from 'node:test';
import assert from 'node:assert/strict';
import {makeAdversarialRunScope,LEGACY_ADVERSARIAL_ROOT,
  DEFAULT_COMPARISON_RUN_ID,DEFAULT_MINI_RUN_ID} from '../src/reality-benchmark-run-scope-v0.1.js';

test('a replay never shares any scoped persistence identity with the 16-turn original',()=>{
  const a=makeAdversarialRunScope(DEFAULT_COMPARISON_RUN_ID);
  assert.notEqual(a.root,LEGACY_ADVERSARIAL_ROOT);
  for(const key of ['root','world','worldline','subjectId','conversationId'])
    assert.match(a[key],/replay:cleaner-handoff-gpt41-a-20261025$/);
});
test('a different replay and a weaker-model replay cannot consume the comparison history',()=>{
  const sameModel=makeAdversarialRunScope(DEFAULT_COMPARISON_RUN_ID);
  const mini=makeAdversarialRunScope(DEFAULT_MINI_RUN_ID);
  const another=makeAdversarialRunScope('cleaner-handoff-gpt41-b-20261025');
  for(const key of ['root','world','worldline','subjectId','conversationId']){
    assert.notEqual(sameModel[key],mini[key]);
    assert.notEqual(sameModel[key],another[key]);
    assert.notEqual(mini[key],another[key]);
  }
});
test('unsafe run identifiers cannot escape the isolated continuity namespace',()=>{
  for(const id of ['', 'original-versus-reality:16','../production','foo/bar',
    'UPPERCASE', 'spaces are unsafe', 'a'.repeat(65),undefined]){
    assert.throws(()=>makeAdversarialRunScope(id),/BENCHMARK_RUN_ID_INVALID/);
  }
});
test('scope is immutable',()=>{
  assert.equal(Object.isFrozen(makeAdversarialRunScope(DEFAULT_COMPARISON_RUN_ID)),true);
});
