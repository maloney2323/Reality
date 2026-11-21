import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const script=readFileSync(new URL('../reality-chat-existing-shift-status-v1.js',import.meta.url),'utf8');
const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const conversation='760411e8-dceb-40fb-9849-eacf71532441';
const request='d10cd67b-3e73-4e85-9794-d8509c9fcc36';
const source='supabase:reality_chat_messages:141988fd-8e87-4600-81be-47f764406e6a';
const shift='ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce';
const receipt={ok:true,status:'OWNER_LATEST_SIGNED_SHIFT_CHAT_WAKE_VERIFIED',
 owner_id:owner,conversation_id:conversation,request_id:request,
 source_ref:source,shift_id:shift,network_request_id:19637,
 shift_status:'AWAITING_EXACT_ORIGINAL_WORK',
 last_worker_safe_result:'SIGNED_MAINTENANCE_AUTHORIZED_CASE_SPECIFIC_FROZEN_RED_REQUIRED',
 wake_count:396,wake_enqueued:true,
 worker_execution_verified_for_this_request:false,
 installation_authorized:false,original_job_completed:false,
 production_changed:false,new_shift_started:false};

function harness(payload=receipt,httpStatus=200){
 const callbacks={};
 const el=()=>({
  hidden:false,style:{},children:[],parentElement:null,setAttribute(){},
  append(...children){for(const c of children){this.children.push(c);c.parentElement=this}},
  contains(node){return this===node||this.children.some(c=>c.contains?.(node))},
  remove(){const p=this.parentElement;if(!p)return;
   p.children=p.children.filter(c=>c!==this);this.parentElement=null},
  addEventListener(){},
  scrollIntoView(){}
 });
 const composer=el(),transcript=el(),document={
  readyState:'complete',
  createElement:el,
  getElementById:id=>id==='realityChatComposer'?composer:
   id==='privateTranscript'?transcript:null,
  addEventListener(){}
 };
 const store=new Map();
 const window={addEventListener(name,fn){callbacks[name]=fn},
  sessionStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},
  realityActiveConversationId:()=>conversation};
 const calls=[];
 const fetch=async (url,opts)=>{
  calls.push({url,opts});return {
   status:httpStatus,ok:httpStatus===200,
   json:async()=>payload
  };
 };
 runInNewContext(script,{document,window,
  location:{pathname:'/chat'},localStorage:{setItem(){}},
  fetch,AbortSignal,console,
  MutationObserver:class{observe(){}disconnect(){}}
 });
 return {composer,transcript,callbacks,calls};
}
const settle=async()=>{for(let i=0;i<5;i++)await new Promise(resolve=>setImmediate(resolve))};

test('signed wake is a scrollable chat receipt, not a fixed composer obstruction',async()=>{
 const x=harness();
 await settle();
 assert.equal(x.calls.length,1);
 assert.equal(x.calls[0].url,'/api/reality/personal-chat-existing-shift-status');
 assert.equal(x.calls[0].opts.method,'GET');
 assert.equal(x.composer.children.length,0);
 const panel=x.transcript.children[0];
 assert.equal(panel.id,'realityChatExistingShiftHandoff');
 assert.equal(panel.hidden,false);
 assert.match(panel.children[0].children[0].textContent,/EXISTING SHIFT HANDOFF VERIFIED/);
 assert.equal(panel.children[0].children[1].textContent,'×');
 assert.match(panel.children[1].textContent,/19637/);
 assert.match(panel.children[2].textContent,/independent case-specific failure tests/);
 assert.doesNotMatch(panel.children[1].textContent,/job completed/i);
});

test('unsupported or authority-inflated receipt cannot be displayed as verified',async()=>{
 const x=harness({...receipt,original_job_completed:true});
 await settle();
 assert.equal(x.transcript.children.length,0);
 assert.equal(x.composer.children.length,0);
});

test('no saved owner wake stays quiet instead of inventing a receipt',async()=>{
 const x=harness({ok:true,status:'NO_OWNER_ACTIVE_SIGNED_SHIFT_CHAT_WAKE'});
 await settle();
 assert.equal(x.transcript.children.length,0);
 assert.equal(x.composer.children.length,0);
});

test('read-only status endpoint remains independent of selected saved conversation',()=>{
 const api=readFileSync(new URL(
  '../api/reality/personal-chat-existing-shift-status.js',import.meta.url),'utf8');
 assert.match(api,/reality_read_owner_latest_signed_chat_shift_receipt_v1/);
 assert.match(api,/method!=='GET'/);
 assert.match(api,/authenticatedChatSession/);
 assert.doesNotMatch(api,/net\.http_post|reality_dispatch_existing_chat_maintenance_shift_v1/);
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261120031000_owner_latest_signed_chat_shift_receipt_v1.sql',
  import.meta.url),'utf8');
 assert.match(sql,/current_user<>'service_role'/);
 assert.match(sql,/public\.reality_chat_messages m/);
 assert.match(sql,/w\.chat_source_ref='supabase:reality_chat_messages:'/);
 assert.match(sql,/warrant\.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'/);
 assert.match(sql,/revoke all on function/);
 assert.doesNotMatch(sql,/net\.http_post|insert into|update reality_internal/);
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/defer src="\/reality-chat-existing-shift-status-v1\.js"/);
});
