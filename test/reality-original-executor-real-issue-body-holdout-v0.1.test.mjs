import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const candidate=process.env.REALITY_ORIGINAL_EXECUTOR_CANDIDATE;
if(candidate!=='/work/owner-original-repair-executor/candidate.mjs')throw Error('EXACT_MODEL_SOURCE_CANDIDATE_REQUIRED');
const {prepareOriginalMaintenanceRepair,executeOriginalMaintenanceRepair}
 =await import(pathToFileURL(candidate).href);
const WORK='work:24cda9611404e9bcb47909976067605c';
const REF='experiment/reality-live-durable-adversarial-20261025';
const SHA='3448c6d694b440a0e0c4593ff30e2fc326824cd4';
const PATH='test/reality-personal-discovered-work-handoff-v0.1.test.js';
const ROOT='/repos/maloney2323/Reality';
const original=readFileSync('test/fixtures/original-repair-corrected-source.snapshot.txt','utf8');
const raw=Buffer.from(original);
const blob=createHash('sha1').update('blob '+raw.length+'\0').update(raw).digest('hex');
function fixture({body='<!-- actual original maintenance issue -->',spoof=false,wrapped=false}={}){
 const issue={number:143,state:'open',
  title:'Reality recurring work: repair repeated Reality Governed Execution Engine v0.1 failures',
  html_url:spoof?'https://github.com/attacker/Reality/issues/143':'https://github.com/maloney2323/Reality/issues/143',
  body,
  user:{login:'Reality-bot'},labels:[{name:'original-recovery'}],
 };
 const file={type:'file',path:PATH,sha:blob,encoding:'base64',content:raw.toString('base64')};
 let reads=0,writes=0,grants=0;
 const get=async path=>{
  reads++;
  let output;
  if(path===ROOT+'/git/ref/heads/'+REF)output={ref:'refs/heads/'+REF,object:{sha:SHA},url:'https://api.github.com/repos/maloney2323/Reality/git/refs/heads/'+REF};
  else if(path===ROOT+'/issues/143')output=issue;
  else if(path===ROOT+'/contents/'+PATH+'?ref='+SHA)output=file;
  else throw Error('LIVE_GITHUB_PROVIDER_PATH_NOT_WHITELISTED');
  return wrapped?{data:output}:output;
 };
 const write=async()=>{writes++;throw Error('NO_GITHUB_WRITE_IN_HOLDOUT')};
 const consumeVerifiedGrant=async()=>{grants++;throw Error('NO_GRANT_CONSUMPTION_IN_HOLDOUT')};
 return {get,write,consumeVerifiedGrant,counts:()=>({reads,writes,grants})};
}
test('actual GitHub REST issue has body text but remains identity-bearing issue object',async()=>{
 const p=fixture();
 const r=await prepareOriginalMaintenanceRepair({get:p.get});
 assert.equal(r.state,'PREEXISTING_FIX_OBSERVED_NO_WRITE');
 assert.equal(r.original_work_id,WORK);
 assert.equal(p.counts().reads,3);
 assert.equal(p.counts().writes,0);
});
test('actual GitHub issue with body text: executable reconciliation never writes or consumes grants',async()=>{
 const p=fixture();
 const r=await executeOriginalMaintenanceRepair({
  session:{user_id:'11111111-1111-4111-8111-111111111111'},
  conversationId:'22222222-2222-4222-8222-222222222222',
  get:p.get,write:p.write,consumeVerifiedGrant:p.consumeVerifiedGrant,
 });
 assert.equal(r.status,'PREEXISTING_FIX_NOT_EXECUTED_BY_REALITY');
 assert.equal(r.original_job_completed,false);
 assert.equal(r.repair_executed_by_reality,false);
 assert.deepEqual(p.counts(),{reads:3,writes:0,grants:0});
});
test('GitHub client data-envelope wrapper containing issue body can still be read',async()=>{
 const p=fixture({wrapped:true});
 const r=await prepareOriginalMaintenanceRepair({get:p.get});
 assert.equal(r.state,'PREEXISTING_FIX_OBSERVED_NO_WRITE');
 assert.equal(p.counts().writes,0);
});
test('issue URL spoofing remains rejected even with realistic issue body',async()=>{
 const p=fixture({spoof:true});
 await assert.rejects(prepareOriginalMaintenanceRepair({get:p.get}),
 /ORIGINAL_EXECUTOR_PINNED_BRANCH_OR_ISSUE_MISMATCH/);
 assert.equal(p.counts().writes,0);
 assert.equal(p.counts().grants,0);
});
