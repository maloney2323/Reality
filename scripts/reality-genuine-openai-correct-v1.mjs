// Reality's own OpenAI model corrects a failing candidate using an independent
// GitHub sandbox artifact from the SAME workflow run. The model can only propose.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createFoundationalBuildTicket,validateFoundationalCandidate}
 from '../src/reality-foundational-build-loop-v1.0.js';
import {createFoundationalModelGenerator}
 from '../src/reality-foundational-model-provider-v1.0.js';
const env=process.env;
const deny=x=>{throw Error('GENUINE_OPENAI_CORRECTION_'+x)};
const hash=x=>createHash('sha256').update(x).digest('hex');
if(env.GITHUB_ACTIONS!=='true'||env.GITHUB_EVENT_NAME!=='push'||
 env.GITHUB_REPOSITORY!=='maloney2323/Reality'||
 env.GITHUB_REF!=='refs/heads/feature/reality-general-capability-engine-20261101')
 deny('PINNED_ISOLATED_WORKFLOW_REQUIRED');
const proposal=JSON.parse(readFileSync(
 'previous/genuine-capability-model-proposal.json','utf8'));
const evidence=JSON.parse(readFileSync(
 'failed/genuine-capability-sandbox-verification.json','utf8'));
const {version,ticket_hash,...ticketData}=proposal.ticket||{};
const ticket=createFoundationalBuildTicket(ticketData);
const previous=validateFoundationalCandidate(ticket,proposal.candidate);
if(ticket.ticket_hash!==ticket_hash||
 ticket.repository_base_sha!==env.GITHUB_SHA||
 proposal.source!=='REAL_OPENAI_MODEL_GENERATION'||
 proposal.installation_authorized!==false||
 evidence.schema!=='reality-genuine-sandbox-v1'||
 evidence.workflow_run_id!==env.GITHUB_RUN_ID||
 evidence.runner_git_sha!==env.GITHUB_SHA||
 evidence.original_work_id!==ticket.original_work_id||
 evidence.ticket_hash!==ticket.ticket_hash||
 evidence.artifact_sha256!==previous.artifact_sha256||
 evidence.model_response_id!==previous.model_response_id||
 evidence.frozen_suite_sha256!==ticket.frozen_regression_sha256||
 evidence.runner_isolation!=='DOCKER_NETWORK_NONE_READONLY_NO_SECRETS'||
 evidence.passed!==false||
 evidence.frozen_result?.exit_code!==0||
 evidence.frozen_result?.fail!==0||
 evidence.frozen_result?.tests<1||
 evidence.candidate_result?.exit_code===0||
 evidence.candidate_result?.fail<1||
 evidence.installation_authorized!==false||
 evidence.original_job_completed!==false)
 deny('INDEPENDENT_FAILED_CANDIDATE_EVIDENCE_REQUIRED');
const frozen=readFileSync(ticket.frozen_test_path,'utf8');
if(hash(frozen)!==ticket.frozen_regression_sha256)
 deny('ORIGINAL_FROZEN_CONTRACT_CHANGED');
const feedback={
 kind:'INDEPENDENT_SANDBOX_FAILURE',
 attestation_ref:'github:actions:run:'+env.GITHUB_RUN_ID+
  ':verified-candidate:'+previous.artifact_sha256,
 classification:'TEST_REGRESSION',
 artifact_sha256:previous.artifact_sha256,
 log_excerpt:String(evidence.candidate_result.excerpt||'').slice(0,6000),
};
const model=createFoundationalModelGenerator({
 model:env.REALITY_REPAIR_MODEL||'gpt-5.6',
 apiKey:env.OPENAI_API_KEY,
 readFrozenRegression:async t=>{
  if(t.ticket_hash!==ticket.ticket_hash)deny('TICKET_CHANGED');
  return {source:'GITHUB_PINNED_READ_ONLY_TEST_FILES',
   repository_base_sha:ticket.repository_base_sha,
   frozen_regression_sha256:ticket.frozen_regression_sha256,
   files:[{path:ticket.frozen_test_path,content:frozen,sha256:hash(frozen)}]};
 },
});
const corrected=await model({ticket,attempt:2,previous_candidate:previous,
 verified_feedback:feedback,execution_authority:false});
if(corrected.original_work_id!==ticket.original_work_id||
 corrected.installed!==false||corrected.authority_granted!==false||
 !corrected.files.some(f=>f.path===ticket.source_entrypoint))
 deny('MODEL_CORRECTION_SCOPE_CHANGED');
mkdirSync('artifact',{recursive:true});
writeFileSync('artifact/genuine-capability-model-proposal.json',
 JSON.stringify({ticket,candidate:corrected,
 source:'REAL_OPENAI_MODEL_GENERATION',
 correction_attempt:2,previous_artifact_sha256:previous.artifact_sha256,
 previous_verification_run_id:evidence.workflow_run_id,
 installation_authorized:false,original_job_completed:false},null,2)+'\n');
console.log('REALITY_OPENAI_CAPABILITY_CORRECTED',JSON.stringify({
 original_work_id:ticket.original_work_id,attempt:2,
 model_response_id:corrected.model_response_id,
 artifact_sha256:corrected.artifact_sha256,
 previous_artifact_sha256:previous.artifact_sha256,
 installation_authorized:false,original_job_completed:false
}));
