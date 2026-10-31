// Read-only settlement readback. This function never installs, approves,
// enqueues, claims, settles, or changes the original customer job.
import {resolveReliabilityBenchmarkDb}
 from './reality-reliability-db-boundary-v0.1.js';
import {createIndependentInstalledWorkVerifier}
 from './reality-general-installed-work-verifier-v1.0.js';
const WORK=/^work:[a-f0-9]{32}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^[a-f0-9]{64}$/;
const status=(work,reason,extra={})=>Object.freeze({
 status:reason,original_work_id:work,loop_complete:false,
 original_job_completed:false,installation_authorized_by_readback:false,
 external_action_performed:false,production_changed:false,...extra,
});
function validSource(x,owner,work){
 const p=x?.payload||{};
 const provenance=x?.provenance||{};
 return x?.event_id&&UUID.test(x.event_id)&&
  x.entity_type==='reality_original_source_backed_repair_work'
    ? x.event_kind==='OBSERVATION'&&x.epistemic_status==='VERIFIED'&&
       p.original_work_id===work&&p.owner_id===owner&&
       p.owner_authorized_investigation===true&&
       p.owner_authorized_installation===false&&
       p.original_job_completed===false&&
       provenance.principal_id===owner&&UUID.test(provenance.conversation_id)
    : x?.entity_type==='personal_first_self_upgrade_customer_work'&&
       x.event_kind==='WORK'&&x.epistemic_status==='OBSERVED'&&
       p.original_work_id===work&&p.issue_number===178&&
       p.installation_authorized===false&&p.original_job_completed===false&&
       provenance.principal_id===owner&&UUID.test(provenance.conversation_id);
}
function specificProof({work,owner,source,approval,outcome,checkpoint}){
 const p=outcome?.payload||{},c=checkpoint?.payload||{};
 const sourceGoal=source.payload?.goal_id||source.payload?.original_goal_id;
 if(approval?.status!=='SETTLED'||approval.owner_id!==owner||
  approval.original_work_id!==work||
  approval.original_work_event_id!==source.event_id||
  approval.conversation_id!==source.provenance.conversation_id||
  approval.consumed_once!==true||
  approval.goal_id!==sourceGoal||
  approval.goal_transition_event_id!==
   source.payload.goal_transition_receipt_ref||
  !HASH.test(String(approval.candidate_hash||''))||
  !HASH.test(String(approval.frozen_test_sha256||''))||
  !SHA.test(String(approval.installed_commit_sha||''))||
  !/^feature\/reality-[a-z0-9][a-z0-9/-]{5,105}$/.test(
   String(approval.install_branch||''))||
  !UUID.test(String(approval.reservation_id||''))||
  outcome?.entity_type!=='reality_generic_verified_original_work_outcome'||
  outcome?.event_kind!=='OBSERVATION'||outcome?.epistemic_status!=='VERIFIED'||
  !UUID.test(String(outcome.event_id||''))||
  p.owner_id!==owner||p.original_work_id!==work||p.outcome!=='SUCCEEDED'||
  p.independent_outcome_verified!==true||p.production_changed!==false||
  p.installed_artifact_hash!==approval.candidate_hash||
  p.installed_commit_sha!==approval.installed_commit_sha||
  typeof p.original_executor_run_ref!=='string'||
  checkpoint?.entity_type!=='reality_general_constitutional_checkpoint'||
  !UUID.test(String(checkpoint.event_id||''))||
  c.owner_id!==owner||c.original_work_id!==work||
  c.constitutional_phase!=='SETTLED'||c.original_job_completed!==true||
  c.driver_state?.phase!=='SETTLED'||
  c.driver_state?.candidate?.artifact_hash!==approval.candidate_hash||
  c.driver_state?.settlement?.settlement_receipt_ref!==
   'supabase:universe_events:'+outcome.event_id||
  checkpoint.continuity_root_id!==outcome.continuity_root_id||
  checkpoint.worldline_id!==outcome.worldline_id||
  checkpoint.continuity_root_id!==source.continuity_root_id||
  checkpoint.worldline_id!==source.worldline_id)
  return false;
 return true;
}
export async function readOriginalLoopCompletion({
 session,originalWorkId,env=process.env,fetchImpl=fetch,
 createVerifier=createIndependentInstalledWorkVerifier,
}={}){
 if(!WORK.test(String(originalWorkId||''))||!UUID.test(String(session?.user_id||''))||
  env.VERCEL_ENV!=='preview'||env.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true')
  throw Error('LOOP_COMPLETION_AUTHENTICATED_PREVIEW_REQUIRED');
 const db=resolveReliabilityBenchmarkDb(env);
 if(!db?.strictSecrets||!db.secretKey||db.url!==session?.config?.url||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  throw Error('LOOP_COMPLETION_TRUSTED_DB_SCOPE_REQUIRED');
 const headers={apikey:db.secretKey,accept:'application/json',
  ...(db.secretKey.startsWith('sb_secret_')?{}:
    {authorization:'Bearer '+db.secretKey})};
 const get=async(params)=>{
  const url=new URL(db.url+'/rest/v1/universe_events');
  for(const [key,value] of Object.entries(params))url.searchParams.set(key,value);
  const resp=await fetchImpl(url.toString(),{method:'GET',
   headers,cache:'no-store',redirect:'error'});
  if(!resp.ok)throw Error('LOOP_COMPLETION_PROVIDER_READ_UNAVAILABLE');
  const rows=await resp.json();
  if(!Array.isArray(rows))throw Error('LOOP_COMPLETION_PROVIDER_RECORD_INVALID');
  return rows;
 };
 const work=originalWorkId,owner=session.user_id;
 const filter={'payload->>original_work_id':'eq.'+work,
  select:'event_id,entity_type,event_kind,epistemic_status,continuity_root_id,worldline_id,payload,provenance',
  order:'assertion_time.desc',limit:'40'};
 const sources=(await get({...filter,entity_type:'in.(reality_original_source_backed_repair_work,personal_first_self_upgrade_customer_work)'}))
  .filter(x=>validSource(x,owner,work));
 if(sources.length!==1)return status(work,'ORIGINAL_OWNER_WORK_UNAVAILABLE');
 const source=sources[0];
 const auth=await fetchImpl(db.url+'/rest/v1/rpc/reality_read_general_repair_progress_v2',{
  method:'POST',headers:{...headers,'content-type':'application/json'},
  cache:'no-store',redirect:'error',
  body:JSON.stringify({p_owner_id:owner,
   p_conversation_id:source.provenance.conversation_id,
   p_original_work_id:work}),
 });
 if(!auth.ok)throw Error('LOOP_COMPLETION_OWNER_APPROVAL_READ_UNAVAILABLE');
 const approval=await auth.json();
 if(approval?.status!=='SETTLED')
  return status(work,'LOOP_NOT_COMPLETE',{
   durable_approval_status:String(approval?.status||'UNAVAILABLE')});
 const [outcomes,checkpoints]=await Promise.all([
  get({...filter,entity_type:'eq.reality_generic_verified_original_work_outcome'}),
  get({...filter,entity_type:'eq.reality_general_constitutional_checkpoint',
    'payload->>constitutional_phase':'eq.SETTLED'}),
 ]);
 const matches=[];
 for(const outcome of outcomes)for(const checkpoint of checkpoints)
  if(specificProof({work,owner,source,approval,outcome,checkpoint}))
   matches.push({outcome,checkpoint});
 if(matches.length!==1)return status(work,'FINAL_CONTINUITY_PROOF_MISSING');
 const {outcome,checkpoint}=matches[0];
 let provider;
 try{
  provider=await createVerifier({env,fetchImpl}).observeOriginalRun({
   installedCommitSha:approval.installed_commit_sha,
   installedBranch:approval.install_branch,originalWorkId:work,
   expectedFrozenTestPath:source.payload?.frozen_test_path||
    (source.payload?.issue_number===178?
     'test/reality-frozen-regressions/first-reality-ci-evidence-gap.test.js':null),
   expectedFrozenSha:approval.frozen_test_sha256,
  });
 }catch{return status(work,'INDEPENDENT_ORIGINAL_EXECUTION_READBACK_BLOCKED')}
 if(provider?.complete!==true||
  provider.status!=='VERIFIED_ORIGINAL_INSTALLED_WORK'||
  provider.original_work_id!==work||
  provider.installed_commit_sha!==approval.installed_commit_sha||
  provider.original_work_run_ref!==outcome.payload.original_executor_run_ref||
  provider.original_frozen_tests_passed!==true||
  provider.governance_tests_passed!==true||
  provider.independent_provider_readback!==true)
  return status(work,'INDEPENDENT_ORIGINAL_EXECUTION_UNVERIFIED');
 return Object.freeze({
  status:'LOOP_COMPLETE_VERIFIED',loop_complete:true,
  original_work_id:work,original_job_completed:true,
  original_execution_ref:provider.original_work_run_ref,
  installed_commit_sha:approval.installed_commit_sha,
  installed_artifact_hash:approval.candidate_hash,
  settlement_receipt_ref:'supabase:universe_events:'+outcome.event_id,
  final_checkpoint_receipt_ref:'supabase:universe_events:'+checkpoint.event_id,
  independently_verified:true,installation_authorized_by_readback:false,
  external_action_performed:false,production_changed:false,
 });
}
