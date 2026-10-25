import test from 'node:test';
import assert from 'node:assert/strict';
import {renderBenchmarkReportPage,escapeReportText} from '../src/reality-benchmark-report-page-v0.1.js';

test('provider/model/user text is HTML-escaped, not executable in Preview',()=>{
 const score={run_id:'isolated-20261025',model:'gpt-4.1-mini',turns:1,
  answers_changed:0,model_requests_inside_reality:2,external_actions:0,
  status:'COMPLETE_NOT_INDEPENDENTLY_SEMANTIC_SCORED'};
 const text='<img src=x onerror=alert(1)>';
 const html=renderBenchmarkReportPage({score,turns:[{
  turn:1,scenario_tag:text,message:text,model:'gpt-4.1-mini',
  original_model_answer:text,reality_final:text,detected_codes:[],
  semantic_issue_kinds:[],semantic_review_status:'UNASSESSED',
  readback_verified:true,external_action_status:'NOT_EXECUTED',
 }]});
 assert.equal(html.includes(text),false);
 assert.match(html,/&lt;img src=x onerror=alert\(1\)&gt;/);
 assert.match(html,/Original gpt-4.1-mini/);
 assert.match(html,/Reality final answer/);
 assert.match(html,/Zero recorded detector findings does not prove zero hallucination/);
 assert.match(html,/Unassessed/);
 assert.match(html,/viewport/);
});
test('reports reject missing data and escape quotes',()=>{
 assert.throws(()=>renderBenchmarkReportPage({}),/BENCHMARK_REPORT_DATA_REQUIRED/);
 assert.equal(escapeReportText(`a&<>"'`),'a&amp;&lt;&gt;&quot;&#39;');
});
