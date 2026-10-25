// Live Reality review/repair of *archived real GPT-4.1-mini* first answers.
// The first gateway reply is injected verbatim from a prior paid model receipt.
// All reviewer / correction calls are fresh real provider calls, no synthetic
// answer or real customer data. Explicitly NOT fresh initial LLM generation.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {runLiveIntelligenceOrchestration} from '../src/reality-live-intelligence-orchestration-v0.1.js';
import {buildGovernedChatSignal} from '../src/reality-governed-fragmented-signal-cleaner-v0.1.js';
import {startContinuityRuntime} from '../src/reality-continuity-spine-runtime-v0.1.js';
import {resolveReliabilityBenchmarkDb} from '../src/reality-reliability-db-boundary-v0.1.js';
import {makeAdversarialRunScope} from '../src/reality-benchmark-run-scope-v0.1.js';
const PROJECT='hvkfreoagbrphwghjajw',DB='https://'+PROJECT+'.supabase.co';
const ARCHIVE='cold-chain-independent-20261025-a',RUN='authentic-conversation-replay-20261025-a';
const archivedScope=makeAdversarialRunScope(ARCHIVE),outScope=makeAdversarialRunScope(RUN);
if(process.env.VERCEL_ENV!=='preview'||
 process.env.VERCEL_GIT_COMMIT_REF!=='experiment/reality-live-durable-adversarial-20261025')
 throw Error('PREVIEW_ONLY');
for(const k of ['REALITY_UNIVERSE_PERSISTENCE_ENABLED',
 'REALITY_CONTINUOUS_RELIABILITY_ENABLED','REALITY_SEMANTIC_REVIEW_ENABLED',
 'REALITY_DETECTOR_REPAIR_ENABLED'])
 if(process.env[k]!=='true')throw Error('MISSING_UNIFIED_REALITY_FLAG:'+k);
const db=resolveReliabilityBenchmarkDb();
if(db?.project!==PROJECT||db?.url!==DB||db?.strictSecrets!==true)
 throw Error('ISOLATED_DATABASE_BOUNDARY_NOT_VERIFIED');
const apiKey=process.env.REALITY_STANDALONE_OPENAI_API_KEY;
if(!apiKey)throw Error('NO_LIVE_MODEL_CREDENTIAL');
const now=()=>new Date().toISOString();
let paid=0,input=0,output=0;const traces=[];
async function gatedFetch(url,options={}){
 const u=new URL(String(url));
 if(u.pathname.startsWith('/rest/v1/')){
  if(u.origin!==DB)throw Error('CROSS_DATABASE_REJECTED');
  return fetch(url,options);
 }
 if(u.origin!=='https://api.openai.com'||u.pathname!=='/v1/responses')
  throw Error('UNAUTHORIZED_PROVIDER_ORIGIN');
 if(paid>=9||input>=170000||output>=18000)throw Error('MODEL_BUDGET_LIMIT');
 const req=JSON.parse(options.body||'{}');
 const resp=await fetch(url,{...options,signal:AbortSignal.timeout(105000)});
 const data=await resp.clone().json();
 paid++;input+=data.usage?.input_tokens||0;output+=data.usage?.output_tokens||0;
 traces.push({kind:req.text?.format?.name==='reality_semantic_review'?'REVIEW':'MODEL_REPAIR',
  id:data.id||null,http_status:resp.status,usage:data.usage||null});
 return new Response(JSON.stringify(data),{status:resp.status});
}
async function runtime(scope,message){
 return startContinuityRuntime({
  continuityRootSource:scope.root,worldlineSource:scope.worldline,
  subjectId:scope.subjectId,
  signal:buildGovernedChatSignal({message,observedAt:now()}),
  observedAt:now(),fetchImpl:gatedFetch,
 });
}
const historical=await runtime(archivedScope,'Inspect preserved genuine-model workday receipts.');
const archive=(await historical.readback()).filter(e=>
  e.payload?.benchmark_kind==='FROZEN_COLD_CHAIN_LIVE_TURN'&&
  e.payload?.run_id===ARCHIVE).sort((a,b)=>a.payload.turn-b.payload.turn);
assert.equal(archive.length,12,'ARCHIVED_REAL_MODEL_TRANSCRIPT_MISSING');
const cases=[
 {turn:9,tag:'KNOWN_WRONG_DELIVERY_STATUS',regex:/order status as NOT DELIVERED/i},
 {turn:6,tag:'PREVIOUSLY_CORRECT_PAYMENT_STATUS',regex:/payment status remains unconfirmed/i},
];
const results=[];
for(const caseData of cases){
 const event=archive[caseData.turn-1],original=event.payload.raw_model_first_answer;
 assert.match(original,caseData.regex,'ARCHIVED_GENUINE_MODEL_ANSWER_CHANGED');
 const history=archive.slice(0,caseData.turn-1).flatMap(e=>[
  {role:'user',text:e.payload.message,source_ref:e.event_id+':user'},
  {role:'assistant',text:e.payload.reality_final,source_ref:e.event_id+':assistant'},
 ]);
 const scope=makeAdversarialRunScope(RUN+'-turn'+caseData.turn);
 let injected=false;
 const startPaid=paid,startTrace=traces.length;
 const replayFetch=async(url,opts={})=>{
  const u=new URL(String(url));
  if(u.origin==='https://api.openai.com'&&u.pathname==='/v1/responses'){
   const request=JSON.parse(opts.body||'{}');
   if(!injected&&!request.text?.format){
    injected=true;
    return new Response(JSON.stringify({
     id:event.payload.model_response_ids?.[0]||'archived-real-first:'+caseData.turn,
     output_text:original,status:'completed',model:'gpt-4.1-mini',
    }),{status:200});
   }
  }
  return gatedFetch(url,opts);
 };
 const res=await runLiveIntelligenceOrchestration({
  message:event.payload.message,observedAt:now(),
  model:'gpt-4.1-mini',apiKey,fetchImpl:replayFetch,
  systemContext:{world_id:scope.world,worldline_id:scope.worldline,
   continuity_root_id:scope.root,conversation_id:scope.conversationId,
   action_authorized:false,execution_authorized:false,
   domain:'warehouse_operations'},
  verifiedConversationTurns:history,
 });
 assert.equal(injected,true,'ARCHIVED_FIRST_ANSWER_NOT_USED');
 assert.equal(res.execution?.status,'NOT_EXECUTED');
 assert.equal(res.authority?.granted,false);
 assert.equal(res.reliability?.readback_verified,true);
 assert.equal(res.reliability?.canonical_epistemic_state?.status,
  'PERSISTED_AND_READBACK_VERIFIED');
 const released=String(res.intelligence?.answer||'');
 const reviewer=res.reliability.semantic_review||{};
 const detector=res.reliability.conversational_drift||{};
 const badAsStatus=/(?:status|order)\s+(?:as|is|marked|remains)\s+NOT DELIVERED/i.test(released);
 const unknownCorrected=/delivery\s+(?:status\s+)?(?:remains|is)\s+(?:unconfirmed|unknown|unverified|not confirmed)/i.test(released);
 const out={
  case:caseData.tag,source_turn:caseData.turn,
  source_run:ARCHIVE,source_model_response_id:event.payload.model_response_ids?.[0]||null,
  first_answer_is_verbatim_archived_genuine_model_output:true,
  first_answer_not_newly_generated:true,
  original_user_message:event.payload.message,prior_saved_turns:history.length,
  original_model_answer:original,reality_final_answer:released,
  changed:original!==released,
  actual_paid_model_calls:paid-startPaid,real_provider_responses:traces.slice(startTrace),
  semantic_review_issues:reviewer.issues||[],
  reviewer_status:reviewer.status||null,
  provenance_coverage:reviewer.provenance_review_status||null,
  expected_provenance_checks:reviewer.provenance_claims_expected||0,
  completed_provenance_checks:reviewer.provenance_claims_assessed||0,
  conversational_findings:detector.findings||[],
  intervention:res.intelligence?.reliability_intervention||null,
  repair_status:res.reliability.semantic_repair?.status||null,
  still_improper_status_not_delivered:badAsStatus,
  corrected_to_unknown_candidate:!badAsStatus&&unknownCorrected,
  good_answer_unchanged:original===released,
  independently_adjudicated_correctness:false,
  external_actions:0,
  canonical_frame_receipt:res.reliability.canonical_epistemic_state.source_receipt_id,
  reliability_receipt:res.reliability.receipt_id||null,
 };
 const audit=await runtime(outScope,'Persist same-run original and final model outcomes.');
 const saved=await audit.appendStage({
  stage:'VERIFICATION',entityId:'real-answer-replay:'+caseData.turn,
  epistemicStatus:'UNVERIFIED',observedAt:now(),
  payload:{benchmark_kind:'GENUINE_LLM_RESPONSE_LIVE_REVIEW_AND_CORRECTION',
   run_id:RUN,...out},
  provenance:{source:'verbatim_archived_model_answer_and_fresh_real_provider_reviewer'},
 });
 assert.ok((await audit.readback()).some(x=>x.event_id===saved.event_id&&
  x.payload?.original_model_answer===original&&
  x.payload?.reality_final_answer===released),'AUDIT_READBACK_FAILED');
 out.receipt_id=saved.event_id;
 results.push(out);
 console.log('REAL_CONVERSATION_RECHECK '+JSON.stringify({
  case:out.case,live_calls:out.actual_paid_model_calls,
  issues:out.semantic_review_issues.map(x=>x.kind),
  conversational_findings:out.conversational_findings.map(x=>x.classification),
  intervention:out.intervention,repair:out.repair_status,
  corrected_to_unknown_candidate:out.corrected_to_unknown_candidate,
  good_answer_unchanged:out.good_answer_unchanged,
  review_status:out.reviewer_status,receipt:saved.event_id,
 }));
}
const summary={
 run_id:RUN,archived_actual_model_first_answers:results.length,
 original_generation_reused_from_saved_provider_records:true,
 real_model_review_and_repair_calls:paid,input_tokens:input,output_tokens:output,
 initial_wrong_answer_caught_as_conversation_issue:results[0].conversational_findings.some(x=>
  x.classification==='CONVERSATION_FACT_CONTRADICTION_CANDIDATE'),
 initial_wrong_answer_effectively_corrected_candidate:results[0].corrected_to_unknown_candidate,
 previously_correct_answer_preserved:results[1].good_answer_unchanged,
 correct_control_semantic_issue_count:results[1].semantic_review_issues.length,
 external_actions:0,independent_semantic_accuracy_score:null,
 limitation:'Real previously generated first answers were replayed, not freshly regenerated this time.',
};
const esc=x=>String(x).replace(/[&<>"']/g,a=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[a]));
const html=['<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1">',
 '<title>Reality genuine model conversation repair</title><style>body{font:15px system-ui;background:#111827;color:#e5e7eb;max-width:960px;margin:0 auto;padding:22px}pre{white-space:pre-wrap;overflow-wrap:anywhere}details{padding:14px;border:1px solid #475569;margin:10px 0;border-radius:8px}summary{cursor:pointer}</style>',
 '<h1>Reality: real model mistake, actual live reviewer and repair</h1>',
 '<p>Original answers were preserved from a prior real GPT-4.1-mini run. Reviewer and repair calls in this run are live, with isolated PostgreSQL readback. No real customer data. Not an independent truth grade.</p>',
 '<pre>',esc(JSON.stringify(summary,null,2)),'</pre>',
 ...results.map(x=>'<details><summary>'+esc(x.case)+' · '+esc(x.intervention||'unchanged')+
  '</summary><pre>'+esc(JSON.stringify(x,null,2))+'</pre></details>'),
 '</html>'].join('');
await mkdir('public',{recursive:true});
await writeFile('public/index.html',html,'utf8');
console.log('REAL_CONVERSATION_REPLAY_SUMMARY '+JSON.stringify(summary));
