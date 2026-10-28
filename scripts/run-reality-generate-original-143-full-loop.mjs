// Reality model owns the new full-loop candidate; this file is transport and
// evidence validation only. It does not author a fix, install it or grant power.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,join} from 'node:path';

const WORK='work:24cda9611404e9bcb47909976067605c';
const BRANCH='experiment/reality-live-durable-adversarial-20261025';
const FILES=Object.freeze([
 'src/reality-extensions/reality-original-full-loop-integration.mjs',
 'api/reality/personal-original-full-loop.js',
 'test/reality-extensions/reality-original-full-loop-integration.test.js',
]);
const CONTEXT=[
 'src/reality-original-upgrade-readback-v0.1.js',
 'src/reality-personal-goal-readback-v0.1.js',
 'src/reality-private-chat-auth-v0.1.js',
 'src/reality-universe-postgres-persistence-v0.1.js',
 'src/reality-continuity-spine-v2.0.js',
 'src/reality-extensions/reality-original-maintenance-executor.mjs',
 'api/reality/personal-original-upgrade-status.js',
 'src/reality-reliability-db-boundary-v0.1.js',
 'src/reality-single-use-execution-reservation-v0.1.js',
];
const assert=(condition,reason)=>{if(!condition)throw Error(reason)};
const hash=v=>createHash('sha256').update(v).digest('hex');
function validate(candidate){
 assert(candidate&&typeof candidate==='object'&&!Array.isArray(candidate),'REALITY_MODEL_JSON_OBJECT_REQUIRED');
 assert(candidate.original_work_id===WORK,'REALITY_MODEL_CHANGED_ORIGINAL_JOB');
 assert(candidate.target_branch===BRANCH,'REALITY_MODEL_CHANGED_TARGET_BRANCH');
 assert(Array.isArray(candidate.files)&&candidate.files.length===FILES.length,'REALITY_MODEL_FILE_SET_INVALID');
 const got=new Set();
 for(const file of candidate.files){
  assert(file&&FILES.includes(file.path)&&!got.has(file.path),'REALITY_MODEL_UNAUTHORIZED_FILE_PATH');
  got.add(file.path);
  assert(typeof file.content==='string'&&file.content.length>400&&file.content.length<80000,'REALITY_MODEL_FILE_INVALID_LENGTH');
  assert(!/process\\.env\\.OPENAI_API_KEY|process\\.env\\.REALITY_GITHUB_TOKEN/.test(file.content),'REALITY_MODEL_SECRET_ACCESS_FORBIDDEN');
 }
 const service=candidate.files.find(x=>x.path===FILES[0]).content;
 const route=candidate.files.find(x=>x.path===FILES[1]).content;
 const tests=candidate.files.find(x=>x.path===FILES[2]).content;
 for(const phrase of ['prepareOriginalFullLoop','activateOriginalFullLoop','settleOriginalFullLoop',WORK]){
  assert(service.includes(phrase),'REALITY_MODEL_MISSING_SERVICE_CONTRACT_'+phrase);
 }
 for(const phrase of ['authenticatedChatSession','assertSameOrigin','privateChatConfig',
  'ACTIVATE_EXACT_VERIFIED_ISOLATED_CAPABILITY']){
  assert(route.includes(phrase),'REALITY_MODEL_MISSING_AUTH_ROUTE_CONTRACT_'+phrase);
 }
 assert((tests.match(/test\\(/g)||[]).length>=8,'REALITY_MODEL_INSUFFICIENT_TEST_CASES');
 return candidate;
}
function save(candidate,responseId,model){
 mkdirSync('reality-generated-original-143',{recursive:true});
 for(const file of candidate.files){
  const dest=join('reality-generated-original-143',file.path);
  mkdirSync(dirname(dest),{recursive:true});
  writeFileSync(dest,file.content,'utf8');
 }
 const proof={
  original_work_id:WORK,target_branch:BRANCH,
  model_response_id:responseId,model,source:'REALITY_MODEL_GENERATION',
  generated_files:candidate.files.map(f=>({path:f.path,sha256:hash(f.content)})),
  owner_approval: false,
  installation_authorized:false,registry_changed:false,
  original_job_settled:false,production_changed:false,
 };
 writeFileSync('reality-generated-original-143/generation-receipt.json',
  JSON.stringify(proof,null,2)+'\\n','utf8');
 console.log('REALITY_GENERATION_RECEIPT '+JSON.stringify(proof));
}
function extractedText(body){
 if(typeof body.output_text==='string'&&body.output_text.trim())return body.output_text;
 return (body.output||[]).flatMap(x=>x.content||[])
  .filter(x=>x.type==='output_text').map(x=>x.text).join('');
}
async function main(){
 const key=process.env.OPENAI_API_KEY;
 assert(typeof key==='string'&&key.length>10,'REALITY_MODEL_API_KEY_NOT_CONFIGURED');
 const model=process.env.REALITY_OPENAI_MODEL||'gpt-5.6-luna';
 const context=CONTEXT.map(path=>({path,content:readFileSync(path,'utf8')}));
 const prompt={
  identity:'You are the Reality product itself, generating a candidate extension for its original customer work. Do not pretend previous assistant or model code is an installed capability. Generate the full loop; do not silently authorize it.',
  job:{original_work_id:WORK,github_issue:143,repository:'maloney2323/Reality',target_branch:BRANCH,
   situation:'Original source test assertion was ALREADY repaired before this executor. Model-generated existing executor is staged and independent GitHub read-only reconciliation verified the preexisting fix. An authenticated owner registry activation path and durable original job final settlement are still missing.',
   earlier_proof_run:'https://github.com/maloney2323/Reality/actions/runs/40777160879',
   original_executor_sha256:'7ba3cc3273c2301c6902b6b3b3d6d0247e8b6abe0398467656e5e2ca93648128',
   actor:'Reality itself; not ChatGPT writing the implementation',
  },
  requirements:[
   'Return JSON only, no markdown, in the exact shape {original_work_id,target_branch,files:[{path,content}]} with the 3 exact paths supplied below.',
   'Implement service named exports prepareOriginalFullLoop, activateOriginalFullLoop and settleOriginalFullLoop, plus authenticated HTTP route and at least eight meaningful Node tests.',
   'Use the code shown below as ground truth for available function signatures. If required transactional capability missing, fail closed with explicit status; never fabricate installation.',
   'Owner authentication via authenticatedChatSession, preview-only privateChatConfig, same-origin POST with explicit user confirmation ACTIVATE_EXACT_VERIFIED_ISOLATED_CAPABILITY; no POST from unauthenticated requests.',
   'Start with independent actual Github get and owner goal+original worldline readback. Must bind original work ID, owner identity, original confirmed goal, version, source hash, isolated branch and separate owner action approval.',
   'Use existing goal-bound, database atomic single-use authorization mechanisms. No client-provided approval booleans or unfounded capability grants. If exact activation cannot be proven, do NOT settle.',
   'If activated, persist exact registry row (universe_capabilities) AND linked, hash-chain-valid Continuity registration event in owner worldline. Independently read both and check interlocking IDs before resuming.',
   'Resume only the original model-generated executor via get-only provider access when historical test already fixed, and distinguish PREEXISTING_FIX_NOT_EXECUTED_BY_REALITY from newly applied repair. Never falsely claim Reality fixed preexisting source.',
   'Append independently verified original-job settlement receipt to same owner worldline only after verified activation and real read-only original job run. Preserve original work ID and separate original GitHub issue closure authority.',
   'No production changes; no GitHub writes; no new secrets or models in action endpoints; no installation during GET; no fake placeholder receipts or hardcoded success.',
   'API must expose explicit authenticated PREPARE and ACTIVATE_AND_COMPLETE steps; activation may only execute on an actual owner click and fresh exact authorization.',
   'Use dependency injection for provider, persistence and auth in tests; include wrong-owner, wrong-goal, missing approval, bad source hash, stale grant, registry readback mismatch, already-fixed reconciliation and partial-write failures.',
   'The output is a candidate. It will be independently tested in a no-network no-secret sandbox before proposed PR; never mark it complete because you generated it.'
  ],
  exact_output_paths:FILES,
  actual_current_source_context:context,
 };
 const response=await fetch('https://api.openai.com/v1/responses',{
  method:'POST',headers:{authorization:'Bearer '+key,'content-type':'application/json'},
  body:JSON.stringify({
   model,max_output_tokens:11500,
   input:[
    {role:'system',content:[{type:'input_text',text:'You are Reality, an evidence-governed autonomous code-generating operating intelligence. Generate implementation code rather than a discussion. You can propose files, but have no right to authorize installation, execute, or settle customer jobs.'}]},
    {role:'user',content:[{type:'input_text',text:JSON.stringify(prompt)}]},
   ],
   text:{format:{type:'json_object'}},
  }),
 });
 const body=await response.json();
 assert(response.ok,'REALITY_PROVIDER_HTTP_'+response.status);
 const raw=extractedText(body).trim();
 assert(raw.length>500,'REALITY_MODEL_EMPTY_OR_TRUNCATED_OUTPUT');
 let candidate;
 try{candidate=JSON.parse(raw)}catch{throw Error('REALITY_MODEL_NOT_VALID_JSON_'+String(body.status))}
 validate(candidate);
 save(candidate,body.id||null,model);
}
main().catch(error=>{console.error('REALITY_GENERATION_FAILED '+error.message);process.exitCode=1});
