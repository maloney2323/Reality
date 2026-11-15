import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {inspectSavedChatWork,authorizeSavedChatNewDevelopment}
 from '../src/reality-saved-chat-work-adapter-v1.js';
import {admitOwnerNewDevelopment,readOwnerNewDevelopment}
 from '../src/reality-chat-new-development-adapter-v1.js';
import {generateNextSignedChatDevelopmentDraft}
 from '../src/reality-chat-new-development-worker-v1.js';
import {continueChatNewDevelopmentCandidate}
 from '../src/reality-chat-new-development-publisher-v1.js';

const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const conversationId='a8c800f6-6848-492c-b6aa-e8deca0db3fe';
const requestId='3a2978fc-3188-44ec-a75c-a51e201a8e5a';
const messageId='71e01bbd-5a5a-4b8c-869f-247478e82ac1';
const source_ref='supabase:reality_chat_messages:'+messageId;
const workId='work:'+'d'.repeat(32);
const release='a'.repeat(40);
const session={user_id:owner,config:{url:'https://hvkfreoagbrphwghjajw.supabase.co'}};
const objective='Build a calendar widget in Reality chat';
const instructions='Reality, build a calendar widget in Reality chat.';
const messages=[{role:'user',request_id:requestId,source_ref,text:instructions}];
const modelIntent={kind:'WORK_REQUEST',capability_id:'governed-chat-new-development',
 action_eligible:true,explicit_request:true,source_quote:instructions,
 objective};
const env={VERCEL_ENV:'preview',REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'hvkfreoagbrphwghjajw',
 VERCEL_GIT_COMMIT_SHA:release,
 VERCEL_GIT_COMMIT_REF:'reality/chat-resilient-signed-response-20261114'};
const db={strictSecrets:true,url:session.config.url,
 project:env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF,secretKey:'x'.repeat(45)};

test('new explicit authenticated feature request does not get attached to previous repair or shift',async()=>{
 let oldQueueCalls=0;
 const x=await inspectSavedChatWork({
  session,conversationId,requestId,messages,
  classify:async()=>modelIntent,
  readNew:async()=>({status:'OWNER_CHAT_NEW_DEVELOPMENT_READBACK',
   owner_id:owner,conversation_id:conversationId,items:[]}),
  readBuild:async()=>{oldQueueCalls++;throw Error('DO_NOT_READ_OLD_ORIGINAL')},
  readWork:async()=>{throw Error('DO_NOT_READ_OLD_SHIFT')}
 });
 assert.equal(x.status,'CHAT_WORK_NEW_DEVELOPMENT_ELIGIBLE');
 assert.equal(x.action_eligible,true);
 assert.equal(x.original_work_id,null);
 assert.equal(x.capability_id,'governed-chat-new-development');
 assert.equal(x.new_shift_started,false);
 assert.equal(oldQueueCalls,0);
});
test('new development is idempotent on the same saved Chat request',async()=>{
 const x=await inspectSavedChatWork({
  session,conversationId,requestId,messages,classify:async()=>modelIntent,
  readNew:async()=>({status:'OWNER_CHAT_NEW_DEVELOPMENT_READBACK',
   owner_id:owner,conversation_id:conversationId,
   items:[{request_id:requestId,source_ref,original_work_id:workId,
    phase:'DRAFT_GENERATED'}]})
 });
 assert.equal(x.status,'CHAT_WORK_NEW_DEVELOPMENT_ALREADY_ADMITTED');
 assert.equal(x.original_work_id,workId);
 let admits=0;
 const second=await authorizeSavedChatNewDevelopment({
  session,conversationId,requestId,messages,
  inspect:async()=>x,
  admit:async()=>{admits++}
 });
 assert.equal(admits,0);
 assert.equal(second.original_work_id,workId);
 assert.equal(second.installation_authorized,false);
});
test('signed saved user source and service-only original admission are both required',async()=>{
 let count=0;
 const admission=await admitOwnerNewDevelopment({
  session,conversationId,requestId,messages,env,
  sourceQuote:instructions,expectedObjective:objective,dbFactory:()=>db,
  callRpc:async(_,name,args)=>{
   count++;assert.equal(name,'reality_admit_chat_new_development_v1');
   assert.equal(args.p_owner_id,owner);
   assert.equal(args.p_conversation_id,conversationId);
   assert.equal(args.p_request_id,requestId);
   assert.equal(args.p_message_id,messageId);
   assert.equal(args.p_quote,instructions);
   assert.equal(args.p_release_sha,release);
   return {
    status:'SIGNED_CHAT_NEW_DEVELOPMENT_ADMITTED',
    owner_id:owner,conversation_id:conversationId,request_id:requestId,
    message_id:messageId,source_ref,original_work_id:workId,
    development_phase:'QUEUED',execution_started:false,
    model_generated:false,installation_authorized:false,
    original_job_completed:false,production_changed:false,new_shift_started:false
   };
  }
 });
 assert.equal(count,1);
 assert.equal(admission.status,'CHAT_WORK_NEW_DEVELOPMENT_DURABLY_ADMITTED');
 assert.equal(admission.original_work_id,workId);
 assert.equal(admission.new_shift_started,false);
 assert.equal(admission.production_changed,false);
 assert.equal(admission.installation_authorized,false);
});
test('a model interpretation without an actual saved owner quote is never admission',async()=>{
 let count=0;
 await assert.rejects(()=>admitOwnerNewDevelopment({
  session,conversationId,requestId,messages,env,
  sourceQuote:'create an unrelated billing system',expectedObjective:objective,
  dbFactory:()=>{count++;return db}
 }),/CHAT_WORK_NEW_DEVELOPMENT_EXPLICIT_DIRECT_BUILD_INTENT_REQUIRED/);
 assert.equal(count,0);
 await assert.rejects(()=>admitOwnerNewDevelopment({
  session,conversationId,requestId,
  messages:[{...messages[0],role:'assistant'}],env,
  sourceQuote:instructions,expectedObjective:objective
 }),/CHAT_WORK_NEW_DEVELOPMENT_ONE_SIGNED_HUMAN_SOURCE_REQUIRED/);
});
test('readback rejects another owner or forged installation evidence',async()=>{
 const base={status:'OWNER_CHAT_NEW_DEVELOPMENT_READBACK',
 owner_id:owner,conversation_id:conversationId,items:[
 {request_id:requestId,message_id:messageId,source_ref,
  original_work_id:workId,phase:'DRAFT_GENERATED',
  installation_authorized:false,original_job_completed:false,
  production_changed:false,new_shift_started:false}],
 installation_authorized:false,original_job_completed:false,
 production_changed:false,new_shift_started:false};
 const valid=await readOwnerNewDevelopment({
  session,conversationId,env,dbFactory:()=>db,
  callRpc:async()=>base
 });
 assert.equal(valid.items[0].phase,'DRAFT_GENERATED');
 for(const corrupted of [
  {...base,owner_id:'7d736b3b-f43a-4acc-aad7-6a4890f2b48c'},
  {...base,items:[{...base.items[0],installation_authorized:true}]},
  {...base,items:[{...base.items[0],original_work_id:'fake'}]}
 ]){
  await assert.rejects(()=>readOwnerNewDevelopment({
   session,conversationId,env,dbFactory:()=>db,
   callRpc:async()=>corrupted
  }),/CHAT_WORK_NEW_DEVELOPMENT_OWNER_SOURCE_AND_DEVELOPMENT_READBACK_UNVERIFIED/);
 }
});
test('new development is not launched on ordinary questions',async()=>{
 let calls=0;
 const x=await inspectSavedChatWork({
  session,conversationId,requestId,messages:[
   {...messages[0],text:'Can you explain how calendars work?'}],
  classify:async()=>({kind:'CONVERSATION',capability_id:null,
   status:'CONVERSATION_ONLY',objective:'calendar explanation',
   action_eligible:false}),
  readNew:async()=>{calls++}
 });
 assert.equal(x.status,'CHAT_WORK_CONVERSATION_ONLY');
 assert.equal(x.action_eligible,false);
 assert.equal(calls,0);
});
test('new development code generator cannot claim without signed model/preview service',async()=>{
 let claims=0;
 for(const unsafe of [
  {...env,VERCEL_ENV:'production'},
  {...env,REALITY_STANDALONE_OPENAI_API_KEY:'short'},
  {...env,VERCEL_GIT_COMMIT_SHA:'invalid'}
 ]){
  const result=await generateNextSignedChatDevelopmentDraft({
   db,env:unsafe,callRpc:async()=>{claims++}
  });
  assert.equal(result.model_generated,false);
  assert.equal(result.installation_authorized,false);
  assert.equal(result.production_changed,false);
 }
 assert.equal(claims,0);
});
test('signed developer can draft a bounded real source change using frozen Git readbacks',async()=>{
 const sourceText='// Real module source\nexport function calendarWidget() { return \'old calendar\'; }\n'+
  'export function existingDate(){return new Date(0);}\n';
 const bytes=Buffer.from(sourceText);
 const blob=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
 const tree='b'.repeat(40),path='src/reality-calendar-widget-v1.js';
 const original={status:'SIGNED_NEW_DEVELOPMENT_SOURCE_LEASED',
  message_id:messageId,request_id:requestId,owner_id:owner,conversation_id:conversationId,
  claim_id:'0f4c6960-73a4-442b-8843-b35201c424b2',
  original_work_id:workId,source_ref,
  message_sha256:'c'.repeat(64),release_sha:release,
  claim_expires_at:'2099-01-01T00:00:00Z',
  objective,original_instruction:instructions,
  installation_authorized:false,original_job_completed:false,
  production_changed:false,new_shift_started:false};
 let modelCalls=0,stored=0;
 const responses=[
  {id:'resp_targetFirst123',status:'completed',output_text:JSON.stringify({
   path,reason:'Calendar source is the right file'})},
  {id:'resp_patchNext123',status:'completed',output_text:JSON.stringify({
   find:"export function calendarWidget() { return 'old calendar'; }",
   replace:"export function calendarWidget() { return 'new calendar'; }",
   reason:'Update the existing widget in an isolated source candidate'})}
 ];
 const fetchImpl=async(url,opt)=>{
  if(url.endsWith('/git/commits/'+release))return new Response(JSON.stringify({
   sha:release,tree:{sha:tree}}),{status:200});
  if(url.includes('/git/trees/'+tree))return new Response(JSON.stringify({
   sha:tree,truncated:false,tree:[{path,type:'blob',sha:blob,size:bytes.length}]
  }),{status:200});
  if(url.includes('/contents/'+path+'?ref='+release))return new Response(JSON.stringify({
   path,encoding:'base64',sha:blob,size:bytes.length,
   content:bytes.toString('base64')
  }),{status:200});
  if(url==='https://api.openai.com/v1/responses'){
   const r=responses[modelCalls++];
   assert(r);assert.equal(opt.method,'POST');
   assert.equal(JSON.parse(opt.body).tool_choice,'none');
   return new Response(JSON.stringify(r),{status:200});
  }
  throw Error('UNEXPECTED_SOURCE_REQUEST:'+url);
 };
 const callRpc=async(_db,name,args)=>{
  if(name==='reality_claim_chat_new_development_release_v2'){
   assert.equal(args.p_release_sha,release);
   return original;
  }
  if(name==='reality_record_chat_new_development_draft_v1'){
   stored++;assert.equal(args.p_target_path,path);
   assert.equal(args.p_source_blob_sha,blob);
   assert.equal(args.p_original_work_id,workId);
   assert.match(args.p_replace,/new calendar/);
   return {status:'SIGNED_NEW_DEVELOPMENT_MODEL_DRAFT_RECORDED',
    original_work_id:workId,message_id:messageId,
    candidate_sha256:'sha256:'+'d'.repeat(64),
    model_generated:true,independent_ci_verified:false,
    installation_authorized:false,original_job_completed:false,
    production_changed:false,new_shift_started:false};
  }
  throw Error('NO_OTHER_DB_WRITES:'+name);
 };
 const actual=await generateNextSignedChatDevelopmentDraft({
  db,env:{...env,REALITY_STANDALONE_OPENAI_API_KEY:'sk-test-key-isolated-123456789012345',
   REALITY_OPENAI_MODEL:'gpt-5.4'},
  fetchImpl,callRpc
 });
 assert.equal(actual.status,'CHAT_NEW_DEVELOPMENT_CODE_DRAFT_GENERATED');
 assert.equal(actual.original_work_id,workId);
 assert.equal(actual.model_generated,true);
 assert.equal(actual.independent_ci_verified,false);
 assert.equal(actual.installation_authorized,false);
 assert.equal(modelCalls,2);
 assert.equal(stored,1);
});
test('signed GitHub candidate publisher checks release, service key, safe provider receipt',async()=>{
 const receipt={status:'NEW_CHAT_DEVELOPMENT_PROVIDER_CANDIDATE_STAGED',
  original_work_id:workId,
  artifact_commit_sha:'c'.repeat(40),
  pr_url:'https://github.com/maloney2323/Reality/pull/350',
  source_installed:false,installation_authorized:false,
  original_job_completed:false,production_changed:false,
  new_shift_started:false,feature_acceptance_verified:false,
  independent_ci_verified:false,model_generated:true};
 let calls=0;
 const actual=await continueChatNewDevelopmentCandidate({
  db,env,fetchImpl:async(url,opt)=>{
   calls++;assert.equal(url,db.url+'/functions/v1/reality-chat-new-development-broker-v1');
   assert.equal(opt.headers.authorization,'Bearer '+db.secretKey);
   assert.equal(JSON.parse(opt.body).base_sha,release);
   assert.equal(JSON.parse(opt.body).base_branch,env.VERCEL_GIT_COMMIT_REF);
   return new Response(JSON.stringify(receipt),{status:200});
  }
 });
 assert.equal(calls,1);
 assert.equal(actual.status,receipt.status);
 assert.equal(actual.artifact_commit_sha,receipt.artifact_commit_sha);
 assert.equal(actual.installation_authorized,false);
 assert.equal(actual.source_installed,false);
});
test('new model code never runs or installs in broker/CI, and signed wake owns generation',()=>{
 const get=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const sql=get('supabase/migrations/20261115010000_chat_new_development_admission_v1.sql');
 const worker=get('api/reality/governed-employee-shift-worker.js');
 const edge=get('supabase/functions/reality-chat-new-development-broker-v1/index.ts');
 const ci=get('test/ci/reality-chat-new-development-syntax-proof-v1.mjs');
 const workflow=get('.github/workflows/reality-chat-new-development-candidate-v1.yml');
 const index=get('index.html');
 const api=get('api/reality/personal-chat-work.js');
 assert.match(sql,/current_user<>'service_role'/);
 assert.match(sql,/public\.reality_chat_messages/);
 assert.match(sql,/development IS NULL/);
 assert.match(worker,/generateNextSignedChatDevelopmentDraft/);
 assert.match(worker,/continueChatNewDevelopmentCandidate/);
 assert.match(edge,/REALITY_GITHUB_BROKER_TOKEN/);
 assert.match(edge,/evidence\/reality-chat-development/);
 assert.match(edge,/feature_acceptance_verified:false/);
 assert.doesNotMatch(edge,/reality_owner_approve_general_original_install_v1/);
 assert.match(ci,/--check/);
 assert.match(ci,/model_code_executed:false/);
 assert.match(workflow,/persist-credentials: false/);
 assert.match(index,/ADMIT_SIGNED_NEW_DEVELOPMENT/);
 assert.match(api,/authorizeSavedChatNewDevelopment/);
 assert.doesNotMatch(api,/installation_authorized:true/);
});
