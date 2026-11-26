// Independent read-only capability release qualification. A release is
// never qualified solely by flags, a model's plan, or Vercel READY status.
// Checks exact current process, CI head, Vercel deployment and actual
// Supabase development branch ancestry. Does not invoke the worker.
import {createHash} from 'node:crypto';
import {inspectFinalLoopSignedWorkerOperatingLane}
 from './reality-signed-worker-operating-lane-v1.js';
import {connectExistingIsolatedChildTransport} from './reality-final-loop-child-transport-v1.js';
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
const digest=fields=>'sha256:'+createHash('sha256').update(JSON.stringify(fields)).digest('hex');
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
 env=process.env,dbProject,db=null,fetchImpl=fetch,direction=null
}={}){
 const canonical=env.REALITY_RELEASE_CONTROL_RUNTIME_TOPOLOGY==='CANONICAL_BENCHMARK_PREVIEW';
 const branch=env.REALITY_SIGNED_WORKER_TARGET_RELEASE_REF;
 const sha=env.REALITY_SIGNED_WORKER_TARGET_RELEASE_SHA;
 const isolated=env.REALITY_FINAL_LOOP_PR_SOURCE_PLANS_ISOLATED_PROJECT_REF;
 const parent=env.REALITY_RELEASE_CONTROL_PARENT_BENCHMARK_PROJECT_REF;
 const ciId=Number(env.REALITY_SIGNED_WORKER_RELEASE_CI_RUN_ID);
 const vercelId=env.REALITY_SIGNED_WORKER_TARGET_DEPLOYMENT_ID;
 const cap=env.REALITY_SIGNED_WORKER_TARGET_CAPABILITY_KEY;
 const reviewTransport=cap==='VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM';
 const repo=env.REALITY_VERIFIED_GITHUB_REPOSITORY;
 if(typeof fetchImpl!=='function'||!SHA.test(sha||'')||
  !REF.test(branch||'')||!PROJECT.test(dbProject||'')||
  !PROJECT.test(isolated||'')||!PROJECT.test(parent||'')||
  isolated===parent||(canonical?parent!==dbProject:isolated!==dbProject)||
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
 if(lane.status!==(canonical?'FINAL_LOOP_WORKER_SHARED_OWNER_PACKET_PREPARATION_ONLY':
    'FINAL_LOOP_WORKER_OWNER_PACKET_LANE_CONFIGURED_NOT_ACTIVATED')||
  lane.running_release_sha!==sha||
  lane.running_release_ref!==branch)
  return safe('QUALIFIED_NORMAL_SIGNED_WORKER_RUNTIME_NOT_PRESENT',{
   operating_lane_status:lane.status
  });
 const gatewayId=Number(env.REALITY_SIGNED_WORKER_RELEASE_GATEWAY_CI_RUN_ID);
 const gatewayPath=env.REALITY_SIGNED_WORKER_RELEASE_GATEWAY_CI_WORKFLOW_PATH;
 if(canonical&&(
  env.REALITY_RELEASE_CONTROL_DB_PROJECT_REF!==dbProject||
  env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF!==dbProject||
  env.VERCEL_DEPLOYMENT_ID!==vercelId||
  env.REALITY_FINAL_LOOP_SHARED_CONTINUITY_GUARD_ENABLED!=='true'||
  env.REALITY_FINAL_LOOP_CHILD_EXECUTION_ENABLED==='true'||
  env.REALITY_FINAL_LOOP_PARENT_DELIVERY_ENABLED==='true'||
  !['PREPARE_FINAL_LOOP_CHILD_OWNER_PACKET','REQUALIFY_EXISTING_CONTINUITY_SOURCE','VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM'].includes(cap)||
  (reviewTransport&&(direction?.next_qualified_action!==cap||db?.project!==dbProject||db.strictSecrets!==true||
   env.REALITY_FINAL_LOOP_REVIEW_TRANSPORT_ROLE!=='CANONICAL'))||
  !Number.isSafeInteger(gatewayId)||gatewayId<1||gatewayId===ciId||
  !/^\.github\/workflows\/[A-Za-z0-9._-]+\.ya?ml$/.test(gatewayPath||'')||
  !['GOVERNED_RELEASE_DIRECTION_DRIFT_OBSERVED','GOVERNED_RELEASE_DIRECTION_MATCHES_PIN_UNVERIFIED_ACTIVATION'].includes(direction?.status)||
  direction.read_only!==true||direction.release_activated!==false||direction.production_changed!==false||
  direction.authoritative_database!==dbProject||direction.owner_id!==env.REALITY_SIGNED_WORKER_RELEASE_OWNER_ID||
  direction.shift_id!==env.REALITY_SIGNED_WORKER_RELEASE_SHIFT_ID||
  direction.configured_target_release_sha!==sha||direction.configured_target_release_ref!==branch||
  direction.scheduled_host!==env.REALITY_SIGNED_WORKER_STABLE_ALIAS||
  !Number.isSafeInteger(direction.cron_job_id)||direction.cron_job_id<1||
  !UUID.test(direction.continuity_root_id||'')||!Number.isSafeInteger(direction.continuity_revision)||direction.continuity_revision<1||
  !/^sha256:[a-f0-9]{64}$/.test(direction.plan_fingerprint||'')||
  !/^sha256:[a-f0-9]{64}$/.test(direction.continuity_head_sha256||'')||
  !/^sha256:[a-f0-9]{64}$/.test(direction.qualifier_receipt_sha256||'')||
  !/^work:[a-f0-9]{32}$/.test(direction.original_work_id||'')||
  !/^https:\/\/github[.]com\/maloney2323\/Reality\/(issues|pull)\/[1-9][0-9]*$/.test(direction.source_ref||'')))
  return safe('CANONICAL_RUNTIME_SAME_SHIFT_OR_GATEWAY_CONFIG_NOT_VERIFIED');
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
  (['FUNCTIONS_DEPLOYED','MIGRATIONS_PASSED'].includes(b.status)||
   // A historical migration workflow is not the exact runtime contract.
   // Only the existing read-only review capability may proceed to live
   // independent qualification; the provider's failure remains recorded.
   (canonical&&reviewTransport&&b.status==='MIGRATIONS_FAILED')));
 if(exact.length!==1)
  return safe('ISOLATED_SUPABASE_DEVELOPMENT_BRANCH_NOT_VERIFIED');
 const migrationStatus=exact[0].status;
 if(reviewTransport&&env.REALITY_FINAL_LOOP_REVIEW_TRANSPORT_PROBE_ONLY==='true')
  return safe('REVIEW_TRANSPORT_DIAGNOSTIC_ONLY_NOT_RELEASE_CAPACITY');
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
 let gateway=null;
 if(canonical){
  try{gateway=await getJson(fetchImpl,'https://api.github.com/repos/'+encodeURIComponent(org)+'/'+
    encodeURIComponent(name)+'/actions/runs/'+gatewayId,env.REALITY_RELEASE_CONTROL_GITHUB_READ_TOKEN)}
  catch{return safe('INDEPENDENT_GATEWAY_CI_READ_UNAVAILABLE')}
  if(gateway?.id!==gatewayId||gateway.head_sha!==sha||gateway.head_branch!==branch||
   gateway.name!=='Reality — Isolated governed OpenAI gateway proof'||gateway.path!==gatewayPath||
   gateway.status!=='completed'||gateway.conclusion!=='success'||!['push','pull_request'].includes(gateway.event))
   return safe('INDEPENDENT_GATEWAY_CI_NOT_PASSED');
 }
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
 let transport=null;
 if(reviewTransport){
  if(!canonical)return safe('CANONICAL_REVIEW_TRANSPORT_REQUIRED');
  const peerId=env.REALITY_FINAL_LOOP_REVIEW_ISOLATED_DEPLOYMENT_ID;
  const peerHost=env.REALITY_FINAL_LOOP_REVIEW_ISOLATED_HOST;
  if(!ID.test(peerId||'')||peerId===vercelId||!/^[-a-z0-9]+\.vercel\.app$/.test(peerHost||''))
   return safe('ISOLATED_REVIEW_DEPLOYMENT_NOT_PINNED');
  let peer;
  try{
   const data=await getJson(fetchImpl,'https://api.vercel.com/v13/deployments/'+encodeURIComponent(peerId)+
    '?teamId='+encodeURIComponent(env.REALITY_VERIFIED_VERCEL_TEAM_ID),env.REALITY_VERIFIED_VERCEL_RELEASE_API_TOKEN);
   peer=data?.deployment??data;
  }catch{return safe('ISOLATED_REVIEW_DEPLOYMENT_READ_UNAVAILABLE')}
  if(peer?.id!==peerId||peer.url!==peerHost||peer.state!=='READY'||peer.target==='production'||
   (peer.project?.id??peer.projectId)!==env.REALITY_VERIFIED_VERCEL_PROJECT_ID||
   peer.meta?.githubCommitSha!==sha||peer.meta?.githubOrg!==org||peer.meta?.githubRepo!==name)
   return safe('ISOLATED_REVIEW_DEPLOYMENT_IDENTITY_MISMATCH');
  const probe=await connectExistingIsolatedChildTransport({db,env,fetchImpl});
  if(probe.ready!==true||probe.isolated_deployment_id!==peerId||probe.isolated_host!==peerHost||
   probe.canonical_deployment_id!==vercelId||probe.isolated_project_ref!==isolated||
   probe.database_contract_verified!==true||probe.probe_only!==false)
   return safe('INDEPENDENT_REVIEW_TRANSPORT_PROBE_UNVERIFIED');
  transport={isolated_deployment_id:peerId,isolated_transport_host:peerHost,
   provider_migration_status:migrationStatus,exact_runtime_database_contract_verified:true,
   independent_transport_proof_sha256:digest([vercelId,peerId,peerHost,sha,dbProject,isolated,migrationStatus,'LIVE_SERVICE_ROLE_NEGATIVE_CONTROLS'])};
 }
 const providerProof=digest([repo,sha,branch,ci.id,ci.path,ci.status,ci.conclusion,d.id,d.project?.id??d.projectId,d.state,d.target??null,
  ...(transport?[transport.isolated_deployment_id,transport.independent_transport_proof_sha256]:[]),
  ...(canonical?[gateway.id,gateway.path,gateway.status,gateway.conclusion]:[])]);
 const isolationProof=digest([exact[0].project_ref,exact[0].parent_project_ref,exact[0].is_default,exact[0].status,
  exact[0].preview_project_status,dbProject]);
 const runtimeScope=canonical?Object.freeze({target_environment:'CANONICAL_BENCHMARK_PREVIEW',owner_id:direction.owner_id,
  shift_id:direction.shift_id,scheduled_alias:direction.scheduled_host,runtime_database_project_ref:dbProject,
  qualification_database_project_ref:isolated,original_work_id:direction.original_work_id,source_ref:direction.source_ref,
  qualifier_receipt_sha256:direction.qualifier_receipt_sha256,plan_fingerprint:direction.plan_fingerprint,
  continuity_root_id:direction.continuity_root_id,continuity_head_sha256:direction.continuity_head_sha256,
  continuity_revision:direction.continuity_revision,cron_job_id:direction.cron_job_id,gateway_ci_run_id:gatewayId,
  target_deployment_id:vercelId,release_sha:sha,release_ref:branch,capability_key:cap,
  provider_release_proof_sha256:providerProof,independent_isolation_proof_sha256:isolationProof,
  runtime_same_shift_verified:true,independent_qualification_branch_verified:true,independent_gateway_ci_verified:true,
  child_execution_enabled:false,parent_delivery_enabled:false,production_changed:false,
  ...(transport||{})}):null;
 const candidate=Object.freeze({
  sha,branch,shift_id:env.REALITY_SIGNED_WORKER_RELEASE_SHIFT_ID,
  capability_key:cap,scheduled_alias:env.REALITY_SIGNED_WORKER_STABLE_ALIAS,
  preview_only:true,provider_deployment_ready:true,
  environment:canonical?'CANONICAL_BENCHMARK_PREVIEW':'ISOLATED_PREVIEW',operating_lane:'NORMAL_SIGNED_SHIFT',
  source_staging_only:false,
  isolated_database_independently_verified:!canonical,
  ...(canonical?{runtime_scope:runtimeScope}:{}),
  owner_packet_handler_registered:true,production_changed:false
 });
 const ciProof=Object.freeze({
  status:'INDEPENDENT_FROZEN_CI_PASSED',release_sha:sha,
  independently_verified:true,test_source_pinned:true,run_id:ciId
 });
 return safe(canonical?'QUALIFIED_EXACT_CANONICAL_SIGNED_WORKER_RELEASE_READ_ONLY':'QUALIFIED_EXACT_ISOLATED_SIGNED_WORKER_RELEASE_READ_ONLY',{
  candidate,ci:ciProof,
  branch_project_ref:isolated,
  provider_migration_status:migrationStatus,
  provider_migration_workflow_passed:['FUNCTIONS_DEPLOYED','MIGRATIONS_PASSED'].includes(migrationStatus),
  provider_deployment_id:vercelId,
  // Hash only the stable, independently read provider identity fields. No
  // time-varying timestamp or secret can change the existing packet identity.
  provider_release_proof_sha256:providerProof,
  independent_isolation_proof_sha256:isolationProof,
  next_governed_action:'READ_EXACT_OWNER_RELEASE_APPROVAL'
 });
}
