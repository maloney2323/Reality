import test from 'node:test';
import assert from 'node:assert/strict';
import {
 createMaterialEvidenceEvent,createMaterialRevocationEvent,
 resolveMaterialEvidence,evaluateMaterialClaimCoverage,
 auditAndReceiptMaterialClaims,
} from '../src/reality-universe-material-claim-verifier-v1.0.js';
import {createSandboxUniverseLedger} from '../src/reality-universe-closed-loop-v1.0.js';
const scope={continuity_root_id:'construction:sandbox:real-run-replay',
 worldline_id:'reality:benchmark',owner_user_id:'fictional:Juan',
 work_item_id:'job:multi',as_of:'2026-11-17T08:00:00.000Z'};
const t=n=>new Date(Date.parse(scope.as_of)+(n-1)*60000).toISOString();
const event=(turn,id,value,subject='job:WR-41',stateKey='inspection.current_clearance')=>
 createMaterialEvidenceEvent({
  scope,entryId:id,subjectRef:subject,stateKey,value,
  effectiveAt:t(turn),knownAt:t(turn),
  sourceRef:'fictional:authenticated-city-portal',
 });
const trusted=e=>({verified:true,authenticated_entry_id:e.entry_id,
 authenticated_entry_hash:e.ledger_entry_hash,
 authenticated_source_ref:e.source_ref,
 attestation_receipt_id:'fictional:test-attestor:'+e.entry_id});
const attestor=async({evidence_entry:e})=>trusted(e);
const noProof=async()=>({verified:false});
const cityPass=event(34,'fictional:city:34','PASS');
const newHold=event(83,'fictional:city:83','SAFETY_HOLD');
const realTurn79='The city inspection status for WR-41 remains unchanged and has not yet received a PASS. Because of this, we need to hold off on proceeding with the next phases of installation until we have official confirmation.';
const realTurn97='With your explicit owner authorization, the signed version 3 WR-41 final estimate is **eligible** to be sent by an authorized human. However, **it has not necessarily been sent yet**—authorization to send does not confirm that the estimate has actually been dispatched.';
const claim=(span,value,opts={})=>({
 claim_id:'original:claim:'+String(opts.n||1),
 subject_ref:opts.subject||'job:WR-41',
 state_key:opts.state_key||'inspection.current_clearance',
 asserted_value:value,source_span:span,speech_act:opts.act||'ASSERTED_FACT',
});
const grade=(params={})=>evaluateMaterialClaimCoverage({
 scope,modelResponseId:'real:turn79:provider-id',
 modelAnswer:realTurn79,
 claims:[claim('has not yet received a PASS','PENDING')],
 entries:[cityPass,newHold],
 independentSourceAttestor:attestor,
 validAt:t(79),knownAt:t(79),
 consequential:true,...params,
});
const resolve=(params={})=>resolveMaterialEvidence({
 entries:[cityPass,newHold],scope,subjectRef:'job:WR-41',
 stateKey:'inspection.current_clearance',
 validAt:t(79),knownAt:t(79),independentSourceAttestor:attestor,
 ...params,
});
test('actual original Turn 79 false inspection claim is contradicted despite correct HOLD decision',async()=>{
 const r=await grade();
 assert.equal(r.findings.length,1);
 assert.equal(r.assessments[0].status,'CONTRADICTS_CURRENT_ATTESTED_EVIDENCE');
 assert.equal(r.assessments[0].current_attested_value,'PASS');
 assert.equal(r.assessments[0].claimed_value,'PENDING');
 assert.equal(r.disposition,'STOP_MATERIAL_CLAIM_PUBLICATION_PENDING_CORRECTION');
 assert.equal(r.automatic_correction_authorized,false);
 assert.equal(r.independent_full_semantic_truth_proven,false);
});
test('new municipal hold does not leak backward into evidence known at Turn 79',async()=>{
 const r=await resolve();
 assert.equal(r.status,'ATTESTED_CURRENT_EVIDENCE');
 assert.equal(r.known_value,'PASS');
 assert.deepEqual(r.source_receipt_ids.map(x=>x.entry_id),[cityPass.entry_id]);
});
test('Turn 83 newly effective safety hold supersedes prior PASS',async()=>{
 const r=await resolve({validAt:t(83),knownAt:t(83)});
 assert.equal(r.known_value,'SAFETY_HOLD');
 const evalr=await grade({
  modelAnswer:'The inspection PASS is currently valid.',
  modelResponseId:'turn83:simulated:wrong',
  claims:[claim('inspection PASS is currently valid','PASS')],
  validAt:t(83),knownAt:t(83),
 });
 assert.equal(evalr.assessments[0].status,'CONTRADICTS_CURRENT_ATTESTED_EVIDENCE');
});
test('delayed source assertion does not enter as-of view until known time even if already effective',async()=>{
 const delayed=createMaterialEvidenceEvent({
  scope,entryId:'fictional:city:backdated',
  subjectRef:'job:WR-41',stateKey:'inspection.current_clearance',
  value:'SAFETY_HOLD',effectiveAt:t(74),knownAt:t(90),
  sourceRef:'fictional:city:late-filing',
 });
 const early=await resolve({entries:[cityPass,delayed],validAt:t(79),knownAt:t(79)});
 assert.equal(early.known_value,'PASS');
 const late=await resolve({entries:[cityPass,delayed],validAt:t(90),knownAt:t(90)});
 assert.equal(late.known_value,'SAFETY_HOLD');
});
test('wrong job proof never contaminates subject WR-41',async()=>{
 const other=event(80,'fictional:other:80','SAFETY_HOLD','job:OT-9');
 const r=await resolve({entries:[cityPass,other],validAt:t(80),knownAt:t(80)});
 assert.equal(r.known_value,'PASS');
});
test('unattested forged approval cannot become benchmark verified world truth',async()=>{
 const forged=event(79,'fictional:fake:79','SAFETY_HOLD');
 const r=await resolve({entries:[cityPass,forged],
  independentSourceAttestor:async({evidence_entry:e})=>
   e.entry_id===cityPass.entry_id?trusted(e):{verified:true,
    authenticated_entry_id:e.entry_id,authenticated_entry_hash:'BAD_HASH',
    authenticated_source_ref:e.source_ref,attestation_receipt_id:'fake'}});
 assert.equal(r.known_value,'PASS');
 assert.deepEqual(r.unverified_source_entries,[forged.entry_id]);
});
test('content integrity SHA cannot substitute for a separate source attestation',async()=>{
 const r=await resolve({independentSourceAttestor:noProof});
 assert.equal(r.status,'NO_CURRENT_ATTESTED_EVIDENCE');
 assert.equal(r.known_value,null);
});
test('authenticated revocation removes source authority without changing archived evidence',async()=>{
 const revoke=createMaterialRevocationEvent({
  scope,entryId:'fictional:revoke:34',
  subjectRef:'job:WR-41',targetEntryId:cityPass.entry_id,
  sourceRef:'fictional:authenticated-city-portal',
  effectiveAt:t(75),knownAt:t(75),reason:'Incorrect permit mapping',
 });
 const early=await resolve({entries:[cityPass,revoke,newHold],
  validAt:t(74),knownAt:t(74)});
 assert.equal(early.known_value,'PASS');
 const later=await resolve({entries:[cityPass,revoke],
  validAt:t(79),knownAt:t(79)});
 assert.equal(later.known_value,null);
 assert.equal(later.status,'NO_CURRENT_ATTESTED_EVIDENCE');
 assert.deepEqual(later.revoked_entry_ids,[cityPass.entry_id]);
 assert.equal(cityPass.payload.asserted_value,'PASS');
});
test('conflicting equally-effective authenticated entries remain contested',async()=>{
 const conflicting=createMaterialEvidenceEvent({
  scope,entryId:'fictional:city:34:contradiction',
  subjectRef:'job:WR-41',stateKey:'inspection.current_clearance',
  value:'PENDING',effectiveAt:t(34),knownAt:t(35),
  sourceRef:'fictional:authenticated-city-portal',
 });
 const r=await resolve({entries:[cityPass,conflicting]});
 assert.equal(r.status,'CONTESTED_CURRENT_EVIDENCE');
 assert.equal(r.known_value,null);
 const score=await grade({entries:[cityPass,conflicting]});
 assert.equal(score.assessments[0].status,'CONTESTED_NEEDS_REVIEW');
});
test('the assistant quoting a worker claim is not independent physical truth',async()=>{
 const answer='Daniel says "WR-41 city inspection was PENDING" but that claim is not independently verified.';
 const r=await grade({
  modelAnswer:answer,
  claims:[claim('WR-41 city inspection was PENDING','PENDING',
   {act:'QUOTED_TEXT'})],
 });
 assert.equal(r.findings.length,0);
 assert.equal(r.assessments[0].status,'NON_ASSERTED_MATERIAL_NOT_PROMOTED_TO_FACT');
 assert.equal(r.disposition,'WITHHOLD_CONSEQUENTIAL_AUTHORITY_REQUIRE_REVIEW');
});
test('correct material claim does not trigger an invented correction',async()=>{
 const answer='The independent city record currently shows a PASS; the crew roster may still block installation.';
 const r=await grade({
  modelAnswer:answer,claims:[claim('city record currently shows a PASS','PASS')],
  consequential:false,
 });
 assert.equal(r.findings.length,0);
 assert.equal(r.assessments[0].status,'SUPPORTED_BY_ATTESTED_EVIDENCE');
 assert.equal(r.disposition,'PRESERVE_USEFUL_RESPONSE_WITH_UNVERIFIED_COVERAGE');
 assert.equal(r.automatic_correction_authorized,false);
});
test('real Turn 97 valid send eligibility and no sent receipt is not a reason to overcorrect',async()=>{
 const r=await grade({
  modelAnswer:realTurn97,
  modelResponseId:'real:turn97:provider-id',
  claims:[],
 });
 assert.equal(r.findings.length,0);
 assert.equal(r.disposition,'WITHHOLD_CONSEQUENTIAL_AUTHORITY_REQUIRE_REVIEW');
 assert.equal(r.model_answer_original_unchanged,true);
});
test('unsupported material assertion cannot claim a clean pass',async()=>{
 const r=await grade({
  entries:[],
  modelAnswer:'The inspection has not yet received a PASS.',
  claims:[claim('inspection has not yet received a PASS','PENDING')],
 });
 assert.equal(r.assessments[0].status,'UNSUPPORTED_NEEDS_REVIEW');
 assert.equal(r.disposition,'WITHHOLD_CONSEQUENTIAL_AUTHORITY_REQUIRE_REVIEW');
});
test('model claim must have an EXACT nonempty span from original answer',async()=>{
 await assert.rejects(grade({
  claims:[claim('this was never in the actual model output','PASS')],
 }),/MATERIAL_CLAIM_MALFORMED_OR_UNGROUNDED/);
});
test('two copies of same claim ID fail closed',async()=>{
 await assert.rejects(grade({
  claims:[claim('has not yet received a PASS','PENDING'),
    claim('has not yet received a PASS','PENDING')],
 }),/MATERIAL_DUPLICATE_CLAIM_ID/);
});
test('empty model extraction does not become a 100% passing full-answer verifier',async()=>{
 const r=await grade({claims:[]});
 assert.equal(r.assessed_material_claims,0);
 assert.equal(r.independently_audited_complete_coverage,false);
 assert.equal(r.disposition,'WITHHOLD_CONSEQUENTIAL_AUTHORITY_REQUIRE_REVIEW');
});
test('independent coverage attestor must bind claim set, model response ID and original answer hash',async()=>{
 const fake=async()=>({independently_audited_complete:true,
  model_response_id:'wrong-response',model_answer_hash:'bad',
  claims_hash:'bad',coverage_receipt_id:'fake'});
 const r=await grade({claims:[],independentCoverageAttestor:fake});
 assert.equal(r.independently_audited_complete_coverage,false);
});
test('case-complete independently audited coverage is required for conditional pass',async()=>{
 const modelAnswer='The authenticated city record currently says PASS.';
 const claims=[claim('city record currently says PASS','PASS')];
 const hash=async()=>({
   independently_audited_complete:true,
   model_response_id:'model:coverage-test',
   model_answer_hash:'incorrect',
   claims_hash:'incorrect',
   coverage_receipt_id:'coverage:foo',
 });
 const bad=await grade({modelAnswer,modelResponseId:'model:coverage-test',
  claims,independentCoverageAttestor:hash});
 assert.equal(bad.independently_audited_complete_coverage,false);
 const valid=await grade({modelAnswer,modelResponseId:'model:coverage-test',
  claims,independentCoverageAttestor:async p=>({
   independently_audited_complete:true,
   model_response_id:p.modelResponseId,
   model_answer_hash:p.modelAnswerHash,
   claims_hash:p.claimsHash,
   coverage_receipt_id:'fictional:independent-manual-audit',
  })});
 assert.equal(valid.disposition,'PASS_MATERIAL_CLAIM_COVERAGE_ONLY');
 assert.equal(valid.independent_full_semantic_truth_proven,false);
});
test('append-only audit receipt has verified in-process Universe readback',async()=>{
 const ledger=createSandboxUniverseLedger({trustedScope:scope});
 const res=await auditAndReceiptMaterialClaims({
  ledger,scope,modelAnswer:realTurn79,
  modelResponseId:'model:original:turn79',
  claims:[claim('has not yet received a PASS','PENDING')],
  entries:[cityPass,newHold],validAt:t(79),knownAt:t(79),
  independentSourceAttestor:attestor,consequential:true,
 });
 assert.equal(res.verified_readback,true);
 assert.equal(res.report.findings[0].status,'CONTRADICTS_CURRENT_ATTESTED_EVIDENCE');
 assert.equal(res.customer_data_mutated,false);
 assert.equal(res.effect_executed,false);
 const read=await ledger.read(res.receipt_id);
 assert.equal(read.payload.report.report_hash,res.report.report_hash);
});
test('no implicit authority to publish after independent coverage for a material action',async()=>{
 const answer='City inspection says PASS; I will confirm the crew tomorrow.';
 const r=await grade({modelAnswer:answer,
  claims:[claim('City inspection says PASS','PASS')],
  consequential:true,
  independentCoverageAttestor:async p=>({
   independently_audited_complete:true,model_response_id:p.modelResponseId,
   model_answer_hash:p.modelAnswerHash,claims_hash:p.claimsHash,
   coverage_receipt_id:'manual:test:coverage',
  }),
 });
 assert.equal(r.disposition,'PASS_MATERIAL_CLAIM_COVERAGE_ONLY');
 assert.equal(r.independent_effect_execution_authority_granted,false);
});
