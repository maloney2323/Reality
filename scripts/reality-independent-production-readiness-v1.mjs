// Independent, signed, read-only readiness evidence. No production promotion.
import {mkdirSync,writeFileSync} from 'node:fs';
const env=process.env,die=x=>{throw Error('REALITY_READINESS_'+x)};
if(env.GITHUB_ACTIONS!=='true'||env.GITHUB_EVENT_NAME!=='push'||
   env.GITHUB_REPOSITORY!=='maloney2323/Reality'||
   env.GITHUB_REF!=='refs/heads/feature/reality-general-capability-engine-20261101'||
   !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA||''))die('SIGNED_ISOLATED_WORKER_REQUIRED');
const u=new URL(env.ACTIONS_ID_TOKEN_REQUEST_URL||'');
u.searchParams.set('audience','reality-genuine-capability-auto-admit-v1');
const signed=await fetch(u,{cache:'no-store',redirect:'error',
 headers:{authorization:'Bearer '+env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}});
if(!signed.ok)die('OIDC_SIGNER_UNAVAILABLE');
const jwt=(await signed.json()).value;
if(typeof jwt!=='string'||jwt.length<300)die('SIGNED_WORKFLOW_IDENTITY_REQUIRED');
const r=await fetch(
 'https://hvkfreoagbrphwghjajw.supabase.co/functions/v1/reality-genuine-capability-auto-admit',{
 method:'POST',cache:'no-store',redirect:'error',
 headers:{authorization:'Bearer '+jwt,'content-type':'application/json',
  'x-reality-github-provider-token':env.GH_TOKEN},
 body:JSON.stringify({action:'readiness_snapshot',scope:{repository_sha:env.GITHUB_SHA}})});
const result=await r.json().catch(()=>null);
if(!r.ok||result?.ok!==true||
 result?.status!=='READINESS_EVIDENCE_VERIFIED'||
 result?.repository_sha!==env.GITHUB_SHA||
 result?.signed_run_id!==Number(env.GITHUB_RUN_ID)||
 result?.snapshot?.schema!=='reality-independent-production-readiness-snapshot-v1'||
 result?.snapshot?.scope!=='ISOLATED_PROJECT_READ_ONLY'||
 result?.snapshot?.production_release_authorized!==false||
 result?.snapshot?.production_changed!==false||
 result?.production_release_authorized!==false)
 die('DURABLE_DATABASE_READBACK_OR_SIGNED_WORKFLOW_UNVERIFIED');
const s=result.snapshot;
if(s.settled_original_jobs<0||
 s.unreconciled_settlements<0||
 s.verified_universe_settlements<0||
 s.independent_provider_verified_settlements<0||
 s.unreconciled_settlements+s.verified_universe_settlements!==s.settled_original_jobs||
 s.distinct_isolated_capability_families<0||
 s.unbound_capability_discoveries<0||
 s.qualifying_live_business_executions<0||
 s.release_gate==='READY'||
 !['NOT_READY','STILL_REQUIRES_ADVERSARIAL_AND_CANARY_EVIDENCE'].includes(s.release_gate))
 die('READINESS_ASSERTIONS_OR_RELEASE_STATUS_INVALID');
const gates={
 isolated_provider_settlement:{
  status:s.settled_original_jobs>0&&
   s.independent_provider_verified_settlements===s.settled_original_jobs?'PASS':'FAIL',
  verified:s.independent_provider_verified_settlements,
  total:s.settled_original_jobs},
 primary_universe_settlement:{
  status:s.unreconciled_settlements===0&&s.settled_original_jobs>0?'PASS':'FAIL',
  verified:s.verified_universe_settlements,total:s.settled_original_jobs},
 capability_probation:{
  status:s.qualifying_live_business_executions>=s.probation_target?'PASS':'FAIL',
  qualifying:s.qualifying_live_business_executions,target:s.probation_target},
 distinct_families:{
  status:s.distinct_isolated_capability_families>=3?'PASS':'FAIL',
  verified:s.distinct_isolated_capability_families,target:3},
 unbound_owner_work:{
  status:s.unbound_capability_discoveries===0?'PASS':'PENDING_OWNER_BINDING',
  waiting:s.unbound_capability_discoveries},
 adversarial_safety:{status:'UNPROVEN'},
 rollback_and_emergency_stop:{status:'UNPROVEN'},
 production_canary:{status:'NOT_AUTHORIZED'}
};
const report={
 schema:'reality-independent-production-readiness-report-v1',
 source:'SIGNED_GITHUB_WORKFLOW_AND_SERVICE_ONLY_DATABASE_READBACK',
 repository:'maloney2323/Reality',
 repository_sha:env.GITHUB_SHA,
 github_run_id:Number(env.GITHUB_RUN_ID),
 scope:'ISOLATED_PREVIEW',
 release_decision:'NOT_READY',
 release_authorized:false,
 production_changed:false,
 gates,
 evidence:s,
};
mkdirSync('artifact/out',{recursive:true});
writeFileSync('artifact/out/reality-production-readiness.json',JSON.stringify(report,null,2)+'\n');
console.log('REALITY_INDEPENDENT_READINESS_GATE',JSON.stringify({
 decision:report.release_decision,settled:s.settled_original_jobs,
 provider_verified:s.independent_provider_verified_settlements,
 main_ledger_reconciled:s.verified_universe_settlements,
 unreconciled:s.unreconciled_settlements,
 live_probation:s.qualifying_live_business_executions,
 probation_target:s.probation_target,
 distinct_capability_families:s.distinct_isolated_capability_families,
 waiting_owner_binding:s.unbound_capability_discoveries,
 production_changed:false}));
