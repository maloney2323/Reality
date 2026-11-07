import test from 'node:test';
import assert from 'node:assert/strict';
import {runGovernedToolSession} from '../src/reality-governed-tool-session-v1.js';

const WORK='work:'+'a'.repeat(32);
const job={independently_verified:true,original_work_id:WORK,
 owner_id:'11111111-2222-4333-8444-555555555555',goal_id:'goal:repair',
 objective:'Read the original code to fix the source-backed execution blocker.',
 installation_authorized:false,provider_effect_may_have_occurred:false,
 production_changed:false,independently_settled:false};
const SEARCH={type:'tool_search_call',execution:'client',
 call_id:'call_search_123',status:'completed',
 arguments:{goal:'Read the source'}};
const CALL={type:'function_call',name:'inspect_source',
 call_id:'call_do_456',arguments:'{"path":"src/example.js"}'};
const mk=(id,output)=>({id,status:'completed',output});
function scenario({mode='DISCOVER_ON_DEMAND',noTool=false,badJob=null,
 invalidToolReceipt=false,moreCalls=false}={}){
 const requests=[],issued=[],dispatched=[];
 const outputs=mode==='DISCOVER_ON_DEMAND'?
  [mk('resp_abcd123',[...(noTool?[]:[SEARCH])]),
   mk('resp_abcd456',[CALL]),
   mk('resp_abcd789',moreCalls?[CALL]:[
    {type:'message',content:[{type:'output_text',text:'Found the source of the bug.'}]}])]:
  [mk('resp_efgh123',[CALL]),
   mk('resp_efgh456',moreCalls?[CALL]:[
    {type:'message',content:[{type:'output_text',text:'Inspected the code.'}]}])];
 const fetchImpl=async(url,opts)=>{
  assert.equal(url,'https://api.openai.com/v1/responses');
  requests.push(JSON.parse(opts.body));
  return {ok:true,json:async()=>outputs[requests.length-1]};
 };
 const adapter={
  describe:async args=>({
   status:'LATE_BOUND_TOOL_AVAILABLE_AT_MODEL_BOUNDARY',
   original_work_id:WORK,
   additional_tools:{role:'developer',type:'additional_tools',
    tools:[{type:'function',name:'inspect_source'}]}}),
  forToolSearch:async args=>{
   issued.push(args);
   return {type:'tool_search_output',execution:'client',
    call_id:args.searchCall.call_id,status:'completed',
    tools:[{type:'function',name:'inspect_source'}]};
  },
  dispatch:async args=>{
   dispatched.push(args);
   return {
    status:invalidToolReceipt?'UNVERIFIED':'GOVERNED_TOOL_CALL_INDEPENDENTLY_VERIFIED',
    original_work_id:WORK,independent_receipt_ref:'receipt:isolated:123',
    original_job_completed:false,
    response_input:{type:'function_call_output',
     call_id:args.functionCall.call_id,
     output:'{"ok":true,"source":"isolated"}'}
   };
  }
 };
 return {adapter,fetchImpl,requests,issued,dispatched,
  props:{model:'gpt-6',apiKey:'only-a-placeholder-test-key',
   fetchImpl,readOriginalTask:async()=>badJob??job,
   lateBoundAdapter:adapter,now:()=> '2026-11-06T18:01:00.000Z',
   mode}};
}
test('client-discovered tool runs in same model response chain with independent receipt',async()=>{
 const s=scenario();
 const r=await runGovernedToolSession(s.props);
 assert.equal(r.status,'VERIFIED_TOOL_RESULT_RETURNED_TO_SAME_MODEL_CONVERSATION');
 assert.equal(r.original_work_id,WORK);
 assert.equal(r.tool_search_completed,true);
 assert.equal(r.provider_requests,3);
 assert.equal(r.original_job_completed,false);
 assert.equal(r.awaiting_original_job_independent_settlement,true);
 assert.equal(s.requests[0].tools[0].type,'tool_search');
 assert.equal(s.requests[1].previous_response_id,'resp_abcd123');
 assert.equal(s.requests[1].input[0].type,'tool_search_output');
 assert.equal(s.requests[1].input[0].call_id,SEARCH.call_id);
 assert.equal(s.requests[2].previous_response_id,'resp_abcd456');
 assert.equal(s.requests[2].input[0].type,'function_call_output');
 assert.equal(s.dispatched.length,1);
 assert.equal(s.dispatched[0].providerResponseId,'resp_abcd456');
 assert.equal(r.model_text,'Found the source of the bug.');
});
test('proactive context adds the governed tool at the model input boundary',async()=>{
 const s=scenario({mode:'PRE_EQUIP'});
 const r=await runGovernedToolSession(s.props);
 assert.equal(r.status,'VERIFIED_TOOL_RESULT_RETURNED_TO_SAME_MODEL_CONVERSATION');
 assert.equal(r.tool_search_completed,false);
 assert.equal(s.requests[0].input[0].type,'additional_tools');
 assert.equal(s.requests[0].input[0].role,'developer');
 assert.equal(s.requests[1].previous_response_id,'resp_efgh123');
 assert.equal(s.dispatched.length,1);
});
test('unverified or settled original job cannot reach model provider',async()=>{
 const s=scenario({badJob:{...job,independently_settled:true}});
 await assert.rejects(runGovernedToolSession(s.props),/CURRENT_SIGNED_ORIGINAL_TASK_REQUIRED/);
 assert.equal(s.requests.length,0);
});
test('model not requesting a tool does not fabricate work or settlement',async()=>{
 const s=scenario({noTool:true});
 const r=await runGovernedToolSession(s.props);
 assert.equal(r.status,'MODEL_DID_NOT_REQUEST_TOOL_DISCOVERY');
 assert.equal(s.requests.length,1);
 assert.equal(s.dispatched.length,0);
 assert.equal(r.original_job_completed,false);
});
test('unverified proxy result cannot be given back to LLM as trusted tool output',async()=>{
 const s=scenario({invalidToolReceipt:true});
 await assert.rejects(runGovernedToolSession(s.props),/DURABLE_SAME_JOB_TOOL_RESULT_UNVERIFIED/);
 assert.equal(s.requests.length,2);
});
test('extra model tool calls require another governed checkpoint instead of unchecked loop',async()=>{
 const s=scenario({moreCalls:true});
 const r=await runGovernedToolSession(s.props);
 assert.equal(r.status,'ADDITIONAL_MODEL_TOOL_WORK_REQUIRES_NEW_GOVERNED_CHECKPOINT');
 assert.equal(r.tool_calls_verified,1);
 assert.equal(s.dispatched.length,1);
 assert.equal(r.original_job_completed,false);
});
