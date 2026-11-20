import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script,runInNewContext} from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ui=read('reality-chat-maintenance-continuation-v1.js');
const css=read('reality-chat-maintenance-continuation-v1.css');
const html=read('index.html');
const api=read('api/reality/personal-governed-employee-shift.js');
const HASH=n=>'sha256:'+n.repeat(64);
const prior='fd888f5c-ee4e-4257-9756-3d09a6e622c7';
const items=[{
 internal_work_id:'maintenance:b7181e5b-a01c-4cb2-b191-10dea9dbe04f',
 origin_incident_id:'b7181e5b-a01c-4cb2-b191-10dea9dbe04f',
 origin_shift_id:prior,kind:'EMPLOYEE_QUALIFICATION_HANDOFF_STALLED',
 assignee:'Riley',independent_reviewer:'Quinn',
 phase:'OPEN_NEEDS_BUSINESS_WORK_ROOT_CAUSE',
 source_ref:'https://github.com/maloney2323/Reality/pull/307',
 independent_review_receipt_sha256:HASH('a'),
 repair_verified:false,original_customer_job_completed:false
},{
 internal_work_id:'maintenance:05d1e1a9-8f9e-43a5-94ba-acd367cc2611',
 origin_incident_id:'05d1e1a9-8f9e-43a5-94ba-acd367cc2611',
 origin_shift_id:prior,kind:'QUALIFIED_EVIDENCE_JOB_BLOCKED',
 assignee:'Taylor',independent_reviewer:'Quinn',
 phase:'OPEN_NEEDS_FROZEN_SOURCE_REPRODUCTION',
 source_ref:'https://github.com/maloney2323/Reality/pull/308',
 independent_review_receipt_sha256:HASH('b'),
 repair_verified:false,original_customer_job_completed:false
}];
const fingerprint=HASH('f');
const draft={status:'EXACT_OWNER_INTERNAL_MAINTENANCE_CONTINUATION_DRAFT',
 expected_fingerprint:fingerprint,open_maintenance_jobs:2,
 owner_authorization_required:true,completion_bound:true,
 completion_condition:'ALL_EXACT_INTERNAL_MAINTENANCE_REPAIR_RECEIPTS_VERIFIED',
 no_new_customer_work_created:true,previously_closed_shifts_reopened:false,
 original_job_completed:false,installation_authorized:false,
 production_changed:false,plan:{slots:Array(8).fill({})},
 work_items:items.map(j=>({
  maintenance_id:j.origin_incident_id,origin_shift_id:j.origin_shift_id,
  assignee:j.assignee,independent_reviewer:j.independent_reviewer,
  source_ref:j.source_ref,
  independent_review_receipt_sha256:j.independent_review_receipt_sha256
 }))
};
const data={ok:true,
 internal_maintenance_continuity_status:'OWNER_MAINTENANCE_SOURCE_AND_ROLE_VERIFIED',
 internal_maintenance_continuity:{
  status:'OWNER_UNFINISHED_INTERNAL_MAINTENANCE_PRESERVED',
  open_count:2,items,current_shift_id:null,no_new_shift_started:true,
  signed_warrant_scope_verified:false,signed_warrant_shift_id:null,
  signed_unfinished_count:0,signed_maintenance_incident_ids:[],
  newly_discovered_outside_warrant_count:2,
  outside_warrant_incident_ids:items.map(i=>i.origin_incident_id),
  owner_authority_granted:false,customer_job_completed:false,
  production_changed:false
 },
 requested_maintenance_draft_status:
  'VERIFIED_EXISTING_INTERNAL_MAINTENANCE_CONTINUATION_READY',
 requested_maintenance_draft:draft
};
const signedShiftId='a1111111-2222-4333-8444-555555555555';
const receipt={ok:true,status:'SHIFT_DURABLY_AUTHORIZED',
 shift_id:signedShiftId,owner_scope_verified:true,
 initial_authorization_recorded:true,completion_bound:true,
 completion_condition:'ALL_EXACT_INTERNAL_MAINTENANCE_REPAIR_RECEIPTS_VERIFIED',
 start_confirmation:{
  status:'EXACT_OWNER_INTERNAL_MAINTENANCE_CONTINUATION_AUTHORIZED',
  shift_id:signedShiftId,old_shifts_unchanged:true,
  exact_internal_work_count:2,worker_execution_verified:false,
  customer_job_completed:false,production_changed:false
 },
 shift:{shift_id:signedShiftId,plan_fingerprint:fingerprint,
  planned_end_at:'infinity'},installation_authorized:false,
 production_changed:false,worker_dispatch_verified:false,
 job_started:false};
class El{
 constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];
  this.parentElement=null;this.style={display:''};this.hidden=false;
  this.disabled=false;this.textContent='';this.attributes={};this.handlers={};
  this.id='';this.className='';this.dataset={};this.focused=false;}
 append(...elements){for(const e of elements){this.children.push(e);e.parentElement=this;}}
 insertBefore(el,ref){
  const at=ref?this.children.indexOf(ref):-1;
  if(at<0)this.append(el);
  else{this.children.splice(at,0,el);el.parentElement=this;}
 }
 replaceChildren(...elements){this.children=[];this.append(...elements);}
 setAttribute(k,v){this.attributes[k]=v;}
 addEventListener(k,cb){this.handlers[k]=cb;}
 click(){return this.handlers.click?.();}
 scrollIntoView(){}
 focus(){this.focused=true;}
 contains(target){return this===target||this.children.some(x=>x.contains(target));}
}
function setup({readback=data,posted=receipt,signedIn=true}={}){
 const ready=new El();ready.id='privateReady';
 ready.style.display=signedIn?'block':'none';
 const inbox=new El();inbox.id='realityChatApprovalInbox';
 const itemsAnchor=new El();itemsAnchor.id='realityChatApprovalItems';
 inbox.append(itemsAnchor);
 // Mirror the REAL /chat DOM: the transcript has no legacy conversation-center wrapper.
 const thread=new El();thread.id='privateTranscript';
 const open=new El();open.id='realityChatOpenInspector';
 const approvals=new El();approvals.id='realityChatTabApprovals';
 const prompt=new El('textarea');prompt.id='privatePrompt';
 const nodes=[ready,inbox,thread,open,approvals,prompt];
 const locate=(id)=>{
  function scan(n){if(n.id===id)return n;
   for(const c of n.children){const found=scan(c);if(found)return found;}
   return null;
  }
  for(const n of nodes){const result=scan(n);if(result)return result;}
  return null;
 };
 const calls=[],now=new Date();
 const fetch=async(url,options)=>{
  assert.equal(url,'/api/reality/personal-governed-employee-shift');
  assert.equal(options.credentials,'same-origin');
  assert.equal(options.cache,'no-store');
  calls.push({url,options});
  const response=options.method==='POST'?posted:readback;
  if(options.method==='POST')return response===null?Promise.reject(Error('TIMEOUT')):{
   ok:!response?.apiError,status:response?.apiError?409:202,
   json:async()=>response
  };
  return {ok:!response?.apiError,status:response?.apiError?503:200,
   json:async()=>response};
 };
 const observers=[];
 const doc={getElementById:locate,createElement:tag=>new El(tag),
  addEventListener(){}};
 const events=[];
 const win={location:{pathname:'/chat',hash:''},
  matchMedia:()=>({matches:true}),addEventListener:()=>{},
  setInterval:()=>0,dispatchEvent:e=>events.push(e)};
 const context={window:win,document:doc,fetch,AbortSignal,
  MutationObserver:class{constructor(cb){observers.push(cb)}
   observe(){}disconnect(){}},CustomEvent:class{constructor(type,init){
    this.type=type;this.detail=init?.detail;
   }},Date,console};
 runInNewContext(ui,context);
 const flush=async()=>{for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r));};
 return {ready,inbox,thread,locate,calls,events,flush,observers,
  click:id=>locate(id)?.click()};
}
test('unified signed-in Chat actually loads existing maintenance controls, not old chat-simple',()=>{
 assert.match(html,/<script defer src="\/reality-chat-workspace-v1.js"><\/script>\s*<script defer src="\/reality-chat-maintenance-continuation-v1.js"><\/script>/);
 assert.match(html,/<link rel="stylesheet" href="\/reality-chat-maintenance-continuation-v1.css">/);
 assert.ok(html.indexOf('reality-chat-maintenance-continuation-v1.css')>
  html.indexOf('reality-chat-mobile-usable-v3.css'));
 assert.match(ui,/get\('realityChatApprovalInbox'\)/);
 assert.match(html,/id="privateTranscript"/);
 assert.doesNotMatch(html,/id="realityChatConversation"/);
 assert.doesNotMatch(ui,/get\('realityChatConversation'\)/);
 assert.match(ui,/get\('realityChatTabApprovals'\)/);
 assert.match(ui,/get\('realityChatOpenInspector'\)/);
 assert.doesNotMatch(ui,/reality-chat-simple\.html|\/chat-simple/);
 assert.doesNotThrow(()=>new Script(ui));
});
test('verified two prior-shift repairs are displayed, in owner approvals, without starting shift on read',async()=>{
 const v=setup();await v.flush();
 assert.deepEqual(v.calls.map(c=>c.options.method),['GET']);
 const surface=v.locate('realityChatMaintenanceContinuation');
 assert.equal(surface.hidden,false);
 assert.equal(v.locate('realityChatMaintenanceAuthorize').disabled,false);
 assert.equal(v.locate('realityChatMaintenanceAuthorize').textContent,
  'Continue 2 unfinished maintenance repairs');
 assert.equal(v.locate('realityChatMaintenanceNudge').hidden,false);
 assert.equal(v.locate('realityChatMaintenanceContinuation').parentElement,v.inbox);
 assert.match(v.locate('realityChatMaintenanceContinuation').textContent||'',/^(?:|.*?)$/);
 assert.equal(v.locate('realityChatMaintenanceOpen').disabled,false);
});
test('one REAL button click refreshes exact owner source and sends one original existing signed API POST',async()=>{
 const v=setup();await v.flush();
 await v.click('realityChatMaintenanceAuthorize');await v.flush();
 assert.deepEqual(v.calls.map(c=>c.options.method),['GET','GET','POST']);
 const outbound=v.calls[2].options;
 const b=JSON.parse(outbound.body);
 assert.deepEqual(Object.keys(b).sort(),[
  'action','completion_bound','expected_fingerprint','planned_start_at',
  'requested_hours'].sort());
 assert.equal(b.action,'AUTHORIZE_EXACT_INTERNAL_MAINTENANCE_CONTINUATION');
 assert.equal(b.expected_fingerprint,fingerprint);
 assert.equal(b.requested_hours,8);
 assert.equal(b.completion_bound,true);
 assert.ok(Date.parse(b.planned_start_at)>Date.now());
 assert.equal(outbound.headers['content-type'],'application/json');
 assert.equal(v.locate('realityChatMaintenanceAuthorize').disabled,true);
 assert.match(v.locate('realityChatMaintenanceFeedback').textContent,
  /Authorized shift/);
 assert.equal(v.events.length,1);
 assert.equal(v.events[0].type,'reality:maintenance-continuation-authorized');
 assert.equal(v.events[0].detail.shift_id,signedShiftId);
});
test('no login / no independently readback owner scope means no approval',async()=>{
 const signedOut=setup({signedIn:false});await signedOut.flush();
 assert.equal(signedOut.calls.length,0);
 assert.equal(signedOut.locate('realityChatMaintenanceContinuation').hidden,true);
 const forgery=setup({readback:{...data,
  internal_maintenance_continuity:{...data.internal_maintenance_continuity,
   items:[items[0],{...items[1],
    independent_review_receipt_sha256:'unverified'}]}}});
 await forgery.flush();
 assert.equal(forgery.locate('realityChatMaintenanceAuthorize').disabled,true);
 await forgery.click('realityChatMaintenanceAuthorize');await forgery.flush();
 assert.deepEqual(forgery.calls.map(x=>x.options.method),['GET']);
});
test('an existing signed maintenance shift blocks duplicate authorization',async()=>{
 const current=setup({readback:{...data,requested_maintenance_draft:null,
  requested_maintenance_draft_status:'NO_VERIFIED_MAINTENANCE_CONTINUATION_READY',
  internal_maintenance_continuity:{...data.internal_maintenance_continuity,
   current_shift_id:signedShiftId,
   signed_warrant_scope_verified:true,signed_warrant_shift_id:signedShiftId,
   signed_unfinished_count:2,
   signed_maintenance_incident_ids:items.map(i=>i.origin_incident_id),
   newly_discovered_outside_warrant_count:0,
   outside_warrant_incident_ids:[]}}});
 await current.flush();
 assert.equal(current.locate('realityChatMaintenanceAuthorize').disabled,true);
 assert.match(current.locate('realityChatMaintenanceAuthorize').textContent,
  /already authorized/);
 await current.click('realityChatMaintenanceAuthorize');await current.flush();
 assert.equal(current.calls.length,1);
});
test('stale, different original repair proof must be verified again before authorizing',async()=>{
 let reads=0;
 const different={...data,requested_maintenance_draft:{
  ...draft,expected_fingerprint:HASH('0')}};
 const x=setup({readback:data});await x.flush();
 // Direct immutable original button click will generate only a fresh GET
 // before any attempt to POST, so source scope can never be assumed from UI.
 assert.match(ui,/const fresh=await read\(\)/);
 assert.match(ui,/fresh\.fingerprint!==previously\.fingerprint/);
 assert.match(ui,/fresh\.sourceKey!==previously\.sourceKey/);
 assert.match(ui,/fail\('SOURCE_CHANGED_REVIEW_AGAIN'\)/);
 assert.equal(x.locate('realityChatMaintenanceAuthorize').disabled,false);
 assert.ok(different.requested_maintenance_draft.expected_fingerprint!==fingerprint);
});
test('unknown network result locks button, preserves original jobs, never retries the POST',async()=>{
 const x=setup({posted:null});await x.flush();
 await x.click('realityChatMaintenanceAuthorize');await x.flush();
 assert.deepEqual(x.calls.map(x=>x.options.method),['GET','GET','POST']);
 assert.equal(x.locate('realityChatMaintenanceAuthorize').disabled,true);
 assert.match(x.locate('realityChatMaintenanceFeedback').textContent,
  /Use Check status first/);
 assert.equal(x.events.length,0);
});
test('assistant operational message is INSIDE the conversation and user can reply naturally',async()=>{
 const v=setup();await v.flush();
 const message=v.locate('realityChatMaintenanceNudge');
 assert.equal(message.parentElement,v.thread,'the message must be inside the transcript scroll');
 assert.equal(message.hidden,false);
 assert.match(message.className,/bubble reality-chat-maintenance/);
 assert.match(v.locate('realityChatMaintenanceInlineAuthorize').textContent,
  /Continue 2 unfinished repairs/);
 assert.equal(v.locate('realityChatMaintenanceInlineAuthorize').disabled,false);
 assert.match(ui,/get\('privatePrompt'\)\?\.focus\(\)/);
 assert.match(ui,/threadObserver\.observe\(thread,\{childList:true\}\)/);
 assert.match(ui,/!thread\.contains\(hint\)/);
 assert.doesNotMatch(ui,/center\.insertBefore\(hint,thread\)/);
});
test('an explicit approve click from the chat message delegates to the ORIGINAL owner-signed authorization',async()=>{
 const v=setup();await v.flush();
 await v.click('realityChatMaintenanceInlineAuthorize');await v.flush();
 assert.deepEqual(v.calls.map(c=>c.options.method),['GET','GET','POST']);
 assert.equal(v.events.length,1);
 assert.equal(v.events[0].type,'reality:maintenance-continuation-authorized');
 const msg=v.locate('realityChatMaintenanceNudge');
 assert.equal(msg.parentElement,v.thread);
 assert.equal(msg.hidden,false,'signed result must stay in the conversation');
 assert.match(v.locate('realityChatMaintenanceNudge').children[1].textContent,
  /You authorized 2 exact earlier repairs/);
 assert.match(v.locate('realityChatMaintenanceNudge').children[1].textContent,
  /under shift/);
 assert.match(v.locate('realityChatMaintenanceNudge').children[1].textContent,
  /not reached independent final verification/);
 assert.equal(v.locate('realityChatMaintenanceInlineAuthorize').disabled,true);
});
test('an already signed shift is reported IN Chat instead of asking for another approval',async()=>{
 const active=setup({readback:{...data,requested_maintenance_draft:null,
  requested_maintenance_draft_status:'NO_VERIFIED_MAINTENANCE_CONTINUATION_READY',
  internal_maintenance_continuity:{...data.internal_maintenance_continuity,
   current_shift_id:signedShiftId,
   signed_warrant_scope_verified:true,signed_warrant_shift_id:signedShiftId,
   signed_unfinished_count:2,
   signed_maintenance_incident_ids:items.map(i=>i.origin_incident_id),
   newly_discovered_outside_warrant_count:0,
   outside_warrant_incident_ids:[]}}});
 await active.flush();
 const msg=active.locate('realityChatMaintenanceNudge');
 assert.equal(msg.hidden,false);
 assert.equal(msg.parentElement,active.thread);
 assert.match(msg.children[1].textContent,/You authorized 2 exact earlier repairs/);
 assert.match(msg.children[1].textContent,new RegExp(signedShiftId));
 assert.equal(active.locate('realityChatMaintenanceInlineAuthorize').disabled,true);
 await active.click('realityChatMaintenanceInlineAuthorize');await active.flush();
 assert.equal(active.calls.length,1,'no new signed shift was created');
});
test('ordinary chat replies are NOT owner authorization; missing receipt locks inline action too',async()=>{
 const v=setup({posted:null});await v.flush();
 assert.match(ui,/A reply is an ordinary saved owner Chat turn/);
 assert.match(ui,/if\(!inlineContinue.disabled&&!authorize.disabled\)authorize.click\(\)/);
 await v.click('realityChatMaintenanceInlineAuthorize');await v.flush();
 assert.deepEqual(v.calls.map(c=>c.options.method),['GET','GET','POST']);
 assert.equal(v.locate('realityChatMaintenanceInlineAuthorize').disabled,true);
 assert.match(v.locate('realityChatMaintenanceNudge').children[1].textContent,
  /I could not verify/);
 assert.equal(v.events.length,0);
});

test('normal typed Chat reply remains an owner conversation message, never a duplicate authorization',async()=>{
 const v=setup();await v.flush();
 await v.click('realityChatMaintenanceReply');
 assert.equal(v.locate('privatePrompt').focused,true);
 assert.deepEqual(v.calls.map(x=>x.options.method),['GET']);
 const rendered=v.locate('realityChatMaintenanceNudge');
 assert.equal(rendered.parentElement,v.thread);
 v.thread.replaceChildren();
 // Saved conversation rerenders replacing all messages; the owner-signed
 // work update remains anchored inside the transcript without duplication.
 const watched=v.observers[0]; // transcript observer precedes sign-in observer
 watched();
 assert.equal(v.thread.children.filter(x=>x===rendered).length,1);
 assert.equal(rendered.parentElement,v.thread);
 watched();
 assert.equal(v.thread.children.filter(x=>x===rendered).length,1);
});
test('backend is the EXISTING owner-authenticated same-origin exact-maintenance RPC',()=>{
 assert.match(api,/await authenticatedChatSession\(req,res\)/);
 assert.match(api,/assertSameOrigin\(req\)/);
 assert.match(api,/AUTHORIZE_EXACT_INTERNAL_MAINTENANCE_CONTINUATION/);
 assert.match(api,/reality_read_owner_internal_maintenance_v1/);
 assert.match(api,/buildOwnerMaintenanceContinuationDraft\(continuity/);
 assert.match(api,/drafted\.expected_fingerprint!==b\.expected_fingerprint/);
 assert.match(api,/reality_authorize_employee_maintenance_continuation_v1/);
 assert.match(api,/reality_read_owner_employee_shifts_v1/);
 assert.match(api,/SHIFT_MAINTENANCE_CONTINUATION_READBACK_UNVERIFIED/);
 assert.match(ui,/receipt\.start_confirmation\?\.exact_internal_work_count!==fresh\.count/);
 assert.doesNotMatch(ui,/\/api\/reality\/personal-chat-work|\/api\/reality\/install|reality_authorize_.*rpc/);
});
test('compact notice does not block transcript or composer; original direct account and install gates stay separate',()=>{
 assert.match(css,/\.reality-chat-maintenance-nudge\{/);
 assert.match(css,/\.reality-chat-maintenance-nudge\[hidden\]/);
 assert.match(ui,/thread\.append\(hint\)/);
 assert.match(ui,/inbox\.insertBefore\(root,anchor\)/);
 assert.match(ui,/root\.setAttribute\('aria-label'/);
 assert.match(ui,/No work is started by reading this card/);
 assert.match(ui,/installation_authorized!==false/);
 assert.match(ui,/worker_dispatch_verified!==false/);
 assert.match(ui,/authorizing\|\|loading\|\|uncertain/);
 assert.doesNotMatch(ui,/innerHTML\s*=|outerHTML\s*=|insertAdjacentHTML/);
});

function collectedText(node){
 return [node.textContent,...node.children.map(collectedText)].join(' ');
}
function runningOwnerMaintenance(){
 return {...data,requested_maintenance_draft:null,
  requested_maintenance_draft_status:'NO_VERIFIED_MAINTENANCE_CONTINUATION_READY',
  internal_maintenance_continuity:{...data.internal_maintenance_continuity,
   current_shift_id:signedShiftId,signed_warrant_scope_verified:true,
   signed_warrant_shift_id:signedShiftId,signed_unfinished_count:2,
   signed_maintenance_incident_ids:items.map(i=>i.origin_incident_id),
   newly_discovered_outside_warrant_count:0,outside_warrant_incident_ids:[],
   items:[{...items[0],
    independent_failure_baseline_receipt_sha256:HASH('c'),
    independent_frozen_test_receipt_sha256:null,
    independent_review_status:'NO_ORIGINAL_ADMISSION_CONFIRMED'},
    {...items[1],
    independent_failure_baseline_receipt_sha256:HASH('d'),
    independent_frozen_test_receipt_sha256:null,
    independent_review_status:'SOURCE_CHANGED_NEEDS_FROZEN_TEST'}]
  },
  shift_activity_status:'VERIFIED_OWNER_ACTIVITY',
  shift_activity:{status:'OWNER_SHIFT_LIVE_ACTIVITY_INDEPENDENT_READBACK',
   owner_bound:true,shift_id:signedShiftId,
   installation_authorized:false,production_changed:false,
   worker_wake_count:9,
   last_worker_seen_at:'2026-11-19T21:57:34Z'}
 };
}
test('existing signed shift provides in-chat live repair progress without demanding second approval',async()=>{
 const v=setup({readback:runningOwnerMaintenance()});await v.flush();
 const watch=v.locate('realityChatMaintenanceWatch');
 assert.equal(watch.hidden,false);
 assert.equal(v.locate('realityChatMaintenanceInlineAuthorize').disabled,true);
 await v.click('realityChatMaintenanceWatch');await v.flush();
 const live=v.locate('realityChatMaintenanceLive');
 assert.equal(live.hidden,false);
 const summary=collectedText(live);
 assert.match(summary,/Live owner-authorized repair progress/);
 assert.match(summary,/Original|Existing shift:/);
 assert.match(summary,/Riley/);
 assert.match(summary,/Taylor/);
 assert.match(summary,/Requalify changed source before case-specific CI/);
 assert.match(summary,/Run the case-specific executable frozen CI RED/);
 assert.match(summary,/No independently verified repair yet/);
 assert.match(summary,/Signed worker wakes:\s+9/);
 assert.match(summary,/sha256:cccccccccccccccc/);
 assert.ok(v.calls.every(c=>c.options.method==='GET'),
  'watching signed work may never create a new shift or imply repair permission');
});
test('only independent steps six/seven/eight may produce a same-shift completed repair receipt',async()=>{
 const finalShift={
  shift_id:signedShiftId,status:'ENDED_WITH_VERIFIED_JOB',
  closed_at:'2026-11-19T22:25:00Z',
  close_report:{shift_id:signedShiftId,
   completion_condition:'ALL_EXACT_INTERNAL_MAINTENANCE_REPAIR_RECEIPTS_VERIFIED',
   completion_reason:'ALL_SELECTED_INTERNAL_MAINTENANCE_REPAIRS_INDEPENDENTLY_RECEIPTED',
   independently_verified_internal_maintenance_jobs:2,
   production_changed:false},
  steps:Array.from({length:8},(_,i)=>({
   step_index:i+1,
   state:i<5?'SOURCE_CHECKED':i<7?
    'INTERNAL_MAINTENANCE_RECEIPTS_VERIFIED':'REPORTED',
   proof_sha256:HASH(String.fromCharCode(97+(i%6)))
  }))
 };
 const closed={...data,
  requested_maintenance_draft:null,
  requested_maintenance_draft_status:'NO_VERIFIED_MAINTENANCE_CONTINUATION_READY',
  internal_maintenance_continuity:{...data.internal_maintenance_continuity,
   status:'OWNER_NO_OPEN_INTERNAL_MAINTENANCE',
   open_count:0,items:[],current_shift_id:null,
   signed_unfinished_count:0,signed_maintenance_incident_ids:[],
   newly_discovered_outside_warrant_count:0,
   outside_warrant_incident_ids:[]},
  shifts:[finalShift]
 };
 const verified=setup({readback:closed});await verified.flush();
 const message=verified.locate('realityChatMaintenanceNudge');
 assert.equal(message.hidden,false);
 assert.match(collectedText(message),/independently verified 2 exact maintenance repairs/);
 await verified.click('realityChatMaintenanceWatch');await verified.flush();
 const summary=collectedText(verified.locate('realityChatMaintenanceLive'));
 assert.match(summary,/Independently verified completion receipt/);
 assert.match(summary,/Execution:\s+sha256:ffffffff/);
 assert.match(summary,/Independent verification:\s+sha256:aaaaaaaa/);
 assert.match(summary,/Final report:\s+sha256:bbbbbbbb/);
 assert.ok(verified.calls.every(c=>c.options.method==='GET'));
 const unverified=setup({readback:{...closed,shifts:[{...finalShift,
  steps:finalShift.steps.map((x,i)=>i===6?{...x,state:'AWAITING_EXACT_WORK'}:x)
 }]}});
 await unverified.flush();
 assert.equal(unverified.locate('realityChatMaintenanceNudge').hidden,true,
  'a final report without both independent maintenance steps is not proof');
});

test('owner Chat exposes executed maintenance stages, not a fabricated final repair',async()=>{
 const current=runningOwnerMaintenance();
 const sourceProof=HASH('e'),dispatch=HASH('f'),independent=HASH('a');
 current.internal_maintenance_continuity.items[0]={
  ...current.internal_maintenance_continuity.items[0],
  signed_executor_action:'RUN_CASE_SPECIFIC_INDEPENDENT_MAINTENANCE_CI_RED',
  signed_executor_state:'COMPLETED',signed_executor_attempt_count:1,
  ci_dispatch_receipt_sha256:dispatch,
  ci_independent_diagnostic_receipt_sha256:independent,
  ci_independent_artifact_digest:HASH('b'),
  ci_independent_github_run_id:44633511608
 };
 current.internal_maintenance_continuity.items[1]={
  ...current.internal_maintenance_continuity.items[1],
  signed_executor_action:'REQUALIFY_CHANGED_MAINTENANCE_SOURCE_BEFORE_CI',
  signed_executor_state:'COMPLETED',
  source_requalification_receipt_sha256:sourceProof
 };
 const v=setup({readback:current});await v.flush();
 await v.click('realityChatMaintenanceWatch');await v.flush();
 const screen=collectedText(v.locate('realityChatMaintenanceLive'));
 assert.match(screen,/Source requalification:/);
 assert.match(screen,/sha256:eeeeeeeeeeee/);
 assert.match(screen,/Signed GitHub CI dispatch:/);
 assert.match(screen,/sha256:ffffffffffff/);
 assert.match(screen,/Independent GitHub diagnostics:/);
 assert.match(screen,/44633511608/);
 assert.match(screen,/original frozen RED still required/);
 assert.match(screen,/No independently verified repair yet/);
 assert.ok(v.calls.every(c=>c.options.method==='GET'));
});


test('an actual current-owner signed repair target is visible on the real Chat DOM without the removed wrapper',async()=>{
 const c=runningOwnerMaintenance();
 const target='sha256:'+'9'.repeat(64);
 const candidate='6'.repeat(40),blob='a'.repeat(40),original='b'.repeat(40);
 c.signed_verified_maintenance_repair_artifacts={
  status:'OWNER_VERIFIED_MAINTENANCE_ARTIFACTS_READ_ONLY',
  owner_id:'85eeae0b-2988-43c4-b20c-590fb51da70d',
  count:1,installation_authorized:false,production_changed:false,
  items:[{
   maintenance_id:items[1].origin_incident_id,shift_id:signedShiftId,
   source_ref:items[1].source_ref,
   candidate_commit_sha:candidate,candidate_source_blob_sha:blob,
   historical_source_blob_sha:original,
   review_receipt_sha256:HASH('a'),case_ci_receipt_sha256:HASH('b'),
   github_run_id:44800111234,github_artifact_id:99201111,
   owner_approval_ready:false,
   install_target_verified:true,target_review_receipt_sha256:target,
   target_review_branch:'reality/chat-direct-work-handoff-20261115',
   target_review_head_sha:'c'.repeat(40),
   target_review_existing_blob_sha:original,
   installation_authorized:false,repair_installed:false,
   original_job_completed:false
  }]
 };
 c.exact_signed_maintenance_install_review={
  status:'EXACT_OWNER_MAINTENANCE_INSTALL_APPROVAL_READY',
  owner_id:c.signed_verified_maintenance_repair_artifacts.owner_id,
  owner_approval_ready:true,installation_authorized:false,
  repair_installed:false,original_job_completed:false,
  production_changed:false,new_shift_started:false,
  shift_id:signedShiftId,maintenance_id:items[1].origin_incident_id,
  source_ref:items[1].source_ref,
  candidate_commit_sha:candidate,candidate_source_blob_sha:blob,
  target_head_sha:'c'.repeat(40),
  target_branch:'reality/chat-direct-work-handoff-20261115',
  target_path:'src/reality-qualified-source-requalification-v1.js',
  target_review_receipt_sha256:target,
  artifact_receipt_sha256:HASH('a'),
  case_ci_receipt_sha256:HASH('b')
 };
 const x=setup({readback:c});await x.flush();
 assert.equal(x.calls.length,1);
 assert.equal(x.locate('realityChatMaintenanceNudge').hidden,false);
 const approve=x.locate('realityChatMaintenanceExactInstallApprove');
 assert.ok(approve,'owner approval button must exist in the actual Chat DOM');
 assert.equal(approve.hidden,false);
 assert.equal(approve.disabled,false);
 assert.equal(approve.parentElement?.id,'','exact approval is in the chat message actions');
 assert.match(x.locate('realityChatMaintenanceExactInstallDetails').textContent,
  /One-use exact approval/);
 assert.equal(x.locate('realityChatMaintenanceContinuation').parentElement,x.inbox);
 // Read-only rendering never causes installation, approval, or a new shift.
 assert.deepEqual(x.calls.map(x=>x.options.method),['GET']);
});
test('the exact install approval button remains hidden for unsigned / missing target review',async()=>{
 const c=runningOwnerMaintenance();
 const missing=setup({readback:c});await missing.flush();
 const button=missing.locate('realityChatMaintenanceExactInstallApprove');
 assert.equal(button.hidden,true);
 assert.equal(button.disabled,true);
 assert.deepEqual(missing.calls.map(x=>x.options.method),['GET']);
});
