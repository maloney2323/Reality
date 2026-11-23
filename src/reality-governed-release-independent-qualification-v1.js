// Independent read-only capability release qualification. A release is
// never qualified solely by flags, a model's plan, or Vercel READY status.
// Checks exact current process, CI head, Vercel deployment and actual
// Supabase development branch ancestry. Does not invoke the worker.
import {inspectFinalLoopSignedWorkerOperatingLane}
 from './reality-signed-worker-operating-lane-v1.js';
const SHA=/^[a-f0-9]{40}$/;
const REF=/^[A-Za-z0-9][A-Za-z0-9/_-]{3,145}$/;
const PROJECT=/^[a-z0-9]{16,32}$/;
const ID=/^[A-Za-z0-9_-]{8,80}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const KEY=/^[A-Z][A-Z0-9_]{3,110}$/;
const base=Object.freeze({
 schema:'reality-independent-release-qualification-v1',
 read_only:true,owner_approval_granted:false,
 release_activated:false,external_provider_write:false,
 original_job_completed:false,production_changed:false
});
const safe=(status,more={})=>Object.freeze({...base,status,...more});
async function getJson(fetchImpl,url,token,timeoutMs=7000){
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const r=await fetchImpl(url,{method:'GET',
   headers:{Authorization:'Bearer '+token,Accept:'application/json'},
   cache:'no-store',redirect:'error',signal:controller.signal});
  if(!r?.ok)throw Error('INDEPENDENT_RELEASE_PROVIDER_READ_FAILED');
  return await r.json();
 }finally{clearTimeout(timer)}
}
export async function qualifyCurrentIsolatedSignedWorkerRelease({
 env=process.env,dbProject,fetchImpl=fetch
}={}){
 const branch=env.REALITY_SIGNED_WORKER_TARGET_RELEASE_REF;
 const sha=env.REALITY_SIGNED_WORKER_TARGET_RELEASE_SHA;
 const isolated=env.REALITY_FINAL_LOOP_PR_SOURCE_PLANS_ISOLATED_PROJECT_REF;
 const parent=env.REALITY_RELEASE_CONTROL_PARENT_BENCHMARK_PROJECT_REF;
 const ciId=Number(env.REALITY_SIGNED_WORKER_RELEASE_CI_RUN_ID);
 const vercelId=env.REALITY_SIGNED_WORKER_TARGET_DEPLOYMENT_ID;
 const cap=env.REALITY_SIGNED_WORKER_TARGET_CAPABILITY_KEY;
 const repo=env.REALITY_VERIFIED_GITHUB_REPOSITORY;
 if(typeof fetchImpl!=='function'||!SHA.test(sha||'')||
  !REF.test(branch||'')||!PROJECT.test(dbProject||'')||
  !PROJECT.test(isolated||'')||!PROJECT.test(parent||'')||
  isolated===parent||isolated!==dbProject||
  !UUID.test(env.REALITY_SIGNED_WORKER_RELEASE_OWNER_ID||'')||
  !UUID.test(env.REALITY_SIGNED_WORKER_RELEASE_SHIFT_ID||'')||
  !ID.test(vercelId||'')||!KEY.test(cap||'')||
  !Number.isSafeInteger(ciId)||ciId<1||
  !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo||'')||
  typeof env.REALITY_RELEASE_CONTROL_SUPABASE_MANAGEMENT_TOKEN!=='string'||
  env.REALITY_RELEASE_CONTROL_SUPABASE_MANAGEMENT_TOKEN.length<20||
  typeof env.REALITY_RELEASE_CONTROL_GITHUB_READ_TOKEN!=='string'||
  env.REALITY_RELEASE_CONTROL_GITHUB_READ_TOKEN.length<20||
  typeof env.REALITY_VERIFIED_VERCEL_RELEASE_API_TOKEN!=='string'||
  env.REALITY_VERIFIED_VERCEL_RELEASE_API_TOKEN.length<20)
  return safe('PINNED_RELEASE_OR_PROVIDER_PROOF_CONFIG_MISSING');
 const lane=inspectFinalLoopSignedWorkerOperatingLane({env,dbProject});
 if(lane.status!=='FINAL_LOOP_WORKER_OWNER_PACKET_LANE_CONFIGURED_NOT_ACTIVATED'||
  lane.running_release_sha!==sha||
  lane.running_release_ref!==branch)
  return safe('QUALIFIED_NORMAL_SIGNED_WORKER_RUNTIME_NOT_PRESENT',{
   operating_lane_status:lane.status
  });
 let branches;
 try{
  branches=await getJson(fetchImpl,
   'https://api.supabase.com/v1/projects/'+encodeURIComponent(parent)+'/branches',
   env.REALITY_RELEASE_CONTROL_SUPABASE_MANAGEMENT_TOKEN);
 }catch{
  return safe('INDEPENDENT_SUPABASE_BRANCH_ANCESTRY_READ_UNAVAILABLE');
 }
 const items=Array.isArray(branches)?branches:
  Array.isArray(branches?.branches)?branches.branches:[];
 const exact=items.filter(b=>b?.project_ref===isolated&&
  b.parent_project_ref===parent&&
  b.is_default===false&&b.preview_project_status==='ACTIVE_HEALTHY'&&
  ['FUNCTIONS_DEPLOYED','MIGRATIONS_PASSED'].includes(b.status));
 if(exact.length!==1)
  return safe('ISOLATED_SUPABASE_DEVELOPMENT_BRANCH_NOT_VERIFIED');
 const [org,name]=repo.split('/');
 let ci;
 try{
  ci=await getJson(fetchImpl,
   'https://api.github.com/repos/'+encodeURIComponent(org)+'/'+
    encodeURIComponent(name)+'/actions/runs/'+ciId,
   env.REALITY_RELEASE_CONTROL_GITHUB_READ_TOKEN);
 }catch{
  return safe('INDEPENDENT_EXACT_GITHUB_CI_READ_UNAVAILABLE');
 }
 if(ci?.id!==ciId||ci.head_sha!==sha||
  ci.head_branch!==branch||
  ci.name!=='Reality Final Loop Engine lifecycle acceptance'||
  ci.path!=='.github/workflows/reality-final-loop-engine-v1-ci.yml'||
  ci.status!=='completed'||ci.conclusion!=='success'||
  !['push','pull_request'].includes(ci.event))
  return safe('INDEPENDENT_EXACT_RELEASE_CI_NOT_PASSED');
 let d;
 try{
  const data=await getJson(fetchImpl,
   'https://api.vercel.com/v13/deployments/'+encodeURIComponent(vercelId)+
   '?teamId='+encodeURIComponent(env.REALITY_VERIFIED_VERCEL_TEAM_ID),
   env.REALITY_VERIFIED_VERCEL_RELEASE_API_TOKEN);
  d=data?.deployment??data;
 }catch{
  return safe('INDEPENDENT_EXACT_VERCEL_DEPLOYMENT_READ_UNAVAILABLE');
 }
 if(d?.id!==vercelId||
  (d.project?.id??d.projectId)!==env.REALITY_VERIFIED_VERCEL_PROJECT_ID||
  d.state!=='READY'||d.target==='production'||
  d.meta?.githubCommitSha!==sha||
  d.meta?.githubCommitRef!==branch||
  d.meta?.githubOrg!==org||d.meta?.githubRepo!==name)
  return safe('VERCEL_RELEASE_COMMIT_OR_PROJECT_IDENTITY_MISMATCH');
 const candidate=Object.freeze({
  sha,branch,shift_id:env.REALITY_SIGNED_WORKER_RELEASE_SHIFT_ID,
  capability_key:cap,scheduled_alias:env.REALITY_SIGNED_WORKER_STABLE_ALIAS,
  preview_only:true,provider_deployment_ready:true,
  environment:'ISOLATED_PREVIEW',operating_lane:'NORMAL_SIGNED_SHIFT',
  source_staging_only:false,
  isolated_database_independently_verified:true,
  owner_packet_handler_registered:true,production_changed:false
 });
 const ciProof=Object.freeze({
  status:'INDEPENDENT_FROZEN_CI_PASSED',release_sha:sha,
  independently_verified:true,test_source_pinned:true,run_id:ciId
 });
 return safe('QUALIFIED_EXACT_ISOLATED_SIGNED_WORKER_RELEASE_READ_ONLY',{
  candidate,ci:ciProof,
  branch_project_ref:isolated,
  provider_deployment_id:vercelId,
  next_governed_action:'READ_EXACT_OWNER_RELEASE_APPROVAL'
 });
}
