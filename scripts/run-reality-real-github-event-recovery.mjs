// REAL Reality business evidence: source is live GitHub provider GET, not a
// synthetic construction fixture. Provider model runs ONLY inside Reality.
// DB is an isolated in-process simulation; there is NO production write.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {buildGovernedChatSignal} from '../src/reality-governed-fragmented-signal-cleaner-v0.1.js';
import {startContinuityRuntime} from '../src/reality-continuity-spine-runtime-v0.1.js';
import {recordSourceAttestedEvidence} from '../src/reality-reliability-evidence-v0.1.js';
import {runLiveIntelligenceOrchestration} from '../src/reality-live-intelligence-orchestration-v0.1.js';
const hash=x=>'sha256:'+createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const root='take-intelligence:reality:actual-gh-change-recovery';
const world='take-intelligence:github:run-transition';
const worldline='take-intelligence:engineering';
const repoPath='maloney2323/Reality';
const model='gpt-4.1-mini';
const OUT='benchmark-results/reality-real-event-recovery-20261025.json';
const MAX_CALLS=22,MAX_TOKENS=110000;
const evidence={test:'REAL_GITHUB_EVENT_CHANGE_RECOVERY_REALITY_ONLY',business:'Take Intelligence LLC / Reality',
  source_mode:'REAL_GITHUB_READ_ONLY_API',database_mode:'IN_MEMORY_SIMULATED_LOOP_PLUS_SEPARATELY_VERIFIED_REAL_BENCHMARK_DB',
  signal_cleaner_version:'1.1.0',questions_generated_for_evaluation:true,
  review_mode:'SAME_REAL_LLM_WITH_DETERMINISTIC_SOURCE_COMPARISON',
  customer_data_used:false,live_business_actions_executed:false,
  separate_model_baseline_calls:0,independent_semantic_adjudication:false,
  original_source_api_urls:[],source_digest:null,
  paid_calls:0,input_tokens:0,output_tokens:0,turns:[],result_status:'PARTIAL',
  detector_recall_claim:null,final_error_rate_claim:null};
mkdirSync('benchmark-results',{recursive:true});
const save=()=>writeFileSync(OUT,JSON.stringify(evidence,null,2));
const prior={};const env={
 VERCEL_ENV:'preview',REALITY_CONTINUOUS_RELIABILITY_ENABLED:'true',
 REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
 REALITY_RELIABILITY_EXTRACTION_ENABLED:'true',
 REALITY_DETECTOR_SHADOW_ENABLED:'false',
 REALITY_DETECTOR_REPAIR_ENABLED:'true',
 REALITY_SEMANTIC_REVIEW_ENABLED:'true',
 SUPABASE_URL:'https://example.supabase.co',SUPABASE_SECRET_KEY:'mock-only-never-used',
 REALITY_RELIABILITY_BENCHMARK_PROJECT_REF:'hvkfreoagbrphwghjajw',
 REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF:'hvkfreoagbrphwghjajw',
 REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL:'https://hvkfreoagbrphwghjajw.supabase.co',
};
for(const [k,v] of Object.entries(env)){prior[k]=process.env[k];process.env[k]=v;}
const events=[];const modelOutputs=[];
const responseText=data=>typeof data.output_text==='string'?data.output_text:
 (data.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('');
const io=async(url,opt={})=>{
 const u=new URL(url);
 if(u.pathname.includes('reality_universe_entries'))return new Response('[]',{status:200});
 if(u.pathname.startsWith('/rest/v1/')){
  if(opt.method==='POST'){
   const event=JSON.parse(opt.body);events.push(event);
   return new Response(JSON.stringify([event]),{status:201});
  }
  let result=events.slice();
  for(const [q,key] of [['continuity_root_id','continuity_root_id'],
    ['worldline_id','worldline_id'],['event_id','event_id']]){
   const raw=u.searchParams.get(q);
   if(raw?.startsWith('eq.'))result=result.filter(e=>e[key]===raw.slice(3));
  }
  if(u.searchParams.get('limit')==='1')result=result.slice(-1);
  else result.reverse();
  return new Response(JSON.stringify(result),{status:200});
 }
 if(u.hostname!=='api.openai.com'||u.pathname!=='/v1/responses')
   throw Error('UNEXPECTED_EXTERNAL_CALL_'+u.hostname);
 if(evidence.paid_calls>=MAX_CALLS)throw Error('MAX_REALITY_PAID_CALLS_REACHED');
 if(evidence.input_tokens+evidence.output_tokens>=MAX_TOKENS)
   throw Error('MAX_PROVIDER_TOKEN_BUDGET_REACHED');
 const res=await fetch(url,{...opt,signal:AbortSignal.timeout(90000)});
 const data=await res.clone().json();
 evidence.paid_calls++;
 evidence.input_tokens+=data.usage?.input_tokens||0;
 evidence.output_tokens+=data.usage?.output_tokens||0;
 const req=JSON.parse(opt.body);
 modelOutputs.push({kind:req.text?.format?.name==='reality_semantic_review'?'SEMANTIC_REVIEW':'COGNITION',
  response_id:data.id||null,output_text:req.text?.format?.name==='reality_semantic_review'?null:responseText(data),
  response_digest:hash(responseText(data)),
  usage:data.usage?{input_tokens:data.usage.input_tokens,output_tokens:data.usage.output_tokens}:null,
  failed:!res.ok});
 return new Response(JSON.stringify(data),{status:res.status});
};
async function github(path){
 const url='https://api.github.com/repos/'+repoPath+path;
 const res=await fetch(url,{headers:{
  Authorization:'Bearer '+process.env.GITHUB_TOKEN,
  Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',
 },signal:AbortSignal.timeout(15000)});
 if(!res.ok)throw Error('GITHUB_READ_ONLY_SOURCE_UNAVAILABLE_'+path+'_'+res.status);
 evidence.original_source_api_urls.push(url);
 return res.json();
}

try {
 if(!process.env.OPENAI_API_KEY||!process.env.GITHUB_TOKEN)
   throw Error('REALITY_READ_ONLY_PROVIDER_CREDENTIALS_REQUIRED');
 const first=await github('/actions/runs/40164102484');
 const second=await github('/actions/runs/40164146058');
 if(first.conclusion!=='failure'||second.conclusion!=='success'||
   first.head_branch!==second.head_branch||
   Date.parse(first.updated_at)>=Date.parse(second.updated_at))
   throw Error('ACTUAL_HISTORY_NO_LONGER_MATCHES_EXPECTED_GITHUB_EVIDENCE');
 evidence.historical_git_source_records=[
  {run:first.id,conclusion:first.conclusion,recorded_at:first.updated_at,
   url:first.html_url,sha:first.head_sha},
  {run:second.id,conclusion:second.conclusion,recorded_at:second.updated_at,
   url:second.html_url,sha:second.head_sha},
 ];
 evidence.source_digest=hash(evidence.historical_git_source_records);
 const at0=new Date().toISOString();
 const buildSig=(message,at)=>buildGovernedChatSignal({message,observedAt:at});
 const baseSig=buildSig('Read historical Reality GitHub run facts from authenticated read-only provider records.',at0);
 const oldRuntime=await startContinuityRuntime({
  continuityRootSource:root,worldlineSource:worldline,
  subjectId:'Real-CI-run-transition',signal:baseSig,
  observedAt:at0,fetchImpl:io,
 });
 const oldReceipt=await recordSourceAttestedEvidence({
  continuityRuntime:oldRuntime,worldId:world,sourceKind:'CONNECTED_PROVIDER_READBACK',
  sourceRef:first.html_url,sourceDigest:hash({run:first.id,conclusion:first.conclusion,sha:first.head_sha}),
  facts:[
   {key:'observed_run_first_conclusion',value:String(first.conclusion).toUpperCase()},
   {key:'observed_pair_current_conclusion',value:String(first.conclusion).toUpperCase()},
  ],observedAt:at0,
 });
 evidence.old_attested_receipt=oldReceipt.event_id;
 evidence.session_transition={
   session_A:'FRESH_REALITY_RUNTIME_INSTANCE_WITH_FAILED_STATUS',
   session_B:'FRESH_REALITY_RUNTIME_INSTANCE_READING_SHARED_TEST_STORAGE',
   actual_database_used_inside_reality:'NO',
   actual_benchmark_database_verified_separately:'YES',
   actual_benchmark_database_root:'bench:gh:v11:20261025:real-changing-ci',
 };
 const questions=[
 'For the two verified Reality CI runs under review, what was the conclusion of run 40164102484? Do not infer later results.',
 'The older run failed, but now check the subsequently verified run 40164146058. Which result is newer within these two runs? Be precise and cite source evidence.',
 'A copied older update says "the test is still failing." Is that report current when we compare these two authenticated GitHub runs? Explain what changed.',
 'If the newer test passed, draft one internal readiness summary. Do not deploy, send any notice, or claim customer release is approved. Is this proof of customer-level drift recovery?',
 ];
 const chatTurns=[];
 for(let i=0;i<questions.length;i++){
   if(i===1){
     // The new event is separately source-attested, and explicitly supersedes
     // the older "pair current status"; the old run fact remains immutable.
     const t=new Date().toISOString();
     // New runtime instance must rehydrate the current durable tail before
     // writing; retaining a stale runtime object would violate append-only
     // lineage after the first conversation turn.
     const writer=await startContinuityRuntime({
       continuityRootSource:root,worldlineSource:worldline,
       subjectId:'Real-CI-run-transition',signal:buildSig(
         'Observe a later verified GitHub workflow result.',t),
       observedAt:t,fetchImpl:io,
     });
     const newReceipt=await recordSourceAttestedEvidence({
      continuityRuntime:writer,worldId:world,
      sourceKind:'CONNECTED_PROVIDER_READBACK',sourceRef:second.html_url,
      sourceDigest:hash({run:second.id,conclusion:second.conclusion,sha:second.head_sha}),
      facts:[
       {key:'observed_run_second_conclusion',value:String(second.conclusion).toUpperCase()},
       {key:'observed_pair_current_conclusion',value:String(second.conclusion).toUpperCase(),
         supersedes_evidence_ref:oldReceipt.event_id},
      ],observedAt:t,
     });
     evidence.new_attested_receipt=newReceipt.event_id;
     // Fresh Continuity object. No object state from oldRuntime is passed,
     // only the stored event stream (mocked persistence in this runner).
     const restarted=await startContinuityRuntime({
       continuityRootSource:root,worldlineSource:worldline,
       subjectId:'Real-CI-run-transition',signal:buildSig(
        'Resume the verified business work using current Continuity records.',new Date().toISOString()),
       observedAt:new Date().toISOString(),fetchImpl:io,
     });
     const raw=await restarted.readback();
     const {readGroundedEvidence}=await import('../src/reality-reliability-evidence-v0.1.js');
     const ordered=raw.slice().sort((a,b)=>Date.parse(a.assertion_time)-Date.parse(b.assertion_time));
     const source=readGroundedEvidence(ordered,{worldId:world});
     const current=source.facts.find(f=>f.key==='observed_pair_current_conclusion');
     if(current?.value!=='SUCCESS')throw Error('CROSS_SESSION_CURRENT_FACT_NOT_RECOVERED');
     evidence.session_transition.restarted_continuity_readback=true;
     evidence.session_transition.recovered_current_value=current.value;
     evidence.session_transition.old_event_still_exists=ordered.some(x=>x.event_id===oldReceipt.event_id);
     evidence.session_transition.new_evidence_ref=current.evidence_ref;
     evidence.session_transition.prior_event_count=restarted.prior_event_count;
   }
   const question=questions[i];
   const at=new Date().toISOString();
   const typedSignal=buildSig(question,at);
   const typed=typedSignal.typed_epistemic_intake;
   if(!typed||typed.execution_authorized!==false)throw Error('TYPED_INTAKE_AUTHORITY_FAILURE');
   const start=evidence.paid_calls,tokenStart=evidence.input_tokens+evidence.output_tokens;
   const responseAt=modelOutputs.length;
   const result=await runLiveIntelligenceOrchestration({
     message:question,observedAt:at,model,apiKey:process.env.OPENAI_API_KEY,
     systemContext:{world_id:world,worldline_id:worldline,
       continuity_root_id:root,conversation_id:'reality-real-github-work-history-recovery'},
     verifiedConversationTurns:chatTurns,fetchImpl:io,
   });
   const responses=modelOutputs.slice(responseAt);
   const reviewAt=responses.findIndex(x=>x.kind==='SEMANTIC_REVIEW');
   const originalOutput=(reviewAt>=0?responses.slice(0,reviewAt):responses)
       .filter(x=>x.kind==='COGNITION').at(-1)?.output_text||null;
   const released=String(result.intelligence.answer||'');
   evidence.turns.push({
     turn:i+1,question,original_model_answer:originalOutput,
     reality_displayed_answer:released,
     typed_intake:{version:typed.version,projection_digest:typed.projection_digest,
      clauses:typed.clauses.map(c=>({kind:c.kind,modalities:c.epistemic_modalities,
       text:c.exact_source_text,source_span:c.source_span,
       agency:c.agency.candidate,dependency:c.candidate_dependency})),
      source_spans_verified:typed.clauses.every(c=>
       question.slice(c.source_span.start,c.source_span.end)===c.exact_source_text)},
     semantic_review:result.reliability?.semantic_review||null,
     source_evaluation:result.reliability?.evaluation_status||null,
     original_quarantined:result.reliability?.model_output_quarantined||false,
     repair:result.reliability?.semantic_repair||null,
     source_receipt_id:result.reliability?.receipt_id||null,
     verified_readback:result.reliability?.readback_verified||false,
     execution_status:result.execution?.status||null,
     authority_granted:result.authority?.granted||false,
     provider_calls:evidence.paid_calls-start,
     provider_tokens:evidence.input_tokens+evidence.output_tokens-tokenStart,
     original_response_ids:responses.map(x=>x.response_id),
     independent_accuracy_judged:false,
   });
   chatTurns.push({role:'user',text:question,source_ref:'read-only-github-test-question:'+i});
   chatTurns.push({role:'assistant',text:released,source_ref:'read-only-github-test-answer:'+i});
   save();
   console.log('REALITY_RECOVERY_TURN '+JSON.stringify({
     turn:i+1,original:originalOutput?.slice(0,160),
     final:released.slice(0,240),
     reviewed:result.reliability?.semantic_review?.status||null,
     repair:result.reliability?.semantic_repair?.status||null,
     readback:result.reliability?.readback_verified||false,
     no_external_effect:result.execution?.status==='NOT_EXECUTED',
     calls:evidence.paid_calls-start,
   }));
 }
 if(evidence.turns.length!==4||
   evidence.turns.some(x=>x.authority_granted||!x.verified_readback||
     x.execution_status!=='NOT_EXECUTED'||!x.typed_intake.source_spans_verified))
   throw Error('FULL_LOOP_CONTRACT_NOT_MET');
 evidence.result_status='COMPLETE_REAL_GITHUB_EVENTS_REAL_LLM_MOCK_IN_LOOP_DB';
 save();
 console.log('REALITY_RECOVERY_TOTAL '+JSON.stringify({
  status:evidence.result_status,turns:evidence.turns.length,
  cross_session_mock_readback:evidence.session_transition.restarted_continuity_readback,
  recovered:evidence.session_transition.recovered_current_value,
  calls:evidence.paid_calls,tokens:evidence.input_tokens+evidence.output_tokens,
  independent_accuracy_judged:false,real_runtime_db:false,
 }));
}catch(error){
 evidence.failure=String(error?.message||error).slice(0,180);
 evidence.result_status='FAILED_OR_INCOMPLETE';
 save();throw error;
}finally{
 for(const [k,v] of Object.entries(prior)){
  if(v===undefined)delete process.env[k];else process.env[k]=v;
 }
}
