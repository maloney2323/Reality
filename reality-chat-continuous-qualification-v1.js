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
 const refresh=node('button','Refresh qualification');
 refresh.type='button';
 const review=node('button','Discuss next qualification in Chat');
 review.type='button';review.disabled=true;
 const footer=node('p','Evidence intake is not executable work. A specific, current, independently qualified job must be presented through the existing governed owner approval flow.');
 root.append(heading,summary,entries,refresh,review,footer);
 panel.prepend(root);
 let active=null,loading=false,verified=null;
 function isReady(){return ready.style.display==='block';}
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
    node('small','Continuity receipt: '+x.continuity_ref.slice(0,35)+'…'):
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
