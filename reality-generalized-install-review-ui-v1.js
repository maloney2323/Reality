// Authenticated owner exact-artifact review with ONE explicit installation
// click only after all three independent readiness gates. No model output,
// passive refresh or shift-start message authorizes installation.
const API='/api/reality/generalized-original-install-review';
const SOURCE=/^https:\/\/github\.com\/maloney2323\/Reality\/issues\/[1-9][0-9]*$/;
const HASH=/^sha256:[a-f0-9]{64}$/;
const SHA=/^[a-f0-9]{40}$/;
const WORK=/^work:[a-f0-9]{32}$/;
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const APPROVE_API='/api/reality/generalized-owner-install-approval';
const RECOVERY_APPROVE_API='/api/reality/general-original-recovery-approval';
const RECOVERY_INTENT='OWNER_APPROVE_ONE_EXACT_FENCED_ORIGINAL_RECOVERY_PUBLICATION';
const INTENT='OWNER_APPROVE_EXACT_INDEPENDENTLY_VERIFIED_ISOLATED_REPAIR';
const get=id=>document.getElementById(id);
const add=(kind,parent,value)=>{const e=document.createElement(kind);
 if(value)e.textContent=value;parent.append(e);return e;};
function panel(){
 const host=get('privateTranscript')||get('privateReady');
 if(!host)return null;
 let p=get('generalizedOriginalInstallReviewPanel');
 if(!p){
  p=add('section',host);p.id='generalizedOriginalInstallReviewPanel';
  p.className='team-proof bubble reality-chat-live-work';p.hidden=true;
  p.style.cssText='margin:12px 0;padding:16px;border:1px solid #5284a5;border-radius:14px;background:#0d263b;max-width:100%;overflow-wrap:anywhere';
  p.setAttribute('aria-live','polite');
  add('h4',p,'Reality · your decision is needed');
  add('p',p).id='generalizedOriginalInstallReviewStatus';
  add('p',p).id='generalizedOriginalInstallRecoveryUpdate';
  // One concise conversation update comes first. Long source and CI proof
  // stays available, but can no longer push the mobile decision or receipt
  // out of the usable Chat viewport.
  const proof=add('details',p);proof.id='generalizedOriginalInstallTechnicalDetails';
  add('summary',proof,'View exact source, independent tests and release evidence');
  add('p',proof).id='generalizedOriginalInstallReviewArtifact';
  add('p',proof).id='generalizedOriginalInstallReviewGates';
  const links=add('p',proof);links.id='generalizedOriginalInstallReviewEvidence';
  const approve=add('button',p,'Approve exact verified upgrade');
  approve.type='button';approve.hidden=true;
  approve.id='generalizedOriginalInstallApproveExactButton';
  approve.addEventListener('click',()=>approveExactFromUserClick());
  const recover=add('button',p,'Approve one exact recovery installation');
  recover.type='button';recover.hidden=true;
  recover.id='generalizedOriginalRecoveryApproveButton';
  recover.addEventListener('click',()=>approveRecoveryFromUserClick());
  add('p',p).id='generalizedOriginalInstallApprovalResult';
  const warning=add('p',proof,
   'Reality does not install a repair or settle an original job from a passing model answer or CI check. The exact owner approval must follow independent release-continuation readiness.');
  warning.style.fontSize='13px';
 }
 // The mobile shell locks the outer page and gives scrolling to
 // #privateTranscript. Keeping this message OUTSIDE that thread makes a long
 // approval card unscrollable and can hide the composer entirely.
 // Append one real, read-only Reality event bubble INSIDE the same chat scroller.
 if(host.id==='privateTranscript'){
  if(p.parentNode!==host)host.append(p);
 }else if(host.id==='privateReady'){
  // Legacy fallback for Chat views without a transcript.
  const banner=get('privateAccountMissionBanner');
  const before=banner?.parentNode===host?banner.nextSibling:host.firstChild;
  if(p.parentNode!==host||(banner&&p.previousSibling!==banner))
   host.insertBefore(p,before||null);
 }
 return p;
}
function safe(d){
 return d?.ok===true&&
  d.status==='GENERALIZED_VERIFIED_ORIGINAL_INSTALL_REVIEW'&&
  WORK.test(d.original_work_id||'')&&
  (d.source_family==='SIGNED_CHAT_DEVELOPMENT_RECOVERY'?
    UUID.test(d.source_message_id||'')&&d.source_ref==='supabase:reality_chat_messages:'+d.source_message_id:
    SOURCE.test(d.source_ref||''))&&
  HASH.test(d.candidate_artifact_sha256||'')&&
  SHA.test(d.candidate_commit_sha||'')&&
  SHA.test(d.expected_preinstall_blob_sha||'')&&
  SHA.test(d.expected_installed_blob_sha||'')&&
  Number.isSafeInteger(d.independent_frozen_run_id)&&
  d.independent_frozen_run_id>10000&&
  Number.isSafeInteger(d.integrated_test_run_id)&&
  d.integrated_test_run_id>10000&&
  d.production_changed===false&&
  typeof d.owner_approval_ready==='boolean'&&
  typeof d.installation_authorized==='boolean'&&
  typeof d.original_job_completed==='boolean'&&
  typeof d.owner_approval_action_available==='boolean'&&
  UUID.test(d.attempt_id||'')&&
  typeof d.phase==='string';
}
function evidenceLink(parent,label,url){
 const a=add('a',parent,label);
 a.href=url;a.target='_blank';a.rel='noopener noreferrer';
 a.style.display='inline-block';a.style.marginRight='14px';
}
let busy=false,submitting=false,submitted=false,activeCard=null;
let lastVisiblePhase=null;
let recovering=false,recoverySubmitted=false,activeRecovery=null;
function actionableRecovery(d){
 const p=d?.recovery_publication;
 return safe(d)&&d.recovery_approval_action_available===true&&
  d.recovery_approval_action_endpoint===RECOVERY_APPROVE_API&&
  d.phase==='INSTALL_INTENT_FENCED'&&
  d.installation_authorized===true&&d.original_job_completed===false&&
  p?.status==='GENERAL_ORIGINAL_EXACT_RECOVERY_PUBLICATION_REVIEW'&&
  p.phase==='READY_FOR_EXACT_RECOVERY_APPROVAL'&&
  p.owner_approval_ready===true&&p.owner_approval_id===null&&
  UUID.test(p.recovery_publication_id||'')&&
  UUID.test(p.attempt_id||'')&&
  p.attempt_id===d.attempt_id&&
  p.original_work_id===d.original_work_id&&
  p.candidate_commit_sha===d.candidate_commit_sha&&
  p.candidate_artifact_sha256===d.candidate_artifact_sha256&&
  SHA.test(p.expected_parent_commit_sha||'')&&
  Number.isSafeInteger(p.independent_recovery_test_run_id)&&
  p.independent_recovery_test_run_id>10000&&
  SHA.test(p.proof_commit_sha||'')&&
  p.original_job_completed===false&&p.production_changed===false;
}
async function approveRecoveryFromUserClick(){
 // This real owner click is the ONLY source of the second exact consent.
 // Passive refresh, Chat text, the model and worker cannot invoke it.
 if(!activeRecovery||recovering||recoverySubmitted)return;
 const r=activeRecovery;
 recovering=true;recoverySubmitted=true;
 const btn=get('generalizedOriginalRecoveryApproveButton');
 if(btn){btn.hidden=true;btn.disabled=true;}
 const status=get('generalizedOriginalInstallApprovalResult');
 status.textContent='Recording one exact recovery approval. Do not click again.';
 try{
  const response=await fetch(RECOVERY_APPROVE_API,{
   method:'POST',cache:'no-store',credentials:'same-origin',
   headers:{'content-type':'application/json',accept:'application/json'},
   body:JSON.stringify({
    recovery_publication_id:r.recovery_publication_id,
    original_work_id:r.original_work_id,attempt_id:r.attempt_id,
    candidate_commit_sha:r.candidate_commit_sha,
    artifact_sha256:r.candidate_artifact_sha256,
    expected_parent_sha:r.expected_parent_commit_sha,
    intent:RECOVERY_INTENT,request_id:crypto.randomUUID()
   })
  });
  const d=await response.json().catch(()=>null);
  if(response.status===202&&d?.status==='ACCEPTED'&&
    d.recovery_publication_id===r.recovery_publication_id&&
    d.original_work_id===r.original_work_id&&
    d.approval_recorded===true&&UUID.test(d.approval_id||'')&&
    d.no_third_confirmation===true&&d.original_job_completed===false){
   status.textContent='Exact one-use recovery approved. Reality will publish the same verified original repair and independently verify the original job. The receipt is not complete yet.';
  }else if(response.status===409&&
      d?.status==='EXACT_RECOVERY_APPROVAL_NOT_RECORDED'&&
      d.recovery_publication_id===r.recovery_publication_id&&
      d.approval_recorded===false&&d.original_job_completed===false&&
      d.production_changed===false){
   status.textContent='Reality verified that this recovery approval was NOT recorded. No installation was authorized. Reopen the current Chat preview and review the exact decision again; this page will not retry automatically.';
  }else{
   status.textContent='Recovery approval readback is uncertain. Inspect the saved owner receipt; do not approve again.';
  }
 }catch{
  status.textContent='Recovery approval transport is uncertain. Do not send another approval.';
 }finally{recovering=false;activeRecovery=null;refresh();}
}
function actionable(d){
 return safe(d)&&d.owner_approval_action_available===true&&
  d.owner_approval_ready===true&&
  d.phase==='READY_FOR_EXACT_OWNER_APPROVAL'&&
  d.isolated_github_write_verified===true&&
  d.preview_auto_deploy_verified===true&&
  d.same_original_execution_and_settlement_contract_verified===true&&
  d.installation_authorized===false&&
  d.original_job_completed===false&&
  d.approval_receipt_id===null&&
  d.approval_action_endpoint===APPROVE_API;
}
async function approveExactFromUserClick(){
 // Only this physical owner button press can POST. Never from an effect,
 // page reload, chat message, automatic wake or a model completion.
 if(!activeCard||!actionable(activeCard)||submitting||submitted)return;
 submitting=true;submitted=true;
 const card=activeCard;
 const btn=get('generalizedOriginalInstallApproveExactButton');
 if(btn){btn.disabled=true;btn.hidden=true;}
 const status=get('generalizedOriginalInstallApprovalResult');
 status.textContent='Recording one exact owner approval; no second click is needed.';
 try{
  const response=await fetch(APPROVE_API,{
   method:'POST',cache:'no-store',credentials:'same-origin',
   headers:{'content-type':'application/json',accept:'application/json'},
   body:JSON.stringify({
    original_work_id:card.original_work_id,
    attempt_id:card.attempt_id,
    candidate_commit_sha:card.candidate_commit_sha,
    artifact_sha256:card.candidate_artifact_sha256,
    intent:INTENT,request_id:crypto.randomUUID()
   })
  });
  const r=await response.json().catch(()=>null);
  if(response.status===202&&r?.status==='ACCEPTED'&&
     r.original_work_id===card.original_work_id&&
     r.approval_recorded===true&&UUID.test(r.approval_id||'')&&
     r.no_third_confirmation===true&&r.original_job_completed===false){
   status.textContent='Exact approval recorded. Reality has queued the governed installation/verification continuation. Check the live receipt before treating the repair or job as completed.';
  }else{
   status.textContent='The approval result is not independently confirmed. Check Reality’s owner ledger; do not send another approval.';
  }
 }catch{
  status.textContent='Approval transport result is unknown. Refresh and inspect the owner receipt before any further action.';
 }finally{submitting=false;activeCard=null;refresh();}
}
async function refresh(){
 if(busy)return;const p=panel();if(!p)return;
 busy=true;
 try{
  const response=await fetch(API,{method:'GET',cache:'no-store',
   credentials:'same-origin',headers:{accept:'application/json'}});
  if(response.status===401){p.hidden=true;return;}
  const d=await response.json().catch(()=>null);
  if(response.ok&&d?.status==='NO_CURRENT_VERIFIED_ORIGINAL_INSTALL_REVIEW'){
   p.hidden=true;return;
  }
  if(!response.ok||!safe(d)){
   const btn=get('generalizedOriginalInstallApproveExactButton');
   if(btn)btn.hidden=true;activeCard=null;
   const rb=get('generalizedOriginalRecoveryApproveButton');
   if(rb)rb.hidden=true;activeRecovery=null;
   p.hidden=false;
   get('generalizedOriginalInstallReviewStatus').textContent=
    'Current original installation review is unavailable or not independently verified.';
   get('generalizedOriginalInstallReviewArtifact').textContent='';
   get('generalizedOriginalInstallRecoveryUpdate').textContent='';
   get('generalizedOriginalInstallReviewGates').textContent='';
   get('generalizedOriginalInstallReviewEvidence').replaceChildren();
   return;
  }
  p.hidden=false;
  const approvalButton=get('generalizedOriginalInstallApproveExactButton');
  const canApprove=actionable(d)&&!submitted&&!submitting;
  approvalButton.hidden=!canApprove;approvalButton.disabled=!canApprove;
  activeCard=canApprove?d:null;
  const canRecover=actionableRecovery(d)&&!recovering&&!recoverySubmitted;
  const recoverButton=get('generalizedOriginalRecoveryApproveButton');
  recoverButton.hidden=!canRecover;recoverButton.disabled=!canRecover;
  activeRecovery=canRecover?d.recovery_publication:null;
  const signedChat=d.source_family==='SIGNED_CHAT_DEVELOPMENT_RECOVERY';
  const issue=signedChat?d.original_work_id:'Original job #'+d.source_ref.split('/').at(-1);
  const originalLabel=signedChat?'Signed Chat original '+issue:issue;
  const completed=d.phase==='ORIGINAL_SETTLED'&&
   d.original_job_completed===true&&
   UUID.test(d.final_receipt_id||'')&&
   SHA.test(d.installed_commit_sha||'')&&
   d.roi_status==='NOT_MEASURED';
  p.querySelector('h4').textContent=completed?
    'Reality · original job completed':
    d.phase==='READY_FOR_EXACT_OWNER_APPROVAL'?
    'Reality · your decision is needed':'Reality · original repair progress';
  get('generalizedOriginalInstallReviewStatus').textContent=completed?
   originalLabel+' · independently verified · final receipt saved':
   originalLabel+' · '+d.phase.replaceAll('_',' ')+
    (d.original_job_completed?' · independently settled':
     ' · original job remains open');
  get('generalizedOriginalInstallReviewArtifact').textContent=
    'Exact independently tested source '+d.candidate_commit_sha.slice(0,12)+
    ' · artifact '+d.candidate_artifact_sha256.slice(0,20)+'…';
  const investigation=d.recovery_diagnosis;
  const hasDiagnosis=investigation?.status===
    'FENCED_ORIGINAL_RILEY_DIAGNOSIS_PERSISTED_TEST_REQUIRED'&&
   investigation.independently_tested===false&&
   investigation.external_retry_authorized===false&&
   typeof investigation.repair_proposal==='string'&&
   investigation.repair_proposal.length<=2500;
  const recovery=d.recovery_publication;
  const reviewReady=actionableRecovery(d);
  const recoveryApproved=recovery?.phase==='OWNER_APPROVED'||
    recovery?.phase==='RECOVERY_WRITE_FENCED';
  get('generalizedOriginalInstallRecoveryUpdate').textContent=
    completed?
     (signedChat?'Reality independently accepted this original in the isolated preview. Production remains unchanged. Verified installed commit: ':'Reality completed the original customer job. Verified installed commit: ')+
     d.installed_commit_sha+'. Final receipt: '+d.final_receipt_id+
     '. ROI: NOT MEASURED (no verified human time or cost baseline yet). No additional approval is needed.':
    reviewReady?
     'Reality · An independently tested recovery is ready for your exact decision. This is ONE additional isolated source write because the first approval was already consumed. Same original '+recovery.original_work_id+' · branch '+recovery.target_branch+' · source artifact '+recovery.candidate_artifact_sha256+' · independent recovery tests #'+recovery.independent_recovery_test_run_id+'. The original shift and customer job stay unchanged.':
    recoveryApproved?
     'Reality · Your new exact recovery approval was recorded. The worker is checking GitHub publication and the original-job settlement. Neither installation nor job completion is claimed until separately verified.':
    hasDiagnosis?
     'Reality · Riley investigated the stalled installation and recorded a source-backed repair hypothesis. '+investigation.repair_proposal.slice(0,700)+
     ' Independent repair testing is required; the first one-use approval cannot be replayed.':
    d.phase==='INSTALL_INTENT_FENCED'?
     'Reality has recorded your original approval. The installation remains fenced; source installation and job completion are not yet verified.':'';
  const gates=[
   ['GitHub write transport',d.isolated_github_write_verified],
   ['Automatic isolated preview deployment',d.preview_auto_deploy_verified],
   ['Original-job continuation and receipt pathway contract',d.same_original_execution_and_settlement_contract_verified]
  ];
  get('generalizedOriginalInstallReviewGates').textContent=
   gates.map(([name,ok])=>(ok?'Verified: ':'Not yet independently verified: ')+name).join(' · ')+
   (actionableRecovery(d)?
    ' · A separate one-use recovery approval is now needed because the first installation fence was consumed':
    d.phase==='READY_FOR_EXACT_OWNER_APPROVAL'&&d.owner_approval_ready?
    ' · Ready for exact owner decision through Reality governance':
    ' · No additional installation authorization currently available');
  const links=get('generalizedOriginalInstallReviewEvidence');
  links.replaceChildren();
  if(signedChat)add('span',links,'Original source: authenticated saved Chat · '+d.original_work_id+' · ');
  else evidenceLink(links,'Original source',d.source_ref);
  evidenceLink(links,'Frozen candidate tests',
   'https://github.com/maloney2323/Reality/actions/runs/'+d.independent_frozen_run_id);
  evidenceLink(links,'Integration tests',
   'https://github.com/maloney2323/Reality/actions/runs/'+d.integrated_test_run_id);
  if(completed)
   evidenceLink(links,'Installed source commit',
    'https://github.com/maloney2323/Reality/commit/'+d.installed_commit_sha);
  // Keep the existing conversation position except when the original job
  // changes phase. Then reveal the beginning of this short, source-backed
  // Reality update inside its own mobile scroller (not a floating overlay).
  if(lastVisiblePhase!==d.phase){
   const technical=get('generalizedOriginalInstallTechnicalDetails');
   if(technical)technical.open=!!(canApprove||canRecover);
   lastVisiblePhase=d.phase;
   if(completed||d.phase==='OWNER_APPROVED'||
       d.phase==='INSTALL_INTENT_FENCED'){
    requestAnimationFrame(()=>{
     const thread=get('privateTranscript');
     if(!thread?.contains(p))return;
     const top=p.getBoundingClientRect().top-
      thread.getBoundingClientRect().top+thread.scrollTop;
     thread.scrollTop=Math.max(0,top-8);
    });
   }
  }
 }catch{if(p){p.hidden=false;get('generalizedOriginalInstallReviewStatus').textContent=
   'Owner verification readback unavailable; no installation approved.';}}
 finally{busy=false;}
}
if(document.readyState==='loading')
 document.addEventListener('DOMContentLoaded',refresh,{once:true});
else refresh();
// Sign-in and saved transcript restoration are additional read-only refresh
// signals. They cannot issue an approval or restart any worker/job.
window.addEventListener('reality:saved-chat-readback',()=>refresh());
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
document.addEventListener('click',e=>{
 if(e.target?.closest?.('#realityChatTabProof,#realityChatPanelProof,#chatNavLink'))refresh();
});
window.addEventListener('reality:chat-work-opened',()=>{if(!document.hidden)refresh()});
