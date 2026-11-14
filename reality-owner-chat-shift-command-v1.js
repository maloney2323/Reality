// Deterministic, narrow owner-command interpreter for the existing simple Chat.
// A user pressing Send on an explicit "run a 10-hour shift" is the owner start
// authorization. No model reply or passive conversation can authorize a shift.
// Explicit owner-selected 1–12-hour one-time actions; never recurrence.
export const CHAT_SHIFT_COMMAND_VERSION='reality-owner-chat-shift-command-v1';
const HOUR_WORDS=Object.freeze({one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12});
const IMMEDIATE=/^(?:(?:reality\s*[,.:!]\s*)|(?:hey\s+reality\s*[,.:!]\s*))?(?:please\s+)?(?:run|start|begin|launch|schedule)\s+(?:(?:me\s+)?(?:an?\s+))?(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d{1,2})(?:\s|-)+(?:hours?|hrs?)(?:\s|-)+(?:autonomous\s+|governed\s+|development\s+|employee\s+|work\s+|research\s+|software\s+){0,4}(?:shift|workday|work\s+day)\b/i;
// An explicit full shift means work until all exact original receipts exist,
// never authority to install a capability or replay another job.
const FULL_SHIFT=/^(?:(?:reality\s*[,.:!]\s*)|(?:hey\s+reality\s*[,.:!]\s*))?(?:please\s+)?(?:run|start|begin|launch)\s+(?:(?:riley(?:'s|’s)?\s+))?(?:(?:the|an?)\s+)?(?:full|entire|complete)\s+(?:engineering\s+)?(?:shift|workday|work\s+day)(?:\s+now)?[.!]?$/i;
// The selected, source-fingerprinted work queue is the scope; the user does
// not need to memorize a rigid "run an eight-hour..." phrase. These explicit
// imperative forms are ONLY interpreted following a signed-in Send action.
const CURRENT_WORK=/^(?:(?:hey\s+)?reality\s*[,.:!]\s*)?(?:please\s+)?(?:run|start|begin|launch)\s+(?:(?:riley(?:['’]s)?(?:\s+and\s+taylor(?:['’]s)?)?\s+)|(?:the\s+|my\s+|our\s+|your\s+|current\s+|this\s+))*(?:(?:combined|automation|automated|engineering|employee|original)\s+)*(?:shift|job\s*shift|jobshift|workday|work\s+day|jobs?|automation)(?:\s+now)?[.!]?$/i;
const OWNER_AUTHORIZATION=/^i\s+authorize\s+(?:(?:reality|riley\s+and\s+taylor)\s+to\s+)?(?:(?:start|run|begin|launch)\s+)?(?:(?:the|my|our|your|current|this)\s+)*(?:(?:combined|automation|automated|engineering|employee|original)\s+)*(?:shift|job\s*shift|jobshift|jobs?)(?:\s+now)?[.!]?$/i;
const UNTIL_RECEIPTS=/^(?:(?:hey\s+)?reality\s*[,.:!]\s*)?(?:please\s+)?(?:run|start|begin|launch)\s+(?:(?:the|my|our|your)\s+)?(?:(?:combined|employee|automation|original|riley(?:\s+and\s+taylor)?)\s+)*(?:jobs?|shift|work)\s+until\s+(?:all\s+)?(?:jobs?\s+are\s+)?(?:complete|completed|tested\s+and\s+verified|verified\s+and\s+receipted)(?:\s+and\s+receipted)?[.!]?$/i
const FUTURE=/\b(?:tomorrow|next\s+(?:week|month|day)|later|after\s+|when\s+|if\s+|only\s+if|once\s+)\b/i;
const RECURRENCE=/\b(?:every\s+(?:day|weekday|week|month)|daily|weekly|monthly|recurring|repeat\s+(?:every|daily|weekly)|each\s+(?:day|week|month))\b/i;
const CONDITION=/\b(?:don't|do\s+not|never|without\s+starting|hypothetical|hypothetically|simulate|simulation|pretend|example|what\s+if)\b/i;
export function interpretSignedInChatShiftCommand(message,{selectedHours=8}={}){
 if(typeof message!=='string'||!message||message.length>6000)return null;
 const text=message.trim();
 if(RECURRENCE.test(text)||CONDITION.test(text)||FUTURE.test(text))return null;
 const completionRequest=UNTIL_RECEIPTS.test(text);
 const full=FULL_SHIFT.test(text);
 const match=full||completionRequest?null:IMMEDIATE.exec(text);
 const current=!full&&!match&&!completionRequest&&
  (CURRENT_WORK.test(text)||OWNER_AUTHORIZATION.test(text));
 if(!full&&!match&&!current&&!completionRequest)return null;
 // Explicit N-hour commands remain legacy time-boxed requests.
 // Ordinary "start jobs / full shift / until done" means one
 // exact, frozen owner work batch until independently accepted receipts.
 const completionBound=completionRequest||full||current;
 // Hours remain a legacy planning input, never a completion deadline for
 // completion_bound=true; source fingerprint and owner warrant remain exact.
 const value=full?'eight':match?match[1].toLowerCase():null;
 const hours=value===null?selectedHours:
  /^\d+$/.test(value)?Number(value):HOUR_WORDS[value];
 if(!Number.isSafeInteger(hours)||hours<1||hours>12)return null;
 return Object.freeze({
  intent:'START_ONE_OWNER_AUTHORIZED_EMPLOYEE_SHIFT',
  duration_hours:completionBound?8:hours,
  completion_bound:completionBound,
  authorization_source:'EXPLICIT_SIGNED_IN_CHAT_SEND_ACTION',
  repeated_confirmations_required:false,
  installation_authorized:false,
  production_changed:false,
 });
}
export function safeShiftReadbackState(data,{requestedHours=null,now=Date.now()}={}){
 if(!data||data.ok!==true||!Array.isArray(data.shifts)||
    data.shifts.length>5||!Number.isFinite(now))
  throw Error('SHIFT_CHAT_READBACK_UNVERIFIED');
 // Status may remain AWAITING_EXACT_ORIGINAL_WORK after the exact shift
 // authorization timebox ends. That is historical unresolved evidence,
 // NOT permission to execute and NOT a reason to reject a different future
 // owner-authorized shift. Never resume an old globally claimed job here.
 const candidates=data.shifts.filter(s=>
  ['QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK'].includes(s?.status));
 const verified=candidates.map(s=>{
  const start=Date.parse(s.planned_start_at),end=Date.parse(s.planned_end_at);
  const completion_bound=s.planned_end_at==='infinity';
  if(!Number.isFinite(start)||
     (!completion_bound&&(!Number.isFinite(end)||
      !Number.isSafeInteger((end-start)/3600000)||
      (end-start)/3600000<1||(end-start)/3600000>12))||
     typeof s.shift_id!=='string'||
     !/^[a-f0-9-]{36}$/i.test(s.shift_id))
    throw Error('SHIFT_CHAT_ACTIVE_IDENTITY_NOT_VERIFIED');
  return {shift:s,start,end:completion_bound?Infinity:end,completion_bound};
 });
 const active=verified.filter(x=>x.end>now);
 if(active.length>1)throw Error('SHIFT_CHAT_MULTIPLE_ACTIVE_SHIFTS_REQUIRE_REVIEW');
 const expired_unclosed_shifts=verified.filter(x=>x.end<=now).length;
 if(active.length){
  const {shift:s,start,end}=active[0];
  return Object.freeze({hasActive:true,shift_id:s.shift_id,
   duration_hours:Number.isFinite(end)?(end-start)/3600000:null,
   completion_bound:end===Infinity,
   completion_condition:end===Infinity?
    'ALL_SELECTED_JOBS_INDEPENDENTLY_VERIFIED_AND_RECEIPTED':null,
   status:s.status,
   matching_requested_hours:end===Infinity?true:
    requestedHours===(end-start)/3600000,
   expired_unclosed_shifts});
 }
 return Object.freeze({hasActive:false,expired_unclosed_shifts});
}


// Restore the already-existing Chat -> authenticated shift-controller path to
// the main /chat page. The first GET is an independent owner-scoped readback.
// An active shift is *never* authorized again or re-intaken by this helper.
// A new shift only starts on a direct, explicit, signed-in Send action,
// using the same frozen draft fingerprint and existing batch-intake endpoint.
// No model-generated instructions, inferred intent, or install permissions.
export async function resolveExistingSignedInChatShift(command,{
 conversationId,fetchImpl=fetch,now=Date.now()
}={}){
 const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
 const HASH=/^sha256:[a-f0-9]{64}$/;
 if(command?.intent!=='START_ONE_OWNER_AUTHORIZED_EMPLOYEE_SHIFT'||
    command.authorization_source!=='EXPLICIT_SIGNED_IN_CHAT_SEND_ACTION'||
    command.installation_authorized!==false||
    command.production_changed!==false||
    !Number.isSafeInteger(command.duration_hours)||
    command.duration_hours<1||command.duration_hours>12||
    !UUID.test(conversationId||'')||typeof fetchImpl!=='function')
  throw Error('CHAT_SHIFT_EXPLICIT_OWNER_COMMAND_REQUIRED');
 const SHIFT='/api/reality/personal-governed-employee-shift';
 const fetchJSON=async(path,options={})=>{
  const response=await fetchImpl(path,{
   method:'GET',credentials:'same-origin',cache:'no-store',
   signal:AbortSignal.timeout(12000),...options
  });
  const data=await response.json().catch(()=>null);
  if(!response.ok||data?.ok!==true)
   throw Error('CHAT_SHIFT_AUTHENTICATED_CONTROLLER_UNAVAILABLE');
  return data;
 };
 const existing=await fetchJSON(SHIFT);
 const current=safeShiftReadbackState(existing,{now,
  requestedHours:command.duration_hours});
 if(current.hasActive){
  return Object.freeze({
   status:'EXISTING_SIGNED_IN_SHIFT_ALREADY_AUTHORIZED',
   shift_id:current.shift_id,shift_status:current.status,
   completion_bound:current.completion_bound,
   new_shift_started:false,owner_authorization_reused:true,
   installation_authorized:false,production_changed:false,
   worker_execution_verified:false,
  });
 }
 // The old controller, not the model or message text, owns source choice.
 const draftReply=await fetchJSON(SHIFT+'?hours='+command.duration_hours,
  {signal:AbortSignal.timeout(30000)});
 const draft=draftReply.requested_shift_draft;
 const orders=draft?.combined_employee_work_orders;
 if(draft?.status!=='DRAFT_ONLY_NOT_SCHEDULED_OR_AUTHORIZED'||
    draft.shift_duration_hours!==command.duration_hours||
    draft.shift_duration_minutes!==command.duration_hours*60||
    !HASH.test(draft.expected_fingerprint||'')||
    draft.job_started!==false||draft.installation_authorized!==false||
    draft.read_only!==true||draft.production_changed!==false||
    orders?.version!=='reality-riley-taylor-combined-work-orders-v1'||
    orders.plan_fingerprint!==draft.expected_fingerprint||
    !Number.isSafeInteger(orders.task_count)||orders.task_count<1||
    orders.task_count>4||orders.execution_started!==false||
    orders.installation_authorized!==false||
    orders.production_changed!==false)
  throw Error('CHAT_SHIFT_FROZEN_OWNER_DRAFT_NOT_READY');
 const created=await fetchJSON(SHIFT,{
  method:'POST',
  headers:{'content-type':'application/json'},
  body:JSON.stringify({
   action:'AUTHORIZE_EXACT_EMPLOYEE_SHIFT',
   requested_hours:command.duration_hours,
   ...(command.completion_bound?{completion_bound:true}:{}),
   expected_fingerprint:draft.expected_fingerprint,
   planned_start_at:new Date(now+10000).toISOString()
  }),signal:AbortSignal.timeout(50000)
 });
 if(!['SHIFT_DURABLY_AUTHORIZED','SHIFT_ALREADY_AUTHORIZED'].includes(created.status)||
    !UUID.test(created.shift_id||'')||
    created.initial_authorization_recorded!==true||
    created.installation_authorized!==false||
    created.production_changed!==false||
    created.worker_dispatch_verified!==false||
    created.start_confirmation?.status!=='OWNER_WORK_BATCH_AUTHORIZATION_CONFIRMED'||
    created.start_confirmation.shift_id!==created.shift_id||
    !Number.isFinite(Date.parse(created.start_confirmation.authorized_at||''))||
    created.start_confirmation.worker_execution_verified!==false||
    created.start_confirmation.original_job_completed!==false||
    !Array.isArray(created.start_confirmation.selected_sources))
  throw Error('CHAT_SHIFT_OWNER_AUTHORIZATION_RECEIPT_NOT_VERIFIED');
 // Re-read the database before any next-stage intake. An uncertain effect
 // can never turn into an automatic second Start or model authorization.
 const checked=await fetchJSON(SHIFT);
 const record=(checked.shifts||[]).find(s=>s.shift_id===created.shift_id);
 if(!record||record.plan_fingerprint!==draft.expected_fingerprint||
    (command.completion_bound?
      record.planned_end_at!=='infinity':
      Date.parse(record.planned_end_at)-Date.parse(record.planned_start_at)!==
       command.duration_hours*3600000))
  throw Error('CHAT_SHIFT_CREATED_BUT_READBACK_UNVERIFIED_NO_REPEAT');
 let batch_verified=false,batch_status='BATCH_INTAKE_REQUIRES_READBACK';
 try{
  const admitted=await fetchJSON('/api/reality/personal-riley-shift-original-batch',{
   method:'POST',headers:{'content-type':'application/json'},
   body:JSON.stringify({
    action:'ADMIT_QUALIFIED_WORK_IN_EXACT_AUTHORIZED_RILEY_SHIFT',
    conversation_id:conversationId,shift_id:created.shift_id,
    expected_fingerprint:draft.expected_fingerprint
   }),signal:AbortSignal.timeout(110000)
  });
  batch_verified=admitted.shift_id===created.shift_id&&
   admitted.shift_fingerprint===draft.expected_fingerprint&&
   admitted.one_authorization_for_exact_shift===true&&
   admitted.no_per_job_buttons_required===true&&
   admitted.installation_authorized===false&&
   admitted.original_job_completed===false&&
   admitted.final_receipt_recorded===false&&
   admitted.production_changed===false&&
   Array.isArray(admitted.outcomes)&&admitted.outcomes.length<=4;
  batch_status=batch_verified?'EXACT_AUTHORIZED_SHIFT_BATCH_INTAKE_VERIFIED':
   'BATCH_INTAKE_REQUIRES_READBACK';
 }catch{/* An uncertain batch effect must not trigger a duplicate shift. */}
 return Object.freeze({
  status:'EXACT_SHIFT_OWNER_AUTHORIZATION_DURABLY_VERIFIED',
  shift_id:created.shift_id,shift_status:record.status,
  completion_bound:command.completion_bound===true,
  new_shift_started:true,owner_authorization_reused:false,
  batch_status,batch_verified,
  installation_authorized:false,production_changed:false,
  worker_execution_verified:false,
 });
}
