import test from 'node:test';
import assert from 'node:assert/strict';
import {
 createSelfBuildProposal,authorizeSelfBuild,executeSelfBuild,
} from '../src/reality-self-build-controller-v1.0.js';
import {
 createGovernedGithubUpgradeProvider,fingerprintGovernedUpgradeCandidate,
} from '../src/reality-governed-github-upgrade-provider-v0.1.js';

const REPO='maloney2323/Reality',BASE='experiment/reality-live-durable-adversarial-20261025';
const ROOT='/repos/'+REPO,baseSha='a'.repeat(40),nextSha='b'.repeat(40);
const work='work:24cda9611404e9bcb47909976067605c';
function setup(){
 const files=[{path:'src/reality-extensions/schedule-notifier.js',
  content:"export function notify(){return {status:'NOT_IMPLEMENTED'};}\n",mode:'100644'}];
 const proposal=createSelfBuildProposal({
  requestedBy:'reality-autonomous-capability-loop-v1.0',
  objective:'Add isolated scheduling notification extension',
  files,baseRef:BASE,riskLevel:'low',
  tests:['test/reality-extensions/schedule-notifier.test.js'],
  verificationPlan:['Frozen failure must reproduce','Isolated unit regression','Independent CI'],
 });
 const build=authorizeSelfBuild(proposal,{
  authorizationRef:'owner-policy:verified-in-runtime',
  authorizedBy:'signed-in-owner',
  allowedOperation:'github:create_isolated_upgrade_pr',
 });
 const lease={status:'DISPATCHING',single_use_claim_consumed:true,
  original_work_id:work,approved_build_id:build.build_id,
  approved_candidate_hash:fingerprintGovernedUpgradeCandidate(build.files),
  operation:'github:create_isolated_upgrade_pr',
  repository:REPO,base_ref:BASE,pinned_base_sha:baseSha,
  authorization_policy_sha:'f'.repeat(40),
  production_merge_authorized:false};
 return {build,lease};
}
function fakeGitHub({badCommittedContent=false,badPr=false,failBranchPost=false}={}){
 const state={sha:baseSha,branch:null,files:new Map(),pr:null,requests:[]};
 const responseContent=p=>({
  type:'file',path:p,encoding:'base64',sha:'file:sha',
  content:Buffer.from(state.files.get(p)||'','utf8').toString('base64'),
 });
 const get=async path=>{
  state.requests.push(['GET',path]);
  if(path===ROOT+'/git/ref/heads/'+BASE)
   return {ref:'refs/heads/'+BASE,object:{sha:baseSha}};
  if(path===ROOT+'/git/ref/heads/'+state.branch)
   return {ref:'refs/heads/'+state.branch,object:{sha:state.sha}};
  if(path.startsWith(ROOT+'/contents/')){
   const p=path.slice((ROOT+'/contents/').length).split('?')[0];
   if(!state.files.has(p)){
    const e=new Error('GITHUB_CONNECTOR_404');e.status=404;throw e;
   }
   return responseContent(p);
  }
  if(state.pr&&path===ROOT+'/pulls/'+state.pr.number)
   return {...state.pr,
    head:{ref:state.branch,sha:state.sha},
    base:{ref:BASE},draft:!badPr,merged:false};
  throw Error('UNKNOWN_GET '+path);
 };
 const write=async(path,method,body)=>{
  state.requests.push([method,path,body]);
  if(path===ROOT+'/git/refs'&&method==='POST'){
   if(failBranchPost)throw Error('NETWORK_OUTCOME_UNKNOWN');
   state.branch=body.ref.replace('refs/heads/','');
   return {ref:body.ref,object:{sha:baseSha}};
  }
  if(path.startsWith(ROOT+'/contents/')&&method==='PUT'){
   const p=path.slice((ROOT+'/contents/').length);
   state.files.set(p,badCommittedContent?'mismatch':Buffer.from(body.content,'base64').toString('utf8'));
   state.sha=nextSha;
   return {content:{path:p},commit:{sha:nextSha}};
  }
  if(path===ROOT+'/pulls'&&method==='POST'){
   state.pr={number:479,html_url:'https://github.com/'+REPO+'/pull/479'};
   return state.pr;
  }
  throw Error('UNKNOWN_WRITE '+method+' '+path);
 };
 return {state,get,write};
}
test('existing self-build controller creates only bounded draft PR after consumed exact single-use lease',async()=>{
 const {build,lease}=setup();const mock=fakeGitHub();
 const provider=createGovernedGithubUpgradeProvider({
  authorizedBuild:build,consumedReservation:lease,get:mock.get,write:mock.write});
 const out=await executeSelfBuild(build,{provider});
 assert.equal(out.state,'PR_OPENED');
 assert.equal(out.commit_sha,nextSha);
 assert.equal(out.pull_request.number,479);
 assert.equal(out.production_merge_permitted,false);
 assert.equal(mock.state.pr.number,479);
 assert.equal(mock.state.files.size,1);
 assert.equal(provider.getLocalStatus().original_work_id,work);
 assert.equal(provider.getLocalStatus().requires_separate_promotion_authorization,true);
 assert.deepEqual(mock.state.requests.filter(x=>x[0]!=='GET').map(x=>x[0]),
  ['POST','PUT','POST']);
 assert.ok(mock.state.requests.every(x=>x[1].startsWith(ROOT+'/')));
});
test('no owner goal-bound consumed lease, no provider creation',()=>{
 const {build,lease}=setup();
 for(const bad of [
  {...lease,status:'RESERVED_NOT_DISPATCHED'},
  {...lease,single_use_claim_consumed:false},
  {...lease,original_work_id:'work:other'},
  {...lease,approved_candidate_hash:'0'.repeat(64)},
  {...lease,operation:'github:create_issue'},
  {...lease,repository:'other/repo'},
  {...lease,base_ref:'main'},
  {...lease,production_merge_authorized:true},
  {...lease,authorization_policy_sha:undefined},
 ]){
  assert.throws(()=>createGovernedGithubUpgradeProvider({
   authorizedBuild:build,consumedReservation:bad,
  }),/UPGRADE_DURABLE_SINGLE_USE_CANDIDATE_AUTHORIZATION_REQUIRED/);
 }
});
test('path escapes, governance rewrites and broad code edits are rejected before GitHub writes',()=>{
 const {build,lease}=setup();
 for(const path of [
  '../package.json','/etc/hosts','src/reality-authority-v1.0.js',
  'api/reality/self-build.js','.github/workflows/ci.yml',
  'src/reality-extensions/../../secrets.js',
 ]){
  const changed={...build,files:[{path,content:'x',mode:'100644'}]};
  const authority={...lease,approved_candidate_hash:fingerprintGovernedUpgradeCandidate(changed.files)};
  assert.throws(()=>createGovernedGithubUpgradeProvider({
   authorizedBuild:changed,consumedReservation:authority,
  }),/UPGRADE_EXACT_EXTENSION_PATH_OR_CONTENT_INVALID/);
 }
});
test('pinned branch SHA mismatch prevents any provider POST',async()=>{
 const {build,lease}=setup();
 const mock=fakeGitHub();
 const provider=createGovernedGithubUpgradeProvider({
  authorizedBuild:build,consumedReservation:{...lease,pinned_base_sha:'e'.repeat(40)},
  get:mock.get,write:mock.write});
 await assert.rejects(executeSelfBuild(build,{provider}),/UPGRADE_PINNED_BASE_CHANGED/);
 assert.equal(mock.state.requests.filter(x=>x[0]!=='GET').length,0);
});
test('uncertain branch POST cannot be retried or create duplicate branch',async()=>{
 const {build,lease}=setup();const mock=fakeGitHub({failBranchPost:true});
 const provider=createGovernedGithubUpgradeProvider({
  authorizedBuild:build,consumedReservation:lease,get:mock.get,write:mock.write});
 await assert.rejects(executeSelfBuild(build,{provider}),/NETWORK_OUTCOME_UNKNOWN/);
 await assert.rejects(executeSelfBuild(build,{provider}),/UPGRADE_BRANCH_ALREADY_ATTEMPTED_NO_RETRY/);
 assert.equal(mock.state.requests.filter(x=>x[0]==='POST').length,1);
});
test('committed bytes mismatch blocks PR creation and refuses retry',async()=>{
 const {build,lease}=setup();const mock=fakeGitHub({badCommittedContent:true});
 const provider=createGovernedGithubUpgradeProvider({
  authorizedBuild:build,consumedReservation:lease,get:mock.get,write:mock.write});
 await assert.rejects(executeSelfBuild(build,{provider}),/UPGRADE_COMMITTED_BYTES_MISMATCH/);
 assert.equal(mock.state.pr,null);
 await assert.rejects(executeSelfBuild(build,{provider}),/UPGRADE_BRANCH_ALREADY_ATTEMPTED_NO_RETRY/);
});
test('independent GitHub readback rejecting incorrect PR status blocks success claim',async()=>{
 const {build,lease}=setup();const mock=fakeGitHub({badPr:true});
 const provider=createGovernedGithubUpgradeProvider({
  authorizedBuild:build,consumedReservation:lease,get:mock.get,write:mock.write});
 await assert.rejects(executeSelfBuild(build,{provider}),/UPGRADE_PR_INDEPENDENT_READBACK_MISMATCH/);
 assert.equal(mock.state.pr.number,479);
 assert.equal(provider.getLocalStatus().pull_request,null);
});
test('candidate tampering is detected after initial approval and before code write',async()=>{
 const {build,lease}=setup();const mock=fakeGitHub();
 const provider=createGovernedGithubUpgradeProvider({
  authorizedBuild:build,consumedReservation:lease,get:mock.get,write:mock.write});
 const b=await provider.createBranch({baseRef:BASE,branch:'reality/build/'+build.build_id.replace(':','-')});
 await assert.rejects(provider.writeFiles({
  branch:'reality/build/'+build.build_id.replace(':','-'),
  baseRef:BASE,files:[{...build.files[0],content:'malicious mutation'}],
  expectedBaseSha:b.branchSha,buildId:build.build_id,
 }),/UPGRADE_WRITE_CANDIDATE_OR_BRANCH_SCOPE_CHANGED/);
 assert.equal(mock.state.files.size,0);
});
test('the old direct self-build API remains disabled and the adapter never merges',async()=>{
 const {readFileSync}=await import('node:fs');
 const code=readFileSync(new URL('../api/reality/self-build.js',import.meta.url),'utf8');
 const adapter=readFileSync(new URL('../src/reality-governed-github-upgrade-provider-v0.1.js',import.meta.url),'utf8');
 assert.match(code,/LEGACY_SELF_BUILD_DIRECT_WRITE_DISABLED/);
 assert.doesNotMatch(adapter,/['"]PUT['"],\s*\{[^}]*\/merges/);
 assert.doesNotMatch(adapter,/githubWrite\(.*merge/i);
 assert.match(adapter,/production_merge_authorized!==false/);
});
