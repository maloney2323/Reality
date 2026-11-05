import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {invokeRealityModel} from '../src/reality-model-gateway-v0.1.js';

const signal={
 cleaner_version:'test',packet:{packet_id:'sig:test',raw_content_digest:'test'},
 fragments:[{fragment_id:'f:test',cleaned_text:'Explain the next stage.'}],
 transformation_receipt:{receipt_id:'receipt:test'},lineage:{source:'test'},
};
test('model gateway hands every ordinary provider call a finite abort deadline',async()=>{
 let captured=null;
 const result=await invokeRealityModel({governedSignal:signal,apiKey:'fixture',
  model:'test-model',fetchImpl:async(url,options)=>{
   captured={url,options};
   return {ok:true,json:async()=>({id:'response-test',status:'completed',
    output_text:'Verified fixture answer.'})};
  }});
 assert.equal(captured.url,'https://api.openai.com/v1/responses');
 assert.ok(captured.options.signal instanceof AbortSignal);
 assert.equal(captured.options.signal.aborted,false);
 assert.equal(result.answer,'Verified fixture answer.');
 assert.equal(result.authority_granted,false);
 assert.equal(result.execution_authorized,false);
});
test('Chat client ends a stalled browser wait while leaving saved history available',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/signal:AbortSignal\\.timeout\\(95000\\)/);
 assert.match(html,/finally\\{el\\('privateSend'\\)\\.disabled=false\\}/);
});
test('semantic review and universe readback do not silently await unbounded provider calls',()=>{
 const semantic=readFileSync(new URL('../src/reality-semantic-review-v0.1.js',import.meta.url),'utf8');
 const universe=readFileSync(new URL('../src/reality-universe-postgres-persistence-v0.1.js',import.meta.url),'utf8');
 assert.match(semantic,/signal:AbortSignal\.timeout\(25000\)/);
 assert.match(universe,/signal:AbortSignal\.timeout\(18000\)/);
});
