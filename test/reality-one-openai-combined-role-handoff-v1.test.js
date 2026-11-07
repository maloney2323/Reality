import test from 'node:test';
import assert from 'node:assert/strict';
import {createOneOpenAICombinedRoleCoordinator,
 unavailableRoleHandoff}
 from '../src/reality-one-openai-combined-role-handoff-v1.js';
import {processGovernedEmployeeShiftTick}
 from '../src/reality-governed-employee-shift-worker-v1.js';
const uuid='11111111-2222-4333-8444-555555555555';
const issue='https://github.com/maloney2323/Reality/issues/263';
const data={kind:'GITHUB_SOURCE_READBACK',source_url:issue,
 provider_id:263,provider_status:'OPEN_ISSUE',source_title:'Actual #263 worker disconnect',
 provider_checked:true,read_only:true,production_changed:false};
const context={shift_id:uuid,claim_id:uuid,owner_id:uuid,
 step_index:2,stage:'VERIFY_OPEN_ISSUE',source_ref:issue,
 provider:data,shift_step_claimed:true,read_only:true,
 installation_authorized:false,production_changed:false};
const mockResponse=(output='Source confirms open engineering issue; inspect live executor bindings.')=>({
 ok:true,json:async()=>({id:'resp_1234567890abcdef',status:'completed',
  output:[{type:'message',content:[{type:'output_text',text:output}]}],
  usage:{input_tokens:162,output_tokens:37}})
});
test('one OpenAI request combines Riley and Taylor, and never receives tools or owner authority',async()=>{
 const sent=[],coord=createOneOpenAICombinedRoleCoordinator({
  apiKey:'isolated-not-secret-key',model:'gpt-test',
  fetchImpl:async(url,options)=>{
   sent.push({url,options});return mockResponse();
  }
 });
 const r=await coord(context);
 assert.equal(r.status,'SHARED_OPENAI_ROLE_ADVISORY_RECORDED_NOT_VERIFIED_WORK');
 assert.deepEqual(r.roles,['Riley','Taylor']);
 assert.equal(r.one_shared_openai_provider,true);
 assert.equal(r.model_invocations_completed,1);
 assert.equal(r.independent_verification_performed,false);
 assert.equal(r.original_job_completed,false);
 assert.equal(r.installation_authorized,false);
 assert.equal(r.actual_model_cost_usd,null);
 assert.match(r.advisory_sha256,/^sha256:[a-f0-9]{64}$/);
 assert.equal(r.provider_usage_input_tokens,162);
 assert.equal(sent.length,1);
 assert.equal(sent[0].url,'https://api.openai.com/v1/responses');
 const body=JSON.parse(sent[0].options.body);
 assert.equal(body.tool_choice,'none');
 assert.equal(body.model,'gpt-test');
 assert.equal(Object.hasOwn(body,'tools'),false);
 const msg=body.input[1].content[0].text;
 assert.match(msg,/Riley → Taylor/);
 assert.match(msg,/#263 worker disconnect/);
 assert.match(msg,/Produce a specific, file-aware review/);
 assert.equal(sent[0].options.method,'POST');
});
test('the one-model coordinator changes role context by governed step, no additional model instances',async()=>{
 const seen=[];
 const c=createOneOpenAICombinedRoleCoordinator({
  apiKey:'isolated-not-secret-key',fetchImpl:async(u,o)=>{
   seen.push(JSON.parse(o.body));return mockResponse();
  }});
 const step3={...context,step_index:3,stage:'VERIFY_PROVIDER_EVIDENCE'};
 const step4={...context,step_index:4,stage:'REVIEW_INDEPENDENT_EVIDENCE'};
 const step5={...context,step_index:5,stage:'QUALIFY_NEXT_WORK'};
 const a=await c(step3),b=await c(step4),d=await c(step5);
 assert.deepEqual(a.roles,['Riley','Taylor']);
 assert.deepEqual(b.roles,['Riley','Taylor']);
 assert.deepEqual(d.roles,['Riley','Taylor']);
 assert.equal(seen.length,3);
 assert.ok(seen.every(x=>x.tool_choice==='none'&&!x.tools));
 assert.equal(d.independent_verification_performed,false);
 assert.equal(d.actual_model_cost_usd,null);
});
test('fabricated step identity, unclaimed source, changed GitHub URL and install authority all block before OpenAI',async()=>{
 let calls=0;
 const c=createOneOpenAICombinedRoleCoordinator({
  apiKey:'isolated-not-secret-key',fetchImpl:async()=>{
   calls++;return mockResponse();
  }});
 const bad=[
  {...context,shift_step_claimed:false},
  {...context,owner_id:'other'},
  {...context,claim_id:'other'},
  {...context,stage:'QUALIFY_NEXT_WORK'},
  {...context,source_ref:'https://github.com/maloney2323/Reality/issues/178'},
  {...context,read_only:false},
  {...context,installation_authorized:true},
  {...context,production_changed:true},
  {...context,provider:{...data,provider_checked:false}},
  {...context,provider:{...data,source_url:'https://example.com/evil'}},
  {...context,provider:{...data,kind:'MODEL_SAYS_VERIFIED'}},
 ];
 for(const x of bad)await assert.rejects(c(x),/REALITY_ONE_MODEL_ROLE_/);
 assert.equal(calls,0);
});
test('closed sources skip model calls; unknown OpenAI output is never a verified result',async()=>{
 let calls=0;
 const c=createOneOpenAICombinedRoleCoordinator({
  apiKey:'isolated-not-secret-key',fetchImpl:async()=>{
   calls++;return mockResponse();
  }});
 const closed=await c({...context,provider:{...data,provider_status:'CLOSED'}});
 assert.equal(closed.status,'ROLE_ADVISORY_UNAVAILABLE_NO_COMPLETION_CLAIM');
 assert.equal(closed.reason,'PROVIDER_SOURCE_NO_LONGER_OPEN');
 assert.equal(calls,0);
 for(const response of [
  {ok:false}, {ok:true,json:async()=>({id:'resp_1234567',status:'in_progress',output:[]})},
  {ok:true,json:async()=>({id:'resp_1234567',status:'completed',
   output:[{type:'function_call',name:'install'}]})}
 ]){
  const ca=createOneOpenAICombinedRoleCoordinator({
   apiKey:'isolated-not-secret-key',fetchImpl:async()=>response});
  const result=await ca(context);
  assert.equal(result.status,'ROLE_ADVISORY_UNAVAILABLE_NO_COMPLETION_CLAIM');
  assert.equal(result.model_invocations_completed,0);
  assert.equal(result.original_job_completed,false);
 }
 const longModel=createOneOpenAICombinedRoleCoordinator({
  apiKey:'isolated-not-secret-key',
  fetchImpl:async()=>mockResponse('x'.repeat(2600))
 });
 const truncated=await longModel(context);
 assert.equal(truncated.status,'SHARED_OPENAI_ROLE_ADVISORY_RECORDED_NOT_VERIFIED_WORK');
 assert.equal(truncated.model_advice.length,1200);
 assert.equal(truncated.model_advice_truncated,true);
 assert.equal(truncated.independent_verification_performed,false);
 assert.equal(truncated.original_job_completed,false);
 assert.equal(unavailableRoleHandoff(context).reason,'SHARED_OPENAI_ADAPTER_NOT_CONFIGURED');
});
function fakeShiftStep({coordinator=null,source=issue,step=2,stage='VERIFY_OPEN_ISSUE'}={}){
 const bodyCalls=[];
 const fetchImpl=async(url,opts)=>{
  bodyCalls.push({url,opts});
  if(url.endsWith('reality_close_employee_shift_v1'))
   return {ok:true,json:async()=>({status:'NO_SHIFT_DUE_FOR_CLOSE'})};
  if(url.endsWith('reality_reconcile_employee_shift_original_v1'))
   return {ok:true,json:async()=>({status:'NO_SHIFT_AWAITING_EXACT_WORK'})};
  if(url.endsWith('reality_claim_employee_shift_step_v1'))
   return {ok:true,json:async()=>({
    status:'READ_ONLY_STEP_CLAIMED',shift_id:uuid,owner_id:uuid,
    claim_id:uuid,step_index:step,stage,source_ref:source,
    no_external_write_authority:true
   })};
  if(url==='https://api.github.com/repos/maloney2323/Reality/issues/263')
   return {ok:true,json:async()=>({id:263,state:'open',title:data.source_title,
    html_url:issue})};
  if(url.endsWith('reality_settle_employee_shift_step_v1'))
   return {ok:true,json:async()=>({
    status:'READ_ONLY_PROVIDER_EVIDENCE_RECORDED',step_index:step,
    proof_sha256:'sha256:'+'a'.repeat(64),
    production_changed:false,original_job_completed:false,human_hours_saved:null
   })};
  throw Error('Unexpected '+url);
 };
 return {fetchImpl,bodyCalls,coordinator};
}
test('actual claimed shift source readback invokes one combined OpenAI advisor, stores advisory in durable proof',async()=>{
 const c=createOneOpenAICombinedRoleCoordinator({
  apiKey:'isolated-not-secret-key',fetchImpl:async()=>mockResponse()});
 const {fetchImpl,bodyCalls}=fakeShiftStep();
 const result=await processGovernedEmployeeShiftTick({
  url:'https://isolated.example',secretKey:'not-real'
 },{
  fetchImpl,coordinateRoleWork:c
 });
 assert.equal(result.status,'READ_ONLY_SHIFT_STEP_SETTLED');
 assert.equal(result.role_handoff_model_calls,1);
 assert.deepEqual(result.role_handoff_function_labels,['Riley','Taylor']);
 assert.equal(result.role_handoff_not_independent_verification,true);
 const proof=JSON.parse(bodyCalls.find(x=>x.url.endsWith(
  '/rpc/reality_settle_employee_shift_step_v1')).opts.body).p_proof;
 assert.equal(proof.kind,'GITHUB_SOURCE_READBACK');
 assert.equal(proof.provider_checked,true);
 assert.equal(proof.combined_role_handoff.status,
  'SHARED_OPENAI_ROLE_ADVISORY_RECORDED_NOT_VERIFIED_WORK');
 assert.equal(proof.combined_role_handoff.original_job_completed,false);
 assert.equal(proof.combined_role_handoff.independent_verification_performed,false);
 assert.equal(result.job_completed,false);
});
test('OpenAI unavailable still stores REAL checked provider source with truthful missing role advisory',async()=>{
 const {fetchImpl,bodyCalls}=fakeShiftStep();
 const result=await processGovernedEmployeeShiftTick({
  url:'https://isolated.example',secretKey:'not-real'
 },{fetchImpl,coordinateRoleWork:async()=>{throw Error('provider down')}});
 assert.equal(result.role_handoff_status,'ROLE_ADVISORY_UNAVAILABLE_NO_COMPLETION_CLAIM');
 assert.equal(result.role_handoff_model_calls,0);
 const proof=JSON.parse(bodyCalls.find(x=>x.url.endsWith(
  '/rpc/reality_settle_employee_shift_step_v1')).opts.body).p_proof;
 assert.equal(proof.provider_status,'OPEN_ISSUE');
 assert.equal(proof.combined_role_handoff.original_job_completed,false);
});

test('Riley and Quinn inspect actual PR change patches in an authorized shift review step',async()=>{
 const src='https://github.com/maloney2323/Reality/pull/265';
 const base='https://api.github.com/repos/maloney2323/Reality/pulls/265';
 const calls=[],requestBodies=[];
 const gitResponse=body=>({ok:true,status:200,json:async()=>body});
 const workerFetch=async(url,opt)=>{
  calls.push({url,opt});
  if(url.endsWith('reality_close_employee_shift_v1'))
   return gitResponse({status:'NO_SHIFT_DUE_FOR_CLOSE'});
  if(url.endsWith('reality_reconcile_employee_shift_original_v1'))
   return gitResponse({status:'NO_SHIFT_AWAITING_EXACT_WORK'});
  if(url.endsWith('reality_claim_employee_shift_step_v1'))
   return gitResponse({status:'READ_ONLY_STEP_CLAIMED',
    shift_id:uuid,claim_id:uuid,owner_id:uuid,step_index:4,
    stage:'REVIEW_INDEPENDENT_EVIDENCE',
    source_ref:src,no_external_write_authority:true});
  if(url===base)
   return gitResponse({
    id:9987,html_url:src,title:'Riley preview handoff',
    state:'open',head:{sha:'a'.repeat(40)},base:{sha:'b'.repeat(40)},
    changed_files:1
   });
  if(url===base+'/files?per_page=12')
   return gitResponse([{
    filename:'src/reality-riley-service-original-runtime-v1.js',
    status:'modified',additions:3,deletions:1,
    patch:'@@ -12,3 +12,5 @@\\n- const oldPath=null;\\n+ const exactOriginal=trustedReadback();'
   }]);
  if(url.endsWith('reality_settle_employee_shift_step_v1')){
   requestBodies.push(JSON.parse(opt.body).p_proof);
   return gitResponse({status:'READ_ONLY_PROVIDER_EVIDENCE_RECORDED',
    step_index:4,proof_sha256:'sha256:'+'b'.repeat(64),
    production_changed:false,original_job_completed:false,human_hours_saved:null});
  }
  throw Error('Unexpected PR work request '+url);
 };
 const openaiBodies=[];
 const model=createOneOpenAICombinedRoleCoordinator({
  apiKey:'isolated-not-secret-key',model:'gpt-test',
  fetchImpl:async(url,opt)=>{
   assert.equal(url,'https://api.openai.com/v1/responses');
   openaiBodies.push(JSON.parse(opt.body));return mockResponse(
    'Observed exact changed source path and regression tests needed; no code installed.');
  }
 });
 const result=await processGovernedEmployeeShiftTick({
  url:'https://isolated.example',secretKey:'isolated-no-real-secret'
 },{fetchImpl:workerFetch,coordinateRoleWork:model});
 assert.equal(result.status,'READ_ONLY_SHIFT_STEP_SETTLED');
 assert.equal(result.role_handoff_model_calls,1);
 assert.equal(openaiBodies.length,1);
 const delivered=openaiBodies[0].input[1].content[0].text;
 assert.match(delivered,/reality-riley-service-original-runtime-v1.js/);
 assert.match(delivered,/trustedReadback/);
 assert.equal(openaiBodies[0].tool_choice,'none');
 assert.equal(requestBodies.length,1);
 const evidence=requestBodies[0];
 assert.equal(evidence.provider_evidence.kind,'PULL_REQUEST_CHANGESET_OBSERVED');
 assert.equal(evidence.provider_evidence.review_coverage,'BOUNDED_CHANGED_FILES_READ');
 assert.equal(evidence.provider_evidence.head_sha,'a'.repeat(40));
 assert.equal(evidence.combined_role_handoff.source_details_included,true);
 assert.match(evidence.combined_role_handoff.provider_source_snapshot_sha256,/^sha256:[a-f0-9]{64}$/);
 assert.equal(evidence.combined_role_handoff.original_job_completed,false);
 assert.equal(evidence.combined_role_handoff.independent_verification_performed,false);
 assert.equal(calls.filter(c=>c.url.startsWith('https://api.github.com/')).length,2);
});
