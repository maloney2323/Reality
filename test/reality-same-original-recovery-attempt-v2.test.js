import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {continueSameOriginalRecoveryAfterVerifiedFailure}
 from '../src/reality-governed-auto-trigger-v1.0.js';
const shift='9460cfff-937a-4105-9093-2e41ab39a950';
const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const work='work:'+'a'.repeat(32);
const attempt='c023999f-1122-4333-8444-555555555555';
const request='c023999f-1122-4333-8444-555555555556';
const digest='sha256:'+'e'.repeat(64);
const failed='a'.repeat(40);
const commit='c'.repeat(40);
const runId=43597941179;
const target='src/reality-riley-service-original-runtime-v1.js';
const find='export function existingRepairHandoff() { return false; }';
const replace='export function existingRepairHandoff() { return true; }';
const bytes=Buffer.from('export const original=true;\n'+find+'\n'+'a'.repeat(450));
const blob=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
const hash=b=>'sha256:'+createHash('sha256').update(b).digest('hex');
const db={strictSecrets:true,project:'hvkfreoagbrphwghjajw'};
const env={VERCEL_ENV:'preview',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'hvkfreoagbrphwghjajw',
 VERCEL_GIT_COMMIT_SHA:commit,REALITY_OPENAI_MODEL:'gpt-5.4',
 REALITY_STANDALONE_OPENAI_API_KEY:'test-only-isolated-model-credential'};
function setup({duplicate=false,badRun=false,badSource=false,badModel=false}={}){
 const calls=[],http=[];let models=0;
 const claim={status:'SAME_ORIGINAL_RECOVERY_MODEL_LEASED',
  shift_id:shift,owner_id:owner,original_work_id:work,
  attempt_id:attempt,attempt_number:2,request_id:request,
  source_ref:'https://github.com/maloney2323/Reality/issues/87',
  source_path:badSource?'src/different-source.js':target,
  source_proof_sha256:digest,failed_candidate_sha256:digest,
  failed_run_id:runId,failed_commit_sha:failed,
  model_invocation_authorized:true,new_shift_started:false,
  original_job_completed:false,installation_authorized:false,
  production_changed:false};
 const callRpc=async(_db,name,args)=>{
  calls.push({name,args});
  if(name==='reality_claim_same_original_recovery_attempt_v2')
   return duplicate?{status:'EXISTING_SAME_ORIGINAL_RECOVERY_NO_REPLAY',
    attempt_id:attempt,attempt_number:2,phase:'MODEL_PATCH_RECORDED',
    original_work_id:work,shift_id:shift,model_invocation_authorized:false,
    installation_authorized:false,original_job_completed:false,
    production_changed:false}:claim;
  if(name==='reality_record_same_original_recovery_patch_v2')
   return {status:'SAME_ORIGINAL_RECOVERY_PATCH_RECORDED',
    original_work_id:work,shift_id:shift,attempt_id:attempt,
    attempt_number:2,model_response_id:args.p_model_response_id,
    proposed_sha256:args.p_proposed_sha256,independent_tests_passed:false,
    new_shift_started:false,original_job_completed:false,
    installation_authorized:false,production_changed:false};
  if(name==='reality_mark_same_original_recovery_uncertain_v2')
   return {status:'RECOVERY_PROVIDER_UNVERIFIED_NO_AUTOMATIC_REPLAY'};
  throw Error('UNEXPECTED_RPC');
 };
 const fetchImpl=async(url,options)=>{
  http.push({url,options});
  if(url.includes('/actions/runs/'))
   return {ok:true,json:async()=>({
    id:runId,head_sha:badRun?'f'.repeat(40):failed,
    status:'completed',conclusion:'failure',
    name:'Reality — Isolated governed OpenAI gateway proof',
    html_url:'https://github.com/maloney2323/Reality/actions/runs/'+runId,
    head_repository:{full_name:'maloney2323/Reality'}})};
  if(url.includes('/contents/'))
   return {ok:true,json:async()=>({
    path:target,encoding:'base64',content:bytes.toString('base64'),
    size:bytes.length,sha:blob(bytes)})};
  if(url==='https://api.openai.com/v1/responses'){
   models++;
   assert.equal(options.method,'POST');
   assert.equal(options.headers['x-client-request-id'],request);
   const body=JSON.parse(options.body);
   assert.equal(body.store,false);
   assert.equal(body.text.format.strict,true);
   return {ok:!badModel,json:async()=>({
    status:'completed',id:'resp_same_original_recovery_0001',
    output:[{content:[{type:'output_text',text:JSON.stringify({
     find,replace,reason:'Correct independently observed handoff failure'
    })}]}],usage:{output_tokens:251}
   })};
  }
  throw Error('UNEXPECTED_REMOTE_READ');
 };
 return {callRpc,fetchImpl,calls,http,get models(){return models}};
}
test('the existing governor records a NEW typed repair attempt on the SAME original after independent CI failure',async()=>{
 const r=setup();
 const proof=await continueSameOriginalRecoveryAfterVerifiedFailure({
  db,env,fetchImpl:r.fetchImpl,callRpc:r.callRpc
 });
 assert.equal(proof.status,'SAME_ORIGINAL_RECOVERY_PATCH_RECORDED');
 assert.equal(proof.original_work_id,work);
 assert.equal(proof.attempt_id,attempt);
 assert.equal(proof.attempt_number,2);
 assert.equal(proof.new_shift_started,false);
 assert.equal(proof.installation_authorized,false);
 assert.equal(proof.original_job_completed,false);
 assert.equal(proof.independent_tests_passed,false);
 assert.equal(proof.next_governed_action,'STAGE_AND_INDEPENDENTLY_TEST_SAME_ORIGINAL_PATCH');
 assert.equal(r.models,1);
 const patch=r.calls.find(x=>x.name==='reality_record_same_original_recovery_patch_v2');
 assert.equal(patch.args.p_attempt_id,attempt);
 assert.equal(patch.args.p_request_id,request);
 assert.equal(patch.args.p_proposed_sha256,hash(Buffer.from(bytes.toString('utf8').replace(find,replace))));
 assert.equal(patch.args.p_source_path,target);
 assert.equal(r.calls.some(x=>/authorize|install|settle/.test(x.name)),false);
});
test('repeat scheduled wakes reuse the recorded attempt and never call a model again',async()=>{
 const r=setup({duplicate:true});
 const proof=await continueSameOriginalRecoveryAfterVerifiedFailure({
  db,env,fetchImpl:r.fetchImpl,callRpc:r.callRpc
 });
 assert.equal(proof.status,'EXISTING_SAME_ORIGINAL_RECOVERY_NO_REPLAY');
 assert.equal(proof.phase,'MODEL_PATCH_RECORDED');
 assert.equal(r.models,0);
 assert.equal(r.http.length,0);
 assert.equal(r.calls.length,1);
});
test('tampered GitHub negative proof cannot authorize any model edit',async()=>{
 const r=setup({badRun:true});
 const proof=await continueSameOriginalRecoveryAfterVerifiedFailure({
  db,env,fetchImpl:r.fetchImpl,callRpc:r.callRpc
 });
 assert.equal(proof.status,'RECOVERY_PROVIDER_OR_EVIDENCE_UNVERIFIED_NO_REPLAY');
 assert.equal(r.models,0);
 assert.equal(r.calls.some(x=>x.name==='reality_record_same_original_recovery_patch_v2'),false);
 const uncertain=r.calls.find(x=>x.name==='reality_mark_same_original_recovery_uncertain_v2');
 assert.equal(uncertain.args.p_attempt_id,attempt);
 assert.match(uncertain.args.p_reason,/^RECOVERY_INDEPENDENT_NEGATIVE_PROOF_UNVERIFIED$/);
});
test('the service rejects a source path not bound to existing Riley original without calling OpenAI',async()=>{
 const r=setup({badSource:true});
 const proof=await continueSameOriginalRecoveryAfterVerifiedFailure({
  db,env,fetchImpl:r.fetchImpl,callRpc:r.callRpc
 });
 assert.equal(proof.status,'RECOVERY_CLAIM_SCOPE_OR_SOURCE_UNVERIFIED');
 assert.equal(r.models,0);
 assert.equal(r.http.length,0);
});
test('missing preview model credential cannot mint a patch or authorize installation',async()=>{
 const r=setup();
 const proof=await continueSameOriginalRecoveryAfterVerifiedFailure({
  db,env:{...env,REALITY_STANDALONE_OPENAI_API_KEY:''},
  fetchImpl:r.fetchImpl,callRpc:r.callRpc
 });
 assert.equal(proof.status,'RECOVERY_PROVIDER_OR_EVIDENCE_UNVERIFIED_NO_REPLAY');
 assert.equal(r.models,0);
 assert.equal(r.calls.some(x=>x.name==='reality_record_same_original_recovery_patch_v2'),false);
});
test('isolated retry ledger retains old failure, strict service gates and no duplicated owner authority',()=>{
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261114_same_original_evidence_backed_recovery_attempts_v2.sql',
  import.meta.url),'utf8');
 const worker=readFileSync(new URL(
  '../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 const governor=readFileSync(new URL(
  '../src/reality-governed-auto-trigger-v1.0.js',import.meta.url),'utf8');
 assert.match(sql,/riley_auto_corrective_ci_proofs_v1/);
 assert.match(sql,/riley_same_original_recovery_attempts_v2/);
 assert.match(sql,/reality_read_current_shift_execution_graph_v1/);
 assert.match(sql,/pg_advisory_xact_lock/);
 assert.match(sql,/original_settlement_receipt_ref IS NULL/);
 assert.match(sql,/ON CONFLICT DO NOTHING/);
 assert.match(sql,/current_user<>'service_role'/);
 assert.doesNotMatch(sql,/DELETE FROM reality_internal|DROP TABLE/i);
 assert.doesNotMatch(sql,/grant execute[^;]*to authenticated/gi);
 assert.doesNotMatch(sql,/issues\/185|issues\/263|9460cfff-937a/i);
 assert.match(governor,/continueSameOriginalRecoveryAfterVerifiedFailure/);
 assert.match(worker,/continueSameOriginalRecoveryAfterVerifiedFailure/);
 assert.match(worker,/SAME_ORIGINAL_RECOVERY_PATCH_AWAITING_INDEPENDENT_CI/);
 assert.match(worker,/same_original_recovery_attempt:sameOriginalRecovery/);
 assert.match(worker,/independent_tests_passed:false,original_job_completed:false/);
});
