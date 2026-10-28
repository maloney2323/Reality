import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
import {
 ORIGINAL_OWNER_WORK_ID,ORIGINAL_OWNER_REPAIR_CANDIDATE_SHA256,
 originalOwnerConsoleFlags
} from '../src/reality-original-owner-console-v0.1.js';

const goal=true;
const proven={exact_llm_source_verified:true,sandbox_success:true,
 historical_fixed_source_verified:true};
const evidence={owner_evidence_acknowledged:true};

test('the original job ID remains the historical owner work, never the controlled substitute',()=>{
 assert.equal(ORIGINAL_OWNER_WORK_ID,'work:24cda9611404e9bcb47909976067605c');
 assert.notEqual(ORIGINAL_OWNER_WORK_ID,'work:8f71513a2c1955569e84c0e9af0962ec');
 assert.equal(ORIGINAL_OWNER_REPAIR_CANDIDATE_SHA256,
  '6b82acd60baa9055bfc57a70f551bac44f783fc431814ad2555927eb50f5ca16');
});
test('27 historical tests and user acceptance do not install or settle an upgrade',()=>{
 const flags=originalOwnerConsoleFlags({goalConfirmed:goal,evidence,github:proven});
 assert.equal(flags.original_source_verified,true);
 assert.equal(flags.owner_historical_evidence_acknowledged,true);
 assert.equal(flags.original_source_already_fixed,true);
 assert.equal(flags.warranted_upgrade_ready,false);
 assert.equal(flags.installation_verified,false);
 assert.equal(flags.job_settlement_verified,false);
 assert.equal(flags.original_job_completed,false);
 assert.equal(flags.next_required_step,'ISSUE_FRESH_OWNER_SCOPED_SANDBOX_AND_WARRANT');
});
test('unconfirmed or changed owner objective blocks execution',()=>{
 const flags=originalOwnerConsoleFlags({goalConfirmed:false,evidence,github:proven,
  warrantVerified:true,draftVerified:true,installationVerified:true,settlementVerified:true});
 assert.equal(flags.original_job_completed,false);
 assert.equal(flags.warranted_upgrade_ready,false);
 assert.equal(flags.next_required_step,'OPEN_OR_CONFIRM_ORIGINAL_OWNER_GOAL');
});
test('verified warrant alone is not installation or original job settlement',()=>{
 const flags=originalOwnerConsoleFlags({goalConfirmed:goal,evidence,github:proven,
  warrantVerified:true});
 assert.equal(flags.warranted_upgrade_ready,true);
 assert.equal(flags.verified_draft_ready,false);
 assert.equal(flags.next_required_step,'PREPARE_GOVERNED_DRAFT_PR_AUTHORIZATION');
 assert.equal(flags.installation_verified,false);
 assert.equal(flags.job_settlement_verified,false);
});
test('even a valid signed owner warrant does not enable installation before durable governed PR',()=>{
 const result=originalOwnerConsoleFlags({goalConfirmed:goal,evidence,github:proven,
  warrantVerified:true,installationVerified:true,settlementVerified:true});
 assert.equal(result.warranted_upgrade_ready,true);
 assert.equal(result.verified_draft_ready,false);
 assert.equal(result.installation_verified,false);
 assert.equal(result.original_job_completed,false);
 assert.equal(result.next_required_step,'PREPARE_GOVERNED_DRAFT_PR_AUTHORIZATION');
});
test('installed module is not the original job outcome',()=>{
 const flags=originalOwnerConsoleFlags({goalConfirmed:goal,evidence,github:proven,
  warrantVerified:true,draftVerified:true,installationVerified:true});
 assert.equal(flags.installation_verified,true);
 assert.equal(flags.job_settlement_verified,false);
 assert.equal(flags.original_job_completed,false);
});
test('full verified evidence is the ONLY state that may claim original-job settlement',()=>{
 const flags=originalOwnerConsoleFlags({goalConfirmed:goal,evidence,github:proven,
  warrantVerified:true,draftVerified:true,installationVerified:true,settlementVerified:true});
 assert.equal(flags.original_job_completed,true);
 assert.equal(flags.next_required_step,'VERIFIED_SETTLED');
});
test('a source mismatch blocks warrant promotion even with alleged installs and settlements',()=>{
 const flags=originalOwnerConsoleFlags({goalConfirmed:goal,evidence,
  github:{...proven,exact_llm_source_verified:false},
  warrantVerified:true,draftVerified:true,installationVerified:true,settlementVerified:true});
 assert.equal(flags.original_source_verified,false);
 assert.equal(flags.original_job_completed,false);
 assert.equal(flags.next_required_step,'INDEPENDENT_GITHUB_MODEL_SOURCE_REVALIDATION');
});
test('a distinct independently owner-signed current model package is not invalidated by historical patch-only source tests',()=>{
 const g={...proven,exact_llm_source_verified:false,sandbox_success:false};
 const without=originalOwnerConsoleFlags({goalConfirmed:goal,evidence,github:g,
  warrantVerified:true,installationVerified:true,settlementVerified:true});
 assert.equal(without.warranted_upgrade_ready,false);
 assert.equal(without.original_job_completed,false);
 const current=originalOwnerConsoleFlags({goalConfirmed:goal,evidence,github:g,
  currentPackageWarrantVerified:true, draftVerified:false,
  installationVerified:true,settlementVerified:true});
 assert.equal(current.current_model_package_warrant_verified,true);
 assert.equal(current.legacy_review_warrant_ready,false);
 assert.equal(current.warranted_upgrade_ready,true);
 assert.equal(current.verified_draft_ready,false);
 assert.equal(current.installation_verified,false);
 assert.equal(current.original_job_completed,false);
});
test('the owner page exists, has original-work bound controls, and does not auto-approve or auto-run',()=>{
 const page=readFileSync('owner-repair.html','utf8');
 assert.match(page,/Owner Repair Control/);
 assert.match(page,/work:24cda9611404e9bcb47909976067605c/);
 for(const id of ['refresh','prepareInstall','prepareResume','approve','execute','verifyFinal']){
  assert.match(page,new RegExp('id="'+id+'"'));
 }
 assert.match(page,/personal-action-authority/);
 assert.match(page,/personal-autonomous-upgrade-loop/);
 assert.match(page,/APPROVE_THIS_EXACT_WORK_ITEM/);
 assert.match(page,/window\.confirm/);
 assert.match(page,/DO NOT RETRY/);
 assert.doesNotMatch(page,/fetch\s*\(\s*['"]https:\/\/api\.github\.com/);
 const script=page.match(/<script>([\s\S]*?)<\/script>/);
 assert.ok(script);
 assert.doesNotThrow(()=>new Script(script[1]));
 assert.match(readFileSync('index.html','utf8'),/href="\/owner-repair\.html"/);
});
