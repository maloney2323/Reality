import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CHAT_WORK_CAPABILITIES,isExplicitSignedShiftContinuation,
 continueSignedExistingEmployeeShift,processSignedSavedChatWork}
 from '../src/reality-saved-chat-work-adapter-v1.js';

const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const conversationId='a8c800f6-6848-492c-b6aa-e8deca0db3fe';
const requestId='3a2978fc-3188-44ec-a75c-a51e201a8e5a';
const messageId='71e01bbd-5a5a-4b8c-869f-247478e82ac1';
const sourceRef='supabase:reality_chat_messages:'+messageId;
const shiftId='ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce';
const url='https://hvkfreoagbrphwghjajw.supabase.co';
const session={user_id:owner,config:{url}};
const env={VERCEL_ENV:'preview',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'hvkfreoagbrphwghjajw'};
const db={strictSecrets:true,project:env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF,url};
const message='Reality, continue the existing authorized shift.';
const args={session,conversationId,requestId,
 messages:[{request_id:requestId,role:'user',source_ref:sourceRef,text:message}]};
const verifiedReceipt=(status='CHAT_EXISTING_SHIFT_WAKE_ENQUEUED')=>({
 status,owner_id:owner,shift_id:shiftId,request_id:requestId,
 source_ref:sourceRef,network_request_id:19625,
 installation_authorized:false,production_changed:false,
 original_job_completed:false,new_shift_started:false,
 worker_execution_verified:false
});

test('signed existing-shift Chat continuation is a registered adapter and requires explicit command',()=>{
 assert.ok(CHAT_WORK_CAPABILITIES.some(x=>
  x.id==='governed-existing-shift-continuation'&&
  x.authorizes_installation===false));
 assert.equal(isExplicitSignedShiftContinuation(message),true);
 assert.equal(isExplicitSignedShiftContinuation('Please resume the original work'),true);
 assert.equal(isExplicitSignedShiftContinuation('Continue the shift'),true);
 for(const unsafe of [
  'I am curious how the shift works',
  'Okay, I approve the installation',
  'Continue the shift and install the production package',
  'Do we need an adapter?',
  'Install the exact tested package now',
  'Please start a brand new shift'
 ])assert.equal(isExplicitSignedShiftContinuation(unsafe),false,unsafe);
});
test('real authenticated saved turn selects the existing service-only wake without model or new shift',async()=>{
 const calls=[];
 const result=await continueSignedExistingEmployeeShift({...args,env,
  dbFactory:()=>db,
  callRpc:async(_db,rpc,payload)=>{calls.push({rpc,payload});return verifiedReceipt();}
 });
 assert.deepEqual(calls,[{
  rpc:'reality_dispatch_existing_chat_maintenance_shift_v1',
  payload:{p_owner_id:owner,p_conversation_id:conversationId,p_request_id:requestId}
 }]);
 assert.equal(result.status,'CHAT_EXISTING_SHIFT_WAKE_ENQUEUED');
 assert.equal(result.shift_id,shiftId);
 assert.equal(result.network_request_id,19625);
 assert.equal(result.wake_enqueued,true);
 assert.equal(result.worker_execution_verified,false);
 assert.equal(result.execution_started,false);
 assert.equal(result.original_job_completed,false);
 assert.equal(result.installation_authorized,false);
 assert.equal(result.production_changed,false);
 assert.equal(result.new_shift_started,false);
});
test('repeat saved Chat delivery returns same network receipt instead of a second wake',async()=>{
 const result=await continueSignedExistingEmployeeShift({...args,env,
  dbFactory:()=>db,callRpc:async()=>verifiedReceipt(
   'CHAT_EXISTING_SHIFT_WAKE_ALREADY_QUEUED')});
 assert.equal(result.status,'CHAT_EXISTING_SHIFT_WAKE_ALREADY_QUEUED');
 assert.equal(result.network_request_id,19625);
 assert.equal(result.wake_enqueued,true);
});
test('direct saved-work route does not consult the model or admit new development for exact shift continuation',async()=>{
 let calls=0;
 const result=await processSignedSavedChatWork({...args,
  inspect:async()=>{throw Error('MODEL_OR_NEW_DEV_MUST_NOT_RUN');},
  continueExistingShift:async(input)=>{
   calls++;assert.equal(input.requestId,requestId);
   return verifiedReceipt();
  }
 });
 assert.equal(result.status,'CHAT_EXISTING_SHIFT_WAKE_ENQUEUED');
 assert.equal(calls,1);
});
test('signed owner, project, preview and immutable source are required',async()=>{
 await assert.rejects(()=>continueSignedExistingEmployeeShift({...args,
  env:{...env,VERCEL_ENV:'production'},dbFactory:()=>db,
  callRpc:async()=>verifiedReceipt()}),/CHAT_WORK_EXISTING_SHIFT_PREVIEW_ONLY/);
 await assert.rejects(()=>continueSignedExistingEmployeeShift({...args,
  messages:[{...args.messages[0],source_ref:'invalid'}],
  env,dbFactory:()=>db,callRpc:async()=>verifiedReceipt()}),
  /CHAT_WORK_SIGNED_USER_TURN_REQUIRED/);
 await assert.rejects(()=>continueSignedExistingEmployeeShift({...args,
  env,dbFactory:()=>({...db,project:'wrong'}),
  callRpc:async()=>verifiedReceipt()}),/CHAT_WORK_EXISTING_SHIFT_OWNER_DATABASE_REQUIRED/);
 await assert.rejects(()=>continueSignedExistingEmployeeShift({...args,
  env,dbFactory:()=>db,callRpc:async()=>({
   ...verifiedReceipt(),installation_authorized:true})}),
  /CHAT_WORK_EXISTING_SHIFT_WAKE_RECEIPT_UNVERIFIED/);
 await assert.rejects(()=>continueSignedExistingEmployeeShift({...args,
  env,dbFactory:()=>db,callRpc:async()=>({
   ...verifiedReceipt(),network_request_id:null})}),
  /CHAT_WORK_EXISTING_SHIFT_WAKE_RECEIPT_UNVERIFIED/);
});
test('transport is an idempotent signed service-only adaptation, never an installation or invented success',()=>{
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261120022000_owner_chat_existing_shift_wake_adapter_v1.sql',
  import.meta.url),'utf8');
 assert.match(sql,/current_user<>'service_role'/);
 assert.match(sql,/public\.reality_chat_messages m/);
 assert.match(sql,/m\.request_id=p_request_id and m\.role='user'/);
 assert.match(sql,/UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS/);
 assert.match(sql,/m\.independent_review_receipt_sha256/);
 assert.match(sql,/m\.original_job_completed=false and m\.production_changed=false/);
 assert.match(sql,/on conflict do nothing returning owner_id into v_created/);
 assert.match(sql,/from cron\.job j/);
 assert.match(sql,/net\.http_post/);
 assert.match(sql,/revoke all on function public\.reality_dispatch_existing_chat_maintenance_shift_v1/);
 assert.doesNotMatch(sql,/insert into reality_internal\.governed_employee_shifts_v1/);
 assert.doesNotMatch(sql,/set installation_authorized=true/);
 const ui=readFileSync(new URL('../reality-chat-direct-work-handoff-v1.js',
  import.meta.url),'utf8');
 assert.match(ui,/CHAT_EXISTING_SHIFT_WAKE_ENQUEUED/);
 assert.match(ui,/No new shift, approval, installation or completed job was inferred/);
 const api=readFileSync(new URL('../api/reality/personal-chat-work.js',
  import.meta.url),'utf8');
 assert.match(api,/CHAT_EXISTING_SHIFT_WAKE_ENQUEUED/);
 const rpc=readFileSync(new URL('../src/reality-governed-shift-boundary-v1.js',
  import.meta.url),'utf8');
 assert.match(rpc,/dispatch_existing_chat_maintenance_shift_v1/);
});
