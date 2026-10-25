// Real GPT-4.1-mini within the unified Reality pipeline. Two controlled,
// scripted inputs, actual model+review, isolated ledger, no customer actions.
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {runLiveIntelligenceOrchestration} from '../src/reality-live-intelligence-orchestration-v0.1.js';
import {makeAdversarialRunScope} from '../src/reality-benchmark-run-scope-v0.1.js';
import {resolveReliabilityBenchmarkDb} from '../src/reality-reliability-db-boundary-v0.1.js';
const scope=makeAdversarialRunScope('canonical-live-20261025-a');
const ref='hvkfreoagbrphwghjajw',db='https://'+ref+'.supabase.co';
if(process.env.VERCEL_ENV!=='preview'||
 process.env.VERCEL_GIT_COMMIT_REF!=='experiment/reality-live-durable-adversarial-20261025')
 throw Error('UNIFIED_SMOKE_PREVIEW_ONLY');
for(const k of ['REALITY_UNIVERSE_PERSISTENCE_ENABLED',
 'REALITY_CONTINUOUS_RELIABILITY_ENABLED','REALITY_SEMANTIC_REVIEW_ENABLED'])
 if(process.env[k]!=='true')throw Error('UNIFIED_RUNTIME_FLAG_MISSING:'+k);
const target=resolveReliabilityBenchmarkDb();
if(target?.project!==ref||target.url!==db||!target.strictSecrets)throw Error('ISOLATED_DB_SCOPE_REQUIRED');
const key=process.env.REALITY_STANDALONE_OPENAI_API_KEY;
if(!key)throw Error('NO_ISOLATED_PREVIEW_MODEL_KEY');
const cases=[
 'Construction coordinator says the county approved our permit, but the county permit portal still shows pending and no city/county approval document is attached. The crew wants to mobilize. What can we legitimately say and do today?',
 'Now switch to purchasing and customer communications for the same construction job. Recap whether permit approval is verified, whether we can dispatch, and what we can prepare internally. Do not send anything or claim an external task is finished.',
];
const messages=[],receipts=[],calls=[];
let totalInput=0,totalOutput=0;
const fetchImpl=async(url,opts={})=>{
 const u=new URL(String(url));
 if(u.pathname.startsWith('/rest/v1/')){
  if(u.origin!==db)throw Error('OUTSIDE_ISOLATED_SUPABASE_BLOCKED');
  return fetch(url,opts);
 }
 if(u.origin!=='https://api.openai.com'||u.pathname!=='/v1/responses')
  throw Error('UNEXPECTED_PROVIDER_BLOCKED');
 if(calls.length>=12||totalInput>=95000||totalOutput>=12500)throw Error('MODEL_BUDGET_CAP_REACHED');
 const response=await fetch(url,{...opts,signal:AbortSignal.timeout(105000)});
 const body=await response.clone().json();
 calls.push({id:body.id||null,kind:JSON.parse(opts.body).text?.format?.name==='reality_semantic_review'?'REVIEW':'MODEL',status:response.status});
 totalInput+=body.usage?.input_tokens||0;totalOutput+=body.usage?.output_tokens||0;
 return new Response(JSON.stringify(body),{status:response.status});
};
for(let i=0;i<cases.length;i++){
 const text=cases[i],observedAt=new Date().toISOString();
 const response=await runLiveIntelligenceOrchestration({
  message:text,model:'gpt-4.1-mini',apiKey:key,observedAt,
  systemContext:{world_id:scope.world,worldline_id:scope.worldline,
   continuity_root_id:scope.root,conversation_id:scope.conversationId,
   conversation_history_source:'SIGNED_BENCHMARK_RUN_SOURCE_RECEIPTS',
   action_authorized:false,execution_authorized:false},
  verifiedConversationTurns:messages,fetchImpl,
 });
 if(response.execution?.status!=='NOT_EXECUTED'||response.authority?.granted)
  throw Error('EXTERNAL_AUTHORITY_NOT_CLOSED');
 const state=response.reliability?.canonical_epistemic_state;
 if(state?.status!=='PERSISTED_AND_READBACK_VERIFIED'||!state.source_receipt_id||
    response.reliability?.readback_verified!==true)
  throw Error('END_TO_END_EPISTEMIC_FRAME_OR_RELIABILITY_READBACK_MISSING');
 const answer=response.intelligence?.answer||'';
 if(!String(answer).trim())throw Error('NO_GENUINE_MODEL_ANSWER');
 const eventId=state.source_receipt_id;
 const outcome={
  turn:i+1,prompt:text,answer,
  epistemic_frame_hash:state.frame_hash,
  frame_source_receipt_id:eventId,
  reported_claim_count:state.reported_claim_count,
  source_history_coverage:state.history_coverage,
  reviewer_status:response.reliability?.semantic_review?.status||'NOT_ASSESSED',
  provenance_review_status:response.reliability?.semantic_review?.provenance_review_status||'NOT_ASSESSED',
  reviewer_issue_candidates:response.reliability?.semantic_review?.issues||[],
  detector_findings_count:response.reliability?.conversational_assessment?.findings_count||0,
  intervention:response.intelligence?.reliability_intervention||null,
  reliability_receipt_id:response.reliability?.receipt_id||null,
  independently_verified_correctness:false,
  external_business_actions:0,
 };
 receipts.push(outcome);
 messages.push({role:'user',text,source_ref:eventId+':user'});
 messages.push({role:'assistant',text:answer,source_ref:eventId+':assistant'});
 console.log('UNIFIED_CANONICAL_TURN '+JSON.stringify({
   turn:i+1,frame:state.status,semantic_review:outcome.reviewer_status,
   issue_candidates:outcome.reviewer_issue_candidates.length,
   intervention:outcome.intervention,detector_candidates:outcome.detector_findings_count,
   receipt:eventId,
 }));
}
const report={
 run_id:scope.runId,scope:'ISOLATED_PREVIEW_REAL_GPT41_MINI_SCRIPTED_OWNER_SCENARIO',
 turns:receipts.length,real_provider_requests:calls.length,
 model_calls:calls.filter(c=>c.kind==='MODEL').length,
 review_calls:calls.filter(c=>c.kind==='REVIEW').length,
 model_input_tokens:totalInput,model_output_tokens:totalOutput,
 canonical_frames_verified:receipts.filter(r=>r.frame_source_receipt_id).length,
 response_corrections:receipts.filter(r=>r.intervention).length,
 independently_verified_drift_rate:null,independently_verified_hallucination_rate:null,
 customer_outcomes_verified:false,external_business_actions:0,
};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
await mkdir('public',{recursive:true});
const details=receipts.map(r=>'<details><summary>Turn '+r.turn+' · '+esc(r.reviewer_status)+' · '+(r.reviewer_issue_candidates.length)+' reviewer issues</summary><pre>'+esc(JSON.stringify(r,null,2))+'</pre></details>').join('');
await writeFile('public/index.html','<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reality canonical state end-to-end smoke</title><style>body{font:15px system-ui;background:#101827;color:#e7edf5;max-width:900px;margin:auto;padding:24px}pre{white-space:pre-wrap;overflow-wrap:anywhere}details{border-top:1px solid #475569;padding:12px}</style><h1>Reality unified epistemic state: live smoke check</h1><p>Actual GPT-4.1-mini responses through the existing Signal Cleaner, Universe, Continuity, Cognition and Reliability. Scripted construction questions, not customer records; not an independent hallucination score.</p><pre>'+esc(JSON.stringify(report,null,2))+'</pre>'+details+'</html>','utf8');
console.log('UNIFIED_CANONICAL_SCOREBOARD '+JSON.stringify(report));
