// GitHub CI supplies an automatic OBSERVATION signal to Reality's existing
// capability intake. A broken test or missing import is only a CANDIDATE,
// never a verified tenant gap, user approval, upgrade or settled outcome.
import {createHash} from 'node:crypto';
const SHA40=/^[a-f0-9]{40}$/;
const SAFE_TEST=/^test\/reality-frozen-regressions\/[a-z0-9._-]+\.test\.js$/;
const SAFE_MODULE=/^src\/reality-extensions\/[a-z0-9._-]+\.mjs$/;
const sha=data=>createHash('sha256').update(data).digest('hex');
const fail=x=>{throw Error('GENUINE_AUTO_TRIGGER_'+x)};
export function deriveFrozenFailureSignals({tests,repositorySha}={}){
 if(!SHA40.test(repositorySha)||!Array.isArray(tests)||tests.length>60)
  fail('PINNED_REPOSITORY_AND_TESTS_REQUIRED');
 const findings=[];
 for(const test of tests){
  if(!SAFE_TEST.test(test?.path)||!Buffer.isBuffer(test?.source)||
     test.source.length<1||test.source.length>70000||
     !Number.isInteger(test.exitCode))
   fail('FROZEN_SOURCE_INPUT_INVALID');
  if(test.exitCode===0)continue;
  const output=String(test.output||'');
  // The test runner's printed stack is untrusted data. It can nominate
  // an absent extension but cannot prove a verified capability void.
  const candidates=[...output.matchAll(
   /(?:file:\/\/)?[^\s"'()]*?\/src\/reality-extensions\/([a-z0-9._-]+\.mjs)/g)]
   .map(match=>'src/reality-extensions/'+match[1]);
  const missing=[...new Set(candidates)].filter(x=>SAFE_MODULE.test(x)&&
    Array.isArray(test.absentModulePaths)&&test.absentModulePaths.includes(x));
  if(missing.length!==1)continue;
  if(!/ERR_MODULE_NOT_FOUND|Cannot find module/.test(output))continue;
  findings.push(Object.freeze({
   kind:'UNVERIFIED_MISSING_CAPABILITY_CANDIDATE',
   test_path:test.path,
   frozen_sha256:sha(test.source),
   candidate_module_path:missing[0],
   provider_exit_code:test.exitCode,
   output_sha256:sha(output),
   repository_sha:repositorySha,
   verified_original_work:false,
   independently_reproduced_frozen:false,
   owner_approval_granted:false,
   installation_authorized:false,
   model_generated:false,
   queued_in_governed_capability_queue:false,
   original_job_completed:false,
   production_changed:false,
  }));
 }
 return Object.freeze({schema:'reality-genuine-auto-trigger-observation-v1',
  status:findings.length?'AUTOMATIC_CANDIDATES_DETECTED':'NO_MISSING_CAPABILITY_CANDIDATES',
  source:'GITHUB_CI_ACTUAL_FROZEN_TEST_EXIT',
  repository_sha:repositorySha,findings:Object.freeze(findings),
  // Only a source-bound service may later reobserve provider state, bind an
  // owner, verify their current goal and append the official gap to Continuity.
  enqueue_requires_verified_owner_and_independent_provider:true,
  installation_authorized:false,original_job_completed:false});
}
