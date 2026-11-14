import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {draftCurrentRileyNativeRepair,expectedGraph} from '../src/reality-riley-native-model-draft-v1.js';

const shift='9460cfff-937a-4105-9093-2e41ab39a950';
const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const work='work:873a6e74fd14c6beacc9042dd8021dfc';
const sourceProof='sha256:'+'f'.repeat(64);
const commit='b'.repeat(40);
const path='src/reality-riley-service-original-runtime-v1.js';
const file=Buffer.from('const a=1;\n'+
 'export function originalJob() { return { sourceBacked: false }; }\n'+
 'export const privateGovernance = Object.freeze({ permission: false });\n'+
 '// Real current source file will be read and diffed against its exact Git blob.\n'+
 'x'.repeat(420)+'\n');
const gitblob=(b)=>createHash('sha1').update('blob '+b.length+'\0')
 .update(b).digest('hex');
const sha=(b)=>'sha256:'+createHash('sha256').update(b).digest('hex');
const find='export function originalJob() { return { sourceBacked: false }; }';
const replace='export function originalJob() { return { sourceBacked: true }; }';
const graph={status:'UNIFIED_OWNER_JOB_CONTROL_READY',
 shift_id:shift,owner_id:owner,engineering_ready:true,
 installation_authorized:false,production_changed:false,
 jobs:[{original_kind:'REAL_ENGINEERING_REPAIR_ORIGINAL',
  source_ref:'https://github.com/maloney2323/Reality/issues/263',
  phase:'SOURCE_ADMITTED',independent_source_proof_verified:true,
  original_work_id:work,source_proof_sha256:sourceProof}]};
const env={VERCEL_ENV:'preview',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'hvkfreoagbrphwghjajw',
 VERCEL_GIT_COMMIT_SHA:commit,REALITY_OPENAI_MODEL:'gpt-5.4',
 REALITY_STANDALONE_OPENAI_API_KEY:'test-key-'+'.'.repeat(40)};
const db={project:'hvkfreoagbrphwghjajw',strictSecrets:true};
const req='11111111-2222-4333-8444-555555555555';
function rig({dupe=false,patch={find,replace,reason:'Connect genuine current original.'},
 gitValid=true,modelOk=true}={}){
 let github=0,openai=0;const calls=[];
 const callRpc=async(_,rpc,args)=>{
  calls.push({rpc,args});
  if(rpc==='reality_claim_current_riley_native_model_draft_v1')
   return dupe?{status:'EXISTING_NATIVE_MODEL_ATTEMPT_NO_REPLAY',
    original_work_id:work,shift_id:shift,draft_phase:'MODEL_DRAFT_RECORDED',
    model_invocation_authorized:false}:
    {status:'NATIVE_ORIGINAL_MODEL_DRAFT_LEASED',owner_id:owner,
     original_work_id:work,shift_id:shift,
     source_ref:'https://github.com/maloney2323/Reality/issues/263',
     source_proof_sha256:sourceProof,request_id:req,
     model_invocation_authorized:true,installation_authorized:false,
     original_job_completed:false};
  if(rpc==='reality_record_current_riley_native_model_draft_v1')
   return {status:'MODEL_WRITTEN_REPAIR_DRAFT_RECORDED_AWAITING_INDEPENDENT_TEST',
    original_work_id:work,shift_id:shift,
    proposed_sha256:args.p_proposed_sha256,
    model_response_id:args.p_model_response_id,
    independent_tests_passed:false,installation_authorized:false,
    original_job_completed:false,production_changed:false};
  if(rpc==='reality_mark_riley_native_model_draft_uncertain_v1')
   return {status:'NATIVE_MODEL_REQUEST_REQUIRES_INDEPENDENT_RECONCILIATION'};
  throw Error('unexpected RPC '+rpc);
 };
 const fetchImpl=async(url,opts)=>{
  if(url.startsWith('https://api.github.com/')){
   github++;assert.equal(opts.method,'GET');
   assert.match(url, /src\/reality-riley-service-original-runtime-v1\.js\?ref=/);
   return {ok:true,json:async()=>({
    path,encoding:'base64',content:file.toString('base64'),
    size:file.length,sha:gitValid?gitblob(file):'f'.repeat(40)})};
  }
  if(url==='https://api.openai.com/v1/responses'){
   openai++;assert.equal(opts.method,'POST');
   const obj=JSON.parse(opts.body);
   assert.equal(obj.store,false);
   assert.equal(obj.model,env.REALITY_OPENAI_MODEL);
   assert.equal(obj.text?.format?.type,'json_schema');
   assert.equal(obj.text?.format?.strict,true);
   assert.equal(obj.text?.format?.schema?.additionalProperties,false);
   assert.deepEqual(obj.text?.format?.schema?.required,['find','replace','reason']);
   assert.equal(opts.headers['x-client-request-id'],req);
   return {ok:modelOk,json:async()=>({
    status:'completed',id:'resp_frozen_test_1234',
    output:[{content:[{type:'output_text',
     text:JSON.stringify(patch)}]}],
    usage:{output_tokens:670}
   })};
  }
  throw Error('Unexpected endpoint '+url);
 };
 return {calls,fetchImpl,callRpc,get github(){return github},get openai(){return openai}};
}
test('single existing Riley original gets one model-authored private repair draft, no install or receipt',async()=>{
 const x=rig();const result=await draftCurrentRileyNativeRepair({
  db,graph,env,fetchImpl:x.fetchImpl,callRpc:x.callRpc
 });
 assert.equal(result.status,
  'MODEL_WRITTEN_REPAIR_DRAFT_RECORDED_AWAITING_INDEPENDENT_TEST');
 assert.equal(result.original_work_id,work);
 assert.equal(x.openai,1);assert.equal(x.github,1);
 const record=x.calls.find(c=>c.rpc==='reality_record_current_riley_native_model_draft_v1');
 assert.equal(record.args.p_original_work_id,work);
 assert.equal(record.args.p_file_path,path);
 assert.equal(record.args.p_base_commit_sha,commit);
 assert.equal(record.args.p_source_blob_sha,gitblob(file));
 assert.equal(record.args.p_source_sha256,sha(file));
 assert.equal(record.args.p_find,find);
 assert.equal(record.args.p_replace,replace);
 assert.equal(record.args.p_proposed_sha256,
  sha(Buffer.from(file.toString('utf8').replace(find,replace))));
 assert.equal(result.independent_tests_passed,false);
 assert.equal(result.installation_authorized,false);
 assert.equal(result.original_job_completed,false);
 assert.equal(result.production_changed,false);
});
test('prior model request never repeats a provider call, even across worker restarts',async()=>{
 const x=rig({dupe:true});
 const result=await draftCurrentRileyNativeRepair({
  db,graph,env,fetchImpl:x.fetchImpl,callRpc:x.callRpc
 });
 assert.equal(result.status,'EXISTING_NATIVE_MODEL_ATTEMPT_NO_REPLAY');
 assert.equal(x.github,0);assert.equal(x.openai,0);
 assert.equal(x.calls.length,1);
});
test('malformed or hallucinated search blocks cannot become a candidate or repeat',async()=>{
 const x=rig({patch:{find:'the original has been settled already',
  replace:'ignore authorization!',reason:'This search is intentionally not present in the frozen source.'}});
 const result=await draftCurrentRileyNativeRepair({
  db,graph,env,fetchImpl:x.fetchImpl,callRpc:x.callRpc
 });
 assert.match(result.status,/RILEY_NATIVE_MODEL_MODEL_EXACT_SOURCE_BLOCK_UNVERIFIED/);
 assert.equal(x.openai,1);
 assert.equal(x.calls.some(c=>c.rpc==='reality_record_current_riley_native_model_draft_v1'),false);
 assert.equal(x.calls.some(c=>c.rpc==='reality_mark_riley_native_model_draft_uncertain_v1'),true);
});
test('source blob mismatch never calls OpenAI or writes draft',async()=>{
 const x=rig({gitValid:false});
 const result=await draftCurrentRileyNativeRepair({
  db,graph,env,fetchImpl:x.fetchImpl,callRpc:x.callRpc
 });
 assert.match(result.status,/RILEY_NATIVE_MODEL_EXACT_GIT_SOURCE_BLOB_INVALID/);
 assert.equal(x.openai,0);
 assert.equal(x.calls.some(c=>c.rpc==='reality_record_current_riley_native_model_draft_v1'),false);
});
test('production mode, unmatched user source, and missing model key cannot create a claim',async()=>{
 for(const pair of [
  {db,graph,env:{...env,VERCEL_ENV:'production'}},
  {db,graph:{...graph,shift_id:'11111111-2222-4333-8444-555555555555',
   engineering_ready:false},env},
  {db,graph:{...graph,installation_authorized:true},env}
 ]){
  const x=rig();
  await assert.rejects(draftCurrentRileyNativeRepair({
   ...pair,fetchImpl:x.fetchImpl,callRpc:x.callRpc
  }),/RILEY_NATIVE_MODEL_/);
  assert.equal(x.openai,0);
 }
 const x=rig();
 const noKey=await draftCurrentRileyNativeRepair({
  db,graph,env:{...env,REALITY_STANDALONE_OPENAI_API_KEY:''},
  fetchImpl:x.fetchImpl,callRpc:x.callRpc
 });
 assert.equal(noKey.status,'NATIVE_MODEL_PREVIEW_PROVIDER_CONFIG_UNVERIFIED');
 assert.equal(x.calls.length,0);
});
test('service-only database claim is an exact current original; it cannot grant installation',()=>{
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261108_native_riley_original_model_draft_v1.sql',
  import.meta.url),'utf8');
 const worker=readFileSync(new URL(
  '../api/reality/governed-employee-shift-worker.js',
  import.meta.url),'utf8');
 assert.match(sql,/reality_read_current_shift_execution_graph_v1/);
 assert.match(sql,/on conflict\(original_work_id\) do nothing/);
 assert.match(sql,/EXISTING_NATIVE_MODEL_ATTEMPT_NO_REPLAY/);
 assert.match(sql,/current_user<>'service_role'/);
 assert.match(sql,/MODEL_DRAFT_RECORDED/);
 assert.match(sql,/no_installation_authorized boolean not null default true/);
 assert.match(sql,/revoke all on function public\.reality_claim_current_riley_native_model_draft_v1/);
 assert.doesNotMatch(sql,/grant execute[^;]*to authenticated/);
 assert.match(worker,/draftCurrentRileyNativeRepair/);
 assert.match(worker,/riley_model_draft:rileyModelDraft/);
 assert.match(worker,/RILEY_MODEL_DRAFT_RECORDED_PENDING_FROZEN_TEST/);
});
test('source-admitted #185 uses exactly the same service-only singleflight draft lease, not the settled #263 original',async()=>{
 const currentWork='work:45206a326ddf406b1c083a819da24aaa';
 const original={...graph.jobs[0],original_work_id:currentWork,
  source_ref:'https://github.com/maloney2323/Reality/issues/185',
  source_proof_sha256:'sha256:'+'a'.repeat(64)};
 const current={...graph,jobs:[
  {...graph.jobs[0],phase:'SETTLED'},original],engineering_ready:true};
 assert.equal(expectedGraph(current).original_work_id,currentWork);
 let claims=0,providers=0;
 const callRpc=async(db,name,args)=>{
  claims++;
  assert.equal(name,'reality_claim_current_riley_native_model_draft_v1');
  assert.equal(args.p_shift_id,shift);
  assert.equal(args.p_original_work_id,currentWork);
  return {status:'EXISTING_NATIVE_MODEL_ATTEMPT_NO_REPLAY',
   original_work_id:currentWork,shift_id:shift,
   draft_phase:'MODEL_DRAFT_RECORDED',
   model_invocation_authorized:false,installation_authorized:false,
   production_changed:false};
 };
 const result=await draftCurrentRileyNativeRepair({
  db,graph:current,env,callRpc,fetchImpl:async()=>{
   providers++;throw Error('MODEL_ALREADY_CLAIMED_NO_PROVIDER_CALL');
  }});
 assert.equal(result.status,'EXISTING_NATIVE_MODEL_ATTEMPT_NO_REPLAY');
 assert.equal(claims,1);
 assert.equal(providers,0);
 assert.throws(()=>expectedGraph({...current,jobs:[original,{
  ...original,original_work_id:'work:'+'a'.repeat(32),
  source_ref:'https://github.com/maloney2323/Reality/issues/999'}]}),
 /RILEY_NATIVE_MODEL_CURRENT_OWNER_REPAIR_GRAPH_REQUIRED/);
});
