// Read-only Chat activity. Authenticated owner; no browser-selected scope,
// model calls, worker dispatch, authority grant, or durable write.
import {authenticatedChatSession} from '../../src/reality-private-chat-auth-v0.1.js';
import {shiftDatabase,shiftRpc} from '../../src/reality-governed-shift-boundary-v1.js';
import {readCurrentContinuitySelfVisibility} from '../../src/reality-chat-self-visibility-v1.js';
import {projectChatContinuityActivity} from '../../src/reality-chat-continuity-activity-v1.js';
export const maxDuration=25;
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
  const [current,incidentReadback]=await Promise.all([
   readCurrentContinuitySelfVisibility({session,db}),
   shiftRpc(db,'reality_read_owner_shift_continuity_incidents_v1',{p_owner_id:ownerId},
    {timeoutMs:4500}).catch(()=>null)
  ]);
  if(!current)return res.status(503).json({ok:false,error:'CURRENT_CONTINUITY_READBACK_UNAVAILABLE'});
  const shifts=[...new Set(current.observations.slice(0,12).map(x=>x.current_operational_facts.shift_id))];
  const historyByShift=Object.fromEntries(await Promise.all(shifts.map(async shiftId=>[
   shiftId,await shiftRpc(db,'reality_read_final_loop_event_resume_shadow_v1',{p_shift_id:shiftId},
    {timeoutMs:4000}).catch(()=>null)
  ])));
  const data=projectChatContinuityActivity({current,incidentReadback,historyByShift,ownerId});
  if(!data)return res.status(503).json({ok:false,error:'CHAT_ACTIVITY_READBACK_UNVERIFIED'});
  return res.status(200).json({ok:true,...data});
 }catch{
  return res.status(503).json({ok:false,error:'CHAT_ACTIVITY_READBACK_UNAVAILABLE'});
 }
}
