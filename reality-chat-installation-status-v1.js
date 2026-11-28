// Conversation-native, read-only operational milestone for the exact
// owner-approved repair. This does not create saved messages, approval,
 // a shift, an installer call, or a customer-job completion claim.
(()=>{
 if(window.location.pathname!=='/chat')return;
 const ready=document.getElementById('privateReady');
 const transcript=document.getElementById('realityChatPanelProof')||document.getElementById('privateTranscript');
 if(!ready||!transcript)return;
 const SHA=/^[a-f0-9]{40}$/;
 const HASH=/^sha256:[a-f0-9]{64}$/;
 const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
 const REF=/^https:\/\/github\.com\/maloney2323\/Reality\/pull\/([1-9]\d*)$/;
 const signedIn=()=>ready.style.display==='block';
 const card=document.createElement('article');
 card.id='realityChatVerifiedInstallStatus';
 card.className='bubble reality-chat-verified-install-status';
 card.hidden=true;
 card.setAttribute('role','status');
 card.setAttribute('aria-live','polite');
 card.style.cssText='box-sizing:border-box;align-self:flex-start;'+
  'width:min(100%,600px);max-width:100%;margin:8px 0;padding:12px 14px;'+
  'background:#102b40;border:1px solid #397b9b;border-radius:12px;'+
  'color:#e6f5ff;overflow-wrap:anywhere;position:static';
 const headline=document.createElement('strong');
 headline.style.cssText='display:block;margin-bottom:6px;font-size:13px';
 headline.textContent='REALITY · VERIFIED INSTALLATION STATUS';
 const body=document.createElement('p');
 body.style.cssText='font-size:13px;line-height:1.55;margin:0';
 card.append(headline,body);
 let active=false,seenStage='',disposed=false;
 function attach(){
  if(card.hidden||!signedIn())return;
  if(!transcript.contains(card))transcript.append(card);
 }
 function hide(){
  card.hidden=true;
  card.remove();
  seenStage='';
 }
 function acceptReadback(r){
  if(r?.ok!==true||r.status!=='EXACT_SIGNED_OWNER_APPROVAL_RECORDED_READBACK'||
     r.owner_approval_recorded!==true||r.installation_authorized!==true||
     r.retry_owner_approval!==false||r.production_changed!==false||
     r.original_job_completed!==false||!UUID.test(r.shift_id||'')||
     !HASH.test(r.approval_receipt_sha256||''))return null;
  const m=REF.exec(r.source_ref||'');
  if(!m)return null;
  // Only show a milestone the owner-scoped database has actually receipted.
  if(!['INSTALLED','VERIFIED'].includes(r.decision_state)||
     r.repair_installed!==true||!SHA.test(r.installed_commit_sha||''))
   return null;
  if(r.decision_state==='VERIFIED'){
   if(r.postinstall_verified!==true||
      !HASH.test(r.independent_postinstall_receipt_sha256||''))
    return null;
  }else if(r.postinstall_verified!==false||
           r.independent_postinstall_receipt_sha256!==null)
   return null;
  return {number:m[1],state:r.decision_state,commit:r.installed_commit_sha,
   receipt:r.independent_postinstall_receipt_sha256,
   shift:r.shift_id};
 }
 function show(m){
  const stage=m.state+'|'+m.commit+'|'+(m.receipt||'');
  if(stage!==seenStage){
   seenStage=stage;
   body.textContent=m.state==='VERIFIED'?
    'PR #'+m.number+' is installed in Reality’s isolated preview and has a separate independent verification receipt '+m.receipt+
    '. The original customer job still needs its own verified completion.':
    'PR #'+m.number+' was installed in Reality’s isolated preview (commit '+
    m.commit.slice(0,12)+'). Independent post-install verification is still pending. The original job is not yet complete.';
  }
  card.hidden=false;
  attach();
 }
 async function refresh(){
  if(disposed||active||document.visibilityState==='hidden')return;
  if(!signedIn()){hide();return}
  active=true;
  try{
   const response=await fetch('/api/reality/signed-maintenance-exact-install-approval',{
    method:'GET',credentials:'same-origin',cache:'no-store',
    signal:AbortSignal.timeout(22000)
   });
   const result=await response.json().catch(()=>null);
   if(!response.ok)return;
   const proof=acceptReadback(result);
   if(proof)show(proof);
   // An unverified provider result cannot create or advance this card.
   // Keep the last confirmed milestone, which remains explicitly scoped.
  }catch{
   // A timeout is not evidence of a new state; do not invent one.
  }finally{active=false}
 }
 const signObserver=new MutationObserver(()=>{
  if(!signedIn())hide();
  else void refresh();
 });
 signObserver.observe(ready,{attributes:true,attributeFilter:['style']});
 const threadObserver=new MutationObserver(()=>{attach()});
 threadObserver.observe(transcript,{childList:true});
 window.addEventListener('pageshow',()=>{void refresh()});
 document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible')void refresh();
 });
 window.setInterval(()=>{
  if(document.visibilityState==='visible'&&signedIn())void refresh();
 },60000);
 if(signedIn())void refresh();
})();
