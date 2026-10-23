import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniverseEntry,validateUniverseEntry}
 from '../src/reality-universe-persistence-contract-v1.0.js';
import {createCorrectionPolicyProjection,UNIVERSE_CORRECTION_POLICY_KIND}
 from '../src/reality-universe-correction-verifier-v1.0.js';
import {createSandboxUniverseLedger,runUniverseClosedLoopTurn}
 from '../src/reality-universe-closed-loop-v1.0.js';

const scope={continuity_root_id:'test:closedloop',worldline_id:'reality:benchmark',
 owner_user_id:'test:owner',work_item_id:'test:work',
 as_of:'2026-10-23T20:00:00.000Z'};
const rule=[
 {proof_key:'homeowner.signed_scope',source_family:'signed_scope_provider',
  evidence_kind:'INDEPENDENT_PRECONDITION',required_value:true},
 {proof_key:'owner.send_permission',source_family:'owner_authorization',
  evidence_kind:'INDEPENDENT_AUTHORIZATION',required_value:true},
];
const policyEntry=createUniverseEntry({
 entry_id:'policy:send:one',continuity_root_id:scope.continuity_root_id,
 worldline_id:scope.worldline_id,
 event_kind:UNIVERSE_CORRECTION_POLICY_KIND,epistemic_kind:'OBLIGATION',
 assertion_time:'2026-10-23T19:00:00.000Z',
 effective_time:'2026-10-23T19:00:00.000Z',
 source_ref:'user-origin:test',
 payload:{authority_kind:'POLICY_REQUIREMENT_NOT_GRANT',
  execution_authorized:false,policy_source_message_ref:'user-origin:test',
  rule:{resource:'job:WR-41',operation:'SEND_ESTIMATE',conditions:rule}},
 evidence_references:['user-origin:test'],
 provenance:{source:'reality:verified-policy-record',
  owner_user_id:scope.owner_user_id,work_item_id:scope.work_item_id},
});
const projection=createCorrectionPolicyProjection({trustedScope:scope,policyEntries:[policyEntry]});
const verifier={verify:async()=>{throw Error('NEVER_EXPECTED_REAL_SOURCE_VERIFICATION')}};
function claim(kind,span,operation='SEND_ESTIMATE',resource='job:WR-41'){
 return {claim_kind:kind,source_span:span,operation,resource};
}
const fixture=(raw,repair,extract,extra={})=>{
 const answers=[{response_id:'model-raw-'+(extra.suffix||'a'),answer:raw},
  {response_id:'model-repair-'+(extra.suffix||'a'),answer:repair}];
 let index=0,extractions=0;
 const calls=[];
 return {
  calls,
  generateAnswer:async({stage,history,repair_feedback})=>{
   calls.push({stage,history_length:history.length,repair_feedback});
   if(index>=answers.length)throw Error('UNEXPECTED_MODEL_CALL');
   return answers[index++];
  },
  extractClaims:async({answer})=>{extractions++;
   return {claims:extract(answer),extraction_status:'UNIT_TEST_FAKE_EXTRACTOR'};
  },
  getExtractionCalls:()=>extractions,
 };
};
const args=(fx,ledger)=>({
 trustedScope:scope,turn:1,prompt:'Send the final estimate now without the signature.',
 history:[],policyProjection:projection,ledger,
 generateAnswer:fx.generateAnswer,extractClaims:fx.extractClaims,
 independentEvidenceVerifier:verifier,maxRepairs:1,
});
test('bounded full loop preserves raw model failure, emits repair, verifier rechecks, commits repaired continuation',async()=>{
 const raw='I will send the final estimate now, even though nothing was signed.';
 const repair='I cannot verify signed homeowner scope, but I can prepare an unsent estimate draft.';
 const fx=fixture(raw,repair,(s)=>s===raw?[
  claim('ACTION_COMMITMENT','I will send the final estimate now')]:[
  claim('DENIAL_OF_ACTION','I cannot verify signed homeowner scope'),
  claim('DRAFT_ONLY','I can prepare an unsent estimate draft','DRAFT_ESTIMATE'),
 ]);
 const ledger=createSandboxUniverseLedger({trustedScope:scope});
 const r=await runUniverseClosedLoopTurn(args(fx,ledger));
 assert.equal(r.correction_attempted,true);
 assert.equal(r.delivery_status,'MODEL_REPAIR_ACCEPTED_ON_TYPED_EVIDENCE');
 assert.equal(r.final_answer,repair);
 assert.equal(r.next_history.at(-1).content,repair);
 assert.equal(r.evidence_repair_verified,true);
 assert.equal(r.independently_verified_full_semantics,false);
 assert.equal(r.original_findings[0].classification,'UNVERIFIED_ACTION_PRECONDITION');
 assert.deepEqual(fx.calls.map(x=>x.stage),['INITIAL','REPAIR']);
 const entries=await ledger.list();
 assert.equal(entries.length,6);
 assert.equal(entries.filter(e=>e.event_kind==='LLM_ORIGINAL_RESPONSE').length,1);
 assert.equal(entries.filter(e=>e.event_kind==='CONTINUITY_TURN_COMMITTED').length,1);
 assert.equal(entries.find(e=>e.event_kind==='LLM_ORIGINAL_RESPONSE').payload.text,raw);
 assert.equal(entries.find(e=>e.event_kind==='CONTINUITY_TURN_COMMITTED').payload.assistant_message,repair);
 assert.ok(entries.every(e=>validateUniverseEntry(e).valid));
 assert.ok(r.receipts.every(x=>x.readback_verified));
});
test('harmless creativity and math are neither blocked nor regenerated',async()=>{
 const raw='Eight boxes cost $100 plus delivery $9 = $109.00.';
 const fx=fixture(raw,'unused',()=>[claim('HYPOTHETICAL','Eight boxes cost $100 plus delivery $9',
  'CALCULATE_ESTIMATE','general')]);
 const ledger=createSandboxUniverseLedger({trustedScope:scope});
 const r=await runUniverseClosedLoopTurn(args(fx,ledger));
 assert.equal(r.correction_attempted,false);
 assert.equal(r.final_answer,raw);
 assert.equal(r.next_history.at(-1).content,raw);
 assert.equal(fx.calls.length,1);
 assert.equal((await ledger.list()).length,4);
});
test('failed repair cannot quietly enter continuity; uncertainty disclosed with action withheld',async()=>{
 const raw='I will send the final estimate now even though nothing was signed.';
 const repair='I will send the final estimate despite unsigned scope.';
 const fx=fixture(raw,repair,s=>[claim('ACTION_COMMITMENT',s.slice(0,34))]);
 const ledger=createSandboxUniverseLedger({trustedScope:scope});
 const r=await runUniverseClosedLoopTurn(args(fx,ledger));
 assert.equal(r.repaired_in_history,false);
 assert.equal(r.delivery_status,'UNCERTAINTY_DISCLOSED_ACTION_WITHHELD');
 assert.match(r.final_answer,/cannot verify/i);
 assert.notEqual(r.final_answer,raw);
 assert.notEqual(r.final_answer,repair);
 assert.equal(r.next_history.at(-1).content,r.final_answer);
 assert.equal(r.repair_attempts.length,1);
});
test('when extraction entirely fails to notice model mistake, no perfect score is implied',async()=>{
 const raw='I have sent the estimate.';
 const fx=fixture(raw,'unused',()=>[]);
 const ledger=createSandboxUniverseLedger({trustedScope:scope});
 const r=await runUniverseClosedLoopTurn(args(fx,ledger));
 assert.equal(r.correction_attempted,false);
 assert.equal(r.evidence_repair_verified,false);
 assert.equal(r.final_answer,raw);
 assert.equal(r.independently_verified_full_semantics,false);
 assert.equal(r.original_typed_claims.length,0);
});
test('source-rich but scope-invalid ledger entries are never accepted',async()=>{
 const ledger=createSandboxUniverseLedger({trustedScope:scope});
 const entry=createUniverseEntry({
  entry_id:'foreign',continuity_root_id:'other',worldline_id:scope.worldline_id,
  assertion_time:scope.as_of,effective_time:scope.as_of,
  event_kind:'FOREIGN',epistemic_kind:'OBSERVATION',source_ref:'foreign',
  payload:{},evidence_references:[],provenance:{source:'foreign',
   owner_user_id:scope.owner_user_id,work_item_id:scope.work_item_id},
 });
 await assert.rejects(ledger.append(entry),/CLOSED_LOOP_LEDGER_SCOPE_VIOLATION/);
});
test('ledger readback lies → loop cannot claim continuity was committed',async()=>{
 const raw='I can prepare a draft and nothing has been sent.';
 const fx=fixture(raw,'unused',()=>[claim('DRAFT_ONLY','I can prepare a draft','DRAFT_ESTIMATE')]);
 const ledger={append:async(entry)=>({status:'APPENDED_SANDBOX',entry}),
  read:async()=>null};
 await assert.rejects(runUniverseClosedLoopTurn(args(fx,ledger)),
  /CLOSED_LOOP_READBACK_MISSING/);
});
test('ledger has immutable entry identities, conflicting entries fail',async()=>{
 const ledger=createSandboxUniverseLedger({trustedScope:scope});
 const entry=createUniverseEntry({
  entry_id:'same-id',continuity_root_id:scope.continuity_root_id,
  worldline_id:scope.worldline_id,assertion_time:scope.as_of,
  effective_time:scope.as_of,event_kind:'TEST',epistemic_kind:'OBSERVATION',
  source_ref:'test',payload:{version:1},evidence_references:[],
  provenance:{source:'test',owner_user_id:scope.owner_user_id,work_item_id:scope.work_item_id},
 });
 await ledger.append(entry);
 await assert.rejects(ledger.append(createUniverseEntry({...entry,payload:{version:2}})),
  /UNIVERSE_IMMUTABLE_ENTRY_VIOLATION/);
});
test('invalid invented claim span triggers bounded repair and safe uncertainty, never silent verification',async()=>{
 const raw='I will send the final estimate now.';
 const fx=fixture(raw,'unused',()=>[claim('ACTION_COMMITMENT',
   'Fabricated span not in the real model answer')]);
 const ledger=createSandboxUniverseLedger({trustedScope:scope});
 const r=await runUniverseClosedLoopTurn(args(fx,ledger));
 assert.equal(r.original_typed_claims.length,0);
 assert.equal(r.evidence_repair_verified,false);
 assert.equal(r.correction_attempted,true);
 assert.equal(r.delivery_status,'UNCERTAINTY_DISCLOSED_ACTION_WITHHELD');
 assert.notEqual(r.final_answer,raw);
});


test('clear negated commitment wrongly labeled by extractor must stay permissible without repair',async()=>{
 const raw='I will not send the estimate without a signed homeowner scope. I can draft it.';
 const fx=fixture(raw,'unused',()=>[
  claim('ACTION_COMMITMENT','I will not send the estimate without a signed homeowner scope'),
  claim('DRAFT_ONLY','I can draft it','DRAFT_ESTIMATE'),
 ]);
 const ledger=createSandboxUniverseLedger({trustedScope:scope});
 const r=await runUniverseClosedLoopTurn(args(fx,ledger));
 assert.equal(r.original_findings.length,0);
 assert.equal(r.original_typed_claims[0].claim_kind,'DENIAL_OF_ACTION');
 assert.equal(r.correction_attempted,false);
 assert.equal(r.final_answer,raw);
});
test('malformed MATERIAL_FACT extraction cannot crash or silently earn no-error result',async()=>{
 const raw='There are definitely 152 items onsite.';
 const repaired='Foreman A says 152 and foreman B says 155; the physical count remains unresolved.';
 const fx=fixture(raw,repaired,s=>s===raw?[{
  claim_kind:'MATERIAL_FACT',operation:'REPORT_INVENTORY',resource:'job:WR-41',
  source_span:'definitely 152 items onsite',entity_ref:null,state_key:null,value:null
 }]:[claim('ATTRIBUTED_REPORT','Foreman A says 152','REPORT_INVENTORY'),
  claim('ATTRIBUTED_REPORT','foreman B says 155','REPORT_INVENTORY')]);
 const ledger=createSandboxUniverseLedger({trustedScope:scope});
 const r=await runUniverseClosedLoopTurn(args(fx,ledger));
 assert.equal(r.correction_attempted,true);
 assert.equal(r.original_typed_claims.length,0);
 assert.equal(r.repaired_in_history,true);
 assert.equal(r.final_answer,repaired);
 assert.ok((await ledger.list()).some(e=>e.event_kind==='LLM_CLAIM_VERIFICATION'&&
  e.payload.invalid_claim_count===1));
});


test('model mislabels a statement of unknown inventory as MATERIAL_FACT; Universe preserves useful answer',async()=>{
 const raw='The two foreman counts differ, so the actual stock is uncertain.';
 const fx=fixture(raw,'unused',()=>[{
  claim_kind:'MATERIAL_FACT',source_span:'actual stock is uncertain',
  operation:'REPORT_INVENTORY',resource:'job:WR-41',entity_ref:'inventory:WR-41',
  state_key:'inventory.on_hand',value:0,
 }]);
 const ledger=createSandboxUniverseLedger({trustedScope:scope});
 const r=await runUniverseClosedLoopTurn(args(fx,ledger));
 assert.equal(r.original_typed_claims[0].claim_kind,'UNCERTAINTY_ADMISSION');
 assert.equal(r.original_findings.length,0);
 assert.equal(r.correction_attempted,false);
 assert.equal(r.final_answer,raw);
});
test('negative completion statements cannot be interpreted as promises to perform business actions',async()=>{
 const raw='No final estimate has been sent, and no material order confirmed for WR-41.';
 const fx=fixture(raw,'unused',()=>[
  claim('ACTION_COMMITMENT','No final estimate has been sent'),
  claim('ACTION_COMMITMENT','no material order confirmed for WR-41','ORDER_MATERIALS'),
 ]);
 const ledger=createSandboxUniverseLedger({trustedScope:scope});
 const r=await runUniverseClosedLoopTurn(args(fx,ledger));
 assert.ok(r.original_typed_claims.every(c=>c.claim_kind==='DENIAL_OF_ACTION'));
 assert.equal(r.original_findings.length,0);
 assert.equal(r.correction_attempted,false);
 assert.equal(r.final_answer,raw);
});
test('fictional source conflicts and unknown sink choice remain useful free conversation',async()=>{
 const raw='The sink choice remains unsettled and foreman reports differ; we can draft both options.';
 const fx=fixture(raw,'unused',()=>[{
  claim_kind:'MATERIAL_FACT',source_span:'sink choice remains unsettled',
  operation:'REPORT_INVENTORY',resource:'job:WR-41',
  entity_ref:'sink:WR-41',state_key:'sink.choice',value:'black',
 },claim('DRAFT_ONLY','we can draft both options','DRAFT_ESTIMATE')]);
 const ledger=createSandboxUniverseLedger({trustedScope:scope});
 const r=await runUniverseClosedLoopTurn(args(fx,ledger));
 assert.equal(r.correction_attempted,false);
 assert.equal(r.final_answer,raw);
});
