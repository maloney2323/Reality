// Reality Governed Execution Wake Protocol v1 — isolated-preview contract.
// The JWT authenticates DELIVERY only. It never grants execution authority.
// The worker must independently compare current authoritative ledger state and
// reserve execution atomically before touching a capability or external system.
import {randomUUID,sign,verify,timingSafeEqual} from 'node:crypto';

const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const WORK=/^work:[a-f0-9]{32}$/;
const HASH=/^[a-f0-9]{64}$/;
const ISSUER='reality-governed-wake-v1',AUDIENCE='reality-isolated-worker-v1';
const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
const fail=reason=>{throw Error('REALITY_WAKE_'+reason)};
const equal=(a,b)=>{
 const x=Buffer.from(String(a),'utf8'),y=Buffer.from(String(b),'utf8');
 return x.length===y.length&&timingSafeEqual(x,y);
};
export function assertWakeIdentity({approval_id,original_work_id,artifact_sha256,
  pre_state_hash,valid_time,target_environment,goal_transition_event_id,
  provider_failure_hash}={}){
 if(!UUID.test(approval_id)||!WORK.test(original_work_id)||
    !HASH.test(artifact_sha256)||!HASH.test(pre_state_hash)||
    !UUID.test(goal_transition_event_id)||!HASH.test(provider_failure_hash)||
    target_environment!=='ISOLATED_PREVIEW'||
    !Number.isFinite(Date.parse(valid_time||'')))
   fail('EXACT_APPROVAL_SNAPSHOT_REQUIRED');
 return Object.freeze({approval_id,original_work_id,artifact_sha256,
  pre_state_hash,valid_time,target_environment,goal_transition_event_id,
  provider_failure_hash});
}

// Compare only decision-critical fields; unrelated or noisy telemetry does
// not invalidate a valid approval. Missing evidence is a hard block.
export function assessMaterialWakeDrift(approvalSnapshot,current){
 const a=assertWakeIdentity(approvalSnapshot);
 if(!current||current.source_verified!==true||
    current.approval_origin!=='AUTHENTICATED_OWNER_EXPLICIT_ACTION'||
    current.approval_consumed!==false||current.original_job_settled!==false)
  return Object.freeze({status:'EVIDENCE_UNAVAILABLE_BLOCKED',governance_ready:false});
 const fields=['original_work_id','artifact_sha256','pre_state_hash',
  'goal_transition_event_id','provider_failure_hash','target_environment','valid_time'];
 const changed=fields.filter(field=>!equal(a[field],current[field]));
 if(changed.length)
  return Object.freeze({status:'STALE_APPROVAL_BLOCKED',
   changed_fields:changed,governance_ready:false});
 // The worker still needs a database-atomic, single-use execution claim.
 return Object.freeze({status:'FRESH_EVIDENCE_RECHECKED',
  governance_ready:false,atomic_execution_reservation_required:true});
}

export function mintDeliveryWarrant({snapshot,fence,privateKey,kid,now=Date.now(),
  nonce=randomUUID(),ttlSeconds=90}={}){
 const s=assertWakeIdentity(snapshot);
 if(!Number.isSafeInteger(fence)||fence<1||!privateKey||
    !/^[a-z0-9_-]{3,64}$/i.test(kid||'')||!UUID.test(nonce)||
    !Number.isSafeInteger(now)||now<1||
    !Number.isInteger(ttlSeconds)||ttlSeconds<10||ttlSeconds>120)
   fail('DISPATCH_LEASE_AND_KEY_REQUIRED');
 const ts=Math.floor(now/1000);
 const header={alg:'EdDSA',typ:'JWT',kid};
 const payload={iss:ISSUER,aud:AUDIENCE,iat:ts,nbf:ts-2,exp:ts+ttlSeconds,
  jti:nonce,approval_id:s.approval_id,original_work_id:s.original_work_id,
  artifact_sha256:s.artifact_sha256,pre_state_hash:s.pre_state_hash,
  goal_transition_event_id:s.goal_transition_event_id,
  provider_failure_hash:s.provider_failure_hash,valid_time:s.valid_time,
  target_environment:s.target_environment,fence};
 const body=encode(header)+'.'+encode(payload);
 const signature=sign(null,Buffer.from(body),privateKey).toString('base64url');
 return body+'.'+signature;
}

export function verifyDeliveryWarrant({token,publicKey,kid,expected,now=Date.now()}={}){
 if(typeof token!=='string'||token.length>4096||!publicKey||
    !Number.isSafeInteger(now))fail('WARRANT_MISSING');
 const parts=token.split('.');
 if(parts.length!==3||parts.some(x=>!/^[A-Za-z0-9_-]+$/.test(x)))
  fail('WARRANT_MALFORMED');
 let header,body;
 try{
  header=JSON.parse(Buffer.from(parts[0],'base64url').toString('utf8'));
  body=JSON.parse(Buffer.from(parts[1],'base64url').toString('utf8'));
 }catch{fail('WARRANT_MALFORMED')}
 if(encode(header)!==parts[0]||encode(body)!==parts[1]||
    header.alg!=='EdDSA'||header.typ!=='JWT'||header.kid!==kid||
    body.iss!==ISSUER||body.aud!==AUDIENCE||body.target_environment!=='ISOLATED_PREVIEW')
  fail('WARRANT_SCOPE_INVALID');
 const signature=Buffer.from(parts[2],'base64url');
 if(signature.length!==64||
    !verify(null,Buffer.from(parts[0]+'.'+parts[1]),publicKey,signature))
  fail('WARRANT_SIGNATURE_INVALID');
 const t=Math.floor(now/1000);
 if(!Number.isSafeInteger(body.exp)||!Number.isSafeInteger(body.iat)||
    !Number.isSafeInteger(body.nbf)||
    body.exp<=t||body.nbf>t||body.exp-body.iat>120||
    body.iat>t+3||!UUID.test(body.jti))
  fail('WARRANT_EXPIRED_OR_NOT_YET_VALID');
 const e=assertWakeIdentity(expected);
 for(const field of ['approval_id','original_work_id','artifact_sha256',
    'pre_state_hash','goal_transition_event_id','provider_failure_hash',
    'target_environment','valid_time'])
  if(!equal(body[field],e[field]))fail('WARRANT_APPROVAL_MISMATCH');
 if(!Number.isSafeInteger(body.fence)||body.fence<1||
    body.fence!==expected.fence)fail('WARRANT_FENCE_MISMATCH');
 // Replay is stopped with a DB-backed UNIQUE (approval_id,jti) consumption
 // receipt. This signature check cannot substitute for that atomic record.
 return Object.freeze({...body,delivery_only:true,
  execution_authorized:false,needs_atomic_nonce_consume:true,
  needs_fresh_governance_and_execution_reservation:true});
}

export const WAKE_STATES=Object.freeze([
 'WAKE_PENDING','DISPATCH_CLAIMED','DISPATCH_ACCEPTED','WORKER_ALIVE',
 'GOVERNANCE_READY','EXECUTING','RETRY_PENDING',
 'STALE_APPROVAL_BLOCKED','ESCALATED','SETTLED','RECEIPT_VERIFIED']);
export function mayTransitionWake(from,to){
 const map={
  WAKE_PENDING:['DISPATCH_CLAIMED','STALE_APPROVAL_BLOCKED','ESCALATED'],
  DISPATCH_CLAIMED:['DISPATCH_ACCEPTED','RETRY_PENDING','STALE_APPROVAL_BLOCKED','ESCALATED'],
  DISPATCH_ACCEPTED:['WORKER_ALIVE','RETRY_PENDING','STALE_APPROVAL_BLOCKED','ESCALATED'],
  WORKER_ALIVE:['GOVERNANCE_READY','STALE_APPROVAL_BLOCKED','ESCALATED'],
  GOVERNANCE_READY:['EXECUTING','STALE_APPROVAL_BLOCKED','ESCALATED'],
  EXECUTING:['SETTLED','ESCALATED'],
  RETRY_PENDING:['DISPATCH_CLAIMED','STALE_APPROVAL_BLOCKED','ESCALATED'],
  SETTLED:['RECEIPT_VERIFIED'],
 };
 return map[from]?.includes(to)===true;
}
