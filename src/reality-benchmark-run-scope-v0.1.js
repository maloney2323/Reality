// Isolate every paid Reality benchmark run from its historical controls.
// The original 16-turn benchmark root remains immutable and never reused.
export const LEGACY_ADVERSARIAL_ROOT='actual-business-adversarial:20261025:original-versus-reality:16';
export const DEFAULT_COMPARISON_RUN_ID='cleaner-handoff-gpt41-a-20261025';
export const DEFAULT_MINI_RUN_ID='cleaner-handoff-gpt41-mini-a-20261025';

export function makeAdversarialRunScope(runId){
  if(typeof runId!=='string'||!(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(runId))||
     runId.length<10||runId.length>64)
    throw Error('BENCHMARK_RUN_ID_INVALID');
  const suffix='replay:'+runId;
  const scope=Object.freeze({
    runId,
    root:'actual-business-adversarial:20261025:'+suffix,
    worldline:'reality:benchmark:business-ops:'+suffix,
    world:'reality:benchmark:company-operations:'+suffix,
    subjectId:'reality:benchmark:workday-operator:'+suffix,
    conversationId:'adversarial-simulated-business-workday:'+suffix,
  });
  if(scope.root===LEGACY_ADVERSARIAL_ROOT)throw Error('BENCHMARK_LEGACY_ROOT_FORBIDDEN');
  return scope;
}
