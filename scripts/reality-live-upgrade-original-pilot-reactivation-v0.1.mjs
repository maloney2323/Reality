// Developer-scoped original construction-update job reactivation after a REAL
// model corrected its independently rejected prior candidate. This is NOT
// owner-scoped customer work, not an installation and not authorization.
// Run only inside the existing no-network, no-secrets sandbox Docker step.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const original='work:80f3f5a2891414a8742de7a4715b8575';
const expectedSha='1f59e7b74217526225b6283d79d107456c5ab8ce9beffee9328bbed3f6893bf1';
const candidate='/work/candidate.mjs';
const verified=JSON.parse(readFileSync('/work/independent-proof.json','utf8'));
const generated=JSON.parse(readFileSync('/work/generation-evidence.json','utf8'));
const source=readFileSync(candidate);
const sha=createHash('sha256').update(source).digest('hex');
if(sha!==expectedSha||sha!==verified.second_candidate_sha256||
   sha!==generated.corrected_source_sha256||
   verified.first_candidate_sha256!==generated.predecessor_candidate_sha256||
   !generated.model_generated_correction||
   !generated.new_response_id||generated.original_work_id!==original||
   verified.original_work_id!==original||
   verified.state!=='REAL_MODEL_CORRECTED_AND_INDEPENDENTLY_VERIFIED_NOT_PROMOTED'||
   verified.passed!==15||verified.total!==15||
   verified.github_write_authorized!==false||
   verified.original_job_completed!==false)
 throw Error('DEVELOPER_ORIGINAL_JOB_PINNED_CORRECTION_REQUIRED');
const jobs=[
 {input:'JOB: C-104 | PHASE: Cabinets | STATUS: blocked | BLOCKER: inspection | OWNER: Juan',
  expected:{job_id:'C-104',phase:'cabinets',status:'BLOCKED',
    blocker:'inspection',owner:'Juan'}},
 {input:'OWNER=Sam; STATUS=on track; JOB=C-202; PHASE=Rough-in',
  expected:{job_id:'C-202',phase:'rough-in',status:'ON_TRACK',blocker:null,owner:'Sam'}},
];
const observations=[];
for(const job of jobs){
 const run=spawnSync(process.execPath,
  ['/tools/reality-live-upgrade-evaluate-one-v0.1.mjs',candidate],
  {input:JSON.stringify({input:job.input}),encoding:'utf8',timeout:3000,
   maxBuffer:8000,env:{PATH:process.env.PATH||'/usr/bin:/bin'}});
 if(run.error||run.status!==0)throw Error('ORIGINAL_DEVELOPER_JOB_RETRY_FAILED');
 const parsed=JSON.parse(String(run.stdout||'').trim());
 const expectedKeys=Object.keys(job.expected).sort();
 if(parsed.evaluated!==true||parsed.failed!==false||
    !parsed.value||typeof parsed.value!=='object'||
    Object.keys(parsed.value).sort().join(',')!==expectedKeys.join(',')||
    expectedKeys.some(k=>!Object.is(parsed.value[k],job.expected[k])))
  throw Error('ORIGINAL_DEVELOPER_JOB_OUTPUT_NOT_VERIFIED');
 observations.push({job_id:job.expected.job_id,output:parsed.value,
   expected_output_independently_matched:true});
}
console.log(JSON.stringify({
 state:'MODEL_CORRECTED_CAPABILITY_REACTIVATED_IN_ISOLATED_DEVELOPER_SANDBOX',
 developer_original_work_id:original,
 corrected_candidate_sha256:sha,
 first_response_id:generated.predecessor_response_id,
 second_response_id:generated.new_response_id,
 prior_independent_pass:verified.passed,
 prior_independent_total:verified.total,
 isolated_original_job_cases:observations,
 developer_original_job_reexecuted_and_verified:true,
 original_customer_work_id:null,
 signed_owner_warrant:false,
 customer_capability_installed:false,
 production_deployment_performed:false,
 github_write_authorized:false,
 original_customer_job_completed:false,
 }));
