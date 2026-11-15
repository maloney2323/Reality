import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {processSignedSavedChatWork}
 from '../src/reality-saved-chat-work-adapter-v1.js';

const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const conversationId='a8c800f6-6848-492c-b6aa-e8deca0db3fe';
const requestId='3a2978fc-3188-44ec-a75c-a51e201a8e5a';
const messageId='71e01bbd-5a5a-4b8c-869f-247478e82ac1';
const source_ref='supabase:reality_chat_messages:'+messageId;
const workId='work:'+'a'.repeat(32);
const session={user_id:owner};
const messages=[{role:'user',request_id:requestId,source_ref,
 text:'Reality, build the exact signed Chat-to-work handoff in an isolated candidate.'}];
const args={session,conversationId,requestId,messages};
const eligible=(status,capability_id,action_eligible=true)=>({
 status,capability_id,action_eligible,source_ref,request_id:requestId,
 installation_authorized:false,production_changed:false
});
const persisted={status:'CHAT_WORK_NEW_DEVELOPMENT_DURABLY_ADMITTED',
 source_ref,request_id:requestId,original_work_id:workId,
 development_phase:'QUEUED',installation_authorized:false,
 production_changed:false,new_shift_started:false};
const readback={status:'OWNER_CHAT_NEW_DEVELOPMENT_READBACK',
 owner_id:owner,conversation_id:conversationId,installation_authorized:false,
 production_changed:false,items:[{request_id:requestId,source_ref,
 original_work_id:workId,phase:'QUEUED',installation_authorized:false,
 production_changed:false}]};

test('direct signed Chat work admission classifies once and independently reads back same work identity',async()=>{
 let classified=0,admitted=0,read=0;
 const receipt=await processSignedSavedChatWork({...args,
  inspect:async()=>{classified++;return eligible(
   'CHAT_WORK_NEW_DEVELOPMENT_ELIGIBLE','governed-chat-new-development')},
  admitNew:async input=>{
   admitted++;
   assert.equal((await input.inspect()).capability_id,'governed-chat-new-development');
   return persisted;
  },
  readNew:async()=>{read++;return readback}
 });
 assert.equal(classified,1);
 assert.equal(admitted,1);
 assert.equal(read,1);
 assert.equal(receipt.status,'CHAT_WORK_NEW_DEVELOPMENT_ADMITTED_AND_READ_BACK');
 assert.equal(receipt.original_work_id,workId);
 assert.equal(receipt.source_ref,source_ref);
 assert.equal(receipt.independent_readback_verified,true);
 assert.equal(receipt.execution_started,false);
 assert.equal(receipt.installation_authorized,false);
 assert.equal(receipt.new_shift_started,false);
});

test('ambiguous readback does not retry an already admitted development',async()=>{
 let admitted=0;
 const receipt=await processSignedSavedChatWork({...args,
  inspect:async()=>eligible('CHAT_WORK_NEW_DEVELOPMENT_ELIGIBLE',
   'governed-chat-new-development'),
  admitNew:async()=>{admitted++;return persisted},
  readNew:async()=>{throw Error('UNAVAILABLE_AFTER_COMMIT')}
 });
 assert.equal(admitted,1);
 assert.equal(receipt.status,'CHAT_WORK_NEW_DEVELOPMENT_ADMITTED_READBACK_PENDING');
 assert.equal(receipt.admission_receipt_verified,true);
 assert.equal(receipt.independent_readback_verified,false);
 assert.equal(receipt.original_work_id,workId);
});

test('already admitted signed request does not create another job or reclassify',async()=>{
 let writes=0;
 const receipt=await processSignedSavedChatWork({...args,
  inspect:async()=>({...eligible('CHAT_WORK_NEW_DEVELOPMENT_ALREADY_ADMITTED',
   'governed-chat-new-development',false),original_work_id:workId,
   development_phase:'DRAFT_GENERATED'}),
  admitNew:async()=>{writes++},
  queueOriginal:async()=>{writes++},
  continueEngineering:async()=>{writes++}
 });
 assert.equal(receipt.status,'CHAT_WORK_NEW_DEVELOPMENT_ALREADY_ADMITTED');
 assert.equal(receipt.original_work_id,workId);
 assert.equal(writes,0);
});

test('work classification without matching installed adapter leaves the signed request intact',async()=>{
 let writes=0;
 const receipt=await processSignedSavedChatWork({...args,
  inspect:async()=>eligible('CHAT_WORK_CAPABILITY_GAP',null,false),
  admitNew:async()=>{writes++},
  queueOriginal:async()=>{writes++},
  continueEngineering:async()=>{writes++}
 });
 assert.equal(receipt.status,'CHAT_WORK_CAPABILITY_GAP');
 assert.equal(receipt.execution_started,false);
 assert.equal(writes,0);
});

test('an exact authorized original is routed to its existing worker, never to new development',async()=>{
 let newBuilds=0,queues=0;
 const receipt=await processSignedSavedChatWork({...args,
  inspect:async()=>({...eligible('EXISTING_ORIGINAL_DISCOVERY_ELIGIBLE',
   'governed-original-discovery'),original_work_id:workId}),
  admitNew:async()=>{newBuilds++},
  queueOriginal:async input=>{
   queues++;
   assert.equal((await input.inspect()).original_work_id,workId);
   return {status:'CHAT_WORK_ORIGINAL_DISCOVERY_DISPATCHED',
    original_work_id:workId,request_id:requestId,source_ref,
    installation_authorized:false,production_changed:false};
  }
 });
 assert.equal(queues,1);
 assert.equal(newBuilds,0);
 assert.equal(receipt.status,'CHAT_WORK_ORIGINAL_DISCOVERY_DISPATCHED');
});

test('only owner-source-matched, scoped engineering can continue without extra classification',async()=>{
 let revisions=0;
 const receipt=await processSignedSavedChatWork({...args,
  inspect:async()=>({...eligible('CHAT_WORK_ENGINEERING_SCOPED_CI_READY',
   'governed-original-engineering'),original_work_id:workId}),
  continueEngineering:async input=>{
   revisions++;
   assert.equal((await input.inspect()).original_work_id,workId);
   return {status:'CHAT_WORK_ENGINEERING_CI_DISPATCH_VERIFIED',
    request_id:requestId,source_ref,original_work_id:workId,
    installation_authorized:false,production_changed:false};
  }
 });
 assert.equal(revisions,1);
 assert.equal(receipt.original_work_id,workId);
});

test('untrusted source or inconsistent model authority fails closed without writes',async()=>{
 let writes=0;
 for(const inspect of [
  async()=>({...eligible('CHAT_WORK_NEW_DEVELOPMENT_ELIGIBLE',
   'governed-chat-new-development'),source_ref:'supabase:reality_chat_messages:'+'f'.repeat(36)}),
  async()=>({...eligible('CHAT_WORK_NEW_DEVELOPMENT_ELIGIBLE',
   'governed-chat-new-development'),installation_authorized:true}),
 ]){
  await assert.rejects(()=>processSignedSavedChatWork({...args,inspect,
   admitNew:async()=>{writes++}
  }),/CHAT_WORK_PROCESS_SOURCE_OR_AUTHORITY_MISMATCH/);
 }
 assert.equal(writes,0);
 await assert.rejects(()=>processSignedSavedChatWork({
  ...args,messages:[{...messages[0],role:'assistant'}]
 }),/CHAT_WORK_SIGNED_USER_TURN_REQUIRED/);
});

test('preview only: saved intake feeds direct work and never mistakes Chat text for install approval',()=>{
 const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const index=read('index.html');
 const ui=read('reality-chat-direct-work-handoff-v1.js');
 const endpoint=read('api/reality/personal-chat-work.js');
 const adapter=read('src/reality-saved-chat-work-adapter-v1.js');
 const worker=read('api/reality/governed-employee-shift-worker.js');
 assert.match(index,/reality-chat-direct-work-handoff-v1\.js/);
 assert.match(index,/realityChatDirectWorkEnabled!==true/);
 assert.match(ui,/reality:chat-intake-saved/);
 assert.match(ui,/PROCESS_SIGNED_WORK_REQUEST/);
 assert.match(ui,/duplicate_content===true/);
 assert.match(ui,/INSPECT_VERIFIED_WORK/);
 assert.match(endpoint,/processSignedSavedChatWork/);
 assert.match(adapter,/readOwnerNewDevelopment/);
 assert.match(worker,/generateNextSignedChatDevelopmentDraft/);
 assert.match(worker,/continueChatNewDevelopmentCandidate/);
 assert.doesNotMatch(ui,/APPROVE_EXACT_INSTALL|installation_authorized:true/);
});
