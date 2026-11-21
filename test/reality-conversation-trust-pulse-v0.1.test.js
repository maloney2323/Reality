import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {
 buildConversationTrustPulse,buildUnmonitoredTrustPulse,
} from '../src/reality-conversation-trust-pulse-v0.1.js';
const VERSION='reality-continuous-reliability-v0.1';
const raw=n=>({event_kind:'RAW_SIGNAL',event_id:'raw:'+n});
const assessment=(n,overrides={})=>({
 event_kind:'VERIFICATION',event_id:'receipt:'+n,
 payload:{
  cycle_version:VERSION,event_type:'MODEL_OUTPUT_ASSESSMENT',turn:n,
  evaluation_status:'NOT_EVALUATED',drift:[],hallucination_suspected:[],
  independent_truth_adjudication:false,extraction_completeness_verified:false,
  model_output_quarantined:false,correction_proposed:false,
  recovery_independently_verified:false,...overrides,
 }
});
const history=(total,fn=n=>assessment(n))=>[
 ...Array.from({length:total},(_,i)=>raw(i+1)),
 ...Array.from({length:total},(_,i)=>fn(i+1)),
];

test('disabled monitoring cannot masquerade as clean coverage',()=>{
 const p=buildUnmonitoredTrustPulse();
 assert.equal(p.status,'NOT_MONITORED');
 assert.equal(p.turn,null);
 assert.equal(p.whole_response_verified,false);
 assert.equal(p.drift_free_claim_allowed,false);
});

test('one unassessed turn says verification incomplete, not zero drift',()=>{
 const p=buildConversationTrustPulse({history:history(1),turn:1});
 assert.equal(p.status,'COVERAGE_INSUFFICIENT');
 assert.equal(p.detected_codes.length,0);
 assert.equal(p.whole_response_verified,false);
 assert.equal(p.drift_free_claim_allowed,false);
 assert.equal(p.digest,null);
 assert.equal(p.next_digest_in_turns,9);
 assert.equal(p.evidence_receipt_id,'receipt:1');
});

test('source-attested structured check without full extraction is explicitly limited',()=>{
 const p=buildConversationTrustPulse({history:history(1,n=>assessment(n,{
  evaluation_status:'EVALUATED_AGAINST_SOURCE_ATTESTATION',
 })),turn:1});
 assert.equal(p.status,'NO_FINDINGS_IN_LIMITED_CHECK');
 assert.match(p.note,/entire answer was not independently adjudicated/);
 assert.equal(p.whole_response_verified,false);
});

test('detected factual drift is attributed and contained, never called independently repaired',()=>{
 const p=buildConversationTrustPulse({history:history(1,n=>assessment(n,{
  evaluation_status:'EVALUATED_AGAINST_SOURCE_ATTESTATION',
  drift:['FACT_DRIFT'],model_output_quarantined:true,correction_proposed:true,
 })),turn:1});
 assert.equal(p.status,'DETECTED_AND_CONTAINED');
 assert.deepEqual(p.detected_codes,['FACT_DRIFT']);
 assert.equal(p.correction_proposed,true);
 assert.equal(p.repair_independently_verified,false);
 assert.equal(p.whole_response_verified,false);
});

test('detection without verified containment is a review warning',()=>{
 const p=buildConversationTrustPulse({history:history(1,n=>assessment(n,{
  evaluation_status:'EVALUATED_AGAINST_SOURCE_ATTESTATION',
  hallucination_suspected:['UNSUPPORTED_CLAIM'],
 })),turn:1});
 assert.equal(p.status,'FINDINGS_NEED_REVIEW');
});

test('10-turn digest gives verified receipt coverage, not a fabricated drift-free rate',()=>{
 const data=history(10,n=>assessment(n,{
  evaluation_status:n<=7?'EVALUATED_AGAINST_SOURCE_ATTESTATION':'NOT_EVALUATED',
  drift:n===4?['FACT_DRIFT']:[],
  model_output_quarantined:n===4,
 }));
 const p=buildConversationTrustPulse({history:data,turn:10});
 const d=p.digest;
 assert.equal(p.turn,10);
 assert.equal(p.next_digest_in_turns,10);
 assert.equal(d.window_start,1);
 assert.equal(d.window_end,10);
 assert.equal(d.assessment_receipts,10);
 assert.equal(d.source_attested_structured_checks,7);
 assert.equal(d.independently_fully_adjudicated_turns,0);
 assert.equal(d.insufficient_or_partially_assessed_turns,10);
 assert.equal(d.turns_with_typed_findings,1);
 assert.equal(d.model_outputs_contained,1);
 assert.equal(d.open_or_unverified_incident_turns,1);
 assert.equal(d.drift_rate_pct,null);
 assert.equal(d.hallucination_rate_pct,null);
 assert.equal(d.all_clear,false);
});

test('20-turn digest retains previously detected open incidents from turns 1-10',()=>{
 const data=history(20,n=>assessment(n,n===4?{
  evaluation_status:'EVALUATED_AGAINST_SOURCE_ATTESTATION',
  drift:['OBLIGATION_LOSS'],
 }:{}));
 const p=buildConversationTrustPulse({history:data,turn:20});
 assert.equal(p.digest.window_start,11);
 assert.equal(p.digest.turns_with_typed_findings,0);
 assert.equal(p.digest.open_or_unverified_incident_turns,1);
 assert.equal(p.digest.all_clear,false);
});

test('complete independent adjudication can say checked clear only about the current turn',()=>{
 const p=buildConversationTrustPulse({history:history(1,n=>assessment(n,{
  evaluation_status:'EVALUATED_AGAINST_SOURCE_ATTESTATION',
  extraction_completeness_verified:true,independent_truth_adjudication:true,
 })),turn:1});
 assert.equal(p.status,'CHECKED_NO_FINDINGS_FULLY_ADJUDICATED');
 assert.equal(p.whole_response_verified,true);
 assert.equal(p.drift_free_claim_allowed,false);
});

test('malformed missing receipts are not upgraded into a reassuring result',()=>{
 assert.throws(()=>buildConversationTrustPulse({history:history(1),turn:2}),/TRUST_PULSE_TURN_MISMATCH/);
 assert.throws(()=>buildConversationTrustPulse({history:[raw(1)],turn:1}),/TRUST_PULSE_ASSESSMENT_RECEIPT_REQUIRED/);
 assert.throws(()=>buildConversationTrustPulse({history:history(1).concat(assessment(1)),turn:1}),
   /TRUST_PULSE_ASSESSMENT_RECEIPT_REQUIRED/);
});

test('chat UI consumes receipt pulse after server response and surfaces the ten-turn digest',()=>{
 const html=readFileSync('index.html','utf8');
 assert.match(html,/id="trustPulseTitle"/);
 assert.match(html,/id="trustDigest"/);
 assert.match(html,/id="trustDigestBody"/);
 assert.match(html,/renderTrustPulse\(b\.result\?\.reliability\?\.trust_pulse\)/);
 assert.match(html,/conversation_id:trustConversationId\(\)/);
 assert.match(html,/historical incidents stay visible/i);
 const script=html.match(/<script>([\s\S]*?)<\/script>/);
 assert.ok(script);
 assert.doesNotThrow(()=>new vm.Script(script[1]));
});
