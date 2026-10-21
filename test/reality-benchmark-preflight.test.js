import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/reliability-benchmark-openai-standalone.js';
import {DRIFT_FOCUS_TASKS} from '../shared/reality-core/reliability-benchmark/reliability-benchmark-corpus-v0.5-drift-focus.js';

function res(){
  return {headers:{},statusCode:200,payload:null,
    setHeader(k,v){this.headers[k.toLowerCase()]=v;return this;},
    status(c){this.statusCode=c;return this;},
    json(b){this.payload=b;return this;},
    end(){return this;}
  };
}
function post(token,dryRun){
  return {method:'POST',headers:{authorization:token?('Bearer '+token):''},body:{dry_run:dryRun}};
}
test('no credential cannot read benchmark or cause expensive calls',async()=>{
  const old=process.env.REALITY_BENCHMARK_ACCESS_TOKEN;
  process.env.REALITY_BENCHMARK_ACCESS_TOKEN='unit-token-only';
  try{
    const r=res();await handler(post(null,true),r);
    assert.equal(r.statusCode,401);
    assert.equal(r.payload.error,'BENCHMARK_ACCESS_NOT_CONFIGURED_OR_UNAUTHORIZED');
  }finally{
    if(old===undefined)delete process.env.REALITY_BENCHMARK_ACCESS_TOKEN;
    else process.env.REALITY_BENCHMARK_ACCESS_TOKEN=old;
  }
});
test('authorized dry-run previews frozen cases without OpenAI credentials or cost',async()=>{
  const saveToken=process.env.REALITY_BENCHMARK_ACCESS_TOKEN;
  const saveKey=process.env.OPENAI_API_KEY;
  process.env.REALITY_BENCHMARK_ACCESS_TOKEN='unit-token-only';
  delete process.env.OPENAI_API_KEY;
  try{
    const r=res();await handler(post('unit-token-only',true),r);
    assert.equal(r.statusCode,200);
    assert.equal(r.payload.success,true);
    assert.equal(r.payload.dry_run,true);
    assert.equal(r.payload.provider,'OPENAI_RESPONSES_API_DIRECT');
    assert.equal(r.payload.drift_cases,DRIFT_FOCUS_TASKS.length);
    assert.equal(r.payload.total_cases,r.payload.estimated_answer_calls);
    assert.equal(r.payload.estimated_answer_calls,r.payload.estimated_scorer_calls);
    assert.ok(r.payload.total_cases>0);
    assert.match(r.payload.note,/No model calls made/);
    const nonDry=res();await handler(post('unit-token-only',false),nonDry);
    assert.equal(nonDry.statusCode,503);
    assert.equal(nonDry.payload.error,'OPENAI_API_KEY_NOT_CONFIGURED_IN_VERCEL_RUNTIME');
  }finally{
    if(saveToken===undefined)delete process.env.REALITY_BENCHMARK_ACCESS_TOKEN;
    else process.env.REALITY_BENCHMARK_ACCESS_TOKEN=saveToken;
    if(saveKey===undefined)delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY=saveKey;
  }
});
