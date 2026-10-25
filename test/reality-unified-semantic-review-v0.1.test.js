import test from 'node:test';
import assert from 'node:assert/strict';
import {buildGovernedChatSignal} from '../src/reality-governed-fragmented-signal-cleaner-v0.1.js';
import {startContinuityRuntime} from '../src/reality-continuity-spine-runtime-v0.1.js';
import {recordSourceAttestedEvidence} from '../src/reality-reliability-evidence-v0.1.js';
import {runContinuousReliabilityCycle} from '../src/reality-continuous-reliability-v0.1.js';
import {runLiveIntelligenceOrchestration} from '../src/reality-live-intelligence-orchestration-v0.1.js';

const world='construction:real-model-regression',root='continuity:real-model-regression';
const stamp='2026-10-24T15:00:00.000Z';
const vars=['VERCEL_ENV','REALITY_CONTINUOUS_RELIABILITY_ENABLED',
 'REALITY_UNIVERSE_PERSISTENCE_ENABLED','REALITY_RELIABILITY_EXTRACTION_ENABLED',
 'REALITY_DETECTOR_SHADOW_ENABLED','REALITY_DETECTOR_REPAIR_ENABLED',
 'SUPABASE_URL','SUPABASE_SECRET_KEY','REALITY_RELIABILITY_BENCHMARK_PROJECT_REF',
 'REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF',
 'REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL'];
async function environment(fn){
 const p=Object.fromEntries(vars.map(x=>[x,process.env[x]]));
 Object.assign(process.env,{
  VERCEL_ENV:'preview',REALITY_CONTINUOUS_RELIABILITY_ENABLED:'true',
  REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
  REALITY_RELIABILITY_EXTRACTION_ENABLED:'true',
  REALITY_DETECTOR_SHADOW_ENABLED:'true',REALITY_DETECTOR_REPAIR_ENABLED:'true',
  SUPABASE_URL:'https://example.supabase.co',SUPABASE_SECRET_KEY:'test-only',
  REALITY_RELIABILITY_BENCHMARK_PROJECT_REF:'hvkfreoagbrphwghjajw',
  REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF:'hvkfreoagbrphwghjajw',
  REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL:'https://hvkfreoagbrphwghjajw.supabase.co',
 });
 try{await fn();}finally{
  for(const [k,v] of Object.entries(p)){
   if(v===undefined)delete process.env[k];else process.env[k]=v;
  }
 }
}
function fixture(){
 const events=[];
 return {events,fetch:async(url,options={})=>{
  const u=new URL(url);
  if(u.pathname.includes('reality_universe_entries'))return new Response('[]',{status:200});
  if(u.pathname.startsWith('/rest/v1/')){
   if(options.method==='POST'){
    const e=JSON.parse(options.body);events.push(e);
    return new Response(JSON.stringify([e]),{status:201});
   }
   let rows=events.slice();
   for(const [q,key] of [['event_id','event_id'],
    ['continuity_root_id','continuity_root_id'],['worldline_id','worldline_id']]){
    const v=u.searchParams.get(q)?.replace(/^eq\./,'');
    if(v)rows=rows.filter(x=>x[key]===v);
   }
   if(u.searchParams.get('limit')==='1')rows=rows.slice(-1);
   else rows.reverse();
   return new Response(JSON.stringify(rows),{status:200});
  }
  throw Error('Unexpected '+url);
 }};
}
async function bootstrap(f,{
 userMessage='Record source',
 worldId=world,rootId=root,
 facts=[{key:'cabinet_delivery_date',value:'2026-10-27'}],
}={}){
 const sig=buildGovernedChatSignal({message:userMessage,observedAt:stamp});
 const live=await startContinuityRuntime({
  continuityRootSource:rootId,worldlineSource:'world:construction',
  subjectId:'fictional:contractor',signal:sig,observedAt:stamp,
  fetchImpl:f.fetch,
 });
 const source=await recordSourceAttestedEvidence({
  continuityRuntime:live,worldId,sourceKind:'CONNECTED_PROVIDER_READBACK',
  sourceRef:'fixture:verified',sourceDigest:'fixture:sha',
  facts,observedAt:stamp,
 });
 return {live,sig,source};
}


const priorSemantic=process.env.REALITY_SEMANTIC_REVIEW_ENABLED;
function previewSemantic(){
 process.env.REALITY_SEMANTIC_REVIEW_ENABLED='true';
}
function restoreSemantic(){
 if(priorSemantic===undefined)delete process.env.REALITY_SEMANTIC_REVIEW_ENABLED;
 else process.env.REALITY_SEMANTIC_REVIEW_ENABLED=priorSemantic;
}
function semanticCallStub(f,{draft,first,repair,second,completeProvenance=false}={}){
 const calls=[];
 const fetchImpl=async(url,options={})=>{
  if(!String(url).includes('api.openai.com/v1/responses'))return f.fetch(url,options);
  const req=JSON.parse(options.body);
  if(req.text?.format?.name==='reliability_assertions')
    throw Error('OLD_EXTRACTOR_SHOULD_NOT_RUN_WHEN_SEMANTIC_ENABLED');
  const isReview=req.text?.format?.name==='reality_semantic_review';
  const mode=isReview?'REVIEW':'MODEL';
  calls.push({mode,request:req});
  const reviewPass=calls.filter(x=>x.mode==='REVIEW').length;
  const selected=isReview?(reviewPass===1?first:second):null;
  const comparison=isReview?JSON.parse(req.input[1].content[0].text):null;
  const covered=completeProvenance?{
    ...selected,provenance_checks:(comparison?.conversation_evidence?.candidates||[]).map(c=>({
      source_ref:c.source_ref,clause_id:c.clause_id,
      relation:reviewPass===1?'ASSERTED_AS_FACT':'REPORTED_WITH_UNCERTAINTY',
      answer_quote:reviewPass===1?'NOT DELIVERED':'delivery remains unconfirmed',
      verified_source_ref:'',
      reason:'Compare the exact prior reported-delivery status with this answer.',
    })),
  }:selected;
  const text=isReview?JSON.stringify(covered):
    calls.filter(x=>x.mode==='MODEL').length===1?draft:repair;
  return new Response(JSON.stringify({id:'fake-'+calls.length,
   status:'completed',output_text:text}),{status:200});
 };
 return {fetchImpl,calls};
}
function review({addressed=true,issues=[],claims=[],actions=[]}={}){
 return {addresses_current_request:addressed,issues,claims,actions};
}
function claim(key,value,quote,relevant=true){
 return {key,asserted_value:value,quote,relevant_to_current_request:relevant};
}
function context(){
 return {continuity_root_id:root,worldline_id:'world:construction',
  world_id:world,conversation_id:'fictional:contractor'};
}
test('semantics: preserve a good on-topic answer with sourced factual proof and no retry',async()=>{
 await environment(async()=>{
  previewSemantic();try{
   const f=fixture();await bootstrap(f,{
    facts:[{key:'cabinet_delivery_date',value:'2026-10-27'}],
   });
   const original='The cabinet delivery is 2026-10-27.';
   const stub=semanticCallStub(f,{draft:original,
    first:review({claims:[claim('cabinet_delivery_date','2026-10-27','2026-10-27')]}),
   });
   const got=await runLiveIntelligenceOrchestration({
    message:'When are the cabinets being delivered?',
    observedAt:'2026-10-24T15:01:00.000Z',
    model:'test-model',apiKey:'test-only',systemContext:context(),
    verifiedConversationTurns:[],fetchImpl:stub.fetchImpl,
   });
   assert.equal(got.intelligence.answer,original);
   assert.deepEqual(stub.calls.map(x=>x.mode),['MODEL','REVIEW']);
   assert.equal(got.reliability.semantic_review.addresses_current_request,true);
   assert.equal(got.reliability.model_output_quarantined,false);
   assert.equal(got.reliability.readback_verified,true);
   assert.equal(got.reliability.semantic_repair,undefined);
  }finally{restoreSemantic()}
 });
});
test('semantics: recognize previous topic by meaning; regenerate; re-review; preserve correction receipt',async()=>{
 await environment(async()=>{
  previewSemantic();try{
   const f=fixture();await bootstrap(f,{
    facts:[{key:'inspection_wr41',value:'HOLD'},
      {key:'homeowner_scope_approval',value:'WITHDRAWN'}],
   });
   const old='The city inspection remains HOLD, so no crew may mobilize.';
   const corrected='No. Homeowner scope approval was WITHDRAWN, so you cannot email the estimate.';
   const stub=semanticCallStub(f,{
    draft:old,repair:corrected,
    first:review({addressed:false,
      issues:[{kind:'WRONG_TASK',quote:'no crew may mobilize',
       reason:'This answers dispatch, not the current estimate email question.'}],
      claims:[claim('inspection_wr41','HOLD','HOLD',false)]}),
    second:review({claims:[claim('homeowner_scope_approval','WITHDRAWN','WITHDRAWN')]}),
   });
   const got=await runLiveIntelligenceOrchestration({
    message:'Homeowner withdrew approval. Can we email the estimate now?',
    observedAt:'2026-10-24T15:01:00.000Z',
    model:'test-model',apiKey:'test-only',systemContext:context(),
    verifiedConversationTurns:[],fetchImpl:stub.fetchImpl,
   });
   assert.equal(got.intelligence.answer,corrected);
   assert.equal(got.intelligence.reliability_intervention,'SEMANTIC_REVIEW_CORRECTED');
   assert.deepEqual(stub.calls.map(x=>x.mode),['MODEL','REVIEW','MODEL','REVIEW']);
   assert.equal(got.reliability.semantic_repair.status,
    'CORRECTION_CANDIDATE_CLEARED_NOT_INDEPENDENTLY_VERIFIED');
   const event=f.events.find(e=>e.event_id===got.reliability.semantic_repair.receipt_id);
   assert.equal(event.payload.event_type,'MODEL_SEMANTIC_REVIEW_AND_REPAIR');
   assert.equal(event.payload.post_repair_source_violation_codes.length,0);
   assert.equal(event.payload.external_action_authorized,false);
   assert.equal(got.execution.status,'NOT_EXECUTED');
   assert.equal(got.authority.granted,false);
  }finally{restoreSemantic()}
 });
});
test('semantics: source contradiction is corrected and compared again against Continuity',async()=>{
 await environment(async()=>{
  previewSemantic();try{
   const f=fixture();await bootstrap(f,{
    facts:[{key:'cabinet_delivery_date',value:'2026-10-27'}],
   });
   const stub=semanticCallStub(f,{
    draft:'Cabinet delivery is 2026-10-24.',
    repair:'Cabinet delivery is 2026-10-27.',
    first:review({issues:[{kind:'FACT_CONTRADICTION',
      quote:'2026-10-24',reason:'Contradicts the source record October 27.'}],
      claims:[claim('cabinet_delivery_date','2026-10-24','2026-10-24')]}),
    second:review({claims:[claim('cabinet_delivery_date','2026-10-27','2026-10-27')]}),
   });
   const got=await runLiveIntelligenceOrchestration({
    message:'When are the cabinets being delivered?',
    observedAt:'2026-10-24T15:01:00.000Z',
    model:'test-model',apiKey:'test-only',systemContext:context(),
    verifiedConversationTurns:[],fetchImpl:stub.fetchImpl,
   });
   assert.equal(got.intelligence.answer,'Cabinet delivery is 2026-10-27.');
   assert.equal(got.reliability.model_output_quarantined,true);
   assert.equal(got.reliability.source_conflict_resolved_before_release,true);
   assert.equal(got.reliability.semantic_repair.status,
    'CORRECTION_CANDIDATE_CLEARED_NOT_INDEPENDENTLY_VERIFIED');
   assert.deepEqual(stub.calls.map(x=>x.mode),['MODEL','REVIEW','MODEL','REVIEW']);
  }finally{restoreSemantic()}
 });
});
test('semantics: bad proposed correction stays uncommitted and wrong output is not called verified',async()=>{
 await environment(async()=>{
  previewSemantic();try{
   const f=fixture();await bootstrap(f);
   const stub=semanticCallStub(f,{
    draft:'The inspection HOLD is active. Wait for city release.',
    repair:'You can dispatch right now; the city approved it.',
    first:review({addressed:false,issues:[{kind:'WRONG_TASK',
     quote:'Wait for city release',reason:'Ignores user request for the cabinet delivery date.'}]}),
    second:review({addressed:false,issues:[{kind:'WRONG_TASK',
     quote:'You can dispatch',reason:'Still unrelated and unsupported.'}]}),
   });
   const got=await runLiveIntelligenceOrchestration({
    message:'When are the cabinets being delivered?',
    observedAt:'2026-10-24T15:01:00.000Z',
    model:'test-model',apiKey:'test-only',systemContext:context(),
    verifiedConversationTurns:[],fetchImpl:stub.fetchImpl,
   });
   assert.notEqual(got.intelligence.answer,stub.fetchImpl.repair);
   assert.equal(got.reliability.semantic_repair.status,'CORRECTION_NOT_VERIFIED');
   assert.equal(got.reliability.semantic_repair.independently_verified_correctness,false);
   assert.equal(got.reliability.readback_verified,true);
  }finally{restoreSemantic()}
 });
});
test('semantics: unanchored review cannot be counted as successful detection',async()=>{
 await environment(async()=>{
  previewSemantic();try{
   const f=fixture();await bootstrap(f);
   const good='Cabinet delivery is 2026-10-27.';
   const stub=semanticCallStub(f,{
    draft:good,
    first:review({addressed:false,issues:[{kind:'WRONG_TASK',
     quote:'made-up source phrase',reason:'invalid quote'}]}),
   });
   const got=await runLiveIntelligenceOrchestration({
    message:'When are the cabinets being delivered?',
    observedAt:'2026-10-24T15:01:00.000Z',
    model:'test-model',apiKey:'test-only',systemContext:context(),
    verifiedConversationTurns:[],fetchImpl:stub.fetchImpl,
   });
   assert.equal(got.intelligence.answer,good);
   assert.ok(got.reliability.extraction_status.startsWith('UNASSESSED:'));
   assert.equal(got.reliability.evaluation_status,'NOT_EVALUATED');
   assert.equal(got.reliability.semantic_repair,undefined);
  }finally{restoreSemantic()}
 });
});

test('partial quote-anchoring failure is reported and does not erase semantic coverage',async()=>{
 await environment(async()=>{
  previewSemantic();try{
   const f=fixture();await bootstrap(f);
   const answer='Cabinet delivery is 2026-10-27.';
   const stub=semanticCallStub(f,{
    draft:answer,first:review({claims:[
     claim('cabinet_delivery_date','2026-10-27','made-up quote'),
     claim('cabinet_delivery_date','2026-10-27','2026-10-27'),
    ]}),
   });
   const got=await runLiveIntelligenceOrchestration({
    message:'When are the cabinets being delivered?',
    observedAt:'2026-10-24T15:01:00.000Z',model:'test-model',
    apiKey:'test-only',systemContext:context(),verifiedConversationTurns:[],
    fetchImpl:stub.fetchImpl,
   });
   assert.equal(got.intelligence.answer,answer);
   assert.equal(got.reliability.semantic_review.status,'REVIEWED_PARTIAL_COVERAGE');
   assert.equal(got.reliability.semantic_review.unassessed_claims.length,1);
   assert.equal(got.reliability.model_output_quarantined,false);
   assert.deepEqual(stub.calls.map(x=>x.mode),['MODEL','REVIEW']);
  }finally{restoreSemantic()}
 });
});
test('real-business scope: an unsupported customer-live assertion is corrected to uncertainty',async()=>{
 await environment(async()=>{
  previewSemantic();try{
   const f=fixture();await bootstrap(f,{
    facts:[{key:'pr132_is_merged',value:'NO'}],
   });
   const original='This code is now live for customers.';
   const corrected='GitHub shows PR #132 is not merged. Those records alone cannot establish whether a separate deployment exists. Customer rollout is unverified.';
   const stub=semanticCallStub(f,{
    draft:original,repair:corrected,
    first:review({issues:[{kind:'UNSUPPORTED_FACT',
      quote:'live for customers',
      reason:'A PR state alone cannot confirm customer deployment.'}]}),
    second:review({}),
   });
   const got=await runLiveIntelligenceOrchestration({
    message:'Is our PR #132 code already deployed to customers?',
    observedAt:'2026-10-24T15:01:00.000Z',model:'test-model',
    apiKey:'test-only',systemContext:context(),verifiedConversationTurns:[],
    fetchImpl:stub.fetchImpl,
   });
   assert.equal(got.intelligence.answer,corrected);
   assert.equal(got.intelligence.reliability_intervention,'SEMANTIC_REVIEW_CORRECTED');
   assert.equal(got.reliability.semantic_repair.status,
    'CORRECTION_CANDIDATE_CLEARED_NOT_INDEPENDENTLY_VERIFIED');
   assert.deepEqual(stub.calls.map(x=>x.mode),['MODEL','REVIEW','MODEL','REVIEW']);
   assert.equal(got.execution.status,'NOT_EXECUTED');
  }finally{restoreSemantic()}
 });
});

test('a clean semantic opinion with zero source-compared claims cannot masquerade as verified truth',async()=>{
 await environment(async()=>{
  previewSemantic();try{
   const f=fixture();await bootstrap(f);
   const stub=semanticCallStub(f,{
    draft:'GitHub records do not establish whether the application was deployed.',
    first:review({}),
   });
   const got=await runLiveIntelligenceOrchestration({
    message:'Is this application deployed?',
    observedAt:'2026-10-24T15:01:00.000Z',model:'test-model',
    apiKey:'test-only',systemContext:context(),verifiedConversationTurns:[],
    fetchImpl:stub.fetchImpl,
   });
   assert.equal(got.reliability.evaluation_status,
    'SEMANTIC_REVIEW_WITHOUT_SOURCE_COMPARABLE_ASSERTIONS');
   assert.equal(got.reliability.readback_verified,true);
   assert.equal(got.reliability.semantic_review.issues.length,0);
   assert.equal(got.reliability.semantic_review.independent_semantic_adjudication,false);
  }finally{restoreSemantic()}
 });
});

test('captured real-business negation must NOT be quarantined when reviewer guesses merged YES',async()=>{
 await environment(async()=>{
  previewSemantic();try{
   const f=fixture();await bootstrap(f,{
    facts:[{key:'pr132_is_merged',value:'NO'}],
   });
   // Preserved from the REAL provider response; extraction below models the
   // witnessed false-positive from the stronger semantic reviewer.
   const original='GitHub records show that PR #132 is currently:\n- Open (not closed or merged)\n- A draft pull request\n- Not merged into any branch yet';
   const stub=semanticCallStub(f,{
    draft:original,
    first:review({claims:[
     claim('pr132_is_merged','YES','Not merged into any branch yet'),
    ]}),
   });
   const got=await runLiveIntelligenceOrchestration({
    message:'Has PR #132 reached the default branch?',
    observedAt:'2026-10-24T15:01:00.000Z',model:'test-model',
    apiKey:'test-only',systemContext:context(),verifiedConversationTurns:[],
    fetchImpl:stub.fetchImpl,
   });
   assert.equal(got.intelligence.answer,original);
   assert.equal(got.reliability.model_output_quarantined,false);
   assert.equal(got.reliability.semantic_review.unassessed_claims.length,1);
   assert.equal(got.reliability.semantic_review.unassessed_claims[0].reason,
    'ASSERTED_VALUE_NOT_EXPLICIT_IN_QUOTE');
   assert.deepEqual(stub.calls.map(x=>x.mode),['MODEL','REVIEW']);
  }finally{restoreSemantic()}
 });
});

test('real business CI success must not be replaced with generic uncertainty based on a reviewer-only false alarm',async()=>{
 await environment(async()=>{
  previewSemantic();try{
   const f=fixture();await bootstrap(f,{facts:[
     {key:'signal_v11_test_run_conclusion',value:'SUCCESS'},
   ]});
   const original='Yes, the v1.1 test run succeeded, but that alone does not establish customer accuracy.';
   const stub=semanticCallStub(f,{draft:original,
    repair:'A generic deployment claim without source evidence.',
    first:review({issues:[{kind:'UNSUPPORTED_FACT',
     quote:'test run succeeded',reason:'False alarm: source run is indeed SUCCESS'}]}),
    second:review({addressed:false,issues:[{kind:'WRONG_TASK',
     quote:'generic deployment',reason:'Does not answer CI status question'}]}),
   });
   const got=await runLiveIntelligenceOrchestration({
    message:'Did the test run succeed?',
    observedAt:'2026-10-24T15:01:00.000Z',
    model:'test-model',apiKey:'test-only',systemContext:context(),
    verifiedConversationTurns:[],fetchImpl:stub.fetchImpl,
   });
   assert.ok(got.intelligence.answer.startsWith(original));
   assert.match(got.intelligence.answer,/Reality evidence review/);
   assert.match(got.intelligence.answer,/test run succeeded/);
   assert.match(got.intelligence.answer,/not a verified correction/);
   assert.equal(got.intelligence.reliability_intervention,
     'UNRESOLVED_EVIDENCE_DISCLOSED_NOT_VERIFIED_CORRECTION');
   assert.equal(got.reliability.semantic_repair.released_evidence_notice,true);
   assert.equal(got.reliability.semantic_repair.status,'CORRECTION_NOT_VERIFIED');
   assert.equal(got.reliability.readback_verified,true);
   assert.equal(got.execution.status,'NOT_EXECUTED');
  }finally{restoreSemantic()}
 });
});

test('actual Reality CI evidence: unsupported external effectiveness claim is disclosed after failed correction',async()=>{
 await environment(async()=>{
  previewSemantic();try{
   const f=fixture();await bootstrap(f,{facts:[
     {key:'signal_v11_test_run_conclusion',value:'SUCCESS'},
   ]});
   const original='The CI test passed. This proves customer hallucinations are now eliminated.';
   const badRepair='The test passed and all customer hallucinations are gone.';
   const stub=semanticCallStub(f,{
    draft:original,repair:badRepair,
    first:review({issues:[{kind:'UNSUPPORTED_FACT',
      quote:'This proves customer hallucinations are now eliminated',
      reason:'CI status does not measure customer production hallucinations.'}]}),
    second:review({issues:[{kind:'UNSUPPORTED_FACT',
      quote:'all customer hallucinations are gone',
      reason:'No customer evidence supplied.'}]}),
   });
   const got=await runLiveIntelligenceOrchestration({
    message:'Did the test pass?',observedAt:'2026-10-24T15:01:00.000Z',
    model:'test-model',apiKey:'test-only',systemContext:context(),
    verifiedConversationTurns:[],fetchImpl:stub.fetchImpl,
   });
   assert.ok(got.intelligence.answer.startsWith(original));
   assert.match(got.intelligence.answer,/semantic reviewer raised an evidence concern/);
   assert.match(got.intelligence.answer,/Do not treat the quoted claim as a verified operational result/);
   assert.equal(got.reliability.semantic_repair.status,'CORRECTION_NOT_VERIFIED');
   assert.equal(got.reliability.semantic_repair.released_evidence_notice,true);
   const receipt=f.events.find(e=>e.event_id===got.reliability.semantic_repair.receipt_id);
   assert.equal(receipt.payload.released_unresolved_evidence_notice,true);
   assert.ok(receipt.payload.released_qualification_quotes.includes(
     'This proves customer hallucinations are now eliminated'));
   assert.equal(got.execution.status,'NOT_EXECUTED');
  }finally{restoreSemantic()}
 });
});

test('a false-positive reviewer warning about literally verified CI conclusion is source-adjudicated before any retry',async()=>{
 await environment(async()=>{
  previewSemantic();try{
   const f=fixture();await bootstrap(f,{facts:[
     {key:'latest_ci_conclusion',value:'SUCCESS'},
   ]});
   const good='The latest CI conclusion is SUCCESS.';
   const stub=semanticCallStub(f,{
    draft:good,
    first:review({issues:[{kind:'UNSUPPORTED_FACT',
     quote:'SUCCESS',reason:'Reviewer mistakenly thinks this value was unverified.'}],
     claims:[claim('latest_ci_conclusion','SUCCESS','SUCCESS')]}),
   });
   const got=await runLiveIntelligenceOrchestration({
    message:'What is the latest CI conclusion?',
    observedAt:'2026-10-24T15:01:00.000Z',
    model:'test-model',apiKey:'test-only',systemContext:context(),
    verifiedConversationTurns:[],fetchImpl:stub.fetchImpl,
   });
   assert.equal(got.intelligence.answer,good);
   assert.equal(got.reliability.source_review_adjudication.source_supported_count,1);
   assert.equal(got.reliability.source_review_adjudication.unresolved_count,0);
   assert.equal(got.reliability.semantic_repair,undefined);
   assert.deepEqual(stub.calls.map(x=>x.mode),['MODEL','REVIEW']);
   assert.equal(got.execution.status,'NOT_EXECUTED');
  }finally{restoreSemantic()}
 });
});


test('turn 4 active semantic path retains the internal draft and persists coverage gap',async()=>{
 await environment(async()=>{
  previewSemantic();try{
   const f=fixture();await bootstrap(f);
   const original='Internal release draft. No attempt to publish or externally announce this summary has been made.';
   const quote='No attempt to publish or externally announce this summary has been made.';
   const stub=semanticCallStub(f,{draft:original,first:review({actions:[{
    action_type:'publish',target:'release summary',status:'COMPLETED',quote,
   }]})});
   const got=await runLiveIntelligenceOrchestration({
    message:'Prepare an internal release summary without publishing it.',
    observedAt:'2026-10-24T15:01:00.000Z',model:'test-model',apiKey:'test-only',
    systemContext:context(),verifiedConversationTurns:[],fetchImpl:stub.fetchImpl,
   });
   assert.equal(got.intelligence.answer,original);
   assert.equal(got.reliability.model_output_quarantined,false);
   assert.deepEqual(stub.calls.map(x=>x.mode),['MODEL','REVIEW']);
   assert.equal(got.reliability.semantic_review.unassessed_claims[0].reason,
    'EXPLICIT_DENIAL_NOT_ACTION_COMPLETION');
   const receipt=f.events.find(e=>e.event_id===got.reliability.receipt_id);
   assert.equal(receipt.payload.conversational_drift.coverage.status,'INSUFFICIENT_ANCHOR_COVERAGE');
   assert.equal(got.reliability.readback_verified,true);
   assert.equal(got.execution.status,'NOT_EXECUTED');
  }finally{restoreSemantic()}
 });
});

test('Cleaner scope clauses reach both reviews and a forgotten-obligation finding triggers bounded repair',async()=>{
 await environment(async()=>{
  previewSemantic();try{
   const f=fixture();await bootstrap(f);
   const message="We are NOT cancelling the construction project; we're cancelling ONLY the draft announcement.";
   const original='The cancellation of the draft announcement is on hold.';
   const corrected='Your requested scope cancels only the draft announcement. Construction is not cancelled. No external change has been executed.';
   const stub=semanticCallStub(f,{draft:original,repair:corrected,
    first:review({addressed:true,issues:[{kind:'FORGOTTEN_OBLIGATION',quote:original,
     reason:'The requested cancellation is reversed into holding the cancellation.'}]}),second:review({})});
   const got=await runLiveIntelligenceOrchestration({message,
    observedAt:'2026-10-24T15:01:00.000Z',model:'test-model',apiKey:'test-only',
    systemContext:context(),verifiedConversationTurns:[],fetchImpl:stub.fetchImpl});
   assert.equal(got.intelligence.answer,corrected);
   assert.deepEqual(stub.calls.map(c=>c.mode),['MODEL','REVIEW','MODEL','REVIEW']);
   for(const call of stub.calls.filter(c=>c.mode==='REVIEW')){
    const input=JSON.parse(call.request.input[1].content[0].text);
    const typed=input.cleaner_conversation_context;
    assert.equal(typed.current.clauses.length,2);
    assert.match(typed.current.clauses[0].exact_source_text,/NOT cancelling/);
    assert.match(typed.current.clauses[1].exact_source_text,/ONLY the draft/);
    assert.equal(typed.execution_authorized,false);
   }
   const receipt=f.events.find(e=>e.event_id===got.reliability.receipt_id);
   assert.equal(receipt.payload.conversational_drift.coverage.interpretation_source,'SIGNAL_CLEANER_TYPED_INTAKE');
   assert.equal(receipt.payload.conversational_drift.coverage.typed_clause_count,2);
   assert.equal(got.reliability.semantic_repair.independently_verified_correctness,false);
   assert.equal(got.reliability.readback_verified,true);
   assert.equal(got.authority.granted,false);
  }finally{restoreSemantic()}
 });
});


test('conversation comparison: revise an unknown-vs-false answer using authenticated user source, then re-review',async()=>{
 await environment(async()=>{
  previewSemantic();try{
   const f=fixture();await bootstrap(f);
   const turns=[
    {role:'user',source_ref:'user:receipt:01',
     text:"Carrier said the CX-204 delivery probably happened, but we have no signed proof of delivery. Delivery is unconfirmed."},
    {role:'assistant',source_ref:'model:receipt:02',
     text:'We should keep the delivery status unconfirmed until verified.'},
    {role:'user',source_ref:'user:receipt:03',
     text:'We are only preparing a draft update. Do not send it.'},
   ];
   const original='Keep the CX-204 order marked NOT DELIVERED.';
   const corrected='CX-204 delivery remains unconfirmed. Prepare an internal status draft, but do not send it.';
   const stub=semanticCallStub(f,{
    draft:original,repair:corrected,
    first:review({issues:[{
      kind:'FACT_CONTRADICTION',quote:'NOT DELIVERED',
      reason:'user:receipt:01 says delivery unconfirmed, not proven not delivered.'}]}),
    second:review(),completeProvenance:true,
   });
   const got=await runLiveIntelligenceOrchestration({
    message:'What should our status say? Keep this as a draft only.',
    observedAt:'2026-10-24T15:01:00.000Z',
    model:'test-model',apiKey:'test-only',systemContext:context(),
    verifiedConversationTurns:turns,fetchImpl:stub.fetchImpl,
   });
   const reviewRequest=JSON.parse(stub.calls.find(x=>x.mode==='REVIEW')
     .request.input[1].content[0].text);
   assert.equal(reviewRequest.conversation_source_history.user_statements.length,2);
   assert.equal(reviewRequest.conversation_source_history.user_statements[0].source_ref,
     'user:receipt:01');
   assert.match(reviewRequest.conversation_source_history.user_statements[0].text,/unconfirmed/);
   assert.equal(reviewRequest.conversation_source_history.prior_assistant_messages_are_not_evidence,true);
   assert.equal(got.intelligence.answer,corrected);
   assert.equal(got.intelligence.reliability_intervention,'SEMANTIC_REVIEW_CORRECTED');
   assert.equal(got.reliability.conversational_assessment.semantic_conversation_candidates,1);
   assert.equal(got.reliability.conversational_drift.findings.some(x=>
     x.classification==='CONVERSATION_FACT_CONTRADICTION_CANDIDATE'&&
     x.reason.includes('user:receipt:01')&&
     x.detector_channel==='EXISTING_SEMANTIC_CONVERSATION_REVIEW'),true);
   assert.deepEqual(stub.calls.map(x=>x.mode),['MODEL','REVIEW','MODEL','REVIEW']);
   assert.equal(got.reliability.semantic_repair.independently_verified_correctness,false);
   assert.equal(got.execution.status,'NOT_EXECUTED');
   const receipt=f.events.find(e=>e.event_id===got.reliability.semantic_repair.receipt_id);
   assert.equal(receipt.payload.initial_issues[0].kind,'FACT_CONTRADICTION');
   assert.equal(receipt.payload.post_repair_issues.length,0);
  }finally{restoreSemantic()}
 });
});
test('conversation comparison: do not modify a correct answer and do not promote prior assistant text to fact',async()=>{
 await environment(async()=>{
  previewSemantic();try{
   const f=fixture();await bootstrap(f);
   const turns=[
    {role:'user',source_ref:'user:first',
     text:'The carrier says delivery may have happened; no independent proof is available.'},
    {role:'assistant',source_ref:'assistant:previous',
     text:'Delivery is confirmed and completed.'},
   ];
   const original='The carrier reported possible delivery; the actual status remains unconfirmed.';
   const stub=semanticCallStub(f,{draft:original,first:review()});
   const got=await runLiveIntelligenceOrchestration({
    message:'Summarize delivery without inventing verification.',
    observedAt:'2026-10-24T15:01:00.000Z',
    model:'test-model',apiKey:'test-only',systemContext:context(),
    verifiedConversationTurns:turns,fetchImpl:stub.fetchImpl,
   });
   const comparison=JSON.parse(stub.calls.find(x=>x.mode==='REVIEW')
     .request.input[1].content[0].text).conversation_source_history;
   assert.deepEqual(comparison.user_statements.map(x=>x.source_ref),['user:first']);
   assert.equal(comparison.prior_assistant_messages_are_not_evidence,true);
   assert.equal(got.intelligence.answer,original);
   assert.equal(got.intelligence.reliability_intervention,undefined);
   assert.equal(got.reliability.conversational_assessment.semantic_conversation_candidates,0);
   assert.equal(got.reliability.conversational_drift.findings.length,0);
   assert.deepEqual(stub.calls.map(x=>x.mode),['MODEL','REVIEW']);
  }finally{restoreSemantic()}
 });
});


test('user-goal trajectory drift enters existing repair and Continuity receipt; authorized user goal remains governing',async()=>{
 await environment(async()=>{
  previewSemantic();try{
   const f=fixture();await bootstrap(f);
   const firstUserRef='customer:user:intent-1';
   const older=[
    {role:'user',source_ref:firstUserRef,
      text:'We need to finish the estimate for the homeowner this afternoon. Keep that the objective.'},
    {role:'assistant',source_ref:'assistant:old-2',
      text:'I will focus on the homeowner estimate.'},
    {role:'user',source_ref:'customer:user:detour-3',
      text:'Quick detour to inventory, then return to the estimate.'},
    {role:'assistant',source_ref:'assistant:old-4',
      text:'I can review the stock first; the estimate is still the requested outcome.'},
   ];
   const incorrect='Instead, let us launch a social-media campaign this afternoon.';
   const correct='The homeowner estimate remains the goal. Check pricing and prepare the internal draft.';
   const stub=semanticCallStub(f,{
    draft:incorrect,repair:correct,
    first:{...review(),goal_trajectory_review:{
      goal_source_ref:firstUserRef,user_direction:'USER_RETURNED_TO_OBJECTIVE',
      answer_alignment:'ASSISTANT_DRIFTED_OFF_OBJECTIVE',
      answer_quote:'launch a social-media campaign',
      reason:'The user asked to return to the estimate, not launch an unsolicited campaign.',
    }},
    second:{...review(),goal_trajectory_review:{
      goal_source_ref:firstUserRef,user_direction:'USER_RETURNED_TO_OBJECTIVE',
      answer_alignment:'ON_USER_DIRECTED_OBJECTIVE',
      answer_quote:'',reason:'The answer returns to the requested estimate.',
    }},
   });
   const got=await runLiveIntelligenceOrchestration({
    message:'Back to the homeowner estimate now. What remains to finish it?',
    observedAt:'2026-10-24T15:01:00.000Z',
    model:'test-model',apiKey:'test-only',systemContext:context(),
    verifiedConversationTurns:older,fetchImpl:stub.fetchImpl,
   });
   assert.equal(got.intelligence.answer,correct);
   assert.equal(got.intelligence.reliability_intervention,'SEMANTIC_REVIEW_CORRECTED');
   assert.equal(got.reliability.conversational_assessment.semantic_conversation_candidates,1);
   assert.ok(got.reliability.conversational_drift.findings.some(x=>
    x.classification==='CONVERSATION_TOPIC_DRIFT_CANDIDATE'&&
    x.detector_channel==='EXISTING_SEMANTIC_CONVERSATION_REVIEW'));
   assert.equal(got.reliability.semantic_repair.independently_verified_correctness,false);
   const coverage=got.reliability.conversational_assessment.goal_drift_coverage;
   assert.equal(coverage.status,'DRIFT_CANDIDATES_REQUIRE_ADJUDICATION');
   assert.equal(coverage.independently_verified_drift_rate,null);
   assert.equal(coverage.candidate_count_zero_means_drift_free,false);
   const durable=f.events.find(e=>e.payload?.event_type==='MODEL_OUTPUT_ASSESSMENT');
   assert.equal(durable.payload.conversational_drift.coverage.goal_drift_coverage.status,
     'DRIFT_CANDIDATES_REQUIRE_ADJUDICATION');
   const modelReq=stub.calls.find(x=>x.mode==='MODEL');
   assert.ok(JSON.stringify(modelReq.request).includes('user_goal_trajectory'));
   assert.deepEqual(stub.calls.map(x=>x.mode),['MODEL','REVIEW','MODEL','REVIEW']);
  }finally{restoreSemantic()}
 });
});
