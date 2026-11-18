/* One Reality interface across Home, Employees, Work, Shifts, Chat and Value.
 * Reuses the ORIGINAL DOM nodes, session, authorization handlers, receipts and
 * backend endpoints. Never duplicates an employee, job, shift or receipt.
 */
(()=>{
 'use strict';
 const path=window.location.pathname;
 const routes={'/':'home','/overview':'home','/employees':'employees','/work':'work',
  '/shifts':'shifts','/chat':'chat','/value':'value',
  '/connections':'connections'};
 const route=routes[path];if(!route||document.getElementById('realityUnifiedRail'))return;
 const get=id=>document.getElementById(id);
 const n=(tag,cls,text)=>{
  const el=document.createElement(tag);
  if(cls)el.className=cls;
  if(text!==undefined)el.textContent=text;return el;
 };
 const entries=[
  {key:'home',label:'Overview',url:'/overview',symbol:'⌂'},
  {key:'employees',label:'Employees',url:'/employees',symbol:'♧'},
  {key:'work',label:'Work',url:'/work',symbol:'▣'},
  {key:'shifts',label:'Shifts',url:'/shifts',symbol:'▦'},
  {key:'chat',label:'Home · Chat',url:'/chat',symbol:'▤'},
  {key:'value',label:'ROI & receipts',url:'/value',symbol:'▥'},
  {key:'connections',label:'Connections',url:'/connections',symbol:'⌁'}
 ];
 function navLink(entry,kind){
  const a=n('a','rx-nav-link',undefined);a.href=entry.url;
  if(entry.key===route)a.setAttribute('aria-current','page');
  a.append(n('span','rx-nav-icon',entry.symbol),n('span','rx-nav-label',entry.label));
  if(kind==='mobile'&&entry.key==='value')a.querySelector('.rx-nav-label').textContent='Value';
  if(kind==='mobile'&&entry.key==='connections')a.querySelector('.rx-nav-label').textContent='Connect';
  return a;
 }
 const rail=n('nav','rx-nav-rail');rail.id='realityUnifiedRail';
 rail.setAttribute('aria-label','Reality main navigation');
 const identity=n('div','rx-brand');
 identity.append(n('strong','','REALITY'),n('small','','PERSONAL OPERATIONAL INTELLIGENCE'));
 rail.append(identity);
 for(const e of entries)rail.append(navLink(e,'desktop'));
 const foot=n('div','rx-nav-foot',
  'Discover · Review · Authorize · Verify');
 rail.append(foot);
 document.body.append(rail);
 const bottom=n('nav','rx-nav-mobile');bottom.id='realityUnifiedMobileNav';
 bottom.setAttribute('aria-label','Reality mobile navigation');
 for(const e of entries.filter(x=>x.key!=='shifts'))bottom.append(navLink(e,'mobile'));
 document.body.append(bottom);
 document.body.classList.add('reality-unified-ui');
 // Only reusable, existing source-owned nodes are moved. No cloneNode:
 // controls retain their original event handlers and unique IDs.
 const main=document.querySelector('main');
 const top=main?.querySelector('.top');
 const hub=route==='employees'?'Your AI workforce':route==='work'?'Work Center':
  route==='shifts'?'Shifts & approvals':route==='value'?'Verified value':
  route==='connections'?'Business connections':
  route==='chat'?'Reality Chat':'Command Center';
 if(top){
  const eyebrow=n('span','rx-top-section',hub);
  top.insertBefore(eyebrow,top.querySelector('#accountShortcut'));
 }
 // The full Past/Present/Future Matrix is the HOME command perspective.
 // Other pages may read the SAME evidence through their own role-specific UI,
 // but do not render an identical full-size timeline on every destination.
 // This changes presentation only: owner ledgers, worker discovery and
 // governance remain shared and unchanged.
 if(route==='home'&&top&&main){
  const timeline=n('section','rx-time-horizon');
  timeline.id='realityTimeHorizon';
  timeline.setAttribute('aria-label','Reality Past Present Future');
  timeline.hidden=true; // Visible only after the timeline controller mounts.
  top.insertAdjacentElement('afterend',timeline);
 }
 if(route==='employees'){
  const team=get('realityHomeEmployees');
  const directory=team?.closest('.rc-role-directory');
  if(directory)directory.open=true;
  const title=get('realityCommandHeadline');
  if(title)title.textContent='Your AI Workforce';
 }else if(route==='shifts'){
  const view=n('section','rx-route-view rx-shift-view');
  view.id='realityUnifiedView';
  view.append(n('p','rx-eyebrow','REALITY · GOVERNED EXECUTION'),
   n('h1','','One shift. One verified work cycle.'),
   n('p','rx-route-lead',
    'Review source-backed work and the current authorization state. A draft is not an active shift; no button on this page starts duplicate work.'));
  const nav=n('div','rx-quick-actions');
  for(const [text,url] of [
   ['Review work sources','/work'],['Ask Reality about this shift','/chat'],
   ['Verified value & receipts','/value#results']
  ]){const a=n('a','rx-action',text);a.href=url;nav.append(a);}
  view.append(nav);
  const sections=[
   ['realityShiftHomeBrief','LIVE SHIFT · SOURCE READBACK'],
   ['realityEmployeeShiftPlanner','EXISTING GOVERNED SHIFT PLAN'],
   ['realityHomeWorkday','DISCOVERED WORK · REQUIRES QUALIFICATION']
  ];
  let mounted=0;
  for(const [id,label] of sections){
   const existing=get(id);
   if(!existing)continue;
   const card=n('section','rx-shift-card');
   card.append(n('div','rx-eyebrow',label),existing);
   view.append(card);mounted++;
  }
  if(!mounted)view.append(n('p','rx-empty',
   'Original shift readback is unavailable. No active work or completed shift inferred.'));
  if(top)(get('realityTimeHorizon')||top).insertAdjacentElement('afterend',view);
 }else if(route==='connections'){
  const view=n('section','rx-route-view rx-connections-view');
  view.id='realityUnifiedView';
  view.append(n('p','rx-eyebrow','REALITY · BUSINESS CONNECTIONS'),
   n('h1','','Connect your business. Give your employees real work.'),
   n('p','rx-route-lead',
    'Reality should discover work from the systems your business actually uses. Existing source observations and provider authentication are distinct. Every service needs its own verified owner permissions before use.'));
  const links=n('div','rx-quick-actions');
  for(const [label,url] of [['Your AI workforce','/employees'],
   ['See discovered work','/work']]){
   const link=n('a','rx-action',label);link.href=url;links.append(link);
  }
  view.append(links);
  const board=n('div','');board.id='realityOwnerConnections';
  view.append(board);
  const caution=n('p','rx-route-lead',
   'Connections shown here are Reality-owned. ChatGPT plugins do not transfer their tokens. Stripe, Gmail and other providers must have a secure Reality-owned setup before their data can be used; no money movement or external message sends are authorized from this screen.');
  view.append(caution);
  if(top)(get('realityTimeHorizon')||top).insertAdjacentElement('afterend',view);
 }else if(route==='work'){
  const intro=n('section','rx-route-view rx-work-intro');
  intro.id='realityUnifiedView';
  intro.append(n('p','rx-eyebrow','REALITY · SOURCE-BACKED WORK'),
   n('h1','','Work Reality discovered'),
   n('p','rx-route-lead',
    'Investigate current source observations, inspect unfinished work, and review exact authorizations. Only independently verified receipts establish completion.'));
  const bar=n('div','rx-quick-actions');
  for(const [text,url] of [
   ['Review a shift','/shifts'],
   ['Discuss work in Chat','/chat'],
   ['See independently verified receipts','/value#results']
  ]){const a=n('a','rx-action',text);a.href=url;bar.append(a);}
  intro.append(bar);
  if(top)(get('realityTimeHorizon')||top).insertAdjacentElement('afterend',intro);
 }
 // A single app-wide account state label. Only a verified server response
 // may mark the existing signed-in session as authenticated.
 const ready=get('privateReady');
 const status=get('accountShortcut');
 if(status&&ready&&typeof MutationObserver==='function'){
  const update=()=>{
   document.body.classList.toggle('rx-owner-authenticated',
    ready.style.display==='block');
  };
  new MutationObserver(update).observe(ready,
   {attributes:true,attributeFilter:['style']});
  update();
 }
})();
