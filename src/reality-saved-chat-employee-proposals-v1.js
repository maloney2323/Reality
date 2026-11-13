// Read-only projection of existing authenticated saved Chat proposals into
// Reality's employee board. No new database authority, execution job, schedule,
// approval, or speculative source observation is created.
export const REALITY_SAVED_CHAT_EMPLOYEE_PROPOSALS_VERSION =
 'reality-saved-chat-employee-proposals-v1';
const ROLE_NAMES=Object.freeze([
 'Avery','Riley','Quinn','Taylor','Casey','Morgan','Jordan','Sage'
]);
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const HEADING=/^#{2,5}\s*(?:\d+[.)]\s*)?(Avery|Riley|Quinn|Taylor|Casey|Morgan|Jordan|Sage)(?:\s*\([^)\n]{1,90}\))?\s*$/gim;
const clean=s=>String(s||'').replace(/<[^>]*>/g,'').replace(/\*\*/g,'')
 .replace(/[\r\t]/g,' ').trim().slice(0,270);
function empty(status){
 return Object.freeze({version:REALITY_SAVED_CHAT_EMPLOYEE_PROPOSALS_VERSION,
  status,source_kind:'AUTHENTICATED_SAVED_CHAT_ASSISTANT_MESSAGE',
  source_message_ref:null,conversation_id:null,created_at:null,
  roles:[],roles_with_proposals:0,missing_employee_roles:[...ROLE_NAMES],
  plan_authorized:false,execution_authorized:false,
  installation_authorized:false,production_changed:false,read_only:true,
  proposals_not_verified_jobs:true});
}
export function projectRealitySavedChatEmployeeProposals(rows){
 if(!Array.isArray(rows)||rows.length>60)
  throw Error('EMPLOYEE_CHAT_ARCHIVE_ROWS_INVALID');
 for(const row of rows){
  if(!UUID.test(row?.id||'')||!UUID.test(row?.conversation_id||'')||
   !UUID.test(row?.request_id||'')||
   typeof row.content!=='string'||row.content.length>12000||
   !Number.isFinite(Date.parse(row.created_at||'')))
   throw Error('EMPLOYEE_CHAT_ARCHIVE_SOURCE_INVALID');
 }
 for(const row of rows){
  if(row.content.length<200)continue;
  const positions=[...row.content.matchAll(HEADING)];
  if(positions.length<2||positions.length>8||
   new Set(positions.map(x=>x[1])).size!==positions.length)continue;
  const roles=[];
  for(let i=0;i<positions.length;i++){
   const match=positions[i];
   const section=row.content.slice(match.index+match[0].length,
    i+1<positions.length?positions[i+1].index:row.content.length);
   const lines=section.split('\n');
   let collecting=false;const suggested=[];
   for(const line of lines){
    if(/^\s*[-*]\s+\*{0,2}Suggested Jobs:?\*{0,2}\s*$/i.test(line)){
     collecting=true;continue;
    }
    if(!collecting)continue;
    if(/^\s*[-*]\s+\*\*[A-Za-z][^*]{1,65}:\*\*/.test(line)||/^#{2,5}\s/.test(line))
     break;
    const task=/^\s{2,}[-*]\s+(.+)$/.exec(line);
    if(task){
     const description=clean(task[1]);
     if(description&&suggested.length<8)suggested.push(Object.freeze({
      description,source_status:'CHAT_SUGGESTION_UNQUALIFIED',
      may_reference_previously_settled_work:/#263\b/.test(description),
      authorized_execution:false,independently_verified_job:false
     }));
    }
   }
   if(suggested.length)roles.push(Object.freeze({
    employee_name:match[1],proposals:Object.freeze(suggested),
    source_status:'FROM_PERSISTED_CHAT_NOT_RECONCILED_WITH_LIVE_WORK'
   }));
  }
  if(roles.length<2)continue;
  const included=new Set(roles.map(x=>x.employee_name));
  return Object.freeze({
   version:REALITY_SAVED_CHAT_EMPLOYEE_PROPOSALS_VERSION,
   status:'SAVED_CHAT_IDEAS_AWAITING_SOURCE_AND_SETTLEMENT_RECONCILIATION',
   source_kind:'AUTHENTICATED_SAVED_CHAT_ASSISTANT_MESSAGE',
   source_message_ref:'supabase:reality_chat_messages:'+row.id,
   conversation_id:row.conversation_id,created_at:row.created_at,
   roles:Object.freeze(roles),roles_with_proposals:roles.length,
   missing_employee_roles:ROLE_NAMES.filter(x=>!included.has(x)),
   plan_authorized:false,execution_authorized:false,
   installation_authorized:false,production_changed:false,read_only:true,
   proposals_not_verified_jobs:true
  });
 }
 return empty('NO_SAVED_MULTI_EMPLOYEE_CHAT_PROPOSALS_OBSERVED');
}

export async function readRealitySavedChatEmployeeProposals(session,{
 fetchImpl=fetch
}={}){
 if(!UUID.test(session?.user_id||'')||
  !session?.config?.url?.startsWith('https://')||
  !session?.config?.key||!session.access_token)
  throw Error('EMPLOYEE_CHAT_ARCHIVE_AUTHENTICATED_SESSION_REQUIRED');
 const query='?select=id,content,conversation_id,request_id,created_at'+
  '&user_id=eq.'+encodeURIComponent(session.user_id)+
  '&role=eq.assistant&order=created_at.desc,id.desc&limit=60';
 const response=await fetchImpl(
  session.config.url+'/rest/v1/reality_chat_messages'+query,{
   method:'GET',redirect:'error',headers:{
    apikey:session.config.key,
    authorization:'Bearer '+session.access_token,
    accept:'application/json'
   }
  });
 if(!response.ok)throw Error('EMPLOYEE_CHAT_ARCHIVE_OWNER_READ_UNAVAILABLE');
 const rows=await response.json().catch(()=>null);
 return projectRealitySavedChatEmployeeProposals(rows);
}
