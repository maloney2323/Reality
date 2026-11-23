import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {inspectLargePrSourceForBoundedReview}
 from '../src/reality-pr-large-source-qualification-v1.js';
import {advanceOneFinalLoopParentDelivery}
 from '../src/reality-final-loop-parent-delivery-worker-v1.js';
const sha=s=>'sha256:'+s.repeat(64);
const hash=s=>'sha256:'+createHash('sha256').update(s).digest('hex');
const owner='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const shift='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
const publisher='cccccccc-cccc-4ccc-cccc-cccccccccccc';
const verifier='dddddddd-dddd-4ddd-dddd-dddddddddddd';
const deliveryId='11111111-1111-4111-8111-111111111111';
const claimId='22222222-2222-4222-8222-222222222222';
const eventId='33333333-3333-4333-8333-333333333333';
const parent='work:'+'1'.repeat(32);
const ref='https://github.com/maloney2323/Reality/pull/1001';
const head='f'.repeat(40),base='e'.repeat(40);
const env={
 VERCEL_ENV:'preview',
 REALITY_FINAL_LOOP_ENGINE_SHADOW_ENABLED:'true',
 REALITY_FINAL_LOOP_LARGE_PR_QUALIFICATION_SHADOW_ENABLED:'true',
 REALITY_FINAL_LOOP_CHILD_EXECUTION_ENABLED:'true',
 REALITY_FINAL_LOOP_PARENT_INTEGRATION_ENABLED:'true',
 REALITY_FINAL_LOOP_PARENT_DELIVERY_ENABLED:'true',
 REALITY_FINAL_LOOP_PARENT_PUBLICATION_ENABLED:'true',
 REALITY_FINAL_LOOP_PR_SOURCE_PLANS_DB_ISOLATED:'true',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'testisolated',
 REALITY_FINAL_LOOP_PR_SOURCE_PLANS_ISOLATED_PROJECT_REF:'testisolated',
 REALITY_GITHUB_TOKEN:'github-token-test-only-not-live-123456789'
};
const db={project:'testisolated',strictSecrets:true};
const meta=()=>({
 number:1001,html_url:ref,state:'open',draft:true,
 changed_files:17,head:{sha:head},base:{sha:base}
});
const fileList=()=>Array.from({length:17},(_,i)=>({
 filename:'src/mock-'+String(i).padStart(2,'0')+'.js',
 status:'modified',sha:'a'.repeat(40),
 additions:1,deletions:1,patch:'@@ -1 +1 @@\n-old\n+new '+i
}));
const body='<!-- REALITY-FINAL-LOOP-PARENT:'+parent+':'+sha('9')+
 ' -->\n'+('Verified scope summaries and independent integration. '.repeat(25));
let plan;
async function getPlan(){
 if(!plan)plan=await inspectLargePrSourceForBoundedReview({
  job:{source_ref:ref,source_proof_sha256:sha('a'),
   original_work_id:parent,phase:'BLOCKED'},
  ownerId:owner,shiftId:shift,metadata:meta(),env,
  fetchImpl:async(url)=>{
   return {ok:true,json:async()=>url.includes('/files?')?
    fileList():meta()};
  }
 });
 assert.equal(plan.source_manifest_complete,true);
 return plan;
}
const full=(p,kind)=>({
 status:kind==='VERIFY'?
  'FINAL_LOOP_PARENT_GITHUB_EFFECT_UNCERTAIN_READBACK_ONLY':
  'FINAL_LOOP_PARENT_GITHUB_WRITE_RESERVED_ONCE',
 delivery_id:deliveryId,claim_id:claimId,publication_claim_id:claimId,
 owner_id:owner,shift_id:shift,publisher_worker_run_id:publisher,
 verifier_worker_run_id:verifier,
 parent_original_work_id:parent,source_ref:ref,
 source_proof_sha256:sha('a'),source_head_sha:head,
 source_base_sha:base,source_manifest_sha256:p.source_manifest_sha256,
 delivery_body:body,delivery_body_sha256:hash(body),
 approval_receipt_sha256:sha('8'),
 owner_publication_receipt_sha256:sha('8'),
 publication_effect_reserved:true,read_only:true,
 post_retry_authorized:false,
 publication_reserved_at:'2026-11-23T15:00:00Z',
 original_job_completed:false,production_changed:false
});
const comment=()=>({
 id:9988,body,html_url:ref+'#issuecomment-9988',
 created_at:'2026-11-23T15:01:00Z',user:{id:42,login:'reality-test'}
});
function mockGithub({count=0,duplicates=false}={}){
 let writes=0,reads=0;
 const fetchImpl=async(url,{method}={})=>{
  reads++;
  if(url==='https://api.github.com/user')
   return {ok:true,json:async()=>({id:42,login:'reality-test'})};
  if(url.includes('/pulls/1001/files?'))
   return {ok:true,json:async()=>fileList()};
  if(url.endsWith('/pulls/1001'))
   return {ok:true,json:async()=>meta()};
  if(url.endsWith('/issues/1001'))
   return {ok:true,json:async()=>({number:1001,comments:count})};
  if(url.includes('/issues/1001/comments?'))
   return {ok:true,json:async()=>duplicates?
    [comment(),{...comment(),id:9989,html_url:ref+'#issuecomment-9989'}]:
    count?[comment()]:[]};
  if(url.endsWith('/issues/comments/9988'))
   return {ok:true,json:async()=>comment()};
  if(url.endsWith('/issues/1001/comments')&&method==='POST'){
   writes++;return {ok:true,json:async()=>comment()};
  }
  throw Error('Unexpected external provider URL: '+url);
 };
 return {fetchImpl,get writes(){return writes},get reads(){return reads}};
}
test('disabled, production or nonisolated parent effect never calls DB or provider',async()=>{
 let calls=0;
 for(const [e,d] of [
  [{...env,REALITY_FINAL_LOOP_PARENT_DELIVERY_ENABLED:'false'},db],
  [{...env,VERCEL_ENV:'production'},db],
  [env,{project:'production',strictSecrets:true}]
 ]){
  const out=await advanceOneFinalLoopParentDelivery({
   db:d,env:e,shiftId:shift,workerRunId:publisher,
   call:async()=>{calls++;throw Error('NO_DB')},
   fetchImpl:async()=>{calls++;throw Error('NO_WEB')}
  });
  assert.equal(out.status,
   'FINAL_LOOP_PARENT_DELIVERY_DISABLED_OR_ISOLATED_DB_MISSING');
  assert.equal(out.original_job_completed,false);
 }
 assert.equal(calls,0);
});
test('exact parent package awaiting second approval never reserves GitHub write',async()=>{
 const external=mockGithub();const calls=[];
 const result=await advanceOneFinalLoopParentDelivery({
  db,env,shiftId:shift,workerRunId:publisher,
  fetchImpl:external.fetchImpl,
  call:async(_db,name)=>{
   calls.push(name);
   if(name==='reality_read_final_loop_parent_publish_verify_v1')
    return {status:'FINAL_LOOP_NO_PENDING_INDEPENDENT_PROVIDER_READBACK'};
   if(name==='reality_prepare_next_final_loop_parent_delivery_v1')
    return {status:'FINAL_LOOP_PARENT_DELIVERY_EXACT_OWNER_PUBLICATION_REQUIRED',
     delivery_id:deliveryId,parent_original_work_id:parent};
   throw Error('Unexpected DB claim');
  }
 });
 assert.equal(result.status,
  'FINAL_LOOP_PARENT_DELIVERY_AWAITING_EXACT_PUBLICATION_CLICK');
 assert.equal(external.reads,0);
 assert.deepEqual(calls,[
  'reality_read_final_loop_parent_publish_verify_v1',
  'reality_prepare_next_final_loop_parent_delivery_v1']);
});
test('exact owner approved parent can make only ONE reserved GitHub comment',async()=>{
 const p=await getPlan(),gh=mockGithub();
 const calls=[];
 const out=await advanceOneFinalLoopParentDelivery({
  db,env,shiftId:shift,workerRunId:publisher,
  fetchImpl:gh.fetchImpl,
  call:async(_db,name)=>{
   calls.push(name);
   if(name==='reality_read_final_loop_parent_publish_verify_v1')
    return {status:'FINAL_LOOP_NO_PENDING_INDEPENDENT_PROVIDER_READBACK'};
   if(name==='reality_prepare_next_final_loop_parent_delivery_v1')
    return {status:'FINAL_LOOP_PARENT_DELIVERY_ALREADY_APPROVED_OR_RESERVED'};
   if(name==='reality_claim_final_loop_parent_publish_v1')
    return full(p,'PUBLISH');
   throw Error('No settlement permitted on publisher run: '+name);
  }
 });
 assert.equal(gh.writes,1);
 assert.equal(out.status,
  'FINAL_LOOP_PARENT_GITHUB_DELIVERED_PENDING_SEPARATE_VERIFIER');
 assert.equal(out.original_job_completed,false);
 assert.equal(out.universe_reconciled,false);
 assert.equal(calls.at(-1),'reality_claim_final_loop_parent_publish_v1');
});
test('a DIFFERENT signed provider verifier can settle only after exact readback',async()=>{
 const p=await getPlan(),gh=mockGithub({count:1});
 const calls=[];
 const out=await advanceOneFinalLoopParentDelivery({
  db,env,shiftId:shift,workerRunId:verifier,
  fetchImpl:gh.fetchImpl,
  call:async(_db,name,args)=>{
   calls.push(name);
   if(name==='reality_read_final_loop_parent_publish_verify_v1')
    return full(p,'VERIFY');
   if(name==='reality_record_final_loop_parent_settlement_v1'){
    assert.equal(args.p_provider_evidence.comment_id,'9988');
    assert.equal(args.p_provider_evidence.body_sha256,hash(body));
    assert.equal(args.p_provider_evidence.verifier_worker_run_id,verifier);
    return {status:'FINAL_LOOP_PARENT_ORIGINAL_AND_UNIVERSE_ATOMICALLY_SETTLED',
     original_work_id:parent,provider_comment_url:ref+'#issuecomment-9988',
     verified_universe_outcome_event_id:eventId,
     universe_reconciled:true,original_job_completed:true,
     production_changed:false};
   }
   if(name==='reality_read_final_loop_parent_settlement_v1')
    return {status:'FINAL_LOOP_PARENT_AND_UNIVERSE_INDEPENDENT_READBACK_SETTLED',
     original_work_id:parent,verified_provider_comment_url:
      ref+'#issuecomment-9988',
     verified_universe_outcome_event_id:eventId,
     original_job_completed:true,universe_reconciled:true,
     independent_database_readback:true};
   throw Error('Unexpected step '+name);
  }
 });
 assert.equal(gh.writes,0);
 assert.equal(out.status,
  'FINAL_LOOP_PARENT_ORIGINAL_AND_UNIVERSE_INDEPENDENTLY_VERIFIED');
 assert.equal(out.universe_reconciled,true);
 assert.equal(out.original_job_completed,true);
 assert.deepEqual(calls,[
  'reality_read_final_loop_parent_publish_verify_v1',
  'reality_record_final_loop_parent_settlement_v1',
  'reality_read_final_loop_parent_settlement_v1']);
});
test('uncertain missing provider effect never retries GitHub POST or settles',async()=>{
 const p=await getPlan(),gh=mockGithub({count:0});let settled=false;
 const out=await advanceOneFinalLoopParentDelivery({
  db,env,shiftId:shift,workerRunId:verifier,
  fetchImpl:gh.fetchImpl,
  call:async(_db,name)=>{
   if(name==='reality_read_final_loop_parent_publish_verify_v1')
    return full(p,'VERIFY');
   settled=true;throw Error('No settlement without provider proof');
  }
 });
 assert.equal(gh.writes,0);assert.equal(settled,false);
 assert.equal(out.status,'FINAL_LOOP_PARENT_PROVIDER_EFFECT_UNCERTAIN_NO_REPOST');
 assert.equal(out.original_job_completed,false);
});
test('duplicate provider marker suspends independent settlement rather than selecting one',async()=>{
 const p=await getPlan(),gh=mockGithub({count:2,duplicates:true});
 const out=await advanceOneFinalLoopParentDelivery({
  db,env,shiftId:shift,workerRunId:verifier,
  fetchImpl:gh.fetchImpl,
  call:async(_db,name)=>{
   if(name==='reality_read_final_loop_parent_publish_verify_v1')
    return full(p,'VERIFY');
   throw Error('Cannot settle duplicate comment');
  }
 });
 assert.equal(gh.writes,0);
 assert.equal(out.status,
  'FINAL_LOOP_PARENT_PROVIDER_READBACK_AMBIGUOUS_NO_REPOST');
 assert.equal(out.original_job_completed,false);
});
test('Final Loop parent delivery shares canonical shift and requires real owner clicks',()=>{
 const raw=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const sql=raw('sql/reality-final-loop-parent-delivery-v1.sql');
 for(const name of [
  'reality_final_loop_record_owner_goal_acceptance_v1',
  'reality_prepare_final_loop_parent_delivery_v1',
  'reality_owner_approve_final_loop_parent_delivery_v1',
  'reality_claim_final_loop_parent_publish_v1',
  'reality_read_final_loop_parent_publish_verify_v1',
  'reality_record_final_loop_parent_settlement_v1',
  'reality_read_final_loop_parent_settlement_v1'])
  assert.ok(sql.includes(name));
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/UPDATE reality_internal\.riley_pr_review_originals_v1/);
 assert.match(sql,/INSERT INTO public\.universe_events/);
 assert.match(sql,/FOR UPDATE/);
 assert.match(sql,/publisher_worker_run_id=p_verifier_worker_run_id/);
 const server=raw('api/reality/owner-final-loop-parent-delivery.js');
 assert.match(server,/authenticatedChatSession\(req,res\)/);
 assert.match(server,/p_owner_id:session\.user_id/);
 assert.match(server,/APPROVE_EXACT_GITHUB_PR_REVIEW_PUBLICATION/);
 assert.doesNotMatch(server,/method:'POST'.*github/s);
 const ui=raw('reality-chat-final-loop-parent-delivery-v1.js');
 assert.match(ui,/Approve exact GitHub review publication/);
 assert.match(ui,/current\.delivery_body_sha256!==exact\.delivery_body_sha256/);
 assert.match(raw('index.html'),/reality-chat-final-loop-parent-delivery-v1\.js/);
 assert.match(raw('api/reality/governed-employee-shift-worker.js'),
  /advanceOneFinalLoopParentDelivery/);
});
