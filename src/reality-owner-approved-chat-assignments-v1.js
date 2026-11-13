// Owner session validates the exact saved Chat source before a durable
// employee job-list approval. This is NOT original-work admission or a
// new execution warrant. The protected DB independently checks the archive
// source content hash and allows only owner-scoped idempotent inserts.
import {shiftDatabase} from './reality-governed-shift-boundary-v1.js';
import {readRealitySavedChatEmployeeProposals}
 from './reality-saved-chat-employee-proposals-v1.js';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const SHA=/^sha256:[a-f0-9]{64}$/;
const NAME=new Set(['Avery','Riley','Quinn','Taylor','Casey','Morgan','Jordan','Sage']);
const fail=x=>{throw Error('REALITY_CHAT_ASSIGNMENT_'+x)};
export function deriveRealityApprovedChatRoleTasks(proposal){
 if(proposal?.version!=='reality-saved-chat-employee-proposals-v1'||
  proposal.status!=='SAVED_CHAT_IDEAS_AWAITING_SOURCE_AND_SETTLEMENT_RECONCILIATION'||
  !/^supabase:reality_chat_messages:[a-f0-9-]{36}$/i.test(proposal.source_message_ref||'')||
  !UUID.test(proposal.conversation_id||'')||
  !SHA.test(proposal.source_content_sha256||'')||
  proposal.read_only!==true||proposal.plan_authorized!==false||
  proposal.execution_authorized!==false||
  proposal.installation_authorized!==false||
  proposal.proposals_not_verified_jobs!==true||
  !Array.isArray(proposal.roles)||proposal.roles.length<2||proposal.roles.length>8)
  fail('SAVED_ASSISTANT_PLAN_REQUIRED');
 const names=new Set();
 const roles=proposal.roles.map(role=>{
  if(!NAME.has(role?.employee_name)||names.has(role.employee_name)||
   !Array.isArray(role.proposals)||role.proposals.length<1||
   role.proposals.length>8)
   fail('EMPLOYEE_ROLE_SET_INVALID');
  names.add(role.employee_name);
  const tasks=role.proposals.map(p=>{
   if(typeof p?.description!=='string'||
    p.description.length<5||p.description.length>270||
    p.description.trim()!==p.description||
    p.authorized_execution!==false||p.independently_verified_job!==false||
    p.source_status!=='CHAT_SUGGESTION_UNQUALIFIED')
    fail('CHAT_TASK_DESCRIPTION_UNVERIFIED');
   return p.description;
  });
  return {employee_name:role.employee_name,tasks};
 });
 return Object.freeze(roles);
}
export function verifyRealityOwnerApprovedChatJobList(x){
 if(x?.status!=='OWNER_APPROVED_CHAT_EMPLOYEE_JOB_LIST_READBACK'||
  x.owner_scope_verified!==true||
  x.read_only!==true||
  x.work_execution_authorized_by_read!==false||
  x.installation_authorized!==false||
  x.production_changed!==false||
  !Array.isArray(x.approvals)||x.approvals.length>12||
  x.approvals_count!==x.approvals.length)
  fail('OWNER_APPROVED_ASSIGNMENTS_UNVERIFIED');
 for(const a of x.approvals){
  if(!UUID.test(a?.approval_id||'')||!UUID.test(a.source_message_id||'')||
    !UUID.test(a.conversation_id||'')||
    !SHA.test(a.source_content_sha256||'')||
    !Number.isSafeInteger(a.role_count)||a.role_count<2||
    a.role_count>8||!Number.isSafeInteger(a.task_count)||
    a.task_count<1||a.task_count>64||
    a.approval_status!=='APPROVED_ASSIGNMENTS_AWAITING_QUALIFICATION'||
    a.shift_execution_authorized!==false||
    a.installation_authorized!==false||
    a.production_changed!==false||
    !Array.isArray(a.roles)||a.roles.length!==a.role_count)
    fail('APPROVED_JOB_LIST_ENTRY_INVALID');
  let tasks=0,seen=new Set();
  for(const role of a.roles){
   if(!NAME.has(role?.employee_name)||seen.has(role.employee_name)||
    !Array.isArray(role.tasks)||role.tasks.length<1||
    role.tasks.length>8||role.tasks.some(t=>typeof t!=='string'||t.length<5||t.length>270))
    fail('APPROVED_EMPLOYEE_JOB_LIST_INVALID');
   tasks+=role.tasks.length;seen.add(role.employee_name);
  }
  if(tasks!==a.task_count)fail('APPROVED_TASK_COUNT_CHANGED');
 }
 return Object.freeze(x);
}
async function rpc(db,name,payload,{fetchImpl=fetch}={}){
 const r=await fetchImpl(db.url+'/rest/v1/rpc/'+name,{
  method:'POST',redirect:'error',cache:'no-store',
  headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
   'content-type':'application/json',accept:'application/json'},
  body:JSON.stringify(payload),
  signal:AbortSignal.timeout(14000)
 });
 if(!r?.ok)fail('TRUSTED_DATABASE_REQUEST_UNAVAILABLE');
 const json=await r.json();
 if(json===null||typeof json!=='object')fail('DB_RECEIPT_NOT_VERIFIED');
 return json;
}
function boundDb(session,env){
 if(env.VERCEL_ENV!=='preview'||!UUID.test(session?.user_id||'')||
  !session?.config?.url||
  !env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  fail('OWNER_PREVIEW_SCOPE_REQUIRED');
 const db=shiftDatabase(env);
 if(db.url!==session.config.url||!db.secretKey||!db.strictSecrets)
  fail('OWNER_DB_AND_AUTH_SESSION_MISMATCH');
 return db;
}
export async function readOwnerApprovedChatEmployeeAssignments(session,{
 env=process.env,fetchImpl=fetch}={}){
 const db=boundDb(session,env);
 return verifyRealityOwnerApprovedChatJobList(await rpc(db,
  'reality_read_owner_chat_employee_assignments_v1',
  {p_owner_id:session.user_id},{fetchImpl}));
}
export async function approveCurrentSavedChatEmployeeAssignments(session,{
 expectedMessageRef,expectedContentSha256,env=process.env,fetchImpl=fetch
}={}){
 const db=boundDb(session,env);
 const proposal=await readRealitySavedChatEmployeeProposals(session,{fetchImpl});
 if(!SHA.test(expectedContentSha256||'')||
  proposal.source_message_ref!==expectedMessageRef||
  proposal.source_content_sha256!==expectedContentSha256)
  fail('CHAT_OWNER_PREVIEW_CHANGED');
 const roles=deriveRealityApprovedChatRoleTasks(proposal);
 const msg=expectedMessageRef.slice('supabase:reality_chat_messages:'.length);
 if(!UUID.test(msg))fail('SOURCE_MESSAGE_ID_INVALID');
 const x=await rpc(db,'reality_record_owner_chat_employee_assignments_v1',{
  p_owner_id:session.user_id,p_message_id:msg,
  p_content_sha256:expectedContentSha256,p_roles:roles
 },{fetchImpl});
 if(x?.status!=='OWNER_CHAT_EMPLOYEE_ASSIGNMENTS_DURABLY_APPROVED'||
  x.owner_scope_verified!==true||
  x.source_message_bound!==true||
  x.job_list_assignments_persisted!==true||
  x.source_qualification_still_required!==true||
  x.shift_execution_authorized!==false||
  x.original_job_created!==false||
  x.capability_installation_authorized!==false||
  x.production_changed!==false||
  !UUID.test(x.approval_id||'')||
  x.source_message_id!==msg||x.conversation_id!==proposal.conversation_id||
  x.source_content_sha256!==expectedContentSha256||
  x.role_count!==roles.length||
  x.task_count!==roles.reduce((n,r)=>n+r.tasks.length,0)||
  !Array.isArray(x.roles)||x.roles.length!==roles.length||
  x.roles.some((r,i)=>r.employee_name!==roles[i].employee_name||
   !Array.isArray(r.tasks)||r.tasks.length!==roles[i].tasks.length||
   r.tasks.some((task,j)=>task!==roles[i].tasks[j])))
  fail('DURABLE_ASSIGNMENT_RECEIPT_UNVERIFIED');
 return Object.freeze(x);
}
