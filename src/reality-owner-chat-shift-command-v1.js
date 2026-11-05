// Deterministic, narrow owner-command interpreter for the existing simple Chat.
// A user pressing Send on an explicit "run a 10-hour shift" is the owner start
// authorization. No model reply or passive conversation can authorize a shift.
// This recognizes only an immediate, one-time 8/10/12-hour action.
export const CHAT_SHIFT_COMMAND_VERSION='reality-owner-chat-shift-command-v1';
const HOUR_WORDS=Object.freeze({eight:8,ten:10,twelve:12});
const IMMEDIATE=/^(?:(?:reality\s*[,.:!]\s*)|(?:hey\s+reality\s*[,.:!]\s*))?(?:please\s+)?(?:run|start|begin|launch|schedule)\s+(?:(?:me\s+)?(?:an?\s+))?(eight|ten|twelve|8|10|12)(?:\s|-)+(?:hours?|hrs?)(?:\s|-)+(?:autonomous\s+|governed\s+|development\s+|employee\s+|work\s+|research\s+|software\s+){0,4}(?:shift|workday|work\s+day)\b/i;
const RECURRENCE=/\b(?:every\s+(?:day|weekday|week|month)|daily|weekly|monthly|recurring|repeat\s+(?:every|daily|weekly)|each\s+(?:day|week|month))\b/i;
const CONDITION=/\b(?:don't|do\s+not|never|without\s+starting|hypothetical|hypothetically|simulate|simulation|pretend|example|what\s+if)\b/i;
export function interpretSignedInChatShiftCommand(message){
 if(typeof message!=='string'||!message||message.length>6000)return null;
 const text=message.trim();
 if(RECURRENCE.test(text)||CONDITION.test(text))return null;
 const match=IMMEDIATE.exec(text);
 if(!match)return null;
 const value=match[1].toLowerCase();
 const hours=/^\d+$/.test(value)?Number(value):HOUR_WORDS[value];
 if(![8,10,12].includes(hours))return null;
 return Object.freeze({
  intent:'START_ONE_OWNER_AUTHORIZED_EMPLOYEE_SHIFT',
  duration_hours:hours,
  authorization_source:'EXPLICIT_SIGNED_IN_CHAT_SEND_ACTION',
  repeated_confirmations_required:false,
  installation_authorized:false,
  production_changed:false,
 });
}
export function safeShiftReadbackState(data,{requestedHours=null}={}){
 if(!data||data.ok!==true||!Array.isArray(data.shifts)||data.shifts.length>5)
  throw Error('SHIFT_CHAT_READBACK_UNVERIFIED');
 const active=data.shifts.filter(s=>
  ['QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK'].includes(s?.status));
 if(active.length>1)throw Error('SHIFT_CHAT_MULTIPLE_ACTIVE_SHIFTS_REQUIRE_REVIEW');
 if(active.length){
  const s=active[0];
  const start=Date.parse(s.planned_start_at),end=Date.parse(s.planned_end_at);
  if(!Number.isFinite(start)||!Number.isFinite(end)||!([8,10,12].includes((end-start)/3600000))||
     typeof s.shift_id!=='string'||!(/^[a-f0-9-]{36}$/i.test(s.shift_id)))
    throw Error('SHIFT_CHAT_ACTIVE_IDENTITY_NOT_VERIFIED');
  return Object.freeze({hasActive:true,shift_id:s.shift_id,duration_hours:(end-start)/3600000,
    status:s.status,matching_requested_hours:requestedHours===(end-start)/3600000});
 }
 return Object.freeze({hasActive:false});
}
