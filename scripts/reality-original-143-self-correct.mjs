// Reality full-loop auto-repair orchestrator. Never executes candidate source.
// Each attempt comes from a real model call, then a separate no-secret sandbox job.
// The next attempt receives the previous candidate and independent test feedback.
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {createHash} from 'node:crypto';

const WORK='work:24cda9611404e9bcb47909976067605c';
const BRANCH='experiment/reality-live-durable-adversarial-20261025';
const FILES=[
 'src/reality-extensions/reality-original-full-loop-integration.mjs',
 'api/reality/personal-original-full-loop.js',
 'test/reality-extensions/reality-original-full-loop-integration.test.js'
];
const CONTEXT=[
 'src/reality-original-upgrade-readback-v0.1.js',
 'src/reality-personal-goal-readback-v0.1.js',
 'src/reality-private-chat-auth-v0.1.js',
 'src/reality-universe-postgres-persistence-v0.1.js',
 'src/reality-continuity-spine-v2.0.js',
 'src/reality-extensions/reality-original-maintenance-executor.mjs',
 'src/reality-single-use-execution-reservation-v0.1.js',
 'src/reality-personal-action-authority-v0.1.js',
 'src/reality-reliability-db-boundary-v0.1.js'
];
const hash=x=>createHash('sha256').update(x).digest('hex');
const validRound=x=>Number.isInteger(x)&&x>=1&&x<=3;
const readJSON=path=>existsSync(path)?JSON.parse(readFileSync(path,'utf8')):null;
function outputDir(round){return 'reality-generated-original-143/round-'+round}
function failCode(candidate){
 if(!candidate||typeof candidate!=='object'||Array.isArray(candidate))return 'CANDIDATE_NOT_OBJECT';
 if(candidate.original_work_id!==WORK)return 'ORIGINAL_WORK_ID_CHANGED';
 if(candidate.target_branch!==BRANCH)return 'ISOLATED_BRANCH_CHANGED';
 if(!Array.isArray(candidate.files)||candidate.files.length!==FILES.length)return 'FILE_SET_INVALID';
 const seen=new Set();
 for(const f of candidate.files){
  if(!f||!FILES.includes(f.path)||seen.has(f.path))return 'UNAUTHORIZED_OR_DUPLICATE_FILE';
  seen.add(f.path);
  if(typeof f.content!=='string'||f.content.length<200||f.content.length>85000)return 'FILE_LENGTH_INVALID';
  if(/process\.env\.(OPENAI_API_KEY|REALITY_GITHUB_TOKEN)|node:child_process|eval\s*\(/.test(f.content))return 'CANDIDATE_SECRET_ACCESS_OR_DYNAMIC_EXECUTION';
 }
 return null;
}
function textOf(body){
 return typeof body?.output_text==='string'&&body.output_text.trim()?body.output_text:
 (body?.output||[]).flatMap(x=>x?.content||[])
  .filter(x=>x.type==='output_text').map(x=>x.text||'').join('');
}
function boundedFeedback(previous){
 if(!previous||typeof previous!=='object')return null;
 const actual=String(previous.test_output||'').slice(-6500);
 return {status:String(previous.status||'UNKNOWN').slice(0,100),
  reason:String(previous.reason||'').slice(0,350),
  test_output:actual,exit_code:previous.exit_code};
}
function save(round,raw,candidate,responseId,model,validation){
 const dir=outputDir(round);mkdirSync(dir,{recursive:true});
 writeFileSync(join(dir,'candidate-response.txt'),String(raw).slice(0,120000),'utf8');
 if(candidate&&typeof candidate==='object')writeFileSync(join(dir,'candidate.json'),JSON.stringify(candidate),'utf8');
 const receipt={
  original_work_id:WORK,round,model_response_id:responseId,model,
  candidate_contract:validation||'SCHEMA_VALID',
  candidate_generated_by:'REALITY_OPENAI_MODEL',
  files:Array.isArray(candidate?.files)?candidate.files.map(f=>({
   path:String(f.path||''),sha256:hash(String(f.content||'')),
  })):[],
  sandbox_passed:false,owner_approval:false,installation_authorized:false,
  registry_changed:false,original_job_settled:false,production_changed:false
 };
 writeFileSync(join(dir,'generation-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
 if(validation)return;
 for(const f of candidate.files){
  const dest=join(dir,f.path);mkdirSync(dirname(dest),{recursive:true});
  writeFileSync(dest,f.content,'utf8');
 }
}
async function generate(round){
 const key=process.env.OPENAI_API_KEY;
 if(typeof key!=='string'||key.length<10)throw Error('OPENAI_API_KEY_REQUIRED');
 const model=process.env.REALITY_OPENAI_MODEL||'gpt-5.6-luna';
 const previousCandidate=round>1?readJSON('reality-previous/candidate.json'):null;
 const previousFeedback=round>1?readJSON('reality-previous/feedback.json'):null;
 if(round>1&&(!previousFeedback||!previousCandidate))
  throw Error('RETRY_REQUIRES_SAVED_CANDIDATE_AND_SANDBOX_FEEDBACK');
 const prompt={
  task:'Reality itself must design a working, evidence-bound missing activation and settlement bridge for the ORIGINAL #143 customer job. Produce runnable source rather than general advice.',
  original_work_id:WORK,target_branch:BRANCH,
  exact_paths:FILES,
  objective:'Owner-authenticated preview-only PREPARE -> exact independent owner approval -> atomic one-time authorization -> verified capability registration with owner registry and Continuity receipt -> execute original model-generated executor read-only -> independent provider reconciliation -> durable truthful settlement. Original historical repair was already completed before this upgrade.',
  strict_contract:[
   'Output only JSON object {original_work_id,target_branch,files:[{path,content}]} with these three exact paths.',
   'Service must export prepareOriginalFullLoop, activateOriginalFullLoop, settleOriginalFullLoop and pin the original ID, owner, confirmed goal, branch, model source SHA and issue #143.',
   'No production deployment, no new GitHub writes, no issue closure, no fake completion, no new authority granted by the model.',
   'HTTP POST requires authenticatedChatSession, same-origin assertion, exact ACTIVATE_EXACT_VERIFIED_ISOLATED_CAPABILITY confirmation; HTTP GET can only prepare. Any missing evidence must fail closed.',
   'Source readback must compare the actual source digest and verify the original GitHub issue and successful isolated verification run.',
   'Existing createUniversePostgresPersistence exposes appendEvent,reconstruct,getCapability ONLY; never invent database methods. If new atomic database functions are needed, fail closed until they exist. Do not claim job complete when those functions are missing.',
   'The signed-in owner confirmation is necessary but not sufficient. Require database-atomic single-use claim, fresh user goal epoch, separate exact scope authorization, durable registration, and independent readback.',
   'Truthful outcome is HISTORICAL_SOURCE_ALREADY_FIXED_INDEPENDENTLY_RECONCILED; Reality did not independently create the prior historical fix.',
   'Provide >=8 executable node:test cases covering wrong owner, stale goal, bad SHA, explicit consent, missing database operation, registration mismatches, and settlement proof.',
   'Do not weaken invariants to make tests pass; test inputs must reflect real goal-state contract (active_goal.title, no active_goal.version property).'
  ],
  reference_source:CONTEXT.map(path=>({path,content:readFileSync(path,'utf8')})),
  prior_attempt:round===1?null:{
   source:'UNTRUSTED_REJECTED_MODEL_CANDIDATE_FOR_CORRECTION_ONLY',
   candidate:previousCandidate,independent_sandbox_feedback:boundedFeedback(previousFeedback),
   instruction:'Study exact failure diagnostics, correct cause instead of repeating source, then return all files. Do not make fabricated passes. Preserve independent owner approval.'
  }
 };
 const r=await fetch('https://api.openai.com/v1/responses',{
  method:'POST',headers:{authorization:'Bearer '+key,'content-type':'application/json'},
  body:JSON.stringify({model,max_output_tokens:16000,
   text:{format:{type:'json_object'}},
   input:[
    {role:'system',content:[{type:'input_text',text:'You are Reality, governed operational intelligence. Generate the missing code and tests. You can propose but not approve, install, or settle. Fix defects based on verified sandbox errors.'}]},
    {role:'user',content:[{type:'input_text',text:JSON.stringify(prompt)}]}
   ]
  })
 });
 const body=await r.json();
 if(!r.ok)throw Error('REALITY_PROVIDER_HTTP_'+r.status);
 const raw=textOf(body);
 let candidate=null,error=null;
 try{candidate=JSON.parse(raw);error=failCode(candidate)}
 catch(e){error='MODEL_OUTPUT_INVALID_JSON_'+String(e.message||'').slice(0,70)}
 save(round,raw,candidate,body.id||null,model,error);
 console.log('REALITY_CANDIDATE_GENERATION '+JSON.stringify({
  round,response_id:body.id||null,contract_error:error,source_saved:true,
  independent_sandbox_pending:true
 }));
}
function feedback(round,exitCode){
 const out=outputDir(round);
 const contents=existsSync('reality-test-output.txt')?
  readFileSync('reality-test-output.txt','utf8').slice(-6500):
  'No sandbox output recorded';
 const prior=readJSON(join(out,'generation-receipt.json'));
 const report={
  original_work_id:WORK,round,model_response_id:prior?.model_response_id||null,
  status:exitCode===0?'SANDBOX_PASS':'SANDBOX_REJECTED',
  reason:prior?.candidate_contract!=='SCHEMA_VALID'?prior?.candidate_contract:
   exitCode===0?'ALL_TESTS_PASSED':'INDEPENDENT_SANDBOX_FAILED',
  exit_code:exitCode,test_output:contents,
  verified_without_model_secrets:true,external_action_performed:false,
  installation_authorized:false,job_settled:false
 };
 mkdirSync('reality-feedback',{recursive:true});
 writeFileSync('reality-feedback/feedback.json',JSON.stringify(report,null,2)+'\n');
 console.log('REALITY_SANDBOX_FEEDBACK '+JSON.stringify({round,status:report.status,reason:report.reason,exit_code:exitCode}));
}
const command=process.argv[2];const round=Number(process.argv[3]);
if(!validRound(round))throw Error('ROUND_1_TO_3_REQUIRED');
if(command==='generate')await generate(round);
else if(command==='feedback')feedback(round,Number(process.argv[4]));
else throw Error('UNKNOWN_SELF_CORRECTION_COMMAND');
