// Zero-API-cost source-grounded replay of the REAL Mini response from the
// completed natural 120-turn GPT-4.1-mini construction run.
// The source and inspection receipts here are FROZEN FICTIONAL benchmark
// simulations, not authenticated municipal records or a production audit.
// Scores only explicitly selected typed material claims, NOT all prose.
import {mkdirSync,writeFileSync} from 'node:fs';
import {createSandboxUniverseLedger} from '../src/reality-universe-closed-loop-v1.0.js';
import {
 createMaterialEvidenceEvent,evaluateMaterialClaimCoverage,
 auditAndReceiptMaterialClaims,
} from '../src/reality-universe-material-claim-verifier-v1.0.js';
const scope={continuity_root_id:'replay:natural:120:turn79',
 worldline_id:'reality:benchmark',owner_user_id:'fictional:owner',
 work_item_id:'job:WR-41',as_of:'2026-11-17T08:00:00.000Z'};
const at=n=>new Date(Date.parse(scope.as_of)+(n-1)*60000).toISOString();
const evidence=(turn,value)=>createMaterialEvidenceEvent({
 scope,entryId:'fictional:city:inspection:turn:'+turn,
 subjectRef:'job:WR-41',stateKey:'inspection.current_clearance',
 value,effectiveAt:at(turn),knownAt:at(turn),
 sourceRef:'fictional:fixture:city-portal',
});
const records=[evidence(34,'PASS'),evidence(83,'SAFETY_HOLD')];
const fixtureAttestor=async({evidence_entry:e})=>({
 verified:true,authenticated_entry_id:e.entry_id,
 authenticated_entry_hash:e.ledger_entry_hash,
 authenticated_source_ref:e.source_ref,
 attestation_receipt_id:'SIMULATED_FIXTURE_ATTESTOR_ONLY:'+e.entry_id,
});
const ledger=createSandboxUniverseLedger({trustedScope:scope});
const original79='The city inspection status for WR-41 remains unchanged and has not yet received a PASS. Because of this, we need to hold off on proceeding with the next phases of installation until we have official confirmation.';
const original97='With your explicit owner authorization, the signed version 3 WR-41 final estimate is **eligible** to be sent by an authorized human (such as your office staff or designated person). However, **it has not necessarily been sent yet**—authorization to send does not confirm that the estimate has actually been dispatched.';
const examples=[
 {turn:79,label:'Original Mini stale-state failure',
  source_user_event:'Turn 34 established a fictional city inspection PASS; Turn 79 owner asked about schedule.',
  answer:original79,
  extracted:[{claim_id:'real-79:municipal-clearance',
   subject_ref:'job:WR-41',state_key:'inspection.current_clearance',
   asserted_value:'PENDING',speech_act:'ASSERTED_FACT',
   source_span:'has not yet received a PASS'}],
  asof:79,
  expected:'CONTRADICTS_CURRENT_ATTESTED_EVIDENCE'},
 {turn:83,label:'Legitimate subsequent municipal safety hold',
  source_user_event:'New city hold is effective and known at Turn 83, after original Turn 79.',
  answer:'The newly issued safety hold means WR-41 no longer has current city clearance.',
  extracted:[{claim_id:'real-83:municipal-clearance',
   subject_ref:'job:WR-41',state_key:'inspection.current_clearance',
   asserted_value:'SAFETY_HOLD',speech_act:'ASSERTED_FACT',
   source_span:'no longer has current city clearance'}],
  asof:83,expected:'SUPPORTED_BY_ATTESTED_EVIDENCE'},
 {turn:97,label:'Correct estimate eligibility should not be falsely rewritten',
  source_user_event:'Owner explicitly authorized signed v3 estimate for human sending; no outbound email receipt exists.',
  answer:original97,extracted:[],asof:97,
  expected:'NO_EXTRACTED_MATERIAL_INSPECTION_CLAIM'},
];
const output=[];
for(const x of examples){
 const result=await auditAndReceiptMaterialClaims({
  ledger,scope,modelAnswer:x.answer,
  modelResponseId:'replayed-genuine-mini-turn-'+x.turn,
  claims:x.extracted,
  entries:records,validAt:at(x.asof),knownAt:at(x.asof),
  independentSourceAttestor:fixtureAttestor,
  consequential:true,
 });
 const actual=result.report.assessments[0]?.status||
  'NO_EXTRACTED_MATERIAL_INSPECTION_CLAIM';
 if(actual!==x.expected)throw Error('GOLDEN_REPLAY_BEHAVIOR_CHANGED_'+x.turn);
 output.push({
  turn:x.turn,label:x.label,original_model_answer:x.answer,
  source_user_event:x.source_user_event,
  expected_evidence_status:x.expected,actual_evidence_status:actual,
  verifier_disposition:result.report.disposition,
  source_ref_hashes:result.report.assessments[0]?.source_receipts||[],
  model_answer_unchanged:result.report.model_answer_original_unchanged,
  claim_coverage_independently_complete:result.report.independently_audited_complete_coverage,
  automatic_correction_authorized:result.report.automatic_correction_authorized,
  verified_ledger_readback:result.verified_readback,
  audit_receipt_id:result.receipt_id,audit_receipt_hash:result.receipt_hash,
 });
}
mkdirSync('benchmark-results',{recursive:true});
const summary={
 title:'Turn79 original real model response: claim-level bitemporal evidence replay',
 status:'SANDBOX_PROOF_NOT_LIVE_PRODUCTION_VERIFIER',
 source_corpus:'Prior actual GPT-4.1-mini V3 dialogue. Source authenticity simulated.',
 paid_new_model_calls:0,
 verified_receipt_readbacks:output.length,
 detected_original_known_contradictions:1,
 verified_no_false_rewrite_of_turn97:true,
 entire_answer_material_coverage_verification:'NOT_DEMONSTRATED',
 original_inspection_at_79:'PASS',
 source_after_turn83:'SAFETY_HOLD',
 next_required:'Connect independent source authentication and full material-claim extraction coverage before production promotion',
 cases:output,
};
writeFileSync('benchmark-results/reality-material-claim-turn79-replay.json',
 JSON.stringify(summary,null,2));
const escape=x=>String(x).replace(/[&<>"']/g,t=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[t]));
const casesHtml=output.map(c=>
 '<section class="event"><div class="sub">TURN '+c.turn+'</div><h3>'+
 escape(c.label)+'</h3><blockquote>'+escape(c.original_model_answer)+
 '</blockquote><p><b>Verified against simulated source:</b> '+
 escape(c.actual_evidence_status)+'</p><p><b>Decision:</b> '+
 escape(c.verifier_disposition)+'</p>'+
 '<p><small>Evidence receipts: '+escape(JSON.stringify(c.source_ref_hashes))+
 '</small></p><small>Audit: '+escape(c.audit_receipt_id)+
 ' · readback verified</small></section>').join('');
const html='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reality Turn 79 material claim verification</title><style>body{margin:0;background:#091b23;color:#ebf4f7;font:15px system-ui}main{max-width:880px;padding:30px 16px;margin:auto}header{padding:24px;background:#16313e;border-radius:15px}.sub{letter-spacing:.13em;text-transform:uppercase;color:#a2cfde;font-size:12px}.event{margin:16px 0;padding:20px;background:#12303d;border:1px solid #3b6271;border-radius:12px}blockquote{white-space:pre-wrap;border-left:3px solid #92b7c5;padding-left:14px;margin:16px 0;line-height:1.6}small{color:#a5c1ce;overflow-wrap:anywhere}.notice{background:#55432a;padding:16px;border-radius:9px;line-height:1.5}</style></head><body><main><header><div class="sub">REALITY UNIVERSE · HISTORICAL EVIDENCE REPLAY</div><h1>Reality caught the Turn 79 stale-fact error</h1><p>Original real Mini wording checked against fictional source-time history, with integrity receipts and no paid model calls.</p></header><p class="notice">This is an intentionally limited regression proof. The original Mini answer is real; the city-source records and authentication adapter are benchmark fixtures. Only selected, typed material claims are evaluated, not complete semantic accuracy. No customer system was changed or automatic correction delivered.</p>'+casesHtml+'</main></body></html>';
writeFileSync('benchmark-results/reality-material-claim-turn79-replay.html',html);
console.log('MATERIAL_CLAIM_TURN79_REPLAY '+JSON.stringify({
 cases:output.length,known_original_contradictions_detected:1,
 real_model_api_calls:0,receipt_readbacks:output.every(x=>x.verified_ledger_readback),
 source_authenticity:'FICTIONAL_FIXTURE_NOT_EXTERNAL',
 full_claim_coverage_proven:false,
 }));
