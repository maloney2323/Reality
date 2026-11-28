// Read-only Chat activity. Authenticated owner; no browser-selected scope,
// model calls, worker dispatch, authority grant, or durable write.
import {authenticatedChatSession} from '../../src/reality-private-chat-auth-v0.1.js';
import {shiftDatabase,shiftRpc} from '../../src/reality-governed-shift-boundary-v1.js';
import {readCurrentContinuitySelfVisibility} from '../../src/reality-chat-self-visibility-v1.js';
import {projectChatContinuityActivity} from '../../src/reality-chat-continuity-activity-v1.js';
export const maxDuration=25;
// One bounded read of the exact current canonical heads already verified by
// the authenticated owner guard. No browser-selected roots, replay or writes.
async function readTerminalHeadRows({db,ownerId,current}){
 if(!db?.strictSecrets||db.url!=='https://'+db.project+'.supabase.co'||
  !/^[a-f0-9-]{36}$/i.test(ownerId||'')||!Array.isArray(current?.observations))return null;
 const heads=current.observations.slice(0,12).map(x=>x.current_operational_facts)
  .filter(x=>x.continuity_revision>1&&/^[a-f0-9-]{36}$/i.test(x.continuity_root_id||'')&&/^sha256:[a-f0-9]{64}$/.test(x.continuity_head_sha256||''));
 if(!heads.length)return [];
 const params=new URLSearchParams({
  select:'event_id,continuity_root_id,parent_event_id,entity_type,event_kind,epistemic_status,lineage_hash,content_hash,payload,provenance,assertion_time',
  entity_type:'eq.reality_final_loop_terminal_technical_observation_v1',
  'payload->>owner_id':'eq.'+ownerId,
  continuity_root_id:'in.('+[...new Set(heads.map(x=>x.continuity_root_id))].join(',')+')',
  lineage_hash:'in.('+[...new Set(heads.map(x=>x.continuity_head_sha256.slice(7)))].join(',')+')',
  limit:'12'
 });
 try{
  const r=await fetch(db.url+'/rest/v1/universe_events?'+params,{method:'GET',cache:'no-store',redirect:'error',
   headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,accept:'application/json'},
   signal:AbortSignal.timeout(2500)});
  if(!r.ok)return null;
  const rows=await r.json();return Array.isArray(rows)&&rows.length<=12?rows:null;
 }catch{return null}
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET'||Object.keys(req.query||{}).length)
  return res.status(405).json({ok:false,error:'CHAT_ACTIVITY_READ_ONLY'});
 try{
  const session=await authenticatedChatSession(req,res);
  if(!session)return res.status(401).json({ok:false,error:'CHAT_SIGN_IN_REQUIRED'});
  const db=shiftDatabase(),ownerId=session.user_id;
  if(process.env.VERCEL_ENV!=='preview'||db.url!==session.config?.url)
   return res.status(403).json({ok:false,error:'CHAT_ACTIVITY_OWNER_SCOPE_UNVERIFIED'});
  const [current,incidentReadback,finalReadback]=await Promise.all([
   readCurrentContinuitySelfVisibility({session,db}),
   shiftRpc(db,'reality_read_owner_shift_continuity_incidents_v1',{p_owner_id:ownerId},
    {timeoutMs:4500}).catch(()=>null),
   shiftRpc(db,'reality_read_owner_final_receipts_v1',{p_owner_id:ownerId},
    {timeoutMs:4500}).catch(()=>null)
  ]);
  if(!current)return res.status(503).json({ok:false,error:'CURRENT_CONTINUITY_READBACK_UNAVAILABLE'});
  const shifts=[...new Set(current.observations.slice(0,12).map(x=>x.current_operational_facts.shift_id))];
  const [historyByShift,terminalRows]=await Promise.all([
   Promise.all(shifts.map(async shiftId=>[
    shiftId,await shiftRpc(db,'reality_read_final_loop_event_resume_shadow_v1',{p_shift_id:shiftId},
     {timeoutMs:4000}).catch(()=>null)
   ])).then(Object.fromEntries),
   readTerminalHeadRows({db,ownerId,current})
  ]);
  const data=projectChatContinuityActivity({current,incidentReadback,finalReadback,historyByShift,terminalRows,ownerId});
  if(!data)return res.status(503).json({ok:false,error:'CHAT_ACTIVITY_READBACK_UNVERIFIED'});
  return res.status(200).json({ok:true,...data});
 }catch{
  return res.status(503).json({ok:false,error:'CHAT_ACTIVITY_READBACK_UNAVAILABLE'});
 }
}
