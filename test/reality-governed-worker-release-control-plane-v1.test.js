import test from 'node:test';
import assert from 'node:assert/strict';
import {authorizedReleaseOperator,validOwnerReleaseIntent,ownerReleaseScopeMatches,default as handler}
 from '../api/reality/governed-worker-release-control-plane.js';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

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

test('release explanation separates verified delivery from completion and preserves conversational choice',()=>{
 const ui=readFileSync(new URL('../reality-chat-governed-release-v1.js',import.meta.url),'utf8');
 assert.match(ui,/evidenceDetails.open=false/);
 assert.match(ui,/whether the worker actually runs and whether the original job passes independent verification/);
 assert.match(ui,/You do not need to approve this release again/);
 assert.match(ui,/Ask Reality what happens next/);
 const followup=ui.slice(ui.indexOf("discuss.addEventListener('click'"),ui.indexOf('const valid='));
 assert.match(followup,/prompt.value=/);
 assert.doesNotMatch(followup,/fetch\(|\.click\(|request\(/);
 const chat=readFileSync(new URL('../api/reality/personal-chat.js',import.meta.url),'utf8');
 assert.match(chat,/id:'worker_observation',read:\(\)=>readVerifiedIndependentWorkerForChat/);
 assert.match(chat,/ctx.values.worker_observation\|\|\[\]/);
});


test('authenticated Chat automatically prepares once per signed epoch without approving or polling',async()=>{
 const source=readFileSync(new URL('../reality-chat-governed-release-v1.js',import.meta.url),'utf8');
 const elements=[];
 const make=(tag)=>{
  const el={tag,children:[],style:{},hidden:false,disabled:false,listeners:{},
   append(...children){this.children.push(...children)},
   contains(child){return this.children.includes(child)},
   setAttribute(){},addEventListener(type,fn){this.listeners[type]=fn}};
  elements.push(el);return el;
 };
 const ready=make('ready'),thread=make('thread');
 ready.style.display='none';
 let sync;
 class Observer{constructor(fn){this.fn=fn}observe(el){if(el===ready)sync=this.fn}}
 const calls=[];
 let release;
 const fetch=async(url,init)=>{
  calls.push({url,body:JSON.parse(init.body)});
  await new Promise(resolve=>{release=resolve});
  return {status:409,json:async()=>({status:'GOVERNED_RELEASE_INDEPENDENT_QUALIFICATION_BLOCKED',
   production_changed:false,original_job_completed:false})};
 };
 const flush=()=>new Promise(resolve=>setImmediate(resolve));
 runInNewContext(source,{location:{pathname:'/chat'},document:{
  getElementById:id=>id==='privateReady'?ready:id==='privateTranscript'?thread:null,
  createElement:make},MutationObserver:Observer,fetch,AbortSignal});
 assert.equal(calls.length,0);
 ready.style.display='block';sync();sync();
 assert.equal(calls.length,1);
 assert.deepEqual(calls[0].body,{intent:'OWNER_PREPARE_EXACT_RELEASE'});
 release();await flush();sync();
 assert.equal(calls.length,1);
 const approve=elements.find(el=>el.textContent==='Approve exact Preview release');
 assert.equal(approve.disabled,true);
 const dismiss=elements.find(el=>el.textContent==='×');
 dismiss.listeners.click();sync();
 assert.equal(calls.length,1);
 ready.style.display='none';sync();
 ready.style.display='block';sync();
 assert.equal(calls.length,2);
 assert.deepEqual(calls[1].body,{intent:'OWNER_PREPARE_EXACT_RELEASE'});
 release();await flush();
 assert.ok(calls.every(c=>c.url==='/api/reality/governed-worker-release-control-plane'));
});


test('signed wake handoff is candidate-bound, preparation-only, and rejects stale or tampered scope',async()=>{
 const {handoffSignedReleasePreparation,authenticateSignedReleasePreparation}=await import('../src/reality-governed-release-preparation-handoff-v1.js');
 const u=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
 const owner=u(1),shift=u(2),run=u(3),lease=u(4),event=u(5),request=u(6);
 const old='a'.repeat(40),target='b'.repeat(40),head='sha256:'+'c'.repeat(64),plan='sha256:'+'d'.repeat(64);
 const host='candidate-test.vercel.app',id='dpl_candidateTest123',project='benchmark-test';
 const env={VERCEL_ENV:'preview',REALITY_RELEASE_CONTROL_RUNTIME_TOPOLOGY:'CANONICAL_BENCHMARK_PREVIEW',
  REALITY_RELEASE_EVENT_PREPARATION_ENABLED:'true',REALITY_RELEASE_CONTROL_DB_PROJECT_REF:project,
  REALITY_FINAL_LOOP_SHARED_BENCHMARK_PROJECT_REF:project,REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:project,
  REALITY_FINAL_LOOP_PR_SOURCE_PLANS_ISOLATED_PROJECT_REF:'isolated-test',REALITY_EMPLOYEE_SHIFT_WORKER_TOKEN:'f'.repeat(64),
  REALITY_FINAL_LOOP_SHARED_BENCHMARK_OWNER_ID:owner,REALITY_FINAL_LOOP_SHARED_BENCHMARK_SHIFT_ID:shift,
  REALITY_SIGNED_WORKER_TARGET_RELEASE_SHA:target,VERCEL_GIT_COMMIT_SHA:old,VERCEL_DEPLOYMENT_ID:'dpl_oldRuntime123',
  REALITY_RELEASE_PREPARATION_CANDIDATE_HOST:host,REALITY_RELEASE_PREPARATION_CANDIDATE_DEPLOYMENT_ID:id,
  REALITY_VERIFIED_VERCEL_PROJECT_ID:'prj_test',REALITY_VERIFIED_VERCEL_TEAM_ID:'team_test',
  REALITY_VERIFIED_GITHUB_REPOSITORY:'example/repo'};
 const db={strictSecrets:true,project};
 const d={status:'GOVERNED_RELEASE_DIRECTION_DRIFT_OBSERVED',read_only:true,release_activated:false,
  production_changed:false,owner_approval_granted:false,authoritative_database:project,owner_id:owner,shift_id:shift,
  plan_fingerprint:plan,continuity_head_sha256:head,continuity_revision:2,observed_alias_release_sha:old,
  configured_target_release_sha:target,configured_target_release_ref:'feature/test'};
 const wake={kind:'RESUME',owner_id:owner,shift_id:shift,plan_fingerprint:plan,release_sha:old,event_id:event};
 const candidate={...env,VERCEL_GIT_COMMIT_SHA:target,VERCEL_DEPLOYMENT_ID:id};
 const calls=[];let signedBody;
 const fetchImpl=async(url,opts)=>{
  calls.push({url,method:opts.method});
  if(opts.method==='GET')return {ok:true,json:async()=>({id,url:host,projectId:'prj_test',target:null,state:'READY',
   meta:{githubCommitSha:target,githubCommitRef:'feature/test',githubOrg:'example',githubRepo:'repo'}})};
  signedBody=JSON.parse(opts.body);
  assert.equal(opts.headers.Authorization,undefined);
  assert.equal(authenticateSignedReleasePreparation({body:signedBody,env:candidate,db,now:1000}).event_id,event);
  return {ok:false,json:async()=>({status:'SIGNED_RELEASE_EXACT_OWNER_PACKET_PREPARED',production_changed:false,
   original_job_completed:false,release_switch_attempted:false,release_preparation:{status:'SIGNED_RELEASE_EXACT_OWNER_PACKET_PREPARED',
    shift_id:shift,release_sha:target,owner_id:owner,request_id:request,proposal_fingerprint:head,
    runtime_scope:{continuity_head_sha256:head,continuity_revision:2},owner_approval_granted:false,release_changed:false}})};
 };
 const args={env,db,direction:d,wake,workerRunId:run,leaseId:lease,fetchImpl,now:()=>1000};
 const out=await handoffSignedReleasePreparation(args);
 assert.equal(out.status,'SIGNED_RELEASE_EXACT_OWNER_PACKET_PREPARED');
 assert.equal(out.owner_approval_granted,false);
 assert.equal(out.release_activated,false);
 assert.equal(calls.length,2);
 assert.equal(authenticateSignedReleasePreparation({body:{...signedBody,payload:signedBody.payload+' '},env:candidate,db,now:1000}),null);
 assert.equal(authenticateSignedReleasePreparation({body:signedBody,env:candidate,db,now:100000}),null);
 assert.equal(authenticateSignedReleasePreparation({body:signedBody,env:{...candidate,VERCEL_ENV:'production'},db,now:1000}),null);
 assert.equal(authenticateSignedReleasePreparation({body:signedBody,env:{...candidate,VERCEL_DEPLOYMENT_ID:'dpl_wrongCandidate'},db,now:1000}),null);
 assert.equal((await handoffSignedReleasePreparation({...args,wake:{...wake,kind:'START'}})).status,'SIGNED_RELEASE_PREPARATION_NOT_DUE');
 assert.equal(calls.length,2);
});
test('signed preparation channel cannot reach activation and uses current service-only event readback',()=>{
 const s=readFileSync(new URL('../api/reality/governed-worker-release-control-plane.js',import.meta.url),'utf8');
 assert.ok(s.indexOf('await shiftRpc(db,\'reality_read_signed_release_preparation_event_v1\'')<
  s.indexOf('await qualifyCurrentIsolatedSignedWorkerRelease('));
 assert.ok(s.indexOf("if(signedPrepare||req.body.intent==='PREPARE_EXACT_RELEASE'")<
  s.indexOf('await triggerOneGovernedSignedWorkerReleaseSwitch('));
 const sql=readFileSync(new URL('../sql/reality-final-loop-release-preparation-event-readback-v1.sql',import.meta.url),'utf8');
 assert.match(sql,/r.run_id=p_worker_run_id/);
 assert.match(sql,/e.continuity_revision=p_revision/);
 assert.match(sql,/l.released_at IS NULL/);
 assert.doesNotMatch(sql,/INSERT INTO|UPDATE reality_internal|DELETE FROM/);
});
