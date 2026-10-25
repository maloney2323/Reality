// REAL gpt-4.1-mini semantic reviews of preserved BAD and GOOD model replies.
// No invented responses, no customer data and no external effects.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {buildGovernedChatSignal} from '../src/reality-governed-fragmented-signal-cleaner-v0.1.js';
import {buildCleanerConversationContext} from '../src/reality-cleaner-conversation-context-v0.1.js';
import {buildCognitionContinuityHandoff} from '../src/reality-cognition-continuity-handoff-v0.1.js';
import {reviewRealityAnswer} from '../src/reality-semantic-review-v0.1.js';
import {startContinuityRuntime} from '../src/reality-continuity-spine-runtime-v0.1.js';
import {readGroundedEvidence} from '../src/reality-reliability-evidence-v0.1.js';
import {makeAdversarialRunScope} from '../src/reality-benchmark-run-scope-v0.1.js';
import {resolveReliabilityBenchmarkDb} from '../src/reality-reliability-db-boundary-v0.1.js';
const DB='https://hvkfreoagbrphwghjajw.supabase.co',PROJECT='hvkfreoagbrphwghjajw';
const BRANCH='experiment/reality-live-durable-adversarial-20261025';
const sourceRun=makeAdversarialRunScope('construction-live12-20261025-a');
const outputRun=makeAdversarialRunScope('provenance-contract-20261025-b');
if(process.env.VERCEL_ENV!=='preview'||process.env.VERCEL_GIT_COMMIT_REF!==BRANCH)
 throw Error('PROVENANCE_RECHECK_PREVIEW_ONLY');
const env=process.env;
Object.assign(env,{REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
 REALITY_CONTINUOUS_RELIABILITY_ENABLED:'true',
 REALITY_RELIABILITY_BENCHMARK_PROJECT_REF:PROJECT,
 REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF:PROJECT,
 REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL:DB,
 REALITY_UNIVERSE_PERSISTENCE_URL:DB,SUPABASE_URL:DB});
assert.equal(resolveReliabilityBenchmarkDb().project,PROJECT);
if(!env.REALITY_STANDALONE_OPENAI_API_KEY)throw Error('PREVIEW_MODEL_CREDENTIAL_REQUIRED');
let calls=0,input=0,output=0;
const protocol=async(url,opts={})=>{
 const u=new URL(url);
 if(u.pathname.startsWith('/rest/v1/')){
  if(u.origin!==DB)throw Error('OTHER_DATABASE_BLOCKED');
  return fetch(url,opts);
 }
 if(u.origin!=='https://api.openai.com'||u.pathname!=='/v1/responses')
  throw Error('OTHER_PROVIDER_BLOCKED');
 if(calls>=3||input>=110000||output>=15000)throw Error('MODEL_BUDGET_CAP');
 const res=await fetch(url,{...opts,signal:AbortSignal.timeout(110000)});
 const data=await res.clone().json();
 calls++;input+=data.usage?.input_tokens||0;output+=data.usage?.output_tokens||0;
 return new Response(JSON.stringify(data),{status:res.status});
};
const now=()=>new Date().toISOString();
async function rt(scope,message){
 return startContinuityRuntime({continuityRootSource:scope.root,
  worldlineSource:scope.worldline,subjectId:scope.subjectId,
  signal:buildGovernedChatSignal({message,observedAt:now()}),
  observedAt:now(),fetchImpl:protocol});
}
const archive=await rt(sourceRun,'Read preserved genuine model outputs.');
const stored=await archive.readback();
const turns=stored.filter(e=>e.payload?.benchmark_kind==='ADVERSARIAL_LIVE_TURN'&&
 e.payload.benchmark_run_id==='construction-live12-20261025-a')
 .sort((a,b)=>a.payload.turn-b.payload.turn);
assert.equal(turns.length,12,'ARCHIVED_MODEL_CASES_MISSING');
const source=readGroundedEvidence(stored,{worldId:sourceRun.world});
const results=[];
for(const number of [12,9]){
 const current=turns[number-1].payload;
 const past=turns.slice(0,number-1).flatMap(e=>[
  {role:'user',text:e.payload.message,source_ref:e.event_id+':user'},
  {role:'assistant',text:e.payload.reality_final,source_ref:e.event_id+':assistant'},
 ]);
 const signal=buildGovernedChatSignal({message:current.message,observedAt:now()});
 const evidence=buildCognitionContinuityHandoff({
  governedSignal:signal,verifiedConversationTurns:past,latestMessage:current.message,
 }).conversation_evidence;
 assert.ok(evidence.candidates.some(x=>/payer/i.test(x.exact_user_text)&&
 x.epistemic_modalities.includes('HEARSAY')),'PAYER_SOURCE_MODALITY_NOT_LINKED');
 const cleaner=buildCleanerConversationContext({
  governedSignal:signal,priorTurns:past,authenticatedHistory:true});
 const review=await reviewRealityAnswer({
  cleanerConversationContext:cleaner,conversationEvidence:evidence,
  currentUserMessage:current.message,modelAnswer:current.original_model_answer,
  priorTurns:past,sourceSnapshot:source,worldId:sourceRun.world,
  model:'gpt-4.1-mini',apiKey:env.REALITY_STANDALONE_OPENAI_API_KEY,fetchImpl:protocol,
 });
 const reportedPayer=review.review.provenance_checks.filter(x=>evidence.candidates.some(y=>
  y.source_ref===x.source_ref&&y.clause_id===x.clause_id&&/payer/i.test(y.exact_user_text)));
 const item={
  kind:number===12?'PRESERVED_UNQUALIFIED_TURN12':'PRESERVED_QUALIFIED_TURN9',
  source_turn:number,original_model_answer:current.original_model_answer,
  original_provider_response_id:current.underlying_model_response_id||null,
  typed_report_candidates:evidence.candidates,
  review_checks:review.review.provenance_checks,
  reported_payer_checks:reportedPayer,
  reviewer_issues:review.review.issues,
  reviewer_unassessed:review.review.unassessed_claims,
  reviewer_status:review.review.provenance_review_status,
  required_checks:review.review.provenance_claims_expected,
  actual_checks:review.review.provenance_claims_assessed,
  reviewer_response_id:review.response_id,
  independent_semantic_ground_truth_established:false,
 };
 const target=await rt(outputRun,'Persist real independent-process semantic-review evidence.');
 const event=await target.appendStage({
  stage:'VERIFICATION',entityId:'contract-review:'+number,
  payload:{benchmark_kind:'PRESERVED_REAL_MODEL_PROVENANCE_CONTRACT_RECHECK',
   run_id:'provenance-contract-20261025-b',...item},
  provenance:{source:'real_llm_review_of_preserved_answers_not_independent_truth'},
  epistemicStatus:'UNVERIFIED',observedAt:now(),
 });
 assert.ok((await target.readback()).some(x=>x.event_id===event.event_id));
 item.receipt_id=event.event_id;
 results.push(item);
 console.log('PROVENANCE_CONTRACT_RECHECK '+JSON.stringify({
  turn:number,kind:item.kind,issues:item.reviewer_issues.map(x=>({kind:x.kind,quote:x.quote})),
  payer_relations:reportedPayer.map(x=>({relation:x.relation,quote:x.answer_quote})),
  checks:item.actual_checks,expected:item.required_checks,status:item.reviewer_status,
  receipt:item.receipt_id,
 }));
}
const summary={
 status:'COMPLETE_REAL_REVIEW_NOT_INDEPENDENTLY_GRADED',
 real_review_calls:calls,input_tokens:input,output_tokens:output,
 preserved_bad_reply_flagged:results[0].reviewer_issues.some(x=>
   x.kind==='UNSUPPORTED_FACT'&&/payer|acknowledg/i.test(x.quote)),
 qualified_reply_false_alarm:results[1].reviewer_issues.some(x=>
   x.kind==='UNSUPPORTED_FACT'&&/payer|acknowledg/i.test(x.quote)),
 customer_actions:0,scripted_conversation_originals:true,
};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
await mkdir('public',{recursive:true});
const cards=results.map(r=>'<details><summary>'+esc(r.kind)+': '+esc(r.reviewer_status)+', '+r.reviewer_issues.length+' issues</summary><pre>'+esc(JSON.stringify(r,null,2))+'</pre></details>').join('');
const page='<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reality provenance contract</title><style>body{font:15px system-ui;background:#111827;color:#e5e7eb;max-width:900px;margin:auto;padding:20px}pre{white-space:pre-wrap;overflow-wrap:anywhere}details{border-top:1px solid #777;padding:12px}summary{cursor:pointer}</style><h1>Reality provenance recheck</h1><p>Actual preserved model replies, actual semantic-model checks, isolated PostgreSQL. Not independently verified customer truth.</p><pre>'+esc(JSON.stringify(summary,null,2))+'</pre>'+cards+'</html>';
await writeFile('public/index.html',page,'utf8');
console.log('PROVENANCE_CONTRACT_SCOREBOARD '+JSON.stringify(summary));
