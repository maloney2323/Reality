import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {installVerifiedGenericPreviewExtension} from '../src/reality-general-isolated-install-v1.0.js';
const BRANCH='feature/reality-provider-proof-test-20261031',SHA='a'.repeat(40),
 OWNER='11111111-1111-4111-8111-111111111111',WORK='work:'+'b'.repeat(32);
const file=[{path:'src/reality-extensions/fix.mjs',content:'export const fixed = true;'},
 {path:'test/reality-extensions/fix.test.js',content:'import test from "node:test";test("fix",()=>{})'}];
const stable=x=>x===null||typeof x!=='object'?x:Array.isArray(x)?x.map(stable):
 Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])]));
const digest=x=>createHash('sha256').update(JSON.stringify(stable(x))).digest('hex');
const hash=digest(file),ticket={environment:'ISOLATED_PREVIEW',original_work_id:WORK,
 repository_base_sha:SHA,owner_id:OWNER,goal_id:'owner:verified:goal'};
const candidate={files:file,artifact_hash:hash};
const sandbox={artifact_hash:hash,independently_verified:true,
 independent_tests_passed:true,frozen_regression_passed:true,
 governance_preserved:true,verifier_run_ref:'vercel:sandbox:cmd:real'};
const approval={kind:'PROMOTION_AUTHORIZED',owner_id:OWNER,
 goal_id:ticket.goal_id,original_work_id:WORK,
 artifact_hash:hash,approval_origin:'AUTHENTICATED_OWNER_EXPLICIT_ACTION',
 consumed_once:true,reservation_ref:'supabase:approval:trusted'};
const verifyOwnerApproval=async()=>({verified:true,consumed_once:true,
 reservation_ref:approval.reservation_ref,original_work_id:WORK,
 owner_id:OWNER,artifact_hash:hash,target_environment:'ISOLATED_PREVIEW'});
function api({head=SHA,existing=false}={}){
 const calls=[],ROOT='https://api.github.com/repos/maloney2323/Reality';
 let current=head;
 const fetchImpl=async(url,opts={})=>{
  assert.ok(url.startsWith(ROOT+'/'));const path=url.slice(ROOT.length);
  calls.push([opts.method,path,opts.body?JSON.parse(opts.body):null]);
  let data;
  if(path==='/git/ref/heads/'+BRANCH||path==='/git/refs/heads/'+BRANCH){
   if(opts.method==='PATCH'){current=JSON.parse(opts.body).sha;data={object:{sha:current}}}
   else data={object:{sha:current}};
  }else if(path==='/git/commits/'+SHA)data={tree:{sha:'b'.repeat(40)}};
  else if(path==='/git/trees/'+'b'.repeat(40)+'?recursive=1')
    data={truncated:false,tree:existing?[{path:file[0].path}]:[]};
  else if(path==='/git/blobs')data={sha:'1'.repeat(40)};
  else if(path==='/git/trees')data={sha:'2'.repeat(40)};
  else if(path==='/git/commits')data={sha:'3'.repeat(40)};
  else if(path.startsWith('/contents/')){
   const name=path.slice('/contents/'.length).split('?')[0];
   data={encoding:'base64',content:Buffer.from(file.find(x=>x.path===name).content).toString('base64')};
  }else throw Error('UNEXPECTED_PROVIDER_CALL '+path);
  return {ok:true,json:async()=>data};
 };
 return {fetchImpl,calls};
}
function args(overrides={},provider=api()){
 return {ticket,candidate,sandbox,approval,verifyOwnerApproval,
  branch:BRANCH,writeToken:'real-isolated-test-token-not-production',fetchImpl:provider.fetchImpl,
  ...overrides};
}
test('source exact owner approval -> nonforce commit -> independent provider source readback',async()=>{
 const p=api();const r=await installVerifiedGenericPreviewExtension(args({},p));
 assert.equal(r.kind,'ISOLATED_GITHUB_SOURCE_INSTALLED');
 assert.equal(r.original_work_id,WORK);
 assert.equal(r.provider_bytes_readback_verified,true);
 assert.equal(r.production_changed,false);
 assert.equal(r.capability_registered,false);
 assert.equal(r.original_job_completed,false);
 assert.deepEqual(r.provider_source_files,file.map(x=>x.path));
 const patch=p.calls.find(x=>x[0]==='PATCH');
 assert.equal(patch[2].force,false);
 assert.equal(patch[1],'/git/refs/heads/'+BRANCH);
});
test('missing independent owner approval, changed scope or fake sandbox cannot issue provider writes',async()=>{
 for(const overrides of [
  {verifyOwnerApproval:async()=>({verified:false})},
  {ticket:{...ticket,original_work_id:'work:'+'e'.repeat(32)}},
  {sandbox:{...sandbox,independently_verified:false}},
  {approval:{...approval,consumed_once:false}},
  {branch:'main'},
  {candidate:{...candidate,files:[{path:'api/reality/execute.js',content:'no'}]}},
 ]){
  const p=api();
  await assert.rejects(installVerifiedGenericPreviewExtension(args(overrides,p)),
   /GENERAL_PREVIEW_INSTALL_/);
  assert.equal(p.calls.some(c=>c[0]==='POST'||c[0]==='PATCH'),false);
 }
});
test('pinned source advance or preexisting file refuses installation',async()=>{
 for(const params of [{head:'f'.repeat(40)},{existing:true}]){
  const p=api(params);
  await assert.rejects(installVerifiedGenericPreviewExtension(args({},p)),
   /GENERAL_PREVIEW_INSTALL_/);
  assert.equal(p.calls.some(c=>c[0]==='POST'||c[0]==='PATCH'),false);
 }
});
