import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {
 runAuthenticatedOwnerAutonomousUpgradeLoop,
 discoverExactOriginalUpgradeCI,
} from '../src/reality-owner-autonomous-upgrade-loop-v0.1.js';
const REPO='maloney2323/Reality',ROOT='https://api.github.com/repos/'+REPO;
const owner=randomUUID(),conversationId=randomUUID(),workId='work:'+'2'.repeat(32);
const session={user_id:owner};
const env={VERCEL_ENV:'preview',REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true'};
const head='3'.repeat(40),base='4'.repeat(40),merged='5'.repeat(40);
const branch='reality/build/build-'+'6'.repeat(32);
const url='https://github.com/'+REPO+'/pull/777';
const draft={owner_id:owner,conversation_id:conversationId,
 original_work_id:workId,durably_recorded:true,independently_reobserved:true,
 production_merge_authorized:false,capability_installed:false,
 original_job_completed:false,github_pr_number:777,github_pr_url:url,
 github_commit_sha:head,pinned_base_sha:base,github_branch:branch};
const names=['Governed Autonomous Self-Upgrading Provider v0.1',
 'Reality Governed Execution Engine v0.1'];
function fixture(prState='open'){
 const pr={number:777,state:prState,draft:prState==='open',
  merged:prState==='closed',
  merge_commit_sha:prState==='closed'?merged:null,
  head:{ref:branch,sha:head,repo:{full_name:REPO}},
  base:{ref:'experiment/reality-live-durable-adversarial-20261025',
   sha:base,repo:{full_name:REPO}},html_url:url};
 const runs=names.map((name,i)=>({id:100+i,name,event:'pull_request',
  head_branch:branch,head_sha:head,status:'completed',conclusion:'success',
  repository:{full_name:REPO},head_repository:{full_name:REPO}}));
 const path='/actions/runs?branch='+encodeURIComponent(branch)+
   '&event=pull_request&per_page=100';
 const map=new Map([
  [ROOT+'/pulls/777',pr],
  [ROOT+path,{total_count:2,workflow_runs:runs}],
 ]);
 const calls=[];
 const fetchImpl=async(uri,{method})=>{
  calls.push({uri,method});const body=map.get(uri);
  if(!body)throw Error('UNEXPECTED_NETWORK_PATH');
  return {ok:true,json:async()=>body};
 };
 return {map,calls,fetchImpl,pr,runs,path,
  args:{session,conversationId,originalWorkId:workId,env,
   loadDraft:async()=>draft,fetchImpl}};
}
test('exact two green original PR CI checks are discovered from GitHub, not browser claims',async()=>{
 const h=fixture();
 const r=await discoverExactOriginalUpgradeCI({draft,fetchImpl:h.fetchImpl});
 assert.equal(r.state,'EXACT_GREEN_DRAFT_CI_DISCOVERED');
 assert.deepEqual(r.run_ids,[100,101]);
 assert.equal(h.calls.length,1);
 assert.equal(h.calls[0].method,'GET');
});
test('full-loop open draft delegates to actual approval-gated execution once and never mints a grant itself',async()=>{
 const h=fixture(),calls=[];
 const out=await runAuthenticatedOwnerAutonomousUpgradeLoop({
  ...h.args,connectPorts:()=>({real:true}),
  execute:async a=>{
   calls.push(a);const ready=await a.prepare({session,conversationId,originalWorkId:workId,env});
   return {status:'ORIGINAL_CUSTOMER_JOB_SETTLED_AFTER_VERIFIED_UPGRADE',
    original_work_id:workId,original_job_completed:true,
    saved:ready.tested_by_mock_prepare===true};
  },
  prepare:async({ciRunIds})=>{
   assert.deepEqual(ciRunIds,[100,101]);
   return {tested_by_mock_prepare:true};
  },
 });
 assert.equal(out.original_job_completed,true);
 assert.equal(out.saved,true);
 assert.equal(calls.length,1);
 assert.deepEqual(calls[0].ports,{real:true});
});
test('PR already merged only invokes existing-install continuation; never repeats GitHub merge',async()=>{
 const h=fixture('closed');const calls=[];
 const out=await runAuthenticatedOwnerAutonomousUpgradeLoop({
  ...h.args,connectPorts:()=>{throw Error('should not install')},
  execute:async()=>{throw Error('should not remerge')},
  continueAfterInstall:async a=>{
   calls.push(a);return {status:'WAITING_FOR_INDEPENDENT_POST_MERGE_CI',
    original_job_completed:false,installation_replayed:false};
  },
 });
 assert.equal(out.status,'WAITING_FOR_INDEPENDENT_POST_MERGE_CI');
 assert.equal(out.installation_replayed,false);
 assert.equal(calls.length,1);
 assert.equal(calls[0].originalWorkId,workId);
 assert.equal(h.calls.length,1);
});
test('one-shot install cannot confuse pending async CI with a safe re-install',async()=>{
 const h=fixture();
 const out=await runAuthenticatedOwnerAutonomousUpgradeLoop({
  ...h.args,connectPorts:()=>({}),
  execute:async()=>({status:'UNRESOLVED_NO_AUTOMATIC_RETRY',
   blocked_at:'REGISTRATION',original_job_completed:false}),
 });
 assert.equal(out.status,'INSTALLED_AWAITING_ASYNC_CI_RECONCILIATION');
 assert.equal(out.automatic_install_retry_allowed,false);
 assert.equal(out.installation_replayed,false);
});
test('missing two green checks waits; failed check never triggers an install',async()=>{
 const h=fixture();
 const q=ROOT+h.path;
 h.map.set(q,{total_count:2,workflow_runs:[
  h.runs[0],{...h.runs[1],status:'completed',conclusion:'failure'}]});
 const r=await runAuthenticatedOwnerAutonomousUpgradeLoop({
  ...h.args,execute:async()=>{throw Error('unexpected install')},
 });
 assert.equal(r.status,'WAITING_FOR_EXACT_DRAFT_CI');
 assert.equal(r.original_job_completed,false);
 assert.equal(r.github_write_performed,false);
});
test('a changed PR, unmerged closed PR or foreign saved original ID cannot execute',async()=>{
 const h=fixture(),url=ROOT+'/pulls/777';
 h.map.set(url,{...h.pr,head:{...h.pr.head,sha:'f'.repeat(40)}});
 await assert.rejects(runAuthenticatedOwnerAutonomousUpgradeLoop(h.args),
  /AUTONOMOUS_LOOP_GITHUB_ORIGINAL_DRAFT_CHANGED/);
 const k=fixture('closed');
 k.map.set(url,{...k.pr,merged:false,merge_commit_sha:null});
 const r=await runAuthenticatedOwnerAutonomousUpgradeLoop(k.args);
 assert.equal(r.status,'BLOCKED_UNMERGED_ORIGINAL_DRAFT');
 assert.equal(r.original_job_completed,false);
 const x=fixture();
 await assert.rejects(runAuthenticatedOwnerAutonomousUpgradeLoop({
  ...x.args,loadDraft:async()=>({...draft,original_work_id:'work:'+'e'.repeat(32)}),
 }),/AUTONOMOUS_LOOP_ORIGINAL_DRAFT_SCOPE_CHANGED/);
});
test('untrusted request cannot inject executable code, authorization or a different user',async()=>{
 const {readFileSync}=await import('node:fs');
 const code=readFileSync(new URL('../api/reality/personal-autonomous-upgrade-loop.js',import.meta.url),'utf8');
 assert.match(code,/authenticatedChatSession/);
 assert.match(code,/assertSameOrigin/);
 assert.match(code,/runAuthenticatedOwnerAutonomousUpgradeLoop/);
 assert.doesNotMatch(code,/githubWrite|executeAuthorizedWork|issueUpgradeEvidenceWarrant/);
 const h=fixture();
 await assert.rejects(runAuthenticatedOwnerAutonomousUpgradeLoop({
  ...h.args,session:{user_id:randomUUID()},
 }),/AUTONOMOUS_LOOP_ORIGINAL_DRAFT_SCOPE_CHANGED/);
});
