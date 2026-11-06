// Real interrupted, live GitHub-worker process -> durable Universe checkpoint
// -> HALT and reject continuation -> destroy process -> start a fresh process
// -> fenced resumption of SAME audit, without re-running customer work.
import {fork} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const e=process.env;
const REPO='maloney2323/Reality';
const BRANCH='refs/heads/feature/reality-general-capability-engine-20261101';
const SHA=/^[a-f0-9]{40}$/;
const fail=x=>{throw Error('REALITY_REAL_INFLIGHT_CONTINUITY_'+x)};
if(e.GITHUB_ACTIONS!=='true'||e.GITHUB_EVENT_NAME!=='push'||
 e.GITHUB_REPOSITORY!==REPO||e.GITHUB_REF!==BRANCH||
 !SHA.test(e.GITHUB_SHA||'')||
 !/^[1-9][0-9]{7,17}$/.test(e.GITHUB_RUN_ID||'')||
 !e.ACTIONS_ID_TOKEN_REQUEST_URL||!e.ACTIONS_ID_TOKEN_REQUEST_TOKEN||
 typeof e.GH_TOKEN!=='string'||e.GH_TOKEN.length<20)
 fail('PINNED_SIGNED_ISOLATED_WORKER_REQUIRED');
const runId=Number(e.GITHUB_RUN_ID);
const endpoint='https://hvkfreoagbrphwghjajw.supabase.co/functions/v1/reality-genuine-capability-auto-admit';
async function broker(action,extra={}){
 const u=new URL(e.ACTIONS_ID_TOKEN_REQUEST_URL);
 u.searchParams.set('audience','reality-genuine-capability-auto-admit-v1');
 const id=await fetch(u,{redirect:'error',cache:'no-store',
  headers:{authorization:'Bearer '+e.ACTIONS_ID_TOKEN_REQUEST_TOKEN}});
 if(!id.ok)fail('OIDC_PROVIDER_UNAVAILABLE');
 const jwt=(await id.json()).value;
 if(typeof jwt!=='string'||jwt.length<300)fail('SIGNED_IDENTITY_INVALID');
 const response=await fetch(endpoint,{method:'POST',redirect:'error',cache:'no-store',
  headers:{authorization:'Bearer '+jwt,'content-type':'application/json',
    'x-reality-github-provider-token':e.GH_TOKEN},
  body:JSON.stringify({action,scope:{repository_sha:e.GITHUB_SHA,...extra}})});
 const out=await response.json().catch(()=>null);
 if(!response.ok||out?.ok!==true)
  fail('BROKER_'+action+'_'+String(out?.error||response.status).slice(0,110));
 if(out.production_changed!==false||out.signed_run_id!==runId)
  fail('SOURCE_AUTHORITY_OR_ISOLATION_FAILED');
 return out;
}
async function workerFirst(){
 const start=await broker('inflight_start');
 if(start.state!==undefined&&start.state!=='ACTIVE')fail('AUDIT_ALREADY_USED');
 if(start.status!=='ACTIVE'||start.checkpoint_step!==0||start.lease_epoch!==1)
   fail('FIRST_WORKER_CLAIM_NOT_FRESH');
 const checkpoint=await broker('inflight_checkpoint',{lease_epoch:1,step:1});
 if(checkpoint.status!=='ACTIVE'||checkpoint.checkpoint_step!==1||
   !SHA.test(e.GITHUB_SHA)||!checkpoint.last_event_id)
   fail('FIRST_CHECKPOINT_NOT_DURABLE');
 process.send?.({type:'FIRST_CHECKPOINT_DURABLE',
   step:checkpoint.checkpoint_step,event_id:checkpoint.last_event_id,
   checkpoint_hash:checkpoint.last_checkpoint_hash});
 await new Promise((resolve,reject)=>{
  process.once('message',async m=>{
   if(m?.type!=='HALT_REQUESTED'){reject(Error('WORKER_CONTROL_INVALID'));return;}
   try {
    const denied=await broker('inflight_blocked_checkpoint',{lease_epoch:1,step:2});
    if(denied.status!=='ACTIVE_WORKER_CHECKPOINT_DENIED_BY_HALT'||
       denied.blocked_step!==2)fail('ACTIVE_WORKER_WAS_NOT_STOPPED');
    process.send?.({type:'LIVE_WORKER_CHECKPOINT_BLOCKED',step:2});
    resolve();
   }catch(err){reject(err);}
  });
 });
}
async function workerResume(){
 const before=await broker('inflight_read');
 if(before.status!=='PAUSED'||before.checkpoint_step!==1||
    before.lease_epoch!==2||!before.last_event_id)
   fail('DURABLE_HALTED_CHECKPOINT_NOT_FOUND');
 const resume=await broker('inflight_resume');
 if(resume.status!=='ACTIVE'||resume.lease_epoch!==3||resume.checkpoint_step!==1)
  fail('SECOND_PROCESS_RESUME_NOT_FENCED');
 const stale=await broker('inflight_stale_checkpoint_probe',{lease_epoch:1,step:2});
 if(stale.status!=='STALE_WORKER_LEASE_DENIED'||stale.blocked_step!==2)
  fail('OLD_WORKER_COULD_WRITE');
 const step2=await broker('inflight_checkpoint',{lease_epoch:3,step:2});
 if(step2.status!=='ACTIVE'||step2.checkpoint_step!==2||
    !step2.last_event_id)fail('RECOVERED_SOURCE_LEDGER_STEP_2_MISSING');
 const step3=await broker('inflight_checkpoint',{lease_epoch:3,step:3});
 if(step3.status!=='SETTLED'||step3.checkpoint_step!==3||
    !step3.last_event_id)fail('RECOVERED_READONLY_AUDIT_NOT_SETTLED');
 process.send?.({type:'SAME_AUDIT_RECOVERED_AND_FINISHED',
   prior_step:before.checkpoint_step,final_step:step3.checkpoint_step,
   source_work_id:step3.source_original_work_id,
   final_hash:step3.last_checkpoint_hash,
   stale_lease_fenced:true});
}
function spawnWorker(mode,expectedType){
 const child=fork(fileURLToPath(import.meta.url),[mode],{
  env:{...e},stdio:['ignore','inherit','inherit','ipc']});
 const done=new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>{child.kill('SIGTERM');reject(Error('WORKER_TIMEOUT_'+mode));},90000);
  child.once('error',err=>{clearTimeout(timeout);reject(err);});
  child.once('exit',(code,signal)=>{
   if(!child.__message){clearTimeout(timeout);reject(Error(
    'WORKER_EXIT_BEFORE_PROOF_'+mode+'_'+code+'_'+signal));}
   else if(code!==0){clearTimeout(timeout);reject(Error(
    'WORKER_FAILED_AFTER_PROOF_'+mode+'_'+code));}
  });
  child.on('message',m=>{
   if(m?.type!==expectedType)return;
   child.__message=m;
   clearTimeout(timeout);
   resolve({child,message:m});
  });
 });
 return done;
}
if(process.argv[2]==='first'){
 await workerFirst();
 process.exit(0);
}else if(process.argv[2]==='resume'){
 await workerResume();
 process.exit(0);
}else{
 let halted=false,firstChild;
 let report;
 try{
  // First process is provably alive and blocked on a real control message
  // AFTER the first checkpoint has reached durable Postgres + Universe.
  const first=await spawnWorker('first','FIRST_CHECKPOINT_DURABLE');
  firstChild=first.child;
  if(firstChild.exitCode!==null)fail('FIRST_WORKER_NOT_ALIVE_BEFORE_HALT');
  const source=await broker('inflight_verify');
  if(source.status!=='ACTIVE'||source.checkpoint_count!==1||
     source.checkpoint_event_ids?.length!==1)
    fail('PRE_INTERRUPTION_UNIVERSE_CHECKPOINT_NOT_DURABLE');
  const halt=await broker('safety_halt');
  if(halt.mode!=='HALTED'||halt.status!=='ISOLATED_PREVIEW_HALTED')
    fail('ISOLATED_STOP_NOT_COMMITTED');
  halted=true;
  const haltProbes=await broker('safety_probe');
  if(haltProbes.status!=='ISOLATED_HALT_ENFORCED'||
    haltProbes.blocked_admission_operations!==3)fail('GLOBAL_STOP_NOT_ENFORCED');
  const blocked=new Promise((resolve,reject)=>{
   const timeout=setTimeout(()=>reject(Error('ACTIVE_WORKER_DID_NOT_OBSERVE_HALT')),45000);
   firstChild.on('message',m=>{
    if(m?.type==='LIVE_WORKER_CHECKPOINT_BLOCKED'){
      clearTimeout(timeout);resolve(m);
    }
   });
   firstChild.once('error',reject);
  });
  firstChild.send({type:'HALT_REQUESTED'});
  await blocked;
  const pause=await broker('inflight_pause');
  if(pause.status!=='PAUSED'||pause.checkpoint_step!==1||pause.lease_epoch!==2)
    fail('ATOMIC_PAUSE_DID_NOT_FENCE_FIRST_WORKER');
  await new Promise((resolve,reject)=>{
   if(firstChild.exitCode!==null){if(firstChild.exitCode===0)resolve();else reject(Error('INTERRUPTED_WORKER_FAILED'));return;}
   firstChild.once('exit',(code)=>code===0?resolve():reject(Error('INTERRUPTED_WORKER_FAILED_'+code)));
  });
  const frozen=await broker('inflight_verify');
  if(frozen.status!=='PAUSED'||frozen.checkpoint_count!==1||
    frozen.checkpoint_event_ids[0]!==source.checkpoint_event_ids[0])
    fail('HALTED_CONTINUITY_CHANGED');
  const released=await broker('safety_release');
  if(released.mode!=='RUNNING'||released.status!=='ISOLATED_PREVIEW_RUNNING')
    fail('EMERGENCY_STOP_RELEASE_FAILED');
  halted=false;
  const recovered=await spawnWorker('resume','SAME_AUDIT_RECOVERED_AND_FINISHED');
  const child=recovered.child;
  await new Promise((resolve,reject)=>{
   if(child.exitCode!==null){child.exitCode===0?resolve():reject(Error('RECOVERY_PROCESS_FAILED_'+child.exitCode));return;}
   child.once('exit',code=>code===0?resolve():reject(Error('RECOVERY_PROCESS_FAILED_'+code)));
  });
  const final=await broker('inflight_verify');
  if(final.status!=='SETTLED'||final.checkpoint_count!==3||
   final.checkpoint_event_ids.length!==3||
   final.checkpoint_event_ids[0]!==source.checkpoint_event_ids[0]||
   final.source_original_work_id!==source.source_original_work_id||
   final.original_job_reexecuted!==false||
   final.production_release_authorized!==false)
    fail('INDEPENDENT_SAME_JOB_UNIVERSE_SETTLEMENT_NOT_VERIFIED');
  const mode=await broker('inflight_read');
  if(mode.emergency_mode!=='RUNNING'||mode.checkpoint_step!==3||mode.status!=='SETTLED')
    fail('FINAL_RUNNING_STATE_OR_CONTINUITY_FAILED');
  report={schema:'reality-actual-inflight-worker-continuity-proof-v1',
   signed_run_id:runId,source_original_work_id:final.source_original_work_id,
   audit_job_id:'audit:provider-continuity:'+runId,
   active_worker_stopped:true,
   one_checkpoint_persisted_before_interruption:true,
   checkpoint_denied_while_halted:true,
   old_worker_terminated:true,new_worker_process_resumed:true,
   stale_worker_lease_rejected:true,
   previous_checkpoint_preserved:true,
   checkpoints_verified:final.checkpoint_count,
   checkpoint_universe_event_ids:final.checkpoint_event_ids,
   final_checkpoint_hash:final.last_checkpoint_hash,
   same_original_audit_settled:true,original_customer_job_reexecuted:false,
   emergency_mode_after_drill:mode.emergency_mode,
   general_arbitrary_process_kill_proven:false,
   external_side_effect_deduplication_proven:false,
   production_release_authorized:false,production_changed:false};
  mkdirSync('artifact/out',{recursive:true});
  writeFileSync('artifact/out/reality-actual-interruption-recovery.json',
    JSON.stringify(report,null,2)+'\n');
  console.log('REALITY_REAL_INFLIGHT_STOP_RECOVERED_NO_LOST_UNIVERSE_CHECKPOINT',
    JSON.stringify(report));
 }finally{
  if(firstChild&&firstChild.exitCode===null)firstChild.kill('SIGTERM');
  if(halted){
   const resumed=await broker('safety_release');
   if(resumed.mode!=='RUNNING')fail('FAILURE_CLEANUP_COULD_NOT_RELEASE_STOP');
   console.log('REALITY_FAILURE_CLEANUP_STOP_RELEASED',{run_id:runId});
  }
 }
}
