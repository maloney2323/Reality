/* Reality · Capabilities, an employee-adjacent view over existing owner
   capability evidence and an explicit, expiring routine-work delegation. */
(()=>{
 'use strict';
 if(window.location.pathname!=='/')return;
 const stage=document.querySelector('#realityHomeCommand .rc-stage');
 if(!stage||document.getElementById('realityCapabilities'))return;
 const make=(tag,cls,text)=>{
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(text!==undefined)node.textContent=text;
  return node;
 };
 const section=make('section','rc-capabilities');
 section.id='realityCapabilities';
 section.setAttribute('aria-label','Capability opportunities and routine employee autonomy');
 const head=make('div','rc-cap-head');
 const textHead=make('div');
 textHead.append(make('span','rc-eyebrow','EMPLOYEE WORK · CAPABILITY INVESTIGATIONS'),
  make('h2','','Capabilities'),
  make('p','rc-cap-description',
   'Existing upgrades and missing capabilities, investigated by your AI workforce. Nothing is assigned or executable until its proof and authority are verified.'));
 head.append(textHead);
 const refresh=make('button','rc-outline rc-cap-refresh','Refresh evidence');
 refresh.type='button';
 head.append(refresh);section.append(head);
 const metrics=make('div','rc-cap-metrics');
 const stats={};
 for(const [k,title] of [['candidates','Discovered candidates'],
  ['gaps','Verified current gaps'],['queue','Active capability queue'],
  ['tested','Historically tested']]){
  const card=make('div','rc-cap-stat');
  card.append(make('span','',title));
  const value=make('strong','','—');stats[k]=value;card.append(value);
  metrics.append(card);
 }
 section.append(metrics);
 const autonomy=make('div','rc-cap-autonomy');
 const autonomyLeft=make('div');
 autonomyLeft.append(make('strong','','Routine autonomy'),
  make('p','',
   'Permit independent source checks and AI investigation receipts within the existing owner scope. Expires after 30 days; maximum 12 investigations per day. No deploys, purchases, customer messages, external writes, or new execution warrants.'));
 const state=make('p','rc-cap-grant-state','Checking owner delegation…');
 autonomyLeft.append(state);
 const toggle=make('button','rc-outline rc-cap-toggle','Enable routine discovery');
 toggle.type='button';toggle.disabled=true;
 autonomy.append(autonomyLeft,toggle);section.append(autonomy);
 const list=make('div','rc-cap-list');
 const notice=make('p','rc-cap-notice','Checking verified capability evidence…');
 section.append(notice,list);
 const queue=stage.querySelector('.rc-queue');
 if(queue)stage.insertBefore(section,queue);else stage.append(section);
 let latest=null,loading=false;
 const formatDate=s=>{
  if(!s)return 'Not active';
  const d=new Date(s);
  return Number.isFinite(d.getTime())?d.toLocaleDateString():'Unverified';
 };
 const refreshUI=async()=>{
  if(loading)return;
  loading=true;refresh.disabled=true;toggle.disabled=true;
  try{
   const response=await fetch('/api/reality/personal-capabilities',{
    method:'GET',credentials:'same-origin',cache:'no-store',
    signal:AbortSignal.timeout(20000)
   });
   const data=await response.json().catch(()=>null);
   if(response.status===401){
    notice.textContent='Sign in to Reality to view owner-scoped capabilities. Use Refresh evidence after signing in.';
    return;
   }
   if(!response.ok||data?.ok!==true||
      data.status!=='OWNER_CAPABILITY_AND_ROUTINE_DELEGATION_WORKSPACE'||
      data.owner_scope_verified!==true||data.read_only!==true||
      data.jobs_created_by_read!==0||data.production_changed!==false||
      !Array.isArray(data.items)||data.items.length>20||
      data.candidate_count!==data.items.length||
      data.items.some(x=>x.executable_job!==false||
       x.execution_authorized!==false||x.installation_authorized!==false))
    throw Error('CAPABILITY_READBACK_NOT_OWNER_VERIFIED');
   latest=data;
   stats.candidates.textContent=String(data.candidate_count);
   stats.gaps.textContent=String(data.verified_current_gaps);
   stats.queue.textContent=String(data.active_capability_queue);
   stats.tested.textContent=String(data.independently_tested_candidates);
   const grant=data.standing_delegation;
   state.textContent=grant.active?
    'Enabled for verified evidence-only investigations · '+
    grant.today_reserved+' / '+grant.max_daily_inquiries+
    ' daily reservations · Expires '+formatDate(grant.expires_at):
    'Paused or expired · No background model investigations are delegated';
   toggle.textContent=grant.active?'Pause routine discovery':'Enable routine discovery';
   notice.textContent=data.candidate_count?
    data.candidate_count+' evidence-backed opportunities · No invented effort estimates or automatic installation approval.':
    'No capability candidates in the current owner ledger.';
   list.replaceChildren();
   for(const item of data.items){
    const card=make('article','rc-cap-item');
    const upper=make('div','rc-cap-item-top');
    upper.append(make('strong','',item.title),
     make('span','rc-cap-phase',item.stage.replaceAll('_',' ').toLowerCase()));
    card.append(upper);
    if(item.potential_value)
     card.append(make('p','',item.potential_value));
    const info=make('div','rc-cap-meta');
    info.append(make('span','',
     'Employee: awaiting evidence-based assignment'),
     make('span','','Estimated hours: not yet scoped'),
     make('span','',
      'Latest source observation: '+formatDate(item.last_seen_at)));
    card.append(info);
    const details=make('details','rc-cap-proof');
    details.append(make('summary','','Evidence and next independent proof'));
    if(item.next_proof)details.append(make('p','',item.next_proof));
    if(item.source_url&&/^https:\/\//.test(item.source_url)){
     const link=make('a','','Open source');
     link.href=item.source_url;link.target='_blank';
     link.rel='noopener noreferrer';details.append(link);
    }
    card.append(details);list.append(card);
   }
  }catch{
   notice.textContent='Capability or owner delegation readback is unavailable. No authority or job inferred.';
  }finally{
   loading=false;refresh.disabled=false;toggle.disabled=!latest;
  }
 };
 refresh.addEventListener('click',()=>{void refreshUI()});
 toggle.addEventListener('click',async()=>{
  if(loading||!latest)return;
  const active=latest.standing_delegation.active;
  if(!active&&!window.confirm(
   'Enable Reality to independently investigate verified source observations using the existing AI model, up to 12 inquiries per day for 30 days? This does NOT authorize deployments, spending, customer messages, installations or executable jobs.'
  ))return;
  loading=true;toggle.disabled=true;refresh.disabled=true;
  state.textContent='Checking exact owner grant and independent readback…';
  try{
   const response=await fetch('/api/reality/personal-capabilities',{
    method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({action:active?
     'PAUSE_ROUTINE_DISCOVERY':'ENABLE_ROUTINE_DISCOVERY'}),
    signal:AbortSignal.timeout(20000)
   });
   const data=await response.json().catch(()=>null);
   if(!response.ok||data?.ok!==true||
      data.standing_delegation?.owner_scope_verified!==true||
      data.execution_authorized!==false||
      data.installation_authorized!==false||
      data.production_changed!==false)
    throw Error('STANDING_GRANT_PROOF_REQUIRED');
   state.textContent=active?'Routine discovery paused.':'Routine discovery enabled within the evidence-only scope.';
  }catch{
   state.textContent='Could not verify that the setting changed. Check the authenticated readback.';
  }finally{
   loading=false;refresh.disabled=false;toggle.disabled=false;
   void refreshUI();
  }
 });
 void refreshUI();
})();
