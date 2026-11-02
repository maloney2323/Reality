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
const integrity=result.integrity;
if(integrity?.schema!=='reality-genuine-release-integrity-audit-v1'||
 integrity.scope!=='ISOLATED_PROJECT_READ_ONLY'||
 integrity.production_release_authorized!==false||
 integrity.production_changed!==false||
 integrity.release_decision!=='NOT_READY'||
 integrity.verified_completion_events_audited!==result.snapshot.verified_universe_settlements||
 integrity.missing_verified_completion_events!==0||
 integrity.duplicate_completion_work_ids!==0||
 integrity.invalid_content_hashes!==0||
 integrity.broken_parent_lineages!==0||
 integrity.unsupported_verified_completion_claims!==0||
 integrity.authority_mismatch_events!==0||
 integrity.anon_settlement_execute!==false||
 integrity.authenticated_settlement_execute!==false)
 die('INDEPENDENT_LIVE_LEDGER_INTEGRITY_OR_AUTHORITY_FAILED');
// Verify real isolated owner-settlement denial and rollback after a durable write.
const fault=result.fault_probes;
if(fault?.schema!=='reality-genuine-fault-injection-probe-v1'||
 fault.scope!=='ISOLATED_PROJECT_ONLY'||
 !/^work:[a-f0-9]{32}$/.test(fault.genuine_original_work_id||'')||
 fault.invalid_settlement_claim_denied!==true||
 fault.nonexistent_work_outcome_denied!==true||
 fault.durable_queue_write_rolled_back!==true||
 fault.live_original_job_unchanged!==true||
 fault.verified_original_outcome_count!==1||
 fault.fault_injection_cases_passed!==3||
 fault.fault_injection_cases_total!==3||
 fault.actual_install_rollback!=='NOT_TESTED'||
 fault.emergency_kill_switch!=='NOT_TESTED'||
 fault.production_release_authorized!==false||
 fault.production_changed!==false)
 die('REAL_PRIVILEGED_SETTLEMENT_FAULT_INJECTION_FAILED');
// Real network probes against the deployed signed broker. Untrusted callers must fail.
const endpoint='https://hvkfreoagbrphwghjajw.supabase.co/functions/v1/reality-genuine-capability-auto-admit';
const body=JSON.stringify({action:'universe_outcome_reconcile',scope:{repository_sha:env.GITHUB_SHA}});
const negative=[];
for(const [label,headers] of [
 ['missing_signature',{'content-type':'application/json'}],
 ['invalid_signature',{'content-type':'application/json',authorization:'Bearer invalid.jwt.signature'}]
]){
 const probe=await fetch(endpoint,{method:'POST',cache:'no-store',redirect:'error',headers,body});
 const outcome=await probe.json().catch(()=>null);
 if(probe.ok||outcome?.ok===true||probe.status<400||probe.status>499)
   die('UNSIGNED_BROKER_REQUEST_WAS_NOT_DENIED_'+label);
 negative.push({label,denied_http_status:probe.status,authorized:false});
}
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
 observed_universe_completion_integrity:{
  status:'PASS',audited:integrity.verified_completion_events_audited,
  unsupported_claims:integrity.unsupported_verified_completion_claims,
  duplicate_work_ids:integrity.duplicate_completion_work_ids,
  broken_lineages:integrity.broken_parent_lineages,
  invalid_hashes:integrity.invalid_content_hashes},
 signed_broker_negative_authorization:{status:'PASS',probes:negative},
 isolated_database_fault_injection:{status:'PASS',cases:fault.fault_injection_cases_passed,
  observed_rejections:2,rolled_back_probe_writes:1,
  scope:'SETTLEMENT_DENIAL_AND_QUEUE_SUBTRANSACTION_ONLY'},
 adversarial_safety:{status:'PARTIAL_ONLY',unmeasured:'REAL_EXTERNAL_EXECUTION_FAILURE_AND_RETRY'},
 rollback_and_emergency_stop:{status:'UNPROVEN',database_subtransaction_rollback:'PASS',
  actual_install_rollback:'NOT_TESTED',emergency_kill_switch:'NOT_TESTED'},
 production_canary:{status:'NOT_AUTHORIZED'}
};
// Explicit reasons for NOT_READY. Nothing here authorizes production.
const releaseBlockers=[];
if(gates.isolated_provider_settlement.status!=='PASS') releaseBlockers.push('UNVERIFIED_PROVIDER_SETTLEMENT');
if(gates.primary_universe_settlement.status!=='PASS') releaseBlockers.push('UNRECONCILED_UNIVERSE_COMPLETION');
if(s.qualifying_live_business_executions<s.probation_target)
 releaseBlockers.push('LIVE_BUSINESS_PROBATION_'+s.qualifying_live_business_executions+'_OF_'+s.probation_target);
if(s.distinct_isolated_capability_families<3)
 releaseBlockers.push('CAPABILITY_FAMILIES_'+s.distinct_isolated_capability_families+'_OF_3');
if(s.unbound_capability_discoveries>0)
 releaseBlockers.push('UNBOUND_OWNER_DISCOVERIES_'+s.unbound_capability_discoveries);
if(s.unfinished_owner_bound_work>0)
 releaseBlockers.push('UNFINISHED_OWNER_WORK_'+s.unfinished_owner_bound_work);
releaseBlockers.push('REAL_INSTALLED_CAPABILITY_ROLLBACK_UNTESTED');
releaseBlockers.push('EMERGENCY_KILL_SWITCH_UNTESTED');
releaseBlockers.push('FAULTED_EXTERNAL_EXECUTION_RECOVERY_UNTESTED');
releaseBlockers.push('PRODUCTION_CANARY_NOT_AUTHORIZED');
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
 independent_integrity_audit:integrity,
 negative_authorization_probes:negative,
 isolated_database_fault_probes:fault,
 release_blockers:releaseBlockers,
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
 integrity_audited:integrity.verified_completion_events_audited,
 false_completion_claims:integrity.unsupported_verified_completion_claims,
 signed_broker_negative_probes:negative.length,
 real_fault_injection_passed:fault.fault_injection_cases_passed,
 remaining_release_blockers:releaseBlockers.length,
 production_changed:false}));
