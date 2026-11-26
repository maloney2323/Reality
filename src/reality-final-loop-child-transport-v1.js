// Narrow signed transport for the existing canonical child worker.
// No generic RPC proxy, no copied database credential, no new job/ledger.
// Each operation is bound to both immutable preview deployments and the
// existing canonical claim, original and run. Only canonical DB can fence it.
import {createHmac,timingSafeEqual,randomUUID} from 'node:crypto';
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
import {computeClaimedFinalLoopChildAdvisory} from './reality-final-loop-child-review-worker-v1.js';
const PATH='/api/reality/governed-final-loop-child-transport';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{40}$/;
const WORK=/^work:[a-f0-9]{32}$/;
const HASH=/^sha256:[a-f0-9]{64}$/;
const PROJECT=/^[a-z0-9]{16,32}$/;
const host=/^[a-z0-9-]{8,180}\.vercel\.app$/;
const safe=(status,extra={})=>({status,...extra,original_job_completed:false,production_changed:false});
function config(env,db){
 const canonical=env.REALITY_FINAL_LOOP_REVIEW_CANONICAL_HOST;
 const isolated=env.REALITY_FINAL_LOOP_REVIEW_ISOLATED_HOST;
 const role=env.REALITY_FINAL_LOOP_REVIEW_TRANSPORT_ROLE;
 const canonicalProject=env.REALITY_FINAL_LOOP_SHARED_BENCHMARK_PROJECT_REF;
 const isolatedProject=env.REALITY_FINAL_LOOP_PR_SOURCE_PLANS_ISOLATED_PROJECT_REF;
 const release=env.VERCEL_GIT_COMMIT_SHA;
 const key=env.REALITY_FINAL_LOOP_REVIEW_TRANSPORT_KEY;
 if(env.VERCEL_ENV!=='preview'||env.REALITY_FINAL_LOOP_REVIEW_TRANSPORT_ENABLED!=='true'||
    !['CANONICAL','ISOLATED'].includes(role)||
    !host.test(canonical||'')||!host.test(isolated||'')||canonical===isolated||
    env.VERCEL_URL!==(role==='CANONICAL'?canonical:isolated)||
    !SHA.test(release||'')||!PROJECT.test(canonicalProject||'')||
    !PROJECT.test(isolatedProject||'')||canonicalProject===isolatedProject||
    db?.strictSecrets!==true||db.project!==(role==='CANONICAL'?canonicalProject:isolatedProject)||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
    typeof key!=='string'||!/^[a-f0-9]{64}$/.test(key)||
    (role==='CANONICAL'&&(env.REALITY_RELEASE_CONTROL_RUNTIME_TOPOLOGY!=='CANONICAL_BENCHMARK_PREVIEW'||
     env.REALITY_FINAL_LOOP_CHILD_EXECUTION_ENABLED!=='false'||
     env.REALITY_FINAL_LOOP_PARENT_DELIVERY_ENABLED!=='false'))||
    (role==='ISOLATED'&&(env.REALITY_FINAL_LOOP_PR_SOURCE_PLANS_DB_ISOLATED!=='true'||
     env.REALITY_FINAL_LOOP_CHILD_EXECUTION_ENABLED!=='true'||
     env.REALITY_FINAL_LOOP_PARENT_DELIVERY_ENABLED!=='false')))
  return null;
 return {canonical,isolated,role,canonicalProject,isolatedProject,release,key,
  canonicalBypass:env.REALITY_FINAL_LOOP_REVIEW_CANONICAL_BYPASS,
  isolatedBypass:env.REALITY_FINAL_LOOP_REVIEW_ISOLATED_BYPASS};
}
const mac=(key,domain,payload)=>createHmac('sha256',Buffer.from(key,'hex')).update(domain+'\n'+payload).digest('hex');
const pack=(c,domain,data)=>{
 const payload=JSON.stringify(data);if(payload.length>100000)throw Error('REVIEW_TRANSPORT_SIZE');
 return {payload,signature:mac(c.key,domain,payload)};
};
const unpack=(c,domain,body)=>{
 if(typeof body?.payload!=='string'||body.payload.length>100000||
    typeof body.signature!=='string'||!/^[a-f0-9]{64}$/.test(body.signature)||
    !timingSafeEqual(Buffer.from(body.signature,'hex'),Buffer.from(mac(c.key,domain,body.payload),'hex')))
  throw Error('REVIEW_TRANSPORT_SIGNATURE');
 const p=JSON.parse(body.payload);
 if(!p||typeof p!=='object'||Array.isArray(p))throw Error('REVIEW_TRANSPORT_BODY');
 return p;
};
function validRequest(c,p,now){
 return p.schema==='reality-existing-child-transport-v1'&&
  p.release===c.release&&p.canonical===c.canonical&&p.isolated===c.isolated&&
  UUID.test(p.invocation_id||'')&&Number.isSafeInteger(p.issued_at)&&
  p.issued_at<=now+5000&&p.issued_at>=now-90000;
}
const isBound=p=>{
 const h=p.handoff,k=p.claim;
 return ['PREPARE','VERIFY'].includes(p.mode)&&UUID.test(p.worker_run_id||'')&&
  UUID.test(p.shift_id||'')&&h?.schema==='reality-canonical-approved-review-scope-v1'&&
  h.effect_type==='READ_ONLY_INTERNAL_PR_REVIEW'&&h.canonical_claim_required===true&&
  h.execution_authorized===false&&h.original_job_completed===false&&h.production_changed===false&&
  UUID.test(h.owner_id||'')&&UUID.test(h.continuity_root_id||'')&&
  UUID.test(h.plan_id||'')&&UUID.test(h.packet_id||'')&&HASH.test(h.continuity_head_sha256||'')&&
  Number.isSafeInteger(h.revision)&&h.revision>=1&&h.shift_id===p.shift_id&&
  k?.owner_id===h.owner_id&&k.shift_id===h.shift_id&&
  WORK.test(k.child_work_id||'')&&k.parent_original_work_id===h.parent_original_work_id&&
  k.source_ref===h.source_ref&&k.source_head_sha===h.source_head_sha&&
  k.source_manifest_sha256===h.source_manifest_sha256&&k.source_proof_sha256===h.source_proof_sha256&&
  k.acceptance_contract_sha256===h.acceptance_contract_sha256&&
  Array.isArray(h.scope_fingerprints)&&h.scope_fingerprints.some(x=>x.index===k.scope_index&&x.scope_sha256===k.scope_sha256)&&
  (p.mode==='PREPARE'?k.status==='FINAL_LOOP_EXACT_SIGNED_CHILD_CLAIMED_ONCE'&&
    k.canonical_scope_bound===true&&k.plan_id===h.plan_id&&k.packet_id===h.packet_id&&
    k.continuity_head_sha256===h.continuity_head_sha256&&k.revision===h.revision&&
    UUID.test(k.claim_id||'')&&k.claimant_worker_run_id===p.worker_run_id:
    k.status==='FINAL_LOOP_INDEPENDENT_CHILD_VERIFICATION_CANDIDATE'&&
    k.independent_verifier_run_id===p.worker_run_id&&k.original_generation_worker_run_id!==p.worker_run_id);
};
async function exchange(c,target,p,fetchImpl,timeoutMs){
 const domain='request:'+target;
 const r=await fetchImpl('https://'+c[target]+PATH,{
  method:'POST',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(timeoutMs),
  headers:{'content-type':'application/json',accept:'application/json',
   ...(c[target+'Bypass']?{'x-vercel-protection-bypass':c[target+'Bypass']}: {})},
  body:JSON.stringify(pack(c,domain,p))
 });
 if(!r?.ok)throw Error('REVIEW_TRANSPORT_REMOTE_REFUSED');
 const x=unpack(c,'response:'+target,await r.json());
 if(x.invocation_id!==p.invocation_id||x.action!==p.action||x.release!==c.release||
    x.issued_at!==p.issued_at||x.original_job_completed!==false||x.production_changed!==false)
  throw Error('REVIEW_TRANSPORT_RESPONSE_SCOPE');
 return x;
}
function request(c,action,now,more={}){
 return {schema:'reality-existing-child-transport-v1',release:c.release,
  canonical:c.canonical,isolated:c.isolated,invocation_id:randomUUID(),
  issued_at:now(),action,...more};
}
// Called by the existing canonical signed worker. Probe carries no claim,
// only independent deployment/project identity; no model call is allowed.
export async function connectExistingIsolatedChildTransport({db,handoff,env=process.env,
 fetchImpl=fetch,now=Date.now}={}){
 const c=config(env,db);
 if(!c||c.role!=='CANONICAL')return safe('FINAL_LOOP_CHILD_TRANSPORT_NOT_CONFIGURED');
 try{
  const p=request(c,'PROBE',now);
  const x=await exchange(c,'isolated',p,fetchImpl,5000);
  if(x.status!=='FINAL_LOOP_ISOLATED_CHILD_TRANSPORT_AVAILABLE'||
     x.project!==c.isolatedProject||x.model_invoked!==false||
     x.authority_granted!==false)throw Error('REVIEW_TRANSPORT_PROBE_SCOPE');
 }catch{return safe('FINAL_LOOP_CHILD_TRANSPORT_PROBE_UNVERIFIED');}
 let used=false;
 return safe('FINAL_LOOP_CHILD_TRANSPORT_CONNECTED',{
  ready:true,
  runIsolatedAdvisory:async({claim,mode,shiftId,workerRunId})=>{
   if(used)throw Error('REVIEW_TRANSPORT_NO_REPLAY');used=true;
   const p=request(c,'COMPUTE',now,{claim,mode,shift_id:shiftId,worker_run_id:workerRunId,handoff});
   if(!isBound(p))throw Error('REVIEW_TRANSPORT_CLAIM_SCOPE');
   const x=await exchange(c,'isolated',p,fetchImpl,48000);
   if(x.status!=='FINAL_LOOP_ISOLATED_CHILD_ADVISORY_RETURNED'||
      x.project!==c.isolatedProject||x.advisory?.child_work_id!==claim.child_work_id||
      x.advisory?.parent_original_work_id!==claim.parent_original_work_id||
      x.advisory?.original_job_completed!==false||x.advisory?.production_changed!==false)
    throw Error('REVIEW_TRANSPORT_ADVISORY_UNVERIFIED');
   return x.advisory;
  }
 });
}
// Trusted endpoint adapter. Only fixed transport actions, not arbitrary
// destinations, RPC names, credentials, model parameters or tool calls.
export async function handleExistingChildTransport({db,body,env=process.env,
 fetchImpl=fetch,call=shiftRpc,compute=computeClaimedFinalLoopChildAdvisory,now=Date.now}={}){
 const c=config(env,db);if(!c)return {http:503,body:safe('FINAL_LOOP_CHILD_TRANSPORT_DISABLED')};
 const target=c.role==='CANONICAL'?'canonical':'isolated';
 try{
  const p=unpack(c,'request:'+target,body);
  if(!validRequest(c,p,now()))throw Error('REVIEW_TRANSPORT_REQUEST_SCOPE');
  const reply=(status,more={})=>({http:200,body:pack(c,'response:'+target,safe(status,{
   invocation_id:p.invocation_id,action:p.action,release:c.release,issued_at:p.issued_at,...more}))});
  if(c.role==='ISOLATED'&&p.action==='PROBE')
   return reply('FINAL_LOOP_ISOLATED_CHILD_TRANSPORT_AVAILABLE',{project:db.project,model_invoked:false,authority_granted:false});
  if(!isBound(p))throw Error('REVIEW_TRANSPORT_ORIGINAL_SCOPE');
  if(c.role==='CANONICAL'&&['BEGIN','CHECK'].includes(p.action)){
   const k=p.claim;
   const current=await call(db,'reality_fence_final_loop_child_transport_v1',{
    p_child_work_id:k.child_work_id,p_claim_id:p.mode==='PREPARE'?k.claim_id:null,
    p_worker_run_id:p.worker_run_id,p_mode:p.mode,p_invocation_id:p.invocation_id,
    p_begin:p.action==='BEGIN',p_canonical_handoff:p.handoff
   },{fetchImpl});
   const expected=p.mode==='PREPARE'?'FINAL_LOOP_CHILD_CURRENT_SIGNED_MODEL_READBACK':
    'FINAL_LOOP_INDEPENDENT_CHILD_VERIFICATION_CANDIDATE';
   if(current?.status!==expected||current.child_work_id!==k.child_work_id||
      current.parent_original_work_id!==k.parent_original_work_id||
      (p.mode==='VERIFY'&&current.review_sha256!==k.review_sha256))
    throw Error('REVIEW_TRANSPORT_CURRENT_AUTHORITY');
   return reply('FINAL_LOOP_CANONICAL_CHILD_TRANSPORT_READBACK',{current});
  }
  if(c.role!=='ISOLATED'||p.action!=='COMPUTE')throw Error('REVIEW_TRANSPORT_ACTION');
  let reads=0;
  const advisory=await compute({claim:p.claim,mode:p.mode,shiftId:p.shift_id,
   workerRunId:p.worker_run_id,env,executionProject:db.project,fetchImpl,
   readCurrentChild:async()=>{
    const action=reads++===0?'BEGIN':'CHECK';
    const x=await exchange(c,'canonical',{...p,action},fetchImpl,8000);
    if(x.status!=='FINAL_LOOP_CANONICAL_CHILD_TRANSPORT_READBACK')throw Error('REVIEW_TRANSPORT_AUTHORITY');
    return x.current;
   }
  });
  if(reads!==2||advisory?.status!=='FINAL_LOOP_CHILD_CLAIMED_ADVISORY_UNTRUSTED')
   return reply('FINAL_LOOP_ISOLATED_CHILD_ADVISORY_UNVERIFIED_NO_REPLAY',{project:db.project});
  return reply('FINAL_LOOP_ISOLATED_CHILD_ADVISORY_RETURNED',{project:db.project,advisory});
 }catch{return {http:403,body:safe('FINAL_LOOP_CHILD_TRANSPORT_SCOPE_OR_EFFECT_UNVERIFIED_NO_REPLAY')};}
}
