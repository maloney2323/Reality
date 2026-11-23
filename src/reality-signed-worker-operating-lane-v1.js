// A signed worker's operating lane is a separate proof from its Vercel
// deployment, cron schedule, and capability registry. A staging-only preview
// cannot replace a normal scheduled worker without disabling that worker.
// This read model grants no owner approval, release authority, or job claim.
const SHA=/^[a-f0-9]{40}$/;
const REF=/^[A-Za-z0-9][A-Za-z0-9/_-]{3,145}$/;
const PROJECT=/^[a-z0-9]{16,32}$/;
const noEffects=Object.freeze({
 schema:'reality-final-loop-signed-worker-operating-lane-v1',
 read_only:true,
 scheduled_alias_change_authorized:false,
 release_activation_verified:false,
 worker_execution_authorized:false,
 owner_approval_granted:false,
 child_execution_authorized:false,
 original_job_completed:false,
 production_changed:false
});
const result=(status,more={})=>Object.freeze({...noEffects,status,...more});
export function inspectFinalLoopSignedWorkerOperatingLane({
 env={},dbProject
}={}){
 const sha=String(env.VERCEL_GIT_COMMIT_SHA??'');
 const branch=String(env.VERCEL_GIT_COMMIT_REF??'');
 if(env.VERCEL_ENV!=='preview'||!SHA.test(sha)||
  !REF.test(branch)||branch.includes('..')||branch.includes('//'))
  return result('SIGNED_WORKER_RUNTIME_RELEASE_IDENTITY_UNVERIFIED');
 const identity={running_release_sha:sha,running_release_ref:branch,
  database_project:PROJECT.test(dbProject||'')?dbProject:null};
 if(env.REALITY_FINAL_LOOP_PREVIEW_SOURCE_PLAN_WAKE_ONLY==='true')
  return result('SOURCE_STAGING_ONLY_NOT_NORMAL_SCHEDULED_WORKER',{
   ...identity,operating_lane:'STAGING_ONLY',
   next_governed_action:'KEEP_NORMAL_WORKER_ACTIVE_AND_QUALIFY_EXECUTION_RELEASE'
  });
 if(env.REALITY_FINAL_LOOP_ENGINE_SHADOW_ENABLED!=='true'||
  env.REALITY_FINAL_LOOP_PR_SOURCE_PLAN_STAGING_ENABLED!=='true')
  return result('FINAL_LOOP_WORKER_CAPABILITY_FLAGS_MISSING',{
   ...identity,operating_lane:'NORMAL_SIGNED_SHIFT',
   next_governed_action:'VERIFY_REGISTERED_FINAL_LOOP_HANDLERS_AND_FLAGS'
  });
 if(env.REALITY_FINAL_LOOP_PR_SOURCE_PLANS_DB_ISOLATED!=='true')
  return result('FINAL_LOOP_WORKER_ISOLATED_DATABASE_NOT_CONFIGURED',{
   ...identity,operating_lane:'NORMAL_SIGNED_SHIFT',
   next_governed_action:'PROVISION_AND_INDEPENDENTLY_VERIFY_ISOLATED_PREVIEW_DATABASE'
  });
 const isolated=env.REALITY_FINAL_LOOP_PR_SOURCE_PLANS_ISOLATED_PROJECT_REF;
 const expected=env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF;
 const shared=env.REALITY_FINAL_LOOP_SHARED_BENCHMARK_PROJECT_REF;
 if(!PROJECT.test(isolated||'')||
  !PROJECT.test(expected||'')||
  !PROJECT.test(dbProject||'')||
  isolated!==expected||isolated!==dbProject||
  !PROJECT.test(shared||'')||shared===isolated)
  return result('FINAL_LOOP_WORKER_ISOLATED_DATABASE_IDENTITY_UNVERIFIED',{
   ...identity,operating_lane:'NORMAL_SIGNED_SHIFT',
   next_governed_action:'VERIFY_INDEPENDENT_DATABASE_BRANCH_AND_SAME_PROJECT_BINDING'
  });
 if(env.REALITY_FINAL_LOOP_CHILD_APPROVAL_PREPARATION_ENABLED!=='true'&&
    env.REALITY_FINAL_LOOP_CHILD_EXECUTION_ENABLED!=='true')
  return result('FINAL_LOOP_WORKER_OWNER_PACKET_HANDLER_DISABLED',{
   ...identity,operating_lane:'NORMAL_SIGNED_SHIFT',
   next_governed_action:'CONFIGURE_OWNER_PACKET_PREPARATION_IN_ISOLATED_PREVIEW'
  });
 // Configuration alone is not independent Supabase branch proof, a signed
 // scheduler wake, or a one-use release approval. Never mark "active".
 return result('FINAL_LOOP_WORKER_OWNER_PACKET_LANE_CONFIGURED_NOT_ACTIVATED',{
  ...identity,operating_lane:'NORMAL_SIGNED_SHIFT',
  owner_packet_preparation_configured:true,
  independent_database_isolation_verified:false,
  independent_scheduler_release_observed:false,
  next_governed_action:'INDEPENDENTLY_VERIFY_ISOLATED_PROJECT_AND_EXACT_RELEASE_APPROVAL'
 });
}
