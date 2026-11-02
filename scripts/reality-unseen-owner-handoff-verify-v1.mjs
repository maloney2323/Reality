// Read-only independent verification of a new, previously unseen provider gap.
// This is NOT owner authentication, worker installation or customer settlement.
import {writeFileSync,mkdirSync} from 'node:fs';
import {verifyRealMissingRepairIssue} from '../src/reality-real-repair-opportunity-intake-v1.0.js';
const issueNumber=Number(process.env.REALITY_READINESS_ISSUE_NUMBER);
if(!Number.isSafeInteger(issueNumber)||issueNumber<1)
 throw Error('READINESS_VERIFICATION_GITHUB_ISSUE_REQUIRED');
if(process.env.GITHUB_ACTIONS!=='true'||
   process.env.GITHUB_REPOSITORY!=='maloney2323/Reality'||
   process.env.GITHUB_REF!=='refs/heads/feature/reality-general-capability-engine-20261101')
 throw Error('READINESS_UNEXPECTED_PROVIDER_CONTEXT');
const v=await verifyRealMissingRepairIssue({issueNumber,
 env:{REALITY_BUILDER_DISPATCH_GITHUB_TOKEN:process.env.GH_TOKEN}});
if(v.status!=='SOURCE_PINNED_MISSING_EXTENSION_READY_FOR_OWNER_REVIEW'||
   v.independently_verified!==true||
   v.owner_goal_bound!==false||
   v.installation_authorized!==false||
   v.job_completed!==false||
   v.production_changed!==false||
   !/^[a-f0-9]{40}$/.test(v.source_sha||'')||
   !/^[a-f0-9]{64}$/.test(v.frozen_test_sha256||'')||
   v.original_provider_failed_job_id<1)
 throw Error('READINESS_INDEPENDENT_ISSUE_READBACK_NOT_VERIFIED');
mkdirSync('artifact/out',{recursive:true});
const receipt={schema:'reality-unseen-source-backed-owner-handoff-v1',
 status:'AWAITING_SIGNED_IN_OWNER_INVESTIGATION',
 provider_verified:true,
 issue_number:v.issue_number,source_path:v.source_path,
 frozen_test_path:v.frozen_test_path,frozen_test_sha256:v.frozen_test_sha256,
 original_failed_run_id:v.original_provider_failed_run_id,
 original_failed_job_id:v.original_provider_failed_job_id,
 pinned_original_sha:v.source_sha,
 owner_goal_bound:false,installation_authorized:false,production_changed:false,
 customer_work_settled:false};
writeFileSync('artifact/out/reality-unseen-owner-handoff.json',
 JSON.stringify(receipt,null,2)+'\n');
console.log('REALITY_UNSEEN_PROVIDER_GAP_VERIFIED',JSON.stringify(receipt));
