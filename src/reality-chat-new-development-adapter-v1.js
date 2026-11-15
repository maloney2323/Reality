// Existing authenticated Chat source -> durable NEW isolated development
// intake. The saved human instruction is the warrant for design/code
// generation only, NOT production changes, installation or customer settlement.
// Never reuse a previous signed shift's frozen work scope for a new request.
import {validUuid} from './reality-private-chat-store-v0.1.js';
import {shiftDatabase,shiftRpc} from './reality-governed-shift-boundary-v1.js';

const WORK=/^work:[a-f0-9]{32}$/;
const SHA=/^[a-f0-9]{40}$/;
const SOURCE=/^supabase:reality_chat_messages:([a-f0-9-]{36})$/i;
const PHASES=new Set(['QUEUED','CLAIMED','DRAFT_GENERATED','NEEDS_SOURCE',
 'PROVIDER_UNVERIFIED','CANDIDATE_STAGED','CI_VERIFIED','CI_REJECTED']);
const fail=(suffix,status=409)=>{throw Object.assign(
 Error('CHAT_WORK_NEW_DEVELOPMENT_'+suffix),{status})};
function trusted(session,conversationId,env,dbFactory){
 if(env.VERCEL_ENV!=='preview'||!validUuid(session?.user_id)||
  !validUuid(conversationId)||!SHA.test(env.VERCEL_GIT_COMMIT_SHA||''))
  fail('OWNER_PREVIEW_RELEASE_REQUIRED',403);
 const db=dbFactory(env);
 if(!db?.strictSecrets||!db.secretKey||db.secretKey.length<24||
  db.url!==session.config?.url||
  db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  fail('EXACT_OWNER_SERVICE_DATABASE_REQUIRED',403);
 return db;
}
export async function readOwnerNewDevelopment({
 session,conversationId,env=process.env,
 dbFactory=shiftDatabase,callRpc=shiftRpc,fetchImpl=fetch
}={}){
 const db=trusted(session,conversationId,env,dbFactory);
 const read=await callRpc(db,'reality_read_chat_new_development_v1',{
  p_owner_id:session.user_id,p_conversation_id:conversationId
 },{fetchImpl});
 if(read?.status!=='OWNER_CHAT_NEW_DEVELOPMENT_READBACK'||
    read.owner_id!==session.user_id||
    read.conversation_id!==conversationId||
    read.installation_authorized!==false||
    read.original_job_completed!==false||
    read.production_changed!==false||
    read.new_shift_started!==false||
    !Array.isArray(read.items)||read.items.length>40||
    read.items.some(x=>!validUuid(x.request_id)||
     !validUuid(x.message_id)||
     x.source_ref!=='supabase:reality_chat_messages:'+x.message_id||
     !WORK.test(x.original_work_id||'')||!PHASES.has(x.phase)||
     x.installation_authorized!==false||
     x.original_job_completed!==false||
     x.production_changed!==false||x.new_shift_started!==false))
  fail('OWNER_SOURCE_AND_DEVELOPMENT_READBACK_UNVERIFIED',503);
 return read;
}
export async function admitOwnerNewDevelopment({
 session,conversationId,requestId,messages,
 expectedObjective,sourceQuote,
 env=process.env,dbFactory=shiftDatabase,
 callRpc=shiftRpc,fetchImpl=fetch
}={}){
 if(!validUuid(requestId)||!Array.isArray(messages))
  fail('EXACT_SAVED_REQUEST_REQUIRED',400);
 const valid=messages.filter(x=>x.request_id===requestId&&x.role==='user'&&
  SOURCE.test(x.source_ref||'')&&typeof x.text==='string'&&
  typeof x.text.trim()==='string'&&x.text.trim().length>=12);
 if(valid.length!==1)fail('ONE_SIGNED_HUMAN_SOURCE_REQUIRED',403);
 const message=valid[0],match=SOURCE.exec(message.source_ref);
 if(!validUuid(match?.[1])||typeof sourceQuote!=='string'||
  sourceQuote.length<5||sourceQuote.length>500||
  !message.text.includes(sourceQuote)||
  typeof expectedObjective!=='string'||
  expectedObjective.trim().length<8||expectedObjective.length>450)
  fail('EXPLICIT_DIRECT_BUILD_INTENT_REQUIRED',409);
 const db=trusted(session,conversationId,env,dbFactory);
 const receipt=await callRpc(db,'reality_admit_chat_new_development_v1',{
  p_owner_id:session.user_id,p_conversation_id:conversationId,
  p_request_id:requestId,p_message_id:match[1],
  p_quote:sourceQuote,p_objective:expectedObjective,
  p_release_sha:env.VERCEL_GIT_COMMIT_SHA
 },{fetchImpl});
 if(receipt?.status!=='SIGNED_CHAT_NEW_DEVELOPMENT_ADMITTED'||
  receipt.owner_id!==session.user_id||
  receipt.conversation_id!==conversationId||
  receipt.request_id!==requestId||
  receipt.message_id!==match[1]||
  receipt.source_ref!==message.source_ref||
  !WORK.test(receipt.original_work_id||'')||
  !PHASES.has(receipt.development_phase)||
  receipt.execution_started!==false||
  receipt.model_generated!==false||
  receipt.installation_authorized!==false||
  receipt.original_job_completed!==false||
  receipt.production_changed!==false||
  receipt.new_shift_started!==false)
  fail('DURABLE_DEVELOPMENT_ADMISSION_UNVERIFIED',503);
 return Object.freeze({
  ...receipt,
  status:'CHAT_WORK_NEW_DEVELOPMENT_DURABLY_ADMITTED',
  approval_scope:'ISOLATED_DEVELOPMENT_ONLY',
  worker_status:'QUEUED_FOR_EXISTING_SIGNED_SERVICE',
  installation_authorized:false,original_job_completed:false,
  production_changed:false,new_shift_started:false
 });
}
