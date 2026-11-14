// Owner-facing, read-only job explanation plus the existing single exact
// #263 approval action. Never infer consent from text, viewing or refresh.
const API='/api/reality/native263-owner-install-approval';
const WORK='work:873a6e74fd14c6beacc9042dd8021dfc';
const SHIFT='9460cfff-937a-4105-9093-2e41ab39a950';
const HASH='sha256:459e2bbe9a9d9c7037c87542a9cdbebf06f77a6d368d72769c79fdbef7947f48';
const SOURCE='e44ee294f21c73803a2bcdb5a9cb487f0f80fc85';
const element=id=>document.getElementById(id);
let exact=null,submitted=false,inFlight=false;

function safeCard(d){
 return d?.ok===true&&
  d.status==='EXACT_OWNER_NATIVE263_INSTALLATION_APPROVAL_CARD'&&
  d.original_work_id===WORK&&d.shift_id===SHIFT&&
  d.artifact_sha256===HASH&&d.candidate_commit_sha===SOURCE&&
  d.source_ref==='https://github.com/maloney2323/Reality/issues/263'&&
  d.target_branch==='reality/isolated-openai-governance-gateway-20261108'&&
  d.production_changed===false&&
  typeof d.owner_approval_ready==='boolean'&&
  typeof d.original_job_completed==='boolean'&&
  (d.original_job_completed===false||
   /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(d.independently_verified_final_original_receipt_id||''));
}
function host(){
 // On /chat the existing workspace owns the full-height conversation and
 // work inspector. Put the long receipt in its Proof panel, never before
 // the message thread, composer or page navigation.
 return element('realityChatPanelProof')||element('chat')||element('privateReady');
}
function visible(){
 const ready=element('privateReady');
 if(ready)return ready.style.display==='block';
 const simple=element('chat');
 return !!simple&&!simple.hidden;
}
function add(tag,id,value,parent){
 const n=document.createElement(tag);
 if(id)n.id=id;
 if(value)n.textContent=value;
 parent.append(n);
 return n;
}
function ensurePanel(){
 const h=host();
 if(!h)return null;
 let p=element('native263InstallApprovalPanel');
 if(!p){
  p=add('section','native263InstallApprovalPanel','',document.createDocumentFragment());
  p.setAttribute('aria-label','Reality current job #263 and owner decision');
  p.setAttribute('aria-live','polite');
  p.className='team-proof';
  p.hidden=true;
  add('h4',null,'Job #263 · Riley + Taylor',p);
  add('p','native263ApprovalExplanation','Checking the recorded job state…',p);
  add('p','native263ArtifactDetails','',p);
  const b=add('button','native263ApproveInstall','Approve verified upgrade',p);
  b.type='button';b.disabled=true;
  add('p','native263ApprovalFeedback','',p).setAttribute('role','status');
  h.append(p);
 }
 // If the workspace finished mounting after the module, relocate the
 // same original panel to the proof tab; never duplicate any decision UI.
 const proof=element('realityChatPanelProof');
 if(proof&&p.parentNode!==proof)proof.append(p);
 if(!element('native263OwnerSummary')){
  const summary=add('p','native263OwnerSummary','Verifying the current work…',document.createDocumentFragment());
  summary.style.fontWeight='750';
  summary.style.fontSize='16px';
  p.insertBefore(summary,element('native263ApprovalExplanation'));
 }
 if(!element('native263OpeningMessage')){
  const opening=add('section','native263OpeningMessage','',document.createDocumentFragment());
  opening.hidden=true;
  opening.setAttribute('role','status');
  opening.setAttribute('aria-label','Reality verified opening response');
  opening.style.cssText='background:#153548;border:1px solid #6ba6b3;border-radius:12px;padding:14px;margin:12px 0';
  const heading=add('strong',null,'Reality · I completed an original job',opening);
  heading.style.cssText='display:block;margin-bottom:8px;font-size:15px;color:#e6f6ff';
  const body=add('p','native263OpeningText','',opening);
  body.style.cssText='white-space:pre-wrap;font-size:14px;line-height:1.6;margin:0';
  p.insertBefore(opening,element('native263ApprovalExplanation'));
 }
 if(!element('native263ProgressRows')){
  const rows=add('div','native263ProgressRows','',document.createDocumentFragment());
  rows.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:9px;margin:12px 0';
  for(const [id,title] of [
   ['native263Completed','Past · How we got here'],
   ['native263Now','Present · Verified right now'],
   ['native263Next','Operational future · What follows'],
   ['native263OwnerAction','Do you need to do anything?']
  ]){
   const box=add('div',null,'',rows);
   box.style.cssText='padding:12px;background:#15283a;border:1px solid #3c5a75;border-radius:10px';
   const label=add('strong',null,title,box);
   label.style.cssText='display:block;margin-bottom:7px;color:#eff7ff;font-size:13px';
   const value=add('p',id,'Reading evidence…',box);
   value.style.cssText='font-size:13px;line-height:1.5;margin:0;color:#d6e5f4';
  }
  p.insertBefore(rows,element('native263ArtifactDetails'));
 }
 if(!element('native263EvidenceDisclosure')){
  const disclosure=add('details','native263EvidenceDisclosure','',document.createDocumentFragment());
  add('summary',null,'Technical evidence · original job and tested artifact',disclosure);
  disclosure.append(element('native263ArtifactDetails'));
  p.insertBefore(disclosure,element('native263ApproveInstall'));
 }
 if(!element('native263AskAboutJob')){
  const ask=add('button','native263AskAboutJob','Ask Reality about this job',document.createDocumentFragment());
  ask.type='button';
  ask.style.cssText='margin:8px 8px 8px 0;border:1px solid #8aa6c7;background:#203b55;color:#f3f8ff';
  ask.setAttribute('aria-label','Ask Reality a question about original job 263');
  p.insertBefore(ask,element('native263ApproveInstall'));
 }
 if(!element('native263ProgressStyles')){
  const css=add('style','native263ProgressStyles','',document.head);
  css.textContent='#native263InstallApprovalPanel{margin:12px 0;padding:16px;border:1px solid #7496b8;border-radius:14px;background:#102437;color:#e4f0fa;line-height:1.5}'+
   '#native263InstallApprovalPanel h4{margin:0 0 8px;color:#fff;font-size:17px}'+
   '#native263InstallApprovalPanel>p{font-size:13px;line-height:1.5}'+
   '#native263InstallApprovalPanel details{font-size:12px;overflow-wrap:anywhere;margin:12px 0}'+
   '#native263InstallApprovalPanel button{background:#d2efff;color:#102838;border-radius:10px;min-height:46px;padding:10px 14px;font-size:15px;font-weight:750}'+
   '#native263InstallApprovalPanel [hidden]{display:none!important}';
 }
 return p;
}
function renderInfo({summary,description,done,now,next,owner,button}){
 const panel=ensurePanel();
 if(!panel)return;
 panel.hidden=false;
 element('native263OwnerSummary').textContent=summary;
 element('native263ApprovalExplanation').textContent=description;
 element('native263Completed').textContent=done;
 element('native263Now').textContent=now;
 element('native263Next').textContent=next;
 element('native263OwnerAction').textContent=owner;
 const b=element('native263ApproveInstall');
 b.hidden=!button;b.disabled=!button||submitted;
}
function renderProactiveOpening(d){
 const view=element('native263OpeningMessage');
 const text=element('native263OpeningText');
 if(!view||!text)return;
 const receipt=d?.independently_verified_final_original_receipt_id;
 const message=d?.opening_message;
 if(d?.original_job_completed!==true||
  !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(receipt||'')||
  typeof message!=='string'||message.length>2200||
  !message.includes(receipt)||!message.startsWith('Reality · Verified work completed.')){
  view.hidden=true;
  text.textContent='';
  element('native263AskAboutJob').textContent='Ask Reality about this job';
  return;
 }
 // The same first response appears in the signed-in conversation, so the
 // technical inspector must not repeat an entire screenful above the receipt.
 const conversation=element('realityChatConversation');
 view.hidden=!!conversation;
 text.textContent=conversation?'':message;
 element('native263AskAboutJob').textContent='Reply to Reality';
 // Show the verified initial briefing as a Reality message before any
 // user prompt. This view is read-only; no model call, fake chat-history row,
 // job start or second owner approval is created by page load.
 const transcript=element('privateTranscript');
 if(transcript&&element('privateReady')?.style.display!=='none'){
  let node=element('native263VerifiedRealityIntro');
  if(!node){
   node=add('div','native263VerifiedRealityIntro','',document.createDocumentFragment());
   node.className='bubble';
   const head=add('div',null,'REALITY · VERIFIED COMPLETION',node);
   head.className='label';
   add('div','native263VerifiedRealityIntroBody','',node).style.whiteSpace='pre-wrap';
   const receiptButton=add('button','native263ViewReceipt','View verified receipt',node);
   receiptButton.type='button';
   receiptButton.style.cssText='display:block;margin-top:12px;min-height:40px;border:1px solid #709cb2;border-radius:10px;background:#1a4156;color:#e8f8ff;padding:9px 13px;font-weight:700';
   receiptButton.addEventListener('click',()=>{
    const work=element('realityChatOpenInspector');
    if(work){
     if(document.body.dataset.realityChatPanel!=='work')work.click();
     element('realityChatTabProof')?.click();
     element('realityChatInspector')?.scrollTo?.({top:0,behavior:'auto'});
    }else{
     element('native263InstallApprovalPanel')?.scrollIntoView({block:'nearest',behavior:'smooth'});
    }
   });
   transcript.prepend(node);
  }
  element('native263VerifiedRealityIntroBody').textContent=message;
 }
}
function renderExact(d){
 const state=d.approval_state;
 const data=d;
 const ready=data.owner_approval_ready===true&&
  d.source_write_verified===true&&
  d.automatic_preview_deploy_verified===true&&
  d.same_original_continuation_and_receipt_verified===true&&
  d.installation_authorized===false&&d.original_job_completed===false;
 element('native263ArtifactDetails').textContent=
  'Original '+WORK+' · Tested source '+SOURCE+
  ' · Frozen artifact SHA-256 '+HASH+
  ' · Isolated preview only. Source issue: github.com/maloney2323/Reality/issues/263';
 if(d.original_job_completed===true){
  submitted=true;
  renderProactiveOpening(d);
  renderInfo({
   summary:'Job #263 · Independently completed',
   description:'The original-job ledger reports completion. This is not a claim of measured cost savings.',
   done:'The original Riley + Taylor job was authorized, the frozen repair independently tested, and your one exact installation approval recorded. Reality installed the repair in its isolated preview.',
   now:'Original job #263 is independently settled. Final receipt: '+d.independently_verified_final_original_receipt_id+'. Independent completion is verified; actual labor or cash savings are not yet measured.',
   next:'This original job is complete. Reality can explain the evidence and consider other work only under separately verified authority. No outcome for future jobs is assumed.',
   owner:'No further approval or start is required.',button:false
  });
 }else if(state==='SOURCE_INSTALLED'){
  renderProactiveOpening(null);
  submitted=true;
  renderInfo({
   summary:'Job #263 · Installed, final receipt pending',
   description:'Your one installation approval was recorded and the repair is installed in the isolated branch. Installation is not the same as a completed original job.',
   done:'Verified candidate, your one approval, and source installation.',
   now:'Reality must verify the exact deployed repair and independent original-job acceptance checks before it can record a final receipt.',
   next:'Independently verify the installed commit, finish the same original job and record its final receipt. Any blocker must be shown explicitly.',
   owner:'Nothing to approve or restart. Your approval is already recorded.',button:false
  });
 }else if(state!=='STAGED_UNAPPROVED'){
  renderProactiveOpening(null);
  submitted=true;
  renderInfo({
   summary:'Job #263 · Approved, awaiting installation proof',
   description:'An exact owner approval is recorded; the installation result has not yet been independently confirmed.',
   done:'The repair candidate was tested and the owner decision recorded.',
   now:'The authorized worker is responsible for the one-time installation and independent readback.',
   next:'Confirm the exact installed commit, acceptance tests and final receipt.',
   owner:'Do not approve twice or start another shift.',button:false
  });
 }else if(ready){
  renderProactiveOpening(null);
  renderInfo({
   summary:'Job #263 · Ready for your installation decision',
   description:'The repair was tested and the installation-to-receipt pathway was checked. No source installation has been authorized yet.',
   done:'Original job identified, fix independently tested, guarded installation and continuation path verified.',
   now:'Reality is waiting for your one exact installation approval.',
   next:'Once approved, Reality installs in isolation, verifies the same job and attempts to record a final receipt automatically.',
   owner:'Review the tested artifact, then choose “Approve verified upgrade” once if you want to install it.',button:true
  });
 }else{
  renderProactiveOpening(null);
  renderInfo({
   summary:'Job #263 · Verification gate still closed',
   description:'The current owner readback does not authorize installation. A tested candidate is not the same as installation readiness.',
   done:'The candidate exists, but all release conditions have not been independently confirmed.',
   now:'Reality must verify its missing installation or continuation evidence.',
   next:'Show the specific failed check, then present the one approval only if the gate passes.',
   owner:'No approval is available. Do not start another shift.',button:false
  });
 }
}
export async function refreshExactNative263InstallApproval(){
 if(inFlight||!visible())return;
 const panel=ensurePanel();
 if(!panel)return;
 inFlight=true;
 try{
  const response=await fetch(API,{credentials:'same-origin',cache:'no-store',
   signal:AbortSignal.timeout(13000)});
  const data=await response.json().catch(()=>null);
  if(response.status===401){
   exact=null;
   renderProactiveOpening(null);
   renderInfo({
    summary:'Job #263 · Sign in to hear Reality’s update',
    description:'This original-job receipt belongs to your private account. Sign in to let Reality verify and explain its completed work automatically.',
    done:'Account-owner verification is required before private evidence can be displayed.',
    now:'Reality is protecting the owner-scoped final receipt. No new job is required.',
    next:'Sign in through the existing Reality Chat account form below. The verified opening will appear automatically.',
    owner:'Sign in only. Do not restart or reapprove the job.',button:false
   });
   element('native263AskAboutJob').textContent='Go to sign in';
   return;
  }
  if(response.status===403){
   exact=null;renderProactiveOpening(null);
   renderInfo({
    summary:'Job #263 · Owner account required',
    description:'This account is not authorized to read the original job #263. No receipt has been disclosed.',
    done:'The original job is retained in its owner-scoped ledger.',
    now:'Account ownership has not been verified for this session.',
    next:'Sign in to the account that originally authorized the job.',
    owner:'Do not start another job to resolve an account mismatch.',button:false
   });
   element('native263AskAboutJob').textContent='Check account sign-in';
   return;
  }
  if(!response.ok||!safeCard(data))throw Error('OWNER_READBACK_UNVERIFIED');
  exact=data;renderExact(data);
 }catch{
  exact=null;
  renderProactiveOpening(null);
  renderInfo({
   summary:'Job #263 · Live status unavailable',
   description:'Reality cannot verify the latest owner-scoped job record right now. This is a connection or proof problem, not proof that the job failed or finished.',
   done:'No current event can be confirmed from this screen.',
   now:'Waiting for authenticated provider readback.',
   next:'Retry the read-only status check after your session is connected.',
   owner:'Do not reapprove or restart based on an unavailable readback.',button:false
  });
 }finally{inFlight=false}
}
async function approveExactlyOnce(){
 const button=element('native263ApproveInstall');
 if(submitted||inFlight||!exact||!safeCard(exact)||
  exact.approval_state!=='STAGED_UNAPPROVED'||
  exact.owner_approval_ready!==true||
  exact.source_write_verified!==true||
  exact.automatic_preview_deploy_verified!==true||
  exact.same_original_continuation_and_receipt_verified!==true||
  exact.installation_authorized!==false||
  exact.original_job_completed!==false)return;
 submitted=true;button.disabled=true;inFlight=true;
 element('native263ApprovalFeedback').textContent='Recording one exact owner decision…';
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
  element('native263ApprovalFeedback').textContent=
   'Approval recorded once. The existing worker installs and verifies the same original job automatically. The final receipt is not yet guaranteed.';
 }catch{
  element('native263ApprovalFeedback').textContent=
   'Approval result is uncertain. Reality must read its ledger before any other action. Do not click a second time.';
 }finally{
  inFlight=false;
  void refreshExactNative263InstallApproval();
 }
}
export function mountNative263ExactInstallApproval(){
 const panel=ensurePanel();
 if(!panel)return;
 const button=element('native263ApproveInstall');
 button.addEventListener('click',()=>{void approveExactlyOnce()});
 // The main conversation restores its saved messages asynchronously. Retain
 // the already-verified opening after a transcript redraw, without posting
 // a synthetic assistant message into the stored conversation.
 const transcript=element('privateTranscript');
 if(transcript){
  new MutationObserver(()=>{
   if(exact?.original_job_completed===true &&
      element('privateReady')?.style.display!=='none' &&
      !element('native263VerifiedRealityIntro'))
    renderProactiveOpening(exact);
  }).observe(transcript,{childList:true});
 }
 const ask=element('native263AskAboutJob');
 if(ask)ask.addEventListener('click',()=>{
  // Missing account evidence is not grounds for an AI response or new action.
  if(!exact){
   const login=element('privateLogin');
   const retry=element('privateRetrySession');
   if(login&&login.style.display!=='none'){
    login.scrollIntoView({block:'center',behavior:'smooth'});
    element('privateEmail')?.focus({preventScroll:false});
   }else if(retry&&!retry.hidden){
    retry.scrollIntoView({block:'center',behavior:'smooth'});
    retry.focus({preventScroll:false});
   }else{
    element('native263ApprovalFeedback').textContent=
     'Reality cannot verify this owner session yet. Use the account sign-in control below; no job needs to restart.';
   }
   return;
  }
  // This is a draft question, not an automatic model call or authorization.
  // Use Reality's own existing chat composer, preserving signed-in session.
  const prompt=element('privatePrompt')||element('prompt');
  const isSimple=!!element('prompt')&&!element('privatePrompt');
  if(!prompt){
   element('native263ApprovalFeedback').textContent=
    'Reality Chat is unavailable in this view. Sign in and open Chat to ask a question.';
   return;
  }
  if(isSimple)element('rileyConversationDisclosure')?.setAttribute('open','');
  if(exact?.original_job_completed===true){
   // Close the mobile Work inspector before focusing the actual composer.
   if(document.body.dataset.realityChatPanel==='work')
    element('realityChatOpenInspector')?.click();
   const composer=element('realityChatComposer')||prompt;
   element('native263ApprovalFeedback').textContent=
    'Reality has opened with its verified result above. Type your next question in the conversation below. No new work or approval was started.';
   composer.scrollIntoView({block:'center',behavior:'smooth'});
   prompt.focus({preventScroll:false});
   return;
  }
  const phase=exact?.original_job_completed===true?'settled':
   exact?.approval_state==='SOURCE_INSTALLED'?'installed_receipt_pending':
   exact?.approval_state==='STAGED_UNAPPROVED'?'awaiting_install_decision':
   'status_unverified';
  const topic=phase==='settled'
   ?'Explain what original job #263 independently completed and walk through its Past, Present and operational Future. Include its exact final receipt ID and independent acceptance evidence; distinguish measured financial value from what is not yet measured.'
   :phase==='installed_receipt_pending'
   ?'Explain why job #263 has been approved and installed but still has no independent final settlement receipt. Which exact checks remain, which have passed, what is blocked, and what happens automatically next?'
   :phase==='awaiting_install_decision'
   ?'Explain the verified #263 repair, its advantages and risks, what approval permits, and what evidence proves the continuation and receipt path. Do not approve anything for me.'
   :'Investigate the latest authenticated evidence for original job #263. What is verified, what is unknown, and what remains to be done? Do not assume a status from Chat text.';
  prompt.value=topic+' Refer to the same owner-scoped original work '+WORK+
   ' and trusted provider/database receipts. This is a question, not execution or install authority.';
  prompt.dispatchEvent(new Event('input',{bubbles:true}));
  prompt.focus({preventScroll:false});
  (element('realityChatComposer')||prompt).scrollIntoView({block:'center',behavior:'smooth'});
  element('native263ApprovalFeedback').textContent=
   'Question prepared in the conversation. Tap Send to Reality when ready; nothing was executed.';
 });
 element('refresh')?.addEventListener('click',()=>{void refreshExactNative263InstallApproval()});
 // The proof panel stays behind a hidden Work tab until requested.
 // Watch the actual authenticated-session container instead, so sign-in
 // triggers the greeting immediately rather than waiting for a poll.
 const sessionHost=element('privateReady')||element('chat')||host();
 if(sessionHost){
  new MutationObserver(()=>{
   if(visible())void refreshExactNative263InstallApproval();
   else panel.hidden=true;
  }).observe(sessionHost,{attributes:true,attributeFilter:['hidden','style']});
 }
 if(visible())void refreshExactNative263InstallApproval();
 window.addEventListener('focus',()=>{void refreshExactNative263InstallApproval()});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refreshExactNative263InstallApproval()});
 setInterval(()=>{if(!document.hidden)void refreshExactNative263InstallApproval()},30000);
}
if(typeof document!=='undefined')mountNative263ExactInstallApproval();
