// Read-only field intake from actual Reality business GitHub PRs.
// This DOES NOT claim real-world fact adjudication, semantic accuracy or drift rate.
// No OpenAI calls, code writes, production deployments or customer communication.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {buildGovernedChatSignal} from '../src/reality-governed-fragmented-signal-cleaner-v0.1.js';
import {buildModelInput} from '../src/reality-model-gateway-v0.1.js';

const repo='maloney2323/Reality';
const numbers=[132,133,134];
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const output={experiment:'SIGNAL_CLEANER_V1_ACTUAL_REALITY_BUSINESS_READ_ONLY',
  source:'AUTHENTICATED_GITHUB_PULL_REQUEST_READBACK',
  approved_read_only:true,
  no_model_api_calls:true,no_external_business_actions:true,
  independently_verified_business_truth:false,
  semantic_accuracy_or_drift_rate_measured:false,
  records:[]};
if(!process.env.GITHUB_TOKEN)throw Error('GITHUB_READ_TOKEN_MISSING');
mkdirSync('benchmark-results',{recursive:true});
for(const prNumber of numbers){
  const url='https://api.github.com/repos/'+repo+'/pulls/'+prNumber;
  const r=await fetch(url,{
    headers:{authorization:'Bearer '+process.env.GITHUB_TOKEN,
      accept:'application/vnd.github+json',
      'X-GitHub-Api-Version':'2022-11-28'},
    signal:AbortSignal.timeout(15000),
  });
  if(!r.ok)throw Error('GITHUB_READ_FAILED_'+prNumber+'_'+r.status);
  const pr=await r.json();
  const text=[String(pr.title||''),String(pr.body||'').slice(0,7000)].join('\n');
  const signal=buildGovernedChatSignal({
    message:text,observedAt:String(pr.updated_at||pr.created_at),
  });
  const model=buildModelInput({governedSignal:signal});
  assert.equal(model.authority.granted,false);
  assert.equal(model.authority.execution_authorized,false);
  assert.equal(signal.intake_semantics.authority_granted,false);
  assert.equal(signal.transformation_receipt.meaning_change_claimed,false);
  assert.ok(signal.fragments.every(f=>
    text.slice(f.raw_span.start,f.raw_span.end)
      .replace(/\r\n/g,'\n').replace(/[ \t]+/g,' ').trim()===f.cleaned_text));
  assert.equal(signal.packet.raw_content,text);
  assert.equal(signal.intake_semantics.fragment_count,signal.fragments.length);
  output.records.push({
    source_url:pr.html_url,
    fetched_source_digest:'sha256:'+hash(text),
    source_update_timestamp:pr.updated_at||null,
    signal_packet_id:signal.packet.packet_id,
    signal_receipt_id:signal.transformation_receipt.receipt_id,
    cleaner_version:signal.cleaner_version,
    fragment_count:signal.fragments.length,
    quote_scope_count:signal.fragments.reduce((n,f)=>
      n+f.intake_observation.quoted_spans.length,0),
    markers:signal.intake_semantics.markers,
    clean_source_spans_verified:true,
    source_truth_not_inferred:true,
    authority_granted:false,
    provider_model_calls:0,
  });
  // Do not write raw PR body or user names into artifact or console.
  console.log('ACTUAL_GITHUB_SIGNAL_CLEANER '+JSON.stringify({
    pr:prNumber,fragments:signal.fragments.length,
    quoteScopes:output.records.at(-1).quote_scope_count,
    sourceSpansVerified:true,authorityGranted:false,
  }));
}
output.status='COMPLETE_ACTUAL_SOURCE_INTAKE_NOT_SEMANTICALLY_ADJUDICATED';
writeFileSync('benchmark-results/reality-signal-cleaner-v1-real-business.json',
  JSON.stringify(output,null,2));
console.log('REAL_BUSINESS_INTAKE_TOTAL '+JSON.stringify({
  records:output.records.length,provider_model_calls:0,
  source_spans_verified:output.records.every(x=>x.clean_source_spans_verified),
  external_actions:0,
}));
