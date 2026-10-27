// Reality autonomous shift admission + persisted Home projection.
// No model calls, external side effects, or inferred authorization.
import crypto from 'node:crypto';

export const AUTONOMOUS_SHIFT_CONTROL_VERSION = 'reality-autonomous-shift-control-v1.0';
const SLOT_MINUTES = 15;
const validTime=x=>/^([01]\d|2[0-3]):[0-5]\d$/.test(String(x));
const minutes=x=>{if(!validTime(x))throw Error('SHIFT_CLOCK_TIME_INVALID');const [h,m]=x.split(':').map(Number);return h*60+m;};
const slot=x=>Math.ceil(x/SLOT_MINUTES)*SLOT_MINUTES%1440;
const elapsed=(now,start)=>(now-start+1440)%1440;
export function validateCronCredential(req,secret){
 if(typeof secret!=='string'||secret.length<32)return {ok:false,reason:'CRON_SECRET_NOT_CONFIGURED',http:503};
 const value=req?.headers?.authorization;
 if(typeof value!=='string'||!value.startsWith('Bearer '))
  return {ok:false,reason:'CRON_AUTH_REQUIRED',http:401};
 const given=value.slice(7);
 if(!given||given.length!==secret.length)
  return {ok:false,reason:'CRON_AUTH_INVALID',http:401};
 const valid=crypto.timingSafeEqual(Buffer.from(given),Buffer.from(secret));
 return valid?{ok:true,reason:'CRON_AUTHENTICATED',http:200}:
  {ok:false,reason:'CRON_AUTH_INVALID',http:401};
}
export function authorizeShiftConfigWrite({existingConfig,principalId,bootstrapPrincipalId}={}){
 if(typeof principalId!=='string'||!principalId.trim())
  return {ok:false,reason:'SHIFT_SIGNED_OWNER_REQUIRED'};
 if(existingConfig){
  if(typeof existingConfig.updated_by!=='string'||!existingConfig.updated_by)
   return {ok:false,reason:'SHIFT_OWNER_NOT_ESTABLISHED'};
  return existingConfig.updated_by===principalId
   ?{ok:true,reason:'SIGNED_ORIGINAL_OWNER'}
   :{ok:false,reason:'SHIFT_OWNERSHIP_MISMATCH'};
 }
 // A brand-new anonymous session must never automatically own the global
 // cron and run up model charges. Bootstrap requires operator provisioning.
 return bootstrapPrincipalId&&bootstrapPrincipalId===principalId
  ?{ok:true,reason:'PROVISIONED_BOOTSTRAP_OWNER'}
  :{ok:false,reason:'SHIFT_BOOTSTRAP_OWNER_REQUIRED'};
}
// A manual run is an owner-authorized one-shot discovery, NOT a grant of work-execution authority.
export function authorizeManualShiftRun({config,principalId}={}){
 if(!config || config.enabled!==true)return {ok:false,reason:'SHIFT_NOT_ENABLED'};
 return authorizeShiftConfigWrite({existingConfig:config,principalId});
}
export function autonomousShiftSlot({config,now=new Date()}={}){
 if(!config||config.enabled!==true)return {status:'DISABLED',phase:null};
 if(!(now instanceof Date)||!Number.isFinite(now.valueOf()))
  throw Error('SHIFT_NOW_REQUIRED');
 const timeZone=config.timeZone||'America/New_York';
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{
  timeZone,hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',
  hour:'2-digit',minute:'2-digit',
 }).formatToParts(now).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
 const minuteNow=Number(parts.hour)%24*60+Number(parts.minute);
 const bucket=Math.floor(minuteNow/SLOT_MINUTES)*SLOT_MINUTES;
 const readiness=slot(minutes(config.readinessTime||'20:00'));
 const start=slot(minutes(config.shiftStart||'21:00'));
 const length=Number(config.shiftLength);
 if(![8,12].includes(length))throw Error('SHIFT_LENGTH_INVALID');
 let phase=null;
 if(bucket===readiness)phase='READINESS';
 else if(bucket===start)phase='SHIFT_START';
 else if(elapsed(bucket,start)<length*60)phase='OPERATING';
 const hour=String(Math.floor(bucket/60)).padStart(2,'0');
 const min=String(bucket%60).padStart(2,'0');
 return {status:phase?'DUE':'WAITING',phase,local:{
  ...parts,hour,minute:min,timeZone,
 },slot_minutes:SLOT_MINUTES,
  cron_delay_tolerated_minutes:minuteNow-bucket,
  scheduled_slot:parts.year+'-'+parts.month+'-'+parts.day+'T'+hour+':'+min+':00['+timeZone+']'};
}
function eligibleEvent(event,config){
 return event?.entity_type==='shift_result'&&event?.event_kind==='observation'&&
  event?.continuity_root_id===config?.continuity_root_id&&
  event?.worldline_id===config?.worldline_id&&
  event?.payload?.tick_id&&event?.payload?.evidence_summary&&
  typeof event?.assertion_time==='string';
}
// A saved shift's work is a proposal, NOT an executed or verified effect.
export function projectAutonomousShiftHome({events=[],config,principalId,scope}={}){
 if(!config||config.enabled!==true)return {status:'DISABLED',work:[],attention:[],recent_shifts:0};
 if(!principalId||config.updated_by!==principalId)
  return {status:'OWNER_SESSION_REQUIRED',work:[],attention:[],recent_shifts:0};
 if(!Array.isArray(events))throw Error('SHIFT_EVENTS_REQUIRED');
 if(!scope?.continuity_root_id||!scope?.worldline_id)
  throw Error('SHIFT_HOME_SCOPE_REQUIRED');
 const expected=scope;
 const seen=new Set();
 const ordered=events.filter(e=>eligibleEvent(e,expected)).sort(
  (a,b)=>String(b.assertion_time).localeCompare(String(a.assertion_time)));
 const shifts=ordered.filter(e=>{const id=e.payload.tick_id;
  if(seen.has(id))return false;seen.add(id);return true;});
 const rows=[],workIds=new Set();
 for(const shift of shifts.slice(0,8)){
  const list=shift.payload?.evidence_summary?.discovered_work;
  if(!Array.isArray(list))continue;
  for(const raw of list.slice(0,20)){
   if(!raw||typeof raw!=='object')continue;
   const id=String(raw.work_id||raw.work_key||raw.id||'').trim();
   if(!id||workIds.has(id))continue;
   workIds.add(id);
   rows.push({
    ...raw,work_id:id,
    status:'DISCOVERED',
    provenance_status:'PERSISTED_SHIFT_OBSERVATION_NOT_EXECUTION',
    source_shift_tick_id:shift.payload.tick_id,
    source_shift_event_id:shift.event_id,
    observed_at:shift.assertion_time,
    external_effects_executed:false,
   });
   if(rows.length>=20)break;
  }
  if(rows.length>=20)break;
 }
 const attention=rows.filter(w=>
  w.consequential===true||w.capability_authority?.disposition==='AWAITING_AUTHORITY'||
  w.proposed_next_action==='REQUEST_EXPLICIT_AUTHORITY');
 return {status:shifts.length?'RECORDED':'NO_RECORDED_SHIFT',
  latest_shift_at:shifts[0]?.assertion_time||null,
  latest_tick_id:shifts[0]?.payload?.tick_id||null,
  latest_cycle:shifts[0]?{
   tick_id:shifts[0].payload.tick_id,
   source_event_id:shifts[0].event_id,
   observed_at:shifts[0].assertion_time,
   phase:shifts[0].payload?.phase||null,
   discovered_work_count:Array.isArray(shifts[0].payload?.evidence_summary?.discovered_work)?
    shifts[0].payload.evidence_summary.discovered_work.length:0,
   recent_observation_count:Number.isSafeInteger(shifts[0].payload?.evidence_summary?.recent_observation_count)?
    shifts[0].payload.evidence_summary.recent_observation_count:null,
   full_shift_closed:false,verified_execution_count:0
  }:null,
  recent_shifts:shifts.length,work:rows,attention,
  verified_execution_count:0,
  verification_note:'Saved autonomous discovery is not proof of completed work or authorization',
 };
}
