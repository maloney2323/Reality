import test from 'node:test';
import assert from 'node:assert/strict';
import {connectOwnerGithubUpgradeToClosure}
 from '../src/reality-owner-upgrade-github-live-ports-v0.1.js';
const methods=['readFreshGoal','resumeOriginal','observeOriginal'];
function portGroup(){
 const result={};for(const m of methods)result[m]=async()=>({name:m});
 return result;
}
test('live GitHub adapter wires exact original ID and separate readback, reuses all required legacy services',async()=>{
 const prior=portGroup(),calls=[];
 const install=async a=>{calls.push(['install',a]);return {github_pr_number:92}};
 const observe=async a=>{calls.push(['observe',a]);return {independent:true}};
 const ports=connectOwnerGithubUpgradeToClosure({
  authorityPorts:{},
  runtimePorts:{resumeOriginal:prior.resumeOriginal,observeOriginal:prior.observeOriginal},
  continuityPorts:{readFreshGoal:prior.readFreshGoal},
  install,observe,
  consumeInstallGrant:async a=>{calls.push(['grantInstall',a]);return {status:'CONSUMED_ONCE'}},
  consumeResumeGrant:async a=>{calls.push(['grantResume',a]);return {status:'CONSUMED_ONCE'}},
  register:async a=>{calls.push(['register',a]);return {registered:true}},
  readRegistry:async a=>{calls.push(['readRegistry',a]);return {registered:true}},
  appendSettlement:async a=>{calls.push(['settle',a]);return {receipt_id:'receipt:123'}},
  readSettlement:async a=>{calls.push(['readSettlement',a]);return {
   settlement_receipt_id:'receipt:123',independently_reobserved:true}},

 });
 assert.equal(Object.isFrozen(ports),true);
 for(const m of methods)assert.equal(ports[m],prior[m]);
 const session={user_id:'owner'},scope={workId:'work:123',conversationId:'conv'};
 const plan={github_pr_number:92},grant={grant_id:'grant'},env={VERCEL_ENV:'preview'};
 const installed=await ports.install({session,scope,plan,grant,env});
 const verified=await ports.observeInstall({session,scope,plan,grant,issued:installed,env});
 assert.equal(verified.independent,true);
 const gi=await ports.consumeInstallGrant({session,scope,plan,env});
 const gr=await ports.consumeResumeGrant({session,scope,plan,installed,env});
 const reg=await ports.register({session,scope,plan,installed,env});
 const regObserved=await ports.readRegistry({session,scope,plan,installed,env});
 assert.equal(reg.registered,true);assert.equal(regObserved.registered,true);
 assert.equal(gi.status,'CONSUMED_ONCE');
 assert.equal(gr.status,'CONSUMED_ONCE');
 assert.deepEqual(calls.map(x=>x[0]),['install','observe','grantInstall','grantResume','register','readRegistry']);
 assert.equal(calls[0][1].scope.workId,scope.workId);
 assert.equal(calls[1][1].originalWorkId,scope.workId);
 assert.equal(calls[1][1].conversationId,scope.conversationId);
 assert.deepEqual(calls[1][1].issued,installed);
 const receipt=await ports.appendSettlement({session,scope,plan,installed,
  active:{},outcome:{},env});
 const saved=await ports.readSettlement({session,scope,plan,receipt,outcome:{},env});
 assert.equal(saved.independently_reobserved,true);
 assert.deepEqual(calls.map(x=>x[0]),['install','observe','grantInstall','grantResume','register','readRegistry','settle','readSettlement']);
 await assert.rejects(ports.readSettlement({
  session,scope,plan,receipt:{receipt_id:'wrong'},env,
 }),/UPGRADE_LIVE_SETTLEMENT_READBACK_RECEIPT_MISMATCH/);
});
test('missing a real authority, registry or original job adapter fails before any write',()=>{
 const ports=portGroup();
 for(const m of methods){
  const supplied={...ports};delete supplied[m];
  assert.throws(()=>connectOwnerGithubUpgradeToClosure({
   runtimePorts:supplied,install:async()=>{},observe:async()=>{},
  }),new RegExp('UPGRADE_LIVE_PORT_REQUIRED_'+m));
 }
});
