import test from 'node:test';
import assert from 'node:assert/strict';
import {dispatchGovernedBuildToIsolatedWorker}
 from '../src/reality-governed-build-github-dispatch-v1.0.js';
const id='4c828bd0-7e97-4722-91bd-d75353aee571';
const original='work:24cda9611404e9bcb47909976067605c';
const issue='https://github.com/maloney2323/Reality/issues/143';
const env={VERCEL_ENV:'preview',
 REALITY_BUILDER_DISPATCH_GITHUB_TOKEN:'FAKE_SOURCE_CONTROL_TOKEN_NEVER_USED'};
function github({exists=false}={}){
 let head='a'.repeat(40),writes=0;
 const calls=[];
 return {
  calls,get writes(){return writes},
  fetchImpl:async(url,init)=>{
   const path=url.split('/repos/maloney2323/Reality')[1];
   const method=init.method;
   calls.push({path,method,body:init.body?JSON.parse(init.body):null});
   assert.ok(url.startsWith('https://api.github.com/repos/maloney2323/Reality'));
   assert.ok(init.headers.authorization.startsWith('Bearer '));
   if(method==='GET'&&path.startsWith('/git/ref/heads/'))
    return {ok:true,json:async()=>({object:{sha:head}})};
   if(method==='GET'&&path.startsWith('/contents/'))
    return exists?{ok:true,json:async()=>({
     path:'reality-requests/'+id+'.json',type:'file'
    })}:{ok:false,status:404,json:async()=>({message:'Not found'})};
   if(method==='GET'&&path.startsWith('/git/commits/'))
    return {ok:true,json:async()=>({tree:{sha:'b'.repeat(40)}})};
   if(method==='POST'&&path==='/git/blobs'){
    writes++;return {ok:true,json:async()=>({sha:'c'.repeat(40)})};
   }
   if(method==='POST'&&path==='/git/trees'){
    writes++;return {ok:true,json:async()=>({sha:'d'.repeat(40)})};
   }
   if(method==='POST'&&path==='/git/commits'){
    writes++;return {ok:true,json:async()=>({sha:'e'.repeat(40)})};
   }
   if(method==='PATCH'&&path.startsWith('/git/refs/heads/')){
    writes++;head='e'.repeat(40);return {ok:true,json:async()=>({object:{sha:head}})};
   }
   throw Error('UNEXPECTED_GITHUB_DISPATCH_CALL '+method+' '+path);
  },
 };
}
test('one owner-queued request causes one isolated-worker branch commit and exact readback',async()=>{
 const provider=github();
 const result=await dispatchGovernedBuildToIsolatedWorker({
  queue_id:id,original_work_id:original,issue_url:issue,env,
  fetchImpl:provider.fetchImpl,
 });
 assert.equal(result.dispatched,true);
 assert.equal(result.existing,false);
 assert.equal(result.worker_sha,'e'.repeat(40));
 assert.equal(provider.writes,4);
 const blob=provider.calls.find(x=>x.path==='/git/blobs');
 const data=JSON.parse(blob.body.content);
 assert.deepEqual(data,{schema:'reality-isolated-build-request-v1',
  queue_id:id,original_work_id:original,issue_number:143});
 assert.ok(!blob.body.content.includes('goal_evidence_ref'));
 assert.ok(!blob.body.content.includes('owner_id'));
 const tree=provider.calls.find(x=>x.path==='/git/trees');
 assert.deepEqual(tree.body.tree.map(x=>x.path),[
  'reality-requests/'+id+'.json']);
 const patched=provider.calls.find(x=>x.method==='PATCH');
 assert.equal(patched.body.force,false);
 assert.equal(result.production_changed,false);
 assert.equal(result.installation_authorized,false);
});
test('existing request is idempotent and cannot be overwritten',async()=>{
 const provider=github({exists:true});
 const result=await dispatchGovernedBuildToIsolatedWorker({
  queue_id:id,original_work_id:original,issue_url:issue,env,
  fetchImpl:provider.fetchImpl,
 });
 assert.equal(result.existing,true);
 assert.equal(provider.writes,0);
});
test('missing isolated preview credential fails before any network request',async()=>{
 const provider=github();
 await assert.rejects(dispatchGovernedBuildToIsolatedWorker({
  queue_id:id,original_work_id:original,issue_url:issue,
  env:{VERCEL_ENV:'preview'},fetchImpl:provider.fetchImpl,
 }),/GOVERNED_BUILD_DISPATCH_CREDENTIAL_UNAVAILABLE/);
 assert.equal(provider.calls.length,0);
});
test('production, foreign work, unsigned and foreign repositories are rejected',async()=>{
 const provider=github();
 for(const patch of [
  {env:{...env,VERCEL_ENV:'production'}},
  {queue_id:'not-uuid'},
  {original_work_id:'work:something'},
  {issue_url:'https://github.com/evil/repo/issues/143'},
  {issue_url:'https://github.com/maloney2323/Reality/issues/143?token=fake'},
 ])await assert.rejects(dispatchGovernedBuildToIsolatedWorker({
  queue_id:id,original_work_id:original,issue_url:issue,env,
  fetchImpl:provider.fetchImpl,...patch,
 }),/GOVERNED_BUILD_/);
 assert.equal(provider.calls.length,0);
});
