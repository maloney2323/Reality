import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniverseEntry} from '../src/reality-universe-persistence-contract-v1.0.js';
import {
 defineAtomicForm,propagateBoundedEpistemicInterval,
 compileFormDAG,runCompositionSandbox,createBitemporalGhostFork,
 makeRevocationSignal,computeRevocationClosure,createCompositeFormCandidate,
 calculateReasoningDelta,
} from '../src/reality-universe-composition-contract-v1.0.js';

const scope={continuity_root_id:'benchmark:form-composition',
 worldline_id:'reality:benchmark',owner_user_id:'fictional:construction-owner',
 work_item_id:'job:WR-41',as_of:'2026-10-23T22:00:00Z'};
const epistemic={kind:'UNKNOWN'};
const bounded=(lower,upper,receipt)=>({
 kind:'CALIBRATED_EVENT_BOUNDS',lower,upper,calibration_receipts:[receipt],
});
function atomic(id,inputs,output,parents=[],epi=epistemic){
 return defineAtomicForm({formId:'form:'+id,scope,inputs,output,parents,
  competence:'construction:'+id,handlerId:'handler:'+id,epistemic:epi});
}
const ports={
 num:name=>({name,type:'NUMBER'}),
 str:name=>({name,type:'STRING'}),
 bool:name=>({name,type:'BOOLEAN'}),
 gate:name=>({name,type:'GATE'}),
};
function constructionFormSet(epi=epistemic){
 const a=atomic('inventory',
  [ports.num('foreman_a'),ports.num('foreman_b')],
  ports.gate('inventory_gate'),[],epi);
 const b=atomic('inspection',
  [ports.str('inspection_status')],
  ports.gate('inspection_gate'),[],epi);
 const c=atomic('labor_schedule',
  [ports.gate('inventory_gate'),ports.gate('inspection_gate'),
   ports.bool('crew_available')],
  {name:'schedule_result',type:'SCHEDULE'},
  [{parent_id:a.form_id,input_name:'inventory_gate'},
   {parent_id:b.form_id,input_name:'inspection_gate'}],epi);
 return [a,b,c];
}
const handlers=[
 {id:'handler:inventory',trusted_pure_sandbox:true,
  execute:async ({foreman_a,foreman_b})=>({
   type:'GATE',value:{clear:false,
    reason:foreman_a!==foreman_b?'CONFLICTING_COUNTS':
     'MATCHED_REPORTS_NOT_PHYSICAL_PROOF',
    counts:[foreman_a,foreman_b]},
  })},
 {id:'handler:inspection',trusted_pure_sandbox:true,
  execute:async ({inspection_status})=>({
   type:'GATE',value:{clear:inspection_status==='PASS',
    reason:inspection_status==='PASS'?'REPORTED_PASS_STILL_NEEDS_OFFICIAL_RECEIPT':
     'INSPECTION_NOT_PASSED'},
  })},
 {id:'handler:labor_schedule',trusted_pure_sandbox:true,
  execute:async ({inventory_gate,inspection_gate,crew_available})=>({
   type:'SCHEDULE',
   value:{kind:'DRAFT_ONLY',confirmable:false,
    reasons:[!inventory_gate.clear?'INVENTORY_UNVERIFIED':null,
     !inspection_gate.clear?'INSPECTION_UNVERIFIED':null,
     !crew_available?'CREW_UNAVAILABLE':null].filter(Boolean),
    reminder:'No crew dispatch, purchase or customer notification has occurred'},
  })},
];
const input={foreman_a:152,foreman_b:155,inspection_status:'PENDING',crew_available:true};
const dates={validAt:'2026-10-22T09:30:00Z',knownAt:'2026-10-22T10:30:00Z'};
const run=(forms=constructionFormSet(),events=[],inp=input,time=dates)=>{
 const plan=compileFormDAG({forms,targetId:'form:labor_schedule',scope});
 return runCompositionSandbox({plan,forms,scope,input:inp,
  registeredHandlers:handlers,revocationEvents:events,
  ...time});
};
function snapshot(id,state,effective,assertion){
 return createUniverseEntry({
  entry_id:id,continuity_root_id:scope.continuity_root_id,
  worldline_id:scope.worldline_id,event_kind:'OPERATIONAL_SNAPSHOT',
  epistemic_kind:'OBSERVATION',source_ref:'benchmark:fictional-owner-source',
  assertion_time:assertion,effective_time:effective,
  payload:{state},evidence_references:['benchmark:fictional-owner-source'],
  provenance:{source:'TEST_FIXTURE_NOT_CUSTOMER_TRUTH',
   owner_user_id:scope.owner_user_id,work_item_id:scope.work_item_id},
 });
}

test('three typed atomic forms compile into topologically ordered candidate composition DAG',()=>{
 const forms=constructionFormSet();
 const graph=compileFormDAG({forms,targetId:'form:labor_schedule',scope});
 assert.deepEqual(graph.ordered_form_ids,[
  'form:inventory','form:inspection','form:labor_schedule']);
 assert.match(graph.manifest_hash,/^sha256:[a-f0-9]{64}$/);
 assert.equal(graph.status,'DRAFT_COMPOSITION_NOT_VERIFIED');
 assert.equal(graph.externally_authorized,false);
 assert.equal(graph.allowed_effects.length,0);
});
test('actual three-form conflict produces useful schedule draft without action, even when crew available',async()=>{
 const r=await run();
 assert.equal(r.status,'SANDBOX_COMPOSED_DRAFT_ONLY');
 assert.equal(r.result.kind,'DRAFT_ONLY');
 assert.equal(r.result.confirmable,false);
 assert.deepEqual(r.result.reasons,['INVENTORY_UNVERIFIED','INSPECTION_UNVERIFIED']);
 assert.equal(r.execution_trace.length,3);
 assert.equal(r.external_actions,0);
 assert.equal(r.customer_data_mutated,false);
 assert.equal(r.permission_decision,'EPISTEMIC_HUMAN_REVIEW_REQUIRED');
});
test('reported PASS and matching foreman numbers cannot silently authorize real-world schedule',async()=>{
 const r=await run(constructionFormSet(),[],{
  foreman_a:152,foreman_b:152,inspection_status:'PASS',crew_available:true,
 });
 assert.equal(r.result.confirmable,false);
 assert.equal(r.external_actions,0);
});
test('strict source-independent Fréchet bounds avoid multiplying possibly dependent confidence estimates',()=>{
 const forms=constructionFormSet().map((f,i)=>
  atomic(['inventory','inspection','labor_schedule'][i],
   f.inputs,f.output,f.parents,
   bounded([.90,.85,.70][i],[.95,.92,.80][i],'calibration:synthetic:'+i)));
 const interval=propagateBoundedEpistemicInterval(forms);
 assert.equal(interval.lower,.45);
 assert.equal(interval.upper,.80);
 assert.equal(interval.assumption,'MARGINAL_EVENT_BOUNDS_ONLY_NO_INDEPENDENCE');
 assert.equal(interval.usable_for_autonomous_authority,false);
});
test('uncalibrated scores never become proof of permission',()=>{
 const interval=propagateBoundedEpistemicInterval(constructionFormSet());
 assert.deepEqual([interval.lower,interval.upper],[0,1]);
 assert.equal(interval.kind,'UNKNOWN_UNCALIBRATED');
});
test('even artificially narrow bounds cannot authorize real email or work-order action',async()=>{
 const forms=constructionFormSet(bounded(.999,1,'simulated:calibration:does-not-prove-authority'));
 const r=await run(forms);
 assert.equal(r.permission_decision,'EVIDENCE_AND_AUTHORIZATION_STILL_REQUIRED');
 assert.equal(r.external_actions,0);
});
test('dependency with an input/output type mismatch is rejected before execution',()=>{
 const [a,b,c]=constructionFormSet();
 const altered=defineAtomicForm({formId:c.form_id,scope,
  inputs:[ports.str('inventory_gate'),ports.gate('inspection_gate'),
   ports.bool('crew_available')],output:c.output,parents:c.parents,
  competence:c.competence,handlerId:c.handler_id,epistemic});
 assert.throws(()=>compileFormDAG({forms:[a,b,altered],
  targetId:altered.form_id,scope}),/COMPOSITION_TYPE_MISMATCH/);
});
test('missing parent or graph cycle fails closed',()=>{
 const [a,b,c]=constructionFormSet();
 const broken=defineAtomicForm({formId:c.form_id,scope,inputs:c.inputs,output:c.output,
  parents:[{parent_id:'form:missing',input_name:'inventory_gate'},c.parents[1]],
  competence:c.competence,handlerId:c.handler_id,epistemic});
 assert.throws(()=>compileFormDAG({forms:[a,b,broken],
  targetId:broken.form_id,scope}),/COMPOSITION_DEPENDENCY_MISSING/);
 const self=defineAtomicForm({formId:c.form_id,scope,inputs:c.inputs,output:c.output,
  parents:[{parent_id:c.form_id,input_name:'inventory_gate'},c.parents[1]],
  competence:c.competence,handlerId:c.handler_id,epistemic});
 assert.throws(()=>compileFormDAG({forms:[a,b,self],
  targetId:self.form_id,scope}),/COMPOSITION_CYCLE_REJECTED/);
});
test('forged altered interface hash is rejected, and cross-owner graph cannot be compiled',()=>{
 const forms=constructionFormSet();
 assert.throws(()=>compileFormDAG({
  forms:[{...forms[0],handler_id:'malicious:fake'},...forms.slice(1)],
  targetId:'form:labor_schedule',scope}),/COMPOSITION_FORM_HASH_MISMATCH/);
 assert.throws(()=>compileFormDAG({
  forms,targetId:'form:labor_schedule',scope:{...scope,owner_user_id:'attacker'},
 }),/COMPOSITION_SCOPE_MISMATCH/);
});
test('required pure handler missing is a hard failure, not an implicit arbitrary code execution',async()=>{
 const forms=constructionFormSet(),plan=compileFormDAG({
  forms,targetId:'form:labor_schedule',scope});
 await assert.rejects(runCompositionSandbox({plan,forms,scope,input,
  registeredHandlers:handlers.slice(1),revocationEvents:[],...dates,
 }),/COMPOSITION_TRUSTED_SANDBOX_HANDLER_REQUIRED/);
});
test('historical as-of forks cannot see records that were learned after knowledge time',()=>{
 const older=snapshot('snapshot:old',
  {...input,supplier_delay_days:0},
  '2026-10-22T09:00:00Z','2026-10-22T10:00:00Z');
 const later=snapshot('snapshot:new',
  {...input,foreman_b:154,supplier_delay_days:1},
  '2026-10-22T09:00:00Z','2026-10-22T11:00:00Z');
 const early=createBitemporalGhostFork({entries:[older,later],scope,
  ...dates,mutations:[{field:'supplier_delay_days',value:3}]});
 assert.equal(early.source_snapshot_entry_id,'snapshot:old');
 assert.equal(early.hypothetical_state.supplier_delay_days,3);
 assert.equal(early.authentic_outcome_observed,false);
 assert.equal(older.payload.state.supplier_delay_days,0);
 const late=createBitemporalGhostFork({entries:[older,later],scope,
  validAt:dates.validAt,knownAt:'2026-10-22T12:00:00Z'});
 assert.equal(late.source_snapshot_entry_id,'snapshot:new');
 assert.equal(late.hypothetical_state.foreman_b,154);
});
test('counterfactual fork cannot invent an unapproved new observed property',()=>{
 const older=snapshot('snapshot:old',input,
  '2026-10-22T09:00:00Z','2026-10-22T10:00:00Z');
 assert.throws(()=>createBitemporalGhostFork({entries:[older],scope,
  ...dates,mutations:[{field:'homeowner_authorized',value:true}]}),
 /GHOST_MUTATION_UNKNOWN_FIELD/);
});
test('bitemporal revocation of atomic inventory form transitively suspends composed schedule',async()=>{
 const forms=constructionFormSet();
 const rev=makeRevocationSignal({
  scope,formId:'form:inventory',reason:'Original calibration invalidated',
  sourceReceipt:'third-party:adjudicated:error:001',...dates,
 });
 const closure=computeRevocationClosure({
  forms,revocationEvents:[rev],scope,...dates});
 assert.deepEqual(closure.direct_revoked_ids,['form:inventory']);
 assert.deepEqual(closure.suspended_ids,['form:inventory','form:labor_schedule']);
 const r=await run(forms,[rev]);
 assert.equal(r.status,'SUSPENDED_DEPENDENCY');
 assert.equal(r.executed_handlers,0);
 assert.equal(r.external_actions,0);
});
test('revocation only acts as known at cutoff, without rewriting historical facts',()=>{
 const forms=constructionFormSet();
 const rev=makeRevocationSignal({
  scope,formId:'form:inventory',reason:'Delayed inspector notice',
  sourceReceipt:'third-party:adjudicated:error:002',
  validAt:'2026-10-22T09:00:00Z',
  knownAt:'2026-10-22T12:00:00Z',
 });
 assert.equal(computeRevocationClosure({
  forms,revocationEvents:[rev],scope,...dates}).suspended_ids.length,0);
 assert.equal(computeRevocationClosure({
  forms,revocationEvents:[rev],scope,
  validAt:dates.validAt,knownAt:'2026-10-22T13:00:00Z',
 }).suspended_ids.length,2);
});
test('wrong owner revocation cannot invalidate another tenant capability graph',()=>{
 const forms=constructionFormSet();
 const rev=makeRevocationSignal({
  scope:{...scope,owner_user_id:'other-owner'},formId:'form:inventory',
  reason:'foreign scope',sourceReceipt:'foreign:receipt',...dates,
 });
 assert.throws(()=>computeRevocationClosure({
  forms,revocationEvents:[rev],scope,...dates}),
 /REVOCATION_FOREIGN_SCOPE_REJECTED/);
});
test('crystallization creates an unverified higher-order candidate, never deployed verified competence',async()=>{
 const forms=constructionFormSet();
 const plan=compileFormDAG({forms,targetId:'form:labor_schedule',scope});
 const proofRun=await run(forms);
 const candidate=createCompositeFormCandidate({plan,proofRun,scope});
 assert.equal(candidate.state,'CANDIDATE_UNVERIFIED');
 assert.equal(candidate.independently_authorized_for_distribution,false);
 assert.equal(candidate.production_authority_granted,false);
 assert.equal(candidate.content_hash_is_not_signature,true);
 assert.equal(candidate.dependency_hashes.length,3);
});
test('Reasoning Delta cannot claim improvement without independent paired labels',()=>{
 const delta=calculateReasoningDelta({
  standalone:{cases:5,correct:3,tokens:200,latency_ms:200},
  composed:{cases:5,correct:5,tokens:120,latency_ms:120},
 });
 assert.equal(delta.status,'NOT_MEASURED_INDEPENDENTLY');
 assert.equal(delta.operational_improvement_proven,false);
});
test('independently assessed paired metrics report accuracy, hard violations and full costs separately',()=>{
 const a={independently_adjudicated:true,assessment_receipt:'independent:casepack:v1',
  cases:10,correct:6,invariant_violations:2,false_facts:1,tokens:8000,latency_ms:10000};
 const b={...a,correct:9,invariant_violations:0,false_facts:0,tokens:3000,latency_ms:5000};
 const delta=calculateReasoningDelta({standalone:a,composed:b});
 assert.equal(delta.accuracy_difference_pp,30);
 assert.equal(delta.change_in_invariant_violations,-2);
 assert.equal(delta.relative_total_tokens,.375);
 assert.equal(delta.relative_total_latency,.5);
 assert.equal(delta.composite_better_on_all_observed_dimensions,true);
 assert.equal(delta.superintelligence_proven,false);
});

test('runtime invariant forbids an otherwise trusted handler from forging a confirmed schedule',async()=>{
 const forms=constructionFormSet(),plan=compileFormDAG({
  forms,targetId:'form:labor_schedule',scope});
 const hostile=[...handlers.slice(0,2),{
  id:'handler:labor_schedule',trusted_pure_sandbox:true,
  execute:async()=>({type:'SCHEDULE',value:{
   kind:'CONFIRMED',confirmable:true,reasons:[],
  }}),
 }];
 await assert.rejects(runCompositionSandbox({plan,forms,scope,input,
  registeredHandlers:hostile,revocationEvents:[],...dates}),
 /COMPOSITION_SCHEDULE_POSTCONDITION_FAILED/);
});
test('invariant forbids handler from asserting a non-boolean check was verified',async()=>{
 const forms=constructionFormSet(),plan=compileFormDAG({
  forms,targetId:'form:labor_schedule',scope});
 const hostile=[{
  id:'handler:inventory',trusted_pure_sandbox:true,
  execute:async()=>({type:'GATE',value:{clear:'YES',reason:'source is magically approved'}}),
 },...handlers.slice(1)];
 await assert.rejects(runCompositionSandbox({plan,forms,scope,input,
  registeredHandlers:hostile,revocationEvents:[],...dates}),
 /COMPOSITION_GATE_POSTCONDITION_FAILED/);
});
