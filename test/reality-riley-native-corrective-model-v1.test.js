import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {reviseCurrentRileyNativeRepair}
 from '../src/reality-riley-native-corrective-model-v1.js';
const shift='9460cfff-937a-4105-9093-2e41ab39a950';
const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const work='work:873a6e74fd14c6beacc9042dd8021dfc';
const digest='sha256:'+'e'.repeat(64);
const sha='c'.repeat(40),failedSha='a'.repeat(40),runId=42493703224;
const reqId='11111111-2222-4333-8444-555555555555';
const path='src/reality-riley-service-original-runtime-v1.js';
const find='export function verifyOwnerOriginal() { return true; }';
const replace='export function verifyOwnerOriginal() { return source_context.original_job_settled === false; }';
const source=Buffer.from('export const known=true;\n'+
 find+'\n'+'// Model-revision frozen origin\n'+'a'.repeat(450));
const sourceBlob=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
const hash=b=>'sha256:'+createHash('sha256').update(b).digest('hex');
const graph={
 status:'UNIFIED_OWNER_JOB_CONTROL_READY',shift_id:shift,owner_id:owner,
 engineering_ready:true,installation_authorized:false,production_changed:false,
 jobs:[{original_kind:'REAL_ENGINEERING_REPAIR_ORIGINAL',
  original_work_id:work,phase:'SOURCE_ADMITTED',
  source_ref:'https://github.com/maloney2323/Reality/issues/263',
  source_proof_sha256:digest,independent_source_proof_verified:true}]
};
const env={VERCEL_ENV:'preview',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'hvkfreoagbrphwghjajw',
 VERCEL_GIT_COMMIT_SHA:sha,REALITY_OPENAI_MODEL:'gpt-5.4',
 REALITY_STANDALONE_OPENAI_API_KEY:'isolated-example-credential-long'};
const db={strictSecrets:true,project:'hvkfreoagbrphwghjajw'};
const failProof='https://github.com/maloney2323/Reality/actions/runs/'+runId;
function rig({duplicate=false,badRun=false,badModel=false,badEdit=false}={}){
 let reads=0,models=0;const calls=[];
 const callRpc=async(_db,name,args)=>{
  calls.push({name,args});
  if(name==='reality_claim_same_riley_native_model_revision_v1')
   return duplicate?{status:'SAME_ORIGINAL_REVISION_ALREADY_ATTEMPTED_NO_REPLAY',
    shift_id:shift,original_work_id:work,revision_phase:'MODEL_REVISION_RECORDED',
    model_invocation_authorized:false}:
    {status:'SAME_ORIGINAL_MODEL_CORRECTION_LEASED',
     shift_id:shift,owner_id:owner,original_work_id:work,
     request_id:reqId,source_proof_sha256:digest,
     failing_commit_sha:failedSha,failing_run_id:runId,
     initial_model_response_id:'resp_025094d10012c72b016af08f9dc04c87d2bd4fd774e16f7d46',
     model_invocation_authorized:true,installation_authorized:false,
     original_job_completed:false,production_changed:false};
  if(name==='reality_record_same_riley_native_model_revision_v1')
   return {status:'SAME_ORIGINAL_CORRECTED_MODEL_DRAFT_AWAITING_FROZEN_TEST',
    shift_id:shift,original_work_id:work,proposed_sha256:args.p_proposed_sha256,
    model_response_id:args.p_model_response_id,
    independent_tests_passed:false,installation_authorized:false,
    original_job_completed:false,production_changed:false};
  if(name==='reality_mark_same_riley_native_model_revision_uncertain_v1')
   return {status:'REVISION_PROVIDER_EFFECT_UNVERIFIED_NO_AUTOMATIC_REPLAY'};
  throw Error('UNEXPECTED_RPC_'+name);
 };
 const fetchImpl=async(url,options)=>{
  if(url.includes('/actions/runs/')){
   reads++;
   return {ok:true,json:async()=>({
    id:runId,status:'completed',conclusion:badRun?'success':'failure',
    name:'Reality — Isolated governed OpenAI gateway proof',
    head_sha:failedSha,html_url:failProof})};
  }
  if(url.includes('/contents/')){
   reads++;
   assert.equal(options.method,'GET');
   return {ok:true,json:async()=>({
    path,encoding:'base64',content:source.toString('base64'),
    size:source.length,sha:sourceBlob(source)})};
  }
  if(url==='https://api.openai.com/v1/responses'){
   models++;assert.equal(options.method,'POST');
   assert.equal(options.headers['x-client-request-id'],reqId);
   const request=JSON.parse(options.body);
   assert.equal(request.store,false);
   assert.equal(request.text.format.type,'json_schema');
   assert.equal(request.text.format.strict,true);
   assert.deepEqual(request.text.format.schema.required,['find','replace','reason']);
   return {ok:!badModel,json:async()=>({
    status:'completed',id:'resp_corrected_original_001',
    output:[{content:[{type:'output_text',text:JSON.stringify({
     find,replace:badEdit?'if(scope?.original_job_settled!==false) fail();':replace,
     reason:'Stop referencing nonexistent scope field from the failing candidate.'
    })}]}],usage:{output_tokens:321}
   })};
  }
  throw Error('UNEXPECTED_URL');
 };
 return {callRpc,fetchImpl,calls,get reads(){return reads},get models(){return models}};
}
test('frozen failing run directs one genuine revised source patch to the same original, no authority increase',async()=>{
 const r=rig();
 const out=await reviseCurrentRileyNativeRepair({
  db,graph,env,fetchImpl:r.fetchImpl,callRpc:r.callRpc});
 assert.equal(out.status,'SAME_ORIGINAL_CORRECTED_MODEL_DRAFT_AWAITING_FROZEN_TEST');
 assert.equal(out.original_work_id,work);
 assert.equal(out.shift_id,shift);
 assert.equal(out.installation_authorized,false);
 assert.equal(out.original_job_completed,false);
 assert.equal(out.production_changed,false);
 assert.equal(out.independent_tests_passed,false);
 assert.equal(r.models,1);assert.equal(r.reads,2);
 const w=r.calls.find(x=>x.name==='reality_record_same_riley_native_model_revision_v1');
 assert.equal(w.args.p_original_work_id,work);
 assert.equal(w.args.p_find,find);assert.equal(w.args.p_replace,replace);
 assert.equal(w.args.p_proposed_sha256,hash(Buffer.from(source.toString('utf8').replace(find,replace))));
});
test('duplicate shift wake cannot repeat a failed-candidate repair model invocation',async()=>{
 const r=rig({duplicate:true});
 const out=await reviseCurrentRileyNativeRepair({
  db,graph,env,fetchImpl:r.fetchImpl,callRpc:r.callRpc});
 assert.equal(out.status,'SAME_ORIGINAL_REVISION_ALREADY_ATTEMPTED_NO_REPLAY');
 assert.equal(r.reads,0);assert.equal(r.models,0);
 assert.equal(r.calls.length,1);
});
test('untrusted GitHub run that did not fail never reaches OpenAI',async()=>{
 const r=rig({badRun:true});
 const out=await reviseCurrentRileyNativeRepair({
  db,graph,env,fetchImpl:r.fetchImpl,callRpc:r.callRpc});
 assert.match(out.status,/FROZEN_FAILURE_MISMATCH/);
 assert.equal(r.models,0);
 assert.equal(r.calls.some(x=>x.name==='reality_record_same_riley_native_model_revision_v1'),false);
 assert.equal(r.calls.some(x=>x.name==='reality_mark_same_riley_native_model_revision_uncertain_v1'),true);
});
test('regression: model cannot reintroduce the undefined scope original settlement flag',async()=>{
 const r=rig({badEdit:true});
 const out=await reviseCurrentRileyNativeRepair({
  db,graph,env,fetchImpl:r.fetchImpl,callRpc:r.callRpc});
 assert.match(out.status,/PRIOR_FAILED_UNDEFINED_SCOPE_REINTRODUCED/);
 assert.equal(r.calls.some(x=>x.name==='reality_record_same_riley_native_model_revision_v1'),false);
});
test('no model dispatch for drifted owner, production environment, or missing model key',async()=>{
 for(const options of [
  {graph:{...graph,owner_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',engineering_ready:false},env},
  {graph,env:{...env,VERCEL_ENV:'production'}},
 ]){
  const r=rig();
  await assert.rejects(reviseCurrentRileyNativeRepair({
   db,...options,fetchImpl:r.fetchImpl,callRpc:r.callRpc}),/RILEY_/);
  assert.equal(r.models,0);
 }
 const r=rig();
 const out=await reviseCurrentRileyNativeRepair({
  db,graph,env:{...env,REALITY_STANDALONE_OPENAI_API_KEY:''},
  fetchImpl:r.fetchImpl,callRpc:r.callRpc});
 assert.equal(out.status,'RILEY_CORRECTIVE_MODEL_PREVIEW_CONFIG_UNVERIFIED');
 assert.equal(r.models,0);
});
test('worker source and database require independent negative proof and do not install or settle',()=>{
 const worker=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 const rpc=readFileSync(new URL('../src/reality-governed-shift-boundary-v1.js',import.meta.url),'utf8');
 const sql=readFileSync(new URL('../supabase/migrations/20261108_riley_native_frozen_fail_same_job_model_revision_v1.sql',import.meta.url),'utf8');
 assert.match(worker,/reviseCurrentRileyNativeRepair/);
 assert.match(worker,/riley_corrected_model_draft:rileyCorrectedDraft/);
 assert.match(worker,/RILEY_CORRECTED_CODE_DRAFT_PENDING_INDEPENDENT_TEST/);
 assert.match(rpc,/claim_same_riley_native_model_revision_v1/);
 assert.match(sql,/riley_native_frozen_test_findings_v1/);
 assert.match(sql,/f\.conclusion='failure'/);
 assert.match(sql,/f\.model_response_id=x\.model_response_id/);
 assert.match(sql,/current_user<>'service_role'/);
 assert.match(sql,/on conflict\(original_work_id\) do nothing/);
 assert.match(sql,/MODEL_REVISION_UNVERIFIED/);
 assert.doesNotMatch(sql,/grant execute[^;]*to authenticated/);
});
test('independent failed owner-scope CI readback supersedes stale pending model status',()=>{
 const worker=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../reality-chat-simple.html',import.meta.url),'utf8');
 const boundary=readFileSync(new URL('../src/reality-governed-shift-boundary-v1.js',import.meta.url),'utf8');
 const sql=readFileSync(new URL('../supabase/migrations/20261108_riley_current_revision_failure_readback_v1.sql',import.meta.url),'utf8');
 assert.match(worker,/reality_read_current_riley_revision_test_outcome_v1/);
 assert.match(worker,/RILEY_CORRECTED_CODE_OWNER_SCOPE_TEST_FAILED/);
 assert.match(worker,/riley_revision_frozen_test:rileyCorrectionTest/);
 assert.match(ui,/REPAIR REJECTED · Independent owner-scope test failed/);
 assert.match(ui,/you do not need to authorize another batch/);
 assert.match(boundary,/read_current_riley_revision_test_outcome_v1/);
 assert.match(sql,/f\.ci_conclusion='failure'/);
 assert.match(sql,/j\.exact_approval_receipt_ref is null/);
 assert.match(sql,/current_user<>'service_role'/);
 assert.doesNotMatch(sql,/grant execute[^;]*to authenticated/);
});
