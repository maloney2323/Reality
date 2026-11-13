// Reality Home: concise owner-scoped Employee overview.
// Source of truth is the existing read-only Employee roster endpoint. This
// does not create employees, dispatch work, authorize shifts or infer ROI.
(() => {
 'use strict';
 if (window.location.pathname !== '/') return;
 const root=document.getElementById('realityHomeEmployees');
 if (!root) return;
 const status=document.getElementById('realityHomeEmployeesStatus');
 const refresh=document.getElementById('realityHomeEmployeesRefresh');
 const names=['Avery','Riley','Quinn','Taylor','Casey','Morgan','Jordan','Sage'];
 let loading=false;
 async function load(){
  if(loading)return;
  loading=true;refresh.disabled=true;
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
   for(const name of names){
    const card=root.querySelector('[data-home-employee="'+name+'"]');
    const caption=card?.querySelector('[data-home-work]');
    if(!caption)throw Error('EMPLOYEE_HOME_CARD_MISSING');
    const e=map.get(name),n=e.candidate_count;
    caption.textContent=n+' source finding'+(n===1?'':'s')+' to qualify · '+
      (savedStatus==='VERIFIED_SAVED_CHAT'?
       ((saved.get(name)||0)+' saved Chat idea'+((saved.get(name)||0)===1?'':'s')):
       'saved Chat readback unavailable');
    card.dataset.evidence='read-only';
   }
   const total=data.existing_work_center_candidates;
   if(!Number.isSafeInteger(total)||total<0)
    throw Error('EMPLOYEE_SOURCE_TOTAL_UNVERIFIED');
   status.textContent='8 proposed AI roles · '+total+
    ' source findings across the team · '+
    (savedStatus==='VERIFIED_SAVED_CHAT'?
     saved.size+' roles with saved Chat proposals. ':
     'Saved Chat proposals temporarily unverified. ')+
    'No new job or shift authorized.';
  }catch{
   status.textContent='Employee evidence could not be verified. Existing receipts and the live work status below remain separate; no active work or savings inferred.';
  }finally{loading=false;refresh.disabled=false;}
 }
 refresh.addEventListener('click',()=>{void load();});
 void load();
})();
