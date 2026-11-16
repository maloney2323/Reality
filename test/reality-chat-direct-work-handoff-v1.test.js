import test from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {readFileSync} from 'node:fs';
import {inspectSavedChatWork,processSignedSavedChatWork,advanceSignedChatDevelopment,readSignedChatDevelopmentStatus}
 from '../src/reality-saved-chat-work-adapter-v1.js';
import {shiftRpc} from '../src/reality-governed-shift-boundary-v1.js';

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
 assert.match(ui,/READ_SIGNED_NEW_DEVELOPMENT_STATUS/);
 assert.match(endpoint,/processSignedSavedChatWork/);
 assert.match(adapter,/readOwnerNewDevelopment/);
 assert.match(worker,/generateNextSignedChatDevelopmentDraft/);
 assert.match(worker,/continueChatNewDevelopmentCandidate/);
 assert.doesNotMatch(ui,/APPROVE_EXACT_INSTALL|installation_authorized:true/);
});


test('signed development worker leases only its own preview release and legacy worker cannot steal work',()=>{
 const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const migration=read('supabase/migrations/20261115213939_reality_chat_new_development_release_bound_claim_v2.sql');
 const worker=read('src/reality-chat-new-development-worker-v1.js');
 assert.match(migration,/reality_claim_chat_new_development_release_v2\(/);
 assert.match(migration,/w\.development->>'release_sha'=p_release_sha/);
 assert.match(migration,/development->>'release_sha'=p_release_sha/);
 assert.match(migration,/FOR UPDATE OF w SKIP LOCKED/);
 assert.match(migration,/NO_PENDING_SIGNED_NEW_DEVELOPMENT/);
 assert.match(migration,/REVOKE ALL ON FUNCTION public\.reality_claim_chat_new_development_release_v2\(text\)/);
 assert.match(worker,/reality_claim_chat_new_development_release_v2/);
 assert.match(worker,/p_release_sha:env\.VERCEL_GIT_COMMIT_SHA/);
 assert.doesNotMatch(worker,/callRpc\(db,'reality_claim_chat_new_development_v1'/);
});


test('Chat work UI binds existing authenticated composer and dispatches one signed saved instruction',async()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const code=readFileSync(new URL('../reality-chat-direct-work-handoff-v1.js',import.meta.url),'utf8');
 assert.match(html,/id="privateReady"/);
 assert.match(html,/id="realityChatComposer"/);
 assert.doesNotMatch(html,/id="realityChatConversation"/);
 assert.match(code,/getElementById\('privateReady'\)/);
 assert.match(code,/ready\.contains\(composer\)/);
 assert.match(code,/container=composer\?\.parentElement/);
 assert.doesNotMatch(code,/composer\.parentElement!==container/);
 assert.doesNotMatch(code,/getElementById\('realityChatConversation'\)/);
 const received=new Map(),outbound=[];
 function element(){
  return {hidden:false,style:{},textContent:'',parentElement:null,children:[],
   setAttribute(){},append(...nodes){this.children.push(...nodes)},
   replaceChildren(){this.children=[]},insertBefore(node,anchor){
    assert.equal(anchor,composer);this.children.push(node)
   }};
 }
 // The premium workspace has already reparented the composer.
 const ready=element(),container=element(),composer=element();
 composer.parentElement=container;
 ready.contains=node=>node===composer;
 const nodes={privateReady:ready,realityChatComposer:composer};
 const window={
  location:{pathname:'/chat'},
  addEventListener(name,fn){received.set(name,fn)},
 };
 const fakeFetch=async(url,options)=>{
  const body=JSON.parse(options.body);
  outbound.push({url,body});
  return {ok:true,json:async()=>({
   ok:true,status:body.action==='ADVANCE_SIGNED_NEW_DEVELOPMENT'?
    'CHAT_WORK_NEW_DEVELOPMENT_DRAFT_BLOCKED':
    'CHAT_WORK_NEW_DEVELOPMENT_ADMITTED_AND_READ_BACK',
   worker_status:body.action==='ADVANCE_SIGNED_NEW_DEVELOPMENT'?
    'CHAT_NEW_DEVELOPMENT_MODEL_CREDENTIAL_UNAVAILABLE':undefined,
   request_id:requestId,source_ref,original_work_id:workId,
   installation_authorized:false,production_changed:false
  })};
 };
 runInNewContext(code,{window,document:{
  getElementById:id=>nodes[id]||null,
  createElement:element
 },fetch:fakeFetch,AbortSignal});
 assert.equal(window.realityChatDirectWorkEnabled,true);
 assert.ok(received.has('reality:chat-request-started'));
 assert.ok(received.has('reality:chat-intake-saved'));
 const detail={conversation_id:conversationId,request_id:requestId,source_ref};
 received.get('reality:chat-request-started')({detail:{...detail,work_status_requested:true}});
 received.get('reality:chat-intake-saved')({detail:{...detail,duplicate_content:false}});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(outbound.length,2);
 assert.equal(outbound[0].url,'/api/reality/personal-chat-work');
 assert.equal(outbound[0].body.action,'PROCESS_SIGNED_WORK_REQUEST');
 assert.equal(outbound[1].body.action,'ADVANCE_SIGNED_NEW_DEVELOPMENT');
 assert.equal(outbound[0].body.request_id,requestId);
 assert.equal(outbound[1].body.request_id,requestId);
 assert.match(container.children[0].children[1].textContent,/REAL BUILD BLOCKER/);
});

test('missing authenticated Chat DOM cannot set the direct-work installed flag',()=>{
 const code=readFileSync(new URL('../reality-chat-direct-work-handoff-v1.js',import.meta.url),'utf8');
 const window={location:{pathname:'/chat'},addEventListener(){
  throw Error('MUST_NOT_REGISTER_WITH_MISSING_CHAT_DOM')
 }};
 runInNewContext(code,{window,document:{getElementById:()=>null}});
 assert.notEqual(window.realityChatDirectWorkEnabled,true);
});


test('saved build buttons work after login without history event and distinguish read from work write',async()=>{
 const code=readFileSync(new URL('../reality-chat-direct-work-handoff-v1.js',import.meta.url),'utf8');
 const events=new Map(),requests=[];
 function element(){
  return {hidden:false,style:{},textContent:'',parentElement:null,children:[],
   setAttribute(){},append(...nodes){this.children.push(...nodes)},
   replaceChildren(){this.children=[]},insertBefore(node){this.children.push(node)}};
 }
 const ready=element(),container=element(),composer=element();
 composer.parentElement=container;
 ready.contains=node=>node===composer;
 const window={
  location:{pathname:'/chat'},realityActiveConversationId:()=>conversationId,
  addEventListener(name,fn){events.set(name,fn)}
 };
 const history=[{role:'user',request_id:requestId,source_ref,
  text:'Reality, build the source-code repair through my existing governed worker.',
  created_at:new Date().toISOString()},
  {role:'user',request_id:'95aa144f-6e18-457f-9cd9-963426803451',
   source_ref:'supabase:reality_chat_messages:71e01bbd-5a5a-4b8c-869f-247478e82aaa',
   text:'Yes I approve this',created_at:new Date().toISOString()}];
 runInNewContext(code,{window,document:{
  getElementById:id=>id==='privateReady'?ready:
   id==='realityChatComposer'?composer:null,
  createElement:element
 },fetch:async(url,options)=>{
  requests.push({url,method:options.method,body:options.body&&JSON.parse(options.body)});
  if(options.method==='GET')
   return {ok:true,status:200,json:async()=>({ok:true,
    conversation_id:conversationId,messages:history})};
  return {ok:true,status:202,json:async()=>({ok:true,
   status:requests.at(-1).body.action==='READ_SIGNED_NEW_DEVELOPMENT_STATUS'?
    'CHAT_WORK_NEW_DEVELOPMENT_NOT_ADMITTED':
    requests.at(-1).body.action==='ADVANCE_SIGNED_NEW_DEVELOPMENT'?
    'CHAT_WORK_NEW_DEVELOPMENT_DRAFT_BLOCKED':
    'CHAT_WORK_NEW_DEVELOPMENT_ADMITTED_AND_READ_BACK',
   worker_status:requests.at(-1).body.action==='ADVANCE_SIGNED_NEW_DEVELOPMENT'?
    'CHAT_NEW_DEVELOPMENT_MODEL_CREDENTIAL_UNAVAILABLE':undefined,
   request_id:requestId,source_ref,original_work_id:workId,
   installation_authorized:false,production_changed:false})};
 },AbortSignal,Date,encodeURIComponent});
 const panel=container.children[0];
 assert.equal(panel.hidden,false,'saved work control is visible without a history event');
 const finder=panel.children[2].children[0];
 assert.match(finder.textContent,/Find my saved build request/);
 assert.equal(requests.length,0,'mounting the control never starts or reads work');
 await finder.onclick();
 assert.equal(requests.length,2);
 assert.equal(requests[0].method,'GET');
 assert.match(requests[0].url,/\/api\/reality\/personal-chat\?conversation_id=/);
 assert.equal(requests[1].body.action,'READ_SIGNED_NEW_DEVELOPMENT_STATUS');
 assert.match(panel.children[1].textContent,/no admitted development record/);
 const buttons=panel.children[3].children;
 assert.equal(buttons.length,2);
 assert.match(buttons[0].textContent,/Inspect saved work/);
 assert.match(buttons[1].textContent,/Continue this exact saved build/);
 assert.equal(requests.length,2,'saved-work lookup makes no write');
 await buttons[1].onclick();
 assert.equal(requests.length,4);
 assert.equal(requests[2].method,'POST');
 assert.equal(requests[2].url,'/api/reality/personal-chat-work');
 assert.equal(requests[2].body.action,'PROCESS_SIGNED_WORK_REQUEST');
 assert.equal(requests[3].body.action,'ADVANCE_SIGNED_NEW_DEVELOPMENT');
 assert.equal(requests[2].body.request_id,requestId);
 assert.equal(requests[3].body.request_id,requestId);
 assert.equal(requests[2].body.conversation_id,conversationId);
 assert.match(panel.children[1].textContent,/REAL BUILD BLOCKER/);
});

test('saved work lookup shows an actionable authenticated readback error, never silently fails',async()=>{
 const code=readFileSync(new URL('../reality-chat-direct-work-handoff-v1.js',import.meta.url),'utf8');
 function element(){return {hidden:false,style:{},textContent:'',parentElement:null,children:[],
  setAttribute(){},append(...nodes){this.children.push(...nodes)},
  replaceChildren(){this.children=[]},insertBefore(node){this.children.push(node)}}}
 const ready=element(),container=element(),composer=element();
 composer.parentElement=container;ready.contains=node=>node===composer;
 const window={location:{pathname:'/chat'},realityActiveConversationId:()=>conversationId,
  addEventListener(){}};
 runInNewContext(code,{window,document:{
  getElementById:id=>id==='privateReady'?ready:id==='realityChatComposer'?composer:null,
  createElement:element
 },fetch:async()=>({ok:false,status:401,json:async()=>({ok:false,error:'CHAT_SIGN_IN_REQUIRED'})}),
 AbortSignal,Date,encodeURIComponent});
 const panel=container.children[0];
 await panel.children[2].children[0].onclick();
 assert.equal(panel.hidden,false);
 assert.match(panel.children[1].textContent,/CHAT_WORK_SIGN_IN_REQUIRED/);
 assert.equal(panel.children[3].children.length,0,'no work action offered without verified saved source');
});


test('signed Chat build with no exact existing issue routes to NEW isolated development even when model chooses old engineering',async()=>{
 let existingReads=0,newReads=0;
 const instruction='Reality, build an isolated code repair so Chat recognizes my already-authorized employee shift. Use the existing Chat infrastructure and produce a GitHub code candidate; do not create a duplicate shift or install production.';
 const x=await inspectSavedChatWork({...args,
  messages:[{...messages[0],text:instruction}],
  classify:async()=>({kind:'WORK_REQUEST',explicit_request:true,
   source_quote:'build an isolated code repair',
   objective:'Build isolated Chat-to-work repair',
   capability_id:'governed-original-engineering',action_eligible:true}),
  readNew:async()=>{newReads++;return {status:'OWNER_CHAT_NEW_DEVELOPMENT_READBACK',
   owner_id:owner,conversation_id:conversationId,items:[]}},
  readWork:async()=>{existingReads++;throw Error('INCORRECT_OLD_ORIGINAL')},
  readBuild:async()=>{existingReads++;throw Error('INCORRECT_OLD_ORIGINAL')}
 });
 assert.equal(x.status,'CHAT_WORK_NEW_DEVELOPMENT_ELIGIBLE');
 assert.equal(x.capability_id,'governed-chat-new-development');
 assert.equal(x.action_eligible,true);
 assert.equal(x.source_ref,source_ref);
 assert.equal(newReads,1);
 assert.equal(existingReads,0);
 assert.equal(x.installation_authorized,false);
});

test('named issue #185 is not quietly converted into new work and a mismatched source fails closed',async()=>{
 let newReads=0,oldReads=0;
 const message='Reality, build a corrective patch for issue #185 in the existing authorized original, run tests, do not install.';
 const actual=await inspectSavedChatWork({...args,
  messages:[{...messages[0],text:message}],
  classify:async()=>({kind:'WORK_REQUEST',explicit_request:true,
   source_quote:'build a corrective patch',objective:'Patch original issue #185',
   capability_id:'governed-chat-new-development',action_eligible:true}),
  readWork:async()=>{oldReads++;return {status:'OWNER_CHAT_WORK_INTAKE_READBACK',
   owner_id:owner,conversation_id:conversationId,
   installation_authorized:false,production_changed:false,
   items:[{request_id:requestId,source_ref,status:'INVESTIGATED_SCOPED',
    selected_source_refs:['https://github.com/maloney2323/Reality/issues/143'],
    shift_id:'c13a7a00-2345-4d5e-95ab-8239899ef000',
    work_chain:[{source_ref:'https://github.com/maloney2323/Reality/issues/143',
      original_work_id:workId,shift_id:'c13a7a00-2345-4d5e-95ab-8239899ef000',
      current_evidence_stage:'CORRECTIVE_MODEL_DRAFT_AWAITING_INDEPENDENT_CI'}]}]}},
  readNew:async()=>{newReads++;throw Error('NEVER_ADMIT_AS_NEW')}
 });
 assert.equal(actual.status,'CHAT_WORK_ENGINEERING_SOURCE_NOT_EXPLICIT');
 assert.equal(oldReads,1);
 assert.equal(newReads,0);
 assert.equal(actual.installation_authorized,false);
});

test('status-only message and general approval never turn into code development',async()=>{
 for(const instruction of ['Yes I approve this',
  'How would we build a code repair in the future?']){
  let calls=0;
  const x=await inspectSavedChatWork({...args,
   messages:[{...messages[0],text:instruction}],
   classify:async()=>({kind:'CONVERSATION',explicit_request:false,
    source_quote:instruction,objective:'Discuss scope',
    capability_id:'governed-original-engineering',action_eligible:false}),
   readNew:async()=>{calls++},
   readWork:async()=>{calls++}
  });
  assert.equal(x.action_eligible,false);
  assert.equal(calls,0);
 }
});



test('shared service database boundary permits exact Chat development RPCs but rejects unregistered operations',async()=>{
 const allowed=[
  'reality_read_chat_new_development_v1',
  'reality_admit_chat_new_development_v1',
  'reality_claim_chat_new_development_release_v2',
  'reality_claim_chat_new_development_signed_v3',
  'reality_record_chat_new_development_draft_v1',
  'reality_mark_chat_new_development_unverified_v1',
  'reality_read_next_chat_new_development_candidate_v2'
 ];
 for(const name of allowed){
  let called=0;
  const value=await shiftRpc({url:'https://isolated.supabase.co',
   secretKey:'test-secret',strictSecrets:true},name,{},{
   fetchImpl:async url=>{
    called++;assert.ok(url.endsWith('/rpc/'+name));
    return {ok:true,json:async()=>({status:'READBACK_TEST'})};
   }});
  assert.equal(called,1);
  assert.equal(value.status,'READBACK_TEST');
 }
 await assert.rejects(()=>shiftRpc({url:'https://isolated.supabase.co',
  secretKey:'test-secret',strictSecrets:true},
  'reality_owner_approve_general_original_install_v1',{},{
  fetchImpl:async()=>{throw Error('MUST_NOT_CALL_PROVIDER')}
 }),/SHIFT_RPC_NOT_ALLOWLISTED/);
});

test('owner signed queued Chat job makes exactly one source-bound model draft claim',async()=>{
 let generated=0,published=0;
 const item={request_id:requestId,source_ref,original_work_id:workId,
  phase:'QUEUED',model_generated:false,
  installation_authorized:false,production_changed:false};
 const result=await advanceSignedChatDevelopment({...args,
  env:{VERCEL_ENV:'preview',
   REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'hvkfreoagbrphwghjajw'},
  session:{...session,config:{url:'https://hvkfreoagbrphwghjajw.supabase.co'}},
  readNew:async()=>({status:'OWNER_CHAT_NEW_DEVELOPMENT_READBACK',
   owner_id:owner,conversation_id:conversationId,items:[item],
   installation_authorized:false,production_changed:false}),
  dbFactory:()=>({strictSecrets:true,project:'hvkfreoagbrphwghjajw',
   url:'https://hvkfreoagbrphwghjajw.supabase.co'}),
  generate:async({ownerScope})=>{
   generated++;assert.equal(ownerScope.owner_id,owner);
   assert.equal(ownerScope.request_id,requestId);
   assert.equal(ownerScope.conversation_id,conversationId);
   return {status:'CHAT_NEW_DEVELOPMENT_CODE_DRAFT_GENERATED',
    original_work_id:workId,model_generated:true,
    source_path:'src/example.js',installation_authorized:false,
    original_job_completed:false,production_changed:false,new_shift_started:false};
  },
  publish:async()=>{published++}
 });
 assert.equal(result.status,'CHAT_WORK_NEW_DEVELOPMENT_DRAFT_GENERATED');
 assert.equal(result.original_work_id,workId);
 assert.equal(result.source_ref,source_ref);
 assert.equal(result.model_generated,true);
 assert.equal(result.installation_authorized,false);
 assert.equal(generated,1);
 assert.equal(published,0);
});

test('a queued Chat job from another owner cannot claim or stage source',async()=>{
 let effects=0;
 await assert.rejects(()=>advanceSignedChatDevelopment({...args,
  env:{VERCEL_ENV:'preview'},
  readNew:async()=>({status:'OWNER_CHAT_NEW_DEVELOPMENT_READBACK',
   owner_id:'99999999-1111-4111-8111-111111111111',
   conversation_id:conversationId,
   installation_authorized:false,production_changed:false,
   items:[{request_id:requestId,source_ref,original_work_id:workId,
    phase:'QUEUED',installation_authorized:false,production_changed:false}]}),
  generate:async()=>{effects++},
  publish:async()=>{effects++}
 }),/CHAT_WORK_NEW_DEVELOPMENT_OWNER_READBACK_REQUIRED/);
 assert.equal(effects,0);
});

test('only matching original and release may reach the existing broker and CI',async()=>{
 let published=0;
 const env={VERCEL_ENV:'preview',
  REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'hvkfreoagbrphwghjajw',
  VERCEL_GIT_COMMIT_SHA:'a'.repeat(40)};
 const sessionWithConfig={...session,config:{url:'https://hvkfreoagbrphwghjajw.supabase.co'}};
 const item={request_id:requestId,source_ref,original_work_id:workId,
  phase:'DRAFT_GENERATED',model_generated:true,installation_authorized:false,
  production_changed:false};
 const selected={status:'EXACT_SIGNED_CHAT_NEW_DEVELOPMENT_CANDIDATE',
  request_id:requestId,conversation_id:conversationId,owner_id:owner,
  original_work_id:workId,source_sha256:'b'.repeat(64),
  release_sha:'a'.repeat(40),installation_authorized:false,
  production_changed:false};
 const shared={...args,env,session:sessionWithConfig,
  readNew:async()=>({status:'OWNER_CHAT_NEW_DEVELOPMENT_READBACK',
   owner_id:owner,conversation_id:conversationId,items:[item],
   installation_authorized:false,production_changed:false}),
  dbFactory:()=>({strictSecrets:true,project:env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF,
   url:sessionWithConfig.config.url})};
 const wrong=await advanceSignedChatDevelopment({...shared,
  callRpc:async()=>({...selected,owner_id:'99999999-1111-4111-8111-111111111111'}),
  publish:async()=>{published++}
 });
 assert.equal(wrong.status,'CHAT_WORK_NEW_DEVELOPMENT_CANDIDATE_NOT_CURRENT');
 assert.equal(published,0);
 const good=await advanceSignedChatDevelopment({...shared,
  callRpc:async()=>selected,
  publish:async()=>{published++;return {
   status:'NEW_CHAT_DEVELOPMENT_PROVIDER_CANDIDATE_STAGED',
   original_work_id:workId,pr_url:'https://github.com/maloney2323/Reality/pull/350',
   artifact_commit_sha:'c'.repeat(40),
   installation_authorized:false,original_job_completed:false,
   production_changed:false,new_shift_started:false}}
 });
 assert.equal(good.status,'CHAT_WORK_NEW_DEVELOPMENT_CANDIDATE_STAGED');
 assert.equal(good.pr_url,'https://github.com/maloney2323/Reality/pull/350');
 assert.equal(good.installation_authorized,false);
 assert.equal(published,1);
});



test('read-only owner status returns precise staged PR and forbids cross-user source',async()=>{
 const input={...args};
 const exact={request_id:requestId,source_ref,original_work_id:workId,
  phase:'CANDIDATE_STAGED',model_generated:true,independent_ci_verified:false,
  installation_authorized:false,original_job_completed:false,
  production_changed:false,new_shift_started:false,
  evidence:{pr_url:'https://github.com/maloney2323/Reality/pull/309',
   artifact_commit_sha:'a'.repeat(40)}};
 const response={status:'OWNER_CHAT_NEW_DEVELOPMENT_READBACK',
  owner_id:owner,conversation_id:conversationId,items:[exact],
  installation_authorized:false,original_job_completed:false,
  production_changed:false,new_shift_started:false};
 const result=await readSignedChatDevelopmentStatus({...input,
  readNew:async()=>response});
 assert.equal(result.status,'CHAT_WORK_NEW_DEVELOPMENT_STATUS_READBACK');
 assert.equal(result.development_phase,'CANDIDATE_STAGED');
 assert.equal(result.original_work_id,workId);
 assert.equal(result.pr_url,'https://github.com/maloney2323/Reality/pull/309');
 assert.equal(result.model_generated,true);
 assert.equal(result.independent_ci_verified,false);
 assert.equal(result.installation_authorized,false);
 await assert.rejects(()=>readSignedChatDevelopmentStatus({...input,
  readNew:async()=>({...response,owner_id:'11111111-2222-4333-8444-555555555555'})
 }),/CHAT_WORK_DEVELOPMENT_STATUS_OWNER_READBACK_UNVERIFIED/);
});

test('saved PR on mobile displays independent CI next step and records actual verified receipt only after click',async()=>{
 const code=readFileSync(new URL('../reality-chat-direct-work-handoff-v1.js',import.meta.url),'utf8');
 const requests=[];
 const ownerText='Reality, build the existing Chat-to-code repair as an isolated GitHub source patch.';
 const history=[{role:'user',request_id:requestId,source_ref,text:ownerText,
  created_at:new Date().toISOString()}];
 function element(){return {hidden:false,style:{},textContent:'',parentElement:null,children:[],
   setAttribute(){},append(...nodes){this.children.push(...nodes)},
   replaceChildren(){this.children=[]},insertBefore(node){this.children.push(node)}}}
 const ready=element(),container=element(),composer=element();
 composer.parentElement=container;ready.contains=node=>node===composer;
 const window={location:{pathname:'/chat'},realityActiveConversationId:()=>conversationId,
  addEventListener(){}};
 const pr_url='https://github.com/maloney2323/Reality/pull/309';
 const draft={ok:true,status:'CHAT_WORK_NEW_DEVELOPMENT_STATUS_READBACK',
  request_id:requestId,source_ref,original_work_id:workId,
  development_phase:'CANDIDATE_STAGED',model_generated:true,
  independent_ci_verified:false,pr_url,installation_authorized:false,
  production_changed:false};
 const verified={...draft,status:'CHAT_WORK_NEW_DEVELOPMENT_CI_VERIFIED',
  development_phase:'CI_VERIFIED',independent_ci_verified:true,
  ci_run_id:43879567344,artifact_commit_sha:'a'.repeat(40)};
 runInNewContext(code,{window,document:{
  getElementById:id=>id==='privateReady'?ready:
   id==='realityChatComposer'?composer:null,createElement:element
 },fetch:async(url,options)=>{
  requests.push({url,method:options.method,body:options.body&&JSON.parse(options.body)});
  if(options.method==='GET')return {ok:true,status:200,json:async()=>({
   ok:true,conversation_id:conversationId,messages:history})};
  return {ok:true,status:200,json:async()=>requests.at(-1).body.action===
   'ADVANCE_SIGNED_NEW_DEVELOPMENT'?verified:draft};
 },AbortSignal,Date,encodeURIComponent});
 const panel=container.children[0];
 await panel.children[2].children[0].onclick();
 assert.equal(requests.length,2,'authenticated history GET and one read-only status POST');
 assert.equal(requests[1].body.action,'READ_SIGNED_NEW_DEVELOPMENT_STATUS');
 assert.match(panel.children[1].textContent,/CANDIDATE_STAGED/);
 const buttons=panel.children[3].children;
 assert.equal(buttons.length,3,'read-only Inspect, link, governed CI reconciliation');
 assert.match(buttons[1].textContent,/GitHub code candidate/);
 assert.equal(buttons[1].href,pr_url);
 assert.match(buttons[2].textContent,/Check and record independent CI/);
 assert.match(panel.children[4].textContent,/GitHub draft PR contains code/);
 assert.match(panel.children[4].textContent,/○ Independent CI/);
 await buttons[2].onclick();
 assert.equal(requests.length,3);
 assert.equal(requests[2].body.action,'ADVANCE_SIGNED_NEW_DEVELOPMENT');
 assert.equal(requests[2].body.request_id,requestId);
 assert.match(panel.children[1].textContent,/INDEPENDENT SOURCE\/SYNTAX CI VERIFIED/);
 assert.match(panel.children[4].textContent,/✓ Independent CI recorded/);
});
