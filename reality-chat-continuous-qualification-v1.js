/* Continuously sourced qualification inbox in the EXISTING Chat Work panel.
 * This is a source-status display, never an approval or execution endpoint.
 * The signed shift worker reconciles durable evidence before this view reads.
 */
(() => {
 'use strict';
 if(!/^\/chat\/?$/.test(location.pathname))return;
 const get=id=>document.getElementById(id);
 const panel=get('realityChatPanelWork'),ready=get('privateReady'),prompt=get('privatePrompt');
 if(!panel||!ready||!prompt||get('realityContinuousQualifier'))return;
 const node=(tag,value)=>{
  const e=document.createElement(tag);
  if(value!==undefined)e.textContent=value;
  return e;
 };
 const root=node('section');
 root.id='realityContinuousQualifier';
 root.setAttribute('aria-label','Continuous employee work qualification');
 const heading=node('h3','Continuous qualification');
 const summary=node('p','Reality checks existing work before any approval or execution.');
 summary.setAttribute('role','status');
 const entries=node('div');
 const exactReview=node('section');
 exactReview.setAttribute('aria-label','Saved signed Chat originals awaiting exact qualification');
 const exactHeading=node('h4','Signed Chat originals · exact approval');
 const exactItems=node('div');
 const exactStatus=node('p','Reality verifies the saved owner instruction and its registered executor before any original can be approved.');
 exactStatus.setAttribute('role','status');
 exactReview.append(exactHeading,exactStatus,exactItems);
 const refresh=node('button','Refresh qualification');
 refresh.type='button';
 const review=node('button','Discuss next qualification in Chat');
 review.type='button';review.disabled=true;
 const footer=node('p','Evidence intake is not executable work. A specific, current, independently qualified job must be presented through the existing governed owner approval flow.');
 root.append(heading,summary,entries,exactReview,refresh,review,footer);
 panel.prepend(root);
 let active=null,loading=false,verified=null;
 const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
 const SHA=/^sha256:[a-f0-9]{64}$/;
 const ROUTE=/^reality:qualification:[a-f0-9]{64}$/;
 const APPROVAL_API='/api/reality/personal-qualified-chat-original-approval';
 let checkingExact=false,approvalUncertain=false;
 function isReady(){return ready.style.display==='block';}
 async function exactApi(body){
  const r=await fetch(APPROVAL_API,{
   method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',
   headers:body?{'content-type':'application/json'}:{},
   body:body?JSON.stringify(body):undefined,
   signal:AbortSignal.timeout(body?.action==='APPROVE_EXACT_QUALIFIED_CHAT_ORIGINAL'?85000:65000)
  });
  const x=await r.json().catch(()=>null);
  if(!r.ok||x?.ok!==true)throw Error(
   typeof x?.status==='string'?x.status:'EXACT_CHAT_APPROVAL_READBACK_UNAVAILABLE');
  return x;
 }
 function checkedPacket(packet,item){
  return packet?.status==='QUALIFIED_CHAT_EXACT_OWNER_ADMISSION_APPROVAL_READY'&&
   packet.owner_approval_ready===true&&
   packet.message_id===item.intake_key&&
   packet.continuity_ref===item.continuity_ref&&
   packet.source_ref===item.source_ref&&
   UUID.test(packet.packet_id||'')&&
   SHA.test(packet.proposal_fingerprint||'')&&
   typeof packet.objective==='string'&&packet.objective.length>=8&&
   typeof packet.source_quote==='string'&&packet.source_quote.length>=5&&
   packet.approval_scope==='ISOLATED_NEW_DEVELOPMENT_ADMISSION_ONLY'&&
   packet.installation_authorized===false&&
   packet.model_execution_authorized===false&&
   packet.new_shift_started===false;
 }
 function renderApprovalPacket(item,host,packet){
  host.replaceChildren();
  const explain=node('p','Source-verified proposed original (not yet admitted): '+
   packet.objective.slice(0,450));
  const quote=node('p','Exact signed instruction: '+packet.source_quote.slice(0,500));
  const limit=node('p','Approval admits this one signed instruction for isolated development only. It does not authorize production, installation, a new shift, or independent job completion.');
  const approve=node('button','Approve exact original admission');
  approve.type='button';
  const state=node('p','Waiting for your exact decision.');
  state.setAttribute('role','status');
  const check=node('button','Check owner admission receipt');
  check.type='button';
  check.addEventListener('click',async()=>{
   check.disabled=true;
   try{
    const read=await exactApi();
    const match=read.items?.filter(x=>x.packet_id===packet.packet_id&&
     x.proposal_fingerprint===packet.proposal_fingerprint)||[];
    if(match.length!==1)throw Error('EXACT_OWNER_PACKET_UNVERIFIED');
    if(match[0].review_state==='ORIGINAL_ADMITTED_IN_EXISTING_CHAT_WORK_ADAPTER'&&
     /^work:[a-f0-9]{32}$/.test(match[0].original_work_id||'')&&
     SHA.test(match[0].approval_receipt_sha256||'')){
     state.textContent='Approved original admitted: '+match[0].original_work_id+
      '. Approval receipt: '+match[0].approval_receipt_sha256+
      '. Execution and final settlement remain separate.';
     approve.disabled=true;approvalUncertain=false;
    }else if(match[0].review_state==='AWAITING_OWNER_EXACT_APPROVAL'&&!approvalUncertain){
     state.textContent='Approval still pending. The original has not been admitted.';
    }else{
     state.textContent='Previous action needs independent reconciliation. No automatic reapproval.';
    }
   }catch{state.textContent='Receipt readback unavailable. Do not retry an uncertain approval.';}
   finally{check.disabled=false;}
  });
  approve.addEventListener('click',async()=>{
   if(!isReady()||approve.disabled||checkingExact||approvalUncertain)return;
   approve.disabled=true;checkingExact=true;approvalUncertain=true;
   state.textContent='Recording one exact signed-owner admission and independent readback…';
   try{
    const approved=await exactApi({
     action:'APPROVE_EXACT_QUALIFIED_CHAT_ORIGINAL',
     packet_id:packet.packet_id,
     proposal_fingerprint:packet.proposal_fingerprint,
     approval_request_id:crypto.randomUUID()
    });
    if(approved.status!=='QUALIFIED_CHAT_EXACT_ORIGINAL_ADMISSION_INDEPENDENTLY_READ_BACK'||
     approved.original_admitted!==true||
     !/^work:[a-f0-9]{32}$/.test(approved.original_work_id||'')||
     !SHA.test(approved.approval_receipt_sha256||'')||
     approved.installation_authorized!==false||
     approved.model_execution_authorized!==false||
     approved.new_shift_started!==false)
     throw Error('EXACT_ADMISSION_INDEPENDENT_READBACK_UNVERIFIED');
    approvalUncertain=false;
    state.textContent='Original admitted: '+approved.original_work_id+
      '. Signed owner receipt '+approved.approval_receipt_sha256+
      '. Existing governed worker must separately verify scope before execution.';
    void load();
   }catch{
    state.textContent='Owner admission result is uncertain. Check owner admission receipt; do not submit a second approval.';
   }finally{checkingExact=false;}
  });
  host.append(explain,quote,limit,approve,state,check);
 }
 function renderSignedChatCandidates(data){
  exactItems.replaceChildren();
  const candidates=data.items.filter(x=>x.intake_family==='AUTHENTICATED_CHAT'&&
   !x.terminal_observation&&UUID.test(x.intake_key||'')&&
   ROUTE.test(x.continuity_ref||'')&&
   ['SAVED_CHAT_INTENT_NEEDS_GOVERNED_CLASSIFICATION',
    'QUALIFIED_CHAT_ORIGINAL_AWAITING_EXACT_OWNER_APPROVAL',
    'QUALIFIED_CHAT_ORIGINAL_ADMITTED_PENDING_GOVERNED_EXECUTION',
    'EXISTING_SIGNED_CHAT_ORIGINAL_RECONCILE_WORKER']
    .includes(x.governed_route_state)&&
   x.source_ref==='supabase:reality_chat_messages:'+x.intake_key).slice(0,5);
  exactStatus.textContent=candidates.length?
   candidates.length+' previously saved signed Chat instruction(s) ready for independent scope classification. This is not approval.' :
   'No signed Chat intake qualified for exact classification in this owner-scoped readback.';
  for(const item of candidates){
   const card=node('article');
   card.className='reality-qualification-source';
   const title=node('strong','Saved owner instruction · source verified by signed ledger');
   const key=node('small','Source: '+item.source_ref+
    ' · governed route: '+item.governed_route_state.replaceAll('_',' '));
   const button=node('button','Verify exact original and registered capability');
   button.type='button';
   const verdict=node('div');
   verdict.dataset.signedReviewSource=item.intake_key;
   const feedback=node('p','No original admitted. No executor started.');
   feedback.setAttribute('role','status');
   button.addEventListener('click',async()=>{
    if(!isReady()||button.disabled||checkingExact)return;
    button.disabled=true;checkingExact=true;
    feedback.textContent='Reality is independently re-reading the saved owner instruction and installed work adapter…';
    try{
     const p=await exactApi({
      action:'INSPECT_QUALIFIED_CHAT_ORIGINAL',
      message_id:item.intake_key,continuity_ref:item.continuity_ref
     });
     if(checkedPacket(p,item)){
      renderApprovalPacket(item,verdict,p);
      feedback.textContent='Exact owner decision ready; no model or job execution authorized.';
     }else{
      verdict.replaceChildren();
      feedback.textContent='Qualification: '+String(p.status||'NOT_ELIGIBLE').replaceAll('_',' ')+
       '. '+String(p.classification_status||p.next_evidence_action||'No new approval needed or available.')
        .replaceAll('_',' ');
     }
    }catch{
     verdict.replaceChildren();
     feedback.textContent='Signed source or provider classification was not independently verified. No authority was granted.';
    }finally{checkingExact=false;button.disabled=false;}
   });
   card.append(title,key,button,feedback,verdict);
   exactItems.append(card);
   // Independently re-read persisted packets so exact approvals do not
   // disappear after a signed worker routes an existing Chat original.
   void (async()=>{
    try{
     const read=await exactApi();
     if(!isReady()||!Array.isArray(read.items))return;
     const matching=read.items.filter(p=>p.message_id===item.intake_key&&
      p.continuity_ref===item.continuity_ref&&p.source_ref===item.source_ref);
     if(matching.length!==1)return;
     const p=matching[0];
     if(p.review_state==='ORIGINAL_ADMITTED_IN_EXISTING_CHAT_WORK_ADAPTER'&&
      /^work:[a-f0-9]{32}$/.test(p.original_work_id||'')&&
      SHA.test(p.approval_receipt_sha256||'')){
      button.disabled=true;
      feedback.textContent='Already admitted: '+p.original_work_id+
       '. Owner approval receipt '+p.approval_receipt_sha256+
       '. Execution and independent settlement are separate.';
     }else if(p.review_state==='AWAITING_OWNER_EXACT_APPROVAL'){
      const packet={...p,
       status:'QUALIFIED_CHAT_EXACT_OWNER_ADMISSION_APPROVAL_READY',
       owner_approval_ready:true,
       approval_scope:'ISOLATED_NEW_DEVELOPMENT_ADMISSION_ONLY',
       installation_authorized:false,model_execution_authorized:false,
       new_shift_started:false};
      if(checkedPacket(packet,item)){
       renderApprovalPacket(item,verdict,packet);
       button.disabled=true;
       feedback.textContent='Persisted exact approval is pending. No original admitted.';
      }
     }
    }catch{/* Provider readback failure cannot grant authority. */}
   })();
  }
 }

 function paint(data){
  entries.replaceChildren();
  const items=data.items.filter(x=>!x.terminal_observation).slice(0,8);
  summary.textContent=data.nonterminal_items+' open qualification observations across existing employee work and capabilities; '+data.total+' tracked source identities'+
   (data.stale_source_observations?'; '+data.stale_source_observations+' need a fresh worker readback':'')+'.';
  for(const x of items){
   const card=node('div');card.className='reality-qualification-source';
   const label=node('strong',(x.employee?x.employee+' · ':'')+
    x.intake_family.replaceAll('_',' ').toLowerCase());
   const title=node('p',x.title.slice(0,170));
   const state=node('small',x.qualification_state.replaceAll('_',' ')+
    ' · '+x.next_action.replaceAll('_',' '));
   const route=node('p',(x.governed_route_state||'SIGNED_WORKER_ROUTE_RECONCILIATION_PENDING')
     .replaceAll('_',' ')+' · '+
    (x.governed_next_action||'RECHECK_SIGNED_WORKER_CONTINUITY_ROUTE')
     .replaceAll('_',' '));
   const continuity=x.continuity_ref?
    node('small','Qualification route key (not a final job receipt): '+x.continuity_ref.slice(0,35)+'…'):
    node('small','Continuity routing is awaiting a verified signed worker.');
   card.append(label,title,state,route,continuity);
   if(x.existing_approval_adapter==='EXISTING_QUALIFIED_CAPABILITY_CHAT'){
    card.append(node('p','A verified capability may already have an exact owner approval card. Reality must recheck its existing authenticated approval preflight before displaying or accepting a decision.'));
   }
   if(typeof x.source_ref==='string'&&
      /^https:\/\/github\.com\/[^/]+\/[^/]+\/(issues|pull)\/[1-9][0-9]*$/.test(x.source_ref)){
    const link=node('a','Inspect source');
    link.href=x.source_ref;link.target='_blank';link.rel='noopener noreferrer';
    card.append(link);
   }
   entries.append(card);
  }
  if(!items.length)entries.append(node('p','No active source qualification items in the current readback.'));
  const actionable=items.find(x=>x.intake_family==='EMPLOYEE_SCHEDULE'||
   x.intake_family==='SIGNED_SHIFT_SOURCE'||
   x.intake_family==='GOVERNED_CAPABILITY')||items[0]||null;
  active=actionable;review.disabled=!active;
  renderSignedChatCandidates(data);
 }
 async function load(){
  if(loading||!isReady())return;
  loading=true;refresh.disabled=true;
  try{
   const response=await fetch('/api/reality/personal-continuous-qualification',{
    method:'GET',credentials:'same-origin',cache:'no-store',
    signal:AbortSignal.timeout(16000)});
   const data=await response.json().catch(()=>null);
   if(!response.ok||!data?.ok||
      data.status!=='OWNER_CONTINUOUS_QUALIFICATION_INBOX_READ_ONLY'||
      data.items_are_qualifier_inputs_not_approved_jobs!==true||
      data.shift_authorized_by_read!==false||
      data.execution_authorized!==false||
      data.installation_authorized!==false||
      !Array.isArray(data.items)||data.items.length>30)
    throw Error('OWNER_QUALIFICATION_RECEIPT_NOT_AVAILABLE');
   verified=data;paint(data);
  }catch{
   verified=null;active=null;review.disabled=true;
   summary.textContent='Qualification source readback unavailable. This does not mean work is approved, finished, or safe to replay.';
  }finally{loading=false;refresh.disabled=false;}
 }
 refresh.addEventListener('click',()=>void load());
 review.addEventListener('click',()=>{
  if(!active||!verified||!isReady())return;
  const item=active;
  // Fill an unsent, advisory-only request. The owner must submit it, and
  // any eventual work/installation still needs independent exact authority.
  prompt.value='Reality, review the next qualification from my existing source-backed work inventory.\n'+
   'Source family: '+item.intake_family+'\n'+
   'Source reference: '+String(item.source_ref||'(owner ledger source)').slice(0,350)+'\n'+
   'Qualification state: '+item.qualification_state+'\n'+
   'Required next check: '+item.next_action+'\n'+
   'Continuity reference: '+String(item.continuity_ref||'NOT_YET_RECONCILED')+'\n'+
   'Governed route: '+item.governed_route_state+'\n'+
   'Next governed check: '+item.governed_next_action+'\n'+
   'Existing verified original match: '+String(item.matched_original_work_id||'NONE')+'\n'+
   'Verify current owner, goal, source, frozen acceptance, and permitted scope. '+
   'If an exact executable original is independently qualified, present the governed approval request once. '+
   'Do not create a new shift, infer approval, replay uncertain effects, or install anything.';
  prompt.dispatchEvent(new Event('input',{bubbles:true}));
  prompt.focus({preventScroll:true});
 });
 if(isReady())void load();
 else{
  const observer=new MutationObserver(()=>{
   if(isReady()){observer.disconnect();void load();}
  });
  observer.observe(ready,{attributes:true,attributeFilter:['style']});
 }
 // React to changes in the durable signed intake; never auto-execute or
 // issue owner approvals while refreshing the informational readback.
 setInterval(()=>{if(isReady())void load();},120000);
})();
