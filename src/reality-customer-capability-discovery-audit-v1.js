// Owner-scoped governed discovery audit. Fresh GitHub provider observations
// become review candidates, NEVER jobs, authorization, or capability installs.
// Source-verified historical gaps are distinct from current CI failures.
import {createHash} from 'node:crypto';
import {readStewardshipGitHub} from './reality-stewardship-pass-v1.0.js';
import {discoverRealRepairOpportunities} from './reality-real-repair-opportunity-intake-v1.0.js';
const BASE='https://github.com/maloney2323/Reality/';
const FINGERPRINT=x=>createHash('sha256').update(x).digest('hex');
const RUN=new RegExp('^https://github\\.com/maloney2323/Reality/actions/runs/[1-9][0-9]*$');
const ISSUE=new RegExp('^https://github\\.com/maloney2323/Reality/issues/[1-9][0-9]*$');
const SHA40=/^[a-f0-9]{40}$/;
export const AUDIT_VERSION='reality-capability-discovery-audit-v1';
const fail=code=>{throw Error('CAPABILITY_DISCOVERY_AUDIT_'+code)};
const validRun=r=>Number.isSafeInteger(r?.id)&&r.id>0&&
 Number.isSafeInteger(r?.workflow_id)&&r.workflow_id>0&&
 r.status==='completed'&&
 r.head_repository?.full_name==='maloney2323/Reality'&&
 SHA40.test(String(r.head_sha||''))&&
 r.html_url===BASE+'actions/runs/'+r.id&&
 Number.isFinite(Date.parse(r.updated_at||''))&&
 ['failure','timed_out','success'].includes(r.conclusion);
export function inspectCurrentWorkflowRegressions(
 {workflow_runs=[]},{now=Date.now(),maxCandidates=6}={}){
 if(!Array.isArray(workflow_runs)||workflow_runs.length>100)
  fail('BOUNDED_PROVIDER_WORKFLOWS_REQUIRED');
 const groups=new Map();
 for(const r of workflow_runs){
  if(!validRun(r))continue;
  const at=Date.parse(r.updated_at);
  if(at>now+60000||now-at>7*86400000)continue;
  const key=r.workflow_id+':'+String(r.head_branch||'').slice(0,150);
  const arr=groups.get(key)||[];
  arr.push(r);groups.set(key,arr);
 }
 const findings=[];
 for(const [workflowKey,runs] of groups){
  runs.sort((a,b)=>Date.parse(b.updated_at)-Date.parse(a.updated_at));
  const lastSuccess=runs.find(x=>x.conclusion==='success');
  const successAt=lastSuccess?Date.parse(lastSuccess.updated_at):0;
  const recentFailures=runs.filter(x=>['failure','timed_out'].includes(x.conclusion)&&
   Date.parse(x.updated_at)>successAt&&
   now-Date.parse(x.updated_at)<72*3600000);
  // Two separate provider run IDs, and no later successful run.
  if(new Set(recentFailures.map(x=>x.id)).size<2)continue;
  const top=recentFailures[0],name=String(top.name||'Unnamed workflow').slice(0,130);
  findings.push({
   fingerprint:FINGERPRINT('reality:audit:workflow:'+workflowKey+':post-success-'+
    (lastSuccess?.id||'none')),
   kind:'REPEATED_CI_FAILURE',
   title:'Investigate recurring '+name+' failures',
   evidence_url:top.html_url,
   original_work_id:null,
   observed_failure_count:recentFailures.length,
   source_ref:top.html_url,
   source_branch:String(top.head_branch||'').slice(0,150),
   evidence_status:'INDEPENDENT_RECENT_FAILURES_MISSING_CAPABILITY_UNPROVEN',
   suggested_next_step:'Investigate and determine whether an actual missing capability caused the failures',
  });
 }
 return findings.sort((a,b)=>b.observed_failure_count-a.observed_failure_count)
  .slice(0,maxCandidates);
}
export function inspectSourceVerifiedGaps({opportunities=[]}={}){
 if(!Array.isArray(opportunities)||opportunities.length>40)
  fail('BOUNDED_PROVIDER_ISSUES_REQUIRED');
 return opportunities.filter(x=>x?.independently_verified===true&&
  x.owner_goal_bound===false&&
  x.installation_authorized===false&&x.job_completed===false&&
  Number.isSafeInteger(x.issue_number)&&x.issue_number>0&&
  Number.isSafeInteger(x.original_provider_failed_run_id)&&
  x.original_provider_failed_run_id>0&&
  x.issue_url===BASE+'issues/'+x.issue_number&&
  SHA40.test(String(x.source_sha||''))&&
  /^src\/reality-extensions\/[a-z0-9._/-]+\.mjs$/.test(String(x.source_path||''))&&
  /^work:[a-f0-9]{32}$/.test(String(x.original_work_id_for_provider_observation||'')))
  .slice(0,6).map(x=>({
   fingerprint:FINGERPRINT('reality:audit:source-gap:'+
    x.issue_number+':'+x.source_sha+':'+x.original_provider_failed_run_id),
   kind:'SOURCE_VERIFIED_GAP',
   title:String(x.issue_title||'Missing source for frozen acceptance').slice(0,150),
   evidence_url:x.issue_url,
   original_work_id:x.original_work_id_for_provider_observation,
   original_failed_run_ref:BASE+'actions/runs/'+x.original_provider_failed_run_id,
   source_path:x.source_path,
   source_sha:x.source_sha,
   evidence_status:'FROZEN_HISTORICAL_SOURCE_GAP_CURRENT_INSTALLATION_UNVERIFIED',
   suggested_next_step:'Review original failing acceptance and verify the gap is still current before adopting work',
  }));
}
export async function discoverGovernedCapabilityAudit({
 readRuns=()=>readStewardshipGitHub('/repos/maloney2323/Reality/actions/runs?per_page=30'),
 readGaps=discoverRealRepairOpportunities,
 now=Date.now(),
}={}){
 const observations=await Promise.allSettled([readRuns(),readGaps()]);
 const coverage={
  github_recent_actions:observations[0].status==='fulfilled'?'PROVIDER_READBACK_CHECKED':'UNAVAILABLE',
  github_frozen_source:observations[1].status==='fulfilled'?'INDEPENDENT_SOURCE_CHECKED':'UNAVAILABLE',
 };
 if(Object.values(coverage).every(x=>x==='UNAVAILABLE'))
  fail('ALL_LIVE_PROVIDER_SOURCES_UNAVAILABLE');
 const workflows=observations[0].status==='fulfilled'?
  inspectCurrentWorkflowRegressions(observations[0].value,{now}):[];
 const verifiedGaps=observations[1].status==='fulfilled'?
  inspectSourceVerifiedGaps(observations[1].value):[];
 // Prioritize independently source-verified gaps, then current repeated CI.
 const candidates=[...verifiedGaps,...workflows].slice(0,12);
 const report={
  version:AUDIT_VERSION,
  source_coverage:coverage,
  candidates,
 };
 return Object.freeze({
  ...report,report_sha256:FINGERPRINT(JSON.stringify(report)),
  source_checked_at:new Date(now).toISOString(),
  review_only:true,installation_authorized:false,
  worker_started:false,original_job_completed:false,production_changed:false,
 });
}
export async function saveGovernedCapabilityAudit({
 report,ownerId,db,fetchImpl=fetch,
}={}){
 if(!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(String(ownerId||''))||
  report?.version!==AUDIT_VERSION||!Array.isArray(report.candidates)||
  report.candidates.length>12||!db?.strictSecrets||
  typeof db.secretKey!=='string'||!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(db.url||''))
  fail('TRUSTED_OWNER_AUDIT_SCOPE_REQUIRED');
 const response=await fetchImpl(db.url+'/rest/v1/rpc/reality_record_owner_capability_discovery_audit_v1',{
  method:'POST',cache:'no-store',redirect:'error',
  headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
   accept:'application/json','content-type':'application/json'},
  body:JSON.stringify({p_owner_id:ownerId,p_report:report}),
 });
 const data=await response.json().catch(()=>null);
 if(!response.ok||data?.ok!==true||data?.status!=='GOVERNED_AUDIT_RECORDED'||
  !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(data.audit_id||'')||
  !Array.isArray(data.candidates)||data.candidates.length!==report.candidates.length||
  data.installation_authorized!==false||
  data.job_started!==false||data.production_changed!==false)
  fail('DURABLE_OWNER_AUDIT_RECEIPT_REQUIRED');
 for(let i=0;i<data.candidates.length;i++){
  const x=data.candidates[i],p=report.candidates[i];
  if(x.fingerprint!==p.fingerprint||x.kind!==p.kind||
     x.evidence_url!==p.evidence_url||
     !['ALREADY_SETTLED_NOT_ELIGIBLE','EXISTING_WORK_NOT_NEW',
      'PREVIOUSLY_OBSERVED','FIRST_OBSERVED_IN_OWNER_AUDIT'].includes(x.novelty))
   fail('OWNER_AUDIT_SOURCE_RECONCILIATION_FAILED');
 }
 return Object.freeze({
  ...data,source_coverage:report.source_coverage,
  source_checked_at:report.source_checked_at,
  report_sha256:report.report_sha256,
  audit_executed:true,review_only:true,
  installation_authorized:false,job_started:false,
  original_job_completed:false,production_changed:false,
 });
}
