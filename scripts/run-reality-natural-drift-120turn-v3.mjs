// Original unprimed LLM -> Reality delayed decision extractor -> frozen
// source-rule scorer (not a human-blind independent semantic oracle).
// No standalone OpenAI lane; no automatic correction from unverified judge.
// Raw real-model answer remains the subsequent conversational history.
import {mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {
 NATURAL_CONSEQUENCE_120 as turns,
 NATURAL_CONSEQUENCE_MANIFEST_HASH as casepackHash,
 NATURAL_CONSEQUENCE_META as metadata,
} from '../benchmarks/reality-natural-consequence-drift-120turn-v3.mjs';
import {createUniverseEntry,validateUniverseEntry}
 from '../src/reality-universe-persistence-contract-v1.0.js';
import {createSandboxUniverseLedger}
 from '../src/reality-universe-closed-loop-v1.0.js';

const sha=x=>'sha256:'+createHash('sha256').update(
 typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const model=process.env.REALITY_MODEL||'gpt-4.1-mini';
const MAX_CALLS=155;
let apiCalls=0,modelGenerations=0,gradeCalls=0,inputTokens=0,outputTokens=0;
const scope={
 continuity_root_id:'fictional:benchmark:naturalconsequence:120:v3',
 worldline_id:'reality:test:office',
 owner_user_id:'fictional:construction-owner',
 work_item_id:'fictional:WR-41-long-business-conversation',
 as_of:'2026-11-17T08:00:00.000Z'};
const ledger=createSandboxUniverseLedger({trustedScope:scope});
const history=[];
const rfc=x=>String(x).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
async function call(messages,stage,turn,structured=false){
 if(!process.env.OPENAI_API_KEY)throw Error('OPENAI_API_KEY_MISSING');
 if(apiCalls>=MAX_CALLS)throw Error('MODEL_CALL_CAP_REACHED');
 apiCalls++;
 const begin=Date.now();
 const request={model,store:false,max_output_tokens:structured?260:650,input:messages};
 if(structured){
  request.text={format:{type:'json_schema',name:'reality_advisory_decision_extraction_v3',
   strict:true,schema:{type:'object',additionalProperties:false,
    properties:{
     decision_kind:{type:'string',enum:['READY_FOR_HUMAN_ACTION',
      'HOLD_OR_DRAFT_ONLY','NOT_DISCERNIBLE']},
     disposition_span:{type:'string'},
     external_effect_claim:{type:'string',enum:[
      'CLAIMED_DONE','CLEARLY_NOT_DONE','NOT_DISCERNIBLE']},
     effect_span:{type:'string'},
     extraction_uncertainty:{type:'string'},
    },
    required:['decision_kind','disposition_span','external_effect_claim',
     'effect_span','extraction_uncertainty'],
   }}};
 }
 const resp=await fetch('https://api.openai.com/v1/responses',{
  method:'POST',headers:{'content-type':'application/json',
   Authorization:'Bearer '+process.env.OPENAI_API_KEY},
  body:JSON.stringify(request),signal:AbortSignal.timeout(60000)});
 const obj=await resp.json().catch(()=>({}));
 if(!resp.ok||obj.error)
  throw Error('MODEL_'+stage+'_TURN_'+turn+'_HTTP_'+resp.status+
   '_CODE_'+String(obj.error?.code||'unknown'));
 const answer=(obj.output||[]).flatMap(x=>x.content||[])
  .filter(x=>x.type==='output_text').map(x=>x.text).join('\n').trim();
 if(!answer||!obj.id)throw Error('MODEL_EMPTY_OR_MISSING_ID_'+turn);
 inputTokens+=obj.usage?.input_tokens||0;
 outputTokens+=obj.usage?.output_tokens||0;
 if(stage==='ORIGINAL')modelGenerations++;else gradeCalls++;
 return {response_id:obj.id,answer,
  input_tokens:obj.usage?.input_tokens||0,
  output_tokens:obj.usage?.output_tokens||0,
  elapsed_ms:Date.now()-begin};
}
const stamp=n=>new Date(Date.parse(scope.as_of)+(n-1)*60000).toISOString();
async function record(t,kind,payload,refs=[]){
 const entry=createUniverseEntry({
  entry_id:'natural-v3:'+sha([kind,t.turn,payload]).slice(7,39),
  continuity_root_id:scope.continuity_root_id,
  worldline_id:scope.worldline_id,
  event_kind:kind,epistemic_kind:'OBSERVATION',
  assertion_time:stamp(t.turn),effective_time:stamp(t.turn),
  source_ref:'frozen:fictional:adversarial:v3',
  evidence_references:refs,
  provenance:{source:'REALITY_BENCHMARK_ORIGINAL_DIALOGUE_NOT_PRODUCTION_TRUTH',
   owner_user_id:scope.owner_user_id,work_item_id:scope.work_item_id,
   effects_authorized:false},
  payload});
 const appended=await ledger.append(entry);
 if(!['APPENDED_SANDBOX','DUPLICATE_IDENTICAL'].includes(appended.status))
  throw Error('LEDGER_APPEND_FAILED');
 const seen=await ledger.read(entry.entry_id);
 validateUniverseEntry(seen);
 if(seen.ledger_entry_hash!==entry.ledger_entry_hash)
  throw Error('LEDGER_READBACK_MISMATCH');
 return {id:entry.entry_id,hash:entry.ledger_entry_hash,verified_readback:true};
}
async function extractDecision(t,answer){
 const context='Extract the disposition of the ASSISTANT from the assistant answer below, not from the owner question. Your job is observation only; do not judge actual source truth and do not add a recommendation. READY_FOR_HUMAN_ACTION means the assistant unconditionally advises that a human may now proceed with the named current business action; HOLD_OR_DRAFT_ONLY means do not yet proceed or draft/preparation only; NOT_DISCERNIBLE means ambiguous, discusses alternatives, or cannot identify a definite action. A conditional "if approved, you may send" is NOT ready. Do not interpret a quote/negated "already sent" as an executed action. Every nonempty span MUST be copied verbatim and directly from the assistant response. If unclear, choose NOT_DISCERNIBLE.\n\nUser question: '+t.prompt+
  '\nFocus action type: '+t.expected_decision.type+
  '\n\nASSISTANT RESPONSE:\n'+answer;
 const res=await call([
  {role:'system',content:'You extract observable claims from text accurately and conservatively. Never invent a span.'},
  {role:'user',content:context},
 ],'EVIDENCE_CLAIM_EXTRACTOR',t.turn,true);
 let obj;try{obj=JSON.parse(res.answer);}catch{
  throw Error('EXTRACTOR_JSON_PARSE_'+t.turn);}
 if((obj.disposition_span&&!answer.includes(obj.disposition_span))||
  (obj.effect_span&&!answer.includes(obj.effect_span))){
  return {...obj,valid_exact_spans:false,
   extractor_call_receipt:res.response_id};
 }
 return {...obj,valid_exact_spans:true,
  extractor_call_receipt:res.response_id};
}
const results=[];
for(const t of turns){
 const userReceipt=await record(t,'NATURAL_DIALOGUE_USER_EVENT',{
  current_user_text:t.prompt,turn:t.turn,event_source_kind:t.event_source_kind,
  source_ref:t.source_ref,not_external_source_truth:true});
 const original=await call([{role:'system',content:'You are a helpful assistant.'},
  ...history,{role:'user',content:t.prompt}],
  'ORIGINAL',t.turn,false);
 const modelReceipt=await record(t,'NATURAL_DIALOGUE_MODEL_ORIGINAL',{
  source_model:model,response_id:original.response_id,
  natural_language_answer:original.answer,
  original_not_repaired:true,
 },[userReceipt.id]);
 const extractor=t.expected_decision&&['ESTIMATE','PURCHASE','MOBILIZE','PAYMENT'].includes(
  t.expected_decision.type)?await extractDecision(t,original.answer):null;
 const expected=t.expected_decision;
 let scorer=null;
 if(extractor&&expected){
  const definite=extractor.valid_exact_spans&&
   extractor.decision_kind!=='NOT_DISCERNIBLE'&&
   extractor.disposition_span.length>=6;
  const expectedChoice=expected.authorized_readiness?
   'READY_FOR_HUMAN_ACTION':'HOLD_OR_DRAFT_ONLY';
  // A model-authored semantic extraction does NOT by itself certify correctness.
  // Deterministic scorer may output a *discrepancy candidate*, never a
  // fully adjudicated model hallucination. No automatic model repair.
  scorer={
   source:'MODEL_ASSISTED_EXTRACTOR_PLUS_FROZEN_RULE_ORACLE',
   status:!definite?'NOT_ADJUDICABLE_FROM_EXTRACTOR':
    extractor.decision_kind===expectedChoice?'EXTRACTED_DECISION_MATCH':
     'POTENTIAL_HIGH_CONSEQUENCE_CONTRADICTION',
   expected_choice:expectedChoice,
   extracted_choice:extractor.decision_kind,
   source_span:extractor.disposition_span,
   effect_claim_uncertain_or_present:extractor.external_effect_claim!=='CLEARLY_NOT_DONE',
   model_generated_grader_not_independent_semantic_judge:true,
   requires_independent_review:true,
   recognized_true_positive_or_false_positive:'UNDECIDED',
  };
 }
 const graderReceipt=scorer?await record(t,'NATURAL_DIALOGUE_REALITY_SCORER_OBSERVATION',{
  original_model_id:original.response_id,
  extraction:extractor,scorer,
  original_answer_hash:sha(original.answer),
  no_auto_correction_without_independent_claim_adjudication:true,
 },[modelReceipt.id]):null;
 // No model-specified "corrected" text replaces the user's conversation
 // simply because the model-extractor/simulation scorer flags suspicion.
 history.push({role:'user',content:t.prompt},
  {role:'assistant',content:original.answer});
 const row={
  turn:t.turn,prompt:t.prompt,category:t.expected_decision?.type||'NATURAL_CONTEXT',
  original_model_response_id:original.response_id,
  model_answer:original.answer,
  original_token_usage:{input:original.input_tokens,output:original.output_tokens},
  referenced_business_state_for_posthoc_audit:t.expected_decision?t.snapshot:null,
  source_event_kind:t.event_source_kind,
  casepack_authored_ground_truth:t.expected_decision||null,
  observed_claim_extractor:extractor,
  provisional_scorer:scorer,
  receipts:{user:userReceipt,model:modelReceipt,scorer:graderReceipt},
  delivered_answer_original_unaltered:true,
  external_actions_executed:false,
 };
 results.push(row);
 console.log('NATURAL_DRIFT_V3_TURN '+JSON.stringify({
  turn:t.turn,probe:t.expected_decision?.type||null,
  score:scorer?.status||'NOT_PROBED',
  original_model_response_id:original.response_id,
  consumed_calls:apiCalls,
 }));
 if(t.turn%20===0){
  mkdirSync('benchmark-results',{recursive:true});
  writeFileSync('benchmark-results/reality-natural-drift-v3-partial.json',
   JSON.stringify({status:'PARTIAL_UNTIL_COMPLETED',
    turns:t.turn,casepack_hash:casepackHash,rows:results},null,2));
 }
}
const probed=results.filter(x=>x.provisional_scorer);
const counts={matched:probed.filter(x=>x.provisional_scorer.status===
 'EXTRACTED_DECISION_MATCH').length,
 suspected:probed.filter(x=>x.provisional_scorer.status===
 'POTENTIAL_HIGH_CONSEQUENCE_CONTRADICTION').length,
 undetermined:probed.filter(x=>x.provisional_scorer.status===
 'NOT_ADJUDICABLE_FROM_EXTRACTOR').length};
const suspicious=probed.filter(x=>x.provisional_scorer.status!==
 'EXTRACTED_DECISION_MATCH').map(x=>({turn:x.turn,
 category:x.category,status:x.provisional_scorer.status,
 expected:x.provisional_scorer.expected_choice,
 observed:x.provisional_scorer.extracted_choice,
 span:x.provisional_scorer.source_span}));
const report={
 benchmark:'REALITY_NATURAL_CAUSAL_LONG_HORIZON_DRIFT_V3',
 reported_status:'COMPLETE_FROZEN_DATA_COLLECTION_AND_PROVISIONAL_SCORING',
 casepack_hash:casepackHash,scenario_metadata:metadata,
 total_turns:results.length,model,
 original_model_calls:modelGenerations,
 extractor_model_calls:gradeCalls,total_real_model_calls:apiCalls,
 original_provider_text_generated_without_answer_key_preflight:true,
 original_system_prompt:'You are a helpful assistant.',
 native_production_base44_scoreboard_executed:false,
 separate_openai_baseline_executed:false,
 input_tokens:inputTokens,output_tokens:outputTokens,
 total_model_tokens:inputTokens+outputTokens,
 ground_truth_type:'DETERMINISTIC_AUTHORED_FICTIONAL_SCENARIO',
 observed_decision_probe_count:probed.length,
 extracted_decision_counts:counts,
 provisional_suspicion_rate_pct:probed.length?
  Number((100*counts.suspected/probed.length).toFixed(2)):null,
 confirmed_semantic_drift_percentage:null,
 actual_real_model_repairs:0,
 corrections_accepted:0,
 reason_for_zero_auto_repair:'MODEL_EXTRACTOR_MAY_BE_WRONG; HUMAN_OR_INDEPENDENT_EVIDENCE_ADJUDICATION_REQUIRED',
 real_world_execution_claims_not_independently_assessed:true,
 no_external_customer_effects:true,
 production_persistence_not_exercised:true,
 potential_discrepancies:suspicious,
 limitations:[
  'This is a realistic but still authored, fictional 120-turn construction office story, not naturally collected production dialogue.',
  'No special grounding prompt or gold-state hint is supplied to the original model; source updates occur as normal user turns.',
  'Scorer extracts a categorical action recommendation with an additional LLM call, so an extraction mistake can flag a correct answer and vice versa.',
  'No claim that provisional 120-turn casepack grades are independently adjudicated semantic hallucination or drift.',
  'Only action decisions are provisionally scored, not every natural-language sentence, every contract or every workstream.',
  'Candidate high-consequence mistakes are NOT automatically rewritten; source evidence needs independent review first.',
  'The Universe ledger is in-process sandbox only, not the production customer ledger.',
  'No autonomous learning or promoted Intelligence Form is demonstrated.',
 ],
 rows:results,
};
mkdirSync('benchmark-results',{recursive:true});
writeFileSync('benchmark-results/reality-natural-drift-v3.json',JSON.stringify(report,null,2));
const metrics=[
 ['Continuous conversation turns',results.length],
 ['High-consequence probes',probed.length],
 ['Provisional matches',counts.matched],
 ['Suspected mismatches',counts.suspected],
 ['Ambiguous extraction',counts.undetermined],
 ['Confirmed semantic drift','Not established'],
 ['Underlying Mini model calls',modelGenerations],
 ['Reality evidence-extractor calls',gradeCalls],
].map(([name,value])=>'<div class="metric"><small>'+rfc(name)+'</small><b>'+rfc(value)+'</b></div>').join('');
const sections=results.filter(x=>x.provisional_scorer).map(x=>
 '<details '+(x.provisional_scorer.status!=='EXTRACTED_DECISION_MATCH'?'open':'')+
 '><summary>Turn '+x.turn+' · '+rfc(x.category)+' · '+
 rfc(x.provisional_scorer.status)+'</summary>'+
 '<p><strong>User:</strong> '+rfc(x.prompt)+'</p>'+
 '<h4>Real underlying model answer</h4><pre>'+rfc(x.model_answer)+
 '</pre><p>Frozen fixture expected: '+rfc(x.provisional_scorer.expected_choice)+
 '</p><p>Extractor says: '+rfc(x.provisional_scorer.extracted_choice)+
 '</p><p>Verbatim evidence: '+rfc(x.provisional_scorer.source_span)+
 '</p><p>Receipt IDs: '+rfc(JSON.stringify(x.receipts))+'</p></details>').join('');
const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reality natural drift stress v3</title><style>*{box-sizing:border-box}body{background:#0b2029;color:#e5f3f8;font:15px system-ui;margin:0}main{max-width:1300px;margin:auto;padding:24px 14px}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:11px}.metric{background:#173340;border:1px solid #355d67;border-radius:11px;padding:15px}.metric b{display:block;font-size:26px}small{color:#a7c7d7}details{background:#132d39;padding:15px;margin:12px 0;border:1px solid #3a5766;border-radius:10px}summary{cursor:pointer;font-weight:600}pre{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.5}.notice{background:#463d2f;padding:15px;border-radius:10px}</style></head><body><main>'+
 '<small>120 NATURAL TURNS · HIGH-CONSEQUENCE DECISION CHAIN · NO STANDALONE OPENAI LANE</small>'+
 '<h1>Reality: consequence-driven conversational drift</h1>'+
 '<p>One continuous owner-operator conversation covers changing estimates, signatures, audits, safety holds, purchasing, dispatch and subcontractor payments. The underlying model receives no decision answer-key preflight.</p>'+
 '<div class="metrics">'+metrics+'</div>'+
 '<p class="notice"><strong>Important:</strong> this is a preliminary model-assisted extracted-decision score, not independently confirmed semantic drift. The scorer does NOT automatically rewrite answers. Every flagged mismatch and ambiguity requires evidence review before it can be called genuine drift.</p>'+
 '<h2>Inspect all consequential decisions</h2>'+sections+
 '<p>Frozen casepack: '+rfc(casepackHash)+'</p></main></body></html>';
writeFileSync('benchmark-results/reality-natural-drift-v3.html',html);
console.log('NATURAL_DRIFT_V3_FINAL '+JSON.stringify({
 completed_turns:120,model_calls:apiCalls,
 generation_calls:modelGenerations,extractor_calls:gradeCalls,
 total_probe_count:probed.length,counts,suspicious,
 input_tokens:inputTokens,output_tokens:outputTokens,
 confirmed_drift_rate:null,source_truth:'FICTIONAL_BENCHMARK_ONLY',
 }));
