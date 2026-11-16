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
const INTENT='OWNER_APPROVE_EXACT_INDEPENDENTLY_VERIFIED_ISOLATED_REPAIR';
const get=id=>document.getElementById(id);
const add=(kind,parent,value)=>{const e=document.createElement(kind);
 if(value)e.textContent=value;parent.append(e);return e;};
function panel(){
 const host=get('realityChatPanelProof')||get('chat')||get('privateReady');
 if(!host)return null;
 let p=get('generalizedOriginalInstallReviewPanel');
 if(!p){
  p=add('section',host);p.id='generalizedOriginalInstallReviewPanel';
  p.className='team-proof';p.hidden=true;
  p.setAttribute('aria-live','polite');
  add('h4',p,'Verified original repair · release readiness');
  add('p',p).id='generalizedOriginalInstallReviewStatus';
  add('p',p).id='generalizedOriginalInstallReviewArtifact';
  add('p',p).id='generalizedOriginalInstallReviewGates';
  const links=add('p',p);links.id='generalizedOriginalInstallReviewEvidence';
  const approve=add('button',p,'Approve exact verified upgrade');
  approve.type='button';approve.hidden=true;
  approve.id='generalizedOriginalInstallApproveExactButton';
  approve.addEventListener('click',()=>approveExactFromUserClick());
  add('p',p).id='generalizedOriginalInstallApprovalResult';
  const warning=add('p',p,
   'Reality does not install a repair or settle an original job from a passing model answer or CI check. The exact owner approval must follow independent release-continuation readiness.');
  warning.style.fontSize='13px';
 }
 const proof=get('realityChatPanelProof');
 if(proof&&p.parentNode!==proof)proof.append(p);
 else if(!proof&&p.parentNode===host&&
     host.id==='privateReady'&&
     typeof host.insertBefore==='function'){
  // Current Chat uses the authenticated privateReady container rather than
  // the legacy proof tab. Put exact verified work beside the mission, where
  // the owner can actually see the independent evidence and consent action.
  const banner=get('privateAccountMissionBanner');
  const before=banner?.parentNode===host?banner.nextSibling:host.firstChild;
  if(before!==p)host.insertBefore(p,before||null);
 }
 return p;
}
function safe(d){
 return d?.ok===true&&
  d.status==='GENERALIZED_VERIFIED_ORIGINAL_INSTALL_REVIEW'&&
  WORK.test(d.original_work_id||'')&&
  SOURCE.test(d.source_ref||'')&&
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
   status.textContent='Exact approval recorded. Reality is installing, independently verifying, and continuing the same original job automatically.';
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
   p.hidden=false;
   get('generalizedOriginalInstallReviewStatus').textContent=
    'Current original installation review is unavailable or not independently verified.';
   get('generalizedOriginalInstallReviewArtifact').textContent='';
   get('generalizedOriginalInstallReviewGates').textContent='';
   get('generalizedOriginalInstallReviewEvidence').replaceChildren();
   return;
  }
  p.hidden=false;
  const approvalButton=get('generalizedOriginalInstallApproveExactButton');
  const canApprove=actionable(d)&&!submitted&&!submitting;
  approvalButton.hidden=!canApprove;approvalButton.disabled=!canApprove;
  activeCard=canApprove?d:null;
  const issue=d.source_ref.split('/').at(-1);
  get('generalizedOriginalInstallReviewStatus').textContent=
    'Original job #'+issue+' · '+d.phase.replaceAll('_',' ')+
    (d.original_job_completed?' · independently settled':
     ' · original job remains open');
  get('generalizedOriginalInstallReviewArtifact').textContent=
    'Exact independently tested source '+d.candidate_commit_sha.slice(0,12)+
    ' · artifact '+d.candidate_artifact_sha256.slice(0,20)+'…';
  const gates=[
   ['GitHub write transport',d.isolated_github_write_verified],
   ['Automatic isolated preview deployment',d.preview_auto_deploy_verified],
   ['Original-job continuation and final receipt',d.same_original_execution_and_settlement_contract_verified]
  ];
  get('generalizedOriginalInstallReviewGates').textContent=
   gates.map(([name,ok])=>(ok?'Verified: ':'Not yet independently verified: ')+name).join(' · ')+
   (d.owner_approval_ready?
    ' · Ready for exact owner decision through Reality governance':
    ' · Installation approval is not available');
  const links=get('generalizedOriginalInstallReviewEvidence');
  links.replaceChildren();
  evidenceLink(links,'Original source',d.source_ref);
  evidenceLink(links,'Frozen candidate tests',
   'https://github.com/maloney2323/Reality/actions/runs/'+d.independent_frozen_run_id);
  evidenceLink(links,'Integration tests',
   'https://github.com/maloney2323/Reality/actions/runs/'+d.integrated_test_run_id);
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
setInterval(()=>{if(!document.hidden)refresh()},30000);
