/* Reality's own verified candidate -> exact one-use owner work-scope decision
 * inside the active Chat. A model message cannot click, approve or install.
 */
(()=>{
 'use strict';
 if(!/^\/chat\/?$/.test(window.location.pathname))return;
 const get=id=>document.getElementById(id);
 const ready=get('privateReady'),thread=get('privateTranscript');
 if(!ready||!thread||get('realityRepairScopeChatCard'))return;
 const URL='/api/reality/owner-repair-scope-approval';
 const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
 const HASH=/^sha256:[a-f0-9]{64}$/;
 const GIT=/^[a-f0-9]{40}$/;
 const REF=/^https:\/\/github\.com\/maloney2323\/Reality\/pull\/[1-9][0-9]*$/;
 const INTENT='OWNER_APPROVE_EXACT_REPAIR_INVESTIGATION_AND_INDEPENDENT_TESTING';
 const el=(tag,name,value)=>{
  const e=document.createElement(tag);
  if(name)e.className=name;
  if(value!==undefined)e.textContent=String(value);
  return e;
 };
 const card=el('article','bubble reality-repair-scope-chat-card');
 card.id='realityRepairScopeChatCard';card.hidden=true;
 card.setAttribute('aria-label','Reality independently verified repair work approval');
 const top=el('div','label','REALITY · VERIFIED WORK DECISION');
 const head=el('strong','reality-repair-scope-title','One verified repair needs your work-scope decision');
 const detail=el('p','reality-repair-scope-detail','Checking the exact owner-bound source receipt.');
 const evidence=el('p','reality-repair-scope-evidence','');
 const warning=el('p','reality-repair-scope-limit',
  'Approving this work permits investigation and independent testing only. It does not install code, deploy production, change the existing shift, or prove completion.');
 const buttons=el('div','reality-repair-scope-buttons');
 const approve=el('button','reality-repair-scope-approve',
  'Approve investigation and testing');
 approve.type='button';approve.disabled=true;
 const check=el('button','reality-repair-scope-check','Check status');
 check.type='button';
 const status=el('p','reality-repair-scope-status','');
 status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const operational=el('section','reality-repair-scope-operational');
 operational.setAttribute('aria-label','Reality verified work progress and next action');
 operational.setAttribute('aria-live','polite');
 const phase=el('strong','reality-repair-scope-phase','');
 const last=el('p','reality-repair-scope-last','');
 const done=el('p','reality-repair-scope-done','');
 const blocked=el('p','reality-repair-scope-blocked','');
 const next=el('p','reality-repair-scope-next','');
 operational.append(phase,last,done,blocked,next);
 buttons.append(approve,check);
 card.append(top,head,detail,operational,evidence,warning,buttons,status);
 thread.append(card);
 const signedIn=()=>ready.style.display==='block';
 const safe=()=>({
  ok:false
 });
 let current=null,submitting=false,uncertain=false,reading=false;
 function validate(c){
  return c&&UUID.test(c.handoff_id||'')&&UUID.test(c.shift_id||'')&&
   REF.test(c.source_ref||'')&&GIT.test(c.candidate_commit_sha||'')&&
   GIT.test(c.current_blob_sha||'')&&GIT.test(c.candidate_blob_sha||'')&&
   c.current_blob_sha!==c.candidate_blob_sha&&
   HASH.test(c.work_order_fingerprint||'')&&
   Number.isSafeInteger(c.baseline_run_id)&&c.baseline_run_id>0&&
   Number.isSafeInteger(c.green_run_id)&&c.green_run_id>0&&
   c.installation_authorized===false&&
   c.original_job_completed===false&&c.production_changed===false;
 }
 async function read(){
  const r=await fetch(URL,{
   method:'GET',credentials:'same-origin',cache:'no-store',
   signal:AbortSignal.timeout(18000)
  });
  const body=await r.json().catch(()=>null);
  if(!r.ok||body?.ok!==true)throw Error('OWNER_SCOPE_READBACK_UNVERIFIED');
  if(body.status==='NO_VERIFIED_REPAIR_SCOPE_DECISION'&&
     body.card===null)return null;
  if(!validate(body.card))throw Error('SOURCE_IDENTITY_UNVERIFIED');
  const p=body.verified_operational_progress;
  if(!p||p.handoff_id!==body.card.handoff_id||
   p.shift_id!==body.card.shift_id||
   p.source_ref!==body.card.source_ref||
   p.work_scope_fingerprint!==body.card.work_order_fingerprint||
   p.installation_authorized!==false||
   p.production_changed!==false||
   p.original_job_completed!==false||
   p.read_only!==true||
   !['AWAITING_EXACT_OWNER_WORK_SCOPE_APPROVAL',
    'OWNER_SCOPE_APPROVED_WAITING_FOR_SIGNED_SOURCE_RECHECK',
    'SOURCE_RECHECKED_AWAITING_NEW_INDEPENDENT_FROZEN_CI']
    .includes(p.status))throw Error('OPERATIONAL_RECEIPT_NOT_VERIFIED');
  return {...body.card,verifiedOperationalProgress:p};
 }
 function timeLabel(iso){
  const time=typeof iso==='string'?Date.parse(iso):NaN;
  return Number.isFinite(time)?
   new Date(time).toLocaleString([],{
    month:'short',day:'numeric',hour:'numeric',minute:'2-digit'
   }):'Not yet verified';
 }
 function renderOperationalProgress(c){
  const p=c?.verifiedOperationalProgress;
  if(!p){operational.hidden=true;return;}
  operational.hidden=false;
  // This is a projection of signed source receipts, NOT a simulated stream.
  if(p.status==='AWAITING_EXACT_OWNER_WORK_SCOPE_APPROVAL'){
   phase.textContent='Current status · Waiting for your decision';
   last.textContent='Verified source: historical independent repair tests.';
   done.textContent='Completed: Reality qualified the candidate and prepared an exact work order.';
   blocked.textContent='Waiting on: work-scope approval. No installation authorization.';
   next.textContent='Next: review and approve investigation/testing only, or leave the work unapproved.';
  }else if(p.status==='OWNER_SCOPE_APPROVED_WAITING_FOR_SIGNED_SOURCE_RECHECK'){
   phase.textContent='Current status · Approved, source recheck pending';
   last.textContent='Last verified event: '+timeLabel(p.owner_approved_at)+
    ' · owner approval receipt recorded';
   done.textContent='Completed: exact source qualification and your work-scope approval.';
   blocked.textContent='Not verified yet: a subsequent signed source recheck or new independent CI result.';
   next.textContent='Next: Reality must recheck this exact repair on the existing shift. You do not need to approve scope again.';
  }else if(p.status==='SOURCE_RECHECKED_AWAITING_NEW_INDEPENDENT_FROZEN_CI'){
   phase.textContent='Current status · Source rechecked; independent testing pending';
   last.textContent='Last verified activity: '+timeLabel(p.source_verified_at)+
    ' · signed worker resumed on the existing shift';
   done.textContent='Completed: source qualification, one owner scope approval, and postapproval source verification.';
   blocked.textContent='What is stopping completion: this handoff has no new independent frozen CI test receipt. Installation and original-job settlement are not proven.';
   next.textContent='Next: Reality must register and run case-specific independent frozen tests, verify their results, then request a separate exact installation approval only if required. No additional work-scope approval is needed.';
  }
 }
 function render(c,fromExplicitCheck=false){
  current=c;
  if(!c){card.hidden=true;operational.hidden=true;approve.disabled=true;return;}
  card.hidden=false;
  renderOperationalProgress(c);
  const no=String(c.source_ref.split('/').pop());
  head.textContent='Reality found verified repair #'+no;
  detail.textContent='I verified a real implementation defect and a source-pinned candidate. '+
   'The repair is not included in your currently signed work scope. '+
   'May I investigate and independently retest this exact repair?';
  evidence.textContent='Source: '+c.source_file+' · candidate '+c.candidate_commit_sha.slice(0,10)+
   ' · historical failed test run #'+c.baseline_run_id+
   ' · passing repair run #'+c.green_run_id+'.';
  const approved=c.status==='EXACT_OWNER_REPAIR_WORK_SCOPE_DECISION_RECORDED'&&
   c.owner_work_scope_approved===true&&
   HASH.test(c.approval_receipt_sha256||'')&&
   ['APPROVED','SOURCE_RECHECKED'].includes(c.continuation_state);
  const prepared=c.status==='EXACT_OWNER_REPAIR_WORK_SCOPE_APPROVAL_READY'&&
   c.owner_approval_ready===true&&c.owner_work_scope_approved===false&&
   c.continuation_state==='PREPARED';
  if(!approved&&!prepared)throw Error('DECISION_STATE_CONTRADICTORY');
  approve.hidden=approved;approve.disabled=approved||uncertain||submitting;
  if(approved){
   head.textContent=c.continuation_state==='SOURCE_RECHECKED'?
    'Reality resumed verified source work #'+no:
    'Scope approved · Reality will resume repair #'+no;
   detail.textContent=c.continuation_state==='SOURCE_RECHECKED'?
    'Your exact work-scope approval is receipted. The signed worker rechecked the source on the same shift. Fresh independent frozen CI and installation remain separate.' :
    'Your work-scope approval is recorded in the owner ledger. The signed worker will resume this exact source on its next authorized cycle.';
   status.textContent='Owner scope receipt '+c.approval_receipt_sha256+
    '. Installation not authorized. Production unchanged.';
  }else{
   status.textContent=uncertain&&!fromExplicitCheck?
    'The previous approval response was uncertain. Check status before taking any further action.':
    'Ready for one exact owner decision. No action taken.';
  }
 }
 async function refresh(explicit=false){
  if(!signedIn()||submitting||reading)return;
  reading=true;check.disabled=true;
  try{
   const cardResult=await read();
   // Only an explicit status check may clear uncertain POST state, after
   // independent owner-scoped GET verifies no approval was recorded.
   if(explicit)uncertain=false;
   render(cardResult,explicit);
  }catch{
   if(!current){card.hidden=false;head.textContent='Work approval readback unavailable';}
   approve.disabled=true;
   status.textContent='Reality cannot independently confirm the exact decision. No approval or installation will be retried.';
  }finally{reading=false;check.disabled=false;}
 }
 check.addEventListener('click',()=>{if(!submitting)void refresh(true);});
 approve.addEventListener('click',async()=>{
  if(!signedIn()||submitting||reading||uncertain||approve.disabled||!current)return;
  submitting=true;approve.disabled=true;
  const selected=current;
  status.textContent='Confirming the exact source and recording your one-time work-scope approval…';
  try{
   const fresh=await read();
   if(!fresh||fresh.status!=='EXACT_OWNER_REPAIR_WORK_SCOPE_APPROVAL_READY'||
      fresh.handoff_id!==selected.handoff_id||
      fresh.shift_id!==selected.shift_id||
      fresh.work_order_fingerprint!==selected.work_order_fingerprint)
    throw Error('EXACT_SOURCE_CHANGED_REFRESH_REQUIRED');
   if(typeof crypto?.randomUUID!=='function')
    throw Error('SECURE_CLICK_ID_REQUIRED');
   const response=await fetch(URL,{
    method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({
     intent:INTENT,handoff_id:fresh.handoff_id,shift_id:fresh.shift_id,
     request_id:crypto.randomUUID(),
     work_order_fingerprint:fresh.work_order_fingerprint
    }),
    signal:AbortSignal.timeout(45000)
   });
   const result=await response.json().catch(()=>null);
   if(!response.ok||result?.ok!==true||
      result.status!=='EXACT_REPAIR_OWNER_SCOPE_APPROVED_SAME_SHIFT_CONTINUES'||
      result.owner_approval_recorded!==true||
      !HASH.test(result.approval_receipt_sha256||'')||
      result.installation_authorized!==false||
      result.production_changed!==false)
    throw Error('OWNER_SCOPE_OUTCOME_UNCERTAIN_CHECK_STATUS');
   uncertain=true;
   status.textContent='One exact work-scope approval recorded. Checking the owner receipt; no installation authorized.';
   const verified=await read();
   if(verified?.status!=='EXACT_OWNER_REPAIR_WORK_SCOPE_DECISION_RECORDED'||
      verified.approval_receipt_sha256!==result.approval_receipt_sha256)
    throw Error('OWNER_SCOPE_READBACK_UNCERTAIN');
   current=verified;render(verified);
  }catch{
   uncertain=true;approve.disabled=true;
   status.textContent='The outcome could not be independently confirmed. Tap Check status. No duplicate approval, new shift or installation.';
  }finally{submitting=false;}
 });
 const observer=new MutationObserver(()=>{
  if(signedIn()&&current&&!thread.contains(card))thread.append(card);
  if(!signedIn()){
   current=null;uncertain=false;card.hidden=true;approve.disabled=true;
  }
 });
 observer.observe(thread,{childList:true});
 const auth=new MutationObserver(()=>{
  if(signedIn())void refresh();
  else {card.hidden=true;approve.disabled=true;current=null;}
 });
 auth.observe(ready,{attributes:true,attributeFilter:['style']});
 if(signedIn())void refresh();
 window.addEventListener('pageshow',()=>{if(signedIn())void refresh()});
 document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible'&&signedIn())void refresh();
 });
 // The signed worker wakes every five minutes. Read-only owner progress
 // refresh keeps the Chat explanation current without scheduling new work.
 window.setInterval(()=>{
  if(document.visibilityState==='visible'&&signedIn())void refresh();
 },20000);
})();