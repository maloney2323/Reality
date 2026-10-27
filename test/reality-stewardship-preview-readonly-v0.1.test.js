import test from 'node:test';
import assert from 'node:assert/strict';
import {readStewardshipGitHub,runRealityStewardshipPass}
 from '../src/reality-stewardship-pass-v1.0.js';

const preview={VERCEL_ENV:'preview',REALITY_GITHUB_TOKEN:''};
function fakeFetch(body,{status=200}={}){
 const calls=[];
 const fetchImpl=async (url,opts)=>{
  calls.push({url,method:opts.method,headers:opts.headers});
  return new Response(JSON.stringify(body),{status});
 };
 return {calls,fetchImpl};
}
test('public fallback only uses GET on own repository in preview without a GitHub write token',async()=>{
 const mock=fakeFetch({workflow_runs:[]});
 const path='/repos/maloney2323/Reality/actions/runs?per_page=30';
 const result=await readStewardshipGitHub(path,{env:preview,fetchImpl:mock.fetchImpl});
 assert.deepEqual(result.workflow_runs,[]);
 assert.equal(mock.calls.length,1);
 assert.equal(mock.calls[0].method,'GET');
 assert.equal(mock.calls[0].url,'https://api.github.com'+path);
 assert.equal(mock.calls[0].headers.Authorization,undefined);
});
test('fallback blocks production, another repository, and all unsupported GitHub paths',async()=>{
 const mock=fakeFetch({workflow_runs:[]});
 for(const path of [
  '/repos/other/Reality/actions/runs?per_page=30',
  '/repos/maloney2323/Reality/issues',
  '/repos/maloney2323/Reality/contents/secret',
  '/repos/maloney2323/Reality/actions/runs?per_page=30&extra=1',
 ]){
  await assert.rejects(readStewardshipGitHub(path,{
   env:preview,fetchImpl:mock.fetchImpl,
  }),/DISCOVERY_PUBLIC_GITHUB_SOURCE_OUT_OF_SCOPE/);
 }
 await assert.rejects(readStewardshipGitHub(
  '/repos/maloney2323/Reality/pulls?state=open&per_page=30',{
   env:{...preview,VERCEL_ENV:'production'},fetchImpl:mock.fetchImpl,
  }),/DISCOVERY_AUTHENTICATED_GITHUB_CONNECTOR_REQUIRED/);
 assert.equal(mock.calls.length,0);
});
test('no fabricated evidence on GitHub HTTP failure or invalid response',async()=>{
 const path='/repos/maloney2323/Reality/actions/runs?per_page=30';
 const fail=fakeFetch({message:'rate-limited'},{status:403});
 await assert.rejects(readStewardshipGitHub(path,{
  env:preview,fetchImpl:fail.fetchImpl,
 }),/DISCOVERY_PUBLIC_GITHUB_HTTP_403/);
 const invalid=fakeFetch({workflow_runs:null});
 await assert.rejects(readStewardshipGitHub(path,{
  env:preview,fetchImpl:invalid.fetchImpl,
 }),/DISCOVERY_PUBLIC_GITHUB_RUNS_INVALID/);
});
test('real stewardship contract produces exact selectable ID from two distinct observed failures',async()=>{
 const at=new Date().toISOString();
 const runs=[
  {id:14401,name:'Recurring GitHub proof',conclusion:'failure',
   html_url:'https://github.com/maloney2323/Reality/actions/runs/14401',
   created_at:at,updated_at:at},
  {id:14402,name:'Recurring GitHub proof',conclusion:'failure',
   html_url:'https://github.com/maloney2323/Reality/actions/runs/14402',
   created_at:at,updated_at:at},
 ];
 const observedPaths=[];
 const readGithub=async path=>{
  observedPaths.push(path);
  return path.includes('/actions/runs?')?{workflow_runs:runs}:[];
 };
 const result=await runRealityStewardshipPass({
  readGithub,owner:'maloney2323',repo:'Reality',
 });
 assert.equal(observedPaths.length,2);
 assert.equal(result.work.length,1);
 const candidate=result.work[0];
 assert.equal(candidate.kind,'SYSTEM_MAINTENANCE');
 assert.equal(candidate.state,'QUALIFIED');
 assert.equal(candidate.authorization_required,true);
 assert.match(candidate.work_id,/^work:[0-9a-f]{32}$/);
 assert.equal(candidate.execution_work_item.work_item_id,candidate.work_id);
 assert.equal(candidate.execution_work_item.workflow_id,'workflow:'+candidate.work_id);
 assert.equal(candidate.execution_work_item.inputs.repository,'maloney2323/Reality');
 assert.equal(candidate.execution_work_item.operation,'create_issue');
 assert.equal(candidate.evidence_refs.length,2);
 assert.deepEqual(result.execution,[]);
});

test('Issues-only write token does NOT replace public Actions read in preview',async()=>{
 const mock=fakeFetch({workflow_runs:[]});
 const result=await readStewardshipGitHub(
  '/repos/maloney2323/Reality/actions/runs?per_page=30',
  {env:{VERCEL_ENV:'preview',REALITY_GITHUB_TOKEN:'fake-issues-only-preview-token'},
   fetchImpl:mock.fetchImpl});
 assert.deepEqual(result.workflow_runs,[]);
 assert.equal(mock.calls.length,1);
 assert.equal(mock.calls[0].headers.Authorization,undefined);
 assert.equal(mock.calls[0].method,'GET');
});
