// Reality time navigation v1: elevate the EXISTING .reality-matrix into the
// Home hero and reuse its three original matrix counts / cards. The numbers
// come from independent owner-scoped receipts, shifts and discovery readbacks.
(()=>{
 'use strict';
 const host=document.getElementById('realityTimeHorizon');
 const matrix=document.querySelector('.reality-matrix');
 if(!host||!matrix||matrix.dataset.timeHorizonMounted==='true')return;
 const ready=document.getElementById('privateReady');
 const signed=()=>ready?.style.display==='block';
 const get=id=>document.getElementById(id);
 const countIds=['matrixPastCount','matrixPresentCount','matrixFutureCount'];
 const cards=[...matrix.querySelectorAll('.matrix-card')];
 if(cards.length!==3||countIds.some(x=>!get(x)))return;
 matrix.dataset.timeHorizonMounted='true';
 host.append(matrix);host.hidden=false;
 const head=matrix.querySelector('.matrix-head');
 const intro=head?.querySelector('.label');
 if(intro)intro.textContent='REALITY · ONE CONTINUOUS OPERATING HISTORY';
 const title=head?.querySelector('h2');
 if(title)title.textContent='Past · Present · Future';
 const tag=head?.querySelector('.badge');
 if(tag)tag.textContent='Evidence → Action → Next';
 const make=(tag,cls,content)=>{
  const e=document.createElement(tag);
  if(cls)e.className=cls;
  if(content!==undefined)e.textContent=content;
  return e;
 };
 const descriptions=[
  'Verified history and final receipts',
  'Active work and decisions needing attention',
  'Discovered opportunities requiring qualification'
 ];
 const destinations=[
  {href:'/value#results',text:'Review verified history'},
  {href:'/shifts',text:'Inspect present work'},
  {href:'/employees',text:'Review upcoming work'}
 ];
 cards.forEach((card,i)=>{
  card.dataset.timeView=['past','present','future'][i];
  const p=card.querySelector('p');
  if(p)p.textContent=descriptions[i];
  const link=make('a','rx-time-destination',destinations[i].text);
  link.href=destinations[i].href;
  link.setAttribute('aria-label',destinations[i].text);
  card.append(link);
 });
 const subtitle=make('p','rx-time-context',
  'Past is independently verified. Present requires current execution proof. Future is not automatically authorized.');
 matrix.append(subtitle);
 const foot=make('div','rx-time-footer');
 const status=make('p','rx-time-status',
  'Sign in to see your verified work across time.');
 status.setAttribute('role','status');
 status.setAttribute('aria-live','polite');
 const refresh=make('button','rx-time-refresh','Refresh reality');
 refresh.type='button';
 const executive=make('p','rx-time-executive',
  'Executive priorities await independently verified Final Loop evidence.');
 executive.setAttribute('aria-label','Reality executive operational briefing');
 foot.append(status,refresh);matrix.append(foot,executive);
 let generation=0,busy=false;
 function unknown(message){
  executive.textContent=
   'Executive priorities unavailable until the owner evidence is verified.';
  generation++;
  for(const id of countIds)get(id).textContent='—';
  for(const card of cards){
   card.dataset.evidence='unverified';
   card.querySelector('.rx-time-state')?.remove();
  }
  status.textContent=message;
 }
 function state(card,text){
  card.querySelector('.rx-time-state')?.remove();
  const note=make('span','rx-time-state',text);
  card.append(note);
 }
 const isNonnegInt=x=>Number.isSafeInteger(x)&&x>=0;
 function apply(data){
  if(!data||data.ok!==true||
   data.status!=='REALITY_OWNER_TIME_HORIZON_READ_ONLY'||
   data.owner_scope_verified!==true||data.read_only!==true||
   data.approved_new_work_by_read!==false||
   data.shift_started_by_read!==false||
   data.deployment_changed_by_read!==false||
   data.billing_changed_by_read!==false||
   data.new_jobs_created_by_read!==0||
   data.verified_cash_savings_usd!==null||
   !Number.isFinite(Date.parse(data.checked_at||'')))return false;
  let verified=0;
  const past=data.past;
  if(past?.status==='INDEPENDENT_HISTORY_VERIFIED'&&
   isNonnegInt(past.verified_final_loop_receipts)&&
   past.verified_final_loop_receipts<=30&&
   past.receipt_scope==='INDEPENDENT_SETTLED_FULL_LOOP_ONLY'&&
   past.owner_can_review_at==='/value#results'&&
   (past.most_recent_verified_at===null||
    Number.isFinite(Date.parse(past.most_recent_verified_at)))){
   get('matrixPastCount').textContent=String(past.verified_final_loop_receipts);
   cards[0].dataset.evidence='verified';
   state(cards[0],'Independent final-loop receipts');
   verified++;
  }
  const present=data.present;
  if(present?.status==='OWNER_SHIFT_HISTORY_READBACK_VERIFIED'&&
   isNonnegInt(present.active_shift_count)&&
   present.active_shift_count<=5&&
   isNonnegInt(present.last_five_shift_count)&&
   present.last_five_shift_count<=5&&
   present.active_shift_count<=present.last_five_shift_count&&
   present.shift_history_is_not_active_execution===true&&
   present.owner_can_review_at==='/shifts'&&
   (present.active_shift_count===0&&present.active_shift_status===null||
    present.active_shift_count>0&&
    ['QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK'].includes(
     present.active_shift_status))&&
   (present.latest_shift_status===null||
    ['QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK',
     'ENDED_WITH_BLOCKED_WORK','ENDED_WITH_VERIFIED_JOB',
     'ENDED_READ_ONLY','ESCALATED'].includes(present.latest_shift_status))){
   get('matrixPresentCount').textContent=String(present.active_shift_count);
   cards[1].dataset.evidence='verified';
   state(cards[1],present.active_shift_count>0?
    'Active authorized shift(s)':'No active shift verified');
   verified++;
  }
  const future=data.future;
  if(future?.status==='OWNER_DISCOVERY_OBSERVATIONS_VERIFIED'&&
   isNonnegInt(future.review_observations_needing_current_proof)&&
   isNonnegInt(future.historical_observations_needing_refresh)&&
   isNonnegInt(future.settled_observations_not_to_replay)&&
   isNonnegInt(future.employee_roles_with_source_lenses)&&
   future.employee_roles_total===8&&
   future.employee_roles_with_source_lenses<=8&&
   future.review_observations_needing_current_proof+
    future.historical_observations_needing_refresh+
    future.settled_observations_not_to_replay<=150&&
   future.qualified_executable_jobs===0&&
   future.observations_are_not_authorized_work===true&&
   typeof future.snapshot_stale==='boolean'&&
   Number.isFinite(Date.parse(future.source_checked_at||''))&&
   future.owner_can_review_at==='/employees'){
   const fresh=!future.snapshot_stale;
   get('matrixFutureCount').textContent=fresh?
    String(future.review_observations_needing_current_proof):'—';
   cards[2].dataset.evidence=fresh?'verified':'stale';
   state(cards[2],fresh?
    'Needs current proof · '+future.historical_observations_needing_refresh+
     ' historical to refresh · '+future.settled_observations_not_to_replay+
     ' settled withheld':
    'Evidence snapshot is stale · refresh discovery before using counts');
   if(fresh)verified++;
  }
  status.textContent=verified===3?
   'All three time horizons checked against Reality’s actual owner records. '+
   'A discovery observation is not an authorized job or measured savings.':
   verified+' of 3 time horizons verified. Missing or stale evidence is not inferred to be work.';
  // The new CEO-style executive brief uses the same owner-authorized
  // read-only source projection. It never changes the original three
  // counts, promotes a prediction, or approves executable work.
  const time=data.final_loop_owner;
  const brief=time?.executive;
  if(time?.status==='FINAL_LOOP_OWNER_TIME_AND_EXECUTIVE_EVIDENCE_READY'&&
     time.owner_scope_verified===true&&time.read_only===true&&
     time.original_job_completed===false&&
     time.external_execution_authorized===false&&
     brief?.status==='EXECUTIVE_SIGNED_SHIFT_PRIORITIES_READY'&&
     brief.read_only===true&&brief.decision_support_only===true&&
     brief.execution_authorized===false&&
     brief.original_job_completed===false&&
     Number.isSafeInteger(brief.priority_count)&&
     brief.priority_count>=0&&brief.priority_count<=4&&
     brief.priority_count===time.time_horizon?.present?.obligations?.length){
   const needsAcceptance=brief.priority_items?.some(x=>
    x.independent_original_acceptance_pending===true);
   const native=brief.priority_native_diagnostic;
   const nativeStatus=brief.priority_native_diagnostic_authorizes_nothing===true&&
    typeof native==='string'&&/^[A-Z][A-Z0-9_]{6,130}$/.test(native)?
    ' Native source next check: '+native.replaceAll('_',' ').toLowerCase()+'.':
    '';
   // Canonical proposed scopes are shown only as unfinished Present
   // evidence; never increase Past receipts or Future executable jobs.
   const sourcePlans=data.final_loop_source_plans;
   const scoped=sourcePlans?.status===
    'FINAL_LOOP_SAME_OWNER_PENDING_SOURCE_PLANS_VERIFIED_READ_ONLY'&&
    sourcePlans.owner_scope_verified===true&&
    sourcePlans.read_only===true&&
    sourcePlans.execution_authorized===false&&
    sourcePlans.child_originals_admitted===0&&
    sourcePlans.original_job_completed===false&&
    sourcePlans.shift_id===time.shift_id&&
    Array.isArray(sourcePlans.plans)&&sourcePlans.plans.length<=32&&
    sourcePlans.plans.every(p=>p.child_originals_admitted===0&&
     p.independent_source_review_verified===false&&
     p.owner_acceptance_verified===false&&
     brief.priority_items.some(j=>j.source_ref===p.source_ref&&
      j.original_work_id===(p.parent_original_work_id??null)));
   const sourceNote=scoped&&sourcePlans.plans.length?
    ' Source review planning: '+sourcePlans.plans.length+
    ' frozen manifest(s), '+sourcePlans.plans.reduce(
     (sum,p)=>sum+p.proposed_scope_count,0)+
    ' proposed bounded review scopes; none admitted or executed.':'';
   executive.textContent='Executive briefing · '+brief.priority_count+
    ' current obligation(s). '+
    (needsAcceptance?
     'Customer-goal acceptance still needs independent proof.':
     'Inspect the governed next step before authorizing any effect.')+
    nativeStatus+sourceNote+' This read does not authorize execution.';
  }else{
   executive.textContent=
    'Executive briefing · Final Loop owner proof view not yet verified. Existing Past, Present and Future remain read-only.';
  }
  // Genuine parent outcomes are projected independently from the same
  // signed Universe + native original receipt, NEVER from a model verdict.
  const outcomes=data.final_loop_parent_outcomes;
  const independentlyVerifiedOutcomes=outcomes?.status===
   'FINAL_LOOP_SAME_OWNER_PARENT_OUTCOMES_INDEPENDENTLY_READ'&&
   outcomes.owner_scope_verified===true&&outcomes.read_only===true&&
   outcomes.execution_authorized===false&&
   Array.isArray(outcomes.outcomes)&&outcomes.outcomes.length<=16&&
   Number.isSafeInteger(outcomes.verified_parent_count)&&
   Number.isSafeInteger(outcomes.unfinished_parent_count)&&
   outcomes.verified_parent_count+outcomes.unfinished_parent_count===
    outcomes.outcomes.length&&
   outcomes.outcomes.every(x=>x.independent_universe_verified===
    x.original_job_completed&&
    (x.original_job_completed?
     x.status==='INDEPENDENTLY_SETTLED_UNIVERSE_PAST':
     x.status==='PARENT_DELIVERY_UNFINISHED_PRESENT'));
  if(independentlyVerifiedOutcomes&&outcomes.outcomes.length){
   executive.textContent+=' Final Loop verified return: '+
    outcomes.verified_parent_count+
    ' original(s) independently settled in Universe (Past); '+
    outcomes.unfinished_parent_count+
    ' parent deliverable(s) still open (Present). '+
    'No predicted Future work is automatically authorized.';
  }
  return true;
 }
 async function load(){
  if(!signed()){
   unknown('Sign in to see your verified work across time.');
   return;
  }
  if(busy)return;
  busy=true;const epoch=++generation;
  for(const id of countIds)get(id).textContent='—';
  for(const card of cards){
   card.dataset.evidence='unverified';
   card.querySelector('.rx-time-state')?.remove();
  }
  status.textContent='Reading your actual receipts, shifts and discovery…';
  refresh.disabled=true;
  try{
   const r=await fetch('/api/reality/personal-time-horizon',{
    method:'GET',credentials:'same-origin',cache:'no-store',
    signal:AbortSignal.timeout(16000)});
   const data=await r.json().catch(()=>null);
   if(epoch!==generation||!signed())return;
   if(!r.ok||!apply(data))throw Error('OWNER_TIME_READBACK_UNVERIFIED');
  }catch{
   if(epoch===generation&&signed())
    unknown('Reality could not verify the time views. No work, completion or savings inferred.');
  }finally{
   busy=false;refresh.disabled=false;
  }
 }
 refresh.addEventListener('click',()=>{void load()});
 if(ready&&typeof MutationObserver==='function')
  new MutationObserver(()=>{
   if(signed())void load();
   else unknown('Signed out. Past, Present and Future have been cleared.');
  }).observe(ready,{attributes:true,attributeFilter:['style']});
 void load();
})();
