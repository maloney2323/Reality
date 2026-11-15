import assert from 'node:assert/strict';
import test from 'node:test';
import { buildModelInput, invokeRealityModel } from '../src/reality-model-gateway-v0.1.js';

const signal = {
  cleaner_version: '0.1.0',
  packet: { packet_id: 'rsp:test', raw_content_digest: 'sha256:raw' },
  fragments: [{ fragment_id: 'sig:test', cleaned_text: 'What is Reality?' }],
  transformation_receipt: { receipt_id: 'tr:test', meaning_change_claimed: false },
  lineage: { packet_id: 'rsp:test', transformation_receipt_id: 'tr:test', continuity_required: true },
};

test('model input preserves signal lineage and does not grant authority', () => {
  const input = buildModelInput({ governedSignal: signal });
  assert.equal(input.governed_signal.packet_id, 'rsp:test');
  assert.equal(input.governed_signal.transformation_receipt.receipt_id, 'tr:test');
  assert.equal(input.authority.granted, false);
  assert.equal(input.authority.execution_authorized, false);
  assert.equal(input.materiality.mode, 'CONVERSATIONAL');
});

test('consequential language is classified without blocking intelligence', () => {
  const input = buildModelInput({
    governedSignal: {
      ...signal,
      fragments: [{ fragment_id: 'sig:test', cleaned_text: 'Send the email to the customer.' }],
    },
  });
  assert.equal(input.materiality.mode, 'ACTION_CANDIDATE');
  assert.equal(input.materiality.governance, 'PROPORTIONAL_ACTION_GOVERNANCE');
  assert.equal(input.authority.granted, false);
});

test('missing API key fails closed', async () => {
  await assert.rejects(
    () => invokeRealityModel({ governedSignal: signal, apiKey: '' }),
    /OPENAI_API_KEY_REQUIRED/,
  );
});

test('provider request preserves the governed signal and uses Responses API', async () => {
  let captured = null;
  const fakeFetch = async (url, options) => {
    captured = { url, options };
    return {
      ok: true,
      async json() {
        return {
          id: 'resp_test',
          status: 'completed',
          output_text: 'Test answer',
        };
      },
    };
  };

  const result = await invokeRealityModel({
    governedSignal: signal,
    apiKey: 'test-key',
    model: 'test-model',
    fetchImpl: fakeFetch,
  });

  assert.equal(captured.url, 'https://api.openai.com/v1/responses');
  const payload = JSON.parse(captured.options.body);
  assert.equal(payload.model, 'test-model');
  assert.equal(payload.input[1].role, 'user');
  assert.match(payload.input[1].content[0].text, /rsp:test/);
  assert.equal(result.answer, 'Test answer');
  assert.equal(result.transformation_receipt_id, 'tr:test');
  assert.equal(result.authority_granted, false);
  assert.equal(result.execution_authorized, false);
});


test('HTTP 200 incomplete model output is not saved as final; continue same response and finish',async()=>{
 const savedPrefix='Reality already has the governance and receipt system. If you want, I can produce the';
 const second=' customer-ready visual report from the existing ROI evidence.';
 let calls=0;
 const events=[];
 const fetchImpl=async(url,opts)=>{
  calls++;assert.equal(url,'https://api.openai.com/v1/responses');
  const request=JSON.parse(opts.body);events.push(request);
  if(calls===1)return {ok:true,json:async()=>({
   id:'resp_first_frozen_123',status:'incomplete',
   incomplete_details:{reason:'max_output_tokens'},
   output_text:savedPrefix
  })};
  return {ok:true,json:async()=>({
   id:'resp_second_frozen_123',status:'completed',output_text:second
  })};
 };
 const result=await invokeRealityModel({governedSignal:signal,
  apiKey:'test-key',model:'test-model',fetchImpl,maxOutputTokens:1700});
 assert.equal(calls,2);
 assert.equal(events[0].max_output_tokens,1700);
 assert.equal(events[1].previous_response_id,'resp_first_frozen_123');
 assert.equal(events[1].max_output_tokens,1400);
 assert.equal(events[1].input[0].role,'user');
 assert.equal(result.provider_status,'completed');
 assert.equal(result.response_id,'resp_second_frozen_123');
 assert.equal(result.continued_from_output_limit,true);
 assert.equal(result.answer,savedPrefix+second);
 assert.equal(result.authority_granted,false);
 assert.equal(result.execution_authorized,false);
});

test('HTTP 200 incomplete result cannot silently publish an unfinished answer',async()=>{
 for(const body of [
  {id:'resp_short_12345',status:'incomplete',
   incomplete_details:{reason:'content_filter'},output_text:'Partial answer'},
  {id:'resp_short_12345',status:'incomplete',
   incomplete_details:{reason:'max_output_tokens'},output_text:''},
  {id:'resp_short_12345',status:'failed',output_text:'Partial answer'}
 ]){
  let calls=0;
  await assert.rejects(()=>invokeRealityModel({governedSignal:signal,
   apiKey:'test-key',model:'test-model',
   fetchImpl:async()=>{calls++;return {ok:true,json:async()=>body}}
  }),/MODEL_RESPONSE_INCOMPLETE_UNRECOVERABLE|MODEL_RESPONSE_NOT_COMPLETED/);
  assert.equal(calls,1);
 }
});

test('a second truncated continuation is never claimed as a saved completed answer',async()=>{
 let calls=0;
 await assert.rejects(()=>invokeRealityModel({governedSignal:signal,
  apiKey:'test-key',model:'test-model',
  fetchImpl:async()=>{
   calls++;
   return {ok:true,json:async()=>(calls===1?{
    id:'resp_original_12345',status:'incomplete',
    incomplete_details:{reason:'max_output_tokens'},
    output_text:'If you want, I can produce the'
   }:{
    id:'resp_continued_12345',status:'incomplete',
    incomplete_details:{reason:'max_output_tokens'},
    output_text:'but not enough output remains'
   })}
  }
 }),/MODEL_RESPONSE_CONTINUATION_NOT_COMPLETED/);
 assert.equal(calls,2,'one bounded continuation, never an unbounded retry');
});

test('ordinary completed model reply remains single-call and unchanged',async()=>{
 let calls=0;
 const result=await invokeRealityModel({governedSignal:signal,
  apiKey:'test-key',model:'test-model',
  fetchImpl:async()=>{
   calls++;
   return {ok:true,json:async()=>({
    id:'resp_complete_12345',status:'completed',
    output_text:'Reality already has authorization and verification.'
   })}
  }
 });
 assert.equal(calls,1);
 assert.equal(result.provider_status,'completed');
 assert.equal(result.continued_from_output_limit,false);
 assert.equal(result.answer,'Reality already has authorization and verification.');
});
