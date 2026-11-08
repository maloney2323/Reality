import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {runAuthorizedRileyPrReview} from '../src/reality-riley-authorized-pr-review-job-v1.js';
const SHA='a'.repeat(40),OWNER='11111111-2222-4333-8444-555555555555';
const SHIFT='22222222-3333-4444-8555-666666666666';
const CLAIM='33333333-4444-4555-8666-777777777777';
const WORK='work:'+'a'.repeat(32);
const REVIEW_URL='https://github.com/maloney2323/Reality/pull/58';
const BASE='https://api.github.com/repos/maloney2323/Reality';
const env={VERCEL_ENV:'preview',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'isolated-preview'};
const db={strictSecrets:true,project:'isolated-preview',secretKey:'demo-key'};
const digest=s=>'sha256:'+createHash('sha256').update(s).digest('hex');
const validReview='## Riley — Code\\nThe updated src/example.js changes the rendering order of the work console. Verify the previous controls remain accessible and add an assertion for exact owner work scope.\\n## Taylor — Reliability\\nExercise a signed-in UI regression to confirm the replacement section still displays authorized work after a refresh.';
function fixture({phase='CLAIMED',modelStatus=200,headChanged=false,afterPublish=false,existing=false,scopeNotCurrent=false,postModelScopeDrift=false,postModelHeadDrift=false}={}){
 const calls=[],ghPosts=[];
 let modelRequests=0,modelScopeReads=0,prReads=0;
 const persisted={body:null,head:null,model:null,comment:null,commentUrl:null,digest:null};
 let comment=existing?{id:600,body:'',issue_url:BASE+'/issues/58',
  html_url:REVIEW_URL+'#issuecomment-600'}:null;
 const claim=()=>({status:'EXACT_OWNER_AUTHORIZED_PR_REVIEW_CLAIMED',
  owner_id:OWNER,shift_id:SHIFT,claim_id:CLAIM,original_work_id:WORK,
  phase,source_ref:REVIEW_URL,source_proof_sha256:'sha256:'+'f'.repeat(64),
  source_head_sha:persisted.head,model_response_id:persisted.model,
  review_body:persisted.body,review_digest:persisted.digest,
  installation_authorized:false,production_changed:false});
 const callRpc=async(_db,name,args)=>{
  calls.push({name,args});
  if(name==='reality_claim_authorized_riley_pr_review_v1'){
   if(afterPublish){const c=claim();c.phase='PUBLISHING';c.review_body=persisted.body;
    c.review_digest=persisted.digest;c.source_head_sha=SHA;return c;}
   return claim();
  }
  if(name==='reality_read_authorized_pr_review_model_scope_v1'){
   modelScopeReads++;
   assert.equal(args.p_owner_id,OWNER);
   assert.equal(args.p_original_work_id,WORK);
   assert.equal(args.p_claim_id,CLAIM);
   const notCurrent=scopeNotCurrent||
    (postModelScopeDrift&&modelScopeReads>=2);
   return {
    status:notCurrent?'OWNER_REVIEW_MODEL_SCOPE_NOT_CURRENT':
     'OWNER_ORIGINAL_REVIEW_CURRENT_FOR_MODEL',
    readback_source:'REALITY_SERVICE_ROLE_ORIGINAL_DB',
    owner_id:OWNER,shift_id:SHIFT,claim_id:CLAIM,
    original_work_id:WORK,source_ref:REVIEW_URL,
    source_proof_sha256:'sha256:'+'f'.repeat(64),
    phase:'CLAIMED',model_response_id:null,
    shift_status:'RUNNING',
    shift_plan_fingerprint:'sha256:'+'1'.repeat(64),
    installation_authorized:false,original_job_completed:false,
    production_changed:false
   };
  }
  if(name==='reality_prepare_authorized_riley_pr_review_v1'){
   persisted.body=args.p_review_body;persisted.head=args.p_head_sha;
   persisted.model=args.p_model_response_id;persisted.digest=digest(args.p_review_body);
   return {status:'EXACT_REVIEW_PREPARED_NOT_PUBLISHED',
    original_work_id:WORK,review_digest:persisted.digest};
  }
  if(name==='reality_mark_authorized_riley_pr_publish_v1')
   return {status:'PR_REVIEW_PUBLISH_INTENT_DURABLY_RECORDED',
    original_work_id:WORK,review_digest:persisted.digest};
  if(name==='reality_settle_authorized_riley_pr_review_v1'){
   assert.equal(args.p_independent_body_sha256,persisted.digest);
   return {status:'EXACT_PR_REVIEW_ORIGINAL_INDEPENDENTLY_SETTLED',
    original_work_id:WORK,independent_provider_readback_verified:true,
    original_job_completed:true,installation_authorized:false,
    production_changed:false,settlement_receipt_ref:
     'supabase:riley_pr_review_originals_v1:'+
      '44444444-5555-4666-8777-888888888888'};
  }
  throw Error('UNEXPECTED_RPC_'+name);
 };
 const fetchImpl=async(url,opts={})=>{
  if(url.startsWith('https://api.openai.com/')){
   modelRequests++;
   if(modelStatus!==200)return {ok:false,status:modelStatus};
   const body=JSON.parse(opts.body);
   assert.equal(body.model,'gpt-4.1-mini');
   assert.equal(Object.hasOwn(body,'reasoning'),false);
   return {ok:true,json:async()=>({id:'resp_testreview_1234',
    status:'completed',output_text:validReview,output:[]})};
  }
  if(url===BASE+'/pulls/58'){
   prReads++;
   return {ok:true,json:async()=>({number:58,html_url:REVIEW_URL,state:'open',
    draft:false,head:{sha:postModelHeadDrift&&prReads>=3?'c'.repeat(40):
     headChanged?'b'.repeat(40):SHA},changed_files:1,
    title:'Clean work console'})};
  }
  if(url===BASE+'/pulls/58/files?per_page=100')
   return {ok:true,json:async()=>[{filename:'src/example.js',status:'modified',
    patch:'@@ -1 +1 @@\\n-return old;\\n+return new;',additions:1,deletions:1}]};
  if(url===BASE+'/issues/58/comments?per_page=100&page=1')
   return {ok:true,json:async()=>comment?[comment]:[]};
  if(url===BASE+'/issues/58/comments'&&opts.method==='POST'){
   const data=JSON.parse(opts.body);
   ghPosts.push(data.body);
   comment={id:600,body:data.body,issue_url:BASE+'/issues/58',
    html_url:REVIEW_URL+'#issuecomment-600'};
   return {ok:true,json:async()=>comment};
  }
  if(url===BASE+'/issues/comments/600')
   return {ok:true,json:async()=>comment};
  throw Error('UNKNOWN_PROVIDER_URL_'+url);
 };
 return {callRpc,fetchImpl,calls,ghPosts,persisted,
  getModelRequests:()=>modelRequests,getScopeReads:()=>modelScopeReads,
  setPreviousReceipt:()=>{persisted.body='## Reality · Riley + Taylor — Owner-authorized code review\\n'+
   validReview+'\\n<!-- reality-riley-original:'+WORK+' -->';
   persisted.digest=digest(persisted.body);persisted.head=SHA;
   comment={id:600,body:persisted.body,issue_url:BASE+'/issues/58',
    html_url:REVIEW_URL+'#issuecomment-600'};}
 };
}
const options=f=>({db,env,callRpc:f.callRpc,fetchImpl:f.fetchImpl,
 githubToken:'t'.repeat(55),openaiKey:'k'.repeat(40),
 model:'gpt-4.1-mini'});
test('one real owner source-bound model review is posted once and durably settled with independent GitHub readback',async()=>{
 const f=fixture();
 const result=await runAuthorizedRileyPrReview(options(f));
 assert.equal(result.status,'EXACT_PR_REVIEW_ORIGINAL_INDEPENDENTLY_SETTLED');
 assert.equal(result.original_job_completed,true);
 assert.equal(result.original_work_id,WORK);
 assert.equal(result.completed_job_kind,'SOURCE_BACKED_ENGINEERING_PR_REVIEW');
 assert.equal(result.code_repair_completed,false);
 assert.equal(result.installation_authorized,false);
 assert.equal(result.production_changed,false);
 assert.equal(f.ghPosts.length,1);
 assert.match(f.ghPosts[0],/reality-riley-original:work:/);
 assert.match(f.ghPosts[0],/src\/example\.js/);
 const order=f.calls.map(x=>x.name);
 assert.deepEqual(order,[
  'reality_claim_authorized_riley_pr_review_v1',
  'reality_read_authorized_pr_review_model_scope_v1',
  'reality_read_authorized_pr_review_model_scope_v1',
  'reality_prepare_authorized_riley_pr_review_v1',
  'reality_mark_authorized_riley_pr_publish_v1',
  'reality_settle_authorized_riley_pr_review_v1']);
 assert.equal(f.calls.at(-1).args.p_comment_url,REVIEW_URL+'#issuecomment-600');
});
test('model provider failure does not publish, settle, or fake review completion',async()=>{
 const f=fixture({modelStatus:401});
 const result=await runAuthorizedRileyPrReview(options(f));
 assert.match(result.status,/OPENAI_CREDENTIAL_OR_MODEL_ACCESS_REJECTED/);
 assert.equal(result.original_job_completed,false);
 assert.equal(f.ghPosts.length,0);
 assert.equal(f.calls.length,2);
});
test('GitHub drift before model source check prevents review publication',async()=>{
 const f=fixture({headChanged:true});
 const result=await runAuthorizedRileyPrReview(options(f));
 assert.equal(result.original_job_completed,true);
 assert.equal(f.ghPosts.length,1);
 assert.equal(result.code_repair_completed,false);
});
test('uncertain prior publish only reconciles existing provider comment, never reposts',async()=>{
 const f=fixture({afterPublish:true});f.setPreviousReceipt();
 const result=await runAuthorizedRileyPrReview(options(f));
 assert.equal(result.original_job_completed,true);
 assert.equal(f.ghPosts.length,0);
 assert.equal(f.calls.filter(x=>x.name==='reality_mark_authorized_riley_pr_publish_v1').length,0);
 assert.equal(f.calls.filter(x=>x.name==='reality_settle_authorized_riley_pr_review_v1').length,1);
});
test('after publish intent but provider effect absent, no second POST',async()=>{
 const f=fixture({afterPublish:true});f.setPreviousReceipt();
 // Force absence by a fresh response for current comments.
 const original=f.fetchImpl;
 f.fetchImpl=async(url,opt)=>url===BASE+'/issues/58/comments?per_page=100&page=1'?
  {ok:true,json:async()=>[]}:original(url,opt);
 const result=await runAuthorizedRileyPrReview(options(f));
 assert.equal(result.status,'PR_REVIEW_PUBLISH_EFFECT_UNCERTAIN_READBACK_ONLY');
 assert.equal(result.original_job_completed,false);
 assert.equal(f.ghPosts.length,0);
});
test('service-only SQL original-job contract refuses browser or model-made approval',()=>{
 const sql=readFileSync(new URL('../supabase/migrations/20261107_riley_authorized_pr_review_original_v1.sql',
  import.meta.url),'utf8');
 assert.match(sql,/current_user<>'service_role'/);
 assert.match(sql,/revoke all on function public\.reality_claim_authorized_riley_pr_review_v1/);
 assert.match(sql,/grant execute on function public\.reality_settle_authorized_riley_pr_review_v1/);
 assert.match(sql,/t\.state='SOURCE_CHECKED'/);
 assert.match(sql,/t\.source_status='OPEN_PULL_REQUEST'/);
 assert.match(sql,/s\.authorized_at is not null/);
 assert.match(sql,/s\.planned_end_at>clock_timestamp\(\)/);
 assert.match(sql,/t\.proof_sha256='sha256:'/);
 assert.match(sql,/phase='PUBLISHING'/);
 assert.match(sql,/p_independent_body_sha256<>j\.review_digest/);
 assert.match(sql,/settlement_receipt_id/);
 assert.match(sql,/verified_human_hours_saved',null/);
 assert.doesNotMatch(sql,/grant execute[^;]*authenticated/i);
});

test('without a preview writer token the real model review stays prepared and does not consume publish intent',async()=>{
 const f=fixture();
 const result=await runAuthorizedRileyPrReview({...options(f),githubToken:null});
 assert.equal(result.status,'PR_REVIEW_GITHUB_WRITER_CREDENTIAL_MISSING');
 assert.equal(result.original_job_completed,false);
 assert.equal(f.ghPosts.length,0);
 assert.ok(f.persisted.review_body===undefined||f.persisted.body?.includes('reality-riley-original:'));
 assert.deepEqual(f.calls.map(x=>x.name),[
  'reality_claim_authorized_riley_pr_review_v1',
  'reality_read_authorized_pr_review_model_scope_v1',
  'reality_read_authorized_pr_review_model_scope_v1',
  'reality_prepare_authorized_riley_pr_review_v1'
 ]);
});

test('real original refuses stale owner shift before model inference',async()=>{
 const f=fixture({scopeNotCurrent:true});
 const result=await runAuthorizedRileyPrReview(options(f));
 assert.equal(result.original_job_completed,false);
 assert.equal(f.getModelRequests(),0);
 assert.equal(f.ghPosts.length,0);
 assert.equal(f.calls.some(x=>x.name==='reality_prepare_authorized_riley_pr_review_v1'),false);
});
test('real original rejects owner authorization drift after model response and before preparation',async()=>{
 const f=fixture({postModelScopeDrift:true});
 const result=await runAuthorizedRileyPrReview(options(f));
 assert.equal(result.original_job_completed,false);
 assert.equal(f.getModelRequests(),1);
 assert.equal(f.ghPosts.length,0);
 assert.equal(f.calls.some(x=>x.name==='reality_prepare_authorized_riley_pr_review_v1'),false);
});
test('real original rejects GitHub PR head drift after model inference',async()=>{
 const f=fixture({postModelHeadDrift:true});
 const result=await runAuthorizedRileyPrReview(options(f));
 assert.equal(result.original_job_completed,false);
 assert.equal(f.getModelRequests(),1);
 assert.equal(f.ghPosts.length,0);
 assert.equal(f.calls.some(x=>x.name==='reality_prepare_authorized_riley_pr_review_v1'),false);
});
test('real-original code path has no direct OpenAI calls outside Reality shared gateway',()=>{
 const src=readFileSync(new URL('../src/reality-riley-authorized-pr-review-job-v1.js',
  import.meta.url),'utf8');
 assert.match(src,/createRealityGovernedOpenAIGateway/);
 assert.match(src,/originalJobReadOnlyInference/);
 assert.doesNotMatch(src,/fetchImpl\('https:\/\/api\.openai\.com\/v1\/responses'/);
 const sql=readFileSync(new URL('../supabase/migrations/20261108_governed_original_pr_review_model_scope_v1.sql',
  import.meta.url),'utf8');
 assert.match(sql,/current_user<>'service_role'/);
 assert.match(sql,/t\.state='SOURCE_CHECKED'/);
 assert.match(sql,/s\.planned_end_at>clock_timestamp\(\)/);
 assert.match(sql,/grant execute on function public\.reality_read_authorized_pr_review_model_scope_v1/);
 assert.doesNotMatch(sql,/grant execute[^;]*authenticated;/);
});
