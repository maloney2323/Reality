// Separate GitHub Actions job, with NO OpenAI/service/GitHub credential,
// executes Reality's model-generated candidate only inside offline Docker.
import {readFileSync,existsSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createFoundationalBuildTicket,validateFoundationalCandidate}
 from '../src/reality-foundational-build-loop-v1.0.js';
const sha=x=>createHash('sha256').update(x).digest('hex');
const fail=x=>{throw Error('GENUINE_SANDBOX_'+x)};
if(process.env.GITHUB_ACTIONS!=='true'||
 process.env.GITHUB_REPOSITORY!=='maloney2323/Reality'||
 process.env.GITHUB_REF!=='refs/heads/feature/reality-general-capability-engine-20261101'||
 process.env.OPENAI_API_KEY||process.env.SUPABASE_SECRET_KEY)
 fail('SECRET_FREE_VERIFIER_REQUIRED');
const input=JSON.parse(readFileSync(
 'candidate/genuine-capability-model-proposal.json','utf8'));
if(input.source!=='REAL_OPENAI_MODEL_GENERATION'||
 input.installation_authorized!==false||
 input.original_job_completed!==false)fail('TRUSTED_GENERATION_ARTIFACT_REQUIRED');
const {ticket_hash,version,...rawTicket}=input.ticket||{};
const ticket=createFoundationalBuildTicket(rawTicket);
if(ticket.ticket_hash!==ticket_hash||
 ticket.repository_base_sha!==process.env.GITHUB_SHA)
 fail('PINNED_TICKET_HASH_CHANGED');
const candidate=validateFoundationalCandidate(ticket,input.candidate);
if(candidate.artifact_sha256!==input.candidate.artifact_sha256||
 !candidate.files.some(f=>f.path===ticket.source_entrypoint))
 fail('CANDIDATE_BYTES_OR_ORIGINAL_ENTRYPOINT_MISMATCH');
if(!existsSync(ticket.frozen_test_path)||
 sha(readFileSync(ticket.frozen_test_path))!==ticket.frozen_regression_sha256)
 fail('ORIGINAL_FROZEN_ACCEPTANCE_CHANGED');
const source=candidate.files.filter(f=>!f.path.startsWith('docs/'));
for(const file of source){
 if(existsSync(file.path))fail('CANDIDATE_OVERWRITES_BASE_SOURCE');
 mkdirSync(dirname(file.path),{recursive:true});
 writeFileSync(file.path,file.content,{flag:'wx'});
}
const frozen=[ticket.frozen_test_path,
 'test/reality-governed-self-improvement-spine-v1.0.test.js'];
const proposed=source.filter(f=>f.path.startsWith('test/')).map(f=>f.path);
if(!proposed.length)fail('MODEL_TEST_REQUIRED');
function verify(paths){
 const docker=['run','--rm','--network','none','--read-only',
 '--cap-drop','ALL','--security-opt','no-new-privileges',
 '--memory','512m','--cpus','1','--user','65534:65534',
 '--tmpfs','/tmp:rw,noexec,nosuid,size=16m',
 '-v',process.cwd()+':/work:ro','-w','/work',
 'node:22','node','--test','--test-reporter=tap',...paths];
 const run=spawnSync('docker',docker,{encoding:'utf8',
 timeout:160000,maxBuffer:220000,env:{PATH:process.env.PATH,HOME:process.env.HOME}});
 const output=String(run.stdout||'')+'\n'+String(run.stderr||'');
 const count=k=>{const m=[...output.matchAll(new RegExp('^# '+k+' (\\d+)$','gm'))].at(-1);
  return m?Number(m[1]):0};
 return {exit_code:run.status,tests:count('tests'),pass:count('pass'),
  fail:count('fail'),output_sha256:sha(output),
  excerpt:output.slice(-4500)};
}
const frozenResult=verify(frozen);
const candidateResult=verify(proposed);
const passed=frozenResult.exit_code===0&&candidateResult.exit_code===0&&
 frozenResult.tests>0&&candidateResult.tests>0&&
 frozenResult.fail===0&&candidateResult.fail===0;
const receipt={schema:'reality-genuine-sandbox-v1',
 original_work_id:ticket.original_work_id,
 frozen_test_path:ticket.frozen_test_path,
 frozen_suite_sha256:ticket.frozen_regression_sha256,
 ticket_hash:ticket.ticket_hash,
 artifact_sha256:candidate.artifact_sha256,
 model_response_id:candidate.model_response_id,
 runner_git_sha:process.env.GITHUB_SHA,
 workflow_run_id:process.env.GITHUB_RUN_ID,
 runner_isolation:'DOCKER_NETWORK_NONE_READONLY_NO_SECRETS',
 frozen_result:frozenResult,candidate_result:candidateResult,passed,
 installation_authorized:false,original_job_completed:false,
 production_changed:false};
mkdirSync('artifact',{recursive:true});
writeFileSync('artifact/genuine-capability-sandbox-verification.json',
 JSON.stringify(receipt,null,2)+'\n');
console.log('REALITY_INDEPENDENT_CAPABILITY_SANDBOX',JSON.stringify({
 original_work_id:ticket.original_work_id,
 frozen_tests:frozenResult.tests,frozen_pass:frozenResult.pass,
 candidate_tests:candidateResult.tests,candidate_pass:candidateResult.pass,
 passed,installation_authorized:false,original_job_completed:false,
}));
if(!passed)process.exitCode=2;
