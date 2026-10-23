import {writeFileSync,mkdirSync} from 'node:fs';
import {reconcileConstructionWorkday}
 from '../src/reality-construction-messy-signal-pilot-v1.0.js';
import {
 CONSTRUCTION_PILOT_AS_OF as asOf,
 CONSTRUCTION_PILOT_WORLD as worldId,
 CONSTRUCTION_PILOT_PROJECT as projectId,
 CONSTRUCTION_PILOT_SIGNALS as signals,
 CONSTRUCTION_PILOT_REQUESTS as requests,
} from '../benchmarks/construction-messy-signals-day1-v1.js';

const result=reconcileConstructionWorkday({worldId,projectId,signals,requests,asOf});
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;',
}[c]));
const render=x=>escape(x);
const cards=result.conflicts.map(c=>{
 const ids=c.source_receipts.join(', ');
 return '<article class="risk"><h3>'+render(c.state_key)+'</h3><p>Conflicting reported values: <b>'+
  render(c.candidate_values.join(' vs. '))+'</b></p><small>Source signals: '+
  render(ids)+'</small><p class="tag">Unresolved — independent confirmation needed</p></article>';
}).join('');
const tasks=result.work_items.map(x=>{
 const block=x.status==='EXTERNAL_ACTION_BLOCKED';
 const key=block?'BLOCKED':'DRAFT ONLY';
 return '<article><div class="line"><strong>'+render(x.summary)+
  '</strong><span class="'+(block?'danger':'review')+'">'+key+'</span></div>'+
  '<p>'+render(x.operation)+' · '+render(x.request_id)+'</p>'+
  (x.blockers.length?'<small>Open checks: '+x.blockers.map(b=>render(b.key)).join(', ')+'</small>':'')+
  '<p><small>Evidence references: '+(x.source_receipts.map(render).join(', ')||'none yet')+'</small></p>'+
  '</article>';
}).join('');
const ledger=signals.map(s=>'<tr><td>'+render(s.signal_id)+'</td><td>'+render(s.channel)+
 '</td><td>'+render(s.body)+'</td><td>'+render(s.source_ref)+'</td></tr>').join('');
const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reality · Construction Messy Signals Day 1</title>'+
 '<style>:root{font-family:system-ui,-apple-system,sans-serif;color:#e9f1f5;background:#07161b}*{box-sizing:border-box}body{margin:0}main{max-width:1060px;margin:auto;padding:28px 18px 70px}h1{font-size:clamp(28px,5vw,46px);letter-spacing:-1px}h2{margin:36px 0 14px}p{line-height:1.6;color:#b6c8ce}article{border:1px solid #2c434a;border-radius:14px;padding:17px;background:#10242a;margin:10px 0}.risk{border-left:5px solid #f4af71}.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px}.stat{border:1px solid #294650;border-radius:14px;padding:18px;background:#112a30}.stat b{font-size:32px;display:block}.stat small{color:#b0c7d0}.tag,.review,.danger{display:inline-block;font-weight:650;font-size:12px;letter-spacing:.3px;padding:6px 10px;border-radius:7px}.tag,.review{color:#fee7b7;background:#553e19}.danger{color:#ffc7c0;background:#6a2c2d}.line{display:flex;gap:12px;align-items:center;justify-content:space-between}.line strong{max-width:82%}header small{color:#a4bfc7}table{border-collapse:collapse;width:100%;font-size:13px}td,th{border-bottom:1px solid #284149;padding:9px;text-align:left;vertical-align:top}th{color:#d2e8ef}.scroll{overflow:auto}footer{margin-top:30px;color:#9ab3bb;font-size:13px}a{color:#9ddfee}code{overflow-wrap:anywhere}@media(max-width:500px){.line{align-items:flex-start;flex-direction:column}.line strong{max-width:100%}}</style></head><body><main>'+
 '<header><small>REALITY / CONSTRUCTION / FROZEN SYNTHETIC PILOT</small><h1>One messy workday, one coherent picture.</h1><p>This is a deterministic offline exercise, <b>not a live contractor account</b>, not a production app, and not an AI-model evaluation. Original reports are preserved without being promoted to truth.</p></header>'+
 '<div class="stats"><div class="stat"><b>'+result.ingested_signal_count+'</b><small>Signals reconciled</small></div><div class="stat"><b>'+result.contradictory_report_count+'</b><small>Conflicting source groups</small></div><div class="stat"><b>'+result.work_items.filter(x=>x.status==='DRAFT_ELIGIBLE_REVIEW_REQUIRED').length+'</b><small>Reviewable preparations</small></div><div class="stat"><b>'+result.pending_authority_checks+'</b><small>External actions blocked</small></div></div>'+
 '<h2>What needs a decision</h2>'+cards+
 '<h2>What Reality can prepare</h2>'+tasks+
 '<h2>What actually came in</h2><div class="scroll"><table><thead><tr><th>ID</th><th>Channel</th><th>Message</th><th>Evidence ref</th></tr></thead><tbody>'+ledger+'</tbody></table></div>'+
 '<footer><p><b>Boundary:</b> No email, quote, social post, purchase, schedule, inspection submission, or payment was executed. No customer time-savings or financial benefit has been independently measured.</p><p>Immutable report hash: <code>'+render(result.receipt_hash)+'</code></p></footer></main></body></html>';
mkdirSync('benchmark-results',{recursive:true});
writeFileSync('benchmark-results/construction-messy-day1.json',JSON.stringify(result,null,2));
writeFileSync('benchmark-results/construction-messy-day1.html',html);
console.log(JSON.stringify({status:'SYNTHETIC_PILOT_RECEIPTS_READY',signals:result.ingested_signal_count,
 conflicts:result.contradictory_report_count,
 drafts:result.work_items.filter(x=>x.status==='DRAFT_ELIGIBLE_REVIEW_REQUIRED').length,
 blocked:result.pending_authority_checks,
 external_actions:result.external_actions_performed,
 source_truth_verified:false,
 receipt:result.receipt_hash}));
