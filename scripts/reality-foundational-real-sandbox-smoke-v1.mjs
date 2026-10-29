// A REAL Docker smoke proof of the foundational sandbox, NOT a real job.
// No OpenAI key, real owner data, model request, or capability installation.
// It tests the hardened verifier with a harmless code fixture and Reality's
// existing frozen constitutional test suite in an isolated container.
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createFoundationalBuildTicket,validateFoundationalCandidate,
 createSandboxEvidenceCandidate}
 from '../src/reality-foundational-build-loop-v1.0.js';
import {createIsolatedDockerSandbox}
 from '../src/reality-foundational-sandbox-adapter-v1.0.js';
const image=process.argv[2];
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const raw=readFileSync('test/reality-frozen-regressions/ci-constitutional-v1.json','utf8');
const sha=x=>createHash('sha256').update(x).digest('hex');
const ticket=createFoundationalBuildTicket({
 owner_id:'FIXTURE_ONLY_NOT_A_REAL_OWNER',goal_id:'fixture:regression-smoke',
 goal_transition_receipt_ref:'FIXTURE_ONLY:no-durable-approval',
 goal_evidence_ref:'FIXTURE_ONLY:no-real-user-data',
 original_work_id:'work:'+'e'.repeat(32),
 continuity_root_id:'fixture:root',worldline_id:'fixture:worldline',
 confirmed_gap_receipt_ref:'FIXTURE_ONLY:no-real-gap',
 confirmed_gap_evidence_hash:'FIXTURE_ONLY:not-provider-backed',
 confirmed_gap_source:'INDEPENDENT_PROVIDER_READBACK',
 frozen_regression_manifest_ref:'ci-constitutional-v1',
 frozen_regression_sha256:sha(raw),repository_base_sha:commit,
 environment:'ISOLATED_PREVIEW',max_attempts:1,
 allowed_source_roots:['src/reality-extensions/','test/reality-extensions/']
});
const output={ticket_hash:ticket.ticket_hash,original_work_id:ticket.original_work_id,
 rationale:'EXPLICIT TEST FIXTURE ONLY: no real customer work or gap',
 files:[
 {path:'src/reality-extensions/reality-foundational-ci-smoke.mjs',
  content:'export function smoke(){return \"no-effects\";}'},
 {path:'test/reality-extensions/reality-foundational-ci-smoke.test.js',
  content:'import test from \"node:test\";import assert from \"node:assert/strict\";import {smoke} from \"../../src/reality-extensions/reality-foundational-ci-smoke.mjs\";test(\"fixture code has no effects\",()=>assert.equal(smoke(),\"no-effects\"));'},
 ]};
const candidate=validateFoundationalCandidate(ticket,output);
const sandbox=createIsolatedDockerSandbox({workspace:process.cwd(),image});
const report=await sandbox({ticket,candidate,attempt:1,
 frozen_suite_ref:ticket.frozen_regression_manifest_ref,
 network_permitted:false,secrets_permitted:false});
const evidence=createSandboxEvidenceCandidate(ticket,candidate,report);
console.log(JSON.stringify({type:'REAL_CONTAINER_SANDBOX_INFRASTRUCTURE_ONLY',
 source_commit:commit,runner_receipt_ref:report.runner_receipt_ref,
 image,original_customer_work_tested:false,
 real_model_generation_tested:false,provider_attestation_created:false,
 durable_continuity_written:false,owner_authorization_granted:false,
 production_changed:false,frozen_tests:report.frozen_test_count,
 frozen_pass:report.frozen_test_pass_count,
 governance_tests_passed:report.governance_tests_passed,
 source_artifact_sha256:candidate.artifact_sha256,
 container_exit_code:report.exit_code,passed:evidence.passed},null,2));
if(!evidence.passed)throw Error('FOUNDATION_REAL_DOCKER_SMOKE_FAILED');
