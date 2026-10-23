// Reuses the original frozen, live OpenAI 25-turn Actions evidence artifact.
// No additional OpenAI calls. The pinned source hash prevents accidentally
// labeling a replaced/recomputed report as the original October 23 run.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {deriveSandboxProposalsFromConstruction25}
 from '../src/reality-sandbox-repair-proposal-v1.0.js';
const root='benchmark-results';
const report=JSON.parse(readFileSync(root+'/construction-25-openai-reality.json','utf8'));
const EXPECTED_FROZEN_CI_REPORT_HASH='sha256:eaf22d44f91707b34694f2e170069da81e5e6329c1e09cff240538cfcae8284c';
if(report.report_hash!==EXPECTED_FROZEN_CI_REPORT_HASH)
 throw Error('FROZEN_25_TURN_CI_PROVENANCE_MISMATCH');
const result=deriveSandboxProposalsFromConstruction25({report,
 assessedAt:'2026-10-23T22:02:12.000Z'});
if(result.missed_or_misclassified!==4||result.expected_class_detected!==4)
 throw Error('FROZEN_25_TURN_QUALITY_COUNTS_CHANGED');
mkdirSync(root,{recursive:true});
writeFileSync(root+'/construction-25-competence-gaps.json',JSON.stringify(result,null,2));
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));
const rows=result.outcomes.map(x=>
 '<tr><td>'+e(x.turn)+'</td><td>'+e(x.probe_id)+'</td><td>'+
 e(x.expected_detection)+'</td><td>'+
 e(x.observed_classifications.join(', ')||'No detection')+
 '</td><td class="'+(x.matched_expected_class?'ok':'danger')+'">'+
 (x.matched_expected_class?'MATCH':'MISSED')+'</td></tr>').join('');
const cards=result.proposals.map(p=>
 '<section class="panel miss"><h3>'+e(p.test_case_id)+
 '</h3><p><b>Missing:</b> '+e(p.expected_failure_class)+'</p><p>'+
 '<b>Reality actually raised:</b> '+e(p.actual_failure_classes.join(', ')||'No alert')+
 '</p><p><b>Learning status:</b> Proposed capability gap. Root cause and repair unverified.</p>'+
 '<p><b>Next:</b> Preserve history; isolate cause; test candidate against new cases and harmless conversation.</p>'+
 '<small>Gap receipt: '+e(p.cause_receipt_hash)+'</small></section>').join('');
const live=report.turns.map(x=>'<details><summary><strong>'+e(x.id)+' · '+e(x.name)+
 '</strong><span>'+e(x.reality.finding_count)+' detector finding(s)</span></summary>'+
 '<div class="inner"><p><b>User</b> '+e(x.prompt)+'</p><h4>Underlying OpenAI answer</h4>'+
 '<pre>'+e(x.openai_answer)+'</pre><h4>Reality findings</h4>'+
 '<p>'+e(x.reality.findings.map(f=>f.classification).join(' · ')||'None on supported checks')+
 '</p><h4>Reality correction</h4><p>NOT RUN. There is no verified repaired answer for this test.</p>'+
 '<small>Judge receipt '+e(x.reality.judge_receipt_hash)+'</small></div></details>').join('');
const html='<!doctype html><html lang="en"><head><meta charset="utf-8">'+
 '<meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<title>Reality · 25 Turn Gap Learning</title><style>*{box-sizing:border-box}'+
 'body{background:#09191f;color:#eef7fa;font-family:system-ui,-apple-system,sans-serif;margin:0}'+
 'main{max-width:1100px;margin:auto;padding:28px 16px 70px}h1{font-size:clamp(28px,5vw,42px)}'+
 'h2{margin-top:32px}p{line-height:1.6;color:#c2d6da}small{color:#91b4bd;overflow-wrap:anywhere}'+
 '.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}'+
 '.metric,.panel{background:#122d35;border:1px solid #35545f;border-radius:12px;padding:18px}'+
 '.metric b{font-size:34px;display:block}.metric span{color:#a8ccd3;font-size:12px}'+
 '.miss{border-left:5px solid #e9b36a}.ok{color:#9fdfc0}.danger{color:#f2aa9d}'+
 'table{border-collapse:collapse;width:100%;font-size:13px}td,th{border-bottom:1px solid #35545f;padding:12px;text-align:left;vertical-align:top}'+
 '.scroll{overflow:auto}details{margin-top:9px;border:1px solid #35545f;border-radius:9px;background:#132e36}'+
 'summary{cursor:pointer;display:flex;gap:10px;justify-content:space-between;padding:14px}summary span{color:#a7c9d0;font-size:12px}'+
 '.inner{padding:13px;border-top:1px solid #35545f}.inner pre{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.5;color:#dceef1;background:#07161b;padding:14px;border-radius:7px}'+
 'a{color:#a0e5ec}</style></head><body><main>'+
 '<small>REALITY / VERIFIED SOURCE RECEIPTS / SYNTHETIC DETECTOR FAULT INJECTION</small>'+
 '<h1>25 turns. Four things Reality knows it missed.</h1><p>This learning assessment reuses the actual GitHub Actions OpenAI benchmark receipts. The four repair candidates come from intentionally faulty synthetic outputs—not failures falsely attributed to OpenAI. No corrected answer, autonomous patch, deployment, or external execution has been verified.</p>'+
 '<div class="grid"><div class="metric"><b>25/25</b><span>OpenAI answers inspected</span></div>'+
 '<div class="metric"><b>4/8</b><span>Known fault classes detected</span></div>'+
 '<div class="metric"><b>4</b><span>New capability gaps admitted</span></div>'+
 '<div class="metric"><b>0</b><span>Verified automatic repairs</span></div></div>'+
 '<h2>Capability gaps discovered</h2>'+cards+
 '<h2>Expected versus detected (frozen fault probes)</h2><div class="scroll"><table>'+
 '<thead><tr><th>Turn</th><th>Fault probe</th><th>Expected</th><th>Detected</th><th>Match</th></tr></thead>'+
 '<tbody>'+rows+'</tbody></table></div>'+
 '<h2>Actual OpenAI answers beside Reality judgments</h2>'+live+
 '<p><b>Source:</b> <a href="https://github.com/maloney2323/Reality/actions/runs/40030861231">25-turn original evidence run</a></p>'+
 '<p><small>Frozen report digest '+e(report.report_hash)+'</small></p></main></body></html>';
writeFileSync(root+'/construction-25-epistemic-learning.html',html);
console.log('CAPABILITY_GAP_REPLAY '+JSON.stringify({
 original_report_sha256:report.report_hash,
 model_calls:0,source_openai_turns:report.completed_turns,
 probes:result.expected_probe_count,correctly_recognized:result.expected_class_detected,
 missed_or_misclassified:result.missed_or_misclassified,
 gaps:result.proposals.map(p=>p.test_case_id),
 customer_universe_persisted:false,
 verified_auto_repairs:0,production_unchanged:true,
 result_receipt:result.derived_receipt_hash,
}));
