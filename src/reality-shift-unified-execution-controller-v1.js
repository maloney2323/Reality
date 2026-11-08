// One trusted view of the WHOLE authorized Reality employee shift.
// It binds source-native originals and Universe originals by the SAME
// owner/shift/source evidence without manufacturing goal transitions.
// Its decisions are read-only plan gates, NEVER new authorization or settlement.
export const REALITY_UNIFIED_SHIFT_CONTROLLER_VERSION=
 'reality-unified-employee-original-execution-v1';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const SHA=/^sha256:[a-f0-9]{64}$/;
const WORK=/^work:[a-f0-9]{32}$/;
const URL=/^https:\/\/github\.com\/maloney2323\/Reality\/(?:issues|pull)\/[1-9]\d*$/;
const KINDS=new Set(['REAL_ENGINEERING_REPAIR_ORIGINAL',
 'REAL_PR_REVIEW_ORIGINAL','GENUINE_UNIVERSE_CAPABILITY_ORIGINAL',
 'SOURCE_REVIEW_NOT_YET_AN_EXECUTABLE_ORIGINAL','UNVERIFIED_SOURCE']);
const fail=x=>{throw Error('REALITY_UNIFIED_SHIFT_'+x)};

export function assertRealityUnifiedShiftGraph(graph,{expectedShiftId=null}={}){
 if(graph?.status==='NO_CURRENT_OWNER_SHIFT_EXECUTION_GRAPH'||
    graph?.status==='NO_ACTIVE_OWNER_BOUND_EXECUTION_GRAPH'){
  if(graph.installation_authorized!==false||
     graph.production_changed!==false||
     !Array.isArray(graph.jobs)||graph.jobs.length!==0)
   fail('NO_SHIFT_RESULT_UNVERIFIED');
  return Object.freeze({status:'NO_CURRENT_AUTHORIZED_WORK',
   shift_id:null,owner_id:null,jobs:Object.freeze([]),
   engineering_ready:false,pr_ready:false,
   install_approval_pending:false,all_selected_settled:false,
   next_action:'AWAIT_SIGNED_OWNER_START',installation_authorized:false,
   production_changed:false});
 }
 if(graph?.status!=='OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED'||
    !UUID.test(graph.shift_id||'')||!UUID.test(graph.owner_id||'')||
    !SHA.test(graph.plan_fingerprint||'')||
    (expectedShiftId&&expectedShiftId!==graph.shift_id)||
    graph.completion_bound!==true||
    graph.execution_scope_from_owner_warrant_only!==true||
    graph.new_job_created!==false||
    graph.installation_authorized!==false||
    graph.original_job_completed_by_graph!==false||
    graph.production_changed!==false||
    !Array.isArray(graph.jobs)||
    graph.jobs.length<1||graph.jobs.length>4||
    graph.selected_sources!==graph.jobs.length)
  fail('CURRENT_SIGNED_OWNER_SCOPE_UNVERIFIED');
 const seenSources=new Set(),seenWorks=new Set();
 const all=graph.jobs.map(item=>{
  if(!Number.isInteger(item?.source_step_index)||
     item.source_step_index<2||item.source_step_index>5||
     !URL.test(item.source_ref||'')||
     !KINDS.has(item.original_kind)||
     !['SOURCE_CHECKED','QUEUED','CLAIMED','BLOCKED_PROVIDER',
       'REPORTED','NOT_ADMITTED','SOURCE_ADMITTED','PREPARED','SETTLED',
       'CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL','CANDIDATE_TESTING',
       'PENDING_FROZEN_REPRODUCTION',
       'EVIDENCE_RECONCILIATION_REQUIRED',
       'FROZEN_REPRODUCED_AWAITING_CANDIDATE',
       'PUBLISHING','BLOCKED',
       'LEASED_FOR_INDEPENDENT_REPRODUCTION','AWAITING_OWNER_APPROVAL',
       'ISOLATED_INSTALLED_PROBATION','SETTLED_ISOLATED'].includes(item.phase)||
     !/^[A-Z0-9_]{8,100}$/.test(item.next_governed_action||'')||
     item.capability_installation_authorized!==false||
     item.original_job_completed_by_graph!==false||
     item.provider_effect_claimed_by_graph!==false||
     seenSources.has(item.source_ref))
   fail('EXACT_SOURCE_IDENTITY_OR_RESULT_UNVERIFIED');
  seenSources.add(item.source_ref);
  if(item.independent_source_proof_verified!==true){
   if(item.original_kind!=='UNVERIFIED_SOURCE')
    fail('UNVERIFIED_SOURCE_CANNOT_DISPATCH');
  }else if(!SHA.test(item.source_proof_sha256||'')){
   fail('INDEPENDENT_SOURCE_PROOF_MISSING');
  }
  if(item.original_work_id!==null&&item.original_work_id!==undefined){
   if(!WORK.test(item.original_work_id)||
      seenWorks.has(item.original_work_id))
    fail('DUPLICATE_ORIGINAL_WORK_ID_OR_INVALID');
   seenWorks.add(item.original_work_id);
  }else if(item.original_kind==='REAL_ENGINEERING_REPAIR_ORIGINAL'&&
           item.phase==='SOURCE_ADMITTED'){
   fail('ADMITTED_REPAIR_MUST_HAVE_ORIGINAL_ID');
  }
  const is263=item.source_ref===
   'https://github.com/maloney2323/Reality/issues/263';
  if(item.original_kind==='REAL_ENGINEERING_REPAIR_ORIGINAL'&&!is263)
   fail('REPAIR_SOURCE_SCOPE_CHANGED');
  if(is263&&item.independent_source_proof_verified===true&&
     item.original_kind!=='REAL_ENGINEERING_REPAIR_ORIGINAL')
   fail('EXACT_REPAIR_IDENTITY_MUST_NOT_BE_RECAST_AS_OTHER_ENGINE');
  return Object.freeze({...item});
 });
 const engineering=all.filter(x=>x.original_kind==='REAL_ENGINEERING_REPAIR_ORIGINAL');
 const pr=all.filter(x=>x.original_kind==='REAL_PR_REVIEW_ORIGINAL');
 const waiting=all.filter(x=>x.original_kind==='SOURCE_REVIEW_NOT_YET_AN_EXECUTABLE_ORIGINAL');
 const engineeringReady=engineering.some(x=>
  x.independent_source_proof_verified===true&&x.phase==='SOURCE_ADMITTED');
 const prReady=pr.some(x=>
  x.independent_source_proof_verified===true&&x.phase==='PREPARED');
 const testedNativeCandidate=engineering.some(x=>
  x.phase==='CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL');
 const unverified=all.some(x=>x.independent_source_proof_verified!==true);
 // Do not infer "settled" from source checks, worker wakes or model advice.
 // Whole shift completion remains the independent DB receipt closer's job.
 const next=unverified?'VERIFY_EXACT_SOURCE_EVIDENCE':
  engineeringReady?'GENERATE_AND_INDEPENDENTLY_TEST_SAME_REPAIR':
  testedNativeCandidate?'VERIFY_NATIVE_INSTALL_AND_RESUME_PATH_BEFORE_OWNER_APPROVAL':
  prReady?'CONTINUE_INDEPENDENT_PR_REVIEW':
  waiting.length?'QUALIFY_UNADMITTED_ORIGINAL_WORK':
  'RECONCILE_FINAL_INDEPENDENT_RECEIPTS';
 return Object.freeze({
  status:'UNIFIED_OWNER_JOB_CONTROL_READY',
  shift_id:graph.shift_id,owner_id:graph.owner_id,
  plan_fingerprint:graph.plan_fingerprint,
  jobs:Object.freeze(all),
  engineering_ready:engineeringReady,
  pr_ready:prReady,
  // A tested patch is NOT a verified install-to-settlement capability.
  install_approval_pending:false,
  tested_native_candidate_present:testedNativeCandidate,
  all_selected_settled:false,
  next_action:next,
  installation_authorized:false,
  production_changed:false});
}