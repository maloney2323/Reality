// Read-only, synthetic adversarial benchmark visibility; never renders live secrets.
// HTML-escape every provider/model/user text field before embedding in Preview.
export function escapeReportText(value){
 return String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;')
  .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
}
export function renderBenchmarkReportPage({score,turns}={}){
 if(!score||!Array.isArray(turns))throw Error('BENCHMARK_REPORT_DATA_REQUIRED');
 const esc=escapeReportText;
 const metric=(label,value)=>'<div class="metric"><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong></div>';
 const cards=turns.map(p=>{
  const detection=Array.isArray(p.detected_codes)?p.detected_codes:[];
  const conversation=Array.isArray(p.conversational_findings)?p.conversational_findings:[];
  const reviewer=Array.isArray(p.semantic_issue_kinds)?p.semantic_issue_kinds:[];
  const changed=Boolean(p.response_altered);
  const review=String(p.semantic_review_status||'UNASSESSED');
  const data=[
   ['Source-backed detector codes',detection.length?JSON.stringify(detection):'None recorded'],
   ['Conversational claim findings',conversation.length?JSON.stringify(conversation):'None recorded'],
   ['Conversational coverage',p.conversational_coverage?JSON.stringify(p.conversational_coverage):'Not reported in historical run'],
   ['Semantic issues',reviewer.length?JSON.stringify(reviewer):'None recorded'],
   ['Review status',review],
   ['Repair status',p.semantic_repair_status||'No repair'],
   ['External action',p.external_action_status||'Unknown'],
   ['Readback',p.readback_verified?'Verified':'NOT VERIFIED'],
  ].map(([label,value])=>'<div class="receipt-row"><span>'+esc(label)+'</span><code>'+esc(value)+'</code></div>').join('');
  return '<details class="turn" id="turn-'+esc(p.turn)+'"><summary>'+
   '<span class="turn-num">#'+esc(p.turn)+'</span><span class="turn-title">'+esc(p.scenario_tag||'')+'</span>'+
   '<span class="turn-status'+(review.startsWith('UNASSESSED')?' attention':'')+'">'+esc(review.startsWith('UNASSESSED')?'Unassessed':changed?'Changed':'Unchanged')+'</span></summary>'+
   '<div class="question"><strong>Simulated user message</strong><p>'+esc(p.message)+'</p></div>'+
   '<div class="answers"><section><h3>Original '+esc(p.model||score.model||'model')+'</h3><pre>'+esc(p.original_model_answer)+'</pre></section>'+
   '<section><h3>Reality final answer</h3><pre>'+esc(p.reality_final)+'</pre></section></div>'+
   '<div class="receipt"><h3>Detection and receipt detail</h3>'+data+'</div></details>';
 }).join('');
 const overview=[
  metric('Persisted turns',score.turns+'/'+turns.length),
  metric('Detector candidate turns',turns.filter(x=>(Array.isArray(x.detected_codes)&&x.detected_codes.length>0)||
    (Array.isArray(x.conversational_findings)&&x.conversational_findings.length>0)).length),
  metric('Changed answers',score.answers_changed),
  metric('Model requests',score.model_requests_inside_reality),
  metric('Unassessed turns',turns.filter(x=>String(x.semantic_review_status||'').startsWith('UNASSESSED')).length),
  metric('External actions',score.external_actions),
 ].join('');
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<title>Reality | Adversarial evidence scoreboard</title><style>'+
 ':root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#090d15;color:#eaf0fa;font:15px/1.55 system-ui,-apple-system,Segoe UI,sans-serif}'+
 'main{max-width:1180px;margin:0 auto;padding:25px 15px 70px}.eyebrow{color:#75d5cc;text-transform:uppercase;letter-spacing:.14em;font-size:12px;font-weight:700}'+
 'h1{font-size:clamp(27px,5vw,42px);line-height:1.15;margin:9px 0}h2{font-size:20px;margin:29px 0 12px}h3{font-size:14px;margin:0 0 9px}'+
 '.sub{color:#9daec9;max-width:780px}.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:25px 0}'+
 '.metric{padding:15px;background:#111b2d;border:1px solid #24364c;border-radius:13px}.metric span{display:block;color:#9aadc5;font-size:12px}.metric strong{display:block;font-size:25px;margin-top:5px}'+
 '.notice{border-left:3px solid #f1be65;background:#1c1b1e;padding:13px 16px;border-radius:8px;color:#ead9b5}.run{color:#889ab5;font-size:12px;overflow-wrap:anywhere}'+
 '.turn{border:1px solid #253750;background:#101929;border-radius:12px;margin:9px 0;overflow:hidden}.turn[open]{border-color:#567d9a}'+
 'summary{display:flex;align-items:center;gap:13px;padding:17px;cursor:pointer;list-style:none}summary::-webkit-details-marker{display:none}'+
 '.turn-num{color:#75d5cc;font-weight:700;min-width:30px}.turn-title{flex:1;font-weight:650;overflow-wrap:anywhere}.turn-status{font-size:12px;color:#9cb9d0}.turn-status.attention{color:#e7bb70}'+
 '.question{padding:12px 17px;background:#162238}.question p{margin:8px 0;white-space:pre-wrap}.answers{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:12px}'+
 '.answers section{background:#0a1321;border:1px solid #25354d;border-radius:9px;padding:14px;min-width:0}.answers pre{white-space:pre-wrap;overflow-wrap:anywhere;font:13px/1.58 ui-monospace,SFMono-Regular,Consolas,monospace;margin:0;color:#d9e4f1}'+
 '.receipt{padding:6px 16px 17px}.receipt-row{display:flex;gap:10px;justify-content:space-between;border-top:1px solid #24364b;padding:9px 0;color:#a2b0c6}.receipt-row code{color:#d8e3ed;overflow-wrap:anywhere;text-align:right;max-width:65%}'+
 'footer{margin-top:30px;color:#8293ae;font-size:13px}a{color:#75d5cc}@media(max-width:650px){.metrics{grid-template-columns:repeat(2,1fr)}.answers{grid-template-columns:1fr}.metric strong{font-size:22px}summary{gap:8px;padding:13px}}'+
 '</style></head><body><main><div class="eyebrow">Reality / Experimental Evidence</div><h1>Adversarial business workday</h1>'+
 '<p class="sub">GPT-4.1 mini inside Reality · original model versus Reality final · read-only, isolated PostgreSQL receipts. All conversations below are synthetic.</p>'+
 '<div class="run">Run ID: '+esc(score.run_id)+' · Model: '+esc(score.model)+'</div>'+
 '<div class="metrics">'+overview+'</div>'+
 '<p class="notice"><strong>Important:</strong> Zero recorded detector findings does not prove zero hallucination or drift. These answers have not been independently semantically graded. A changed answer is not automatically a successful correction.</p>'+
 '<h2>Turn-by-turn evidence</h2>'+cards+
 '<footer>Source: isolated Reality Continuity evidence · no customer actions or production deployment · '+esc(score.status)+
 '. <a href="https://github.com/maloney2323/Reality/pull/140">Experimental implementation and tests</a>.</footer></main></body></html>';
}
