import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectLargePrSourceForBoundedReview}
 from '../src/reality-pr-large-source-qualification-v1.js';
import {advanceOneFinalLoopParentIntegration}
 from '../src/reality-final-loop-parent-integration-worker-v1.js';
const owner='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const shift='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
const run='cccccccc-cccc-4ccc-cccc-cccccccccccc';
const parent='work:'+'1'.repeat(32);
const ref='https://github.com/maloney2323/Reality/pull/1001';
const hash=x=>'sha256:'+x.repeat(64);
const env={
 VERCEL_ENV:'preview',
 REALITY_FINAL_LOOP_ENGINE_SHADOW_ENABLED:'true',
 REALITY_FINAL_LOOP_LARGE_PR_QUALIFICATION_SHADOW_ENABLED:'true',
 REALITY_FINAL_LOOP_CHILD_EXECUTION_ENABLED:'true',
 REALITY_FINAL_LOOP_PARENT_INTEGRATION_ENABLED:'true',
 REALITY_FINAL_LOOP_PR_SOURCE_PLANS_DB_ISOLATED:'true',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'testisolated',
 REALITY_FINAL_LOOP_PR_SOURCE_PLANS_ISOLATED_PROJECT_REF:'testisolated',
 REALITY_STANDALONE_OPENAI_API_KEY:'test-placeholder-secret-key',
 REALITY_OPENAI_MODEL:'gpt-4.1-mini'
};
const db={project:'testisolated',strictSecrets:true};
const meta=()=>({
 number:1001,html_url:ref,state:'open',draft:true,
 changed_files:17,head:{sha:'f'.repeat(40)},
 base:{sha:'e'.repeat(40)}
});
const files=()=>Array.from({length:17},(_,i)=>({
 filename:'src/test-file-'+String(i).padStart(2,'0')+'.js',
 sha:'a'.repeat(40),status:'modified',
 additions:1,deletions:1,
 patch:'@@ -1 +1 @@\n-old\n+new '+i+' independent patch evidence'
}));
let responseText='';
const provider=async(url,options)=>{
 if(url==='https://api.openai.com/v1/responses'){
  assert.equal(options.method,'POST');
  const request=JSON.parse(options.body);
  assert.equal(request.tool_choice,'none');
  assert.equal(request.tools,undefined);
  assert.equal(request.input.length,2);
  return {ok:true,status:200,json:async()=>({
   id:'resp_integration1234',status:'completed',
   output:[{type:'message',
    content:[{type:'output_text',text:responseText}]}]
  })};
 }
 assert.equal(options.method,'GET');
 assert.match(url,/^https:\/\/api\.github\.com\/repos\/maloney2323\/Reality\/pulls\/1001/);
 return {ok:true,status:200,json:async()=>
  url.includes('/files?')?files():meta()};
};
async function plan(){
 return inspectLargePrSourceForBoundedReview({
  job:{source_ref:ref,source_proof_sha256:hash('a'),
   original_work_id:parent,phase:'BLOCKED'},
  ownerId:owner,shiftId:shift,metadata:meta(),env,
  fetchImpl:provider
 });
}
function claim(p){
 const reviews=p.bounded_scopes.map((s,i)=>({
  index:i,child_work_id:'work:'+(i+2).toString().repeat(32),
  scope_sha256:s.proposed_scope_sha256,
  independent_receipt_sha256:hash('d'),
  review_sha256:hash('e'),
  review_excerpt:'Independent engineering review of scoped changed files and regression test evidence. '.repeat(2),
  files:s.files
 }));
 return {
  status:'FINAL_LOOP_PARENT_INTEGRATION_EXACT_BATCH_CLAIMED',
  integration_claimed:true,
  batch_id:'11111111-1111-4111-8111-111111111111',
  claim_id:'22222222-2222-4222-8222-222222222222',
  owner_id:owner,shift_id:shift,worker_run_id:run,
  parent_original_work_id:parent,source_ref:ref,
  source_proof_sha256:hash('a'),
  source_manifest_sha256:p.source_manifest_sha256,
  source_head_sha:p.live_head_sha,source_base_sha:p.live_base_sha,
  acceptance_contract_sha256:hash('b'),
  verified_child_receipts_sha256:hash('f'),
  batch_index:0,first_scope_index:0,last_scope_index:2,
  reviews,parent_original_completed:false,production_changed:false
 };
}
const current=c=>({
 ...c,status:'CURRENT_INDEPENDENT_PARENT_INTEGRATION_SCOPE',
 read_only:true,integration_model_authorized:true,
 original_job_completed:false,production_changed:false
});
test('feature or database isolation absent: no claim or model effect',async()=>{
 let calls=0;
 for(const [e,d] of [
  [{...env,REALITY_FINAL_LOOP_PARENT_INTEGRATION_ENABLED:'false'},db],
  [{...env,VERCEL_ENV:'production'},db],
  [env,{project:'sharedlive',strictSecrets:true}],
  [env,{project:'testisolated',strictSecrets:false}]
 ]){
  const r=await advanceOneFinalLoopParentIntegration({
   db:d,env:e,workerRunId:run,shiftId:shift,
   call:async()=>{calls++;throw Error('SHOULD_NOT_CALL')},
   fetchImpl:async()=>{calls++;throw Error('SHOULD_NOT_FETCH')}
  });
  assert.equal(r.status,
   'FINAL_LOOP_PARENT_INTEGRATION_GOVERNED_ISOLATION_NOT_ENABLED');
  assert.equal(r.parent_original_completed,false);
 }
 assert.equal(calls,0);
});
test('fully pinned exact child set can produce a batch receipt, never parent completion',async()=>{
 const p=await plan();assert.equal(p.bounded_scope_count,3);
 const c=claim(p),ids=c.reviews.map(x=>x.child_work_id);
 responseText=JSON.stringify({
  verdict:'PASS',reviewed_child_ids:ids,
  explanation:'I cross-reviewed independent source and test recommendations across the changed scopes.',
  integration_test_recommendation:'Run cross-scope unit and integration tests against the exact PR head.'
 });
 const calls=[];let providerModel=0;
 const fetchImpl=async(url,options)=>{
  if(url.includes('openai.com'))providerModel++;
  return provider(url,options);
 };
 const r=await advanceOneFinalLoopParentIntegration({
  db,env,shiftId:shift,workerRunId:run,fetchImpl,
  call:async(_db,name,args)=>{
   calls.push(name);
   if(name==='reality_claim_final_loop_parent_integration_v1')return c;
   if(name==='reality_read_final_loop_parent_integration_claim_v1')
    return current(c);
   if(name==='reality_record_final_loop_parent_integration_v1'){
    assert.equal(args.p_batch_id,c.batch_id);
    assert.equal(args.p_claim_id,c.claim_id);
    assert.equal(args.p_evidence.reviewed_child_ids.length,3);
    assert.equal(args.p_evidence.source_manifest_sha256,p.source_manifest_sha256);
    assert.equal(args.p_evidence.provider_full_manifest_digest,p.source_manifest_sha256);
    assert.equal(args.p_evidence.verdict,'PASS');
    return {status:'FINAL_LOOP_CROSS_SCOPE_BATCH_INDEPENDENTLY_VERIFIED_PARENT_OPEN',
     batch_id:c.batch_id,parent_original_work_id:parent,
     receipt_sha256:hash('9'),integration_verified:true,
     original_job_completed:false,production_changed:false};
   }
   throw Error('UNEXPECTED_RPC '+name);
  }
 });
 assert.equal(providerModel,1);
 assert.ok(calls.filter(x=>x==='reality_read_final_loop_parent_integration_claim_v1').length>=2);
 assert.equal(calls.at(-1),'reality_record_final_loop_parent_integration_v1');
 assert.equal(r.status,'FINAL_LOOP_CROSS_SCOPE_BATCH_INDEPENDENTLY_VERIFIED_PARENT_OPEN');
 assert.equal(r.parent_original_completed,false);
 assert.equal(r.external_effect_performed,false);
});
test('a stale source-scope hash blocks integration before provider model inference',async()=>{
 const p=await plan(),c=claim(p);
 c.reviews[1]={...c.reviews[1],scope_sha256:hash('4')};
 let model=0,finalize=0;
 const r=await advanceOneFinalLoopParentIntegration({
  db,env,shiftId:shift,workerRunId:run,
  fetchImpl:async(url,options)=>{
   if(url.includes('openai.com'))model++;
   return provider(url,options);
  },
  call:async(_db,name)=>{
   if(name==='reality_claim_final_loop_parent_integration_v1')return c;
   if(name==='reality_record_final_loop_parent_integration_v1')finalize++;
   throw Error('NO_OTHER_RPC '+name);
  }
 });
 assert.equal(model,0);
 assert.equal(finalize,0);
 assert.equal(r.status,'FINAL_LOOP_PARENT_INTEGRATION_PROVIDER_OR_PATCH_UNVERIFIED');
 assert.equal(r.parent_original_completed,false);
});
test('missing child inventory or an uncertain signed claim cannot invoke model',async()=>{
 const p=await plan(),c=claim(p);
 c.reviews.pop();
 let called=0;
 const r=await advanceOneFinalLoopParentIntegration({
  db,env,shiftId:shift,workerRunId:run,
  call:async(_db,name)=>{
   called++;assert.equal(name,'reality_claim_final_loop_parent_integration_v1');
   return c;
  },
  fetchImpl:async()=>{throw Error('PROVIDER_SHOULD_NOT_RUN')}
 });
 assert.equal(called,1);
 assert.equal(r.status,'FINAL_LOOP_PARENT_INTEGRATION_CLAIM_OR_PROOF_UNAVAILABLE');
 assert.equal(r.parent_original_completed,false);
});
test('parent integration uses the same signed worker, gateway and no parent-settlement shortcut',()=>{
 const worker=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',
  import.meta.url),'utf8');
 assert.match(worker,/advanceOneFinalLoopParentIntegration/);
 assert.match(worker,/final_loop_parent_integration:finalLoopParentIntegration/);
 const sql=readFileSync(new URL(
  '../sql/reality-final-loop-parent-integration-v1.sql',
  import.meta.url),'utf8');
 assert.match(sql,/final_loop_parent_integration_batches_v1/);
 assert.match(sql,/reality_claim_final_loop_parent_integration_v1/);
 assert.match(sql,/reality_read_final_loop_parent_integration_claim_v1/);
 assert.match(sql,/reality_record_final_loop_parent_integration_v1/);
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/parent_original_completed',false/);
 assert.doesNotMatch(sql,/UPDATE reality_internal\.riley_pr_review_originals_v1/);
 const ledger=readFileSync(new URL(
  '../sql/reality-final-loop-child-transactional-v1.sql',
  import.meta.url),'utf8');
 assert.match(ledger,/v_integration_receipt IS NOT NULL/);
 assert.match(ledger,/parent_settlement_committed',false/);
});
