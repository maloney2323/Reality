// Authenticated owner session -> read-only, exact conversation-bound proof that
// the saved human turn entered the EXISTING signed shift worker inbox.
// A model answer or text in the browser cannot forge a work receipt.
import {shiftDatabase,shiftRpc} from './reality-governed-shift-boundary-v1.js';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const SRC=/^supabase:reality_chat_messages:[a-f0-9-]{36}$/i;
export async function readOwnerChatWorkHandoff({
 session,conversationId,env=process.env,fetchImpl=fetch,
 callRpc=shiftRpc,dbFactory=shiftDatabase
}={}){
 if(env.VERCEL_ENV!=='preview'||!UUID.test(session?.user_id||'')||
    !UUID.test(conversationId||'')||
    typeof callRpc!=='function'||typeof dbFactory!=='function')
  return null;
 let db;
 try{db=dbFactory(env)}catch{return null}
 if(!db?.strictSecrets||db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
    db.url!==session.config?.url)return null;
 let read;
 try{
  read=await callRpc(db,'reality_read_chat_work_for_owner_v1',{
   p_owner_id:session.user_id,p_conversation_id:conversationId
  },{fetchImpl});
 }catch{return null}
 if(read?.status!=='OWNER_CHAT_WORK_INTAKE_READBACK'||
    read.owner_id!==session.user_id||
    read.conversation_id!==conversationId||
    read.new_shift_started!==false||
    read.installation_authorized!==false||
    read.production_changed!==false||
    !Array.isArray(read.items)||read.items.length>50||
    read.items.some(x=>
     !UUID.test(x?.source_message_id||'')||
     !UUID.test(x?.request_id||'')||
     !SRC.test(x?.source_ref||'')||
     x.source_ref!=='supabase:reality_chat_messages:'+x.source_message_id||
     !['PENDING','CLAIMED','INVESTIGATED_SCOPED',
       'NEEDS_AUTHORIZED_SCOPE','CONVERSATION_ONLY','PROVIDER_UNVERIFIED']
       .includes(x.status)||
     x.execution_authorized_by_chat!==false||
     x.installation_authorized!==false||
     x.production_changed!==false))
  return null;
 return Object.freeze({
  ...read,
  source:'AUTHENTICATED_OWNER_SCOPED_SERVICE_READBACK',
  code_execution_by_chat:false,
  independent_repair_verified:false,
  installation_authorized:false,
  production_changed:false
 });
}
