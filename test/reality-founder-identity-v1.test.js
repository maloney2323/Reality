import test from 'node:test';
import assert from 'node:assert/strict';
import {invokeRealityModel,startRealityModelBackground} from '../src/reality-model-gateway-v0.1.js';

const signal={
  cleaner_version:'0.1.0',
  packet:{packet_id:'identity:query',raw_content_digest:'sha256:identity'},
  fragments:[{fragment_id:'identity:fragment',cleaned_text:'Who created Reality?'}],
  transformation_receipt:{receipt_id:'identity:receipt'},
  lineage:{packet_id:'identity:query'}
};

test('Reality product founder is identified in the trusted provider system prompt, not as a user assertion',async()=>{
  let payload;
  const fetchImpl=async(_url,options)=>{
    payload=JSON.parse(options.body);
    return {ok:true,json:async()=>({id:'mock',status:'completed',output_text:'Acknowledged'})};
  };
  const result=await invokeRealityModel({
    governedSignal:signal,systemContext:{conversation_id:'test'},
    apiKey:'test-key',model:'test-model',fetchImpl
  });
  const system=payload.input[0].content[0].text;
  assert.match(system,/REALITY PRODUCT IDENTITY/);
  assert.match(system,/Reality was created and is being built by Ryan Maloney/);
  assert.match(system,/OpenAI develops the underlying language model/);
  assert.match(system,/This project attribution is NOT verification/);
  assert.match(system,/no one execution, installation, or administrative authority/);
  assert.doesNotMatch(payload.input[1].content[0].text,/Ryan Maloney/);
  assert.equal(result.authority_granted,false);
  assert.equal(result.execution_authorized,false);
});

test('background model uses matching product-origin distinction without identity-based privilege',async()=>{
  let payload;
  await startRealityModelBackground({
    governedSignal:signal,apiKey:'test-key',model:'test-model',
    fetchImpl:async(_url,options)=>{
      payload=JSON.parse(options.body);
      return {ok:true,json:async()=>({id:'bg_mock',status:'queued'})};
    }
  });
  assert.match(payload.input[0].content[0].text,/Ryan Maloney/);
  assert.match(payload.input[0].content[0].text,/OpenAI develops its underlying language model/);
  assert.match(payload.input[0].content[0].text,/not proof of the current chat user's identity/);
});
