// Durable, same-original-job governed trigger. Existing owner-confirmed work
// may initiate investigation automatically; it cannot authorize installation.
// Database RPCs independently re-read owner goal epoch and source Continuity.
import {resolveReliabilityBenchmarkDb}
 from './reality-reliability-db-boundary-v0.1.js';
import {validUuid} from './reality-private-chat-store-v0.1.js';

export const GOVERNED_AUTO_TRIGGER_VERSION='reality-governed-auto-trigger-v1.0';
const WORK=/^work:[a-f0-9]{32}$/;
const SHA=/^[a-f0-9]{40}$/;
const fail=code=>{throw Error('GOVERNED_AUTO_TRIGGER_'+code)};
export function capabilityFromSourcePath(path){
 if(typeof path!=='string'||
    !/^src\/reality-extensions\/[a-z0-9._/-]+\.mjs$/.test(path)||
    path.includes('//')||path.split('/').includes('..'))
  fail('SOURCE_PATH_UNVERIFIED');
 const name=path.split('/').at(-1).replace(/\.mjs$/,'').replace(/[._-]+/g,'_');
 if(!/^[a-z][a-z0-9_]{2,90}$/.test(name))fail('SOURCE_CAPABILITY_ID_INVALID');
 return name;
}
function database({session,env}){
 if(env.VERCEL_ENV!=='preview'||
    env.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true'||
    !validUuid(session?.user_id)||
    session.config?.url!=='https://'+env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF+'.supabase.co')
  fail('AUTHENTICATED_ISOLATED_PREVIEW_ONLY');
 const db=resolveReliabilityBenchmarkDb(env);
 if(!db?.strictSecrets||!db.secretKey||db.url!==session.config.url||
     db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  fail('TRUSTED_DATABASE_BOUNDARY_REQUIRED');
 return db;
}
async function call(db,name,args,fetchImpl=fetch){
 const r=await fetchImpl(db.url+'/rest/v1/rpc/'+name,{
  method:'POST',redirect:'error',cache:'no-store',headers:{
   apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
   'content-type':'application/json',accept:'application/json'},
  body:JSON.stringify(args),
 });
 if(!r.ok)fail('DATABASE_RPC_REJECTED_'+r.status);
 const result=await r.json().catch(()=>null);
 if(result===null||typeof result!=='object')fail('RPC_RECEIPT_REQUIRED');
 return result;
}
export async function registerOriginalJobCapabilityAutoTrigger({
 session,conversationId,originalWorkId,originalWorkEventId,
 goalTransitionEventId,evidence,
 env=process.env,invoke=call,
}={}){
 const db=database({session,env});
 if(!validUuid(conversationId)||!WORK.test(originalWorkId)||
    !validUuid(originalWorkEventId)||!validUuid(goalTransitionEventId)||
    evidence?.independently_verified!==true||
    !SHA.test(evidence.source_sha)||
    !Number.isSafeInteger(evidence.original_provider_failed_run_id)||
    evidence.original_provider_failed_run_id<1)
  fail('PINNED_INDEPENDENT_ORIGINAL_FAILURE_REQUIRED');
 const capabilityId=capabilityFromSourcePath(evidence.source_path);
 const response=await invoke(db,'reality_enqueue_governed_auto_trigger_v1',{
  p_owner_id:session.user_id,
  p_conversation_id:conversationId,
  p_original_work_id:originalWorkId,
  p_original_work_event_id:originalWorkEventId,
  p_goal_transition_event_id:goalTransitionEventId,
  p_capability_id:capabilityId,
 });
 if(!validUuid(response.trigger_id)||
    response.original_work_id!==originalWorkId||
    response.source_event_id!==originalWorkEventId||
    !['PENDING_VERIFIED_GAP_REOBSERVATION',
      'CLAIMED_FOR_INDEPENDENT_INVESTIGATION',
      'EVIDENCE_RECONCILIATION_REQUIRED'].includes(response.phase)||
    response.installation_authorized!==false||
    response.original_job_completed!==false||
    response.production_changed!==false||
    response.new_customer_job_created!==false)
  fail('DURABLE_PROVIDER_RECEIPT_MISMATCH');
 return Object.freeze({
  status:response.phase,trigger_id:response.trigger_id,
  original_work_id:originalWorkId,
  capability_id:capabilityId,
  owner_action_required:false,new_customer_job_created:false,
  installation_authorized:false,original_job_completed:false,
  production_changed:false,
 });
}
export async function claimOriginalJobCapabilityAutoTrigger({
 session,triggerId,originalWorkId,env=process.env,invoke=call,
}={}){
 const db=database({session,env});
 if(!validUuid(triggerId)||!WORK.test(originalWorkId))
  fail('CLAIM_SCOPE_INVALID');
 const result=await invoke(db,'reality_claim_governed_auto_trigger_v1',{
  p_trigger_id:triggerId,p_owner_id:session.user_id,
  p_original_work_id:originalWorkId,
 });
 if(result.trigger_id!==triggerId||!validUuid(result.claim_id)||
    result.original_work_id!==originalWorkId||
    !validUuid(result.original_work_event_id)||
    result.phase!=='CLAIMED_FOR_INDEPENDENT_INVESTIGATION'||
    result.reobserve_before_generation!==true||
    result.installation_authorized!==false||
    result.original_job_completed!==false||
    result.production_changed!==false||
    result.new_customer_job_created!==false)
  fail('CLAIMED_TRUST_BOUNDARY_INVALID');
 return Object.freeze({
  ...result,source:'SERVICE_ROLE_ATOMIC_CLAIM',
  model_generation_authorized:false,
  installation_authorized:false,original_job_completed:false,
 });
}
