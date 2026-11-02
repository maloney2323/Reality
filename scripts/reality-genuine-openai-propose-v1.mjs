// Reality existing foundational model adapter, never a hardcoded repair.
// Source and owner scope are independently attested by GitHub OIDC + broker.
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createFoundationalBuildTicket} from '../src/reality-foundational-build-loop-v1.0.js';
import {createFoundationalModelGenerator} from '../src/reality-foundational-model-provider-v1.0.js';
const env=process.env;
const die=x=>{throw Error('GENUINE_MODEL_HANDOFF_'+x)};
const sha=x=>createHash('sha256').update(x).digest('hex');
if(env.GITHUB_ACTIONS!=='true'||env.GITHUB_EVENT_NAME!=='push'||
  env.GITHUB_REPOSITORY!=='maloney2323/Reality'||
  env.GITHUB_REF!=='refs/heads/feature/reality-general-capability-engine-20261101')
 die('EXACT_SIGNED_WORKFLOW_REQUIRED');
const admitted=JSON.parse(readFileSync(
 'artifact/genuine-capability-admitted-queue.json','utf8'));
if(admitted.repository_sha!==env.GITHUB_SHA||
 admitted.installation_authorized!==false)die('TRUSTED_QUEUE_REQUIRED');
const pending=[...(admitted.queued||[]),...(admitted.previously_claimed||[])]
 .filter(x=>['PENDING_FROZEN_REPRODUCTION',
 'LEASED_FOR_INDEPENDENT_REPRODUCTION',
 'FROZEN_REPRODUCED_AWAITING_CANDIDATE'].includes(x.queue_phase));
if(pending.length!==1)die('ONE_SOURCE_BACKED_ORIGINAL_JOB_REQUIRED');
const item=pending[0];
const url=new URL(env.ACTIONS_ID_TOKEN_REQUEST_URL||'');
url.searchParams.set('audience','reality-genuine-capability-auto-admit-v1');
const identity=await fetch(url,{headers:{
 authorization:'Bearer '+(env.ACTIONS_ID_TOKEN_REQUEST_TOKEN||'')},
 redirect:'error',cache:'no-store'});
if(!identity.ok)die('OIDC_PROVIDER_NOT_VERIFIED');
const jwt=(await identity.json()).value;
if(typeof jwt!=='string'||jwt.length<300)die('OIDC_SIGNATURE_MISSING');
const response=await fetch(
 'https://hvkfreoagbrphwghjajw.supabase.co/functions/v1/reality-genuine-capability-auto-admit',{
 method:'POST',redirect:'error',cache:'no-store',
 headers:{authorization:'Bearer '+jwt,'content-type':'application/json',
   'x-reality-github-provider-token':env.GH_TOKEN||''},
 body:JSON.stringify({action:'prepare',scope:{
  trigger_id:item.trigger_id,gap_event_id:item.source_event_id,
  repository_sha:env.GITHUB_SHA}})});
const scope=await response.json().catch(()=>null);
if(!response.ok||scope?.ok!==true||
  scope.status!=='VERIFIED_FROZEN_READY_FOR_MODEL'||
  scope.original_work_id!==item.original_work_id||
  scope.trigger_id!==item.trigger_id||
  scope.repository_sha!==env.GITHUB_SHA||
  scope.installation_authorized!==false||
  scope.original_job_completed!==false)
 die('TRUSTED_FROZEN_GENERATION_SCOPE_UNAVAILABLE');
if(!/^test\/reality-frozen-regressions\/[a-z0-9._-]+\.test\.js$/.test(
 scope.frozen_test_path)||!existsSync(scope.frozen_test_path)||
 sha(readFileSync(scope.frozen_test_path))!==scope.frozen_sha256)
 die('FROZEN_ACCEPTANCE_SOURCE_BYTES_CHANGED');
if(existsSync(scope.source_entrypoint))die('GAP_ALREADY_RESOLVED');
const frozenRef=scope.frozen_test_path.split('/').at(-1).replace(/\.test\.js$/,'');
const ticket=createFoundationalBuildTicket({
 owner_id:scope.owner_id,goal_id:scope.goal_id,
 goal_transition_receipt_ref:scope.goal_transition_receipt_ref,
 goal_evidence_ref:'continuity:'+scope.goal_transition_receipt_ref,
 original_work_id:scope.original_work_id,
 continuity_root_id:scope.continuity_root_id,worldline_id:scope.worldline_id,
 confirmed_gap_receipt_ref:'continuity:'+scope.gap_event_id,
 confirmed_gap_evidence_hash:scope.confirmed_gap_evidence_hash,
 confirmed_gap_source:'INDEPENDENT_PROVIDER_READBACK',
 frozen_regression_contract_kind:'PINNED_SINGLE_TEST',
 frozen_test_path:scope.frozen_test_path,
 frozen_regression_manifest_ref:frozenRef,
 frozen_regression_sha256:scope.frozen_sha256,
 repository_base_sha:env.GITHUB_SHA,
 repository_branch:env.GITHUB_REF.slice('refs/heads/'.length),
 source_entrypoint:scope.source_entrypoint,
 environment:'ISOLATED_PREVIEW',max_attempts:3,
 allowed_source_roots:['src/reality-extensions/','test/reality-extensions/'],
});
const model=createFoundationalModelGenerator({
 model:env.REALITY_REPAIR_MODEL||'gpt-5.6',
 apiKey:env.OPENAI_API_KEY,
 readFrozenRegression:async t=>{
  if(t.ticket_hash!==ticket.ticket_hash)die('TICKET_CHANGED');
  const content=readFileSync(t.frozen_test_path,'utf8');
  if(sha(content)!==t.frozen_regression_sha256)die('SOURCE_CHANGED');
  return {source:'GITHUB_PINNED_READ_ONLY_TEST_FILES',
   repository_base_sha:t.repository_base_sha,
   frozen_regression_sha256:t.frozen_regression_sha256,
   files:[{path:t.frozen_test_path,content,sha256:sha(content)}]};
 },
});
const candidate=await model({ticket,attempt:1,execution_authority:false});
if(candidate.original_work_id!==ticket.original_work_id||
 candidate.installed!==false||candidate.authority_granted!==false||
 !candidate.files.some(f=>f.path===ticket.source_entrypoint))
 die('MODEL_PROPOSED_FOREIGN_OR_NON_EXTENSION_CAPABILITY');
mkdirSync('artifact',{recursive:true});
writeFileSync('artifact/genuine-capability-model-proposal.json',
 JSON.stringify({ticket,candidate,source:'REAL_OPENAI_MODEL_GENERATION',
 installation_authorized:false,original_job_completed:false},null,2)+'\n');
console.log('REALITY_OPENAI_CAPABILITY_PROPOSED',JSON.stringify({
 original_work_id:ticket.original_work_id,
 model_response_id:candidate.model_response_id,
 artifact_sha256:candidate.artifact_sha256,
 files:candidate.files.map(f=>f.path),
 installation_authorized:false,original_job_completed:false}));
