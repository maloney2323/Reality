// Exactly ONE owner-facing native #263 upgrade-approval control.
// Never interpret chat text, model responses, or passive refresh as consent.
const API='/api/reality/native263-owner-install-approval';
const WORK='work:873a6e74fd14c6beacc9042dd8021dfc';
const SHIFT='9460cfff-937a-4105-9093-2e41ab39a950';
const HASH='sha256:459e2bbe9a9d9c7037c87542a9cdbebf06f77a6d368d72769c79fdbef7947f48';
const SOURCE='e44ee294f21c73803a2bcdb5a9cb487f0f80fc85';
const element=id=>document.getElementById(id);
let exact=null,submitted=false,inFlight=false;
function safeCard(data){
 return data?.ok===true&&
  data.status==='EXACT_OWNER_NATIVE263_INSTALLATION_APPROVAL_CARD'&&
  data.original_work_id===WORK&&data.shift_id===SHIFT&&
  data.artifact_sha256===HASH&&data.candidate_commit_sha===SOURCE&&
  data.source_ref==='https://github.com/maloney2323/Reality/issues/263'&&
  data.target_branch==='reality/isolated-openai-governance-gateway-20261108'&&
  data.production_changed===false&&
  typeof data.owner_approval_ready==='boolean';
}
export async function refreshExactNative263InstallApproval(){
 if(submitted||inFlight||!element('chat')||element('chat').hidden)return;
 inFlight=true;
 const panel=element('native263InstallApprovalPanel');
 const button=element('native263ApproveInstall');
 if(!panel||!button){inFlight=false;return}
 button.disabled=true;
 try{
  const response=await fetch(API,{credentials:'same-origin',cache:'no-store',
   signal:AbortSignal.timeout(13000)});
  const data=await response.json().catch(()=>null);
  if(!response.ok||!safeCard(data))throw Error('READBACK_NOT_VERIFIED');
  exact=data;
  panel.hidden=false;
  element('native263ArtifactDetails').textContent=
   'Original '+WORK+' · Tested commit '+SOURCE+' · Artifact SHA-256 '+HASH;
  if(data.approval_state!=='STAGED_UNAPPROVED'){
   submitted=true;
   button.textContent='Already approved · Reality continuing';
   element('native263ApprovalExplanation').textContent=
    'The exact approval has been recorded once. The existing worker owns installation and original-job continuation. No third confirmation.';
  }else if(data.owner_approval_ready===true&&
   data.source_write_verified===true&&
   data.automatic_preview_deploy_verified===true&&
   data.same_original_continuation_and_receipt_verified===true&&
   data.installation_authorized===false&&
   data.original_job_completed===false){
   button.disabled=false;
   button.textContent='Approve verified upgrade';
   element('native263ApprovalExplanation').textContent=
    'One approval installs this exact tested repair in isolated preview and automatically resumes the same job. No separate Resume button.';
  }else{
   button.textContent='Approval gated · Verification incomplete';
   element('native263ApprovalExplanation').textContent=
    'GitHub source writing and Vercel automatic preview deployment are proven. Same-original continuation and independent final receipt still need verification. No approval or installation is authorized.';
  }
 }catch{
  exact=null;panel.hidden=false;button.disabled=true;
  element('native263ApprovalExplanation').textContent=
   'Owner approval evidence could not be verified. Installation remains blocked; do not repeat an uncertain approval.';
 }finally{inFlight=false}
}
async function approveExactlyOnce(){
 const button=element('native263ApproveInstall');
 if(submitted||inFlight||!exact||!safeCard(exact)||
  exact.owner_approval_ready!==true||
  exact.same_original_continuation_and_receipt_verified!==true||
  exact.original_job_completed!==false)return;
 submitted=true;button.disabled=true;inFlight=true;
 element('native263ApprovalFeedback').textContent=
  'Recording one exact owner approval…';
 try{
  const response=await fetch(API,{
   method:'POST',credentials:'same-origin',cache:'no-store',
   headers:{'content-type':'application/json'},
   body:JSON.stringify({
    original_work_id:WORK,artifact_sha256:HASH,
    intent:'OWNER_APPROVE_NATIVE263_FROZEN_PREVIEW_INSTALL',
    confirmation:'APPROVE EXACT TESTED ISSUE 263 INSTALLATION IN ISOLATED PREVIEW',
    request_id:crypto.randomUUID()}),
   signal:AbortSignal.timeout(24000)});
  const d=await response.json().catch(()=>null);
  if(!response.ok||d?.ok!==true||
   d.original_work_id!==WORK||d.shift_id!==SHIFT||
   d.production_changed!==false||d.retry_owner_approval!==false||
   !['OWNER_APPROVED_EXACT_NATIVE263_INSTALL_AUTO_CONTINUATION',
     'NATIVE263_EXACT_OWNER_APPROVAL_ALREADY_RECORDED_NO_REAPPROVE'].includes(d.status))
    throw Error('APPROVAL_NOT_CONFIRMED');
  button.textContent='Approved once · Reality continuing';
  element('native263ApprovalFeedback').textContent=
   'Exact approval recorded. Reality automatically installs, verifies deployment and resumes original #263. Final completion requires an independent receipt.';
 }catch{
  element('native263ApprovalFeedback').textContent=
   'Approval outcome uncertain: refresh the owner ledger before any further action. Do not click approval again.';
 }finally{inFlight=false}
}
export function mountNative263ExactInstallApproval(){
 const panel=element('native263InstallApprovalPanel');
 const button=element('native263ApproveInstall');
 if(!panel||!button)return;
 button.addEventListener('click',()=>{void approveExactlyOnce()});
 element('refresh')?.addEventListener('click',()=>{
  if(!submitted)void refreshExactNative263InstallApproval();
 });
 const chat=element('chat');
 if(chat)new MutationObserver(()=>{
  if(!chat.hidden&&!submitted)void refreshExactNative263InstallApproval();
  if(chat.hidden){panel.hidden=true;exact=null}
 }).observe(chat,{attributes:true,attributeFilter:['hidden']});
 if(chat&&!chat.hidden)void refreshExactNative263InstallApproval();
}
if(typeof document!=='undefined')mountNative263ExactInstallApproval();
