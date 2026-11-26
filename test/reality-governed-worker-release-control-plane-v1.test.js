import test from 'node:test';
import assert from 'node:assert/strict';
import {authorizedReleaseOperator,validOwnerReleaseIntent,ownerReleaseScopeMatches,default as handler}
 from '../api/reality/governed-worker-release-control-plane.js';
import {readFileSync} from 'node:fs';

function res(){
 const out={statusCode:200,headers:{},body:null};
 return {out,setHeader(k,v){out.headers[k]=v;return this},
  status(n){out.statusCode=n;return this},
  json(b){out.body=b;return this}};
}
test('independent control plane uses fixed timing-safe operator token',()=>{
 const secret='a'.repeat(64);
 assert.equal(authorizedReleaseOperator('Bearer '+secret,secret),true);
 assert.equal(authorizedReleaseOperator('Bearer '+'b'.repeat(64),secret),false);
 assert.equal(authorizedReleaseOperator('Bearer '+secret,undefined),false);
 assert.equal(authorizedReleaseOperator('Basic '+secret,secret),false);
});
test('external GET and unauthorized POST cannot inspect or switch',async()=>{
 let r=res();
 await handler({method:'GET'},r);
 assert.equal(r.out.statusCode,405);
 r=res();
 await handler({method:'POST',headers:{authorization:'Bearer '+'a'.repeat(64)},
  body:{intent:'SWITCH_EXACT_APPROVED_RELEASE'}},r);
 assert.equal(r.out.statusCode,403);
 assert.equal(r.out.body.original_job_completed,false);
 assert.equal(r.out.body.production_changed,false);
});
test('a real signed operator cannot submit arbitrary deployment or approval inputs',async()=>{
 const oldEnv=process.env.VERCEL_ENV,oldToken=process.env.REALITY_RELEASE_CONTROL_OPERATOR_TOKEN;
 process.env.VERCEL_ENV='preview';
 process.env.REALITY_RELEASE_CONTROL_OPERATOR_TOKEN='f'.repeat(64);
 try{
  const r=res();
  await handler({method:'POST',
   headers:{authorization:'Bearer '+'f'.repeat(64)},query:{},
   body:{intent:'SWITCH_EXACT_APPROVED_RELEASE',target:'attacker.vercel.app'}},r);
  assert.equal(r.out.statusCode,400);
  assert.equal(r.out.body.status,'GOVERNED_RELEASE_CONTROL_INTENT_INVALID');
 }finally{
  if(oldEnv===undefined)delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV=oldEnv;
  if(oldToken===undefined)delete process.env.REALITY_RELEASE_CONTROL_OPERATOR_TOKEN;
  else process.env.REALITY_RELEASE_CONTROL_OPERATOR_TOKEN=oldToken;
 }
});
test('endpoint only reaches one-use governed switch after independent provider reads',()=>{
 const s=readFileSync(new URL('../api/reality/governed-worker-release-control-plane.js',import.meta.url),'utf8');
 assert.match(s,/await adapters\.readSchedule\(\)/);
 assert.match(s,/qualifyCurrentIsolatedSignedWorkerRelease\(/);
 assert.match(s,/adapters\.readApprovedRelease\(/);
 assert.match(s,/triggerOneGovernedSignedWorkerReleaseSwitch\(/);
 assert.match(s,/schedule\.dedicated_stable_release_alias!==true/);
 assert.match(s,/release_switch_attempted:false/);
 assert.doesNotMatch(s,/req\.body\.release_sha/);
 assert.doesNotMatch(s,/req\.body\.scheduled_alias/);
});

test('qualified missing approval routes through existing durable preparation before any switch',()=>{
 const s=readFileSync(new URL('../api/reality/governed-worker-release-control-plane.js',import.meta.url),'utf8');
 const prepare=s.indexOf('await adapters.prepareExactRelease(');
 const qualification=s.indexOf('await qualifyCurrentIsolatedSignedWorkerRelease(');
 const switchIndex=s.indexOf('await triggerOneGovernedSignedWorkerReleaseSwitch(');
 assert.ok(qualification>0&&prepare>qualification&&switchIndex>prepare);
 assert.match(s,/if\(req.body.intent==='PREPARE_EXACT_RELEASE'\|\|req.body.intent==='OWNER_PREPARE_EXACT_RELEASE'\)/);
 assert.match(s,/PRESENT_EXACT_OWNER_RELEASE_PACKET/);
});

const exactRequest='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const owner='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
const shift='cccccccc-cccc-4ccc-accc-cccccccccccc';
const project='abcdefghijklmnopqrst';
const browserHeaders={host:'test-preview.vercel.app',origin:'https://test-preview.vercel.app','content-type':'application/json','sec-fetch-site':'same-origin'};
const request=body=>({method:'POST',headers:browserHeaders,query:{},body});
const exactBody={intent:'OWNER_APPROVE_EXACT_RELEASE',request_id:exactRequest,proposal_fingerprint:'sha256:'+'a'.repeat(64)};
test('owner release accepts only same-origin exact explicit request, never arbitrary targets or identities',()=>{
 assert.equal(validOwnerReleaseIntent(request({intent:'OWNER_PREPARE_EXACT_RELEASE'})),true);
 assert.equal(validOwnerReleaseIntent(request(exactBody)),true);
 for(const body of [{...exactBody,release_sha:'a'.repeat(40)},{...exactBody,owner_id:owner},
  {...exactBody,proposal_fingerprint:'wrong'},{...exactBody,request_id:'wrong'},
  {intent:'OWNER_APPROVE_EXACT_RELEASE'},{intent:'SWITCH_EXACT_APPROVED_RELEASE'},
  {intent:'OWNER_PREPARE_EXACT_RELEASE',token:'x'},null,[]]){
  assert.equal(validOwnerReleaseIntent(request(body)),false);
 }
 for(const headers of [{...browserHeaders,origin:'https://foreign.example'},
  {...browserHeaders,origin:undefined},{...browserHeaders,'content-type':'text/plain'},
  {...browserHeaders,'sec-fetch-site':'cross-site'}]){
  assert.equal(validOwnerReleaseIntent({...request(exactBody),headers}),false);
 }
 assert.equal(validOwnerReleaseIntent({...request(exactBody),query:{target:'x'}}),false);
});
test('owner release is feature-gated to exact authenticated owner and canonical Preview database',()=>{
 const env={VERCEL_ENV:'preview',REALITY_RELEASE_CHAT_OWNER_ENABLED:'true',
  REALITY_RELEASE_CONTROL_RUNTIME_TOPOLOGY:'CANONICAL_BENCHMARK_PREVIEW',
  REALITY_SIGNED_WORKER_RELEASE_OWNER_ID:owner,REALITY_SIGNED_WORKER_RELEASE_SHIFT_ID:shift,
  REALITY_RELEASE_CONTROL_DB_PROJECT_REF:project,REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:project,
  REALITY_FINAL_LOOP_SHARED_BENCHMARK_PROJECT_REF:project};
 const db={strictSecrets:true,project,url:'https://'+project+'.supabase.co'};
 const session={user_id:owner,config:{url:db.url}};
 assert.equal(ownerReleaseScopeMatches(session,db,env),true);
 for(const e of [{VERCEL_ENV:'production'},{REALITY_RELEASE_CHAT_OWNER_ENABLED:'false'},
  {REALITY_RELEASE_CONTROL_RUNTIME_TOPOLOGY:'ISOLATED_PREVIEW'},
  {REALITY_SIGNED_WORKER_RELEASE_SHIFT_ID:undefined},{REALITY_RELEASE_CONTROL_DB_PROJECT_REF:'wrong'}]){
  assert.equal(ownerReleaseScopeMatches(session,db,{...env,...e}),false);
 }
 assert.equal(ownerReleaseScopeMatches(null,db,env),false);
 assert.equal(ownerReleaseScopeMatches({...session,user_id:shift},db,env),false);
 assert.equal(ownerReleaseScopeMatches(session,{...db,strictSecrets:false},env),false);
 assert.equal(ownerReleaseScopeMatches(session,{...db,url:'https://wrong.supabase.co'},env),false);
});
test('owner prepare without verified session cannot qualify, and wrong origin is refused',async()=>{
 const changes={VERCEL_ENV:'preview',REALITY_RELEASE_CHAT_OWNER_ENABLED:'true',
  REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:project,
  REALITY_PERSONAL_CHAT_SUPABASE_URL:'https://'+project+'.supabase.co',
  REALITY_PERSONAL_CHAT_PUBLISHABLE_KEY:'sb_publishable_test',
  REALITY_CHAT_RECEIPT_HMAC_KEY:'a'.repeat(32)};
 const old=Object.fromEntries(Object.keys(changes).map(k=>[k,process.env[k]]));
 Object.assign(process.env,changes);
 try{
  const r=res();await handler(request({intent:'OWNER_PREPARE_EXACT_RELEASE'}),r);
  assert.equal(r.out.statusCode,401);
  assert.equal(r.out.body.status,'GOVERNED_RELEASE_CHAT_SIGN_IN_REQUIRED');
  const bad=res();await handler({...request(exactBody),headers:{...browserHeaders,origin:'https://foreign.example'}},bad);
  assert.equal(bad.out.statusCode,403);
  assert.equal(bad.out.body.status,'GOVERNED_RELEASE_CHAT_EXACT_OWNER_ACTION_REQUIRED');
  process.env.REALITY_RELEASE_CHAT_OWNER_ENABLED='false';
  const disabled=res();await handler(request(exactBody),disabled);
  assert.equal(disabled.out.statusCode,403);
  assert.equal(disabled.out.body.status,'GOVERNED_RELEASE_CHAT_NOT_ENABLED');
 }finally{for(const [k,v] of Object.entries(old)){if(v===undefined)delete process.env[k];else process.env[k]=v;}}
});
test('Chat consent requalifies and reads exact approval back before original fenced release switch',()=>{
 const s=readFileSync(new URL('../api/reality/governed-worker-release-control-plane.js',import.meta.url),'utf8');
 const qualify=s.indexOf('await qualifyCurrentIsolatedSignedWorkerRelease(');
 const prepare=s.indexOf('await adapters.prepareExactRelease(');
 const compare=s.indexOf('packet.proposal_fingerprint!==req.body.proposal_fingerprint');
 const approve=s.indexOf('await approveOwnerPacket(session,packet)');
 const verify=s.indexOf('approval?.receipt_sha256!==approved.receipt_sha256');
 const deliver=s.indexOf('await triggerOneGovernedSignedWorkerReleaseSwitch(');
 assert.ok(qualify<prepare&&prepare<compare&&compare<approve&&approve<verify&&verify<deliver);
 assert.match(s,/Authorization:'Bearer '\+session.access_token/);
 assert.match(s,/GOVERNED_RELEASE_CHAT_EXISTING_APPROVAL_RECONCILE_NO_REPLAY/);
 const ui=readFileSync(new URL('../reality-chat-governed-release-v1.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.ok(html.includes('/reality-chat-governed-release-v1.js'));
 assert.match(ui,/request\(\{intent:'OWNER_PREPARE_EXACT_RELEASE'\}\)/);
 assert.match(ui,/intent:'OWNER_APPROVE_EXACT_RELEASE',request_id:p.request_id/);
 assert.match(ui,/if\(!signed\(\)\|\|busy\|\|uncertain/);
 assert.doesNotMatch(ui,/setInterval|localStorage|OPERATOR_TOKEN/);
});

test('idle Chat has no main-dashboard timers; detailed reads are on demand',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const workspace=readFileSync(new URL('../reality-chat-workspace-v1.js',import.meta.url),'utf8');
 assert.match(html,/onRoute\('work','shifts'\)&&!wcEasyRepairBusy/);
 assert.match(html,/onRoute\('home','value'\)\)void realityBusinessRefresh/);
 assert.doesNotMatch(html,/setInterval\(\(\)=>\{if\(homeOwnerSignedIn\(\)\)void realityChatRefreshEvents/);
 assert.match(html,/window.addEventListener\('reality:chat-work-opened',async/);
 assert.match(workspace,/next==='work'\)window.dispatchEvent\(new CustomEvent\('reality:chat-work-opened'\)\)/);
 const detail=readFileSync(new URL('../reality-chat-continuous-qualification-v1.js',import.meta.url),'utf8');
 assert.match(detail,/reality:chat-work-opened/);
 assert.doesNotMatch(detail,/setInterval\(/);
 const release=readFileSync(new URL('../reality-chat-governed-release-v1.js',import.meta.url),'utf8');
 assert.match(release,/document.getElementById\('privateTranscript'\)/);
 assert.match(release,/thread.append\(card\)/);
 assert.match(release,/!thread.contains\(card\)/);
 assert.doesNotMatch(release,/realityChatPanelWork|setInterval|setTimeout/);
});
