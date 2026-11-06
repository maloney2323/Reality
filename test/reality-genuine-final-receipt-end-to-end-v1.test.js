import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {deriveGenuineActivationSuite} from '../src/reality-genuine-activation-suite-v1.js';
import {deriveOriginalResumeContract} from '../src/reality-genuine-original-resume-contract-v1.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const source='src/reality-extensions/reality-general-execution-receipt.mjs';
const frozen='test/reality-frozen-regressions/reality-general-execution-receipt-v1.test.js';
const companion='test/reality-extensions/reality-general-execution-receipt.test.js';
const c={
 original_work_id:'work:'+'d'.repeat(32),
 installed_commit_sha:'f'.repeat(40),
 original_source_sha:'a'.repeat(40),
 artifact_sha256:'b'.repeat(64),
 frozen_test_sha256:'c'.repeat(64),
 source_path:source,frozen_test_path:frozen,
 original_job_completed:false,production_changed:false
};
test('post-install monitor never switches the actual General Execution Receipt to another frozen test',()=>{
 const suite=deriveGenuineActivationSuite({file_sha256:[
  {path:source,sha256:'b'.repeat(64)}, {path:companion,sha256:'a'.repeat(64)}
 ]});
 assert.equal(suite.frozen_test_path,frozen);
 assert.ok(suite.tests.includes(frozen));
 assert.ok(suite.tests.includes(companion));
 assert.ok(!suite.tests.includes('test/reality-frozen-regressions/first-reality-ci-evidence-gap.test.js'));
 assert.ok(suite.minimum_verified_tests>=44);
});
test('one original work and exact protocol require an actual pre-settlement denial',()=>{
 const p=deriveOriginalResumeContract(c);
 assert.equal(p.protocol,'TRUSTED_GENERAL_COMPLETION_RECEIPT_V1');
 assert.equal(p.requires_pre_settlement_denial,true);
 assert.equal(p.required_decision,'PRE_SETTLEMENT_DENIED');
 assert.throws(()=>deriveOriginalResumeContract({...c,frozen_test_path:
  'test/reality-frozen-regressions/first-reality-ci-evidence-gap.test.js'}));
 const worker=read('scripts/reality-genuine-original-resume-v1.mjs');
 assert.match(worker,/disposition\?\.verified===false/);
 assert.match(worker,/disposition\?\.status!=='VERIFIED_SETTLED'/);
 assert.match(worker,/pre_settlement_denial_verified:preSettlementDenial/);
 assert.match(worker,/original_job_completed:!contract.requires_reconciliation_evidence&&/);
});
test('signed broker, database and final confirmation do not accept a model-only completed job',()=>{
 const broker=read('supabase/functions/reality-genuine-capability-auto-admit/index.ts');
 const settle=read('supabase/migrations/20261103_genuine_completion_receipt_settlement_protocol_v1.sql');
 const receipt=read('supabase/migrations/20261103_genuine_final_receipt_independent_provider_v1.sql');
 assert.match(broker,/proof.extension_protocol==='TRUSTED_GENERAL_COMPLETION_RECEIPT_V1'/);
 assert.match(broker,/proof.pre_settlement_denial_verified===true/);
 assert.match(settle,/p_proof->>'pre_settlement_denial_verified'='true'/);
 assert.match(settle,/src\/reality-extensions\/reality-general-execution-receipt.mjs/);
 assert.match(receipt,/FINAL_RECEIPT_UNIQUE_VERIFIED_SETTLEMENT_REQUIRED/);
 assert.match(receipt,/c.outcome_receipt->>'independent_outcome_verified'<>'true'/);
 assert.match(receipt,/FINAL_RECEIPT_INDEPENDENT_VERIFIER_PROOF_REQUIRED/);
 assert.match(broker,/'independently_verify_final_customer_receipt'/);
 assert.match(broker,/j.name==='record_independent_original_settlement'/);
 assert.match(broker,/FINAL_RECEIPT_INDEPENDENT_JOB_AND_ARTIFACT_NOT_VERIFIED/);
});
test('workflow has automatic post-settlement verifier then receipt, never another owner click',()=>{
 const workflow=read('.github/workflows/reality-genuine-capability-auto-trigger-v1.yml');
 const first=workflow.indexOf('\n  independently_verify_final_customer_receipt:');
 const second=workflow.indexOf('\n  record_independent_final_receipt:');
 assert.ok(first>0&&second>first);
 assert.match(workflow,/needs: record_independent_original_settlement/);
 assert.match(workflow,/needs: independently_verify_final_customer_receipt/);
 assert.match(workflow,/Independently execute installed completion verifier against final provider receipts/);
 assert.match(workflow,/Independently record one provider-backed final customer receipt/);
 assert.match(workflow,/reality-independent-final-completion-verifier-\$\{\{ github.run_id \}\}/);
 const verifier=read('scripts/reality-genuine-final-completion-verifier-v1.mjs');
 assert.match(verifier,/--network','none'/);
 assert.match(verifier,/--read-only/);
 assert.match(verifier,/--cap-drop','ALL'/);
 assert.match(verifier,/result.negative.length!==5/);
 assert.match(verifier,/settlement_event_id!==settlement.universe_event_id/);
 assert.match(verifier,/REALITY_FINAL_COMPLETION_CANDIDATE_INDEPENDENTLY_VERIFIED/);
 const recorder=read('scripts/reality-genuine-final-completion-record-v1.mjs');
 assert.match(recorder,/reality-independent-final-completion-verifier-/);
 assert.match(recorder,/FULL_LOOP_INDEPENDENTLY_VERIFIED/);
});
test('owner UI and read-only API may display only independently verified final receipts',()=>{
 const api=read('api/reality/personal-genuine-loop-status.js');
 const html=read('index.html');
 assert.match(api,/rpc\/reality_read_owner_final_receipts_v1/);
 assert.match(api,/full_loop_independently_verified:/);
 assert.match(api,/independent_final_receipts:final.receipts/);
 assert.match(html,/full_loop_independently_verified===true/);
 assert.match(html,/Download verified final customer receipt \(PDF\)/);
 assert.match(html,/Final independent completion check pending/);
});

test('historical #188 final receipt recovery binds original provider run and current signed verifier without replay',()=>{
 const broker=read('supabase/functions/reality-genuine-capability-auto-admit/index.ts');
 const workflow=read('.github/workflows/reality-genuine-capability-auto-trigger-v1.yml');
 const verifier=read('scripts/reality-genuine-final-completion-historical-v1.mjs');
 const recorder=read('scripts/reality-genuine-final-completion-historical-record-v1.mjs');
 assert.match(broker,/source.provider_run_id>=run.id/);
 assert.match(broker,/FINAL_RECEIPT_HISTORICAL_SIGNED_SOURCE_UNVERIFIED/);
 assert.match(broker,/historicalRun.status!=='completed'/);
 assert.match(broker,/historicalRun.head_repository\?\.full_name!==REPO/);
 assert.match(broker,/source.installed_commit_sha/);
 assert.match(broker,/FINAL_RECEIPT_INDEPENDENT_PROVIDER_GRAPH_NOT_SETTLED/);
 assert.match(broker,/independently_verify_historical_final_customer_receipt/);
 assert.match(broker,/reality-independent-historical-final-completion-verifier-/);
 assert.match(broker,/FINAL_RECEIPT_INDEPENDENT_JOB_AND_ARTIFACT_NOT_VERIFIED/);
 assert.match(workflow,/contains\(github.event.head_commit.message, '\[recover-final-188\]'\)/);
 assert.match(workflow,/run-id: 41639811554/);
 assert.match(workflow,/needs: independently_verify_historical_final_customer_receipt/);
 assert.match(verifier,/const HISTORICAL_RUN=41639811554/);
 assert.match(verifier,/action:'final_receipt_historical_prepare'/);
 assert.match(verifier,/--network','none'/);
 assert.match(verifier,/negative_cases_rejected:5/);
 assert.match(verifier,/historical_recovery_run_id:Number\(e.GITHUB_RUN_ID\)/);
 assert.match(recorder,/action:'final_receipt_historical_record'/);
 assert.match(recorder,/report.historical_recovery_run_id!==Number\(e.GITHUB_RUN_ID\)/);
 assert.match(recorder,/report.provider_run_id!==HISTORICAL_RUN/);
 assert.match(recorder,/FULL_LOOP_INDEPENDENTLY_VERIFIED/);
});
