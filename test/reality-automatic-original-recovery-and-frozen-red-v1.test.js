import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const broker=source('supabase/functions/reality-genuine-capability-auto-admit/index.ts');
const observe=source('scripts/reality-genuine-worker-failure-observe-v1.mjs');
const workflow=source('.github/workflows/reality-real-gap-acceptance-before-model-v1.yml');

test('signed existing worker durably acknowledges same-original recovery before it reports success',()=>{
 const start=broker.indexOf("if(input?.action==='observe_worker_failure')");
 const end=broker.indexOf("if(input?.action==='owner_source_attest')",start);
 assert.ok(start>=0&&end>start);
 const action=broker.slice(start,end);
 for(const piece of [
  "verify(bearer,input.scope.repository_sha,ghProviderToken)",
  "reality_record_genuine_worker_failure_v1",
  "rpc/reality_commit_genuine_original_recovery_v1",
  "p_observation_id:saved.observation_id",
  "recovery.observation_id!==saved.observation_id",
  "recovery.original_work_id!==saved.original_work_id",
  "recovery.trigger_id!==saved.trigger_id",
  "recovery.provider_evidence_sha256!==evidenceSha",
  "recovery.must_preserve_original_job!==true",
  "recovery.retry_external_effects_authorized!==false",
  "recovery.model_generation_authorized!==false",
  "recovery.owner_approval_for_new_install_still_required!==true",
  "recovery.original_job_completed!==false",
  "recovery.installation_authorized!==false",
  "recovery.production_changed!==false",
  "SIGNED_ORIGINAL_RECOVERY_CHECKPOINT_NOT_PERSISTED",
  "original_job_obligation_preserved:true"
 ]) assert.ok(action.includes(piece),piece);
 assert.ok(action.indexOf('reality_record_genuine_worker_failure_v1')<
  action.indexOf('rpc/reality_commit_genuine_original_recovery_v1'));
 assert.ok(action.indexOf('rpc/reality_commit_genuine_original_recovery_v1')<
  action.indexOf('return respond({ok:true,...saved'));
 assert.doesNotMatch(action,/api\.openai\.com|INSERT INTO reality_internal\.genuine_capability_queue/);
});
test('signed observation refuses success without recovery checkpoint and preserves exact receipt',()=>{
 for(const piece of [
   "data.original_job_obligation_preserved!==true",
   "data.recovery_id",
   "data.recovery_status",
   "data.next_evidence_action",
   "original_job_obligation_preserved:data.original_job_obligation_preserved===true"
 ]) assert.ok(observe.includes(piece),piece);
 assert.ok(observe.includes("action:'observe_worker_failure'"));
 assert.ok(!observe.includes("action:'original_claim'"));
});
test('real gap workflow syntax and frozen negative acceptance are defined, not a zero-job broken workflow',()=>{
 assert.match(workflow,/^jobs:\n  independent-original-customer-acceptance:\n/m);
 assert.match(workflow,/^  push:\n    branches:\n/m);
 assert.match(workflow,/^      - '.github\/workflows\/reality-real-gap-acceptance-before-model-v1.yml'$/m);
 assert.match(workflow,/- name: "Regression: governance and exact-owner installation gates"/);
 assert.doesNotMatch(workflow,/- name: Regression: governance/);
 assert.match(workflow,/node --test "\$frozen" > "\$RUNNER_TEMP\/reality-frozen-red.log"/);
 assert.match(workflow,/grep -Fq "ERR_MODULE_NOT_FOUND"/);
 assert.match(workflow,/grep -Fq "reality-general-execution-receipt.mjs"/);
 assert.match(workflow,/test -e "\$missing"/);
 assert.match(workflow,/NO_OWNER_BOUND_INSTALL_AUTHORIZATION/);
 assert.match(workflow,/NO_CUSTOMER_JOB_COMPLETION/);
 assert.ok(existsSync(new URL('../test/reality-frozen-regressions/reality-general-execution-receipt-v1.test.js',import.meta.url)));
 // The frozen test should still reference the genuinely missing source.
 assert.match(source('test/reality-frozen-regressions/reality-general-execution-receipt-v1.test.js'),
  /src\/reality-extensions\/reality-general-execution-receipt.mjs/);
});
