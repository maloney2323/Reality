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
 panel.append(label,description,recoverControls,actions);
 panel.hidden=false;
 description.textContent='Chat work status · Check an existing saved build instruction. No new message, shift or installation is created by looking it up.';
 container.insertBefore(panel,composer);
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
    description.textContent='Reading the exact saved request and permitted next action…';
    try{
     const reply=await call('INSPECT_VERIFIED_WORK',ref);
     description.textContent=explain(reply);
    }catch{
     description.textContent='Exact work readback unavailable. Your Chat instruction remains saved; do not resend it.';
    }finally{inspect.disabled=false}
   };
   actions.append(inspect);
  }
 }
 async function call(action,ref){
  const response=await fetch('/api/reality/personal-chat-work',{
   method:'POST',credentials:'same-origin',cache:'no-store',
   headers:{'content-type':'application/json'},
   signal:AbortSignal.timeout(65000),
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
   const inspect=document.createElement('button');
   inspect.type='button';
   inspect.textContent='Inspect current work (read only)';
   inspect.onclick=async()=>{
    inspect.disabled=true;
    description.textContent='Reading this exact signed instruction without executing work…';
    try{
     const result=await call('INSPECT_VERIFIED_WORK',ref);
     description.textContent=explain(result);
    }catch(err){
     const code=String(err?.message||'CHAT_WORK_READBACK_UNAVAILABLE');
     description.textContent='Inspection blocked: '+
       (/^CHAT_WORK_[A-Z0-9_]{4,110}$/.test(code)?code:'CHAT_WORK_READBACK_UNAVAILABLE')+
       '. No action was performed.';
    }finally{inspect.disabled=false;}
   };
   const proceed=document.createElement('button');
   proceed.type='button';
   proceed.textContent='Continue this exact saved build (no resend)';
   proceed.onclick=async()=>{
    if(proceed.disabled)return;
    proceed.disabled=true;
    description.textContent='Checking and processing exact signed source '+ref.request_id+
      ' through the existing governed work adapter…';
    try{
     const result=await call('PROCESS_SIGNED_WORK_REQUEST',ref);
     description.textContent=explain(result);
    }catch(err){
     const code=String(err?.message||'CHAT_WORK_UNVERIFIED');
     description.textContent='Work handoff not verified: '+
      (/^CHAT_WORK_[A-Z0-9_]{4,110}$/.test(code)?code:'CHAT_WORK_UNVERIFIED')+
      '. No completion or installation is claimed. Do not resend the same request.';
    }
   };
   actions.append(inspect,proceed);
  }catch(err){
   const code=String(err?.message||'CHAT_WORK_HISTORY_UNAVAILABLE');
   description.textContent='Could not read your saved work: '+
    (/^CHAT_WORK_[A-Z0-9_]{4,110}$/.test(code)?code:'CHAT_WORK_HISTORY_UNAVAILABLE')+
    '. No request was sent or approved.';
  }finally{
   recoverButton.disabled=false;
  }
 };
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
    const result=await call('PROCESS_SIGNED_WORK_REQUEST',ref);
    if(window.realityJustSavedWorkRequest?.conversation_id===ref.conversation_id&&
       window.realityJustSavedWorkRequest?.request_id===ref.request_id)
     window.realityJustSavedWorkRequest=null;
    show(explain(result),true,ref);
   }catch{
    show('The instruction is saved, but this attempt to verify a governed work handoff failed. Check the exact saved request; do not resend it.',true,ref);
   }finally{
    processing.delete(k);
   }
  })();
 });
})();
