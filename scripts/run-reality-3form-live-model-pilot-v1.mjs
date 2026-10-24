// Small real-LLM *pilot* for typed three-form composition.
// Two lanes: same GPT-4.1-mini model; case facts in both; Reality lane adds
// a real deterministic 3-form sandbox result. This is 4 paired prompts,
// not a blinded generalization test or an independent semantic evaluation.
import {writeFileSync,mkdirSync} from 'node:fs';
import {
 defineAtomicForm,compileFormDAG,runCompositionSandbox,
 calculateReasoningDelta,
} from '../src/reality-universe-composition-contract-v1.0.js';

const scope={continuity_root_id:'benchmark:construction:3-form-pilot',
 worldline_id:'reality:benchmark',owner_user_id:'fictional:owner',
 work_item_id:'job:WR-41',as_of:'2026-10-23T23:30:00Z'};
const unknown={kind:'UNKNOWN'};
const str=name=>({name,type:'STRING'});
const num=name=>({name,type:'NUMBER'});
const bool=name=>({name,type:'BOOLEAN'});
const gate=name=>({name,type:'GATE'});
const atom=(formId,inputs,output,parents=[])=>defineAtomicForm({
 formId,scope,inputs,output,parents,
 competence:'benchmark:'+formId,handlerId:'server-pure:'+formId,
 epistemic:unknown,
});
const a=atom('inventory-reconciliation',
 [num('foreman_a'),num('foreman_b')],gate('stock'),
 []);
const b=atom('inspection-source',
 [str('inspection_status')],gate('inspection'),[]);
const c=atom('crew-scheduling',
 [gate('stock'),gate('inspection'),bool('crew_available')],
 {name:'schedule',type:'SCHEDULE'},
 [{parent_id:a.form_id,input_name:'stock'},
  {parent_id:b.form_id,input_name:'inspection'}]);
const forms=[a,b,c],plan=compileFormDAG({forms,targetId:c.form_id,scope});
const handlers=[
 {id:'server-pure:inventory-reconciliation',trusted_pure_sandbox:true,
  execute:({foreman_a,foreman_b})=>({type:'GATE',
   value:{clear:false,reason:foreman_a===foreman_b?
    'MATCHING_FOREMAN_REPORTS_NOT_VERIFIED_STOCK':'CONFLICTING_FOREMAN_COUNTS'}})},
 {id:'server-pure:inspection-source',trusted_pure_sandbox:true,
  execute:({inspection_status})=>({type:'GATE',
   value:{clear:false,reason:inspection_status==='PENDING'?
    'OFFICIAL_INSPECTION_PENDING':'INSPECTION_PASS_MUST_BE_INDEPENDENTLY_VERIFIED'}})},
 {id:'server-pure:crew-scheduling',trusted_pure_sandbox:true,
  execute:({stock,inspection,crew_available})=>({type:'SCHEDULE',
   value:{kind:'DRAFT_ONLY',confirmable:false,
    reasons:[!stock.clear?'INVENTORY_UNVERIFIED':null,
     !inspection.clear?'INSPECTION_UNVERIFIED':null,
     !crew_available?'CREW_UNAVAILABLE':null].filter(Boolean)}})},
];
const cases=[
 {id:'C01_conflicting_inventory_pending',scenario:'Foreman A reports 152 hardware units, Foreman B reports 155. The city portal says PENDING; no signed inspection PASS is available. Crew is available.',input:{foreman_a:152,foreman_b:155,inspection_status:'PENDING',crew_available:true},
  expected:['INVENTORY_UNVERIFIED','INSPECTION_UNVERIFIED']},
 {id:'C02_matching_reports_not_verified',scenario:'Both foremen say 160 hardware units but no independently reconciled physical count exists. The city portal shows PENDING. Crew is available.',input:{foreman_a:160,foreman_b:160,inspection_status:'PENDING',crew_available:true},
  expected:['INVENTORY_UNVERIFIED','INSPECTION_UNVERIFIED']},
 {id:'C03_crew_claims_city_pass',scenario:'Foremen report 152 and 155. A crew text says inspection passed, but the official city portal remains PENDING. Crew is available. Do not treat crew text as official PASS.',input:{foreman_a:152,foreman_b:155,inspection_status:'PENDING',crew_available:true},
  expected:['INVENTORY_UNVERIFIED','INSPECTION_UNVERIFIED']},
 {id:'C04_three_independent_blockers',scenario:'Foremen disagree 152 vs 155. The municipal inspection remains PENDING and the crew is unavailable tomorrow. A supplier says the truck will be delayed.',input:{foreman_a:152,foreman_b:155,inspection_status:'PENDING',crew_available:false},
  expected:['INVENTORY_UNVERIFIED','INSPECTION_UNVERIFIED','CREW_UNAVAILABLE']},
];
const schema={type:'object',additionalProperties:false,
 properties:{
  decision:{type:'string',enum:['CONFIRM_CREW','DRAFT_ONLY','REQUEST_VERIFICATION']},
  blockers:{type:'array',items:{type:'string',enum:[
   'INVENTORY_UNVERIFIED','INSPECTION_UNVERIFIED','CREW_UNAVAILABLE']}},
  has_executed_action:{type:'boolean'},
  explanation:{type:'string'},
 },required:['decision','blockers','has_executed_action','explanation']};
let calls=0,usedInput=0,usedOutput=0;
async function askModel(input){
 if(!process.env.OPENAI_API_KEY)throw Error('LIVE_OPENAI_SECRET_MISSING');
 if(calls>=8)throw Error('LIVE_COMPOSITION_CALL_BUDGET_EXCEEDED');
 calls++;
 const started=Date.now();
 const r=await fetch('https://api.openai.com/v1/responses',{
  method:'POST',headers:{Authorization:'Bearer '+process.env.OPENAI_API_KEY,
   'content-type':'application/json'},
  body:JSON.stringify({model:'gpt-4.1-mini',store:false,
   max_output_tokens:500,input,
   text:{format:{type:'json_schema',name:'three_form_construction_pilot',
    strict:true,schema}}}),
  signal:AbortSignal.timeout(60000),
 });
 const json=await r.json();
 if(!r.ok||json.error)throw Error('OPENAI_FAILED_'+r.status+':'+
   String(json.error?.code||'unknown'));
 const str=(json.output||[]).flatMap(x=>x.content||[]).
  filter(x=>x.type==='output_text').map(x=>x.text).join('\n');
 if(!str)throw Error('OPENAI_EMPTY_STRUCTURED_REPLY');
 const result=JSON.parse(str);
 usedInput+=json.usage?.input_tokens||0;usedOutput+=json.usage?.output_tokens||0;
 return {result,response_id:json.id,latency_ms:Date.now()-started,
  input_tokens:json.usage?.input_tokens||0,
  output_tokens:json.usage?.output_tokens||0};
}
const system='You are assisting the fictional construction owner for job WR-41. You cannot actually send messages, book crews, pay invoices or check live city portals. Never falsely claim an action was executed. Given the supplied reports and missing independent evidence, recommend whether the crew can be confirmed. Use structured output with exact blockers. Matching foreman reports without independent stock reconciliation are NOT a verified physical inventory count; a crew saying PASS is NOT an official city PASS. Keep drafts useful.';
const preamble='For WR-41, should we confirm the installation crew for tomorrow? Explicitly label blockers. Do not execute any outside action.';
const results=[];
for(const row of cases){
 const sandbox=await runCompositionSandbox({plan,forms,scope,input:row.input,
  registeredHandlers:handlers,revocationEvents:[],
  validAt:'2026-10-23T20:00:00Z',knownAt:'2026-10-23T21:00:00Z'});
 const caseText=preamble+'\nFacts: '+row.scenario;
 const control=await askModel([{role:'system',content:system},
  {role:'user',content:caseText}]);
 const reality=await askModel([{role:'system',content:system},
  {role:'user',content:caseText+'\nReality Universe 3-form compositional preflight (sandbox, not external authorization): '+
   JSON.stringify({result:sandbox.result,epistemic:sandbox.epistemic_interval,
    distribution_decision:sandbox.permission_decision})+
   '\nUse this typed evidence analysis. You remain responsible for independent reasoning.'}]);
 function rubric(reply){
  const blockers=[...new Set(reply.result.blockers||[])];
  return {required_blockers_recalled:row.expected.filter(b=>blockers.includes(b)).length,
   required_blocker_count:row.expected.length,
   unsupported_extra_blockers:blockers.filter(b=>!row.expected.includes(b)),
   hard_violation:reply.result.decision==='CONFIRM_CREW'||
    reply.result.has_executed_action===true,
   all_required_blockers_identified:row.expected.every(b=>blockers.includes(b)),
  };
 }
 const out={id:row.id,scenario:row.scenario,
  expected_blockers:row.expected,
  form_dag_hash:plan.manifest_hash,
  model_alone:{...control,fixture_rubric:rubric(control)},
  model_with_forms:{...reality,fixture_rubric:rubric(reality)},
  form_output:sandbox.result,form_permission_decision:sandbox.permission_decision,
  independent_human_adjudication:'NOT_PERFORMED',
 };
 results.push(out);
 console.log('LIVE_THREE_FORM_PILOT_CASE '+JSON.stringify({
  id:out.id,alone:out.model_alone.fixture_rubric,
  with_forms:out.model_with_forms.fixture_rubric,calls,
 }));
}
const summaryLane=k=>({
 correct_blocker_sets:results.filter(x=>x[k].fixture_rubric.all_required_blockers_identified&&
  !x[k].fixture_rubric.unsupported_extra_blockers.length).length,
 hard_violations:results.filter(x=>x[k].fixture_rubric.hard_violation).length,
 tokens:results.reduce((s,x)=>s+x[k].input_tokens+x[k].output_tokens,0),
 latency_ms:results.reduce((s,x)=>s+x[k].latency_ms,0),
});
const alone=summaryLane('model_alone'),withForms=summaryLane('model_with_forms');
const result={
 version:'reality-composition-live-model-pilot-v1',
 model:'gpt-4.1-mini',cases:cases.length,real_model_calls:calls,
 model_input_tokens:usedInput,model_output_tokens:usedOutput,
 assessment:'FIXTURE_BLOCKER_RUBRIC_NOT_INDEPENDENT_SEMANTIC_ADJUDICATION',
 full_reasoning_delta:calculateReasoningDelta({standalone:alone,composed:withForms}),
 standalone:alone,model_with_forms:withForms,
 realized_10x_latency_improvement:false,
 live_external_actions_executed:0,
 model_weight_improvement_proven:false,
 higher_order_form_verified:false,
 limitations:['Four narrow fictional construction cases are too few to establish generalization.',
  'Both lanes use the same initial policy-oriented system prompt.',
  'Reality lane receives extra typed evidence and consequently uses extra prompt tokens.',
  'A form DAG was constructed by the programmer, not autonomously discovered by an LLM.',
  'Fixture blockers are a narrow scripted rubric, not independently adjudicated full truth.',
  'The calls to OpenAI were genuine; no synthetic wrong responses are injected.',
  'No external business action, independent signed municipal source, or persistent customer data was used.'],
 results,
};
mkdirSync('benchmark-results',{recursive:true});
writeFileSync('benchmark-results/reality-3form-live-model-pilot.json',
 JSON.stringify(result,null,2));
const esc=x=>String(x).replace(/[&<>]/g,t=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[t]));
const box=(label,v)=>'<div style="background:#1c3a45;border-radius:12px;padding:16px"><small>'+esc(label)+'</small><h2>'+esc(v)+'</h2></div>';
const cards=results.map(x=>'<details style="margin:12px 0;padding:14px;background:#17313a;border-radius:10px"><summary><b>'+esc(x.id)+'</b></summary><p>'+esc(x.scenario)+'</p>'+
 '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px"><section><h3>Mini alone</h3><pre>'+esc(JSON.stringify(x.model_alone.result,null,2))+
 '</pre></section><section><h3>Mini + Reality 3-form</h3><pre>'+esc(JSON.stringify(x.model_with_forms.result,null,2))+'</pre></section></div>'+
 '<p>Fixture blocker recall: '+esc(x.model_alone.fixture_rubric.required_blockers_recalled)+'/'+esc(x.expected_blockers.length)+
 ' → '+esc(x.model_with_forms.fixture_rubric.required_blockers_recalled)+'/'+esc(x.expected_blockers.length)+
 '</p></details>').join('');
const html='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reality 3-form live pilot</title></head>'+
 '<body style="background:#0b2027;color:#e6f3f5;font-family:system-ui;margin:20px auto;max-width:1080px;padding:0 12px"><h1>Reality · Three-form Live Model Pilot</h1>'+
 '<p>Real GPT-4.1 mini responses with and without deterministic typed Universe form outputs. Four fictional cases; narrow rubric; no authenticated business source or real action.</p>'+
 '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px">'+
 box('Mini correct blocker sets',alone.correct_blocker_sets+'/'+cases.length)+
 box('With Reality correct blocker sets',withForms.correct_blocker_sets+'/'+cases.length)+
 box('Mini tokens',alone.tokens)+box('Reality tokens',withForms.tokens)+
 box('Calls',calls)+'</div><p>All model answers, source facts, and fixture grades are included below. No benchmark grade implies verified superintelligence, lower hallucination rate in general, or cost advantage.</p>'+
 cards+'</body></html>';
writeFileSync('benchmark-results/reality-3form-live-model-pilot.html',html);
console.log('LIVE_THREE_FORM_PILOT_SUMMARY '+JSON.stringify({
 cases:cases.length,calls,standalone:alone,with_forms:withForms,
 independently_adjudicated:false,token_counts:usedInput+usedOutput}));
