import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {installExactOwnerAuthorizedGithubUpgrade}
 from '../src/reality-owner-upgrade-github-install-v0.1.js';
import {fingerprintGovernedUpgradeCandidate}
 from '../src/reality-governed-github-upgrade-provider-v0.1.js';
const REPO='maloney2323/Reality',ROOT='/repos/'+REPO;
const BASE='experiment/reality-live-durable-adversarial-20261025';
const WORK='work:'+'7'.repeat(32),HEAD='8'.repeat(40),BASE_SHA='9'.repeat(40);
const FILES=[{path:'src/reality-extensions/safe-parser.js',mode:'100644',
 content:'export const parse=(value)=>({value});\n'}];
const HASH=fingerprintGovernedUpgradeCandidate(FILES);
function harness(){
 const owner=randomUUID(),conversationId=randomUUID(),grantId=randomUUID(),prNumber=1550;
 const session={user_id:owner},env={VERCEL_ENV:'preview'};
 const plan={state:'AWAITING_SEPARATE_INSTALLATION_AUTHORIZATION',
  owner_id:owner,conversation_id:conversationId,original_work_id:WORK,
  original_goal_id:'user-goal:test',goal_revision:'goal-ref:1',
  candidate_sha256:HASH,warrant_id:'warrant:'+'a'.repeat(64),
  github_pr_number:prNumber,github_branch:'reality/build/build-'+'1'.repeat(32),
  github_head_sha:HEAD,pinned_base_sha:BASE_SHA,
  github_pr_url:'https://github.com/'+REPO+'/pull/'+prNumber,
  verified_ci_runs:[{run_id:11},{run_id:12}]};
 const scope={ownerId:owner,conversationId,workId:WORK,headSha:HEAD,
  candidateSha:HASH,goalRevision:plan.goal_revision,githubPrNumber:prNumber,
  pinnedBaseSha:BASE_SHA,base:BASE};
 const grant={status:'CONSUMED_ONCE',
  operation:'github:install_exact_verified_upgrade',
  original_work_id:WORK,owner_id:owner,conversation_id:conversationId,
  goal_revision:plan.goal_revision,candidate_sha256:HASH,head_sha:HEAD,
  github_pr_number:prNumber,repository:REPO,base_ref:BASE,
  authorized_by:owner,separate_from_draft_authorization:true,
  promotion_only:true,grant_id:grantId};
 const pr={number:prNumber,state:'open',draft:false,merged:false,
  head:{ref:plan.github_branch,sha:HEAD,repo:{full_name:REPO}},
  base:{ref:BASE,sha:BASE_SHA,repo:{full_name:REPO}},
  html_url:plan.github_pr_url,mergeable:true};
 const answers=new Map([
  [ROOT+'/pulls/'+prNumber,pr],
  [ROOT+'/git/ref/heads/'+BASE,{ref:'refs/heads/'+BASE,object:{sha:BASE_SHA}}],
  [ROOT+'/pulls/'+prNumber+'/files?per_page=100',
   FILES.map(f=>({filename:f.path,status:'added'}))],
  [ROOT+'/contents/'+FILES[0].path+'?ref='+HEAD,{
   type:'file',path:FILES[0].path,encoding:'base64',
   content:Buffer.from(FILES[0].content).toString('base64')}],
 ]);
 const effects=[];
 const get=async path=>{effects.push(['GET',path]);
  if(!answers.has(path))throw Error('UNEXPECTED_READ '+path);
  return answers.get(path)};
 const write=async (path,method,body)=>{effects.push([method,path,body]);
  if(path!==ROOT+'/pulls/'+prNumber+'/merge'||method!=='PUT')throw Error('UNEXPECTED_WRITE');
  return {merged:true,sha:'b'.repeat(40)};
 };
 const loadTrusted=async()=>({persisted_and_reobserved:true,
  owner_id:owner,conversation_id:conversationId,original_work_id:WORK,
  goal_revision:plan.goal_revision,original_job_completed:false,
  evidence_warrant_id:plan.warrant_id,
  evidence_warrant:{pinned_base_commit_sha:BASE_SHA},
  verifiedExperiment:{verification_bundle:{synthesized_capability:{files:FILES}}}});
 return {args:{session,scope,plan,grant,env,get,write,loadTrusted},
  answers,effects,pr,owner,grant};
}
test('real connector is called once with exact approved GitHub merge SHA after independent readbacks',async()=>{
 const h=harness();
 const r=await installExactOwnerAuthorizedGithubUpgrade(h.args);
 assert.equal(r.provider_claim_not_independent,true);
 assert.equal(r.original_job_completed,false);
 assert.equal(r.production_deployment_performed,false);
 const writes=h.effects.filter(x=>x[0]!=='GET');
 assert.equal(writes.length,1);
 assert.deepEqual(writes[0].slice(0,2),['PUT',ROOT+'/pulls/1550/merge']);
 assert.equal(writes[0][2].sha,HEAD);
 assert.equal(writes[0][2].merge_method,'merge');
 await assert.rejects(installExactOwnerAuthorizedGithubUpgrade(h.args),
  /UPGRADE_INSTALL_LOCAL_REPLAY_REJECTED/);
 assert.equal(h.effects.filter(x=>x[0]!=='GET').length,1);
});
test('no separate consumed owner grant means zero external writes',async()=>{
 const mutations=[
  g=>({...g,status:'RESERVED_NOT_DISPATCHED'}),
  g=>({...g,operation:'github:create_isolated_upgrade_pr'}),
  g=>({...g,grant_id:'not-a-uuid'}),
  g=>({...g,owner_id:randomUUID()}),
  g=>({...g,head_sha:'f'.repeat(40)}),
  g=>({...g,github_pr_number:2}),
  g=>({...g,separate_from_draft_authorization:false}),
  g=>({...g,promotion_only:false}),
 ];
 for(const change of mutations){
  const h=harness();
  await assert.rejects(installExactOwnerAuthorizedGithubUpgrade({
   ...h.args,grant:change(h.grant),
  }),/UPGRADE_INSTALL_DISTINCT_CONSUMED_GRANT_REQUIRED/);
  assert.equal(h.effects.length,0);
 }
});
test('draft, already merged, stale base and changed code never merge',async()=>{
 for(const change of [
  p=>({...p,draft:true}),p=>({...p,merged:true,state:'closed'}),
  p=>({...p,mergeable:null}),
  p=>({...p,head:{...p.head,sha:'a'.repeat(40)}}),
  p=>({...p,base:{...p.base,sha:'a'.repeat(40)}}),
 ]){
  const h=harness();
  h.answers.set(ROOT+'/pulls/1550',change(h.pr));
  await assert.rejects(installExactOwnerAuthorizedGithubUpgrade(h.args),
   /UPGRADE_INSTALL_UNCHANGED_READY_PR_REQUIRED/);
  assert.equal(h.effects.filter(x=>x[0]!=='GET').length,0);
 }
 const h=harness();h.answers.set(ROOT+'/git/ref/heads/'+BASE,{
  ref:'refs/heads/'+BASE,object:{sha:'a'.repeat(40)}});
 await assert.rejects(installExactOwnerAuthorizedGithubUpgrade(h.args),
  /UPGRADE_INSTALL_BASE_MOVED_REISSUE_WARRANT_REQUIRED/);
 assert.equal(h.effects.filter(x=>x[0]!=='GET').length,0);
});
test('PR extras or changed approved byte source fail before GitHub merge',async()=>{
 const h=harness();h.answers.set(ROOT+'/pulls/1550/files?per_page=100',[
  {filename:FILES[0].path,status:'added'},
  {filename:'api/reality/security.js',status:'modified'}]);
 await assert.rejects(installExactOwnerAuthorizedGithubUpgrade(h.args),
  /UPGRADE_INSTALL_UNAPPROVED_PR_FILE_CHANGE/);
 assert.equal(h.effects.filter(x=>x[0]!=='GET').length,0);
 const k=harness();k.answers.set(ROOT+'/contents/'+FILES[0].path+'?ref='+HEAD,{
  type:'file',path:FILES[0].path,encoding:'base64',
  content:Buffer.from('malicious replacement\n').toString('base64')});
 await assert.rejects(installExactOwnerAuthorizedGithubUpgrade(k.args),
  /UPGRADE_INSTALL_TESTED_SOURCE_BYTES_CHANGED/);
 assert.equal(k.effects.filter(x=>x[0]!=='GET').length,0);
});
test('provider response alone never verifies installation or original job',async()=>{
 const h=harness();h.args.write=async(path,method,body)=>{
  h.effects.push([method,path,body]);return {merged:false,sha:'b'.repeat(40)};
 };
 await assert.rejects(installExactOwnerAuthorizedGithubUpgrade(h.args),
  /UPGRADE_INSTALL_GITHUB_MERGE_RESPONSE_UNCERTAIN_NO_RETRY/);
 assert.equal(h.effects.filter(x=>x[0]!=='GET').length,1);
});
