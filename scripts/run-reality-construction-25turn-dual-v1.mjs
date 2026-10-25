// 25-turn A/B Reality adversarial stress test: 50 real model calls maximum.
// A is ordinary underlying model, no Reality prompting. B is same model
// through the existing Reality gateway with selective v0.2 context.
// Both lanes receive identical frozen user events, retain their OWN replies,
// and never execute external customer actions. Post-hoc detectors run on BOTH.
// Original text and source receipts saved on every successful response.
import {mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {TURNS,EVENTS,HASH,stamp,VERSION} from '../benchmarks/reality-construction-25turn-dual-v1.mjs';
import {buildInvariantFrame,assessInvariantTransition}
 from '../src/reality-alignment-invariant-contract-v0.1.js';
import {buildSelectiveCognitiveAlignmentV02,assessCurrentTurnFocusV02}
 from '../src/reality-selective-cognitive-alignment-v0.2.js';
import {compareAfterCognition}
 from '../src/reality-pre-cognition-alignment-probe-v0.1.js';
import {buildGovernedChatSignal}
 from '../src/reality-governed-fragmented-signal-cleaner-v0.1.js';
import {invokeRealityModel}
 from '../src/reality-model-gateway-v0.1.js';

const KEY=process.env.OPENAI_API_KEY;
if(!KEY)throw Error('NO_MODEL_SECRET_NO_25TURN_RUN');
const MODEL=process.env.REALITY_PROBE_MODEL||'gpt-4.1-mini';
const ROOT='fictional:construction:25turn-comparison-v1';
const MODES=['UNDERLYING_MODEL','REALITY_SELECTIVE_V02'];
const MAX_CALLS=50,MAX_INPUT_TOKENS=700000,MAX_OUTPUT=340;
const histories=Object.fromEntries(MODES.map(m=>[m,[]]));
const sha=x=>'sha256:'+createHash('sha256').update(JSON.stringify(x)).digest('hex');
const totals={calls:0,input_tokens:0,output_tokens:0};
const results=[];
const resource='benchmark-results/reality-construction-25turn-dual-v1.json';
function inputMessages(history,user){
 return [{role:'system',content:'You are a helpful assistant.'},
 ...history.map(x=>({role:x.role,content:x.text})),
 {role:'user',content:user}];
}
function getAnswer(x){
 if(typeof x?.output_text==='string')return x.output_text;
 return (x?.output||[]).flatMap(y=>y?.content||[])
 .filter(y=>y.type==='output_text').map(y=>y.text||'').join('\n');
}
function record(status,error=null){
 mkdirSync('benchmark-results',{recursive:true});
 const report={
  benchmark:'REALITY_CONSTRUCTION_25TURN_DUAL_RAW_V1',casepack_version:VERSION,
  casepack_hash:HASH,status,model:MODEL,
  lanes:MODES,turns_per_lane:25,max_paid_provider_calls:MAX_CALLS,
  paid_provider_calls_made:totals.calls,
  provider_input_tokens:totals.input_tokens,
  provider_output_tokens:totals.output_tokens,
  benchmark_is_fictional:true,
  both_lanes_identical_user_events:true,
  each_lane_independent_assistant_history:true,
  underlying_mode_system_prompt:'You are a helpful assistant.',
  reality_uses_existing_gateway_and_selective_v02:true,
  model_gateway_system_prompts_not_identical:true,
  reality_has_a_separately_formatted_source_state:true,
  original_responses_preserved:true,automatic_regeneration:false,
  second_judge_model_calls:0,executed_external_actions:0,
  no_ground_truth_drift_percentage_until_review:true,
  model_drift_rate:null,reality_drift_rate:null,
  false_negative_rate:null,verified_prevented_incidents:null,
  benchmark_scores_not_independently_blind_graded:true,
  possible_cross_entity_action_gate_gap_at_turn23:true,
  error,rows:results,
 };
 writeFileSync(resource,JSON.stringify(report,null,2));
 return report;
}

async function callProvider(messages){
 if(totals.calls>=MAX_CALLS)throw Error('MAX_50_PROVIDER_CALLS');
 totals.calls++;
 const request={model:MODEL,store:false,max_output_tokens:MAX_OUTPUT,input:messages};
 const start=Date.now();
 const response=await fetch('https://api.openai.com/v1/responses',{
  method:'POST',headers:{'content-type':'application/json',Authorization:'Bearer '+KEY},
  body:JSON.stringify(request),signal:AbortSignal.timeout(70000),
 });
 const data=await response.json().catch(()=>({}));
 if(!response.ok||data.error)
  throw Error('MODEL_HTTP_'+response.status+':'+String(data.error?.code||'unknown'));
 const answer=getAnswer(data);
 if(!answer||!data.id)throw Error('EMPTY_PROVIDER_RESPONSE');
 const usage={input_tokens:data.usage?.input_tokens||0,output_tokens:data.usage?.output_tokens||0};
 totals.input_tokens+=usage.input_tokens;totals.output_tokens+=usage.output_tokens;
 if(totals.input_tokens>MAX_INPUT_TOKENS)throw Error('INPUT_TOKEN_CAP_REACHED');
 return {answer,response_id:data.id,usage,latency_ms:Date.now()-start};
}
async function callReality(message,history,sourceFrame,alignment){
 const signal=buildGovernedChatSignal({message,observedAt:sourceFrame.system_as_of});
 const context={
  world_id:sourceFrame.world_id,continuity_root_id:ROOT,
  fictional_fixture:true,source_facts_not_real_customer_records:true,
  history:history.map(x=>({role:x.role,content:x.text,source_ref:x.source_ref})),
  cognitive_alignment_probe:alignment.capsule,
  canonical_source_frame_hash:sourceFrame.frame_hash,
  external_actions_authorized:false,
 };
 let metrics={input_tokens:0,output_tokens:0},latency_ms=0,called=false;
 const transport=async(url,options)=>{
  if(url!=='https://api.openai.com/v1/responses'||called)throw Error('MODEL_GATEWAY_UNEXPECTED_CALL');
  called=true;
  if(totals.calls>=MAX_CALLS)throw Error('MAX_50_PROVIDER_CALLS');
  totals.calls++;
  const requested=JSON.parse(options.body);
  const start=Date.now();
  const response=await fetch(url,{
   ...options,body:JSON.stringify({...requested,store:false,max_output_tokens:MAX_OUTPUT}),
   signal:AbortSignal.timeout(70000),
  });
  const body=await response.clone().json().catch(()=>({}));
  metrics={input_tokens:body.usage?.input_tokens||0,output_tokens:body.usage?.output_tokens||0};
  totals.input_tokens+=metrics.input_tokens;totals.output_tokens+=metrics.output_tokens;
  latency_ms=Date.now()-start;
  if(totals.input_tokens>MAX_INPUT_TOKENS)throw Error('INPUT_TOKEN_CAP_REACHED');
  return response;
 };
 const out=await invokeRealityModel({governedSignal:signal,systemContext:context,
  model:MODEL,apiKey:KEY,fetchImpl:transport});
 return {answer:out.answer,response_id:out.response_id,usage:metrics,latency_ms};
}

const asJson=x=>JSON.parse(JSON.stringify(x));
try{
 for(const turn of TURNS){
  const frame=buildInvariantFrame({records:EVENTS,asOf:stamp(turn.turn),
   worldId:'fictional:construction',continuityRootId:ROOT,
   activeObjective:'Safely complete construction while preserving current user intent'});
  if(turn.turn===19 && frame.time_scoped_state.inspection_wr41.value!=='PASS')
    throw Error('LEAKED_LATE_INSPECTION_HOLD_TO_TURN_19');
  if(turn.turn===20 && frame.time_scoped_state.inspection_wr41.value!=='HOLD')
    throw Error('MISSING_RETROACTIVE_CITY_HOLD');
  for(const mode of MODES){
   const history=histories[mode];
   const capsule=buildSelectiveCognitiveAlignmentV02({
    currentUserMessage:turn.user,currentUserSourceRef:turn.source_ref,
    priorTurns:history,historySource:'AUTHENTICATED_CONVERSATION_MESSAGES',
    continuityRootId:ROOT,frame,
   });
   const hBefore=sha(history);
   const output=mode==='UNDERLYING_MODEL'?
    await callProvider(inputMessages(history,turn.user)):
    await callReality(turn.user,history,frame,capsule);
   const existing=compareAfterCognition({
    priorTurns:history,historySource:'AUTHENTICATED_CONVERSATION_MESSAGES',
    currentUserMessage:turn.user,modelAnswer:output.answer,
    continuityRootId:ROOT,currentUserSourceRef:turn.source_ref,
   });
   // Same post-answer relevance inspector for both model outputs; purely
   // diagnostics, never an authority or source-truth verdict.
   const focus=assessCurrentTurnFocusV02({capsule:capsule.capsule,modelAnswer:output.answer});
   const gate=Object.fromEntries(['SEND_ESTIMATE','ORDER_MATERIALS','DISPATCH_CREW']
    .map(action=>[action,assessInvariantTransition(frame,{
     action,worldId:frame.world_id,expectedFrameHash:frame.frame_hash,
    })]));
   const policyGap=turn.turn>=23&&
    frame.time_scoped_state.inspection_wr41.value==='HOLD'&&
    !frame.prohibited_transitions.includes('DISPATCH_CREW');
   const row={
    turn:turn.turn,mode,kind:turn.kind,material:turn.material,
    raw_current_user_message:turn.user,
    frozen_expected_behavior:turn.expected,frozen_expected_state:turn.oracle,
    model:MODEL,original_model_answer:output.answer,original_response_id:output.response_id,
    answer_digest:sha(output.answer),
    model_output_kept_in_future_history:true,
    existing_spine_candidates:existing.findings.map(x=>({
     classification:x.classification,source_receipt_refs:x.source_receipt_refs,
     observed_model_text:x.observed_model_text,adjudicated:false,
    })),
    v02_current_turn_candidates:focus.candidate_codes,
    v02_current_turn_review_status:focus.status,
    v02_observed_topic_ids:focus.observed_answer_topic_ids,
    v02_expected_topic_ids:focus.expected_topic_ids,
    deterministic_gate_sandbox:gate,
    cross_entity_gate_gap_candidate:policyGap,
    source_frame_hash:frame.frame_hash,
    preflight_snapshot:{inspection_wr41:frame.time_scoped_state.inspection_wr41,
     homeowner_scope_approval:frame.time_scoped_state.homeowner_scope_approval,
     dispatch_approval:frame.time_scoped_state.dispatch_approval,
     cabinet_color:frame.time_scoped_state.cabinet_color},
    alignment_capsule_hash:mode==='REALITY_SELECTIVE_V02'?capsule.capsule.capsule_hash:null,
    alignment_selected_fact_count:mode==='REALITY_SELECTIVE_V02'?capsule.selected_source_fact_count:0,
    input_history_digest:hBefore,prior_assistant_turns:history.filter(x=>x.role==='assistant').length,
    provider_usage:output.usage,provider_latency_ms:output.latency_ms,
    original_answer_independently_adjudicated:false,
    independently_verified_drift_percent:null,
    external_actions_executed:0,
   };
   results.push(row);
   history.push({role:'user',source_ref:turn.source_ref,text:turn.user},{
    role:'assistant',source_ref:'original:'+mode+':turn:'+turn.turn,text:output.answer});
   record('PARTIAL_UNTIL_50_CALLS_COMPLETE');
   console.log('DUAL_25_TURN '+JSON.stringify({
    turn:turn.turn,mode,model_id:output.response_id,
    spine:row.existing_spine_candidates.map(x=>x.classification),
    current_focus:focus.candidate_codes,
    city_state:frame.time_scoped_state.inspection_wr41.value,
    cross_entity_gap:policyGap,
    usage:output.usage,latency_ms:output.latency_ms,
    paid_calls:totals.calls,
   }));
  }
 }
 const final=record('COMPLETE_ALL_50_ORIGINAL_RESPONSES_UNADJUDICATED');
 console.log('DUAL_25_TOTAL '+JSON.stringify({
  status:final.status,paid_calls:totals.calls,
  provider_input_tokens:totals.input_tokens,
  provider_output_tokens:totals.output_tokens,
  source_hash:HASH,
  artifact:resource,
  independently_verified_prevented_drift:'NOT_MEASURED',
 }));
}catch(err){
 record('PARTIAL_PROVIDER_OR_RUN_FAILURE',String(err.message||err).slice(0,250));
 throw err;
}
