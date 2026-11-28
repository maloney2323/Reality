import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {finalLoopEventTriggerEnabled,parseFinalLoopGovernedWake,
 verifyFinalLoopGovernedWakeScope,readFinalLoopGovernedShiftStart,resolveFinalLoopShiftStart} from '../src/reality-governed-auto-trigger-v1.0.js';
const owner='11111111-1111-4111-8111-111111111111',shift='22222222-2222-4222-8222-222222222222';
const fingerprint='sha256:'+'a'.repeat(64);
const db={strictSecrets:true,project:'isolated',url:'https://isolated.supabase.co'};
const env={VERCEL_ENV:'preview',REALITY_FINAL_LOOP_EVENT_TRIGGER_ENABLED:'true',
 REALITY_FINAL_LOOP_ENGINE_SHADOW_ENABLED:'true',REALITY_FINAL_LOOP_SHARED_CONTINUITY_GUARD_ENABLED:'true',
 REALITY_FINAL_LOOP_EVENT_RESUME_SHADOW_ENABLED:'true',REALITY_FINAL_LOOP_PR_SOURCE_PLANS_DB_ISOLATED:'true',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'isolated',REALITY_FINAL_LOOP_PR_SOURCE_PLANS_ISOLATED_PROJECT_REF:'isolated',
 REALITY_FINAL_LOOP_SHARED_BENCHMARK_PROJECT_REF:'shared'};
const scope={owner_id:owner,shift_id:shift,plan_fingerprint:fingerprint};
const graph={...scope,status:'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED',completion_bound:true,
 execution_scope_from_owner_warrant_only:true,new_job_created:false,installation_authorized:false,production_changed:false};
test('event transport is isolated and uses the exact existing shift only',()=>{
 assert.equal(finalLoopEventTriggerEnabled(db,env),true);
 for(const change of [{VERCEL_ENV:'production'},{REALITY_FINAL_LOOP_EVENT_TRIGGER_ENABLED:'false'},
  {REALITY_FINAL_LOOP_PREVIEW_SOURCE_PLAN_WAKE_ONLY:'true'},{REALITY_FINAL_LOOP_SHARED_BENCHMARK_PROJECT_REF:'isolated'},
  {REALITY_FINAL_LOOP_SHARED_BENCHMARK_PROJECT_REF:undefined},
  {REALITY_FINAL_LOOP_SHARED_CONTINUITY_GUARD_ENABLED:'false'}])
  assert.equal(finalLoopEventTriggerEnabled(db,{...env,...change}),false);
 const headers={'x-reality-governed-owner-id':owner,'x-reality-governed-shift-id':shift,
  'x-reality-governed-plan-fingerprint':fingerprint};
 assert.deepEqual(parseFinalLoopGovernedWake(headers),scope);
 assert.throws(()=>parseFinalLoopGovernedWake({...headers,'x-reality-governed-shift-id':'other'}));
 assert.equal(verifyFinalLoopGovernedWakeScope(scope,graph),true);
 for(const bad of [{...graph,owner_id:shift},{...graph,shift_id:owner},{...graph,installation_authorized:true},
  {...graph,plan_fingerprint:'sha256:'+'b'.repeat(64)}])
  assert.equal(verifyFinalLoopGovernedWakeScope(scope,bad),false);
});
test('durable queued start is not execution; only later same-shift pulse is observed',async()=>{
 const receipt={...scope,status:'GOVERNED_START_WAKE_QUEUED',read_only:true,
  execution_authorized:false,installation_authorized:false,original_job_completed:false,production_changed:false,
  network_request_id:42,queued_at:'2026-11-24T12:00:00Z'};
 const run=r=>readFinalLoopGovernedShiftStart({db,ownerId:owner,shift:{shift_id:shift,plan_fingerprint:fingerprint,
  planned_end_at:'infinity'},env,invoke:async(_db,name,args)=>{
   assert.equal(name,'reality_read_final_loop_governed_start_v1');assert.equal(args.p_shift_id,shift);return r;}});
 const q=await run(receipt);assert.equal(q.wake_queued,true);assert.equal(q.worker_observed,false);
 assert.equal(q.original_job_completed,false);assert.equal(q.execution_authorized_by_trigger,false);
 const observed=await run({...receipt,status:'GOVERNED_START_WORKER_OBSERVED',last_worker_seen_at:'2026-11-24T12:00:01Z'});
 assert.equal(observed.worker_observed,true);
 for(const bad of [{...receipt,owner_id:shift},{...receipt,execution_authorized:true},
  {...receipt,status:'GOVERNED_START_WORKER_OBSERVED',last_worker_seen_at:'2026-11-24T11:59:59Z'}])
  assert.equal((await run(bad)).status,'GOVERNED_START_READBACK_UNVERIFIED');
});
test('Chat preserves one explicit exact start and truthful queued readback',()=>{
 const ui=readFileSync(new URL('../reality-chat-employee-shift-card-v1.js',import.meta.url),'utf8');
 assert.match(ui,/panel\.insertBefore\(block,composer\)/);
 assert.match(ui,/Authorize & Start Shift/);assert.match(ui,/Schedule for later \(optional\)/);
 assert.match(ui,/expected_fingerprint:p\.expected_fingerprint/);
 assert.match(ui,/triggerMessage\(after\.governed_auto_trigger\)/);
 assert.doesNotMatch(ui,/workPanel\.prepend\(block\)/);
 const worker=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 assert.match(worker,/verifyFinalLoopGovernedWakeScope\(governedWakeScope/);
 assert.match(worker,/GOVERNED_AUTO_TRIGGER_WAKE_SCOPE_CHANGED/);
 const sql=readFileSync(new URL('../sql/reality-final-loop-governed-auto-trigger-transport-v1.sql',import.meta.url),'utf8');
 assert.doesNotMatch(sql,/cron\.job|cron\.schedule/);
 assert.match(sql,/lease_expires_at>pg_catalog\.clock_timestamp\(\) THEN RETURN NULL/);
 assert.match(sql,/AFTER UPDATE OF released_at/);
});

test('manual start uses server time; a selected schedule remains a future timestamp',()=>{
 const now=Date.parse('2026-11-24T12:00:00Z');
 assert.equal(resolveFinalLoopShiftStart('START_NOW','2026-11-24T12:05:00.000Z',now).toISOString(),'2026-11-24T12:00:00.000Z');
 assert.equal(resolveFinalLoopShiftStart('SCHEDULE','2026-11-24T12:05:00.000Z',now).toISOString(),'2026-11-24T12:05:00.000Z');
 assert.throws(()=>resolveFinalLoopShiftStart('SCHEDULE','2026-11-24T11:59:59.000Z',now));
 assert.throws(()=>resolveFinalLoopShiftStart('UNRECOGNIZED','2026-11-24T12:05:00.000Z',now));
});

test('actual Chat click handler prepares, authorizes and refreshes the same shift without duplicate POST',async()=>{
 class Element{
  constructor(tag){this.tag=tag;this.children=[];this.parentNode=null;this.hidden=false;
   this.disabled=false;this.value='';this.textContent='';this.style={};this.handlers={};}
  append(...items){for(const x of items){if(x.parentNode)x.parentNode.children=x.parentNode.children.filter(y=>y!==x);this.children.push(x);x.parentNode=this;}}
  contains(x){return x===this||this.children.some(y=>y.contains(x));}
  scrollIntoView(){}
  insertBefore(x,before){const i=this.children.indexOf(before);assert.ok(i>=0);
   this.children.splice(i,0,x);x.parentNode=this;}
  replaceChildren(...items){this.children=[];this.append(...items);}
  setAttribute(){}
  addEventListener(k,fn){this.handlers[k]=fn;}
  click(){return this.handlers.click?.();}
 }
 const panel=new Element('section'),composer=new Element('section'),transcript=new Element('div');
 panel.append(transcript,composer);
 const elements={realityChatConversation:panel,realityChatPanelWork:new Element('section'),
  privateTranscript:transcript,privatePrompt:new Element('textarea'),realityChatComposer:composer};
 const calls=[];
 let active=false;
 const source='https://github.com/maloney2323/Reality/pull/307';
 const plan={version:'reality-eight-hour-employee-shift-draft-v1',status:'DRAFT_ONLY_NOT_SCHEDULED_OR_AUTHORIZED',
  read_only:true,owner_approval_created:false,job_started:false,production_changed:false,
  installation_authorized:false,expected_fingerprint:fingerprint,
  shift_duration_hours:3,shift_duration_minutes:180,
  slots:Array.from({length:8},(_,i)=>({sequence:i+1})),
  combined_employee_work_orders:{version:'reality-riley-taylor-combined-work-orders-v1',
   plan_fingerprint:fingerprint,operating_model:'ONE_OPENAI_MODEL_SWITCHES_EMPLOYEE_ROLE_CONTEXT',
   execution_started:false,installation_authorized:false,production_changed:false,
   task_count:1,tasks:[{source_ref:source,employees:['Riley','Taylor'],
    state:'READY_FOR_ONE_OWNER_SHIFT_AUTHORIZATION',owner_authorization_required:true,
    production_changed:false,installation_authorized:false,title:'Prepared review'}]}};
 const fetch=async(url,opts)=>{
  calls.push({url,method:opts.method,body:opts.body?JSON.parse(opts.body):null});
  const result=opts.method==='POST'?(active=true,{
   ok:true,status:'SHIFT_DURABLY_AUTHORIZED',shift_id:shift,initial_authorization_recorded:true,
   installation_authorized:false,worker_dispatch_verified:false,production_changed:false,
   governed_auto_trigger:{status:'GOVERNED_START_WAKE_QUEUED'}}):{
    ok:true,status:'OWNER_SCOPED_EMPLOYEE_SHIFT_READBACK',production_changed:false,
    shift_approval_does_not_authorize_installation:true,
    shifts:active?[{shift_id:shift,status:'RUNNING',steps:[]}]:[],
    requested_shift_draft:plan,governed_auto_trigger:{status:'GOVERNED_START_WORKER_OBSERVED'}};
  return {ok:true,json:async()=>result};
 };
 const ui=readFileSync(new URL('../reality-chat-employee-shift-card-v1.js',import.meta.url),'utf8');
 const windowHandlers={};
 class MutationObserver{constructor(fn){this.fn=fn;}observe(){}disconnect(){}}
 runInNewContext(ui,{document:{getElementById:k=>elements[k],createElement:t=>new Element(t)},
  location:{pathname:'/chat',hash:''},window:{addEventListener(k,fn){windowHandlers[k]=fn;}},MutationObserver,fetch,AbortSignal,Date,
  setTimeout,console});
 const card=panel.children.find(x=>x.id==='realityCreateShift');
 assert.ok(card);assert.equal(card.parentNode,panel);
 const [prepare,, ,approve]=card.children[2].children;
 const status=card.children[4];
 assert.equal(approve.hidden,true);
 assert.equal(card.hidden,true);
 assert.equal(calls.length,0);
 windowHandlers['reality:open-shift-plan']({detail:{duration_hours:3,all_employees:false}});await new Promise(resolve=>setImmediate(resolve));
 assert.match(calls[0].url,/hours=3$/);
 assert.equal(card.parentNode,transcript);assert.equal(card.hidden,false);
 assert.equal(approve.hidden,false);
 assert.equal(calls.filter(x=>x.method==='POST').length,0);
 const first=approve.click();const second=approve.click();
 await Promise.all([first,second]);
 const posts=calls.filter(x=>x.method==='POST');
 assert.equal(posts.length,1);
 assert.equal(posts[0].body.expected_fingerprint,fingerprint);
 assert.equal(posts[0].body.start_mode,'START_NOW');
 assert.equal(posts[0].body.completion_bound,true);
 assert.equal(posts[0].body.requested_hours,3);
 assert.match(status.textContent,/queued the start/);
 assert.equal(approve.hidden,true);
 prepare.click();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(approve.hidden,true);
 assert.match(status.textContent,/Signed worker independently observed/);
 assert.match(status.textContent,/will not create a second shift/);
 assert.equal(calls.filter(x=>x.method==='POST').length,1);
});
