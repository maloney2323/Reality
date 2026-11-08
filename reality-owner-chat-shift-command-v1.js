// Deterministic, narrow owner-command interpreter for the existing simple Chat.
// A user pressing Send on an explicit "run a 10-hour shift" is the owner start
// authorization. No model reply or passive conversation can authorize a shift.
// Explicit owner-selected 1–12-hour one-time actions; never recurrence.
export const CHAT_SHIFT_COMMAND_VERSION='reality-owner-chat-shift-command-v1';
const HOUR_WORDS=Object.freeze({one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12});
const IMMEDIATE=/^(?:(?:reality\s*[,.:!]\s*)|(?:hey\s+reality\s*[,.:!]\s*))?(?:please\s+)?(?:run|start|begin|launch|schedule)\s+(?:(?:me\s+)?(?:an?\s+))?(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d{1,2})(?:\s|-)+(?:hours?|hrs?)(?:\s|-)+(?:autonomous\s+|governed\s+|development\s+|employee\s+|work\s+|research\s+|software\s+){0,4}(?:shift|workday|work\s+day)\b/i;
// Explicit one-time full shift means the existing 8-hour owner shift,
// never indefinite, recurring or authority over unapproved original jobs.
const FULL_SHIFT=/^(?:(?:reality\s*[,.:!]\s*)|(?:hey\s+reality\s*[,.:!]\s*))?(?:please\s+)?(?:run|start|begin|launch)\s+(?:(?:riley(?:'s|’s)?\s+))?(?:(?:the|an?)\s+)?(?:full|entire|complete)\s+(?:engineering\s+)?(?:shift|workday|work\s+day)(?:\s+now)?[.!]?$/i;
// The selected, source-fingerprinted work queue is the scope; the user does
// not need to memorize a rigid "run an eight-hour..." phrase. These explicit
// imperative forms are ONLY interpreted following a signed-in Send action.
const CURRENT_WORK=/^(?:(?:hey\s+)?reality\s*[,.:!]\s*)?(?:please\s+)?(?:run|start|begin|launch)\s+(?:(?:riley(?:['’]s)?(?:\s+and\s+taylor(?:['’]s)?)?\s+)|(?:the\s+|my\s+|our\s+|your\s+|current\s+|this\s+))*(?:(?:combined|automation|automated|engineering|employee|original)\s+)*(?:shift|job\s*shift|jobshift|workday|work\s+day|jobs?|automation)(?:\s+now)?[.!]?$/i;
const OWNER_AUTHORIZATION=/^i\s+authorize\s+(?:(?:reality|riley\s+and\s+taylor)\s+to\s+)?(?:(?:start|run|begin|launch)\s+)?(?:(?:the|my|our|your|current|this)\s+)*(?:(?:combined|automation|automated|engineering|employee|original)\s+)*(?:shift|job\s*shift|jobshift|jobs?)(?:\s+now)?[.!]?$/i;
const UNTIL_RECEIPTS=/^(?:(?:hey\\s+)?reality\\s*[,.:!]\\s*)?(?:please\\s+)?(?:run|start|begin|launch)\\s+(?:(?:the|my|our|your)\\s+)?(?:(?:combined|employee|automation|original|riley(?:\\s+and\\s+taylor)?)\\s+)*(?:jobs?|shift|work)\\s+until\\s+(?:all\\s+)?(?:jobs?\\s+are\\s+)?(?:complete|completed|tested\\s+and\\s+verified|verified\\s+and\\s+receipted)(?:\\s+and\\s+receipted)?[.!]?$/i;
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
 // An explicit duration wins. An unqualified "start the job/shift" uses the
 // owner-selected bounded window and exact verified source fingerprint.
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
