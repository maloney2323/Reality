import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {observeOwnerGithubUpgradeInstall}
 from '../src/reality-owner-upgrade-github-install-readback-v0.1.js';
import {fingerprintGovernedUpgradeCandidate}
 from '../src/reality-governed-github-upgrade-provider-v0.1.js';
const repo='maloney2323/Reality',ROOT='/repos/'+repo;
const BASE='experiment/reality-live-durable-adversarial-20261025';
const owner=randomUUID(),conversationId=randomUUID(),workId='work:'+'a'.repeat(32);
const files=[{path:'src/reality-extensions/work-resumption.js',
 mode:'100644',content:'export function resumeOriginal(){return true;}\n'}];
const candidate=fingerprintGovernedUpgradeCandidate(files);
const session={user_id:owner},env={VERCEL_ENV:'preview'};
const plan={state:'AWAITING_SEPARATE_INSTALLATION_AUTHORIZATION',
 owner_id:owner,conversation_id:conversationId,original_work_id:workId,
 original_goal_id:'goal:'+'3'.repeat(32),goal_revision:'goal-receipt:revision',
 candidate_sha256:candidate,warrant_id:'warrant:'+'2'.repeat(64),
 github_pr_number:1550,
 github_pr_url:'https://github.com/'+repo+'/pull/1550',
 github_head_sha:'1'.repeat(40),
 github_branch:'reality/build/build-'+'4'.repeat(32),
 pinned_base_sha:'0'.repeat(40),
 customer_installation_authorized:false,original_job_completed:false};
const merge='5'.repeat(40);
function fake(){
 const responses=new Map([
  [ROOT+'/pulls/1550',{
   number:1550,state:'closed',merged:true,draft:false,
   head:{sha:plan.github_head_sha,ref:plan.github_branch},
   base:{ref:BASE},merge_commit_sha:merge,html_url:plan.github_pr_url,
  }],
  [ROOT+'/git/ref/heads/'+BASE,{ref:'refs/heads/'+BASE,object:{sha:merge}}],
  [ROOT+'/pulls/1550/files?per_page=100',files.map(x=>({
   filename:x.path,status:'added',
  }))],
  [ROOT+'/contents/'+files[0].path+'?ref='+merge,{
   type:'file',path:files[0].path,encoding:'base64',
   sha:'blob',content:Buffer.from(files[0].content).toString('base64'),
  }],
 ]);
 const calls=[];
 const get=async path=>{calls.push(path);const item=responses.get(path);
  if(!item)throw Error('MOCK_GITHUB_404');return item};
 const loadTrusted=async()=>({
  owner_id:owner,conversation_id:conversationId,original_work_id:workId,
  original_goal_id:plan.original_goal_id,goal_revision:plan.goal_revision,
  persisted_and_reobserved:true,original_job_completed:false,
  evidence_warrant_id:plan.warrant_id,
  evidence_warrant:{pinned_base_commit_sha:plan.pinned_base_sha},
  verifiedExperiment:{verification_bundle:{synthesized_capability:{files}}},
 });
 const args={session,conversationId,originalWorkId:workId,plan,env,
  issued:{github_pr_number:1550},get,loadTrusted};
 return {args,responses,calls,get,loadTrusted};
}
test('real pinned GitHub PR, merge, base and source readbacks produce a nonauthorizing install observation',async()=>{
 const f=fake();const r=await observeOwnerGithubUpgradeInstall(f.args);
 assert.equal(r.independent,true);
 assert.equal(r.installed,true);
 assert.equal(r.exact_candidate_files_verified,true);
 assert.equal(r.merge_commit_sha,merge);
 assert.equal(r.candidate_sha256,candidate);
 assert.equal(r.production_deployment_performed,false);
 assert.equal(r.capability_registered,false);
 assert.equal(r.original_job_completed,false);
 assert.deepEqual(f.calls,[
  ROOT+'/pulls/1550',ROOT+'/git/ref/heads/'+BASE,
  ROOT+'/pulls/1550/files?per_page=100',
  ROOT+'/contents/'+files[0].path+'?ref='+merge]);
});
test('an unverified or open PR cannot be presented as installed',async()=>{
 for(const change of [
  x=>({...x,merged:false}),x=>({...x,state:'open'}),
  x=>({...x,draft:true}),x=>({...x,merge_commit_sha:null}),
  x=>({...x,head:{...x.head,sha:'9'.repeat(40)}}),
  x=>({...x,base:{ref:'main'}}),
 ]){
  const f=fake();
  const key=ROOT+'/pulls/1550';
  f.responses.set(key,change(f.responses.get(key)));
  await assert.rejects(observeOwnerGithubUpgradeInstall(f.args),
   /UPGRADE_INSTALL_READBACK_EXACT_MERGED_PR_REQUIRED/);
  assert.deepEqual(f.calls,[key]);
 }
});
test('a stale base SHA or extra/changed PR file blocks capability registration',async()=>{
 const f=fake();
 f.responses.set(ROOT+'/git/ref/heads/'+BASE,{
  ref:'refs/heads/'+BASE,object:{sha:'7'.repeat(40)},
 });
 await assert.rejects(observeOwnerGithubUpgradeInstall(f.args),
  /UPGRADE_INSTALL_READBACK_PREVIEW_BASE_NOT_EXACT_MERGE/);
 const g=fake();
 g.responses.set(ROOT+'/pulls/1550/files?per_page=100',[
  {filename:files[0].path,status:'added'},
  {filename:'src/reality-governed-execution-engine-v0.1.js',status:'modified'},
 ]);
 await assert.rejects(observeOwnerGithubUpgradeInstall(g.args),
  /UPGRADE_INSTALL_READBACK_PR_MODIFIED_UNAPPROVED_FILES/);
});
test('provider source bytes must match independently verified original candidate',async()=>{
 const f=fake();
 const path=ROOT+'/contents/'+files[0].path+'?ref='+merge;
 f.responses.set(path,{...f.responses.get(path),
  content:Buffer.from('export function resumeOriginal(){return false;}\n').toString('base64')});
 await assert.rejects(observeOwnerGithubUpgradeInstall(f.args),
  /UPGRADE_INSTALL_READBACK_CANDIDATE_BYTES_MISMATCH/);
});
test('different user, goal revision or candidate hash rejected without GitHub calls',async()=>{
 for(const mutation of [
  args=>({...args,session:{user_id:randomUUID()}}),
  args=>({...args,issued:{github_pr_number:999}}),
  args=>({...args,plan:{...args.plan,original_work_id:'work:'+'9'.repeat(32)}}),
  args=>({...args,loadTrusted:async()=>({
   ...({owner_id:owner,conversation_id:conversationId,original_work_id:workId,
    original_goal_id:plan.original_goal_id,goal_revision:'changed',
    persisted_and_reobserved:true,original_job_completed:false,
    evidence_warrant_id:plan.warrant_id,
    evidence_warrant:{pinned_base_commit_sha:plan.pinned_base_sha},
    verifiedExperiment:{verification_bundle:{synthesized_capability:{files}}}}),
  })}),
 ]){
  const f=fake();
  await assert.rejects(observeOwnerGithubUpgradeInstall(mutation(f.args)),
   /UPGRADE_INSTALL_READBACK_(TRUSTED_SCOPE_REQUIRED|SIGNED_CANDIDATE_CHANGED)/);
  assert.equal(f.calls.length,0);
 }
});
