// Read-only cross-conversation claim boundary for each authenticated principal.
// A fresh conversation cannot erase a previously attempted provider effect
// for the SAME recurring work. Authority to run remains scoped to the exact
// new owner-approved action, but prior UNCERTAIN/VERIFIED effects are durable.
import {validUuid} from './reality-private-chat-store-v0.1.js';
import {resolveReliabilityBenchmarkDb} from './reality-reliability-db-boundary-v0.1.js';

export const PRINCIPAL_PRIOR_EFFECT_VERSION='reality-principal-prior-effect-v0.1';
const workIdOk=id=>/^work:[a-f0-9]{32}$/.test(String(id||''));
const fail=code=>{throw Error(code)};
async function read(db,params,{fetchImpl=fetch}={}){
 const url=new URL(db.url+'/rest/v1/universe_events');
 for(const [k,v] of Object.entries(params))url.searchParams.set(k,v);
 const r=await fetchImpl(url.toString(),{
  method:'GET',headers:{
   apikey:db.secretKey,Authorization:'Bearer '+db.secretKey,
   Accept:'application/json',
  },
 });
 if(!r.ok)fail('PRIOR_EFFECT_HISTORY_READBACK_FAILED_CLOSED');
 const parsed=await r.json().catch(()=>null);
 if(!Array.isArray(parsed))fail('PRIOR_EFFECT_HISTORY_INVALID_CLOSED');
 if(parsed.length>=100)
  fail('PRIOR_EFFECT_HISTORY_INCOMPLETE_CLOSED');
 return parsed;
}
export async function readPriorIssueEffectsForPrincipal({
 session,env=process.env,workKey,
 fetchImpl=fetch,
}={}){
 if(!validUuid(session?.user_id)||
  typeof workKey!=='string'||!workKey.startsWith('workflow-failure:')||
  workKey.length>300||env.VERCEL_ENV!=='preview')
  fail('PRIOR_EFFECT_PRINCIPAL_OR_WORK_SCOPE_INVALID');
 const db=resolveReliabilityBenchmarkDb(env);
 if(!db?.strictSecrets||!db.secretKey||
    db.url!==session?.config?.url||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  fail('PRIOR_EFFECT_ISOLATED_DATABASE_REQUIRED');
 const common={
  'provenance->>principal_id':'eq.'+session.user_id,
  select:'entity_type,payload,provenance,event_id',
  order:'assertion_time.asc,event_id.asc',limit:'100',
 };
 const handoffs=await read(db,{
  ...common,entity_type:'eq.personal_discovered_work_handoff',
  'payload->>work_key':'eq.'+workKey,
 },{fetchImpl});
 const scopedHandoffs=handoffs.filter(e=>
  e.entity_type==='personal_discovered_work_handoff'&&
  e.provenance?.principal_id===session.user_id&&
  e.payload?.work_key===workKey&&
  workIdOk(e.payload?.work_id)&&
  e.payload?.authority==='NOT_GRANTED');
 if(scopedHandoffs.length!==handoffs.length)
  fail('PRIOR_EFFECT_SOURCE_SCOPE_INVALID_CLOSED');
 if(!scopedHandoffs.length)return Object.freeze([]);
 const workIds=[...new Set(scopedHandoffs.map(e=>e.payload.work_id))];
 const outcomes=await read(db,{
  ...common,entity_type:'eq.personal_issue_execution_outcome',
  'payload->>work_id':'in.('+workIds.map(x=>'"'+x+'"').join(',')+')',
 },{fetchImpl});
 if(outcomes.some(e=>
  e.entity_type!=='personal_issue_execution_outcome'||
  e.provenance?.principal_id!==session.user_id||
  !workIds.includes(e.payload?.work_id)))
  fail('PRIOR_EFFECT_OUTCOME_SCOPE_INVALID_CLOSED');
 return Object.freeze([...scopedHandoffs,...outcomes]);
}
