import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {
 ORIGINAL_REPAIR_WORK,prepareOriginalMaintenanceRepair,executeOriginalMaintenanceRepair,
} from '../../src/reality-extensions/reality-original-maintenance-executor.mjs';

const WORK='work:24cda9611404e9bcb47909976067605c';
const BRANCH='experiment/reality-live-durable-adversarial-20261025';
const SHA='3448c6d694b440a0e0c4593ff30e2fc326824cd4';
const PATH='test/reality-personal-discovered-work-handoff-v0.1.test.js';
const ROOT='/repos/maloney2323/Reality';
const SOURCE=readFileSync(PATH,'utf8');
const bytes=Buffer.from(SOURCE,'utf8');
const BLOB=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
const issue=()=>({
 number:143,state:'open',
 title:'Reality recurring work: repair repeated Reality Governed Execution Engine v0.1 failures',
 html_url:'https://github.com/maloney2323/Reality/issues/143',
});
function provider(overrides={}){
 let reads=0,writes=0,grants=0;
 const get=async path=>{
  reads++;
  if(path===ROOT+'/git/ref/heads/'+BRANCH)return {ref:'refs/heads/'+BRANCH,object:{sha:SHA}};
  if(path===ROOT+'/issues/143')return {...issue(),...overrides};
  if(path===ROOT+'/contents/'+PATH+'?ref='+SHA)
   return {type:'file',path:PATH,sha:BLOB,encoding:'base64',content:bytes.toString('base64')};
  throw Error('UNEXPECTED_GITHUB_PATH_'+path);
 };
 const write=async()=>{writes++;throw Error('NO_AUTHORITY_TO_WRITE_FROM_ISOLATED_TEST')};
 const consumeVerifiedGrant=async()=>{grants++;throw Error('NO_AUTHORITY_TO_CONSUME_GRANT_FROM_TEST')};
 return {get,write,consumeVerifiedGrant,counts:()=>({reads,writes,grants})};
}
test('exact original work #143 independently recognizes historical fix without new installation',async()=>{
 assert.equal(ORIGINAL_REPAIR_WORK,WORK);
 const p=provider();
 const result=await prepareOriginalMaintenanceRepair({get:p.get});
 assert.equal(result.state,'PREEXISTING_FIX_OBSERVED_NO_WRITE');
 assert.equal(result.original_work_id,WORK);
 assert.equal(result.model_upgrade_installed,false);
 assert.equal(p.counts().writes,0);
});
test('already-fixed live original source results in zero writes and zero consumed grants',async()=>{
 const p=provider();
 const result=await executeOriginalMaintenanceRepair({
  session:{user_id:'11111111-1111-4111-8111-111111111111'},
  conversationId:'22222222-2222-4222-8222-222222222222',
  get:p.get,write:p.write,consumeVerifiedGrant:p.consumeVerifiedGrant,
 });
 assert.equal(result.status,'PREEXISTING_FIX_NOT_EXECUTED_BY_REALITY');
 assert.equal(result.repair_executed_by_reality,false);
 assert.equal(result.original_job_completed,false);
 assert.equal(result.external_write_performed,false);
 assert.deepEqual(p.counts(),{reads:3,writes:0,grants:0});
});
test('falsified original GitHub issue identity is blocked before any provider write',async()=>{
 const p=provider({html_url:'https://github.com/untrusted/other/issues/143'});
 await assert.rejects(prepareOriginalMaintenanceRepair({get:p.get}),
  /ORIGINAL_EXECUTOR_PINNED_BRANCH_OR_ISSUE_MISMATCH/);
 assert.equal(p.counts().writes,0);
 assert.equal(p.counts().grants,0);
});
test('different work ID fails closed without contacting GitHub',async()=>{
 const p=provider();
 await assert.rejects(prepareOriginalMaintenanceRepair({
  workId:'work:ffffffffffffffffffffffffffffffff',get:p.get,
 }),/ORIGINAL_EXECUTOR_ONLY_ORIGINAL_WORK_ALLOWED/);
 assert.equal(p.counts().reads,0);
});
