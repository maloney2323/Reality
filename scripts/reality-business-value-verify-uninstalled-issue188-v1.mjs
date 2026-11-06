// Independent secret-free verifier for genuinely model-generated but uninstalled
// proposal. Separate GitHub job/VM. Never grants installation or job completion.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const e=process.env,fail=x=>{throw Error('REALITY_VALUE_INDEPENDENT_CANDIDATE_'+x)};
const sha=x=>createHash('sha256').update(x).digest('hex');
const REPO='maloney2323/Reality',REF='refs/heads/feature/reality-general-capability-engine-20261101';
const SOURCE='src/reality-extensions/reality-general-execution-receipt.mjs',
 TEST='test/reality-extensions/reality-general-execution-receipt-proposed.test.mjs',
 FROZEN='test/reality-frozen-regressions/reality-general-execution-receipt-v1.test.js',
 HOLD='test/reality-business-value-execution-receipt-holdout-v1.test.js';
if(e.GITHUB_ACTIONS!=='true'||e.GITHUB_REF!==REF||e.GITHUB_REPOSITORY!==REPO||
 !/^[a-f0-9]{40}$/.test(e.GITHUB_SHA||'')||
 e.OPENAI_API_KEY||e.SUPABASE_SERVICE_ROLE_KEY||e.SUPABASE_SECRET_KEY)
 fail('INDEPENDENT_SECRET_FREE_VERIFIER_REQUIRED');
const r=JSON.parse(readFileSync('candidate/reality-issue188-model-value-receipt.json','utf8'));
if(r?.schema==='reality-uninstalled-source-repair-business-value-v1'&&
 r.status==='MODEL_DRAFTS_FAILED_SANDBOX'&&
 r.run_id===Number(e.GITHUB_RUN_ID)&&r.base_sha===e.GITHUB_SHA&&
 r.owner_approval_verified===false&&r.production_changed===false&&
 Array.isArray(r.attempts)&&r.attempts.length===3){
 mkdirSync('artifact/out',{recursive:true});
 const report={schema:'reality-independent-uninstalled-source-value-v1',
  signed_run_id:Number(e.GITHUB_RUN_ID),repository_sha:e.GITHUB_SHA,
  source_issue:188,source_sha256:null,model_response_id:null,
  status:'MODEL_DRAFTS_NOT_INDEPENDENTLY_QUALIFIED',
  model_attempts:r.attempts.length,
  model_input_tokens:r.input_tokens,model_output_tokens:r.output_tokens,
  independent_secret_free_runner:true,
  tested:0,passed:0,failed:0,installation_authorized:false,
  installation_performed:false,original_customer_job_settled:false,
  production_changed:false,verified_customer_dollars_saved:null};
 writeFileSync('artifact/out/reality-issue188-independent-value-verification.json',
 JSON.stringify(report,null,2)+'\n');
 console.log('REALITY_VALUE_NO_QUALIFIED_MODEL_REPAIR',JSON.stringify(report));
 process.exit(0);
}
const proposed=JSON.parse(readFileSync('candidate/reality-issue188-uninstalled-proposal.json','utf8'));
if(r.schema!=='reality-uninstalled-source-repair-business-value-v1'||
 r.run_id!==Number(e.GITHUB_RUN_ID)||r.base_sha!==e.GITHUB_SHA||
 r.source_issue!==188||r.status!=='SOURCE_PROPOSED_AND_SELF_SANDBOX_TESTED'||
 !Array.isArray(r.attempts)||r.attempts.length<1||r.attempts.length>3||
 r.owner_approval_verified!==false||r.installation_performed!==false||
 r.customer_job_settled!==false||r.production_changed!==false||
 !/^resp_[A-Za-z0-9_-]{12,160}$/.test(proposed.model_response_id||'')||
 typeof proposed.source!=='string'||typeof proposed.test_source!=='string'||
 sha(proposed.source)!==proposed.source_sha256||
 sha(proposed.test_source)!==proposed.test_sha256||
 sha(readFileSync(FROZEN))!==r.frozen_sha256||
 sha(readFileSync(HOLD))!==r.blind_holdout_sha256||
 proposed.frozen_hash!==r.frozen_sha256||
 proposed.holdout_hash!==r.blind_holdout_sha256)
 fail('PINNED_UNINSTALLED_SOURCE_PROPOSAL_INVALID');
for(const path of [SOURCE,TEST])mkdirSync(dirname(path),{recursive:true});
writeFileSync(SOURCE,proposed.source,{flag:'wx'});
writeFileSync(TEST,proposed.test_source,{flag:'wx'});
const started=Date.now();
const docker=spawnSync('docker',['run','--rm','--network','none','--read-only','--cap-drop','ALL',
 '--security-opt','no-new-privileges','--memory','512m','--cpus','1','--user','65534:65534',
 '--tmpfs','/tmp:rw,noexec,nosuid,size=16m','-v',process.cwd()+':/work:ro','-w','/work',
 'node:22','node','--test','--test-reporter=tap',FROZEN,HOLD,TEST],
 {encoding:'utf8',timeout:160000,maxBuffer:500000,env:{PATH:e.PATH,HOME:e.HOME}});
const output=String(docker.stdout||'')+'\n'+String(docker.stderr||'');
const count=k=>Number([...output.matchAll(new RegExp('^# '+k+' (\\d+)$','gm'))].at(-1)?.[1]||0);
const receipt={
 schema:'reality-independent-uninstalled-source-value-v1',
 signed_run_id:Number(e.GITHUB_RUN_ID),repository_sha:e.GITHUB_SHA,
 source_issue:188,source_sha256:proposed.source_sha256,
 model_response_id:proposed.model_response_id,
 independent_secret_free_runner:true,
 offline_docker_network_none:true,
 frozen_test_sha256:r.frozen_sha256,holdout_test_sha256:r.blind_holdout_sha256,
 tested:count('tests'),passed:count('pass'),failed:count('fail'),
 exit_code:docker.status,output_sha256:sha(output),
 independent_verification_ms:Date.now()-started,
 model_attempts:r.attempts.length,model_input_tokens:r.input_tokens,
 model_output_tokens:r.output_tokens,
 installation_authorized:false,installation_performed:false,
 original_customer_job_settled:false,production_changed:false,
 verified_customer_dollars_saved:null,
};
receipt.status=docker.status===0&&receipt.tested>=15&&receipt.failed===0?
 'INDEPENDENT_SOURCE_CANDIDATE_PASSED':'INDEPENDENT_SOURCE_CANDIDATE_FAILED';
mkdirSync('artifact/out',{recursive:true});
writeFileSync('artifact/out/reality-issue188-independent-value-verification.json',
 JSON.stringify(receipt,null,2)+'\n');
console.log('REALITY_BUSINESS_VALUE_INDEPENDENT_REAL_SOURCE_VERIFICATION',JSON.stringify({
 status:receipt.status,tests:receipt.tested,pass:receipt.passed,fail:receipt.failed,
 model_attempts:receipt.model_attempts,input_tokens:receipt.model_input_tokens,
 output_tokens:receipt.model_output_tokens,
 independent_verification_ms:receipt.independent_verification_ms,
 installation_performed:false,original_customer_job_settled:false,production_changed:false
}));
if(receipt.status!=='INDEPENDENT_SOURCE_CANDIDATE_PASSED')process.exitCode=2;
