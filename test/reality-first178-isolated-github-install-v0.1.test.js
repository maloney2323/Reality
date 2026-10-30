import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createFirst178GithubInstallationProvider}
 from '../src/reality-first178-isolated-github-install-v0.1.js';
const owner='11111111-1111-4111-8111-111111111111';
const work='work:'+'e'.repeat(32);
const baseSha='a'.repeat(40),treeSha='b'.repeat(40),blobSha='c'.repeat(40);
const newTree='d'.repeat(40),newCommit='e'.repeat(40);
const files=[
 {path:'src/reality-extensions/reality-ci-failure-evidence.mjs',
  content:'export function classifyVerifiedCiFailure(){return {decision:"MISSING_CAPABILITY"};}'},
 {path:'test/reality-extensions/model-candidate.test.js',
  content:'import test from "node:test";test("model",()=>{});'},
];
const stable=x=>x===null||typeof x!=='object'?x:Array.isArray(x)?x.map(stable):
 Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])]));
const digest=x=>createHash('sha256').update(JSON.stringify(stable(x))).digest('hex');
const candidate={files,artifact_hash:digest(files)};
const approval={kind:'PROMOTION_AUTHORIZED',owner_id:owner,
 artifact_hash:candidate.artifact_hash,
 approval_origin:'AUTHENTICATED_OWNER_EXPLICIT_ACTION',
 consumed_once:true,reservation_ref:'db:explicit-human-action',
 installation_target:'ISOLATED_PREVIEW'};
const frozen='import {classifyVerifiedCiFailure} from "../../src/reality-extensions/reality-ci-failure-evidence.mjs";test();';
function fakeProvider(){
 const calls=[];let newHead=false;const blobs=new Map();
 const respond=(body,ok=true,status=200)=>({ok,status,json:async()=>body});
 const fetchImpl=async(url,options)=>{
  const p=url.replace('https://api.github.com',''),method=options.method;
  calls.push({method,path:p,body:options.body?JSON.parse(options.body):null});
  const frozenPath='test/reality-frozen-regressions/first-reality-ci-evidence-gap.test.js';
  if(method==='GET'&&p.includes('/contents/'+frozenPath))
   return respond({sha:'3371237f8cf56a9f7240ba61bd5cd1b67af266c9',
    encoding:'base64',content:Buffer.from(frozen).toString('base64')});
  if(method==='GET'&&p.includes('/git/ref/heads/'))
   return respond({object:{sha:newHead?newCommit:baseSha}});
  if(method==='GET'&&p.includes('/git/commits/'))
   return respond({tree:{sha:treeSha}});
  if(method==='GET'&&p.includes('/git/trees/'))
   return respond({tree:[]});
  if(method==='POST'&&p.endsWith('/git/blobs')){
   const sha='0123456789abcdef'[6+blobs.size].repeat(40);
   blobs.set(sha,options.body?JSON.parse(options.body).content:'');
   return respond({sha});
  }
  if(method==='POST'&&p.endsWith('/git/trees')){
   const b=JSON.parse(options.body);
   assert.equal(b.tree.length,3);
   assert.equal(b.base_tree,treeSha);
   return respond({sha:newTree});
  }
  if(method==='POST'&&p.endsWith('/git/commits')){
   const body=JSON.parse(options.body);
   assert.equal(body.tree,newTree);
   assert.deepEqual(body.parents,[baseSha]);
   return respond({sha:newCommit});
  }
  if(method==='PATCH'&&p.includes('/git/refs/heads/')){
   const body=JSON.parse(options.body);
   assert.equal(body.force,false);
   newHead=true;
   return respond({object:{sha:newCommit}});
  }
  if(method==='GET'&&p.includes('/contents/')){
   const path=p.split('/contents/')[1].split('?')[0];
   const content=path===frozenPath?frozen:files.find(x=>x.path===path)?.content;
   return respond({encoding:'base64',content:Buffer.from(content).toString('base64')});
  }
  if(method==='GET'&&p.includes('/actions/runs?')){
   assert.ok(p.includes('head_sha='+newCommit));
   return respond({workflow_runs:[{head_sha:newCommit,
    name:'Reality — First Provider Gap to Model Handoff (no install)',
    status:'completed',conclusion:'success',id:9876,
    html_url:'https://github.com/maloney2323/Reality/actions/runs/9876'}]});
  }
  throw Error('UNEXPECTED_PROVIDER_CALL '+method+' '+p);
 };
 return {calls,fetchImpl};
}
test('cannot install before exact original owner approved source or without scoped secret',()=>{
 for(const change of [
  {approval:{...approval,consumed_once:false}},
  {approval:{...approval,artifact_hash:'f'.repeat(64)}},
  {candidate:{...candidate,files:[{path:'api/reality/private-chat.js',content:'bad'}]}},
 ]){
  assert.throws(()=>createFirst178GithubInstallationProvider({
   ownerId:owner,originalWorkId:work,
   approval:change.approval||approval,
   candidate:change.candidate||candidate,
   writeToken:'fake-isolated-write-token-long-enough',
  }),/FIRST178_GITHUB_INSTALL_EXACT_APPROVED_BYTES_AND_ORIGINAL_GOAL_REQUIRED/);
 }
 assert.throws(()=>createFirst178GithubInstallationProvider({
  ownerId:owner,originalWorkId:work,approval,candidate,
  writeToken:null,
 }),/FIRST178_GITHUB_INSTALL_EXPLICIT_ISOLATED_GITHUB_WRITE_CREDENTIAL_REQUIRED/);
});
test('one explicit approved candidate creates single fast-forward preview commit, readbacks real bytes and frozen CI',async()=>{
 const h=fakeProvider();
 const adapter=createFirst178GithubInstallationProvider({
  ownerId:owner,originalWorkId:work,approval,candidate,
  writeToken:'fake-isolated-write-token-long-enough',
  fetchImpl:h.fetchImpl});
 const installed=await adapter.writeAndReadback();
 assert.equal(installed.installed_commit_sha,newCommit);
 assert.equal(installed.artifact_hash,candidate.artifact_hash);
 assert.equal(installed.independently_verified,false);
 assert.equal(installed.production_changed,false);
 assert.equal(installed.original_job_completed,false);
 assert.equal(h.calls.filter(x=>x.method==='PATCH').length,1);
 assert.equal(h.calls.some(x=>x.path.includes('/git/refs/heads/main')),false);
 const ci=await adapter.observeFrozenAcceptance(installed.installed_commit_sha);
 assert.equal(ci.verified,true);
 assert.equal(ci.original_work_id,work);
 assert.equal(ci.original_job_completed,false);
 assert.equal(ci.provider_run_id,9876);
});
