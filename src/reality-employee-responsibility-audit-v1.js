// Owner-scoped employee RESPONSIBILITY audit from Reality's EXISTING
// live Work Center catalog and signed upstream weekly source qualification.
// Never relabel an observation as an executable original, install approval or ROI.
export const EMPLOYEE_RESPONSIBILITY_AUDIT_VERSION='reality-employee-responsibility-audit-v1';
const NAMES=['Avery','Riley','Quinn','Taylor','Casey','Morgan','Jordan','Sage'];
const URL=/^https:\/\/github\.com\/maloney2323\/Reality\/(?:issues|pull|actions\/runs)\/[1-9][0-9]*$/;
const STATUS=new Set(['PRIOR_ORIGINAL_SETTLED_NO_REPLAY',
 'EXACT_ORIGINAL_CONTINUATION_REQUIRES_EVIDENCE',
 'CURRENT_OWNER_OBJECTIVE_NEEDS_EXACT_TASK',
 'CURRENT_FAILURE_REPRODUCTION_REQUIRED',
 'SOURCE_REVIEW_NEEDS_CURRENT_PROOF']);
const RESPONSIBILITY_CHECKS=Object.freeze({
 Avery:['Review current product gaps and requested capabilities','Check which features directly unblock customer value'],
 Riley:['Inspect unresolved software defects and regression tests','Check whether existing verified repairs already meet the objective'],
 Quinn:['Inspect independent acceptance and security signals','Verify final receipts and reproducible failure evidence'],
 Taylor:['Inspect worker wakes, shift continuity and deployment issues','Investigate failures in automation, scheduling and integrations'],
 Casey:['Review customer-facing friction and onboarding gaps','Check interface accessibility and confusing workflows'],
 Morgan:['Review positioning and research opportunities','Find missing competitive evidence before proposing marketing work'],
 Jordan:['Inspect customer commitments and follow-up needs','Qualify customer opportunities without assuming revenue'],
 Sage:['Inspect expenses, cost evidence and operational risk','Check labor and ROI assumptions against independently completed work']
});
const fail=x=>{throw Error('EMPLOYEE_RESPONSIBILITY_AUDIT_'+x)};
export function buildEmployeeResponsibilityAudit({
 roster,snapshot=null,employee='ALL',capabilityAudit=null,now=new Date()
}={}){
 if(!NAMES.includes(employee)&&employee!=='ALL')fail('ROLE_NOT_FOUND');
 if(roster?.version!=='reality-proposed-ai-employee-roster-v1'||
   roster.status!=='READ_ONLY_PROPOSED_AI_EMPLOYEES'||
   roster.proposed_employee_count!==8||
   !Array.isArray(roster.proposed_employees)||
   roster.proposed_employees.length!==8||
   roster.production_changed!==false||roster.installation_authorized!==false||
   !(now instanceof Date)||!Number.isFinite(now.getTime()))
  fail('ROSTER_AND_CURRENT_SOURCE_REQUIRED');
 const coverage=snapshot?.status==='NEXT_WEEK_SOURCE_SNAPSHOT_PREPARED'&&
   snapshot.qualification_status==='CURRENT_SOURCE_INSPECTED_BEFORE_OWNER_DISCOVERY'&&
   snapshot.source_scope==='maloney2323/Reality'&&
   /^[a-f0-9]{64}$/.test(snapshot.source_sha256||'')&&
   Number.isInteger(snapshot.open_issue_count)&&
   snapshot.open_issue_count>=0&&snapshot.open_issue_count<=150&&
   snapshot.upstream_inspected_count===snapshot.open_issue_count&&
   Array.isArray(snapshot.employee_source_investigation_assignments)&&
   snapshot.employee_source_investigation_assignments.length===snapshot.open_issue_count&&
   snapshot.shift_execution_authorized===false&&
   snapshot.installation_authorized===false&&
   snapshot.production_changed===false;
 const weekly=coverage?snapshot.employee_source_investigation_assignments:[];
 const seenIssue=new Set();
 for(const item of weekly){
  if(!Number.isSafeInteger(item?.issue_number)||item.issue_number<1||
    item.source_url!=='https://github.com/maloney2323/Reality/issues/'+item.issue_number||
    seenIssue.has(item.source_url)||!NAMES.includes(item.assigned_employee)||
    !STATUS.has(item.status)||typeof item.next_proof!=='string'||
    item.next_proof.length<20||item.execution_authorized!==false||
    item.installation_authorized!==false||item.executable_original!==false)
   fail('WEEKLY_PROVIDER_OR_DEDUP_PROOF_INVALID');
  seenIssue.add(item.source_url);
 }
 if(capabilityAudit!==null&&(capabilityAudit.audit_executed!==true||
   capabilityAudit.installation_authorized!==false||
   capabilityAudit.production_changed!==false||
   !Array.isArray(capabilityAudit.candidates)))
  fail('CAPABILITY_AUDIT_PROVENANCE_INVALID');
 const wanted=employee==='ALL'?NAMES:[employee];
 const seenNames=new Set();
 const roles=wanted.map(name=>{
  const item=roster.proposed_employees.find(x=>x.display_name===name);
  if(!item||seenNames.has(name)||item.activation_status!=='PROPOSED_NOT_DEPLOYED'||
    !Array.isArray(item.candidate_jobs)||item.candidate_jobs.length!==item.candidate_count)
   fail('TRUSTED_ROLE_AND_CANDIDATE_COVERAGE_REQUIRED');
  seenNames.add(name);
  const inspected=weekly.filter(x=>x.assigned_employee===name);
  const unsettled=inspected.filter(x=>x.status!=='PRIOR_ORIGINAL_SETTLED_NO_REPLAY');
  const seenSources=new Set(inspected.map(x=>x.source_url));
  const nextActions=unsettled.slice(0,12).map(x=>({
   source_url:x.source_url,title:x.title,issue_number:x.issue_number,
   next_proof:x.next_proof,qualification_status:x.status,
   assignment_kind:'SOURCE_BACKED_INVESTIGATION_NOT_EXECUTABLE',
   installation_authorized:false,execution_authorized:false
  }));
  const catalog=item.candidate_jobs.filter(x=>{
   if(!URL.test(x.source_url||'')||seenSources.has(x.source_url))return false;
   seenSources.add(x.source_url);
   return true;
  }).slice(0,8);
  for(const finding of catalog)nextActions.push({
   source_url:finding.source_url,title:finding.title,
   next_proof:typeof finding.proof==='string'&&finding.proof.length>12?
    finding.proof.slice(0,220):
    'Confirm the current source and reproduce a distinct unresolved need before execution.',
   qualification_status:'WORK_CATALOG_REQUIRES_CURRENT_REPRODUCTION',
   assignment_kind:'SOURCE_REVIEW_NOT_YET_A_JOB',
   installation_authorized:false,execution_authorized:false
  });
  return Object.freeze({
   employee_name:name,role:item.role,
   responsibility_summary:item.role_summary,
   responsibility_checks:RESPONSIBILITY_CHECKS[name],
   weekly_source_inspected:inspected.length,
   weekly_investigation_assignments:unsettled.length,
   settled_origins_excluded:inspected.length-unsettled.length,
   catalog_source_candidates:item.candidate_count,
   suggested_checks:Object.freeze(nextActions.slice(0,14)),
   source_coverage:coverage?'SIGNED_UPSTREAM_WEEKLY_AND_LIVE_CATALOG':
    'LIVE_CATALOG_ONLY_WEEKLY_READBACK_UNVERIFIED',
   additional_business_connections_needed:
    ['Morgan','Jordan','Sage'].includes(name),
   // An audit is NOT an original job; an open issue is not a proven defect.
   qualified_executable_originals_created:0,
   installations_authorized:0
  });
 });
 return Object.freeze({
  version:EMPLOYEE_RESPONSIBILITY_AUDIT_VERSION,
  status:coverage?'EMPLOYEE_RESPONSIBILITIES_SOURCE_AUDITED':
   'EMPLOYEE_RESPONSIBILITIES_PARTIAL_SOURCE_AUDIT',
  requested_scope:employee,checked_at:now.toISOString(),
  source_scope:'REALITY_GITHUB_AND_EXISTING_OWNER_WORK',
  source_coverage_complete_for_business:false,
  source_coverage_caveat:'Only connected Reality and GitHub work was checked. Business functions without connected customer, finance or marketing systems require additional evidence.',
  week_start:coverage?snapshot.week_start:null,
  weekly_source_inspected:weekly.length,
  included_employee_roles:roles.length,
  role_audits:Object.freeze(roles),
  capability_audit_receipt:capabilityAudit?.audit_id||null,
  capability_opportunities_independently_reviewed:
   capabilityAudit?.candidates?.length??0,
  automatic_business_execution_performed:false,
  new_original_jobs_created:0,shift_started:false,
  installation_authorized:false,production_changed:false,
  financial_savings_verified:false
 });
}
