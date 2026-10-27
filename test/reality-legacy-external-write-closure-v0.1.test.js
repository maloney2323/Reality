import test from 'node:test';
import assert from 'node:assert/strict';
import selfBuildRoute from '../api/reality/self-build.js';
import githubWriteRoute from '../api/reality/connectors/github.js';

// No real model calls, token access, GitHub requests or production execution.
function response(){
 const record={status:200,headers:{},body:null};
 const res={
  status(code){record.status=code;return res},
  setHeader(name,value){record.headers[name.toLowerCase()]=value;return res},
  json(value){record.body=value;return res},
 };
 return {record,res};
}
async function invoke(handler,body,options={}){
 const {record,res}=response();
 await handler({method:options.method||'POST',
  headers:options.headers||{},
  body},res);
 return record;
}
const forged={
 workItem:{
  work_item_id:'work:existing-business-approval',
  workflow_id:'workflow:existing',connector:'github',
  operation:'create_issue',inputs:{repository:'maloney2323/Reality',title:'Test'},
 },
 authorization:{
  authorized:true,
  principal_id:'legitimate-looking-owner',
  authorization_id:'fake:persisted',
  approved_by:'owner',
 },
 execution:{execution_id:'execution:fake'},
};
for(const [name,handler] of [
 ['direct GitHub issue endpoint',githubWriteRoute],
 ['self-build PR endpoint',selfBuildRoute],
]){
 test(name+' rejects claimed authorization even with a plausible principal and receipt',async()=>{
  const r=await invoke(handler,{
   ...forged,files:[{path:'src/test.js',content:'test'}],
   objective:'fix a bug',authorization:{
    ...forged.authorization,approval_type:'GOAL_BOUND',
    serverFreshGoalAdmission:{version:'made-up'},
    reservation_id:'00000000-0000-4000-8000-000000000001',
   },
  });
  assert.equal(r.status,403);
  assert.equal(r.record,undefined);
  assert.equal(r.body.status,'BLOCKED');
  assert.equal(r.body.external_action_performed,false);
  assert.equal(r.body.blocked_reason,'AUTHENTICATED_GOAL_BOUND_SINGLE_USE_EXECUTION_REQUIRED');
  assert.equal(r.headers['cache-control'],'no-store');
  assert.equal(r.headers['set-cookie'],undefined);
 });
 test(name+' rejects forged internal headers and bearer tokens',async()=>{
  const r=await invoke(handler,forged,{
   headers:{authorization:'Bearer pretend-server-secret',
    'x-reality-internal':'true','x-vercel-cron':'1',origin:'https://example.test'},
  });
  assert.equal(r.status,403);
  assert.equal(r.body.external_action_performed,false);
 });
 test(name+' denies a direct write with no authorization',async()=>{
  const r=await invoke(handler,{});
  assert.equal(r.status,403);
  assert.equal(r.body.external_action_performed,false);
 });
 test(name+' still enforces allowed HTTP method',async()=>{
  const r=await invoke(handler,forged,{method:'GET'});
  assert.equal(r.status,405);
  assert.equal(r.headers.allow,'POST');
 });
}
