// Frozen, *real* Riley/Taylor 2026-11-07 failure: no preview GitHub
// writer must NOT move a PREPARED source review to PUBLISHING. The old code
// consumed a no-retry publish fence before checking for any write credential.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {runAuthorizedRileyPrReview}
 from '../../src/reality-riley-authorized-pr-review-job-v1.js';
const work='work:'+'9'.repeat(32);
const source='https://github.com/maloney2323/Reality/pull/58';
const head='288f617bc280110f9c2608b1cff9139a2306f06c';
const body='## Reality Riley and Taylor source review\\nThis real issue requires tests for keyboard interaction, authorization and current source path.\\n'+
 '<!-- reality-riley-original:'+work+' -->';
const digest='sha256:'+createHash('sha256').update(body).digest('hex');
const shift='21dff8db-6f46-444d-a149-ab15f1caf8fe';
function mock(){
 const calls=[];
 const rpc=async(_db,name)=>{
  calls.push(name);
  if(name==='reality_claim_authorized_riley_pr_review_v1')return {
   status:'EXACT_OWNER_AUTHORIZED_PR_REVIEW_CLAIMED',
   shift_id:shift,owner_id:'85eeae0b-2988-43c4-b20c-590fb51da70d',
   claim_id:'11111111-2222-4333-8444-555555555555',
   original_work_id:work,phase:'PREPARED',
   source_ref:source,source_proof_sha256:'sha256:'+'a'.repeat(64),
   source_head_sha:head,model_response_id:'resp_prepared_live_123456',
   review_body:body,review_digest:digest,
   installation_authorized:false,production_changed:false
  };
  if(name==='reality_mark_authorized_riley_pr_publish_v1')
   return {status:'PR_REVIEW_PUBLISH_INTENT_DURABLY_RECORDED',
    original_work_id:work,review_digest:digest};
  throw Error('UNEXPECTED_DB_OPERATION_'+name);
 };
 const fetchImpl=async(url,opts={})=>{
  assert.notEqual(opts.method,'POST','no GitHub publication without a writer token');
  if(url.endsWith('/pulls/58'))return {ok:true,json:async()=>({
   number:58,html_url:source,state:'open',draft:false,
   head:{sha:head},title:'Clean work console',changed_files:1})};
  if(url.endsWith('/pulls/58/files?per_page=100'))
   return {ok:true,json:async()=>[{
    filename:'index.html',status:'modified',
    patch:'@@ -1,2 +1,2 @@\\n-old UI\\n+new UI',additions:1,deletions:1
   }]};
  if(url.includes('/comments?per_page='))return {ok:true,json:async()=>[]};
  throw Error('UNEXPECTED_PROVIDER_'+url);
 };
 return {calls,rpc,fetchImpl};
}
test('missing GitHub writer preserves PREPARED (not PUBLISHING) under exact existing shift',async()=>{
 const f=mock();
 const result=await runAuthorizedRileyPrReview({
  db:{strictSecrets:true,project:'isolated'},
  env:{VERCEL_ENV:'preview',REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'isolated'},
  githubToken:null,openaiKey:null,fetchImpl:f.fetchImpl,callRpc:f.rpc
 });
 assert.equal(result.original_job_completed,false);
 assert.equal(result.installation_authorized,false);
 assert.equal(result.production_changed,false);
 assert.equal(result.status,'PR_REVIEW_GITHUB_WRITER_CREDENTIAL_MISSING');
 assert.deepEqual(f.calls,['reality_claim_authorized_riley_pr_review_v1'],
  'credential preflight MUST happen before consuming a durable publish intent');
});
