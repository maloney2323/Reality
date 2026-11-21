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
 // A multi-job acceptance target is a test objective, not a new job,
 // second shift, model execution permission or new qualifying engine.
 const multiOriginal=node('section');
 multiOriginal.setAttribute('aria-label','Multi-original shift acceptance');
 const multiHeading=node('h4','Multi-original shift · acceptance');
 const multiSummary=node('p','Checking real business originals, independent evidence, and exact authority…');
 multiSummary.setAttribute('role','status');
 const multiSources=node('div');
 const internalProviderProof=node('section');
 internalProviderProof.setAttribute('aria-label','Internal company source provider readback');
 const internalProviderTitle=node('h4','Internal company source · live provider proof');
 const internalProviderStatus=node('p',
  'Reality is waiting for the existing signed worker to verify a live internal GitHub source. This is not a customer connection.');
 internalProviderStatus.setAttribute('role','status');
 const internalProviderItems=node('div');
 const internalProviderRefresh=node('button','Verify internal source receipt');
 internalProviderRefresh.type='button';
 internalProviderProof.append(internalProviderTitle,internalProviderStatus,
  internalProviderItems,internalProviderRefresh);
 const businessContract=node('section');
 businessContract.setAttribute('aria-label','Business source and executor proof');
 const contractHeading=node('h4','Five business work lanes · source & executor proof');
 const contractStatus=node('p','Checking independently verified source connections and registered executors…');
 contractStatus.setAttribute('role','status');
 const contractRows=node('div');
 businessContract.append(contractHeading,contractStatus,contractRows);
 const multiRefresh=node('button','Verify multi-job readiness');
 multiRefresh.type='button';
 multiOriginal.append(multiHeading,multiSummary,multiSources,internalProviderProof,businessContract,multiRefresh);
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
 root.append(heading,summary,multiOriginal,entries,exactReview,refresh,review,footer);
 panel.prepend(root);
 let active=null,loading=false,verified=null;
 const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
 const SHA=/^sha256:[a-f0-9]{64}$/;
 const ROUTE=/^reality:qualification:[a-f0-9]{64}$/;
 const APPROVAL_API='/api/reality/personal-qualified-chat-original-approval';
 let checkingExact=false,approvalUncertain=false,multiLoading=false,contractLoading=false,internalProviderLoading=false;
 const MULTI_PREFLIGHT='/api/reality/personal-multi-original-shift-preflight?target=5';
 const CONTRACT_PREFLIGHT='/api/reality/personal-business-original-admission-contract';
 const EXACT_EFFECT_PREFLIGHT='/api/reality/personal-business-effect-authority-preflight';
 const EFFECT_OWNER_APPROVAL='/api/reality/personal-exact-business-effect-approval';
 let verifiedBusinessClasses=[];
 const INTERNAL_PROOF_API='/api/reality/personal-internal-business-provider-proof';
 async function loadInternalCompanySourceProviderProof(){
  if(internalProviderLoading||!isReady())return;
  internalProviderLoading=true;internalProviderRefresh.disabled=true;
  try{
   const response=await fetch(INTERNAL_PROOF_API,{
    method:'GET',credentials:'same-origin',cache:'no-store',
    signal:AbortSignal.timeout(17000)});
   const r=await response.json().catch(()=>null);
   if(!response.ok||r?.ok!==true||
    r.status!=='OWNER_INTERNAL_BUSINESS_SOURCE_PROVIDER_PROOFS'||
    r.read_only!==true||r.internal_company_provider_only!==true||
    r.customer_source_connection_verified!==false||
    r.original_customer_job_completed!==false||
    r.owner_approval_granted!==false||
    r.model_execution_authorized!==false||
    !Number.isSafeInteger(r.provider_source_proof_count)||
    !Array.isArray(r.sources)||r.sources.length>8)
     throw Error('INTERNAL_COMPANY_PROVIDER_SOURCE_RECEIPT_UNVERIFIED');
   internalProviderStatus.textContent=r.provider_source_proof_count?
    String(r.provider_source_proof_count)+
    ' real internal repository source(s) re-read twice from the GitHub provider by Reality’s signed worker. No customer connection or executable original granted.' :
    'No real live internal provider source receipt yet. The signed worker must obtain and reconcile the provider readback; no customer job is approved.';
   internalProviderItems.replaceChildren();
   for(const source of r.sources.slice(0,4)){
    if(typeof source.source_title!=='string'||
      typeof source.source_ref!=='string'||source.execution_authorized!==false||
      source.provider_double_readback_proven!==true)continue;
    const card=node('p');card.className='reality-qualification-source';
    card.append(node('strong',source.source_title.slice(0,130)),
     node('small',' · '+String(source.provider_readback_current?'Current provider proof':'Provider proof stale; recheck source')),
     node('small',' · '+source.source_ref.slice(0,230)));
    internalProviderItems.append(card);
   }
  }catch{
   internalProviderStatus.textContent='Current internal company provider receipt unavailable. Do not infer a verified business connector or a new executable job.';
   internalProviderItems.replaceChildren();
  }finally{internalProviderLoading=false;internalProviderRefresh.disabled=false;}
 }
 internalProviderRefresh.addEventListener('click',()=>void loadInternalCompanySourceProviderProof());
 async function loadBusinessSourceExecutorContract(){
  if(contractLoading||!isReady())return;
  contractLoading=true;
  try{
   const response=await fetch(CONTRACT_PREFLIGHT,{
    method:'GET',credentials:'same-origin',cache:'no-store',
    signal:AbortSignal.timeout(18000)});
   const d=await response.json().catch(()=>null);
   if(!response.ok||d?.ok!==true||
    d.status!=='OWNER_BUSINESS_ORIGINAL_SOURCE_EXECUTOR_CONTRACT_READ_ONLY'||
    d.read_only!==true||d.requested_job_class_count!==5||
    d.owner_approval_granted!==false||d.model_execution_authorized!==false||
    d.new_shift_started!==false||d.installation_authorized!==false||
    d.source_observation_is_not_an_original!==true||
    d.approved_employee_list_is_not_an_execution_warrant!==true||
    d.itemized_originals_ready_for_exact_approval!==0||
    !Array.isArray(d.classes)||d.classes.length!==5)
     throw Error('BUSINESS_SOURCE_EXECUTOR_PROOF_UNVERIFIED');
   contractStatus.textContent=
    String(d.verified_owner_provider_source_connections)+
    ' verified business data connections · '+
    String(d.independently_verified_installed_business_executor_manifests)+
    ' independently verified installed business executor adapters · '+
    String(d.itemized_originals_ready_for_exact_approval)+
    ' real original jobs ready for exact itemized approval.';
   contractRows.replaceChildren();
   verifiedBusinessClasses=d.classes.map(x=>x.job_class)
    .filter(x=>/^[a-z][a-z0-9_-]{2,90}$/.test(x));
   for(const lane of d.classes){
    if(typeof lane.job_class!=='string'||lane.execution_authorized!==false||
     lane.itemized_authorization_ready!==false)return;
    const card=node('p');card.className='reality-qualification-source';
    const name=node('strong',lane.job_class.replaceAll('_',' '));
    const reason=node('small',' · '+String(lane.next_verified_evidence||'SOURCE_RECHECK_REQUIRED')
     .replaceAll('_',' '));
    card.append(name,reason);
    contractRows.append(card);
   }
   contractRows.append(node('p',
    'These are configurable work categories, not invented customer jobs. Each original still requires current connected source proof, owner goal, acceptance criteria, an independently verified installed executor, exact authority and independent completion.'));
  }catch{
   contractStatus.textContent=
    'Business source/executor contract unavailable. Do not infer installed connectors, customer jobs, approvals or an executable shift.';
   contractRows.replaceChildren();
  }finally{contractLoading=false;}
 }
 async function loadMultiOriginal(){
  if(multiLoading||!isReady())return;
  multiLoading=true;multiRefresh.disabled=true;
  try{
   const response=await fetch(MULTI_PREFLIGHT,{
    method:'GET',credentials:'same-origin',cache:'no-store',
    signal:AbortSignal.timeout(19000)});
   const data=await response.json().catch(()=>null);
   if(!response.ok||data?.ok!==true||
    data.status!=='OWNER_MULTI_ORIGINAL_SHIFT_INDEPENDENT_PREFLIGHT'||
    data.target_original_count!==5||data.read_only!==true||
    data.ready_to_start_multi_original_execution!==false||
    data.source_qualification_is_not_authority!==true||
    data.owner_approval_granted!==false||
    data.model_execution_authorized!==false||
    data.new_shift_started!==false||
    !Number.isSafeInteger(data.independently_qualified_originals_for_executor_preflight)||
    !Array.isArray(data.prioritized_source_preflight)||
    data.prioritized_source_preflight.length>20)
     throw Error('MULTI_ORIGINAL_ACCEPTANCE_READBACK_UNVERIFIED');
   multiSummary.textContent=
    String(data.independently_qualified_originals_for_executor_preflight)+
    ' of '+String(data.target_original_count)+
    ' proposed originals independently qualified for further governed checks; '+
    String(data.source_bound_originals)+' existing source-bound originals; '+
    String(data.independent_original_final_receipts)+
    ' independent final original receipts. '+String(data.readiness_reason||'').replaceAll('_',' ')+
    '. No blanket execution authority.';
   // Stage readback is built from the same signed owner-scoped source facts.
   // It never turns a model suggestion or maintenance warrant into approval.
   const stages=[
    'RAW_SIGNAL','TRANSFORMATION','OBSERVATION','SITUATION','WORK',
    'AUTHORITY','EXECUTION','VERIFICATION','OUTCOME','LEARNING','CAPABILITY'
   ];
   if(!Array.isArray(data.canonical_spine_sequence)||
     data.canonical_spine_sequence.join('|')!==stages.join('|')||
     !Array.isArray(data.original_stage_readbacks)||
     data.original_stage_readbacks.length!==data.prioritized_source_preflight.length||
     data.original_stage_readbacks.some((x,i)=>
      x?.continuity_ref!==data.prioritized_source_preflight[i].continuity_ref||
      x?.execution_authorized_by_projection!==false||
      x?.owner_approval_granted_by_projection!==false||
      x?.original_job_completed_by_projection!==false||
      x?.production_changed!==false||
      !Array.isArray(x.canonical_spine)||x.canonical_spine.length!==11||
      x.canonical_spine.some((y,j)=>y.stage!==stages[j])))
    throw Error('CANONICAL_ORIGINAL_STAGE_PROOF_UNVERIFIED');
   multiSources.replaceChildren();
   const details=data.prioritized_source_preflight;
   for(const [i,item] of details.slice(0,8).entries()){
    const card=node('p');
    card.className='reality-qualification-source';
    const title=node('strong',(item.employee?item.employee+' · ':'')+
     String(item.title||item.intake_family).slice(0,125));
    const blocker=node('small',' · '+String(item.acceptance_gate).replaceAll('_',' '));
    card.append(title,blocker);
    const spine=data.original_stage_readbacks[i];
    card.append(node('small',' · Next governed transition: '+
     String(spine.next_governed_action||'SOURCE_REVALIDATION_REQUIRED')
      .replaceAll('_',' ').slice(0,140)));
    const evidenceDetails=node('details');
    evidenceDetails.append(node('summary','View 11-stage original-work evidence'));
    for(const stage of spine.canonical_spine){
     evidenceDetails.append(node('p',stage.stage.replaceAll('_',' ')+' · '+
      String(stage.state).replaceAll('_',' ')));
    }
    card.append(evidenceDetails);
    // Each exact original can request a read-only consequence-classified
    // proof, but never an approval or a side-effect through this display.
    if(/^work:[a-f0-9]{32}$/.test(item.original_work_id||'')&&
       verifiedBusinessClasses.length){
     const scope=node('details');
     scope.append(node('summary','Check exact business-effect authority'));
     const jobClass=node('select'), effect=node('select');
     for(const name of verifiedBusinessClasses){
      const option=node('option',name.replaceAll('_',' '));option.value=name;
      jobClass.append(option);
     }
     for(const name of ['INTERNAL_READ','INTERNAL_DRAFT','CUSTOMER_SEND',
                         'MARKETING_PUBLISH','PROCUREMENT_COMMIT','FINANCIAL_COMMIT']){
      const option=node('option',name.replaceAll('_',' '));option.value=name;
      effect.append(option);
     }
     const check=node('button','Verify exact effect scope');check.type='button';
     const receipt=node('p','No action is authorized by this preflight.');
     receipt.setAttribute('role','status');
     const target=node('input');target.type='text';target.maxLength=450;
     target.placeholder='Exact recipient, destination or supplier';
     const payload=node('textarea');payload.rows=4;payload.maxLength=4000;
     payload.placeholder='Exact text or action to authorize';
     const stage=node('button','Prepare exact effect for owner approval');
     stage.type='button';stage.disabled=true;
     const approve=node('button','Approve exactly this one effect');
     approve.type='button';approve.disabled=true;approve.hidden=true;
     const ownerNote=node('p','No business effect approved or executed.');
     ownerNote.setAttribute('role','status');
     let frozen=null;
     async function effectPost(body){
      const r=await fetch(EFFECT_OWNER_APPROVAL,{method:'POST',credentials:'same-origin',
       cache:'no-store',headers:{'content-type':'application/json'},
       body:JSON.stringify(body),signal:AbortSignal.timeout(22000)});
      const x=await r.json().catch(()=>null);
      if(!r.ok||x?.ok!==true)throw Error(String(x?.next_gate||x?.status||'UNVERIFIED').slice(0,140));
      if(x.effect_executed!==false||x.original_job_completed!==false||
         x.production_changed!==false||x.new_shift_started!==false)
       throw Error('EFFECT_AUTHORITY_SCOPE_UNVERIFIED');
      return x;
     }
     stage.addEventListener('click',async()=>{
      stage.disabled=true;approve.disabled=true;approve.hidden=true;
      const proposedTarget=target.value.trim(),proposedText=payload.value;
      const chosenClass=jobClass.value,chosenEffect=effect.value;
      try{
       const p=await effectPost({action:'PREPARE_EXACT_BUSINESS_EFFECT',
        original_work_id:item.original_work_id,job_class:chosenClass,
        effect_type:chosenEffect,target_ref:proposedTarget,payload_text:proposedText});
       if(p.status!=='EXACT_BUSINESS_EFFECT_OWNER_REVIEW_STAGED'||
          p.original_work_id!==item.original_work_id||
          p.job_class!==chosenClass||p.effect_type!==chosenEffect||
          p.target_ref!==proposedTarget||p.owner_approval_ready!==true||
          p.authorization_scope!=='EXACT_ONE_USE_EFFECT_ONLY'||
          p.execution_started!==false||
          !UUID.test(p.packet_id||'')||!SHA.test(p.proposal_fingerprint||''))
        throw Error('EXACT_PACKET_UNVERIFIED');
       frozen=p;
       target.disabled=true;payload.disabled=true;jobClass.disabled=true;effect.disabled=true;
       ownerNote.textContent='Review exact target: '+proposedTarget+' · Exact content: '+
        proposedText+' · Your next click authorizes this one effect, not execution.';
       approve.disabled=false;approve.hidden=false;
      }catch(e){
       ownerNote.textContent='Exact packet not ready: '+
        String(e?.message||'PROOF_MISSING').replaceAll('_',' ').slice(0,150)+
        '. Nothing has been approved or performed.';
       stage.disabled=false;
      }
     });
     approve.addEventListener('click',async()=>{
      if(!frozen||approve.disabled)return;
      approve.disabled=true;
      ownerNote.textContent='Recording owner authorization; no effect executing.';
      try{
       const receipt=await effectPost({action:'APPROVE_EXACT_BUSINESS_EFFECT',
        packet_id:frozen.packet_id,proposal_fingerprint:frozen.proposal_fingerprint,
        approval_request_id:crypto.randomUUID()});
       if(receipt.status!=='EXACT_BUSINESS_EFFECT_OWNER_APPROVED_ONE_USE'||
          receipt.packet_id!==frozen.packet_id||
          receipt.itemized_owner_approval_recorded!==true||
          receipt.execution_started!==false||
          receipt.provider_effect_performed!==false||
          !SHA.test(receipt.approval_receipt_sha256||''))
        throw Error('OWNER_APPROVAL_READBACK_UNVERIFIED');
       ownerNote.textContent='One-use owner approval recorded. Only Reality’s signed worker may reserve it; provider execution and independent final verification are still required.';
      }catch{
       ownerNote.textContent='Approval result uncertain: check the existing receipt. Do not retry without reconciling.';
      }
     });
     check.addEventListener('click',async()=>{
      check.disabled=true;
      receipt.textContent='Rechecking canonical original, owner warrant, source, executor and authority…';
      try{
       const url=EXACT_EFFECT_PREFLIGHT+'?original_work_id='+
        encodeURIComponent(item.original_work_id)+'&job_class='+
        encodeURIComponent(jobClass.value)+'&effect_type='+
        encodeURIComponent(effect.value);
       const response=await fetch(url,{method:'GET',credentials:'same-origin',
        cache:'no-store',signal:AbortSignal.timeout(18000)});
       const r=await response.json().catch(()=>null);
       if(!response.ok||r?.ok!==true||r.read_only!==true||
          r.original_work_id!==item.original_work_id||
          r.job_class!==jobClass.value||r.effect_type!==effect.value||
          r.execution_authorized!==false||
          r.itemized_approval_granted!==false||
          r.original_job_completed_by_read!==false||
          r.new_shift_started!==false||r.production_changed!==false||
          typeof r.next_gate!=='string')throw Error('EFFECT_SCOPE_UNVERIFIED');
       const reviewable=r.canonical_original_admission_verified===true&&
         r.canonical_source_current===true&&
         r.consented_business_provider_verified===true&&
         r.registered_executor_independently_verified===true&&
         r.independent_final_original_already_present===false&&
         r.execution_claim_created===false&&
         r.owner_review_before_execution_claim===true;
       stage.disabled=!reviewable;
       receipt.textContent=(reviewable?'Exact source, goal, provider and adapter verified. Owner review required · ':'Blocked · ')+
        r.next_gate.replaceAll('_',' ')+
        '. No execution, publication or purchase authorized.';
      }catch{
       receipt.textContent='Exact business effect scope is unverified; nothing has been authorized or executed.';
      }finally{check.disabled=false;}
     });
     scope.append(jobClass,effect,check,receipt,target,payload,stage,approve,ownerNote);
     card.append(scope);
    }
    multiSources.append(card);
   }
   if(!details.length)multiSources.append(node('p','No qualified source candidates in the current signed worker readback.'));
  }catch{
   multiSources.replaceChildren();
   multiSummary.textContent='Independent multi-job preflight unavailable. No customer jobs, owner permissions or final receipts can be inferred.';
  }finally{multiLoading=false;multiRefresh.disabled=false;}
 }
 multiRefresh.addEventListener('click',()=>void loadMultiOriginal());
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
      SHA.test(p.approval_receipt_sha256||'')&&
      p.canonical_chat_original_readback_verified===true){
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
   void loadMultiOriginal();
   void loadBusinessSourceExecutorContract();
   void loadInternalCompanySourceProviderProof();
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
