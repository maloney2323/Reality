// Live business-specific founder workday. Read-only except isolated benchmark
// Continuity receipts; the 50 user messages are frozen in benchmarks/.
// Never use labels from the fixture in a model prompt. No standalone LLM calls.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {FOUNDER_REALITY_50,FOUNDER_REALITY_50_VERSION}
 from '../benchmarks/reality-take-intelligence-founder-50-v0.1.mjs';
import {runLiveIntelligenceOrchestration}
 from '../src/reality-live-intelligence-orchestration-v0.1.js';
import {buildGovernedChatSignal}
 from '../src/reality-governed-fragmented-signal-cleaner-v0.1.js';
import {startContinuityRuntime}
 from '../src/reality-continuity-spine-runtime-v0.1.js';
import {makeAdversarialRunScope}
 from '../src/reality-benchmark-run-scope-v0.1.js';
import {resolveReliabilityBenchmarkDb}
 from '../src/reality-reliability-db-boundary-v0.1.js';

const BRANCH='experiment/reality-live-durable-adversarial-20261025';
const PROJECT='hvkfreoagbrphwghjajw',DB='https://'+PROJECT+'.supabase.co';
const RUN='take-intelligence-founder-50-live-20261025-a';
const SCOPE=makeAdversarialRunScope(RUN);
const phase=process.argv[2]||'report',from=Number(process.argv[3]||1),to=Number(process.argv[4]||50);
if(process.env.VERCEL_ENV!=='preview'||process.env.VERCEL_GIT_COMMIT_REF!==BRANCH)
 throw Error('FOUNDER_BENCHMARK_PREVIEW_BRANCH_ONLY');
if(!(phase==='run'&&Number.isInteger(from)&&Number.isInteger(to)&&
 from>=1&&to>=from&&to<=50&&to-from<=9) && phase!=='report')
 throw Error('SEGMENT_MUST_CONTAIN_BETWEEN_1_AND_10_TURNS');
assert.equal(FOUNDER_REALITY_50.length,50,'FROZEN_FIFTY_CASES_REQUIRED');
Object.assign(process.env,{
 REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
 REALITY_CONTINUOUS_RELIABILITY_ENABLED:'true',
 REALITY_SEMANTIC_REVIEW_ENABLED:'true',
 REALITY_RELIABILITY_EXTRACTION_ENABLED:'true',
 REALITY_DETECTOR_REPAIR_ENABLED:'true',
 REALITY_DETECTOR_SHADOW_ENABLED:'false',
 REALITY_RELIABILITY_BENCHMARK_PROJECT_REF:PROJECT,
 REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF:PROJECT,
 REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL:DB,
 REALITY_UNIVERSE_PERSISTENCE_URL:DB,SUPABASE_URL:DB,
});
const isolated=resolveReliabilityBenchmarkDb();
if(isolated.project!==PROJECT||isolated.url!==DB||!isolated.strictSecrets)
 throw Error('FOUNDER_TEST_ISOLATION_INVALID');
const key=process.env.REALITY_STANDALONE_OPENAI_API_KEY;
if(!key)throw Error('NO_ISOLATED_OPENAI_KEY_AVAILABLE');
const now=()=>new Date().toISOString();
let calls=[],inputTokens=0,outputTokens=0;
const fetchImpl=async(url,options={})=>{
 const u=new URL(String(url));
 if(u.pathname.startsWith('/rest/v1/')){
  if(u.origin!==DB)throw Error('PRODUCTION_DATABASE_BLOCKED');
  return fetch(url,options);
 }
 if(u.origin!=='https://api.openai.com'||u.pathname!=='/v1/responses')
  throw Error('UNAPPROVED_PROVIDER_BLOCKED');
 if(calls.length>=40||inputTokens>=310000||outputTokens>=21000)
  throw Error('PAID_MODEL_SEGMENT_BUDGET_CAP');
 const args=JSON.parse(options.body||'{}');
 const response=await fetch(url,{...options,signal:AbortSignal.timeout(105000)});
 const body=await response.clone().json();
 const text=typeof body.output_text==='string'?body.output_text:
  (body.output||[]).flatMap(x=>x.content||[])
   .filter(x=>x.type==='output_text').map(x=>x.text).join('');
 const kind=args.text?.format?.name==='reality_semantic_review'?'SEMANTIC_REVIEW':'MODEL_COGNITION';
 calls.push({kind,response_id:body.id||null,status:response.status,
  first_answer:kind==='MODEL_COGNITION'?text:null});
 inputTokens+=body.usage?.input_tokens||0;
 outputTokens+=body.usage?.output_tokens||0;
 return new Response(JSON.stringify(body),{status:response.status});
};
async function spine(message){
 return startContinuityRuntime({
  continuityRootSource:SCOPE.root,worldlineSource:SCOPE.worldline,
  subjectId:SCOPE.subjectId,
  signal:buildGovernedChatSignal({message,observedAt:now()}),
  observedAt:now(),fetchImpl,
 });
}
const isRow=e=>e.payload?.benchmark_kind==='REALITY_FOUNDER_GENUINE_MODEL_TURN'&&
 e.payload?.run_id===RUN;
const readRows=async()=>((await (await spine('Recover frozen founder workday receipts.')).readback())
 .filter(isRow).sort((a,b)=>a.payload.turn-b.payload.turn));
let records=await readRows();
for(let i=0;i<records.length;i++){
 const p=records[i].payload;
 if(p.turn!==i+1||p.user_message!==FOUNDER_REALITY_50[i].text||
    p.business_run_version!==FOUNDER_REALITY_50_VERSION||
    !p.original_model_answer||!p.reality_released_answer)
  throw Error('DURABLE_BENCHMARK_CONTINUITY_MISMATCH');
}
const transcript=records.flatMap(e=>[
 {role:'user',text:e.payload.user_message,source_ref:e.event_id+':user'},
 {role:'assistant',text:e.payload.reality_released_answer,source_ref:e.event_id+':assistant'},
]);
if(phase==='run'){
 if(records.length>to)throw Error('SEGMENT_ALREADY_COMPLETE_NEXT_RANGE_REQUIRED');
 if(records.length<from-1)throw Error('PREVIOUS_SEGMENT_NOT_YET_COMMITTED');
 for(let i=Math.max(from-1,records.length);i<to;i++){
  const t=FOUNDER_REALITY_50[i],observedAt=now(),before=calls.length;
  const result=await runLiveIntelligenceOrchestration({
   message:t.text,observedAt,model:'gpt-4.1-mini',apiKey:key,
   systemContext:{
    world_id:SCOPE.world,worldline_id:SCOPE.worldline,
    continuity_root_id:SCOPE.root,conversation_id:SCOPE.conversationId,
    domain:'take_intelligence_reality_business',
    action_authorized:false,execution_authorized:false,
   },
   verifiedConversationTurns:transcript,fetchImpl,
  });
  const perTurn=calls.slice(before);
  const firstReview=perTurn.findIndex(x=>x.kind==='SEMANTIC_REVIEW');
  const original=perTurn.slice(0,firstReview<0?undefined:firstReview)
    .filter(x=>x.kind==='MODEL_COGNITION').at(-1)?.first_answer||'';
  const released=String(result.intelligence?.answer||'');
  if(!original||!released)throw Error('FIRST_OR_FINAL_ANSWER_MISSING');
  if(result.execution?.status!=='NOT_EXECUTED'||result.authority?.granted)
   throw Error('EXTERNAL_ACTION_NOT_DISABLED');
  const reliability=result.reliability||{};
  if(reliability.canonical_epistemic_state?.status!=='PERSISTED_AND_READBACK_VERIFIED'||
     reliability.readback_verified!==true)
   throw Error('SOURCE_LINKED_CONTINUITY_READBACK_NOT_VERIFIED');
  const row={
   benchmark_kind:'REALITY_FOUNDER_GENUINE_MODEL_TURN',run_id:RUN,
   business_run_version:FOUNDER_REALITY_50_VERSION,
   real_business:'Take Intelligence LLC',product:'Reality',
   turn:t.turn,case_phase:t.phase,
   grading_transition:t.transition, // stored in evidence, NOT provided to model
   user_message:t.text,observed_at:observedAt,
   original_model_answer:original,reality_released_answer:released,
   answer_changed:original!==released,
   detected_semantic_issues:reliability.semantic_review?.issues||[],
   goal_trajectory_review:reliability.semantic_review?.goal_trajectory_review||null,
   goal_drift_coverage:reliability.conversational_assessment?.goal_drift_coverage||null,
   semantic_review_coverage:reliability.semantic_review?.status||'NOT_ASSESSED',
   goal_drift_receipt_findings:reliability.conversational_drift?.findings||[],
   correction_disposition:reliability.semantic_repair?.status||null,
   released_intervention:result.intelligence?.reliability_intervention||null,
   source_frame_hash:reliability.canonical_epistemic_state.frame_hash,
   source_frame_receipt_id:reliability.canonical_epistemic_state.source_receipt_id,
   response_receipts:perTurn.map(x=>({kind:x.kind,id:x.response_id})),
   provider_calls:perTurn.length,independent_semantic_adjudication:false,
   external_actions_executed:0,
  };
  const durable=await spine('Store first and last model answer for founder turn '+t.turn);
  const saved=await durable.appendStage({
   stage:'VERIFICATION',entityId:'take-founder-turn:'+t.turn,
   epistemicStatus:'UNVERIFIED',observedAt:now(),
   payload:row,provenance:{source:'freeze_then_run_50_turn_take_intelligence_real_business'},
  });
  if(!(await durable.readback()).some(e=>e.event_id===saved.event_id&&
     e.payload?.original_model_answer===original&&
     e.payload?.reality_released_answer===released))
   throw Error('FOUNDER_TURN_PERSISTENCE_READBACK_INVALID');
  records.push({event_id:saved.event_id,payload:row});
  transcript.push({role:'user',text:t.text,source_ref:saved.event_id+':user'});
  transcript.push({role:'assistant',text:released,source_ref:saved.event_id+':assistant'});
  console.log('FOUNDER_REALITY_TURN '+JSON.stringify({
   turn:t.turn,phase:t.phase,
   source_state_verified:true,answer_changed:row.answer_changed,
   goal_alignment:row.goal_trajectory_review?.answer_alignment||'NOT_ASSESSED',
   goal_review_coverage:row.goal_drift_coverage?.status||'NOT_SEMANTICALLY_ASSESSED',
   goal_direction:row.goal_trajectory_review?.user_direction||'NOT_ASSESSED',
   drift_candidates:row.goal_drift_receipt_findings.length,
   repair:row.released_intervention,
   comparison_receipt:saved.event_id,
   model_calls:perTurn.length,
  }));
 }
 console.log('FOUNDER_REALITY_SEGMENT '+JSON.stringify({
  from,to,turns_durably_completed:records.length,
  requests:calls.length,input_tokens:inputTokens,output_tokens:outputTokens,
  external_actions:0,
 }));
}
const summary={
 run_id:RUN,business:'Take Intelligence LLC',product:'Reality',
 frozen_turns:50,completed_real_model_turns:records.length,
 source_state_readback_turns:records.filter(e=>e.payload.source_frame_receipt_id).length,
 original_vs_final_changed:records.filter(e=>e.payload.answer_changed).length,
 turns_with_goal_drift_candidates:records.filter(e=>
  e.payload.goal_trajectory_review?.answer_alignment==='ASSISTANT_DRIFTED_OFF_OBJECTIVE').length,
 turns_with_authorized_pivot:records.filter(e=>[
  'USER_AUTHORIZED_PIVOT','USER_AUTHORIZED_DETOUR',
 ].includes(e.payload.goal_trajectory_review?.user_direction)).length,
 goal_drift_coverage_counts:{
  unassessed:records.filter(e=>!e.payload.goal_drift_coverage ||
   e.payload.goal_drift_coverage.status==='NOT_SEMANTICALLY_ASSESSED').length,
  limited:records.filter(e=>
   e.payload.goal_drift_coverage?.status==='LIMITED_REVIEW_NO_CANDIDATES').length,
  unresolved:records.filter(e=>
   e.payload.goal_drift_coverage?.status==='GOAL_ALIGNMENT_UNRESOLVED').length,
  drift_candidates:records.filter(e=>
   e.payload.goal_drift_coverage?.status==='DRIFT_CANDIDATES_REQUIRE_ADJUDICATION').length,
  reviewed_not_independently_validated:records.filter(e=>
   e.payload.goal_drift_coverage?.status==='REVIEWED_NO_CANDIDATES_NOT_VALIDATED').length,
 },
 zero_alerts_proves_no_drift:false,
 turns_with_rewrite_correction:records.filter(e=>
  e.payload.released_intervention==='SEMANTIC_REVIEW_CORRECTED').length,
 external_actions:0,
 independently_graded_goal_drift_rate:null,
 independently_graded_improvement_rate:null,
 grading_status:'PENDING_INDEPENDENT_TRANSCRIPT_ADJUDICATION',
 note:'Real business, SCRIPTED user messages, genuine paid model and reviewer, no authenticated customer interactions.',
};
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const details=records.map(e=>{
 const r=e.payload;
 return '<details><summary>Turn '+r.turn+' · '+escape(r.case_phase)+
 ' · goal '+escape(r.goal_trajectory_review?.answer_alignment||'not assessed')+
 ' · changed '+r.answer_changed+'</summary><pre>'+escape(JSON.stringify(r,null,2))+'</pre></details>';
}).join('');
await mkdir('public',{recursive:true});
await writeFile('public/index.html',
 '<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<title>Reality founder 50-turn live drift audit</title><style>body{font:15px system-ui;background:#111925;color:#edf1fa;max-width:1000px;margin:auto;padding:24px}details{border-top:1px solid #546071;padding:12px}pre{white-space:pre-wrap;overflow-wrap:anywhere}</style>'+
 '<h1>Reality / Take Intelligence LLC · 50-turn business drift benchmark</h1>'+
 '<p>Actual GPT-4.1-mini, original vs Reality released answers, frozen scripted founder conversation. Isolated Preview, no customer actions or transactions. No measured drift-reduction claim without independent grading.</p>'+
 '<pre>'+escape(JSON.stringify(summary,null,2))+'</pre>'+details+'</html>','utf8');
console.log('FOUNDER_REALITY_SCOREBOARD '+JSON.stringify(summary));
