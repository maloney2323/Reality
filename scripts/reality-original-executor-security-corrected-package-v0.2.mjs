// Reality's installer-facing package: preserve the REAL model output bytes.
// Evidence staging only; this does not issue warrants or request GitHub writes.
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {fingerprintGovernedUpgradeCandidate} from '../src/reality-governed-github-upgrade-provider-v0.1.js';
const WORK='work:24cda9611404e9bcb47909976067605c';
const CANDIDATE=JSON.parse(readFileSync(process.env.REALITY_VERIFIED_MODEL_ARTIFACT_DIR+'/generation-evidence.json','utf8')).candidate_sha256;
const PROPOSAL='6b82acd60baa9055bfc57a70f551bac44f783fc431814ad2555927eb50f5ca16';
const ROOT=process.env.REALITY_VERIFIED_MODEL_ARTIFACT_DIR||'original-model-artifact';
const OUTPUT='original-executor-security-corrected-package';
const sha=s=>createHash('sha256').update(s).digest('hex');
const exact=s=>{assert.ok(s.endsWith('\n'),'Frozen model source must have final newline');return s};
const evidence=JSON.parse(readFileSync(ROOT+'/generation-evidence.json','utf8'));
const executor=exact(readFileSync(ROOT+'/candidate.mjs','utf8'));
const proposal=exact(readFileSync('src/reality-extensions/reality-original-maintenance-repair-proposal.mjs','utf8'));
assert.equal(evidence.original_work_id,WORK);
assert.equal(evidence.model_generated,true);
assert.equal(typeof evidence.model_response_id,'string');
assert.match(evidence.model_response_id,/^resp_[a-z0-9]+$/);
assert.equal(evidence.status,'MODEL_ORIGINAL_EXECUTOR_CORRECTED_AWAITING_INDEPENDENT_RETEST');
assert.equal(evidence.original_job_completed,false);
assert.equal(evidence.github_provider_write_performed,false);
assert.equal(evidence.candidate_sha256,CANDIDATE);
assert.equal(sha(executor),CANDIDATE);
assert.equal(sha(proposal),PROPOSAL);
assert.ok(Buffer.byteLength(executor,'utf8')<=12000);
assert.ok(Buffer.byteLength(proposal,'utf8')<=12000);
assert.match(executor,/from ["']\.\/reality-original-maintenance-repair-proposal\.mjs["']/);
const files=[
 {path:'src/reality-extensions/reality-original-maintenance-repair-proposal.mjs',mode:'100644',content:proposal},
 {path:'src/reality-extensions/reality-original-maintenance-executor.mjs',mode:'100644',content:executor},
];
const paths=new Set(files.map(x=>x.path));assert.equal(paths.size,files.length);
for(const x of files)assert.match(x.path,/^src\/reality-extensions\/[a-z0-9-]+\.mjs$/);
const fingerprint=fingerprintGovernedUpgradeCandidate(files);
assert.match(fingerprint,/^[a-f0-9]{64}$/);
mkdirSync(OUTPUT,{recursive:true});
const manifest={
 schema:'reality.original-owner-model-executor-package.security-corrected.v0.2',
 original_work_id:WORK,original_issue_number:143,
 original_model_response_id:evidence.model_response_id,
 executor_source_sha256:CANDIDATE,original_proposal_source_sha256:PROPOSAL,
 governed_install_candidate_sha256:fingerprint,
 files:files.map(x=>({path:x.path,mode:x.mode,bytes:Buffer.byteLength(x.content),sha256:sha(x.content)})),
 predecessor_frozen_case_ci_run:40759263421,
 newly_verified_frozen_and_holdout_tests:false,
 independent_actual_github_readonly_ci_run:40760732281,
 owner_warrant_issued:false,owner_install_approval_granted:false,
 original_job_completed:false,installed:false,production_modified:false,
};
writeFileSync(OUTPUT+'/package.json',JSON.stringify({files},null,2)+'\n');
writeFileSync(OUTPUT+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');
for(const x of files)writeFileSync(OUTPUT+'/'+x.path.split('/').at(-1),x.content);
console.log(JSON.stringify({result:'REALITY_MODEL_PACKAGE_BYTES_PINNED_NOT_AUTHORIZED',
 original_work_id:WORK,model_response_id:evidence.model_response_id,
 executor_source_sha256:CANDIDATE,governed_install_candidate_sha256:fingerprint,
 files:manifest.files,owner_warrant_issued:false,installed:false,original_job_completed:false},null,2));
