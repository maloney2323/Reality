import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {verifyOwnerIsolatedExtensionRuntime}
 from '../src/reality-owner-upgrade-isolated-runtime-readback-v0.1.js';
const REPO='maloney2323/Reality',ROOT='/repos/'+REPO;
const BASE='experiment/reality-live-durable-adversarial-20261025';
const owner=randomUUID(),conversationId=randomUUID(),workId='work:'+'a'.repeat(32);
const head='1'.repeat(40),merged='2'.repeat(40),candidate='3'.repeat(64);
const session={user_id:owner},scope={ownerId:owner,conversationId,workId,
 goalRevision:'revision:4',headSha:head,candidateSha:candidate,
 pinnedBaseSha:'5'.repeat(40)};
const plan={owner_id:owner,conversation_id:conversationId,
 original_work_id:workId,goal_revision:scope.goalRevision,
 candidate_sha256:candidate,github_head_sha:head,
 pinned_base_sha:scope.pinnedBaseSha,capability_id:'extension:upgrade:test'};
const installed={original_work_id:workId,candidate_sha256:candidate,head_sha:head,
 installed:true,independent:true,exact_candidate_files_verified:true,
 production_deployment_performed:false,merge_commit_sha:merged,base_ref:BASE};
const nameA='Governed Autonomous Self-Upgrading Provider v0.1';
const nameB='Reality Governed Execution Engine v0.1';
const url=id=>'https://github.com/'+REPO+'/actions/runs/'+id;
const run=(id,name)=>({id,name,event:'push',status:'completed',conclusion:'success',
 head_branch:BASE,head_sha:merged,repository:{full_name:REPO},
 head_repository:{full_name:REPO},html_url:url(id)});
function fixture(){
 const data=new Map([
  [ROOT+'/git/ref/heads/'+BASE,{ref:'refs/heads/'+BASE,object:{sha:merged}}],
  [ROOT+'/actions/runs?branch='+encodeURIComponent(BASE)+'&event=push&per_page=100',{
   total_count:2,workflow_runs:[run(171,nameA),run(172,nameB)]}],
  [ROOT+'/actions/runs/171/jobs?per_page=100',{
   total_count:1,jobs:[{name:'isolated-extension-verification',
    status:'completed',conclusion:'success',steps:[{
     name:'Require at least one extension and one test, then run in no-network no-secret Docker',
     conclusion:'success'}]}]}],
 ]);
 const calls=[];
 const get=async path=>{calls.push(path);
  if(!data.has(path))throw Error('UNKNOWN_PROVIDER_READ');
  return data.get(path)};
 return {data,calls,args:{session,scope,plan,installed,env:{VERCEL_ENV:'preview'},get}};
}
test('observed post-merge extension Docker execution is independently pinned to the exact installed preview SHA',async()=>{
 const x=fixture();
 const r=await verifyOwnerIsolatedExtensionRuntime(x.args);
 assert.equal(r.runtime_active,true);
 assert.equal(r.runtime_kind,'GITHUB_ACTIONS_NO_NETWORK_ISOLATED_EXTENSION_TEST');
 assert.equal(r.independently_reobserved,true);
 assert.equal(r.registered,false);
 assert.equal(r.original_job_completed,false);
 assert.equal(r.production_deployment_performed,false);
 assert.deepEqual(r.post_merge_ci_runs.map(v=>v.run_id),[171,172]);
 assert.equal(x.calls.length,3);
});
test('failed, pending, wrong-commit, PR-only, or conflicting CI cannot activate even isolated runtime',async()=>{
 for(const change of [
  r=>({...r,conclusion:'failure'}),
  r=>({...r,status:'in_progress'}),
  r=>({...r,head_sha:'f'.repeat(40)}),
  r=>({...r,event:'pull_request'}),
  r=>({...r,head_branch:'main'}),
 ]){
  const x=fixture(),key=ROOT+'/actions/runs?branch='+encodeURIComponent(BASE)+'&event=push&per_page=100';
  const rs=x.data.get(key);
  x.data.set(key,{...rs,workflow_runs:[change(rs.workflow_runs[0]),rs.workflow_runs[1]]});
  await assert.rejects(verifyOwnerIsolatedExtensionRuntime(x.args),
   /UPGRADE_RUNTIME_EXACT_POST_MERGE_CI_NOT_GREEN/);
 }
 const y=fixture(),key=ROOT+'/actions/runs?branch='+encodeURIComponent(BASE)+'&event=push&per_page=100';
 const rs=y.data.get(key);
 y.data.set(key,{...rs,total_count:3,
  workflow_runs:[...rs.workflow_runs,rs.workflow_runs[0]]});
 await assert.rejects(verifyOwnerIsolatedExtensionRuntime(y.args),
  /UPGRADE_RUNTIME_EXACT_POST_MERGE_CI_NOT_GREEN/);
});
test('only exact completed no-network Docker extension test counts as isolated runtime execution',async()=>{
 const x=fixture(),key=ROOT+'/actions/runs/171/jobs?per_page=100';
 x.data.set(key,{total_count:1,jobs:[{name:'isolated-extension-verification',
  status:'completed',conclusion:'success',steps:[]}]});
 await assert.rejects(verifyOwnerIsolatedExtensionRuntime(x.args),
  /UPGRADE_RUNTIME_NO_NETWORK_EXTENSION_JOB_NOT_VERIFIED/);
});
test('moving base, foreign owner or non-isolated deployment refuses activation',async()=>{
 const a=fixture(),key=ROOT+'/git/ref/heads/'+BASE;
 a.data.set(key,{ref:'refs/heads/'+BASE,object:{sha:'f'.repeat(40)}});
 await assert.rejects(verifyOwnerIsolatedExtensionRuntime(a.args),
  /UPGRADE_RUNTIME_MERGED_PREVIEW_COMMIT_MOVED/);
 const b=fixture();
 await assert.rejects(verifyOwnerIsolatedExtensionRuntime({
  ...b.args,session:{user_id:randomUUID()}}),
  /UPGRADE_RUNTIME_PREVIEW_EXACT_INSTALL_REQUIRED/);
 assert.equal(b.calls.length,0);
 const c=fixture();
 await assert.rejects(verifyOwnerIsolatedExtensionRuntime({
  ...c.args,installed:{...installed,production_deployment_performed:true}}),
  /UPGRADE_RUNTIME_PREVIEW_EXACT_INSTALL_REQUIRED/);
 assert.equal(c.calls.length,0);
});
