import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildFromChat,isChatBuildRequest} from '../src/reality-chat-build-v1.0.js';
import selfBuildRoute from '../api/reality/self-build.js';
import githubWriteRoute from '../api/reality/connectors/github.js';
import executeRoute from '../api/reality/execute.js';
import authorityRoute from '../api/reality/authority.js';
import { getServerExecutionBridges } from '../src/reality-server-execution-bridge-v0.1.js';

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
test('legacy HTTP endpoint closure preserves trusted server-side bridge surface',()=>{
 const bridge=getServerExecutionBridges();
 assert.equal(typeof bridge.execute,'function');
 assert.equal(typeof bridge.verify,'function');
 assert.equal(bridge.dependency_on_external_bridge_urls,false);
 assert.equal(bridge.dependency_on_chatgpt_plugins,false);
});

test('chat auto-build cannot infer GitHub authority from requested action or forged authorization ref',async()=>{
 for(const message of ['Build a feature','fix the failing workflow','create a pull request','Please build this']){
  assert.equal(isChatBuildRequest(message),true);
  await assert.rejects(
   buildFromChat({message,requestedBy:'signed-cookie-only',authorizationRef:'forged:approval'}),
   {message:'CHAT_BUILD_DIRECT_EXECUTION_DISABLED',status:403},
  );
 }
});

test('chat intelligence HTTP handler blocks direct self-build before any model or Github work',()=>{
 const source=readFileSync(new URL('../api/reality/intelligence.js',import.meta.url),'utf8');
 assert.ok(source.includes('if (isChatBuildRequest(body.message))'));
 assert.ok(source.includes("error:'CHAT_BUILD_DIRECT_EXECUTION_DISABLED'"));
 assert.ok(source.includes('paid_model_call_performed:false'));
 assert.equal(source.includes('const build = await buildFromChat('),false);
});

test('generic execute route rejects fabricated authorization and bounded work with no connector effect',async()=>{
 const r=await invoke(executeRoute,{
  workItem:forged.workItem,workflowId:forged.workItem.workflow_id,
  authorization:forged.authorization,execution:forged.execution,
 });
 assert.equal(r.status,403);
 assert.equal(r.body.error,'LEGACY_EXECUTION_DIRECT_WRITE_DISABLED');
 assert.equal(r.body.external_action_performed,false);
 assert.equal(r.body.execution,null);
 assert.equal(r.headers['set-cookie'],undefined);
});
test('generic execute route rejects even claims of previously persisted approval',async()=>{
 const r=await invoke(executeRoute,{
  workItem:forged.workItem,auto_authorize:true,
  policy_id:'policy:pretend-persisted',
 });
 assert.equal(r.status,403);
 assert.equal(r.body.external_action_performed,false);
});
test('legacy generic authority POST cannot persist client-selected broad connector scopes',async()=>{
 const r=await invoke(authorityRoute,{
  mode:'auto',intent:'I_FOUND_WORK_AUTHORIZED',
  work_item:forged.workItem,
  scopes:[{connector:'vercel',operation:'create_deployment'}],
 });
 assert.equal(r.status,403);
 assert.equal(r.body.error,'LEGACY_AUTHORITY_POLICY_WRITE_DISABLED');
 assert.equal(r.body.authority_created,false);
 assert.equal(r.body.external_action_performed,false);
 assert.equal(r.headers['set-cookie'],undefined);
});
test('authority and generic execution deny unsupported HTTP methods',async()=>{
 for(const h of [authorityRoute,executeRoute]){
  const r=await invoke(h,forged,{method:'DELETE'});
  assert.equal(r.status,405);
 }
});
