// Read-only bridge from Reality's BASIC Work Center source catalog to
// Riley's Employee-category assignments and exact owner original-job ledger.
// A source-backed assignment is real unfinished REVIEW work, not automatic
// execution authority. Never reuse a settled or uncertain-effect original.
export const RILEY_CATEGORY_BACKLOG_VERSION='reality-riley-category-backlog-bridge-v1';
const SOURCE=/^https:\/\/github\.com\/maloney2323\/Reality\/(issues|pull|actions\/runs)\/([1-9]\d{0,15})$/;
const FINDING=/^catalog:[a-f0-9]{32}$/;
const KINDS=new Set(['bugs','reliability','upgrades','features']);
const fail=x=>{throw Error('RILEY_CATEGORY_BACKLOG_'+x)};
export function reconcileRileyCategoryAssignments({roster,issueBacklog}={}){
 if(roster?.status!=='READ_ONLY_PROPOSED_AI_EMPLOYEES'||
    !Array.isArray(roster.proposed_employees)||roster.proposed_employees.length!==8||
    issueBacklog?.version!=='reality-riley-existing-backlog-v1'||
    !Array.isArray(issueBacklog.rows)||issueBacklog.rows.length>25||
    issueBacklog.execution_authorized_by_read!==false||
    issueBacklog.installation_authorized!==false||
    issueBacklog.production_changed!==false)
  fail('INDEPENDENT_CATALOG_AND_OWNER_BACKLOG_REQUIRED');
 const r=roster.proposed_employees.filter(x=>
  x.employee_id==='reality-proposed:software_engineering'&&x.display_name==='Riley');
 if(r.length!==1||r[0].pilot!==true||!Array.isArray(r[0].candidate_jobs)||
    r[0].candidate_jobs.length>25||
    r[0].candidate_jobs.length!==r[0].candidate_count||
    r[0].independently_completed_jobs!==0)
  fail('EXACT_RILEY_EMPLOYEE_CATEGORY_UNVERIFIED');
 const issues=new Map();
 for(const issue of issueBacklog.rows){
  if(!Number.isSafeInteger(issue?.issue_number)||
     issue.source_url!=='https://github.com/maloney2323/Reality/issues/'+issue.issue_number||
     typeof issue.status!=='string'||issue.installation_authorized!==false||
     issue.original_job_completed_by_read!==false||
     issues.has(issue.source_url))fail('OWNER_ISSUE_BACKLOG_CHANGED');
  issues.set(issue.source_url,issue);
 }
 const seen=new Set(),assignments=[];
 for(const item of r[0].candidate_jobs){
  const match=SOURCE.exec(String(item?.source_url||''));
  if(!FINDING.test(item?.finding_id||'')||!match||
    !KINDS.has(item.source_category)||
    typeof item.title!=='string'||!item.title.trim()||
    item.authorized_execution!==false||
    item.independently_verified_done!==false||
    seen.has(item.source_url))
    fail('UNTRUSTED_OR_DUPLICATE_CATEGORY_ASSIGNMENT');
  seen.add(item.source_url);
  const kind=match[1]==='issues'?'ISSUE':
    match[1]==='pull'?'PULL_REQUEST':'FAILURE_SIGNAL';
  const existing=kind==='ISSUE'?issues.get(item.source_url):null;
  const status=kind==='ISSUE'?
   (existing?.status||'OWNER_ISSUE_READBACK_NOT_IN_COVERAGE'):
   kind==='PULL_REQUEST'?'OPEN_IMPLEMENTATION_NEEDS_INDEPENDENT_REVIEW':
   'HISTORICAL_FAILURE_REQUIRES_CURRENT_REPRODUCTION';
  assignments.push(Object.freeze({
   finding_id:item.finding_id,title:item.title.slice(0,210),
   source_url:item.source_url,source_category:item.source_category,
   source_kind:kind,status,
   existing_original_work_id:existing?.original_work_id||null,
   execution_route:kind==='PULL_REQUEST'?
    'GOVERNED_PR_REVIEW_NOT_AN_ORIGINAL_REPAIR':
    kind==='FAILURE_SIGNAL'?'FRESH_REPRODUCTION_BEFORE_ORIGINAL':
    existing?.status==='EXISTING_CAPABILITY_JOB_REQUIRES_LIVE_AUTHORITY_GATE'?
     'EXACT_EXISTING_ORIGINAL_MUST_PASS_CURRENT_OWNER_SHIFT_GATE':
     'INDEPENDENT_DEFECT_QUALIFICATION_REQUIRED',
   candidate_review_work_observed:true,
   original_execution_authorized:false,installation_authorized:false,
   independently_accepted_outcome:false
  }));
 }
 const previouslySettled=assignments.filter(x=>
  x.status==='PREVIOUS_ORIGINAL_JOBS_INDEPENDENTLY_SETTLED').length;
 const needsReview=assignments.length-previouslySettled;
 return Object.freeze({
  version:RILEY_CATEGORY_BACKLOG_VERSION,
  status:'EXISTING_RILEY_CATEGORY_FINDINGS_RECONCILED_NOT_EXECUTED',
  role:'Riley',source_scope:'REALITY_GITHUB_REPOSITORY_ONLY',
  category_findings:assignments.length,
  remaining_or_reconciliation_findings:needsReview,
  open_implementation_review_items:assignments.filter(x=>x.source_kind==='PULL_REQUEST').length,
  open_issue_work_items:assignments.filter(x=>x.source_kind==='ISSUE').length,
  provider_failure_signals:assignments.filter(x=>x.source_kind==='FAILURE_SIGNAL').length,
  independently_settled_issue_sources:previouslySettled,
  assignments:Object.freeze(assignments),
  source_coverage_complete:issueBacklog.source_coverage_complete===true,
  model_or_catalog_cannot_authorize_original:true,
  category_assignment_is_not_current_verified_defect:true,
  existing_original_must_be_reused_not_replayed:true,
  completed_original_jobs_created_by_bridge:0,
  worker_shift_dispatched:false,execution_authorized:false,
  installation_authorized:false,production_changed:false
 });
}
