import test from 'node:test';
import assert from 'node:assert/strict';
import {createRealityGovernedOpenAIGateway}
 from '../src/reality-governed-openai-gateway-v1.js';

const id='11111111-2222-4333-8444-555555555555';
const source='https://github.com/maloney2323/Reality/issues/263';
const scope={owner_id:id,shift_id:id,claim_id:id,step_index:2,
 shift_step_claimed:true,read_only:true,installation_authorized:false,
 production_changed:false,source_ref:source,
 provider:{source_url:source,provider_checked:true,read_only:true,
  production_changed:false}};
const request={model:'gpt-5.4',max_output_tokens:300,tool_choice:'none',
 input:[{role:'system',content:[{type:'input_text',text:'Read-only Reality review'}]},
 {role:'user',content:[{type:'input_text',text:'Check current issue'}]}]};
const verified=s=>({status:'CURRENT_OWNER_SHIFT_PROVIDER_READBACK_VERIFIED',
 readback_source:'REALITY_OWNER_SCOPED_SHIFT_DB',
 owner_id:s.owner_id,shift_id:s.shift_id,step_index:s.step_index,
 source_ref:s.source_ref,step_state:'CLAIMED',shift_status:'RUNNING',
 shift_plan_fingerprint:'sha256:'+'b'.repeat(64),
 current_authorized_shift:true,original_job_completed:false,
 installation_authorized:false,production_changed:false});
const response=()=>({ok:true,json:async()=>({
 id:'resp_original_12345',status:'completed',
 output:[{type:'message',content:[{type:'output_text',text:'Observed issue.'}]}]})});
const mk=overrides=>createRealityGovernedOpenAIGateway({
 apiKey:'not-a-production-secret',model:'gpt-5.4',...overrides});
test('current Reality shift readback brackets provider inference without authorizing tools',async()=>{
 let reads=0,requests=0;
 const gw=mk({readCurrentShift:async s=>{reads++;return verified(s)},
 fetchImpl:async(u,o)=>{
  requests++;assert.equal(u,'https://api.openai.com/v1/responses');
  assert.equal(JSON.parse(o.body).tool_choice,'none');
  assert.equal(Object.hasOwn(JSON.parse(o.body),'tools'),false);
  return response();}});
 const result=await gw.readOnlyShiftAdvisory({scope,request});
 assert.equal(reads,2);assert.equal(requests,1);
 assert.equal(result.status,'UNTRUSTED_ADVISORY_ONLY');
 assert.equal(result.full_continuity_verified,false);
 assert.equal(result.model_issued_tool_authority,false);
 assert.equal(result.original_job_completed,false);
});
test('no provider inference when live Reality authorization scope is missing',async()=>{
 let requests=0;
 const gw=mk({readCurrentShift:async s=>({...verified(s),step_state:'REPORTED'}),
 fetchImpl:async()=>{requests++;return response()}});
 await assert.rejects(gw.readOnlyShiftAdvisory({scope,request}),
 /REALITY_OPENAI_GATEWAY_CURRENT_SHIFT_SCOPE_READBACK_REQUIRED/);
 assert.equal(requests,0);
});
test('gateway rejects model-granted tools and unauthorized model continuation',async()=>{
 let requests=0,reads=0;
 const gw=mk({readCurrentShift:async s=>{reads++;return verified(s)},
 fetchImpl:async()=>{requests++;return response()}});
 for(const extra of [
  {tools:[{type:'function',name:'unapproved'}]},
  {tool_choice:'auto'},
  {previous_response_id:'resp_unauthorized'},
  {max_output_tokens:2000}
 ]){
  await assert.rejects(gw.readOnlyShiftAdvisory({scope,request:{...request,...extra}}),
   /REALITY_OPENAI_GATEWAY_ADVISORY_ONLY_MODEL_REQUEST_REQUIRED/);
 }
 assert.equal(reads,0);assert.equal(requests,0);
});
test('if shift plan changes during model reasoning, response cannot be published',async()=>{
 let reads=0;
 const gw=mk({readCurrentShift:async s=>({
  ...verified(s),shift_plan_fingerprint:'sha256:'+(++reads===1?'b':'c').repeat(64)}),
 fetchImpl:async()=>response()});
 await assert.rejects(gw.readOnlyShiftAdvisory({scope,request}),
 /REALITY_OPENAI_GATEWAY_SHIFT_PLAN_DRIFT_RECHECK_REQUIRED/);
 assert.equal(reads,2);
});
test('model tool-call response never becomes a governed advisory',async()=>{
 const gw=mk({readCurrentShift:async s=>verified(s),
 fetchImpl:async()=>({ok:true,json:async()=>({id:'resp_original_12345',
  status:'completed',output:[{type:'function_call',name:'publish'}]})})});
 const result=await gw.readOnlyShiftAdvisory({scope,request});
 assert.equal(result.status,'UNAVAILABLE');
 assert.equal(result.reason,'OPENAI_PROVIDER_RESULT_UNVERIFIED');
});
