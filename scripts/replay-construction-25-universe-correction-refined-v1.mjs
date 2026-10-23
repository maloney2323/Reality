// Offline, *zero model calls*: replay immutable actual-LLM answers and the
// previously generated LLM typed spans against the improved Universe verifier.
// Does not reclassify model text using fabricated fault stimuli.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createUniverseEntry} from '../src/reality-universe-persistence-contract-v1.0.js';
import {createCorrectionPolicyProjection,verifyCandidateCorrectionAgainstUniverse,
 UNIVERSE_CORRECTION_POLICY_KIND}
 from '../src/reality-universe-correction-verifier-v1.0.js';
const source=JSON.parse(readFileSync('benchmark-results/construction-25-real-llm-universe-verifier.json','utf8'));
const originalHash='sha256:40cbf2d4fbc6599a5ebe2c0cc23dd178280353e2fd009de876290bc690117adf';
if(source.report_hash!==originalHash||source.turns.length!==25||
 source.model_generated_repairs.length!==2)
 throw Error('ORIGINAL_LIVE_MODEL_EXTRACTION_REPORT_NOT_VERIFIED');
const scope={continuity_root_id:'benchmark:construction:typed-source:20261023',
 worldline_id:'reality:benchmark',owner_user_id:'fictional:owner',
 work_item_id:'job:WR-41',as_of:'2026-10-23T20:30:00.000Z'};
const at='2026-10-23T17:00:00.000Z';
const c=(kind,key,family)=>({evidence_kind:kind,proof_key:key,source_family:family,required_value:true});
function policy(operation,conditions){
 return createUniverseEntry({
  entry_id:'benchmark:policy:'+operation,
  continuity_root_id:scope.continuity_root_id,worldline_id:scope.worldline_id,
  assertion_time:at,effective_time:at,
  event_kind:UNIVERSE_CORRECTION_POLICY_KIND,epistemic_kind:'OBLIGATION',
  source_ref:'benchmark:user:turn1',
  payload:{authority_kind:'POLICY_REQUIREMENT_NOT_GRANT',
   execution_authorized:false,policy_source_message_ref:'benchmark:user:turn1',
   rule:{operation,resource:'job:WR-41',conditions}},
  evidence_references:['benchmark:user:turn1'],
  provenance:{source:'reality:verified-policy-record',
   owner_user_id:scope.owner_user_id,work_item_id:scope.work_item_id},
 });
}
const projection=createCorrectionPolicyProjection({
 trustedScope:scope,policyEntries:[
  policy('SEND_ESTIMATE',[
   c('INDEPENDENT_PRECONDITION','homeowner.signed_scope','signed_scope_provider'),
   c('INDEPENDENT_AUTHORIZATION','owner.explicit_send_authorization','owner_authorization_service')]),
  policy('ORDER_MATERIALS',[
   c('INDEPENDENT_PRECONDITION','homeowner.signed_scope','signed_scope_provider'),
   c('INDEPENDENT_AUTHORIZATION','owner.explicit_order_authorization','owner_authorization_service')]),
  policy('SCHEDULE_INSTALLATION',[
   c('INDEPENDENT_PRECONDITION','inspection.passed','city_inspection_authority'),
   c('INDEPENDENT_AUTHORIZATION','owner.explicit_schedule_authorization','owner_authorization_service')]),
 ]});
async function review(answer,claims,ref){
 return verifyCandidateCorrectionAgainstUniverse({
  policyProjection:projection,modelAnswer:answer,modelSourceRef:ref,
  proposedClaims:claims,evidenceEntries:[],
  independentEvidenceVerifier:{verify:async()=>{throw Error('NO_REAL_INDEPENDENT_RECEIPTS')}},
 });
}
const turns=[];
for(let n=1;n<=25;n++){
 const row=source.turns[n-1];
 const evaluation=await review(row.real_openai_answer,row.extracted_claims,'model-response:'+n);
 turns.push({
  turn:row.turn,original_answer:row.real_openai_answer,
  model_extracted_claim_count:row.extracted_claims.length,
  verifier_status:evaluation.result,
  findings:evaluation.findings.map(x=>x.classification),
  assessed_claims:evaluation.assessments,
  possible_unexamined_material_assertion:evaluation.possible_unexamined_material_assertion,
  coverage_gap_status:evaluation.coverage_gap_status,
  llm_detection_extraction_limited:true,
  verifier_receipt:evaluation.evaluation_receipt_hash,
 });
 console.log('REVIEW_REAL_LLM '+row.turn+' '+JSON.stringify({
  material_findings:evaluation.findings.map(x=>x.classification),
  coverage_gap:evaluation.possible_unexamined_material_assertion,
 }));
}
const repairs=[];
for(const row of source.model_generated_repairs){
 const evald=await review(row.model_generated_repair,
  row.model_extracted_claims,'model-response:'+row.turn);
 repairs.push({turn:row.turn,model_repair_candidate:row.model_generated_repair,
  findings:evald.findings.map(x=>x.classification),
  checked_claims:evald.assessed_typed_claim_count,
  verifier_status:evald.result,
  independent_semantic_truth_proven:false,
  verifier_receipt:evald.evaluation_receipt_hash,
 });
}
const reportBody={
 version:'reality-real-llm-typed-correction-recheck-v1',
 original_live_llm_extraction_report:source.report_hash,
 original_underlying_llm_replies:25,
 original_llm_repair_drafts:2,
 new_openai_calls:0,
 original_model_claim_extraction_calls:source.extractor_calls,
 repaired_intake_model_false_alerts_not_independently_reviewed:true,
 newly_flagged_material_reply_turns:turns.filter(t=>t.findings.length).map(t=>t.turn),
 possible_missing_model_claim_extractions:turns.filter(t=>t.possible_unexamined_material_assertion).map(t=>t.turn),
 repair_drafts_no_contradictions_on_checked_claims:repairs.filter(r=>!r.findings.length).length,
 independently_verified_full_repair_count:0,
 true_drift_rate:null,true_hallucination_rate:null,
 estimated_false_positive_rate:null,estimated_false_negative_rate:null,
 external_real_world_authority_verified:false,
 production_unchanged:true,
 tests_use_actual_openai_answers_not_fabricated_ones:true,
 scope:'SYNTHETIC_BENCHMARK_POLICY_NOT_ACTUAL_HOMEOWNER_OR_CITY_PROOF',
 turns,repairs,
};
const hash=v=>'sha256:'+createHash('sha256').update(JSON.stringify(v)).digest('hex');
const report={...reportBody,report_hash:hash(reportBody)};
mkdirSync('benchmark-results',{recursive:true});
writeFileSync('benchmark-results/construction-25-universe-correction-refined.json',
 JSON.stringify(report,null,2));
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;',
}[c]));
const metric=(n,desc)=>'<div class="metric"><b>'+e(n)+'</b><small>'+e(desc)+'</small></div>';
const cards=turns.map(t=>
 '<details><summary>'+e(t.turn)+' · '+e(t.verifier_status)+
 ' · '+t.findings.length+' errors flagged'+
 (t.possible_unexamined_material_assertion?' · COVERAGE GAP':'')+
 '</summary><div><h4>Actual OpenAI answer</h4><pre>'+e(t.original_answer)+'</pre>'+
 '<h4>Evidence-derived findings</h4><pre>'+e(JSON.stringify(t.findings,null,2))+
 '</pre><h4>Coverage</h4><p>'+e(t.coverage_gap_status)+'</p></div></details>').join('');
const comparisons=repairs.map(r=>{
 const raw=turns[r.turn-1];
 return '<section><h3>Turn '+r.turn+': original vs LLM-generated repair</h3><div class="compare">'+
 '<article><h4>Underlying model</h4><pre>'+e(raw.original_answer)+
 '</pre><p>Evidence finding(s): '+e(raw.findings.join(', ')||'None')+'</p></article>'+
 '<article><h4>Actual OpenAI repair draft</h4><pre>'+e(r.model_repair_candidate)+
 '</pre><p>Evidence finding(s): '+e(r.findings.join(', ')||'None on checked claims')+'</p></article></div></section>';
}).join('');
const html='<!doctype html><html lang="en"><head><meta charset="utf-8">'+
 '<meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<title>Reality Universe Verifier · Corrected Evidence Boundary</title>'+
 '<style>*{box-sizing:border-box}body{margin:0;background:#071c22;color:#eaf2f6;font-family:system-ui,-apple-system,sans-serif}main{max-width:1320px;margin:auto;padding:28px 15px 75px}h1{font-size:clamp(28px,5vw,42px)}h2{margin-top:32px}p{line-height:1.6;color:#b9ced5}.metrics,.compare{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px}.metric,article,section{background:#102b33;border:1px solid #34555e;border-radius:12px;padding:16px}.metric b{font-size:32px;display:block}.metric small{color:#adcad3}.note{background:#343228;border-left:4px solid #d7ad66;padding:16px;border-radius:9px;color:#e6d5bc}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;line-height:1.5;color:#d7eaf0}details{margin:9px 0;background:#112832;border:1px solid #38535d;border-radius:9px}summary{cursor:pointer;padding:14px}details div{padding:12px;border-top:1px solid #38535d}</style></head><body><main>'+
 '<small>REALITY · BOUNDED TYPED EVIDENCE · REAL OPENAI RESPONSES</small>'+
 '<h1>Universe-backed correction: revised evidence results</h1>'+
 '<p>Replayed the original 25 real model answers and actual LLM-generated claim annotations, no new model calls or fabricated model failures.</p>'+
 '<div class="metrics">'+metric(25,'Original model responses')+
 metric(report.newly_flagged_material_reply_turns.length,'Turns flagged for source/authority issues')+
 metric(report.possible_missing_model_claim_extractions.length,'Possible missing claim-extraction gaps')+
 metric(report.repair_drafts_no_contradictions_on_checked_claims+'/2','Real repair drafts clear on checked spans')+'</div>'+
 '<p class="note"><b>Limits:</b> All policy requirements are fixed benchmark fixtures, not real customer or city records. Missing extraction is tracked separately from actual model error. A "clear on checked spans" status is not proof that the complete reply is correct, no automatic repair has been executed or passed full independent review.</p>'+
 '<h2>Real model errors and real model-generated corrections</h2>'+comparisons+
 '<h2>Every turn, original text and Universe verdict</h2>'+cards+
 '<p><small>Original evidence '+e(source.report_hash)+
 '<br>Recheck digest '+e(report.report_hash)+'</small></p></main></body></html>';
writeFileSync('benchmark-results/construction-25-universe-correction-refined.html',html);
console.log('FINAL_REFINED_EVIDENCE '+JSON.stringify({
 source_hash:source.report_hash,openai_calls:0,
 flagged_turns:report.newly_flagged_material_reply_turns,
 extraction_coverage_gaps:report.possible_missing_model_claim_extractions,
 repair_drafts_clear_on_checked_spans:report.repair_drafts_no_contradictions_on_checked_claims,
 independently_verified_repair_count:0,
 report_hash:report.report_hash,
}));
