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
  thread=get('privateTranscript');
 // Require only actual signed-in Chat anchors; a removed container id must not hide approval.
 if(!ready||!inbox||!thread||get('realityChatMaintenanceContinuation'))return;
 const URL='/api/reality/personal-governed-employee-shift';
 const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
 const SHA=/^sha256:[0-9a-f]{64}$/;
 const GIT=/^[0-9a-f]{40}$/;
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
 // One actual exact approval is now visible in Chat. The historical inbox
 // mirror stays hidden and cannot create an alternate authorization path.
 const installApproveInInbox=make('button','reality-chat-maintenance-approve',
  'Approve exact verified preview repair');
 installApproveInInbox.id='realityChatMaintenanceApprovalInboxInstall';
 installApproveInInbox.type='button';installApproveInInbox.hidden=true;
 installApproveInInbox.disabled=true;
 actions.append(authorize,installApproveInInbox,reload);
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
 const detailDisclosure=make('section','reality-chat-maintenance-detail-disclosure');
 detailDisclosure.id='realityChatMaintenanceDetails';detailDisclosure.hidden=true;
 detailDisclosure.setAttribute('aria-label','Technical repair evidence and worker detail');
 const dialogueActions=make('div','reality-chat-maintenance-dialogue-actions');
 const inlineContinue=make('button','reality-chat-maintenance-inline-authorize',
  'Continue exact unfinished repairs');
 inlineContinue.id='realityChatMaintenanceInlineAuthorize';
 inlineContinue.type='button';inlineContinue.disabled=true;
 const installApprove=make('button','reality-chat-maintenance-inline-authorize','Approve exact verified preview repair');
 installApprove.id='realityChatMaintenanceExactInstallApprove';
 installApprove.type='button';installApprove.hidden=true;installApprove.disabled=true;
 const decisionHeadline=make('strong','reality-chat-maintenance-decision-headline');
 decisionHeadline.id='realityChatMaintenanceDecisionHeadline';decisionHeadline.hidden=true;
 const installDetails=make('p','reality-chat-maintenance-dialogue-proof','');
 installDetails.id='realityChatMaintenanceExactInstallDetails';installDetails.hidden=true;
 const chatStatus=make('p','reality-chat-maintenance-chat-status',
  'Reality is independently checking the existing shift and decision receipts.');
 chatStatus.id='realityChatMaintenanceChatStatus';
 chatStatus.setAttribute('role','status');chatStatus.setAttribute('aria-live','polite');
 const checkStatusInChat=make('button','reality-chat-maintenance-check-status',
  'Check approval status');
 checkStatusInChat.id='realityChatMaintenanceCheckStatusInChat';
 checkStatusInChat.type='button';checkStatusInChat.hidden=true;
 const chatEvidence=make('section','reality-chat-maintenance-chat-evidence');
 chatEvidence.id='realityChatMaintenanceEvidenceInChat';chatEvidence.hidden=true;
 chatEvidence.setAttribute('aria-label','Independently verified repair and authority evidence');
 const watch=make('button','reality-chat-maintenance-watch','Follow live repairs');
 watch.id='realityChatMaintenanceWatch';watch.type='button';watch.hidden=true;
 const timeline=make('section','reality-chat-maintenance-live');
 timeline.id='realityChatMaintenanceLive';timeline.hidden=true;
 timeline.setAttribute('aria-label','Independent live repair evidence and completion receipts');
 timeline.setAttribute('aria-live','polite');
 const review=make('button','reality-chat-maintenance-nudge-open','View details');
 review.id='realityChatMaintenanceOpen';review.type='button';
 const reply=make('button','reality-chat-maintenance-reply','Reply to Reality');
 reply.id='realityChatMaintenanceReply';reply.type='button';
 const dialogueProof=make('p','reality-chat-maintenance-dialogue-proof',
  'Source: owner-scoped signed shift and independent maintenance ledger. No installation authority is implied.');
 // A single decision and its readback in Chat; all verbose evidence stays
 // available in the same message after choosing View details.
 dialogueActions.append(inlineContinue,installApprove,checkStatusInChat,review);
 detailDisclosure.append(chatEvidence,dialogueJobs,watch,timeline,dialogueProof,reply);
 hint.append(verifiedLabel,hintLabel,decisionHeadline,installDetails,
  dialogueActions,chatStatus,detailDisclosure);
 thread.append(hint);
 // The saved Chat history uses replaceChildren(). Re-attach this owner-ledger
 // projection once after each transcript reload. No new AI message or shift.
 const threadObserver=new MutationObserver(()=>{
  if(signedIn()&&(approvedScope?.count>0||approvedScope?.finalReceipt||
    approvedScope?.exactInstallCard||approvedScope?.exactInstallDecision)&&
     !thread.contains(hint))
   thread.append(hint);
 });
 threadObserver.observe(thread,{childList:true});
 let loading=false,authorizing=false,uncertain=false,installAuthorizing=false,installUncertain=false;
 let approvedScope=null,initialized=false,watching=false;
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
  // A terminal repair receipt is displayed only when the *same* owner
  // shift ledger independently reports execution, verification AND final
  // report steps. Neither a worker wake nor a model message qualifies.
  const shifts=Array.isArray(data.shifts)?data.shifts:[];
  const terminal=shifts.find(s=>{
   const rep=s?.close_report,steps=s?.steps;
   return UUID.test(s?.shift_id||'')&&s.status==='ENDED_WITH_VERIFIED_JOB'&&
    Number.isFinite(Date.parse(s.closed_at||''))&&
    rep?.shift_id===s.shift_id&&
    rep.completion_condition===
     'ALL_EXACT_INTERNAL_MAINTENANCE_REPAIR_RECEIPTS_VERIFIED'&&
    rep.completion_reason===
     'ALL_SELECTED_INTERNAL_MAINTENANCE_REPAIRS_INDEPENDENTLY_RECEIPTED'&&
    Number.isSafeInteger(rep.independently_verified_internal_maintenance_jobs)&&
    rep.independently_verified_internal_maintenance_jobs>0&&
    rep.independently_verified_internal_maintenance_jobs<=4&&
    rep.production_changed===false&&
    Array.isArray(steps)&&steps.length===8&&
    [5,6].every(i=>steps[i].step_index===i+1&&
     steps[i].state==='INTERNAL_MAINTENANCE_RECEIPTS_VERIFIED'&&
     SHA.test(steps[i].proof_sha256||''))&&
    steps[7].step_index===8&&steps[7].state==='REPORTED'&&
    SHA.test(steps[7].proof_sha256||'');
  })||null;
  const shift=shifts.find(x=>x?.shift_id===c.current_shift_id)||null;
  const activity=data.shift_activity_status==='VERIFIED_OWNER_ACTIVITY'&&
   data.shift_activity?.status===
    'OWNER_SHIFT_LIVE_ACTIVITY_INDEPENDENT_READBACK'&&
   data.shift_activity?.owner_bound===true&&
   data.shift_activity?.shift_id===c.current_shift_id&&
   data.shift_activity?.installation_authorized===false&&
   data.shift_activity?.production_changed===false?
    data.shift_activity:null;
  // Reality's authenticated owner-shift GET is the only source of these
  // independently receipted packets; never treat one as install approval.
  let verifiedArtifacts=[];
  const artifacts=data.signed_verified_maintenance_repair_artifacts;
  if(artifacts?.status==='OWNER_VERIFIED_MAINTENANCE_ARTIFACTS_READ_ONLY'&&
   UUID.test(artifacts.owner_id||'')&&
   Number.isSafeInteger(artifacts.count)&&artifacts.count>=0&&
   artifacts.count<=4&&Array.isArray(artifacts.items)&&
   artifacts.count===artifacts.items.length&&
   artifacts.installation_authorized===false&&
   artifacts.production_changed===false){
   const bound=c.items.filter(j=>signed.has(j.origin_incident_id));
   if(artifacts.items.every(a=>
    UUID.test(a?.maintenance_id||'')&&
    a.shift_id===c.current_shift_id&&
    bound.some(j=>j.origin_incident_id===a.maintenance_id&&
     j.source_ref===a.source_ref)&&
    /^[a-f0-9]{40}$/.test(a?.candidate_commit_sha||'')&&
    /^[a-f0-9]{40}$/.test(a?.candidate_source_blob_sha||'')&&
    SHA.test(a?.review_receipt_sha256||'')&&
    SHA.test(a?.case_ci_receipt_sha256||'')&&
    Number.isSafeInteger(a?.github_run_id)&&a.github_run_id>10000&&
    Number.isSafeInteger(a?.github_artifact_id)&&a.github_artifact_id>10000&&
    a.owner_approval_ready===false&&
    ((a.install_target_verified===false&&a.target_review_receipt_sha256==null)||
     (a.install_target_verified===true&&
      SHA.test(a.target_review_receipt_sha256||'')&&
      a.target_review_branch==='reality/chat-direct-work-handoff-20261115'&&
      GIT.test(a.target_review_head_sha||'')&&
      GIT.test(a.historical_source_blob_sha||'')&&
      a.target_review_existing_blob_sha===a.historical_source_blob_sha))&&
    a.installation_authorized===false&&a.repair_installed===false&&
    a.original_job_completed===false))
    verifiedArtifacts=artifacts.items;
  }
  let exactInstallCard=null,exactInstallDecision=null;
  const ci=data.exact_signed_maintenance_install_review;
  if(ci?.status==='EXACT_OWNER_MAINTENANCE_INSTALL_APPROVAL_READY'&&
   ci.owner_approval_ready===true&&ci.installation_authorized===false&&
   ci.repair_installed===false&&ci.original_job_completed===false&&
   ci.production_changed===false&&ci.new_shift_started===false&&
   ci.shift_id===c.current_shift_id&&
   c.signed_maintenance_incident_ids.includes(ci.maintenance_id)&&
   c.items.some(j=>j.origin_incident_id===ci.maintenance_id&&j.source_ref===ci.source_ref)&&
   verifiedArtifacts.some(a=>a.maintenance_id===ci.maintenance_id&&
    a.install_target_verified===true&&
    a.target_review_receipt_sha256===ci.target_review_receipt_sha256&&
    a.candidate_commit_sha===ci.candidate_commit_sha)&&
   UUID.test(ci.maintenance_id||'')&&UUID.test(ci.shift_id||'')&&
   GIT.test(ci.candidate_commit_sha||'')&&
   GIT.test(ci.candidate_source_blob_sha||'')&&
   GIT.test(ci.target_head_sha||'')&&
   ci.target_branch==='reality/chat-direct-work-handoff-20261115'&&
   /^src\/[a-z0-9_./-]+\.js$/.test(ci.target_path||'')&&
   SHA.test(ci.target_review_receipt_sha256||'')&&
   SHA.test(ci.artifact_receipt_sha256||'')&&
   SHA.test(ci.case_ci_receipt_sha256||''))
   exactInstallCard=ci;
  if(ci?.status==='EXACT_OWNER_MAINTENANCE_INSTALL_DECISION_RECORDED'&&
   ci.shift_id===c.current_shift_id&&
   c.signed_maintenance_incident_ids.includes(ci.maintenance_id)&&
   UUID.test(ci.approval_id||'')&&SHA.test(ci.approval_receipt_sha256||'')&&
   ci.installation_authorized===true&&ci.owner_approval_ready===false&&
   ci.original_job_completed===false&&ci.production_changed===false)
   exactInstallDecision=ci;
  // Universe projection of Reality's verified classifier only. A lane is
  // evidence + NEXT governed action, never an executor or approval button.
  const route=data.governed_continuity_evidence_classification;
  let classifiedLanes=[];
  if(route&&[
    'GOVERNED_CONTINUITY_EVIDENCE_SEPARATED_AND_ROUTED',
    'GOVERNED_CONTINUITY_PARTIAL_EVIDENCE_CLASSIFIED'
   ].includes(route.status)&&
   route.shift_id===c.current_shift_id&&
   route.classifier_grants_authority===false&&
   route.ledger_mutated===false&&route.universe_state_mutated===false&&
   route.installation_authorized===false&&
   route.original_job_completed===false&&
   route.production_changed===false&&
   Number.isSafeInteger(route.lane_count)&&route.lane_count>=0&&
   route.lane_count<=4&&Array.isArray(route.lanes)&&
   route.lanes.length===route.lane_count&&
   route.lanes.every(l=>
    ['INTERNAL_CAPABILITY_REPAIR','CANONICAL_BUSINESS_ORIGINAL']
      .includes(l?.lane_kind)&&
    REF.test(l?.source_ref||'')&&
    UUID.test(l?.maintenance_id||'')&&
    c.items.some(j=>j.origin_incident_id===l.maintenance_id&&
      j.source_ref===l.source_ref)&&
    l.execution_permitted_by_classification===false&&
    l.approval_permitted_by_classification===false&&
    l.authority_status==='NO_NEW_ACTION_AUTHORITY'&&
    SHA.test(l?.independent_evidence_receipt_sha256||'')))
   classifiedLanes=route.lanes;
  return Object.freeze({
   count:c.open_count,jobs:c.items,activeId:c.current_shift_id,
   verifiedArtifacts,classifiedLanes,exactInstallCard,exactInstallDecision,
   activity,shiftReadback:shift,finalReceipt:terminal?{
    shift_id:terminal.shift_id,
    count:terminal.close_report.independently_verified_internal_maintenance_jobs,
    closed_at:terminal.closed_at,
    execution_receipt_sha256:terminal.steps[5].proof_sha256,
    verification_receipt_sha256:terminal.steps[6].proof_sha256,
    final_report_sha256:terminal.steps[7].proof_sha256
   }:null,
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
  decisionHeadline.hidden=!scope.exactInstallCard&&!scope.exactInstallDecision;
  decisionHeadline.textContent=scope.exactInstallCard?
   'Approval needed · Repair ready':
   scope.exactInstallDecision?'Approval recorded · Installation status in Chat':'';
  checkStatusInChat.hidden=!scope.exactInstallCard&&!scope.exactInstallDecision;
  if(!installUncertain)chatStatus.textContent=scope.exactInstallCard?
   'Ready for your one-time decision. This approves only the exact reviewed file in the isolated preview, not production.':
   scope.exactInstallDecision?
   'Owner approval is recorded. The verified installation-status message in Chat shows source installation and independent verification separately. Original work remains open until proven.':
   'The original shift is preserved. Reality will only ask for authority when a verified repair is ready.';
  chatEvidence.replaceChildren();
  const evidence=scope.exactInstallCard||scope.exactInstallDecision;
  if(evidence){
   const label=(name,value)=>{
    if(value==null||value==='')return;
    const p=make('p','');
    p.append(make('strong','',name+': '),make('span','',value));
    chatEvidence.append(p);
   };
   label('Existing authorized shift',evidence.shift_id);
   label('Repair',evidence.source_ref);
   label('Target file',evidence.target_path);
   label('Candidate commit',evidence.candidate_commit_sha);
   label('Independent artifact receipt',evidence.artifact_receipt_sha256);
   label('Independent frozen CI receipt',evidence.case_ci_receipt_sha256);
   label('Independent installation-target receipt',evidence.target_review_receipt_sha256);
   label('Installation scope','Isolated preview only; production untouched');
   if(REF.test(evidence.source_ref||'')){
    const link=make('a','reality-chat-maintenance-source','Open exact GitHub evidence');
    link.href=evidence.source_ref;link.target='_blank';link.rel='noopener noreferrer';
    chatEvidence.append(link);
   }
  }
  review.textContent=detailDisclosure.hidden?'View details':'Hide details';
  review.setAttribute('aria-expanded',String(!detailDisclosure.hidden));
  installApprove.hidden=!scope.exactInstallCard;
  // Readback renders while loading=true; a verified approval must be
  // enabled AFTER render, while the click handler itself guards loading.
  installApprove.disabled=!scope.exactInstallCard||installAuthorizing||installUncertain||authorizing;
  // Never send the owner to a second place to approve a Chat decision.
  installApproveInInbox.hidden=true;
  installApproveInInbox.disabled=true;
  installDetails.hidden=!scope.exactInstallCard&&!scope.exactInstallDecision;
  installDetails.textContent=scope.exactInstallCard?
   'PR #'+scope.exactInstallCard.source_ref.split('/').pop()+
   ' passed independent review. This approves installation in the isolated preview only, not production.':
   scope.exactInstallDecision?
   'Approval recorded. See Reality’s verified installation-status message in this conversation for the installed commit and the independent post-installation result.':'';
  list.replaceChildren();
  root.hidden=scope.count===0;
  hint.hidden=scope.count===0&&!scope.finalReceipt;
  watch.hidden=!(scope.activeId&&scope.warrantVerified)&&!scope.finalReceipt;
  watch.disabled=watch.hidden;
  watch.textContent=watching?'Pause live updates':'Follow live repairs';
  if(!scope.count){
   authorize.disabled=true;inlineContinue.hidden=true;
   description.textContent='No unfinished maintenance repairs in the verified ledger.';
   feedback.textContent=scope.finalReceipt?
    'Independent maintenance completion receipt available for shift '+
     scope.finalReceipt.shift_id:'No maintenance shift was started by this read.';
   if(scope.finalReceipt){
    hintLabel.textContent='Reality independently verified '+scope.finalReceipt.count+
     ' exact maintenance repairs and closed shift '+scope.finalReceipt.shift_id+
     '. Your execution, verification and final-report receipts are available below.';
    dialogueJobs.replaceChildren();
    dialogueProof.textContent='Verified final maintenance receipt · no customer-original settlement implied.';
    if(hint.parentElement!==thread)thread.append(hint);
   }
   renderLive(scope);
   return;
  }
  title.textContent=scope.count+' unfinished employee repair'+(scope.count===1?'':'s');
  const roleLabels={
   EMPLOYEE_QUALIFICATION_HANDOFF_STALLED:'employee job qualification handoff',
   QUALIFIED_EVIDENCE_JOB_BLOCKED:'source-evidence execution handoff'
  };
  const signedIds=new Set(scope.signedIds);
  hintLabel.textContent=scope.activeId&&scope.warrantVerified?
   scope.exactInstallCard?
    'Reality found a verified repair for your existing shift. One exact approval is needed before installation.':
   scope.exactInstallDecision?
    'Your approval is recorded. Reality tracks installed source, independent verification and the original job separately. No repeat approval is needed.':
    'Your existing shift is still active. Reality is investigating the remaining repairs.':
   scope.activeId?
    'Reality preserved the existing shift, but must verify its authority before proceeding.':
   scope.valid?
    'Reality found '+scope.count+' unfinished employee repairs. One exact decision can continue the existing work.':
    'Reality found unfinished work, but its authorization is not yet verified.';
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
   'Signed shift '+scope.activeId+' · '+scope.signedCount+
   ' repairs in scope; '+scope.outsideCount+
   ' additional incidents outside scope. '+
   (scope.exactInstallDecision?
    'The exact repair approval is already recorded. Do not approve again. Independent installation and verification are tracked separately.':
    'Any further installation requires its own exact owner approval and independent receipts.'):
   'This source readback never grants installation authority.';
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
  renderLive(scope);
  feedback.textContent=scope.activeId?
   'Existing shift: '+scope.activeId+' · '+scope.signedCount+
    ' exact signed repairs · '+scope.outsideCount+
    (scope.exactInstallDecision?
     ' outside-scope incidents. Owner approval recorded; see the live installation message in Chat. No duplicate click.':
     ' outside-scope incidents. This shift receipt alone does not prove installation or completion.'):
   scope.valid?'No work is started by reading this card. Press Continue to authorize the exact preserved maintenance set.':
    'Could not prepare an exact continuation; review and refresh the signed maintenance readback.';
 }
 function renderLive(scope){
  timeline.hidden=!watching||!(scope?.activeId&&scope.warrantVerified||
   scope?.finalReceipt);
  timeline.replaceChildren();
  if(timeline.hidden)return;
  const heading=make('strong','reality-chat-maintenance-live-title',
   scope.finalReceipt&&scope.count===0?
    'Independently verified completion receipt':'Live owner-authorized repair progress');
  timeline.append(heading);
  const line=(label,value)=>{
   const item=make('p','reality-chat-maintenance-live-line');
   item.append(make('strong','',label+' '),make('span','',value));
   timeline.append(item);
  };
  const digest=(label,value)=>{
   if(!SHA.test(value||''))return;
   const item=make('p','reality-chat-maintenance-live-proof');
   item.append(make('strong','',label+' '),make('code','',value));
   timeline.append(item);
  };
  if(scope.finalReceipt&&scope.count===0){
   const r=scope.finalReceipt;
   line('Original shift:',r.shift_id);
   line('Independent repairs verified:',String(r.count));
   line('Completed:',new Date(r.closed_at).toLocaleString());
   digest('Execution:',r.execution_receipt_sha256);
   digest('Independent verification:',r.verification_receipt_sha256);
   digest('Final report:',r.final_report_sha256);
   line('Authority:', 'Maintenance completion only; no customer job was automatically settled.');
   return;
  }
  line('Existing shift:',scope.activeId);
  line('Owner authorization:',scope.signedCount+' exact repairs covered; '+
   scope.outsideCount+' later incidents not authorized by this warrant.');
  const a=scope.activity;
  if(a&&Number.isSafeInteger(a.worker_wake_count)&&a.worker_wake_count>=0){
   line('Signed worker wakes:',String(a.worker_wake_count));
   if(Number.isFinite(Date.parse(a.last_worker_seen_at||'')))
    line('Last worker contact:',new Date(a.last_worker_seen_at).toLocaleString());
   if(typeof a.last_worker_safe_result==='string'&&
      /^[A-Z][A-Z0-9_]{4,150}$/.test(a.last_worker_safe_result))
    line('Last verified worker disposition:',
     a.last_worker_safe_result.replaceAll('_',' ').toLowerCase());
  }else{
   line('Worker progress:', 'No independently verified live worker activity in this readback.');
  }
  for(const a of scope.verifiedArtifacts||[]){
   const n=a.source_ref.split('/').pop();
   line('Independent repair artifact:', 'PR #'+n+
    (a.install_target_verified===true?' · exact target independently reviewed.':' · exact source tested; install target review still needed.'));
   line('Candidate commit:',a.candidate_commit_sha);
   line('Independent CI run:',String(a.github_run_id));
   digest('Review artifact receipt:',a.review_receipt_sha256);
   digest('Frozen RED/GREEN:',a.case_ci_receipt_sha256);
   if(a.install_target_verified===true)digest('Independent target proof:',a.target_review_receipt_sha256);
   line('Authority:',scope.exactInstallDecision?'Owner install permission recorded; original not completed.':'No installation approval; no original-job completion.');
  }
  if(scope.classifiedLanes?.length){
   const header=make('strong','reality-chat-maintenance-live-title',
    'Reality · Governed Evidence Classification');
   timeline.append(header);
   for(const lane of scope.classifiedLanes){
    line(lane.lane_kind==='INTERNAL_CAPABILITY_REPAIR'?
     'Capability repair lane:':'Business original lane:',
     lane.source_ref.split('/').slice(-2).join(' #'));
    line('Verified state:',lane.classified_state.replaceAll('_',' ').toLowerCase());
    line('Next governed action:',lane.next_governed_action.replaceAll('_',' ').toLowerCase());
    digest('Independent evidence:',lane.independent_evidence_receipt_sha256);
   }
   line('Classifier authority:','Evidence routing only. No approval, installation or final settlement.');
  }
  const covered=new Set(scope.signedIds);
  for(const job of scope.jobs.filter(x=>covered.has(x.origin_incident_id))){
   const name=make('strong','reality-chat-maintenance-live-job',
    job.assignee+' · '+job.source_ref.split('/').slice(-2).join(' #'));
   timeline.append(name);
   line('Independent reviewer:',job.independent_reviewer);
   line('Investigation:',job.independent_failure_baseline_receipt_sha256?
    'Historical failure baseline receipted':'Failure reproduction not yet independently receipted');
   digest('Frozen baseline:',job.independent_failure_baseline_receipt_sha256);
   if(job.source_requalification_receipt_sha256){
    line('Source requalification:', 'Verified in this same shift.');
    digest('Independent source requalification:',job.source_requalification_receipt_sha256);
   }
   if(job.ci_dispatch_receipt_sha256){
    line('Signed GitHub CI dispatch:', 'Completed. This is transport proof, not a test verdict.');
    digest('GitHub CI dispatch:',job.ci_dispatch_receipt_sha256);
   }
   if(job.ci_independent_diagnostic_receipt_sha256){
    line('Independent GitHub diagnostics:', 'Verified execution; original frozen RED still required.');
    if(Number.isSafeInteger(job.ci_independent_github_run_id))
     line('GitHub Actions run:',String(job.ci_independent_github_run_id));
    digest('Independent diagnostic receipt:',job.ci_independent_diagnostic_receipt_sha256);
    digest('GitHub artifact:',job.ci_independent_artifact_digest);
   }
   if(job.source_requalification_receipt_sha256&&
      !job.independent_frozen_test_receipt_sha256)
    line('Required next action:', 'Run the case-specific executable frozen CI RED on the requalified source.');
   else if(job.independent_review_status==='SOURCE_CHANGED_NEEDS_FROZEN_TEST')
    line('Required next action:', 'Requalify changed source before case-specific CI.');
   else if(!job.independent_frozen_test_receipt_sha256)
    line('Required next action:', 'Run the case-specific executable frozen CI RED.');
   else line('Frozen regression:', 'Independent evidence receipt recorded.');
   digest('Independent frozen CI:',job.independent_frozen_test_receipt_sha256);
   line('Repair:',job.repair_verified===true?
    'Verified repair indicated by independent ledger':'No independently verified repair yet');
  }
  line('Completion:', 'The original shift stays open until every exact maintenance repair has its independently verified receipt.');
  line('Installation:', 'A separate exact approval is required before any code installation.');
 }
 watch.addEventListener('click',()=>{
  if(!signedIn()||watch.disabled||!approvedScope)return;
  watching=!watching;
  watch.textContent=watching?'Pause live updates':'Follow live repairs';
  renderLive(approvedScope);
  if(watching)void refresh();
 });
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
  if(!signedIn()||loading||authorizing||installAuthorizing)return;
  loading=true;reload.disabled=true;
  try{
   const scope=await read();
   // A previous uncertain POST is never silently retried. This button is
   // only unlocked after an explicit source-backed Check status.
   // A background refresh MUST NOT unlock a failed/unknown owner POST.
   // Only a separate explicit Check status read can establish its outcome.
   uncertain=false;
   render(scope);
  }catch(e){
   approvedScope=null;authorize.disabled=true;installApprove.disabled=true;
   installDetails.hidden=true;installDetails.textContent='';
   installApprove.hidden=true;
   installApproveInInbox.disabled=true;installApproveInInbox.hidden=true;
   inlineContinue.disabled=true;root.hidden=false;hint.hidden=false;
   checkStatusInChat.hidden=false;decisionHeadline.hidden=true;
   title.textContent='Maintenance verification unavailable';
   list.replaceChildren();
   hintLabel.textContent='Reality could not independently retrieve the live maintenance ledger. Your earlier shift is not restarted, and no approval is inferred.';
   chatStatus.textContent='Source readback unavailable ('+safeError(e)+
    '). You can check the exact approval status right here without retrying an approval.';
   description.textContent='Reality cannot independently read the unfinished maintenance ledger.';
   feedback.textContent='Approval not confirmed. '+safeError(e)+'. Check status in Chat.';
   if(!thread.contains(hint))thread.append(hint);
  }finally{
   loading=false;reload.disabled=false;
   // The full shift read can time out while the tiny, owner-scoped exact
   // decision RPC is healthy. GET never approves or installs anything.
   if(!approvedScope)void checkExactOwnerApprovalStatus();
  }
 }
 function showApprovals(){
  if(!signedIn())return;
  detailDisclosure.hidden=false;
  chatEvidence.hidden=false;
  review.textContent='Hide details';
  review.setAttribute('aria-expanded','true');
  hint.scrollIntoView({behavior:'smooth',block:'nearest'});
 }
 review.addEventListener('click',()=>{
  if(!signedIn())return;
  detailDisclosure.hidden=!detailDisclosure.hidden;
  chatEvidence.hidden=detailDisclosure.hidden;
  review.textContent=detailDisclosure.hidden?'View details':'Hide details';
  review.setAttribute('aria-expanded',String(!detailDisclosure.hidden));
 });
 checkStatusInChat.addEventListener('click',()=>{
  if(!signedIn()||loading||installAuthorizing)return;
  // Always use the small, owner-scoped read. Never route a status check
  // back through the broad 25-second shift snapshot that just timed out.
  void checkExactOwnerApprovalStatus();
 });
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
 installApproveInInbox.addEventListener('click',()=>{
  // Delegate to EXACT same owner click transport; no second approval request.
  if(!installApproveInInbox.disabled&&!installApprove.disabled)installApprove.click();
 });
 installApprove.addEventListener('click',async()=>{
  // No model, assistant message or ordinary Chat reply can press this.
  // The server independently re-reads and compares the exact current
  // owner-scoped artifact before accepting a one-use approval. Do not insert
  // an expensive/unreliable duplicate full-shift GET between an explicit
  // owner click and its one authorized POST.
  if(!signedIn()||loading||authorizing||installAuthorizing||
   installUncertain||installApprove.disabled||!approvedScope?.exactInstallCard)
   return;
  const prior=approvedScope.exactInstallCard;
  installAuthorizing=true;installApprove.disabled=true;installApproveInInbox.disabled=true;reload.disabled=true;
  try{
   // This is the exact receipt the owner reviewed; never replace it with
   // model content. The service-only approval endpoint MUST recheck it
   // against the live ledger before recording any installation authority.
   const c=prior;
   if(typeof crypto?.randomUUID!=='function')
    fail('SECURE_REQUEST_ID_UNAVAILABLE');
   feedback.textContent='Recording one exact preview installation approval. The existing shift will continue automatically.';
   chatStatus.textContent='Recording your one-use preview approval. Installation and the original job are not yet verified.';
   const response=await fetch('/api/reality/signed-maintenance-exact-install-approval',{
    method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({
     maintenance_id:c.maintenance_id,shift_id:c.shift_id,
     candidate_commit_sha:c.candidate_commit_sha,
     target_review_receipt_sha256:c.target_review_receipt_sha256,
     intent:'OWNER_APPROVE_EXACT_SIGNED_ISOLATED_MAINTENANCE_REPAIR',
     request_id:crypto.randomUUID()
    }),signal:AbortSignal.timeout(55000)
   });
   const r=await response.json().catch(()=>null);
   if(!response.ok||r?.ok!==true||
    r.status!=='EXACT_SIGNED_OWNER_APPROVAL_RECORDED_AUTO_CONTINUATION'||
    r.shift_id!==c.shift_id||r.maintenance_id!==c.maintenance_id||
    !UUID.test(r.approval_id||'')||!SHA.test(r.approval_receipt_sha256||'')||
    r.installation_authorized!==true||
    r.installation_completed!==false||r.original_job_completed!==false||
    r.production_changed!==false||r.new_shift_started!==false||
    r.no_third_confirmation!==true)
    fail('EXACT_INSTALL_APPROVAL_OUTCOME_UNVERIFIED');
   installUncertain=true;
   installApprove.hidden=true;installApprove.disabled=true;
   installApproveInInbox.hidden=true;installApproveInInbox.disabled=true;
   hintLabel.textContent='Reality recorded the exact owner approval. The SAME signed shift must now install, independently verify and resume the unfinished work.';
   feedback.textContent='Owner approval receipt '+r.approval_receipt_sha256+
    ' recorded. No repeat approval or shift restart. Installation and final job verification are pending.';
   chatStatus.textContent='Approval recorded · '+r.approval_receipt_sha256+
    '. Reality must now install, independently verify, and resume the SAME shift. No second click.';
   // A successful signed decision is already a verified receipt. A broad
   // shift refresh must not overwrite it with an unrelated GET timeout.
  }catch(e){
   installUncertain=true;installApprove.disabled=true;installApproveInInbox.disabled=true;
   feedback.textContent='The exact installation decision could not be independently confirmed ('+
    safeError(e)+'). Use Check status before any further action. No automatic retry.';
   chatStatus.textContent='Approval outcome unverified ('+safeError(e)+
    '). Tap Check approval status here in Chat. Do not approve again.';
  }finally{installAuthorizing=false;reload.disabled=false}
 });
 // Narrow, authenticated ledger readback permits an owner to review the
 // exact independently tested artifact even if the unrelated broad shift
 // dashboard is overloaded. Every POST separately revalidates all hashes.
 function renderExactReviewFromNarrowReadback(card){
  if(!card||!UUID.test(card.maintenance_id||'')||
     !UUID.test(card.shift_id||'')||
     !REF.test(card.source_ref||'')||
     !/^https:\/\/github\.com\/maloney2323\/Reality\/pull\/[1-9][0-9]*$/.test(card.source_ref)||
     card.target_branch!=='reality/chat-direct-work-handoff-20261115'||
     !/^src\/[a-z0-9_./-]+\.js$/.test(card.target_path||'')||
     card.target_path.includes('..')||
     !GIT.test(card.candidate_commit_sha||'')||
     !GIT.test(card.candidate_source_blob_sha||'')||
     !GIT.test(card.target_head_sha||'')||
     !GIT.test(card.expected_old_blob_sha||'')||
     !SHA.test(card.artifact_receipt_sha256||'')||
     !SHA.test(card.case_ci_receipt_sha256||'')||
     !SHA.test(card.target_review_receipt_sha256||''))
   fail('NARROW_EXACT_ARTIFACT_READBACK_INVALID');
  approvedScope=Object.freeze({exactInstallCard:Object.freeze(card)});
  root.hidden=true;
  hint.hidden=false;
  hintLabel.textContent='Reality verified PR #'+card.source_ref.split('/').pop()+
   ' for your existing shift. The larger work report is delayed, but this exact approval was independently read from the ledger.';
  decisionHeadline.hidden=false;
  decisionHeadline.textContent='Your decision · Verified preview repair';
  installDetails.hidden=false;
  installDetails.textContent='Approve only '+card.target_path+
   ' in Reality’s isolated preview. Production is unchanged.';
  checkStatusInChat.hidden=false;
  installApprove.hidden=false;
  installApprove.disabled=false;
  installApproveInInbox.hidden=true;installApproveInInbox.disabled=true;
  inlineContinue.hidden=true;
  watch.hidden=true;
  chatEvidence.replaceChildren();
  for(const [label,value] of [
   ['Original shift',card.shift_id],
   ['Exact repair',card.source_ref],
   ['Candidate commit',card.candidate_commit_sha],
   ['Independent frozen test',card.case_ci_receipt_sha256],
   ['Independent artifact receipt',card.artifact_receipt_sha256],
   ['Independent target proof',card.target_review_receipt_sha256],
   ['Installation scope','Isolated preview only; not production']
  ]){
   const p=make('p','');
   p.append(make('strong','',label+': '),make('span','',value));
   chatEvidence.append(p);
  }
  detailDisclosure.hidden=true;chatEvidence.hidden=true;
  review.textContent='View details';
  review.setAttribute('aria-expanded','false');
  chatStatus.textContent='Checked: no previous approval was recorded. This exact reviewed repair is ready for one explicit owner decision.';
  feedback.textContent='Owner decision readback verified. No installation was authorized by checking status.';
  if(!thread.contains(hint))thread.append(hint);
 }
 async function checkExactOwnerApprovalStatus(){
  if(!signedIn()||loading||authorizing||installAuthorizing)return;
  reload.disabled=true;
  try{
   // Read-only owner-scoped GET. This never retries the earlier POST,
   // creates another request ID, or invokes an installer.
   const response=await fetch('/api/reality/signed-maintenance-exact-install-approval',{
    method:'GET',credentials:'same-origin',cache:'no-store',
    signal:AbortSignal.timeout(23000)
   });
   const r=await response.json().catch(()=>null);
   if(!response.ok||r?.ok!==true||r.retry_owner_approval!==false)
    fail('EXACT_OWNER_APPROVAL_STATUS_UNVERIFIED_'+(r?.failed_stage||response.status));
   if(r.status==='EXACT_SIGNED_OWNER_APPROVAL_RECORDED_READBACK'&&
      r.owner_approval_recorded===true&&r.installation_authorized===true&&
      SHA.test(r.approval_receipt_sha256||'')){
    // Approval is immutable, but installed source and independent verification
    // advance separately. Never imply that a verified installed commit is
    // uninstalled or that GitHub success alone settled the repair.
    const installed=['INSTALLED','VERIFIED'].includes(r.decision_state)&&
     r.repair_installed===true&&GIT.test(r.installed_commit_sha||'');
    const verified=installed&&r.decision_state==='VERIFIED'&&
     r.postinstall_verified===true&&
     SHA.test(r.independent_postinstall_receipt_sha256||'');
    if((['INSTALLED','VERIFIED'].includes(r.decision_state)&&!installed)||
       (r.decision_state==='VERIFIED'&&!verified))
     fail('EXACT_POSTINSTALL_RECEIPT_CONTRADICTORY');
    installUncertain=true;
    installApprove.hidden=true;installApprove.disabled=true;
    installApproveInInbox.hidden=true;installApproveInInbox.disabled=true;
    hint.hidden=false;
    checkStatusInChat.hidden=false;
    const number=String(r.source_ref||'').split('/').pop();
    const title=verified?'Independent repair verification recorded':
     installed?'Repair installed · Independent verification pending':
     'Owner approval recorded · Installation not yet verified';
    decisionHeadline.hidden=false;
    decisionHeadline.textContent=title;
    hintLabel.textContent=verified?
     'Reality independently verified the installed repair for PR #'+number+
     '. Original business work remains a separate unfinished acceptance gate.':
     installed?
     'Reality installed PR #'+number+
     ' in the isolated preview. Independent verification is not yet recorded. No repeat approval.':
     'Reality independently read back your exact owner approval. The installation step is still separate. No repeat approval.';
    if(!thread.contains(hint))thread.append(hint);
    feedback.textContent=verified?
     'Repair verification receipt '+r.independent_postinstall_receipt_sha256+
     ' recorded. Original job completion still requires independent proof.':
     installed?
     'Installed commit '+r.installed_commit_sha+
     ' verified in the owner ledger; waiting for the separate post-installation receipt.':
     'Exact owner approval receipt '+r.approval_receipt_sha256+
     ' verified. Installation is separately governed; no repeat approval.';
    installDetails.hidden=false;
    installDetails.textContent=verified?
     'Installed commit '+r.installed_commit_sha+
     ' was independently accepted. Original work is not yet settled.':
     installed?
     'Installed commit '+r.installed_commit_sha+
     ' is recorded in the isolated preview. Independent post-install verification is pending.':
     'Approval is recorded. Reality has not yet verified an installed commit.';
    chatStatus.textContent='PR #'+number+' · '+title+
     '. The existing shift remains open until its own work is independently reconciled.';
    return;
   }
   if(r.status==='EXACT_SIGNED_OWNER_APPROVAL_NOT_RECORDED_READBACK'&&
      r.owner_approval_recorded===false&&r.installation_authorized===false){
    if(!r.exact_review)fail('NARROW_EXACT_REVIEW_MISSING');
    // No automatic retry or approval: this renders only the exact evidence.
    renderExactReviewFromNarrowReadback(r.exact_review);
    installUncertain=false;
    return;
   }
   if(r.status==='EXACT_SIGNED_OWNER_APPROVAL_SCOPE_UNAVAILABLE'&&
      r.owner_approval_recorded===false){
    installUncertain=true;
    installApprove.disabled=true;installApproveInInbox.disabled=true;
    feedback.textContent='No current exact approval scope is available. Installation remains blocked; do not retry.';
    chatStatus.textContent='Checked: no verified exact approval scope is available. Installation is blocked. Do not retry.';
    return;
   }
   fail('EXACT_OWNER_APPROVAL_STATUS_CONTRADICTORY');
  }catch(e){
   installUncertain=true;
   installApprove.disabled=true;installApproveInInbox.disabled=true;
   feedback.textContent='Exact approval readback is still unverified ('+
    safeError(e)+'). No automatic retry or new shift.';
   chatStatus.textContent='Check failed ('+safeError(e)+
    '). Reality cannot verify the decision yet. No duplicate click, install, or shift restart.';
  }finally{reload.disabled=false}
 }
 reload.addEventListener('click',()=>{
  if(authorizing)return;
  // Check status uses the narrow signed owner receipt even after a page
  // reload has cleared the previous browser-only uncertainty flag.
  if(installUncertain||approvedScope?.exactInstallCard||
     approvedScope?.exactInstallDecision)void checkExactOwnerApprovalStatus();
  else void refresh();
 });
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
   render(Object.freeze({...fresh,activeId:receipt.shift_id,valid:false,
    warrantVerified:true,signedCount:fresh.count,outsideCount:0,
    signedIds:fresh.jobs.map(j=>j.origin_incident_id)}));
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
    'Please use Check status here in Chat before trying anything again. '+
    'I will not issue a duplicate authorization.';
   checkStatusInChat.hidden=false;
   chatStatus.textContent='Continuation authorization status unverified. Tap Check approval status here; never repeat an uncertain owner request.';
   dialogueJobs.replaceChildren();
   feedback.textContent='Authorization could not be independently confirmed ('+
    safeError(e)+'). Use Check status first. Do not press Continue again until Reality proves there is no active shift.';
  }finally{authorizing=false;reload.disabled=false}
 });
 const signObserver=new MutationObserver(()=>{
  if(signedIn()&&!initialized){initialized=true;void refresh()}
  if(!signedIn()){
   initialized=false;approvedScope=null;watching=false;
   root.hidden=true;hint.hidden=true;timeline.hidden=true;
   authorize.disabled=true;inlineContinue.disabled=true;watch.disabled=true;
   installApprove.hidden=true;installApprove.disabled=true;
   installApproveInInbox.hidden=true;installApproveInInbox.disabled=true;
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
 // While the owner is watching, poll independently verified readback only.
 // No additional execution POST, new shift, model work or permission is minted.
 window.setInterval(()=>{
  if(watching&&document.visibilityState==='visible'&&signedIn()&&
     !loading&&!authorizing)void refresh();
 },20000);
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
