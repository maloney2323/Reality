// Independent acceptance decision for the ORIGINAL owner job. This program
// executes only in a network-disabled, secret-free, read-only container.
// The model-generated function is loaded solely after source/provenance checks.
// A no-op on already corrected GitHub source MUST NOT become "self installed".
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

const WORK='work:24cda9611404e9bcb47909976067605c';
const CANDIDATE_SHA='6b82acd60baa9055bfc57a70f551bac44f783fc431814ad2555927eb50f5ca16';
const HIST_SHA='88d7989081d24891e67eeda3ec68cf10da6bb83d8bc1baecca491eeb3fc4399b';
const FIXED_SHA='aca7e6386c226f9e9f9c6e6cd541b3470d8e38b25f1b0c02e9e35ce7b80c0d95';
const RESULT_SHA='702768b6efe91e342261088f4a2e77f0002660a126579518e6d6a4ed6320fcaa';
const sha = x=>createHash('sha256').update(x).digest('hex');
const source=fs.readFileSync('/current/test/reality-personal-discovered-work-handoff-v0.1.test.js');
const historical=fs.readFileSync('/fixtures/historical.js');
const corrected=fs.readFileSync('/fixtures/corrected.js');
const candidateBytes=fs.readFileSync('/work/candidate.mjs');
const evidence=JSON.parse(fs.readFileSync('/work/correction-evidence.json','utf8'));
const rawVerdict=fs.readFileSync('/work/independent-retest.json');
const verdict=JSON.parse(rawVerdict);
const proof=JSON.parse(fs.readFileSync('/work/retest-proof.json','utf8'));

assert.equal(sha(candidateBytes),CANDIDATE_SHA);
assert.equal(sha(historical),HIST_SHA);
assert.equal(sha(corrected),FIXED_SHA);
assert.equal(sha(source),FIXED_SHA);
assert.deepEqual(source,corrected);
assert.equal(evidence.original_work_id,WORK);
assert.equal(evidence.original_capability_candidate_receipt_id,'544eebaa-c9e6-5ad6-8d3e-6e6820343b2a');
assert.equal(evidence.experiment_hash,'e2c36fe43a3331fdcd8f66635f905a55304584804fd48a4af99e87d99c82e60f');
assert.equal(evidence.corrected_model_response_id,'resp_0af032dc727a5eb5006ae208a7b01487d0985336024bf98f2c');
assert.equal(evidence.corrected_candidate_sha256,CANDIDATE_SHA);
assert.equal(evidence.correction_model_generated,true);
assert.equal(verdict.original_work_id,WORK);
assert.equal(verdict.candidate_sha256,CANDIDATE_SHA);
assert.equal(verdict.state,'ORIGINAL_REPAIR_CAPABILITY_SANDBOX_VERIFIED');
assert.equal(verdict.passed,8);
assert.equal(verdict.total,8);
assert.equal(verdict.failed,0);
assert.equal(verdict.frozen_verified,true);
assert.equal(verdict.hidden_holdout_verified,true);
assert.equal(verdict.isolation.network_permitted,false);
assert.equal(verdict.isolation.secrets_accessible,false);
assert.equal(verdict.original_job_completed,false);
assert.equal(proof.original_work_id,WORK);
assert.equal(proof.corrected_source_sha256,CANDIDATE_SHA);
assert.equal(proof.independent_result_sha256,RESULT_SHA);
assert.equal(sha(rawVerdict),RESULT_SHA);
assert.equal(proof.independent_sandbox_verified,true);
assert.equal(proof.capability_installed,false);
assert.equal(proof.owner_install_authorization,false);
assert.equal(proof.original_job_completed,false);

const {proposeOriginalRepair}=await import(pathToFileURL('/work/candidate.mjs').href);
assert.equal(typeof proposeOriginalRepair,'function');
const historicalResult=proposeOriginalRepair({workId:WORK,source:historical.toString('utf8')});
assert.equal(historicalResult.status,'PATCH_PROPOSED');
assert.equal(historicalResult.file,'test/reality-personal-discovered-work-handoff-v0.1.test.js');
assert.ok(historicalResult.patchedSource.includes('const guidedStart=html.indexOf('));
assert.ok(historicalResult.patchedSource.includes('const guided=html.slice(guidedStart,guidedEnd)'));
assert.notEqual(historicalResult.patchedSource,historical.toString('utf8'));

const currentResult=proposeOriginalRepair({workId:WORK,source:source.toString('utf8')});
assert.equal(currentResult.status,'ALREADY_FIXED');
assert.equal(currentResult.file,historicalResult.file);
assert.equal(currentResult.patchedSource,source.toString('utf8'));
assert.throws(()=>proposeOriginalRepair({workId:'work:00000000000000000000000000000000',source:source.toString('utf8')}));
assert.throws(()=>proposeOriginalRepair({workId:WORK,source:123}));

const report=Object.freeze({
 version:'reality-original-owner-preinstall-current-source-adjudication-v0.1',
 original_work_id:WORK,
 candidate_sha256:CANDIDATE_SHA,
 original_candidate_verified_8_of_8:true,
 original_historical_repair_proposal:'PATCH_PROPOSED',
 actual_current_source_sha256:sha(source),
 actual_current_source_state:currentResult.status,
 verified_action:'READ_ONLY_NO_OP_ALREADY_FIXED',
 deployment_change_performed:false,
 candidate_installed:false,
 installation_authorization_issued:false,
 signed_owner_warrant_issued:false,
 original_customer_job_settled:false,
 original_job_completed:false,
 full_autonomous_self_upgrade_proved:false,
 original_goal_acceptance_still_required:true,
});
process.stdout.write(JSON.stringify(report,null,2)+'\n');