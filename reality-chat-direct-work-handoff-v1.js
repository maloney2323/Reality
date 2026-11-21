/* One authenticated, saved Chat turn -> one governed work handoff.
 * This browser is an unreliable transport, never an authorization authority.
 * The server re-reads the exact signed owner message and independently gates
 * each installed adapter. No replay, new shift or production installation.
 */
(() => {
 'use strict';
 if (!/^\/chat\/?$/.test(window.location.pathname)) return;
 const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
 const SOURCE=/^supabase:reality_chat_messages:[a-f0-9-]{36}$/i;
 const WORK=/^work:[a-f0-9]{32}$/;
 const key=(c,r)=>c+':'+r;
 const started=new Map(),processing=new Set();
 // The premium Chat workspace moves the genuine, original composer into
 // its conversation panel. Bind to the ACTUAL parent, not privateReady's
 // former direct-child layout. Require the composer to remain inside the
 // authenticated owner workspace before wiring any signed work action.
 const ready=document.getElementById('privateReady');
 const composer=document.getElementById('realityChatComposer');
 const container=composer?.parentElement||null;
 if(!ready||!composer||!container||!ready.contains(composer))return;
 window.realityChatDirectWorkEnabled=true;
 const panel=document.createElement('section');
 panel.id='realityChatDirectWorkStatus';
 panel.setAttribute('role','status');
 panel.setAttribute('aria-live','polite');
 panel.hidden=true;
 panel.style.cssText='margin:8px 0;padding:12px;border:1px solid #46647c;border-radius:12px;line-height:1.5;font-size:13px';
 const label=document.createElement('strong');
 label.textContent='REALITY · SAVED WORK HANDOFF';
 const description=document.createElement('p');
 description.style.margin='6px 0';
 const actions=document.createElement('div');
 const recoverControls=document.createElement('div');
 recoverControls.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin:8px 0';
 const recoverButton=document.createElement('button');
 recoverButton.type='button';
 recoverButton.textContent='Find my saved build request';
 recoverControls.append(recoverButton);
 const timeline=document.createElement('div');
 timeline.id='realityChatBuildTimeline';
 timeline.style.cssText='padding:8px 0;white-space:pre-line;line-height:1.65;font-size:13px;opacity:0.95';
 panel.append(label,description,recoverControls,actions,timeline);
 panel.hidden=false;
 description.textContent='Chat work status · Check an existing saved build instruction. No new message, shift or installation is created by looking it up.';
 // This is important evidence but NOT a chat bubble or composer control.
 // Keep the original status/actions alive in Work instead of letting another
 // permanent card crowd out typing and scrolling on a phone.
 const workPanel=document.getElementById('realityChatPanelWork');
 if(workPanel)workPanel.append(panel);
 else container.insertBefore(panel,composer);
 const transcript=document.getElementById('privateTranscript');
 // Dismissal only controls this old, already-saved shift handoff notice.
 // It cannot delete ledger evidence, stop the employee shift or affect an
 // exact installation decision. Remember it across a reload of this tab.
 const dismissedShiftNotices=new Set();
 const noticeKey=ref=>'reality:hide-signed-shift-note:'+ref.request_id;
 const isNoticeDismissed=ref=>{
  if(!UUID.test(ref?.request_id||''))return false;
  if(dismissedShiftNotices.has(ref.request_id))return true;
  try{return window.sessionStorage?.getItem(noticeKey(ref))==='1'}
  catch{return false}
 };
 const dismissNotice=ref=>{
  dismissedShiftNotices.add(ref.request_id);
  try{window.sessionStorage?.setItem(noticeKey(ref),'1')}catch{}
 };
 let activeRef=null,activePhase=null,verifiedComplete=false;
 const phaseOrder=['QUEUED','DRAFT_GENERATED','CANDIDATE_STAGED','CI_VERIFIED'];
 const steps=['Saved instruction admitted to original work',
  'AI generated a source-code proposal',
  'Real source committed to isolated GitHub draft PR',
  'Independent source/syntax CI receipt recorded',
  'Functional acceptance, exact installation and final settlement'];
 function inlineWork(ref,message,result=null){
  if(!transcript||!UUID.test(ref?.request_id||'')||
     window.realityActiveConversationId?.()!==ref.conversation_id)
   return null;
  // The dismissed status is never recreated by an async saved-history read.
  if((result?.capability_id==='governed-existing-shift-continuation'||
      result?.status==='CHAT_EXISTING_SHIFT_WAKE_RECEIPT_VERIFIED')&&
     isNoticeDismissed(ref))return null;
  const nodes=Array.from(transcript.children||[]);
  let card=nodes.find(n=>n.dataset?.realityBuildRequest===ref.request_id);
  if(!card){
   card=document.createElement('section');
   card.className='bubble reality-chat-live-work';
   card.dataset.realityBuildRequest=ref.request_id;
   card.setAttribute('role','status');
   card.setAttribute('aria-live','polite');
   card.style.cssText='margin:12px 0;border:1px solid #5284a5;border-radius:14px;padding:15px;max-width:100%;overflow-wrap:anywhere;background:#0d263b';
   const source=nodes.find(n=>n.dataset?.requestId===ref.request_id&&
    n.classList?.contains('user'));
   if(source&&typeof source.after==='function')source.after(card);
   else transcript.append(card);
  }
  card.replaceChildren();
  const head=document.createElement('div');
  head.className='label';head.textContent='REALITY · LIVE GOVERNED WORK';
  const detail=document.createElement('p');
  detail.textContent=String(message||'Reading exact saved work evidence…');
  detail.style.cssText='margin:8px 0;white-space:pre-wrap';
  const timeline=document.createElement('div');
  timeline.style.cssText='display:grid;gap:7px;margin:12px 0;font-size:13px';
  const actions=document.createElement('div');
  actions.style.cssText='display:flex;gap:9px;flex-wrap:wrap;margin-top:12px';
  const label=document.createElement('div');
  label.style.cssText='font-size:12px;opacity:.86';
  const isExistingShift=result?.capability_id==='governed-existing-shift-continuation'||
   result?.status==='CHAT_EXISTING_SHIFT_WAKE_RECEIPT_VERIFIED';
  if(isExistingShift){
   // This is an informational receipt, not an owner authorization surface.
   // A visible, touch-sized X dismisses the old notice without any POST.
   head.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:12px';
   const close=document.createElement('button');
   close.type='button';
   close.textContent='×';
   close.className='reality-chat-shift-notice-dismiss';
   close.setAttribute('aria-label','Dismiss existing shift handoff update');
   close.setAttribute('title','Dismiss this update; the saved shift is unchanged');
   close.style.cssText='min-width:44px;min-height:44px;border:1px solid #507d9d;'+
    'border-radius:10px;background:#15364f;color:#ebf8ff;font-size:25px;'+
    'line-height:1;cursor:pointer;flex:0 0 auto';
   close.onclick=()=>{
    dismissNotice(ref);
    card.hidden=true;
    card.style.display='none';
    card.remove?.();
   };
   head.append(close);
  }
  const work=result?.original_work_id;
  label.textContent=isExistingShift?
   'Existing authorized shift · '+String(result.shift_id||'verification pending'):
   WORK.test(work||'')?work:
   'Original work ID will appear only after durable admission';
  if(typeof result?.objective==='string'&&result.objective.trim()){
   const objective=document.createElement('p');
   objective.textContent='Building: '+result.objective.slice(0,450);
   objective.style.cssText='margin:6px 0;font-size:13px';
   card.append(objective);
  }
  if(typeof result?.target_path==='string'){
   const file=document.createElement('p');
   file.textContent='Source file: '+result.target_path;
   file.style.cssText='margin:6px 0;font-size:12px;opacity:.85';
   card.append(file);
  }
  card.append(head,label,detail,timeline,actions);
  if(result){
   const phase=result.development_phase||(
    result.status==='CHAT_WORK_NEW_DEVELOPMENT_DRAFT_GENERATED'?'DRAFT_GENERATED':
    result.status==='CHAT_WORK_NEW_DEVELOPMENT_CANDIDATE_STAGED'?'CANDIDATE_STAGED':
    result.status==='CHAT_WORK_NEW_DEVELOPMENT_CI_VERIFIED'?'CI_VERIFIED':null);
   const idx=phaseOrder.indexOf(phase);
   const displayedSteps=isExistingShift?[
    'Authenticated owner instruction saved',
    'Existing active shift warrant and maintenance scope verified',
    'Existing signed worker wake enqueued (not execution)',
    'Independent signed worker run and original failure evidence',
    'Independent repair, original resumption and final receipts'
   ]:steps;
   for(let i=0;i<displayedSteps.length;i++){
    const row=document.createElement('div');
    let mark=isExistingShift?
     (i<3&&result.wake_enqueued===true?'✓':'○'):
     (i<4&&idx>=i?'✓':'○');
    if(!isExistingShift&&i===4&&verifiedComplete)mark='✓';
    row.textContent=mark+' '+displayedSteps[i];
    row.style.opacity=mark==='✓'?'1':'.70';
    timeline.append(row);
   }
   const url=result.pr_url;
   if(/^https:\/\/github\.com\/maloney2323\/Reality\/pull\/[1-9]\d*$/.test(url||'')){
    const link=document.createElement('a');link.href=url;
    link.target='_blank';link.rel='noopener noreferrer';
    link.textContent='Open actual GitHub code and tests';
    link.style.cssText='color:#9edfff;text-decoration:underline;min-height:40px';
    actions.append(link);
   }
   if(!isExistingShift&&idx>=3&&!verifiedComplete){
    const note=document.createElement('p');
    note.style.cssText='font-size:12px;margin:5px 0;opacity:.85';
    note.textContent='Source/syntax checks are not installation or full-job acceptance. Final completion and economic savings remain unverified until independent settlement.';
    card.append(note);
   }
  }
  panel.hidden=true;panel.style.display='none';
  activeRef=ref;
  return {card,detail,timeline,actions};
 }
 async function readFinalCompletion(ref,workId){
  if(!WORK.test(workId||''))return false;
  try{
   const response=await fetch('/api/reality/personal-genuine-loop-status',{
    method:'GET',credentials:'same-origin',cache:'no-store',
    signal:AbortSignal.timeout(18000)});
   const data=await response.json().catch(()=>null);
   if(!response.ok||data?.status!=='OWNER_GOVERNED_LOOP_READBACK'||
      data.production_changed!==false||
      data.external_action_performed!==false||
      !Array.isArray(data.jobs)||data.jobs.length>12||
      !Array.isArray(data.independent_final_receipts)||
      data.independent_final_receipts.length>12)
    return false;
   const job=data.jobs.find(j=>j.original_work_id===workId&&
     j.independently_settled===true&&j.universe_settlement_verified===true);
   const receipt=data.independent_final_receipts.find(r=>
    r.original_work_id===workId&&
    r.status==='FULL_LOOP_INDEPENDENTLY_VERIFIED'&&
    /^[a-f0-9]{64}$/.test(r.artifact_sha256||'')&&
    /^[a-f0-9]{40}$/.test(r.installed_commit_sha||'')&&
    /^[0-9a-f-]{36}$/i.test(r.settlement_event_id||'')&&
    Number.isSafeInteger(r.provider_run_id)&&r.provider_run_id>0&&
    r.production_changed===false);
   if(!job||!receipt)return false;
   verifiedComplete=true;
   const proof={status:'CHAT_WORK_NEW_DEVELOPMENT_VERIFIED_FINAL',
    original_work_id:workId,development_phase:'CI_VERIFIED',
    independent_ci_verified:true,pr_url:null};
   const ui=inlineWork(ref,
    'VERIFIED CUSTOMER JOB COMPLETED. Reality independently read back the original-job settlement and final receipt. It did not infer completion from the model or CI alone.',proof);
   if(ui){
    const a=document.createElement('a');
    a.href='/api/reality/personal-genuine-final-receipt-pdf?work_id='+
      encodeURIComponent(workId);
    a.textContent='Download independently verified final receipt (PDF)';
    a.style.cssText='color:#9edfff;text-decoration:underline;padding:10px 0';
    ui.actions.append(a);
    const b=document.createElement('a');b.href='/value';
    b.textContent='View verified value and ROI evidence';
    b.style.cssText='color:#9edfff;text-decoration:underline;padding:10px 0';
    ui.actions.append(b);
    const note=document.createElement('p');
    note.textContent='Realized cash savings, human hours returned and drift reduction: not verified unless separately measured.';
    note.style.cssText='font-size:12px;opacity:.85;margin:5px 0';
    ui.card.append(note);
    // Fetch independently measured technical statistics only after the
    // full-job receipt is proven. Missing ROI evidence remains unknown.
    void (async()=>{
     try{
      const r=await fetch('/api/reality/personal-job-roi-evidence',{
       method:'GET',credentials:'same-origin',cache:'no-store',
       signal:AbortSignal.timeout(16000)});
      const report=await r.json().catch(()=>null);
      const metric=report?.version==='reality-owner-original-job-roi-projection-v1'&&
       report.production_changed===false&&report.financial_roi_verified===false&&
       Array.isArray(report.jobs)&&report.jobs.length<=20?
       report.jobs.find(j=>j.original_work_id===workId&&
        j.technical_settlement_status==='INDEPENDENTLY_SETTLED_ISOLATED_PREVIEW'&&
        j.production_changed===false):null;
      if(!r.ok||!metric)return;
      const stats=document.createElement('p');
      const ms=metric.measured?.claim_to_settlement_ms;
      const checks=metric.measured?.verified_check_pass_count;
      stats.textContent='Verified isolated claim-to-settlement interval: '+
       (Number.isSafeInteger(ms)?(ms/1000).toFixed(1)+' s':'not measured')+
       ' · Technical checks passed: '+
       (Number.isSafeInteger(checks)?String(checks):'not verified')+
       ' · Not a full-business-job labor baseline.';
      stats.style.cssText='font-size:12px;margin:5px 0';
      ui.card.append(stats);
     }catch{}
    })();
   }
   return true;
  }catch{return false}
 }
 function renderTimeline(result){
  const phase=result?.development_phase||(
   result?.status==='CHAT_WORK_NEW_DEVELOPMENT_DRAFT_GENERATED'?'DRAFT_GENERATED':
   result?.status==='CHAT_WORK_NEW_DEVELOPMENT_CANDIDATE_STAGED'?'CANDIDATE_STAGED':
   result?.status==='CHAT_WORK_NEW_DEVELOPMENT_CI_VERIFIED'?'CI_VERIFIED':null);
  const order=['QUEUED','DRAFT_GENERATED','CANDIDATE_STAGED','CI_VERIFIED'];
  const idx=order.indexOf(phase);
  if(idx<0){timeline.textContent='';return}
  const titles=['Instruction admitted to saved work','AI wrote a source patch',
   'GitHub draft PR contains code','Independent CI recorded in Reality'];
  timeline.textContent=titles.map((name,i)=>
   (idx>=i?'✓ ':'○ ')+name).join('\n');
 }
 function renderPrLink(result){
  const url=result?.pr_url;
  if(typeof url!=='string'||!/^https:\/\/github\.com\/maloney2323\/Reality\/pull\/[1-9]\d*$/.test(url))return;
  const link=document.createElement('a');
  link.textContent='View real GitHub code candidate';
  link.href=url;
  link.target='_blank';
  link.rel='noopener noreferrer';
  link.style.cssText='display:inline-block;margin-top:8px;text-decoration:underline';
  actions.append(link);
 }
 function show(message,readOnly=false,ref=null){
  panel.hidden=false;
  description.textContent=message;
  actions.replaceChildren();
  if(readOnly&&ref&&UUID.test(ref.conversation_id)&&UUID.test(ref.request_id)){
   const inspect=document.createElement('button');
   inspect.type='button';
   inspect.textContent='Inspect saved work (read only)';
   inspect.onclick=async()=>{
    inspect.disabled=true;
    description.textContent='Reading the saved job and its latest verified development state…';
    try{
     const reply=await call('READ_SIGNED_NEW_DEVELOPMENT_STATUS',ref);
     showCheckedResult(reply,ref);
    }catch(err){
     description.textContent='Exact status readback blocked: '+String(err?.message||'UNVERIFIED')+
      '. No work was restarted.';
    }finally{inspect.disabled=false}
   };
   actions.append(inspect);
  }
 }
 async function call(action,ref){
  const response=await fetch('/api/reality/personal-chat-work',{
   method:'POST',credentials:'same-origin',cache:'no-store',
   headers:{'content-type':'application/json'},
   signal:AbortSignal.timeout(action==='ADVANCE_SIGNED_NEW_DEVELOPMENT'?185000:65000),
   body:JSON.stringify({action,conversation_id:ref.conversation_id,
    request_id:ref.request_id})
  });
  const json=await response.json().catch(()=>null);
  if(!response.ok||json?.ok!==true)
   throw Error(/^CHAT_WORK_[A-Z0-9_]{4,110}$/.test(String(json?.error||''))?
    json.error:'CHAT_WORK_ACTION_UNVERIFIED');
  if(json.request_id!==ref.request_id||
     json.source_ref!==ref.source_ref||
     json.installation_authorized!==false||
     json.production_changed!==false)
   throw Error('CHAT_WORK_SIGNED_SOURCE_OR_APPROVAL_UNVERIFIED');
  return json;
 }
 function explain(result){
  const id=WORK.test(result.original_work_id||'')?
   result.original_work_id:null;
  if(result.status==='CHAT_EXISTING_SHIFT_WAKE_RECEIPT_VERIFIED')
   return 'SIGNED EXISTING SHIFT HANDOFF VERIFIED · '+String(result.shift_id||'')+
    ' · Network request '+String(result.network_request_id||'')+
    '. Reality accepted this saved instruction without another shift or approval. '+
    'Latest signed worker status: '+String(result.last_worker_safe_result||
     'awaiting independent worker readback').replaceAll('_',' ')+
    '. This is not an original-job completion receipt.';
  if(result.status==='CHAT_EXISTING_SHIFT_WAKE_ENQUEUED')
   return 'EXISTING AUTHORIZED SHIFT WAKE QUEUED · '+String(result.shift_id||'')+
    ' · Request '+String(result.network_request_id||'')+
    '. The signed worker will independently claim the wake. No new shift, approval, installation or completed job was inferred.';
  if(result.status==='CHAT_EXISTING_SHIFT_WAKE_ALREADY_QUEUED')
   return 'EXISTING SHIFT WAKE ALREADY QUEUED · '+String(result.shift_id||'')+
    '. Same saved instruction, no duplicate request or new approval. Check the signed worker and original-job receipts.';
  if(typeof result.status==='string'&&result.status.startsWith('CHAT_EXISTING_SHIFT_'))
   return 'EXISTING SHIFT HANDOFF · '+result.status.replaceAll('_',' ')+
    '. The saved message is preserved; no worker execution or installation was claimed.';
  if(result.status==='CHAT_WORK_NEW_DEVELOPMENT_STATUS_READBACK')
   return 'SAVED BUILD STATUS · '+id+
    ' · phase '+String(result.development_phase||'UNKNOWN')+
    '. '+(result.independent_ci_verified===true?
      'Independent CI has a durable receipt.':
      'Independent CI is not yet recorded in Reality.')+
    ' No installation or customer-job completion has been claimed.';
  if(result.status==='CHAT_WORK_NEW_DEVELOPMENT_NOT_ADMITTED')
   return 'This exact saved Chat instruction has no admitted development record yet. Continue it once to create the original work ID; do not resend the message.';
  if(result.status==='CHAT_WORK_NEW_DEVELOPMENT_DRAFT_GENERATED')
   return 'REAL CODE DRAFT RECORDED for '+id+
    ' · Source file: '+String(result.source_path||'verified candidate source')+
    '. This is model-written proposed code, not installed or independently accepted.';
  if(result.status==='CHAT_WORK_NEW_DEVELOPMENT_CANDIDATE_STAGED')
   return 'GITHUB CANDIDATE STAGED for '+id+
    ' · '+String(result.pr_url||'Draft PR available from development evidence')+
    '. Independent CI still needs to be checked; no installation or customer-job completion is claimed.';
  if(result.status==='CHAT_WORK_NEW_DEVELOPMENT_CI_VERIFIED')
   return 'INDEPENDENT SOURCE/SYNTAX CI VERIFIED for '+id+
    ' · Commit '+String(result.artifact_commit_sha||'not supplied')+
    ', CI run '+String(result.ci_run_id||'not supplied')+
    '. This is NOT feature acceptance and no model code was installed or run.';
  if(result.status==='CHAT_WORK_NEW_DEVELOPMENT_CANDIDATE_BLOCKED'&&
     result.worker_status==='CHAT_NEW_DEV_INDEPENDENT_SOURCE_CI_PENDING')
   return 'GitHub code candidate for '+id+
    ' is staged. Independent CI is still being reconciled; the same job can be checked again without creating another build.';
  if(result.status==='CHAT_WORK_NEW_DEVELOPMENT_DRAFT_BLOCKED'||
     result.status==='CHAT_WORK_NEW_DEVELOPMENT_CANDIDATE_BLOCKED')
   return 'REAL BUILD BLOCKER for '+id+': '+String(result.worker_status||'UNKNOWN')+
    '. No successful code generation, PR, or installation is claimed without evidence.';
  if(result.status==='CHAT_WORK_NEW_DEVELOPMENT_CANDIDATE_NOT_CURRENT')
   return 'This source-backed build '+id+' is awaiting its turn in the existing governed candidate queue. No other owner work was advanced.';
  if(result.status==='CHAT_WORK_NEW_DEVELOPMENT_TERMINAL_OR_BLOCKED')
   return 'Saved build '+id+' is in '+String(result.development_phase||'unknown')+
    '. Exact readback required before further work.';
  if(result.status==='CHAT_WORK_NEW_DEVELOPMENT_ADMITTED_AND_READ_BACK')
   return 'Build admitted and independently read back: '+id+
    '. The existing signed worker can now draft code, stage an isolated candidate and run independent CI. Execution, installation and completion are NOT yet verified.';
  if(result.status==='CHAT_WORK_NEW_DEVELOPMENT_ADMITTED_READBACK_PENDING')
   return 'Build admission receipt recorded: '+id+
    '. Independent readback is temporarily unavailable. Do not send or admit the same instruction again. No completed work is claimed.';
  if(result.status==='CHAT_WORK_NEW_DEVELOPMENT_ALREADY_ADMITTED')
   return 'Existing build '+id+' · '+String(result.development_phase||'QUEUED')+
    '. The saved instruction already has a development record; no duplicate created.';
  if(result.status==='CHAT_WORK_ENGINEERING_CI_DISPATCH_VERIFIED')
   return 'Existing authorized engineering '+id+' · '+String(result.broker_status||'UNVERIFIED')+
    '. Inspect independent CI before approving an installation.';
  if(result.status==='CHAT_WORK_ORIGINAL_DISCOVERY_DISPATCHED')
   return 'Existing original '+id+' has a verified governed discovery dispatch. No new shift or installation authorized.';
  if(result.status==='CHAT_WORK_ORIGINAL_DISCOVERY_QUEUED_BLOCKED')
   return 'Existing original '+id+' is queued, but worker dispatch is unverified. No second shift started.';
  if(result.status==='CHAT_WORK_CAPABILITY_GAP'||
     result.status==='CHAT_WORK_NEEDS_A_VERIFIED_EXECUTION_ADAPTER')
   return 'Reality saved your instruction, but does not have a verified executable adapter for this work. No job was falsely started.';
  if(result.status==='CHAT_WORK_INTENT_UNAVAILABLE')
   return 'The intent provider is unavailable. The instruction remains durably saved; no execution was inferred.';
  if(result.status==='CHAT_WORK_CONVERSATION_ONLY')
   return 'This saved message was classified as a conversation, not an executable work instruction.';
  if(result.status==='CHAT_WORK_NEW_DEVELOPMENT_ELIGIBLE')
   return 'The saved instruction is eligible for isolated new development, but no durable admission is yet verified.';
  if(result.status==='CHAT_WORK_ENGINEERING_TESTED_AWAITING_EXACT_APPROVAL')
   return 'Original '+id+' has CI evidence and awaits its separate exact installation decision.';
  return 'Saved work decision: '+String(result.status||'UNVERIFIED').replaceAll('_',' ')+
   '. No completed job or installation is inferred.';
 }
 // One owner gesture may request consecutive independent, bounded
 // development transitions. Each server step reauthenticates the same
 // signed user source and reads the exact persisted job again.
 async function processAndAdvance(ref){
  if(!inlineWork(ref,
   'Checking the exact owner-signed Chat instruction and existing job admission…',null))
   description.textContent='Checking the exact saved work instruction…';
  const admitted=await call('PROCESS_SIGNED_WORK_REQUEST',ref);
  if(!['CHAT_WORK_NEW_DEVELOPMENT_ADMITTED_AND_READ_BACK',
   'CHAT_WORK_NEW_DEVELOPMENT_ALREADY_ADMITTED'].includes(admitted.status))
   return admitted;
  if(admitted.status==='CHAT_WORK_NEW_DEVELOPMENT_ALREADY_ADMITTED'&&
     !['QUEUED','DRAFT_GENERATED','PUBLISH_FENCED','CANDIDATE_STAGED']
       .includes(admitted.development_phase||''))
   return admitted;
  const stageMessage=explain(admitted)+
   ' Reality is advancing the exact signed job through its guarded worker…';
  if(!inlineWork(ref,stageMessage,admitted))description.textContent=stageMessage;
  const first=await call('ADVANCE_SIGNED_NEW_DEVELOPMENT',ref);
  if(first.original_work_id!==admitted.original_work_id)
   throw Error('CHAT_WORK_BUILD_IDENTITY_DRIFT');
  if(first.status!=='CHAT_WORK_NEW_DEVELOPMENT_DRAFT_GENERATED')
   return first;
  const draftMessage=explain(first)+
   ' Checking the existing isolated GitHub publisher for this exact job…';
  if(!inlineWork(ref,draftMessage,first))description.textContent=draftMessage;
  const second=await call('ADVANCE_SIGNED_NEW_DEVELOPMENT',ref);
  if(second.original_work_id!==first.original_work_id)
   throw Error('CHAT_WORK_BUILD_IDENTITY_DRIFT');
  if(second.status==='CHAT_WORK_NEW_DEVELOPMENT_CANDIDATE_STAGED'){
   showCheckedResult(second,ref);
   const ciMessage=explain(second)+
    ' Independent GitHub CI is now being checked and reconciled…';
   if(!inlineWork(ref,ciMessage,second))description.textContent=ciMessage;
   const checked=await call('ADVANCE_SIGNED_NEW_DEVELOPMENT',ref);
   if(checked.original_work_id!==second.original_work_id)
    throw Error('CHAT_WORK_BUILD_IDENTITY_DRIFT');
   return checked;
  }
  return second;
 }
 function showCheckedResult(result,ref){
  if((result?.capability_id==='governed-existing-shift-continuation'||
      result?.status==='CHAT_EXISTING_SHIFT_WAKE_RECEIPT_VERIFIED')&&
     isNoticeDismissed(ref)){
   // Not a fallback to a second Work popup: user dismissed this notice.
   panel.hidden=true;panel.style.display='none';
   return;
  }
  const inline=inlineWork(ref,explain(result),result);
  if(!inline){
   show(explain(result),true,ref);
   renderTimeline(result);
   renderPrLink(result);
  }
  const phase=result?.development_phase;
  const pending=result?.status==='CHAT_WORK_NEW_DEVELOPMENT_CANDIDATE_BLOCKED'&&
    result.worker_status==='CHAT_NEW_DEV_INDEPENDENT_SOURCE_CI_PENDING';
  const canCheck=phase==='CANDIDATE_STAGED'||pending||
    result?.status==='CHAT_WORK_NEW_DEVELOPMENT_CANDIDATE_STAGED';
  const canContinue=result?.status==='CHAT_WORK_NEW_DEVELOPMENT_NOT_ADMITTED'||
   ['QUEUED','DRAFT_GENERATED','PUBLISH_FENCED'].includes(phase);
  const ciAccepted=result?.development_phase==='CI_VERIFIED'||
     result?.status==='CHAT_WORK_NEW_DEVELOPMENT_CI_VERIFIED';
  if(ciAccepted){
   if(!verifiedComplete&&inline){
    const verify=document.createElement('button');
    verify.type='button';
    verify.textContent='Check final job verification and receipt';
    verify.style.cssText='min-height:42px;max-width:100%;white-space:normal';
    verify.onclick=async()=>{
     if(verify.disabled)return;
     verify.disabled=true;
     inlineWork(ref,
      'Checking independent functional settlement and the final customer receipt…',
      result);
     const settled=await readFinalCompletion(ref,result.original_work_id);
     if(!settled)showCheckedResult(result,ref);
    };
    inline.actions.append(verify);
   }
   if(!verifiedComplete)void readFinalCompletion(ref,result.original_work_id);
  }
  if(!canCheck&&!canContinue)return;
  const btn=document.createElement('button');
  btn.type='button';
  btn.textContent=canCheck?'Check and record independent CI (same build)':
   'Continue this exact saved build (no resend)';
  btn.style.cssText='margin-top:10px;display:block;max-width:100%;white-space:normal';
  btn.onclick=async()=>{
   if(btn.disabled)return;
   btn.disabled=true;
   description.textContent=canCheck?
    'Checking the independent GitHub CI for '+String(result.original_work_id)+
     ' and reconciling its saved receipt…':
    'Continuing the saved '+String(ref.request_id)+
     ' through the existing governed builder…';
   try{
    const next=canCheck?
     await call('ADVANCE_SIGNED_NEW_DEVELOPMENT',ref):
     await processAndAdvance(ref);
    if(result.original_work_id&&next.original_work_id&&
       next.original_work_id!==result.original_work_id)
     throw Error('CHAT_WORK_BUILD_IDENTITY_DRIFT');
    showCheckedResult(next,ref);
   }catch(err){
    description.textContent='This exact build cannot advance: '+String(err?.message||'UNVERIFIED')+
     '. The saved work is preserved. Inspect its status; do not resend or approve another shift.';
   }finally{btn.disabled=false}
  };
  (inline?.actions||actions).append(btn);
 }
 // The durable signed history is looked up by an explicit user click.
 // Do not depend on page-load CustomEvents, event timing or old Chat bubbles.
 // A successful lookup does not authorize execution or installation.
 recoverButton.onclick=async()=>{
  if(recoverButton.disabled)return;
  recoverButton.disabled=true;
  panel.hidden=false;
  description.textContent='Reading the authenticated saved conversation (no work is being started)…';
  actions.replaceChildren();
  try{
   const conversationId=window.realityActiveConversationId?.();
   if(!UUID.test(conversationId||''))throw Error('CHAT_WORK_CONVERSATION_NOT_SELECTED');
   const response=await fetch('/api/reality/personal-chat?conversation_id='+
    encodeURIComponent(conversationId),{
    method:'GET',credentials:'same-origin',cache:'no-store',
    signal:AbortSignal.timeout(20000)
   });
   const data=await response.json().catch(()=>null);
   if(!response.ok||data?.ok!==true||data.conversation_id!==conversationId||
      !Array.isArray(data.messages))
    throw Error(response.status===401?'CHAT_WORK_SIGN_IN_REQUIRED':
      'CHAT_WORK_SAVED_HISTORY_READBACK_UNAVAILABLE');
   const candidates=data.messages.filter(m=>m?.role==='user'&&
     UUID.test(m.request_id||'')&&SOURCE.test(m.source_ref||'')&&
     typeof m.text==='string'&&
     /\b(?:build|implement|code|repair|fix|develop|upgrade|create|generate)\b/i.test(m.text)&&
     Number.isFinite(Date.parse(m.created_at||'')))
     .sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at));
   if(candidates.length===0){
    description.textContent='No source-verified build instruction found in this conversation. Nothing was executed. You may send a new build instruction once.';
    return;
   }
   const latest=candidates[0];
   const ref={conversation_id:conversationId,
    request_id:latest.request_id,source_ref:latest.source_ref};
   const preview=latest.text.trim().replace(/\s+/g,' ').slice(0,200);
   description.textContent='Saved, signed request found: “'+preview+'” · Request '+latest.request_id+
    '. Review this source before continuing. This lookup made no changes.';
   // The server reads only this exact signed source from the owner's
   // durable Chat record. No model call, worker claim or approval occurs.
   try{
    const state=await call('READ_SIGNED_NEW_DEVELOPMENT_STATUS',ref);
    showCheckedResult(state,ref);
   }catch(err){
    description.textContent='Saved Chat request found, but work status is not available: '+
     String(err?.message||'UNVERIFIED')+'. No work was restarted.';
    const resume=document.createElement('button');
    resume.type='button';
    resume.textContent='Continue this exact saved build (no resend)';
    resume.onclick=async()=>{
     resume.disabled=true;
     try{showCheckedResult(await processAndAdvance(ref),ref)}
     catch(error){description.textContent='Work handoff not verified: '+
      String(error?.message||'UNVERIFIED')+'. The request remains saved.'}
     finally{resume.disabled=false}
    };
    actions.append(resume);
   }

  }catch(err){
   const code=String(err?.message||'CHAT_WORK_HISTORY_UNAVAILABLE');
   description.textContent='Could not read your saved work: '+
    (/^CHAT_WORK_[A-Z0-9_]{4,110}$/.test(code)?code:'CHAT_WORK_HISTORY_UNAVAILABLE')+
    '. No request was sent or approved.';
  }finally{
   recoverButton.disabled=false;
  }
 };
 // Rehydrate the most recent *persisted* signed build within its Chat
 // transcript after saved history is rendered. This is a read-only action.
 // No hidden work admission, worker claim or approval on page load.
 let restoring=false,lastRestored='';
 window.addEventListener('reality:saved-chat-readback',async event=>{
  const x=event.detail||{};
  if(activeRef&&UUID.test(x.conversation_id||'')&&
     x.conversation_id!==activeRef.conversation_id){
   activeRef=null;verifiedComplete=false;activePhase=null;lastRestored='';
   panel.hidden=false;panel.style.display='';
  }
  if(restoring||!UUID.test(x.conversation_id||'')||
     window.realityActiveConversationId?.()!==x.conversation_id||
     !Array.isArray(x.messages))return;
  const signedShiftCommand=text=>
   /^(?:reality\s*[,.:]?\s*)?(?:please\s+)?(?:continue|resume|run|finish|execute)\s+.{0,140}(?:shift|existing|original)/i.test(text)&&
   !/\b(?:install|deploy|production|approve)\b/i.test(text);
  const recent=x.messages.filter(m=>m?.role==='user'&&
   UUID.test(m.request_id||'')&&SOURCE.test(m.source_ref||'')&&
   typeof m.text==='string'&&
   (signedShiftCommand(m.text)||
    /\b(?:build|implement|code|repair|fix|develop|upgrade|generate)\b/i.test(m.text)))
   .sort((a,b)=>Date.parse(b.created_at||'')-Date.parse(a.created_at||''))
   .slice(0,4);
  if(!recent.length)return;
  restoring=true;
  try{
   for(const m of recent){
    const ref={conversation_id:x.conversation_id,
     request_id:m.request_id,source_ref:m.source_ref};
    if(lastRestored===key(ref.conversation_id,ref.request_id)&&activeRef?.request_id===ref.request_id)
     return;
    const existingShift=signedShiftCommand(m.text);
    const result=await call(existingShift?
     'READ_SIGNED_EXISTING_SHIFT_WAKE_STATUS':
     'READ_SIGNED_NEW_DEVELOPMENT_STATUS',ref);
    if(!((existingShift&&result.status===
      'CHAT_EXISTING_SHIFT_WAKE_RECEIPT_VERIFIED')||
      (!existingShift&&result.status===
      'CHAT_WORK_NEW_DEVELOPMENT_STATUS_READBACK')))
     continue;
    lastRestored=key(ref.conversation_id,ref.request_id);
    showCheckedResult(result,ref);
    return;
   }
  }catch{
   // Saved history is still authoritative. A failed transient status read
   // cannot create a job, replay a write or claim success.
  }finally{restoring=false}
 });
 // A saved-history update is evidence only. It never automatically replays
 // a previous request, so missed page-load events cannot disable recovery.
 window.addEventListener('reality:chat-request-started',event=>{
  const x=event.detail||{};
  if(!UUID.test(x.conversation_id||'')||!UUID.test(x.request_id||''))return;
  if(started.size>12)started.clear();
  started.set(key(x.conversation_id,x.request_id),{
   work:x.work_status_requested===true,source_ref:null
  });
  if(x.work_status_requested===true)
   show('Saving your work instruction before checking the existing governed executor…');
 });
 window.addEventListener('reality:chat-request-rebound',event=>{
  const x=event.detail||{};
  if(!UUID.test(x.conversation_id||'')||
     !UUID.test(x.previous_request_id||'')||!UUID.test(x.request_id||''))return;
  const oldKey=key(x.conversation_id,x.previous_request_id);
  const stored=started.get(oldKey);
  if(stored){
   started.delete(oldKey);
   started.set(key(x.conversation_id,x.request_id),stored);
  }
 });
 window.addEventListener('reality:chat-intake-saved',event=>{
  const x=event.detail||{};
  if(!UUID.test(x.conversation_id||'')||!UUID.test(x.request_id||'')||
     !SOURCE.test(x.source_ref||''))return;
  const k=key(x.conversation_id,x.request_id);
  const entry=started.get(k);
  started.delete(k);
  if(!entry?.work||processing.has(k))return;
  const ref={conversation_id:x.conversation_id,request_id:x.request_id,
   source_ref:x.source_ref};
  // A recovered duplicate may already have side effects. Read only;
  // never replay an ambiguous action automatically.
  if(x.duplicate_content===true){
   show('This exact instruction was previously saved. Inspect its current work state; do not repeat the command.',true,ref);
   return;
  }
  processing.add(k);
  show('Instruction saved. Reality is matching it to a currently installed, governed work capability…');
  void (async()=>{
   try{
    const result=await processAndAdvance(ref);
    if(window.realityJustSavedWorkRequest?.conversation_id===ref.conversation_id&&
       window.realityJustSavedWorkRequest?.request_id===ref.request_id)
     window.realityJustSavedWorkRequest=null;
    showCheckedResult(result,ref);
   }catch{
    show('The instruction is saved, but this attempt to verify a governed work handoff failed. Check the exact saved request; do not resend it.',true,ref);
   }finally{
    processing.delete(k);
   }
  })();
 });
})();
