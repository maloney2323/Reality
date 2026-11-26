// Preparation-only transport from an existing canonical signed wake to the
// independently deployed release controller. Never transmits a provider or
// operator credential; never authorizes activation or starts a new shift.
import {createHmac,timingSafeEqual} from 'node:crypto';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^sha256:[a-f0-9]{64}$/;
const HOST=/^[a-z0-9-]{8,180}\.vercel\.app$/;
const ID=/^dpl_[A-Za-z0-9_-]{8,75}$/;
const PATH='/api/reality/governed-worker-release-control-plane';
const INTENT='SIGNED_WAKE_PREPARE_EXACT_RELEASE';
const safe=(status,more={})=>Object.freeze({status,...more,release_activated:false,
 owner_approval_granted:false,original_job_completed:false,production_changed:false});
function enabled(env,db){
 return env.VERCEL_ENV==='preview'&&env.REALITY_RELEASE_CONTROL_RUNTIME_TOPOLOGY==='CANONICAL_BENCHMARK_PREVIEW'&&
  env.REALITY_RELEASE_EVENT_PREPARATION_ENABLED==='true'&&db?.strictSecrets===true&&
  db.project===env.REALITY_RELEASE_CONTROL_DB_PROJECT_REF&&db.project===env.REALITY_FINAL_LOOP_SHARED_BENCHMARK_PROJECT_REF&&
  db.project===env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF&&db.project!==env.REALITY_FINAL_LOOP_PR_SOURCE_PLANS_ISOLATED_PROJECT_REF&&
  env.REALITY_FINAL_LOOP_CHILD_EXECUTION_ENABLED!=='true'&&env.REALITY_FINAL_LOOP_PARENT_DELIVERY_ENABLED!=='true'&&
  /^[a-f0-9]{64}$/.test(env.REALITY_EMPLOYEE_SHIFT_WORKER_TOKEN||'');
}
const signature=(env,payload)=>createHmac('sha256',Buffer.from(env.REALITY_EMPLOYEE_SHIFT_WORKER_TOKEN,'hex'))
 .update('reality-release-preparation-v1\n'+payload).digest('hex');
function valid(p,env,now){
 return p&&Object.keys(p).sort().join(',')==='event_id,head,issued_at,lease_id,owner_id,plan,revision,running_release,shift_id,target_deployment,target_release,worker_run_id'&&
  [p.event_id,p.lease_id,p.owner_id,p.shift_id,p.worker_run_id].every(x=>UUID.test(x||''))&&
  p.owner_id===env.REALITY_FINAL_LOOP_SHARED_BENCHMARK_OWNER_ID&&p.shift_id===env.REALITY_FINAL_LOOP_SHARED_BENCHMARK_SHIFT_ID&&
  HASH.test(p.plan||'')&&HASH.test(p.head||'')&&Number.isSafeInteger(p.revision)&&p.revision>0&&
  SHA.test(p.running_release||'')&&SHA.test(p.target_release||'')&&p.running_release!==p.target_release&&
  p.target_release===env.REALITY_SIGNED_WORKER_TARGET_RELEASE_SHA&&ID.test(p.target_deployment||'')&&
  Number.isSafeInteger(p.issued_at)&&p.issued_at<=now+5000&&p.issued_at>=now-90000;
}
export function authenticateSignedReleasePreparation({body,env,db,now=Date.now()}={}){
 if(!enabled(env,db)||body?.intent!==INTENT||Object.keys(body).sort().join(',')!=='intent,payload,signature'||
  typeof body.payload!=='string'||body.payload.length>2000||!/^[a-f0-9]{64}$/.test(body.signature||''))return null;
 if(!timingSafeEqual(Buffer.from(body.signature,'hex'),Buffer.from(signature(env,body.payload),'hex')))return null;
 try{
  const p=JSON.parse(body.payload);
  if(!valid(p,env,now)||p.target_deployment!==env.VERCEL_DEPLOYMENT_ID||
   p.target_release!==env.VERCEL_GIT_COMMIT_SHA)return null;
  return Object.freeze(p);
 }catch{return null;}
}
export async function handoffSignedReleasePreparation({env=process.env,db,direction:d,wake,workerRunId,leaseId,
 fetchImpl=fetch,now=Date.now}={}){
 if(!enabled(env,db)||d?.status!=='GOVERNED_RELEASE_DIRECTION_DRIFT_OBSERVED'||d.read_only!==true||
  d.release_activated!==false||d.production_changed!==false||d.owner_approval_granted!==false||
  d.authoritative_database!==db.project||d.owner_id!==wake?.owner_id||d.shift_id!==wake?.shift_id||
  d.plan_fingerprint!==wake?.plan_fingerprint||wake?.kind!=='RESUME'||
  d.observed_alias_release_sha!==env.VERCEL_GIT_COMMIT_SHA||wake.release_sha!==env.VERCEL_GIT_COMMIT_SHA||
  d.configured_target_release_sha!==env.REALITY_SIGNED_WORKER_TARGET_RELEASE_SHA)
  return safe('SIGNED_RELEASE_PREPARATION_NOT_DUE');
 const host=env.REALITY_RELEASE_PREPARATION_CANDIDATE_HOST,id=env.REALITY_RELEASE_PREPARATION_CANDIDATE_DEPLOYMENT_ID;
 if(!HOST.test(host||'')||host===env.REALITY_SIGNED_WORKER_STABLE_ALIAS||host===env.VERCEL_URL||!ID.test(id||'')||
  id===env.VERCEL_DEPLOYMENT_ID)return safe('SIGNED_RELEASE_PREPARATION_CANDIDATE_NOT_PINNED');
 const p={event_id:wake.event_id,head:d.continuity_head_sha256,issued_at:now(),lease_id:leaseId,owner_id:d.owner_id,
  plan:d.plan_fingerprint,revision:d.continuity_revision,running_release:wake.release_sha,shift_id:d.shift_id,
  target_deployment:id,target_release:d.configured_target_release_sha,worker_run_id:workerRunId};
 if(!valid(p,env,p.issued_at))return safe('SIGNED_RELEASE_PREPARATION_EVENT_UNVERIFIED');
 // Independently read the immutable candidate identity before sending a
 // short-lived signed request. The signature is intent-specific, not bearer authority.
 try{
  const response=await fetchImpl('https://api.vercel.com/v13/deployments/'+encodeURIComponent(id)+'?teamId='+encodeURIComponent(env.REALITY_VERIFIED_VERCEL_TEAM_ID),{
   method:'GET',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(5000),
   headers:{Authorization:'Bearer '+env.REALITY_VERIFIED_VERCEL_RELEASE_API_TOKEN,Accept:'application/json'}});
  if(!response.ok)throw Error('candidate read');
  const raw=await response.json(),v=raw.deployment??raw;
  if(v.id!==id||v.url!==host||v.projectId!==env.REALITY_VERIFIED_VERCEL_PROJECT_ID||
   v.target==='production'||(v.readyState??v.state)!=='READY'||v.meta?.githubCommitSha!==p.target_release||
   v.meta?.githubCommitRef!==d.configured_target_release_ref||
   v.meta?.githubOrg+'/'+v.meta?.githubRepo!==env.REALITY_VERIFIED_GITHUB_REPOSITORY)
   return safe('SIGNED_RELEASE_PREPARATION_CANDIDATE_IDENTITY_UNVERIFIED');
 }catch{return safe('SIGNED_RELEASE_PREPARATION_CANDIDATE_READ_UNAVAILABLE');}
 const payload=JSON.stringify(p);
 try{
  const r=await fetchImpl('https://'+host+PATH,{method:'POST',redirect:'error',cache:'no-store',
   signal:AbortSignal.timeout(18000),headers:{'content-type':'application/json',accept:'application/json',
    ...(env.VERCEL_AUTOMATION_BYPASS_SECRET?{'x-vercel-protection-bypass':env.VERCEL_AUTOMATION_BYPASS_SECRET}:{})},
   body:JSON.stringify({intent:INTENT,payload,signature:signature(env,payload)})});
  const x=await r.json();
  if(x?.production_changed!==false||x.original_job_completed!==false||x.release_switch_attempted!==false)
   throw Error('unverified');
  const q=x.release_preparation;
  if(x.status==='SIGNED_RELEASE_EXACT_OWNER_PACKET_PREPARED'&&q?.status===x.status&&
   q.shift_id===p.shift_id&&q.release_sha===p.target_release&&q.owner_id===p.owner_id&&UUID.test(q.request_id||'')&&
   HASH.test(q.proposal_fingerprint||'')&&q.runtime_scope?.continuity_head_sha256===p.head&&
   q.runtime_scope?.continuity_revision===p.revision&&q.owner_approval_granted===false&&q.release_changed===false)
   return safe(x.status,{request_id:q.request_id,proposal_fingerprint:q.proposal_fingerprint});
  if(x.status==='GOVERNED_RELEASE_EXISTING_EXACT_APPROVAL_READ')return safe(x.status);
  return safe('SIGNED_RELEASE_PREPARATION_CONTROLLER_BLOCKED',{controller_status:
   typeof x.status==='string'&&/^[A-Z_]{3,120}$/.test(x.status)?x.status:null});
 }catch{return safe('SIGNED_RELEASE_PREPARATION_RESPONSE_UNCERTAIN_NO_REPLAY');}
}
