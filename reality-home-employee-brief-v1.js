// Reality Home: concise owner-scoped Employee overview.
// Source of truth is the existing read-only Employee roster endpoint. This
// does not create employees, dispatch work, authorize shifts or infer ROI.
(() => {
 'use strict';
 if (!['/','/employees','/shifts'].includes(window.location.pathname)) return;
 const root=document.getElementById('realityHomeEmployees');
 if (!root) return;
 const status=document.getElementById('realityHomeEmployeesStatus');
 const refresh=document.getElementById('realityHomeEmployeesRefresh');
 const names=['Avery','Riley','Quinn','Taylor','Casey','Morgan','Jordan','Sage'];
 const emitWeekly=insight=>{
  // The existing roster fetch owns the source. Home receives a read-only
  // projection, not a duplicate employee planner or private API call.
  window.dispatchEvent(new CustomEvent('reality:weekly-workload-readback',{
   detail:insight||null
  }));
 };
 const validWeekly=(insight,data)=>{
  if(insight?.version!=='reality-weekly-workload-insight-v1'||
   insight.status!=='PROVISIONAL_REVIEW_COVERAGE_GAP_NOT_VERIFIED_EMPLOYEE_SCHEDULE'||
   insight.source_scope!=='REALITY_GITHUB_REPOSITORY_ONLY'||
   insight.read_only!==true||insight.execution_authorized!==false||
   insight.installation_authorized!==false||
   insight.production_changed!==false||
   insight.comparison_is_not_actual_schedule!==true||
   insight.remaining_reference_hours_are_not_verified_missing_customer_jobs!==true||
   insight.actual_scheduled_execution_hours_verified!==null||
   insight.verified_cash_savings_usd!==null||
   insight.role_count!==data.proposed_employee_count||
   !Array.isArray(insight.roles)||insight.roles.length!==insight.role_count||
   insight.week_start!==data.next_week_plan?.week_start||
   insight.week_end!==data.next_week_plan?.week_end||
   insight.provisional_review_timebox_hours!==data.next_week_plan?.proposed_review_timebox_hours_total||
   insight.hypothetical_weekly_reference_hours!==data.next_week_plan?.five_day_week_capacity_hours||
   !Number.isFinite(insight.unallocated_hypothetical_reference_hours)||
   insight.unallocated_hypothetical_reference_hours<0||
   !Number.isSafeInteger(insight.source_work_role_count)||
   insight.source_work_role_count<0||
   insight.source_work_role_count>insight.role_count||
   insight.roles_without_source_work_count!==insight.role_count-insight.source_work_role_count||
   insight.source_work_roles_hypothetical_reference_hours!==insight.source_work_role_count*40||
   insight.source_work_comparison_available!==(insight.source_work_role_count>0)||
   !Number.isFinite(insight.source_work_roles_provisional_hours)||
   !Number.isFinite(insight.source_work_roles_unallocated_reference_hours)||
   !insight.roles.every(r=>
    names.includes(r.employee_name)&&
    Number.isFinite(r.proposed_review_timebox_hours)&&
    Number.isFinite(r.unallocated_hypothetical_reference_hours)&&
    r.hypothetical_weekly_comparison_hours===40&&
    Array.isArray(r.week_days)&&r.week_days.length===5&&
    r.active_worker_verified===false))
   return false;
  const active=insight.roles.filter(r=>r.source_finding_count+r.deferred_source_count>0);
  return insight.roles.reduce((n,r)=>n+r.proposed_review_timebox_hours,0)===
   insight.provisional_review_timebox_hours&&
   insight.roles.reduce((n,r)=>n+r.unallocated_hypothetical_reference_hours,0)===
   insight.unallocated_hypothetical_reference_hours&&
   active.length===insight.source_work_role_count&&
   active.reduce((n,r)=>n+r.proposed_review_timebox_hours,0)===
    insight.source_work_roles_provisional_hours&&
   active.reduce((n,r)=>n+r.unallocated_hypothetical_reference_hours,0)===
    insight.source_work_roles_unallocated_reference_hours;
 };
 const auth=document.getElementById('privateReady');
 let loading=false,pendingReload=false;
 async function load(){
  if(loading){pendingReload=true;return;}
  loading=true;refresh.disabled=true;
  emitWeekly(null); // Remove stale owner data before each authenticated readback.
  status.textContent='Checking saved employee work and current source observations…';
  try{
   const response=await fetch('/api/reality/personal-employee-roster',{
    method:'GET',credentials:'same-origin',cache:'no-store',
    signal:AbortSignal.timeout(47000)
   });
   const data=await response.json().catch(()=>null);
   if(response.status===401){
    status.textContent='Sign in to see your source-backed employee work and saved Chat proposals.';
    return;
   }
   if(!response.ok||data?.ok!==true||
     data.status!=='READ_ONLY_PROPOSED_AI_EMPLOYEES'||
     data.owner_scope_verified!==true||
     data.worker_execution_authorized!==false||
     data.installation_authorized!==false||
     data.production_changed!==false||
     data.proposed_employee_count!==8||
     !Array.isArray(data.proposed_employees)||data.proposed_employees.length!==8)
     throw Error('EMPLOYEE_ROSTER_UNVERIFIED');
   const map=new Map();
   for(const employee of data.proposed_employees){
    if(!names.includes(employee?.display_name)||map.has(employee.display_name)||
       employee.activation_status!=='PROPOSED_NOT_DEPLOYED'||
       !Number.isSafeInteger(employee.candidate_count)||
       employee.candidate_count<0||
       !Array.isArray(employee.candidate_jobs)||
       employee.candidate_jobs.length!==employee.candidate_count||
       employee.independently_completed_jobs!==0)
      throw Error('EMPLOYEE_WORK_PROOF_UNVERIFIED');
    map.set(employee.display_name,employee);
   }
   if(map.size!==8)throw Error('EMPLOYEE_ROLE_COVERAGE_UNVERIFIED');
   let saved=new Map(),savedStatus='SAVED_CHAT_UNVERIFIED';
   const proposals=data.saved_chat_employee_proposals;
   if(data.saved_chat_employee_proposals_status==='AUTHENTICATED_SAVED_CHAT_READBACK'&&
      proposals?.version==='reality-saved-chat-employee-proposals-v1'&&
      proposals.read_only===true&&proposals.execution_authorized===false&&
      proposals.installation_authorized===false&&
      proposals.proposals_not_verified_jobs===true&&
      Array.isArray(proposals.roles)&&proposals.roles.length<=8){
    for(const row of proposals.roles){
     if(!names.includes(row.employee_name)||saved.has(row.employee_name)||
        !Array.isArray(row.proposals)||row.proposals.length>8)
       throw Error('SAVED_CHAT_ROLE_PROOF_UNVERIFIED');
     saved.set(row.employee_name,row.proposals.length);
    }
    savedStatus='VERIFIED_SAVED_CHAT';
   }
   const sourceQualification=data.upstream_source_qualification;
   const inspected=sourceQualification?.status===
    'UPSTREAM_PROVIDER_SOURCES_QUALIFIED_FOR_INVESTIGATION'&&
    Number.isSafeInteger(sourceQualification.inspected_count)&&
    Number.isSafeInteger(sourceQualification.investigation_assignment_count)&&
    Number.isSafeInteger(sourceQualification.already_settled_no_replay_count)&&
    Array.isArray(sourceQualification.items)&&
    sourceQualification.items.length===sourceQualification.inspected_count&&
    sourceQualification.inspected_count===
     sourceQualification.investigation_assignment_count+
      sourceQualification.already_settled_no_replay_count;
   const precheckedByEmployee=new Map();
   if(inspected){
    for(const item of sourceQualification.items){
     if(!names.includes(item?.assigned_employee)||
        !Number.isSafeInteger(item.issue_number)||
        item.source_url!=='https://github.com/maloney2323/Reality/issues/'+
          item.issue_number||
        !['PRIOR_ORIGINAL_SETTLED_NO_REPLAY',
         'EXACT_ORIGINAL_CONTINUATION_REQUIRES_EVIDENCE',
         'CURRENT_OWNER_OBJECTIVE_NEEDS_EXACT_TASK',
         'CURRENT_FAILURE_REPRODUCTION_REQUIRED',
         'SOURCE_REVIEW_NEEDS_CURRENT_PROOF'].includes(item.status)||
        item.executable_original!==false||item.execution_authorized!==false||
        item.installation_authorized!==false)
      throw Error('UPSTREAM_EMPLOYEE_INSPECTION_UNVERIFIED');
     if(item.status!=='PRIOR_ORIGINAL_SETTLED_NO_REPLAY')
      precheckedByEmployee.set(item.assigned_employee,
       (precheckedByEmployee.get(item.assigned_employee)||0)+1);
    }
   }
   // Distinguish actual signed-worker investigation receipts from
   // source triage suggestions; never infer a completed code repair.
   const workerReceipts=data.weekly_employee_investigation_receipts;
   const verifiedWorkerReceipts=workerReceipts?.status===
    'SIGNED_WORKER_EMPLOYEE_INVESTIGATIONS_INDEPENDENTLY_RECEIPTED'&&
    workerReceipts.source_investigation_only===true&&
    workerReceipts.new_executable_jobs_authorized===0&&
    workerReceipts.installation_authorized===false&&
    workerReceipts.production_changed===false&&
    Array.isArray(workerReceipts.receipts)&&
    workerReceipts.receipts.length===workerReceipts.count;
   const doneByEmployee=new Map();
   if(verifiedWorkerReceipts){
    const unique=new Set();
    for(const proof of workerReceipts.receipts){
     if(!names.includes(proof.employee)||
      !/^supabase:weekly_employee_investigation_receipts_v1:[a-f0-9-]{36}$/
       .test(proof.investigation_receipt_ref||'')||
      unique.has(proof.source_ref))
      throw Error('WORKER_EMPLOYEE_INVESTIGATION_PROOF_UNVERIFIED');
     unique.add(proof.source_ref);
     doneByEmployee.set(proof.employee,
      (doneByEmployee.get(proof.employee)||0)+1);
    }
   }
   const activeOriginals=data.current_shift_engineering_originals;
   const originalsVerified=activeOriginals?.status===
    'CURRENT_OWNER_SHIFT_ENGINEERING_ORIGINALS_SOURCE_BOUND'&&
    activeOriginals.owner_scope_verified===true&&
    activeOriginals.new_shift_started===false&&
    activeOriginals.installation_authorized===false&&
    activeOriginals.production_changed===false&&
    Array.isArray(activeOriginals.items)&&
    activeOriginals.items.length===activeOriginals.count;
   const activeByEmployee=new Map();
   if(originalsVerified){
    const seenWork=new Set();
    for(const work of activeOriginals.items){
     if(!names.includes(work.assigned_employee)||
      !/^work:[a-f0-9]{32}$/.test(work.original_work_id||'')||
      seenWork.has(work.original_work_id)||
      !['SOURCE_ADMITTED','CANDIDATE_TESTING',
       'CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL'].includes(work.phase)||
      work.installation_authorized!==false||
      work.original_job_completed!==false)
      throw Error('SIGNED_ENGINEERING_ORIGINAL_PROOF_UNVERIFIED');
     seenWork.add(work.original_work_id);
     activeByEmployee.set(work.assigned_employee,
      (activeByEmployee.get(work.assigned_employee)||0)+1);
    }
   }
   for(const name of names){
    const card=root.querySelector('[data-home-employee="'+name+'"]');
    const caption=card?.querySelector('[data-home-work]');
    if(!caption)throw Error('EMPLOYEE_HOME_CARD_MISSING');
    const e=map.get(name),n=e.candidate_count;
    caption.textContent=(originalsVerified&&activeByEmployee.get(name)?
      activeByEmployee.get(name)+' governed engineering original(s) admitted; awaiting model draft and tests · ':'')+
     (verifiedWorkerReceipts?
      (doneByEmployee.get(name)||0)+' investigation'+
       ((doneByEmployee.get(name)||0)===1?'':'s')+
       ' independently receipted · ':'')+
     (inspected?
      (precheckedByEmployee.get(name)||0)+' current GitHub investigation'+
       ((precheckedByEmployee.get(name)||0)===1?'':'s')+
       ' prechecked · ':'')+
      n+' other catalog signal'+(n===1?'':'s')+' to qualify · '+
      (savedStatus==='VERIFIED_SAVED_CHAT'?
       ((saved.get(name)||0)+' saved Chat idea'+((saved.get(name)||0)===1?'':'s')):
       'saved Chat readback unavailable');
    card.dataset.evidence='read-only';
   }
   const total=data.existing_work_center_candidates;
   if(!Number.isSafeInteger(total)||total<0)
    throw Error('EMPLOYEE_SOURCE_TOTAL_UNVERIFIED');
   status.textContent=(originalsVerified&&activeOriginals.count?
     activeOriginals.count+' owner-warranted engineering original(s) admitted to Reality; work not yet installed or settled · ':'')+
    (verifiedWorkerReceipts?
     workerReceipts.count+' actual employee source investigations independently receipted · ':
     'Employee investigation receipts not yet independently read back · ')+
    (inspected?
    sourceQualification.inspected_count+' current GitHub findings independently inspected upstream · '+
    sourceQualification.investigation_assignment_count+' employee investigations organized · '+
    sourceQualification.already_settled_no_replay_count+' settled source withheld from replay. ':
    'Weekly GitHub qualification pending. ')+
    '8 proposed AI roles · '+total+
    ' other catalog findings awaiting qualification · '+
    (savedStatus==='VERIFIED_SAVED_CHAT'?
     saved.size+' roles with saved Chat proposals. ':
     'Saved Chat proposals temporarily unverified. ')+
    'This read-only board does not start any new shift or authorize installation.';
   // Publish only the exact same owner-scoped projection Home received.
   // A failure is UNKNOWN, never zero hours, and cannot survive logout.
   emitWeekly(validWeekly(data.weekly_workload_insight,data)?
    data.weekly_workload_insight:null);
  }catch{
   emitWeekly(null);
   status.textContent='Employee evidence could not be verified. Existing receipts and the live work status below remain separate; no active work or savings inferred.';
  }finally{
   loading=false;refresh.disabled=false;
   if(pendingReload){
    pendingReload=false;
    if(auth?.style.display==='block')void load();
   }
  }
 }
 // Login may finish after initial anonymous readback. Reuse this same
 // owner-scoped endpoint; do not leave stale data until manual Refresh.
 if(auth&&typeof MutationObserver==='function')
  new MutationObserver(()=>{
   if(auth.style.display==='block')void load();
   else emitWeekly(null);
  }).observe(auth,{attributes:true,attributeFilter:['style']});
 refresh.addEventListener('click',()=>{void load();});
 void load();
})();
