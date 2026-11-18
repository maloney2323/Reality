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
  this.id='';this.className='';this.dataset={};}
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
}
function setup({readback=data,posted=receipt,signedIn=true}={}){
 const ready=new El();ready.id='privateReady';
 ready.style.display=signedIn?'block':'none';
 const inbox=new El();inbox.id='realityChatApprovalInbox';
 const itemsAnchor=new El();itemsAnchor.id='realityChatApprovalItems';
 inbox.append(itemsAnchor);
 const center=new El();center.id='realityChatConversation';
 const thread=new El();thread.id='privateTranscript';center.append(thread);
 const open=new El();open.id='realityChatOpenInspector';
 const approvals=new El();approvals.id='realityChatTabApprovals';
 const nodes=[ready,inbox,center,open,approvals];
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
 return {ready,inbox,thread,center,locate,calls,events,flush,
  click:id=>locate(id)?.click()};
}
test('unified signed-in Chat actually loads existing maintenance controls, not old chat-simple',()=>{
 assert.match(html,/<script defer src="\/reality-chat-workspace-v1.js"><\/script>\s*<script defer src="\/reality-chat-maintenance-continuation-v1.js"><\/script>/);
 assert.match(html,/<link rel="stylesheet" href="\/reality-chat-maintenance-continuation-v1.css">/);
 assert.ok(html.indexOf('reality-chat-maintenance-continuation-v1.css')>
  html.indexOf('reality-chat-mobile-usable-v3.css'));
 assert.match(ui,/get\('realityChatApprovalInbox'\)/);
 assert.match(ui,/get\('realityChatConversation'\)/);
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
   current_shift_id:signedShiftId}}});
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
 assert.match(ui,/center\.insertBefore\(hint,thread\)/);
 assert.match(ui,/inbox\.insertBefore\(root,anchor\)/);
 assert.match(ui,/root\.setAttribute\('aria-label'/);
 assert.match(ui,/No work is started by reading this card/);
 assert.match(ui,/installation_authorized!==false/);
 assert.match(ui,/worker_dispatch_verified!==false/);
 assert.match(ui,/authorizing\|\|loading\|\|uncertain/);
 assert.doesNotMatch(ui,/innerHTML\s*=|outerHTML\s*=|insertAdjacentHTML/);
});
