import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const seen=[];
process.env.OPENAI_API_KEY='FAKE_UNIT_ONLY_NOT_A_REAL_API_CREDENTIAL';
process.env.B50_GOVERNED_PAID_APPROVED='YES_EXACT_RUN';
process.env.B50_GOVERNED_MODE='paid_fifty';
process.env.B50_GOVERNED_CASE='FULL_FIFTY';
process.env.B50_GOVERNED_MAX_PROVIDER_CALLS='50';
process.env.B50_GOVERNED_RECEIPT_PATH='artifacts/mock-reality-business50-all-50-test.json';
globalThis.fetch=async (url,init)=>{
  assert.equal(url,'https://api.openai.com/v1/responses');
  const request=JSON.parse(init.body);
  assert.equal(request.model,'gpt-6-astra');
  assert.equal(request.reasoning.effort,'max');
  assert.equal(request.max_output_tokens,8192);
  assert.equal(request.text.format.type,'json_object');
  const packet=JSON.parse(request.input[1].content);
  assert.ok(/^B[0-5][0-9]$/.test(packet.case_id));
  assert.equal(packet.expected_disposition,undefined);
  seen.push(packet.case_id);
  const decision={disposition:'BLOCK',evidence_ids:[packet.evidence[0].id],
    uncertainty_acknowledged:true,claims_authority:false,reasoning:'Synthetic mock only. No external effect.'};
  return {ok:true,status:200,text:async()=>JSON.stringify({
    id:'MOCK_ONLY_'+packet.case_id,model:'gpt-6-astra',status:'completed',
    output:[{content:[{type:'output_text',text:JSON.stringify(decision)}]}],
    usage:{input_tokens:0,output_tokens:0,total_tokens:0}
  })};
};
await import('./reality-governed-astra-all50-v0.2.mjs');
const r=JSON.parse(readFileSync(process.env.B50_GOVERNED_RECEIPT_PATH,'utf8'));
assert.equal(seen.length,50,'All 50 models must actually be invoked');
assert.equal(new Set(seen).size,50);
assert.equal(r.records.length,50);
assert.equal(r.summary.provider_calls,50);
assert.equal(r.summary.raw_model_scored,50);
assert.equal(r.summary.strict_final_passed+r.summary.strict_final_failed,50);
assert.equal(r.summary.all_50_cases_attempted,true);
assert.ok(r.records.every(x=>x.model_called&&x.raw_candidate&&typeof x.strict_final_pass==='boolean'));
assert.ok(r.records.every(x=>x.request_sha256===x.original_model_request_digest));
assert.equal(r.independent_source_classification_proven,false);
assert.equal(r.advisory_boundary_version,'reality-advisory-publication-boundary-v0.1');
assert.equal(r.summary.unclassified,25,'Unclassified cases must remain counted after advisory disclosure');
assert.ok(r.summary.unverified_advisories<=25);
assert.ok(r.records.filter(x=>x.governed_publication?.kind==='UNVERIFIED_INFORMATIONAL_ADVISORY')
  .every(x=>x.governed_publication.authorization_to_act===false&&
    x.governed_publication.original_task_completed===false));
assert.ok(r.records.every(x=>!x.governed_publication||
  x.governed_publication.external_action_executed===false));
assert.equal(r.verified_drift_rate,null);
console.log(JSON.stringify({verdict:'ALL_50_MOCK_REQUESTS_MADE_AND_SCORED_WITHOUT_ANY_REAL_API_CALL',
  attempted:seen.length,strict_pass:r.summary.strict_final_passed,strict_fail:r.summary.strict_final_failed,
  without_policy:r.summary.unclassified,withheld:r.summary.withheld,
  output_is_synthetic:true,paid_calls:0}));
