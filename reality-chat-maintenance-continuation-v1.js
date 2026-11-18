/* Reality unified Chat — existing signed maintenance continuation.
 * Presentation and owner-click transport ONLY. The existing authenticated
 * employee-shift endpoint rebuilds maintenance scope and authorizes exactly
 * those independently reviewed repairs. Neither this module nor a model reply
 * grants code-installation or customer-original permission.
 */
(() => {
 'use strict';
 if(!/^\/chat\/?$/.test(window.location.pathname))return;
 const get=id=>document.getElementById(id);
 const ready=get('privateReady'),inbox=get('realityChatApprovalInbox'),
  thread=get('privateTranscript'),center=get('realityChatConversation');
 if(!ready||!inbox||!thread||!center||get('realityChatMaintenanceContinuation'))return;
 const URL='/api/reality/personal-governed-employee-shift';
 const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
 const SHA=/^sha256:[0-9a-f]{64}$/;
 const REF=/^https:\/\/github\.com\/maloney2323\/Reality\/(?:issues|pull)\/[1-9][0-9]*$/;
 const KINDS=new Set(['EMPLOYEE_QUALIFICATION_HANDOFF_STALLED',
  'QUALIFIED_EVIDENCE_JOB_BLOCKED']);
 const ROLES=new Set(['Riley','Taylor','Quinn','Avery','Casey','Morgan','Jordan','Sage']);
 const fail=code=>{throw Error('MAINTENANCE_'+code);};
 const make=(tag,className,text)=>{
  const el=document.createElement(tag);
  if(className)el.className=className;
  if(text!==undefined)el.textContent=String(text);
  return el;
 };
 const root=make('section','reality-chat-maintenance-continuation');
 root.id='realityChatMaintenanceContinuation';
 root.setAttribute('aria-label','Existing unfinished employee maintenance — exact owner authorization');
 root.hidden=true;
 const title=make('strong','reality-chat-maintenance-title','Unfinished employee repairs');
 const description=make('p','reality-chat-maintenance-detail',
  'Checking the existing independently reviewed repair ledger…');
 const list=make('div','reality-chat-maintenance-list');
 const actions=make('div','reality-chat-maintenance-actions');
 const authorize=make('button','reality-chat-maintenance-approve','Verify exact maintenance scope');
 authorize.id='realityChatMaintenanceAuthorize';
 authorize.type='button';authorize.disabled=true;
 const reload=make('button','reality-chat-maintenance-refresh','Check status');
 reload.id='realityChatMaintenanceRefresh';reload.type='button';
 const feedback=make('p','reality-chat-maintenance-feedback',
  'Reading the existing signed work, not authorizing or installing anything.');
 feedback.id='realityChatMaintenanceFeedback';
 feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
 const limits=make('p','reality-chat-maintenance-limits',
  'Continuing a shift is NOT approval to install code. Each independently tested installation requires its own exact authorization.');
 actions.append(authorize,reload);
 root.append(title,description,list,actions,feedback,limits);
 const anchor=get('realityChatApprovalItems');
 if(anchor)inbox.insertBefore(root,anchor);
 else inbox.append(root);
 // This is a REAL operational conversation entry, projected from the
 // persistent signed shift / maintenance receipts on each owner readback.
 // Never fabricate a saved AI reply or a completed worker receipt. It stays
 // in the transcript instead of a blocking alert above it.
 const hint=make('article','bubble reality-chat-maintenance-nudge reality-chat-maintenance-dialogue');
 hint.id='realityChatMaintenanceNudge';hint.hidden=true;
 hint.setAttribute('aria-label','Reality verified maintenance conversation');
 const verifiedLabel=make('div','label','REALITY · VERIFIED WORK MESSAGE');
 const hintLabel=make('p','reality-chat-maintenance-nudge-text',
  'Reality is checking your unfinished work…');
 const dialogueJobs=make('div','reality-chat-maintenance-dialogue-jobs');
 const dialogueActions=make('div','reality-chat-maintenance-dialogue-actions');
 const inlineContinue=make('button','reality-chat-maintenance-inline-authorize',
  'Continue exact unfinished repairs');
 inlineContinue.id='realityChatMaintenanceInlineAuthorize';
 inlineContinue.type='button';inlineContinue.disabled=true;
 const review=make('button','reality-chat-maintenance-nudge-open','Review evidence');
 review.id='realityChatMaintenanceOpen';review.type='button';
 const reply=make('button','reality-chat-maintenance-reply','Reply to Reality');
 reply.id='realityChatMaintenanceReply';reply.type='button';
 const dialogueProof=make('p','reality-chat-maintenance-dialogue-proof',
  'Source: owner-scoped signed shift and independent maintenance ledger. No installation authority is implied.');
 dialogueActions.append(inlineContinue,reply,review);
 hint.append(verifiedLabel,hintLabel,dialogueJobs,dialogueActions,dialogueProof);
 thread.append(hint);
 // The saved Chat history uses replaceChildren(). Re-attach this owner-ledger
 // projection once after each transcript reload. No new AI message or shift.
 const threadObserver=new MutationObserver(()=>{
  if(signedIn()&&approvedScope?.count>0&&!thread.contains(hint))
   thread.append(hint);
 });
 threadObserver.observe(thread,{childList:true});
 let loading=false,authorizing=false,uncertain=false;
 let approvedScope=null,initialized=false;
 const signedIn=()=>ready.style.display==='block';
 const safeError=e=>String(e?.message||'SOURCE_NOT_VERIFIED').slice(0,120);
 const key=jobs=>jobs.map(j=>
  [j.origin_incident_id,j.origin_shift_id,j.source_ref,j.assignee,
   j.independent_reviewer,j.independent_review_receipt_sha256].join('|')
 ).sort().join('||');
 function parse(data){
  if(data?.ok!==true||
     data.internal_maintenance_continuity_status!==
       'OWNER_MAINTENANCE_SOURCE_AND_ROLE_VERIFIED')
   fail('SIGNED_OWNER_READBACK_UNAVAILABLE');
  const c=data.internal_maintenance_continuity;
  if(!c||!['OWNER_UNFINISHED_INTERNAL_MAINTENANCE_PRESERVED',
   'OWNER_NO_OPEN_INTERNAL_MAINTENANCE'].includes(c.status)||
   !Number.isSafeInteger(c.open_count)||c.open_count<0||c.open_count>4||
   !Array.isArray(c.items)||c.items.length!==c.open_count||
   c.no_new_shift_started!==true||
   c.owner_authority_granted!==false||
   c.customer_job_completed!==false||c.production_changed!==false||
   (c.current_shift_id!==null&&!UUID.test(c.current_shift_id||'')))
   fail('OWNER_INTERNAL_MAINTENANCE_SCOPE_INVALID');
  // Active shift authority is exact to signed incident IDs, not to every
  // maintenance discovered afterward by the worker.
  if(c.signed_warrant_scope_verified!==true&&
     c.signed_warrant_scope_verified!==false||
     !Number.isSafeInteger(c.signed_unfinished_count)||
     !Number.isSafeInteger(c.newly_discovered_outside_warrant_count)||
     c.signed_unfinished_count<0||
     c.newly_discovered_outside_warrant_count<0||
     c.signed_unfinished_count+c.newly_discovered_outside_warrant_count!==
      c.open_count||
     !Array.isArray(c.signed_maintenance_incident_ids)||
     c.signed_maintenance_incident_ids.length!==c.signed_unfinished_count||
     !Array.isArray(c.outside_warrant_incident_ids)||
     c.outside_warrant_incident_ids.length!==
      c.newly_discovered_outside_warrant_count||
     (c.signed_warrant_scope_verified&&
      (!UUID.test(c.signed_warrant_shift_id||'')||
       c.current_shift_id!==c.signed_warrant_shift_id))||
     (!c.signed_warrant_scope_verified&&
      (c.signed_warrant_shift_id!==null||c.signed_unfinished_count!==0)))
   fail('EXACT_SIGNED_MAINTENANCE_WARRANT_SCOPE_UNVERIFIED');
  const signed=new Set(c.signed_maintenance_incident_ids);
  const outside=new Set(c.outside_warrant_incident_ids);
  const seenIds=new Set(),seenSources=new Set();
  for(const item of c.items){
   if(!UUID.test(item.origin_incident_id||'')||
      !UUID.test(item.origin_shift_id||'')||
      item.internal_work_id!=='maintenance:'+item.origin_incident_id||
      !KINDS.has(item.kind)||!ROLES.has(item.assignee)||
      !ROLES.has(item.independent_reviewer)||
      item.independent_reviewer===item.assignee||
      !REF.test(item.source_ref||'')||
      !SHA.test(item.independent_review_receipt_sha256||'')||
      item.repair_verified!==false||
      item.original_customer_job_completed!==false||
      seenIds.has(item.origin_incident_id)||
      seenSources.has(item.source_ref)||
      (signed.has(item.origin_incident_id)===outside.has(item.origin_incident_id))||
      (item.worker_handling_state!==undefined&&
       !['QUEUED','CLAIMED','SOURCE_REOBSERVED_NEEDS_FROZEN_TEST',
        'FAILURE_BASELINE_CLAIMED','FAILURE_BASELINE_REPRODUCED_NEEDS_CI_RED',
        'BLOCKED_INDEPENDENT_PROVIDER_UNVERIFIED',
        'SOURCE_PROGRESS_NOT_INDEPENDENTLY_VERIFIED'].includes(item.worker_handling_state))||
      (item.independent_failure_baseline_receipt_sha256!==undefined&&
       item.independent_failure_baseline_receipt_sha256!==null&&
       !SHA.test(item.independent_failure_baseline_receipt_sha256)))
    fail('INDEPENDENT_ORIGINAL_MAINTENANCE_PROOF_INVALID');
   seenIds.add(item.origin_incident_id);seenSources.add(item.source_ref);
  }
  const readyDraft=data.requested_maintenance_draft_status===
   'VERIFIED_EXISTING_INTERNAL_MAINTENANCE_CONTINUATION_READY';
  const draft=data.requested_maintenance_draft;
  let valid=false;
  if(readyDraft&&!c.current_shift_id&&c.open_count>0){
   if(draft?.status!=='EXACT_OWNER_INTERNAL_MAINTENANCE_CONTINUATION_DRAFT'||
      !SHA.test(draft.expected_fingerprint||'')||
      draft.open_maintenance_jobs!==c.open_count||
      draft.owner_authorization_required!==true||
      draft.completion_bound!==true||
      draft.completion_condition!==
        'ALL_EXACT_INTERNAL_MAINTENANCE_REPAIR_RECEIPTS_VERIFIED'||
      draft.no_new_customer_work_created!==true||
      draft.previously_closed_shifts_reopened!==false||
      draft.original_job_completed!==false||
      draft.installation_authorized!==false||
      draft.production_changed!==false||
      !Array.isArray(draft.work_items)||
      draft.work_items.length!==c.open_count||
      !Array.isArray(draft.plan?.slots)||draft.plan.slots.length!==8)
    fail('EXACT_CONTINUATION_DRAFT_NOT_VERIFIED');
   const expected=c.items.map(j=>({
    origin_incident_id:j.origin_incident_id,origin_shift_id:j.origin_shift_id,
    source_ref:j.source_ref,assignee:j.assignee,
    independent_reviewer:j.independent_reviewer,
    independent_review_receipt_sha256:j.independent_review_receipt_sha256
   }));
   const drafted=draft.work_items.map(j=>({
    origin_incident_id:j.maintenance_id,origin_shift_id:j.origin_shift_id,
    source_ref:j.source_ref,assignee:j.assignee,
    independent_reviewer:j.independent_reviewer,
    independent_review_receipt_sha256:j.independent_review_receipt_sha256
   }));
   if(key(expected)!==key(drafted))
    fail('DRAFT_AND_PREVIOUS_REPAIR_RECEIPTS_DIFFER');
   valid=true;
  }
  return Object.freeze({
   count:c.open_count,jobs:c.items,activeId:c.current_shift_id,
   signedCount:c.signed_unfinished_count,
   outsideCount:c.newly_discovered_outside_warrant_count,
   signedIds:c.signed_maintenance_incident_ids,
   warrantVerified:c.signed_warrant_scope_verified,
   fingerprint:valid?draft.expected_fingerprint:null,
   sourceKey:key(c.items),valid
  });
 }
 function render(scope){
  approvedScope=scope;
  list.replaceChildren();
  root.hidden=scope.count===0;
  hint.hidden=scope.count===0;
  if(!scope.count){
   authorize.disabled=true;description.textContent='No unfinished maintenance repairs in the verified ledger.';
   feedback.textContent='No maintenance shift was started by this read.';
   return;
  }
  title.textContent=scope.count+' unfinished employee repair'+(scope.count===1?'':'s');
  const roleLabels={
   EMPLOYEE_QUALIFICATION_HANDOFF_STALLED:'employee job qualification handoff',
   QUALIFIED_EVIDENCE_JOB_BLOCKED:'source-evidence execution handoff'
  };
  const signedIds=new Set(scope.signedIds);
  hintLabel.textContent=scope.activeId&&scope.warrantVerified?
   'You authorized '+scope.signedCount+' exact earlier repairs under shift '+
   scope.activeId+'. '+(scope.outsideCount?
    'I discovered '+scope.outsideCount+' more repair incident'+
     (scope.outsideCount===1?'':'s')+' afterward. That work is NOT covered '+
     'by your original authorization. ':'')+
   'The signed repairs have not reached independent final verification. '+
   'You can reply right here to ask what happened. No code installation was authorized.':
   scope.activeId?
   'I see an active shift, but its exact repair authorization is not verified. '+
   'I cannot treat any maintenance as approved until the signed source scope is confirmed.':
   scope.valid?
   'I found '+scope.count+' unfinished employee repairs from your earlier shift. '+
   'Riley and Taylor have independently reviewed maintenance to finish. '+
   'May I continue exactly those repairs under a signed shift? '+
   'I will ask separately before installing any code. You can reply to ask questions.':
   'I found unfinished employee repairs, but I cannot verify an exact signed authorization scope yet. '+
   'Ask me about the blockers or review the source evidence.';
  dialogueJobs.replaceChildren();
  for(const item of scope.jobs){
   dialogueJobs.append(make('p','',
    item.assignee+': '+roleLabels[item.kind]+
    ' · '+String(item.phase).replaceAll('_',' ').toLowerCase()+
    ' · '+(signedIds.has(item.origin_incident_id)?
       'covered by the signed shift':'not in the signed shift')+
    ' · '+(item.independent_failure_baseline_receipt_sha256?
       'failure baseline recorded; frozen CI RED still required':
       'failure baseline not independently verified')+
    ' · reviewer '+item.independent_reviewer));
  }
  inlineContinue.hidden=!!scope.activeId||!scope.valid;
  inlineContinue.disabled=authorizing||uncertain||!!scope.activeId||!scope.valid;
  inlineContinue.textContent='Continue '+scope.count+' unfinished repair'+
   (scope.count===1?'':'s');
  dialogueProof.textContent=scope.activeId&&scope.warrantVerified?
   'Verified exact maintenance warrant for '+scope.signedCount+
    ' incident(s) in shift '+scope.activeId+
    ' · remaining proof: frozen CI, independently tested repair, exact installation approval and final receipts. '+scope.outsideCount+
    ' later incident(s) are not authorized by that warrant.':
   'Verified source scope from the existing owner maintenance ledger. '+
   'Continuing a shift never grants installation approval.';
  if(hint.parentElement!==thread)thread.append(hint);
  for(const item of scope.jobs){
   const card=make('article','reality-chat-maintenance-job');
   const name=item.kind==='EMPLOYEE_QUALIFICATION_HANDOFF_STALLED'?
    'Employee job qualification handoff':'Source-evidence execution handoff';
   const header=make('strong','',item.assignee+' · '+name);
   const detail=make('p','',
    'Independent reviewer: '+item.independent_reviewer+
    ' · '+item.phase.replaceAll('_',' ').toLowerCase());
   const source=make('a','reality-chat-maintenance-source','Review original source');
   source.href=item.source_ref;source.target='_blank';source.rel='noopener noreferrer';
   card.append(header,detail,source);
   list.append(card);
  }
  authorize.disabled=authorizing||uncertain||!!scope.activeId||!scope.valid;
  authorize.textContent=scope.activeId?'Maintenance shift already authorized':
    scope.valid?'Continue '+scope.count+' unfinished maintenance repair'+
     (scope.count===1?'':'s'):'Maintenance scope not independently verified';
  description.textContent=scope.activeId?
   'There is already a shift. '+scope.signedCount+
    ' exact repairs are covered, '+scope.outsideCount+
    ' newly discovered repairs are not. Do not authorize a duplicate.':
   scope.valid?
    'These are the original independently reviewed jobs, not new customer work. One approval authorizes their completion-bound continuation.':
    'The source or current owner warrant is not independently verified. No approval is available.';
  feedback.textContent=scope.activeId?
   'Existing shift: '+scope.activeId+' · '+scope.signedCount+
    ' exact signed repairs · '+scope.outsideCount+
    ' outside-scope incidents. No installation or completed repair is implied.':
   scope.valid?'No work is started by reading this card. Press Continue to authorize the exact preserved maintenance set.':
    'Could not prepare an exact continuation; review and refresh the signed maintenance readback.';
 }
 async function read(){
  const response=await fetch(URL,{
   method:'GET',credentials:'same-origin',cache:'no-store',
   signal:AbortSignal.timeout(25000)
  });
  const data=await response.json().catch(()=>null);
  if(!response.ok)fail('AUTHENTICATED_SHIFT_GET_FAILED_'+response.status);
  return parse(data);
 }
 async function refresh(){
  if(!signedIn()||loading||authorizing)return;
  loading=true;reload.disabled=true;
  try{
   const scope=await read();
   // A previous uncertain POST is never silently retried. This button is
   // only unlocked after an explicit source-backed Check status.
   uncertain=false;
   render(scope);
  }catch(e){
   approvedScope=null;authorize.disabled=true;
   inlineContinue.disabled=true;root.hidden=false;hint.hidden=true;
   title.textContent='Maintenance verification unavailable';
   list.replaceChildren();
   description.textContent='Reality cannot independently read the unfinished maintenance ledger.';
   feedback.textContent='No approval submitted. '+safeError(e)+'. Try Check status.';
  }finally{loading=false;reload.disabled=false}
 }
 function showApprovals(){
  if(!signedIn())return;
  const panel=get('realityChatOpenInspector');
  if(window.matchMedia('(max-width:950px)').matches&&
     document.body.dataset.realityChatPanel!=='work')panel?.click();
  get('realityChatTabApprovals')?.click();
  root.scrollIntoView({behavior:'smooth',block:'nearest'});
 }
 review.addEventListener('click',showApprovals);
 reply.addEventListener('click',()=>{
  if(!signedIn())return;
  // A reply is an ordinary saved owner Chat turn; it never consumes a
  // maintenance or installation warrant. Preserve whatever the user typed.
  get('privatePrompt')?.focus();
 });
 inlineContinue.addEventListener('click',()=>{
  // Delegate to the EXACT existing click-only owner authorization handler,
  // which freshly re-reads the scope and refuses an uncertain duplicate.
  if(!inlineContinue.disabled&&!authorize.disabled)authorize.click();
 });
 reload.addEventListener('click',()=>{if(!authorizing)void refresh()});
 authorize.addEventListener('click',async()=>{
  // The only POST path in this module is this REAL owner button event.
  if(authorizing||loading||uncertain||!signedIn()||
     authorize.disabled||!approvedScope?.valid||approvedScope.activeId)return;
  const previously=approvedScope;
  authorizing=true;authorize.disabled=true;inlineContinue.disabled=true;
  reload.disabled=true;
  feedback.textContent='Verifying the exact current source scope before one signed authorization…';
  try{
   const fresh=await read();
   if(!fresh.valid||fresh.activeId||fresh.count!==previously.count||
      fresh.fingerprint!==previously.fingerprint||
      fresh.sourceKey!==previously.sourceKey)
    fail('SOURCE_CHANGED_REVIEW_AGAIN');
   feedback.textContent='Recording one exact owner-signed continuation; no code installation or customer work is authorized…';
   const response=await fetch(URL,{
    method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({
     action:'AUTHORIZE_EXACT_INTERNAL_MAINTENANCE_CONTINUATION',
     expected_fingerprint:fresh.fingerprint,
     planned_start_at:new Date(Date.now()+12000).toISOString(),
     requested_hours:8,completion_bound:true
    }),
    signal:AbortSignal.timeout(45000)
   });
   const receipt=await response.json().catch(()=>null);
   if(!response.ok||receipt?.ok!==true||
      receipt.status!=='SHIFT_DURABLY_AUTHORIZED'||
      !UUID.test(receipt.shift_id||'')||
      receipt.owner_scope_verified!==true||
      receipt.initial_authorization_recorded!==true||
      receipt.completion_bound!==true||
      receipt.completion_condition!==
       'ALL_EXACT_INTERNAL_MAINTENANCE_REPAIR_RECEIPTS_VERIFIED'||
      receipt.start_confirmation?.status!==
       'EXACT_OWNER_INTERNAL_MAINTENANCE_CONTINUATION_AUTHORIZED'||
      receipt.start_confirmation?.shift_id!==receipt.shift_id||
      receipt.start_confirmation?.old_shifts_unchanged!==true||
      receipt.start_confirmation?.exact_internal_work_count!==fresh.count||
      receipt.start_confirmation?.worker_execution_verified!==false||
      receipt.start_confirmation?.customer_job_completed!==false||
      receipt.start_confirmation?.production_changed!==false||
      receipt.shift?.plan_fingerprint!==fresh.fingerprint||
      receipt.shift?.shift_id!==receipt.shift_id||
      receipt.shift?.planned_end_at!=='infinity'||
      receipt.installation_authorized!==false||
      receipt.production_changed!==false||
      receipt.worker_dispatch_verified!==false||
      receipt.job_started!==false)
    fail('SIGNED_MAINTENANCE_AUTHORIZATION_RECEIPT_UNVERIFIED');
   uncertain=true;approvedScope=null;
   authorize.disabled=true;inlineContinue.disabled=true;
   // The signed response contains an independent owner readback for the
   // same exact shift. Immediately answer in the conversation itself;
   // the next GET continues to reconcile against the live ledger.
   render(Object.freeze({...fresh,activeId:receipt.shift_id,valid:false}));
   authorize.textContent='Signed continuation recorded';
   feedback.textContent='Authorized shift '+receipt.shift_id+
    ' · '+fresh.count+' prior repairs carried forward. Worker execution, testing, installation and final repair receipts remain unverified. Do not start another shift.';
   description.textContent='Your signed authorization was read back. Reality must now perform and independently prove the existing repairs.';
   window.dispatchEvent(new CustomEvent('reality:maintenance-continuation-authorized',{
    detail:{shift_id:receipt.shift_id,internal_work_count:fresh.count}
   }));
   // Background readback only. It cannot trigger another POST.
   void refresh();
  }catch(e){
   // Write might have succeeded even if response was lost; NEVER retry
   // automatically and never re-enable until the owner clicks Check status.
   uncertain=true;approvedScope=null;
   authorize.disabled=true;inlineContinue.disabled=true;
   hint.hidden=false;
   hintLabel.textContent='I could not verify whether the continuation request was recorded. '+
    'Please choose Check status in Work before trying anything again. '+
    'I will not issue a duplicate authorization.';
   dialogueJobs.replaceChildren();
   feedback.textContent='Authorization could not be independently confirmed ('+
    safeError(e)+'). Use Check status first. Do not press Continue again until Reality proves there is no active shift.';
  }finally{authorizing=false;reload.disabled=false}
 });
 const signObserver=new MutationObserver(()=>{
  if(signedIn()&&!initialized){initialized=true;void refresh()}
  if(!signedIn()){
   initialized=false;approvedScope=null;root.hidden=true;hint.hidden=true;
   authorize.disabled=true;inlineContinue.disabled=true;
  }
 });
 signObserver.observe(ready,{attributes:true,attributeFilter:['style']});
 if(signedIn()){initialized=true;void refresh()}
 window.addEventListener('pageshow',()=>{if(signedIn()&&!authorizing)void refresh()});
 document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible'&&signedIn()&&!authorizing)void refresh();
 });
 window.setInterval(()=>{
  if(document.visibilityState==='visible'&&signedIn()&&!authorizing)void refresh();
 },120000);
 if(window.location.hash==='#unfinished-maintenance')
  window.addEventListener('load',()=>{
   if(signedIn())showApprovals();
   else{
    const delayed=new MutationObserver(()=>{
     if(signedIn()){delayed.disconnect();showApprovals()}
    });
    delayed.observe(ready,{attributes:true,attributeFilter:['style']});
   }
  },{once:true});
})();
