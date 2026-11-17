/* Reality Home Command Center v1.
 * Reuses existing authenticated read-only Home sources and shift controls.
 * Presentation-only: no new fetching, model calls, shifts, approval or ROI claims.
 */
(()=>{
 'use strict';
 if(!['/','/employees','/shifts'].includes(window.location.pathname))return;
 const $=id=>document.getElementById(id);
 const home=$('realitySimpleHome'),team=$('realityHomeEmployees'),economic=$('simpleEconomicEvidenceDashboard');
 if(!home||!team||!economic||$('realityHomeCommand'))return;
 const el=(tag,cls,text)=>{
  const n=document.createElement(tag);if(cls)n.className=cls;
  if(text!==undefined)n.textContent=text;return n;
 };
 const a=(text,href,cls)=>{const n=el('a',cls,text);n.href=href;return n};
 const head=(eye,title)=>{
  const w=el('div','rc-heading');w.append(el('span','rc-eyebrow',eye),el('h2','',title));return w;
 };
 // This is the same original economic/shift planner, now disclosed on demand.
 const details=el('details','rc-evidence');details.id='realityHomeExistingEvidence';
 details.append(el('summary','','Detailed evidence, shift planning & existing controls'));
 home.insertBefore(details,economic);details.append(economic);
 const reveal=id=>{
  const node=$(id);if(!node)return;
  details.open=true;
  for(let p=node.parentElement;p&&p!==home;p=p.parentElement)
   if(p.tagName==='DETAILS')p.open=true;
  node.scrollIntoView({behavior:'smooth',block:'start'});
 };
 const command=el('section','rc-command');command.id='realityHomeCommand';
 command.setAttribute('aria-label','Reality home command center');
 const layout=el('div','rc-layout'),rail=el('nav','rc-rail'),stage=el('div','rc-stage');
 rail.setAttribute('aria-label','Reality sections');layout.append(rail,stage);command.append(layout);
 function item(title,path,symbol,target){
  const n=path?a('',path,'rc-nav-item'):el('button','rc-nav-item');
  if(!path){n.type='button';n.addEventListener('click',()=>reveal(target));}
  if(path==='/')n.setAttribute('aria-current','page');
  n.append(el('span','rc-nav-icon',symbol),el('span','',title));return n;
 }
 for(const [title,path,sym,target] of [
  ['Home','/','⌂'],['Chat','/chat','▤'],
  ['Employees','/employees','♧'],
  ['Work',null,'▣','realityHomeWorkday'],
  ['Shifts',null,'▦','realityEmployeeShiftPlanner'],
  ['ROI & Drift','/value','▥'],['Receipts','/value','✓']
 ])rail.append(item(title,path,sym,target));
 const hero=el('header','rc-hero'),copy=el('div','rc-hero-copy');
 copy.append(el('p','rc-eyebrow','REALITY · PERSONAL OPERATIONAL INTELLIGENCE'));
 const title=el('h2','rc-hero-title','Your Business Reality. Organized.');
 copy.append(title,el('p','rc-hero-intro',
  'Reality finds source-backed opportunities, organizes AI roles, and keeps approval and independent proof separate.'));
 const assurances=el('div','rc-assurances');
 for(const text of ['Source-backed discovery','Governed review','Independent receipts'])
  assurances.append(el('span','',text));
 copy.append(assurances);
 // The owner can manually refresh source discovery without navigating
 // the older Work Center controls. The action uses the existing GET-only
 // reader, NOT new job authorization, shift creation or installation.
 const heroActions=el('div','rc-home-work-actions');
 const findWorkNow=el('button','rc-outline rc-home-find-work','Find work');
 findWorkNow.type='button';
 const findWorkNote=el('p','rc-hero-foot',
  'Manual refresh uses existing read-only discovery. This does not fill or authorize the employee schedule.');
 findWorkNow.addEventListener('click',()=>{
  const existing=$('findWork');
  if(!existing){
   findWorkNote.textContent='Work discovery is unavailable here. No job was dispatched.';
   return;
  }
  reveal('findWork');
  if(existing.disabled){
   findWorkNote.textContent='Discovery is already running. No duplicate request sent.';
   return;
  }
  findWorkNote.textContent='Refreshing source observations in the existing Work Center. No shift is authorized or started.';
  existing.click();
 });
 heroActions.append(findWorkNow,findWorkNote);
 copy.append(heroActions);
 hero.append(copy);stage.append(hero);
 const stats=el('div','rc-stats'),metrics={};
 stats.setAttribute('aria-label','Operational evidence states');
 for(const [key,label,note] of [
  ['found','Work discovered','Observations · not proven jobs'],
  ['scheduled','Scheduled','Approved work only'],
  ['ready','Ready to run','Requires qualified authorization'],
  ['active','In progress','Live owner-scoped readback'],
  ['verified','Verified completions','Independent final receipts']
 ]){
  const card=el('article','rc-stat rc-'+key);
  card.append(el('span','rc-stat-label',label));
  const value=el('strong','rc-stat-value','—'),caption=el('small','rc-stat-caption',note);
  card.append(value,caption);stats.append(card);metrics[key]={value,caption};
 }
 stage.append(stats);
 const main=el('div','rc-main-grid');
 const people=el('section','rc-workforce');
 people.append(head('AI WORKFORCE · OWNER-SCOPED ROLES','Your AI workforce'));
 const discoverySummary=el('p','rc-discovery-summary',
  'Checking source-backed discovery across all eight roles…');
 people.append(discoverySummary);
 const capacity=el('p','rc-capacity',
  'Workload is evaluated against a hypothetical 40-hour-per-role reference, not actual scheduled employee hours.');
 const weekly=el('section','rc-weekly');
 weekly.id='realityHomeWeeklyWorkload';
 weekly.setAttribute('aria-label','Next week provisional workload allocation');
 const weeklyTitle=el('h3','rc-weekly-title','Next week · workload coverage');
 const weeklyStatus=el('p','rc-weekly-status',
  'Checking the existing owner-scoped Monday–Friday plan…');
 const weeklyTotals=el('div','rc-weekly-totals');
 const nasaBox=el('section','rc-nasa-reference');
 nasaBox.hidden=true;
 const weeklyRows=el('div','rc-weekly-rows');
 const weeklyFoot=el('details','rc-weekly-method');
 weeklyFoot.append(el('summary','','How workload hours are calculated'),
  el('p','rc-weekly-foot',
   'These bars use source-backed provisional review timeboxes and a hypothetical 40-hour comparison per source-bearing role. They are not approved schedules, completed automation, missing customer jobs, or verified financial savings.'));
 const discuss=a('Ask Reality to assess this workweek gap','/chat#weekly-workload','rc-text-link rc-weekly-chat');
 weekly.append(weeklyTitle,weeklyStatus,weeklyTotals,weeklyRows,nasaBox,weeklyFoot,discuss);
 const directory=el('details','rc-role-directory');
 directory.append(el('summary','','Explore all employee profiles, responsibilities & source jobs'),team);
 people.append(capacity,weekly,directory);
 const today=el('section','rc-today');
 today.append(head('GOVERNED SHIFT · CURRENT EVIDENCE','Today’s work'));
 today.append(el('strong','rc-today-label','Current shift'));
 const live=el('p','rc-live','Checking authenticated shift status…');
 today.append(live,el('strong','rc-today-label','What’s next'));
 const next=el('p','rc-next','Next step awaiting source readback.');
 today.append(next);
 const viewShift=a('View current shift details','/shifts','rc-outline');
 today.append(viewShift);
 main.append(people,today);stage.append(main);
 const impact=el('div','rc-impacts'),roi=el('section','rc-impact'),drift=el('section','rc-impact');
 roi.append(head('REAL ROI · VERIFIED OUTCOMES','Measured business value'));
 const cash=el('strong','rc-cash','Not established');
 const labor=el('p','rc-impact-detail','Net capacity returned: Not measured');
 roi.append(cash,labor,el('p','rc-impact-note',
  'Technical settlement is not measured labor or cash savings.'));
 roi.append(a('Review source evidence','/value','rc-text-link'));
 drift.append(head('LLM DRIFT · EVIDENCE REQUIRED','Drift control'),
  el('strong','rc-drift','Not verified'),
  el('p','rc-impact-detail','No owner-scoped before/after drift reduction is certified here.'),
  a('Review verification','/value','rc-text-link'));
 impact.append(roi,drift);stage.append(impact);
 const queue=el('section','rc-queue');
 queue.append(head('TOP SOURCE SIGNALS · UNQUALIFIED','Work Reality has found'));
 const queueStatus=el('p','rc-queue-status','Checking existing source evidence…');
 const queueRows=el('div','rc-queue-rows');
 const workLink=a('Open source evidence & work planning','#realityHomeWorkday','rc-text-link');
 workLink.addEventListener('click',event=>{event.preventDefault();reveal('realityHomeWorkday');});
 queue.append(queueStatus,queueRows,workLink);stage.append(queue);
 const bottom=el('div','rc-pillars');
 for(const [x,y] of [
  ['Discover work','Source-linked'],
  ['AI employees','Organized roles'],
  ['Governed execution','Exact approval'],
  ['Independent proof','Signed receipts'],
  ['Measured value','No invented ROI']
 ]){
  const z=el('div','');z.append(el('strong','',x),el('span','',y));bottom.append(z);
 }
 stage.append(bottom);
 home.insertBefore(command,details);
 const mobile=el('nav','rc-mobile-nav');
 mobile.setAttribute('aria-label','Reality mobile navigation');
 for(const [label,path,sym,target] of [
  ['Home','/','⌂'],['Employees','/employees','♧'],
  ['Work',null,'▣','realityHomeWorkday'],['ROI','/value','▥'],['Chat','/chat','▤']
 ])mobile.append(item(label,path,sym,target));
 document.body.append(mobile);
 document.body.classList.add('reality-home-command-ready');
 const auth=$('privateReady'),econStatus=$('realityEconomicStatus'),signals=$('realityEconSignals'),
  signalNote=$('realityEconSignalsNote'),receipts=$('realityEconReceipts'),
  money=$('realityEconCash'),hours=$('realityEconCapacity'),
  shiftNow=$('realityShiftHomeNow'),shiftNext=$('realityShiftHomeNext'),
  plan=$('realityEmployeeShiftStatus'),teamStatus=$('realityHomeEmployeesStatus'),
  sourceStatus=$('simpleWorkdayStatus'),sourceList=$('simpleWorkdayCandidates');
 const signed=()=>auth?.style.display==='block';
 let weeklyInsight=null;
 let authWasSignedIn=null;
 const h=x=>Number.isInteger(x)?String(x):String(x).replace(/\\.0$/,'');
 function showWeekly(){
  weeklyTotals.replaceChildren();
  weeklyRows.replaceChildren();
  nasaBox.replaceChildren();nasaBox.hidden=true;
  const info=weeklyInsight;
  if(!signed()||info?.version!=='reality-weekly-workload-insight-v1'||
   info.status!=='PROVISIONAL_REVIEW_COVERAGE_GAP_NOT_VERIFIED_EMPLOYEE_SCHEDULE'||
   info.read_only!==true||info.execution_authorized!==false||
   info.installation_authorized!==false||info.production_changed!==false||
   info.comparison_is_not_actual_schedule!==true||
   info.remaining_reference_hours_are_not_verified_missing_customer_jobs!==true||
   !Array.isArray(info.roles)||info.roles.length!==info.role_count||
   !Number.isSafeInteger(info.source_work_role_count)||
   info.source_work_role_count<0||
   info.source_work_role_count>info.role_count||
   info.roles_without_source_work_count!==info.role_count-info.source_work_role_count||
   info.source_work_comparison_available!==(info.source_work_role_count>0)||
   info.source_work_roles_hypothetical_reference_hours!==info.source_work_role_count*40||
   !Number.isFinite(info.source_work_roles_provisional_hours)||
   !Number.isFinite(info.source_work_roles_unallocated_reference_hours)){
   weeklyStatus.textContent=signed()?
    'Weekly source readback unavailable. No coverage or missing work inferred.':
    'Sign in to inspect the source-backed proposed workweek.';
   weeklyRows.append(el('p','rc-weekly-unknown',
    'No weekly allocation is verified for display.'));
   return;
  }
  weeklyStatus.textContent='Week of '+info.week_start+' through '+info.week_end+
   ' · '+info.source_work_role_count+' roles with source-backed proposed work · '+
   info.roles_without_source_work_count+' other roles not counted as missing work.';
  const nasa=info.nasa_bls_repair_comparator;
  const hasNasa=nasa?.evidence_status===
    'PUBLISHED_HUMAN_REPAIR_COMPARATOR_NOT_A_REALITY_JOB_ESTIMATE'&&
   nasa.source_scope==='SINGLE_NASA_MISSION_SOFTWARE_FAULT_REPAIR_ONLY'&&
   nasa.investigation_median_hours===2&&nasa.implementation_median_hours===3&&
   nasa.sum_of_separate_medians_hours===5&&
   nasa.sum_of_medians_not_median_total===true&&
   nasa.bls_national_median_hourly_wage_usd===65.38&&
   nasa.bls_observation_period==='2025-05'&&
   nasa.illustrative_gross_wage_equivalent_usd_per_confirmed_comparable_repair===326.9&&
   nasa.nasa_study_url==='https://ntrs.nasa.gov/api/citations/20160008693/downloads/20160008693.pdf'&&
   nasa.bls_wage_source_url==='https://www.bls.gov/news.release/ocwage.t01.htm'&&
   Number.isSafeInteger(nasa.source_review_candidates_needing_fault_validation)&&
   nasa.source_review_candidates_needing_fault_validation>0&&
   nasa.source_review_candidates_needing_fault_validation<=info.source_finding_count&&
   info.roles.reduce((n,role)=>n+(role.nasa_fault_candidates_needing_validation||0),0)===
    nasa.source_review_candidates_needing_fault_validation&&
   nasa.verified_comparable_repairs_from_this_plan===0&&
   nasa.counted_as_weekly_proposed_review_hours===false&&
   nasa.forecast_human_effort_hours===null&&
   nasa.measured_human_hours_saved===null&&
   nasa.verified_cash_savings_usd===null&&
   nasa.source_benchmark_does_not_authorize_execution===true;
  if(hasNasa){
   nasaBox.hidden=false;
   nasaBox.append(
    el('strong','rc-nasa-heading','Published human repair benchmark · NASA + BLS'),
    el('p','rc-nasa-metrics',
     '2 h median fault investigation + 3 h median fix implementation · '+
     '$65.38/h BLS national developer median wage (May 2025).'),
    el('p','rc-nasa-foot',
     nasa.source_review_candidates_needing_fault_validation+' source issue(s) may warrant software-fault validation. '+
     'For one independently confirmed comparable repair, the sum of the two NASA-study medians is '+
     '5 h, or $326.90 gross wage equivalent. This is NOT scheduled AI work, a per-issue duration forecast, '+
     'verified hours saved, or realized ROI.'),
    a('NASA-hosted 2017 study',nasa.nasa_study_url,'rc-nasa-link'),
    a('BLS occupational wage source',nasa.bls_wage_source_url,'rc-nasa-link'),
    a('Evaluation & evidence','/value#potential','rc-nasa-link'));
  }
  const allocated=el('div','rc-weekly-total');
  allocated.append(el('span','','Proposed review · source-bearing roles'),
   el('strong','',info.source_work_comparison_available?
    h(info.source_work_roles_provisional_hours)+' / '+
    h(info.source_work_roles_hypothetical_reference_hours)+' h':
    'Not yet comparable'));
  const unallocated=el('div','rc-weekly-total');
  unallocated.append(el('span','','Unallocated hypothetical comparison'),
   el('strong','',info.source_work_comparison_available?
    h(info.source_work_roles_unallocated_reference_hours)+' h':
    'Not yet comparable'));
  weeklyTotals.append(allocated,unallocated);
  // The screenshot gives the meaningful assigned work visual priority.
  // Other roles remain accessible, without presenting an empty role as a
  // missing paying-customer job or overwhelming a phone with eight rows.
  const ordered=info.roles.slice().sort((a,b)=>
   b.proposed_review_timebox_hours-a.proposed_review_timebox_hours||
   a.employee_name.localeCompare(b.employee_name));
  const featured=ordered.filter(r=>
   r.source_finding_count+r.deferred_source_count>0).slice(0,3);
  const additional=el('details','rc-weekly-more');
  const additionalRows=el('div','rc-weekly-more-rows');
  additional.append(el('summary','',
   'See all '+(ordered.length-featured.length)+' other employee roles'),
   additionalRows);
  if(!featured.length)
   weeklyRows.append(el('p','rc-weekly-unknown',
    'No employee has source-backed proposed work in this readback. Reality can investigate further sources; no executable work or missing customers inferred.'));
  for(const role of ordered){
   const article=el('article','rc-weekly-row');
   const top=el('div','rc-weekly-row-head');
   const name=el('div','rc-weekly-name');
   name.append(el('strong','',role.employee_name),
    el('small','',role.role_title));
   const amount=el('strong','rc-weekly-amount',
    h(role.proposed_review_timebox_hours)+' / '+
    h(role.hypothetical_weekly_comparison_hours)+' h');
   top.append(name,amount);
   const track=el('div','rc-weekly-track');
   track.setAttribute('role','progressbar');
   track.setAttribute('aria-label',role.employee_name+' provisional timebox relative to hypothetical 40-hour reference');
   track.setAttribute('aria-valuemin','0');
   track.setAttribute('aria-valuemax','100');
   track.setAttribute('aria-valuenow',String(role.comparison_coverage_percent));
   const fill=el('span','rc-weekly-fill');
   fill.style.width=role.comparison_coverage_percent+'%';
   track.append(fill);
   const withSources=role.source_finding_count+role.deferred_source_count>0;
   const remaining=el('p','rc-weekly-remaining',withSources?
    h(role.unallocated_hypothetical_reference_hours)+
    ' h unallocated in hypothetical comparison · '+
    role.source_finding_count+' source'+(role.source_finding_count===1?'':'s')+' for review':
    'No source-backed review work assigned to this role. No missing business work inferred.');
   const detail=el('details','rc-weekly-details');
   detail.append(el('summary','','View Monday–Friday source assignments'));
   for(const day of role.week_days){
    const dayRow=el('div','rc-weekly-day');
    dayRow.append(el('strong','',day.weekday+' · '+
     h(day.provisional_review_timebox_hours)+' h proposed review'));
    if(!day.source_findings.length){
     dayRow.append(el('p','','No source assigned for review on this day.'));
    }else for(const finding of day.source_findings){
     if(!/^https:\/\/github\.com\/maloney2323\/Reality\/(?:issues|pull|actions\/runs)\/[1-9][0-9]*$/.test(finding.source_url))
      continue;
     const source=a(finding.title,finding.source_url,'rc-weekly-source-link');
     source.target='_blank';source.rel='noopener noreferrer';
     dayRow.append(source);
    }
    detail.append(dayRow);
   }
   article.append(top,track,remaining);
   if(hasNasa&&Number.isSafeInteger(role.nasa_fault_candidates_needing_validation)&&
    role.nasa_fault_candidates_needing_validation>0)
    article.append(el('p','rc-weekly-nasa-note',
     role.nasa_fault_candidates_needing_validation+
     ' source issue(s) flagged for NASA software-fault comparison if independently validated.'));
   article.append(detail);
   if(featured.includes(role))weeklyRows.append(article);
   else additionalRows.append(article);
  }
  if(ordered.length>featured.length)weeklyRows.append(additional);
 }
 if(typeof window.addEventListener==='function')
  window.addEventListener('reality:employee-discovery-readback',event=>{
   const d=event.detail;
   if(!signed()||d?.status!=='OWNER_EMPLOYEE_DISCOVERY_SOURCE_INVENTORY'||
      d.read_only!==true||d.qualified_jobs!==0||
      d.shift_authorized!==false||d.production_changed!==false||
      !Array.isArray(d.roles)||d.roles.length!==8||
      !Array.isArray(d.items)||d.items.length>150){
    discoverySummary.textContent='Automatic employee discovery readback unavailable. No work or hours inferred.';
    return;
   }
   const current=d.roles.reduce((n,r)=>n+r.candidate_source_count,0);
   const historical=d.roles.reduce((n,r)=>n+r.historical_source_count,0);
   const settled=d.roles.reduce((n,r)=>n+r.settled_source_count,0);
   const noSource=d.roles.filter(r=>
    r.coverage_state==='NO_CONNECTED_ROLE_SOURCE_EVIDENCE').length;
   if(![current,historical,settled,noSource].every(Number.isSafeInteger)||
      current+historical+settled!==d.items.length){
    discoverySummary.textContent='Employee discovery counts unverified.';
    return;
   }
   discoverySummary.textContent='Automatic discovery · '+
    current+' current sources to investigate · '+
    historical+' historical sources need refresh · '+
    settled+' completed sources withheld · '+
    noSource+' roles need connected evidence. No jobs authorized by discovery.';
  });
 if(typeof window.addEventListener==='function')
  window.addEventListener('reality:weekly-workload-readback',event=>{
   const value=event.detail;
   // A browser event can change only presentation, never work authority.
   weeklyInsight=value?.read_only===true&&value.execution_authorized===false&&
    value.installation_authorized===false&&value.production_changed===false?
    value:null;
   showWeekly();
  });

 const econOK=()=>signed()&&/^(Read-only source check complete|Partial readback)/.test(econStatus?.textContent||'');
 const sourceOK=()=>/^(Checked connected provider sources|Partial source coverage)/.test(sourceStatus?.textContent||'');
 const intText=s=>/^(0|[1-9][0-9]*)$/.test(s||'')?s:null;
 function paint(){
  // Never retain a previous signed-in owner's planning details across
  // logout/account switch, even if a browser keeps this tab mounted.
  const isSignedIn=signed();
  if(!isSignedIn)weeklyInsight=null;
  // Changing unrelated economic/shift summaries must not collapse an
  // employee's expanded weekday assignments on mobile.
  if(isSignedIn!==authWasSignedIn){
   authWasSignedIn=isSignedIn;
   showWeekly();
  }
  const ok=econOK(),found=ok?intText(signals?.textContent?.trim()):null;
  metrics.found.value.textContent=found??'—';
  metrics.found.caption.textContent=found!==null?
   (signalNote?.textContent||'Source observations need validation'):'Owner discovery readback not verified';
  title.textContent=found!==null&&Number(found)>0?'Work Found. Your Team, Organized.':'Your Business Reality. Organized.';
  metrics.scheduled.value.textContent=signed()&&
   /^Eight-hour draft prepared/.test(plan?.textContent||'')?'Draft only':'Not verified';
  metrics.ready.value.textContent='Not verified';
  const current=shiftNow?.textContent?.trim()||'';
  const usable=signed()&&current&&!/^(Checking|Sign in|Shift status could not|Open Chat)/i.test(current);
  metrics.active.value.textContent=usable?'View status':'Not verified';
  live.textContent=usable?current:'No current owner shift readback verified.';
  next.textContent=usable?(shiftNext?.textContent||'Next step unavailable'):
   'Review the existing shift planner for available work and authority.';
  const final=ok?/^(0|[1-9][0-9]*) independently reconciled$/.exec(receipts?.textContent?.trim()||''):null;
  metrics.verified.value.textContent=final?final[1]:'Not verified';
  cash.textContent=ok?(money?.textContent?.trim()||'Not established'):'Not established';
  labor.textContent='Net capacity returned: '+
   (ok?(hours?.textContent?.trim()||'Not measured'):'Not measured');
  capacity.textContent=signed()&&teamStatus?.textContent?.includes('proposed AI roles')?
   'Eight proposed roles organized. Scheduled hours and available capacity are not independently measured.':
   'Role descriptions are proposals, not proof of independently running employees or scheduled hours.';
  queueRows.replaceChildren();
  if(!sourceOK()){
   queueStatus.textContent='Existing source readback not validated yet.';
   queueRows.append(el('p','rc-empty','No execution-ready work claimed.'));
   return;
  }
  const candidates=[...(sourceList?.querySelectorAll('article.simple-finding')||[])].slice(0,4);
  queueStatus.textContent='Real provider observations requiring independent validation before any execution.';
  if(!candidates.length)queueRows.append(el('p','rc-empty','No displayed observations in the checked window.'));
  for(const row of candidates){
   const foundTitle=row.querySelector('h3')?.textContent?.trim()||'Source observation';
   const href=row.querySelector('a[href]')?.href||'';
   const card=el('article','rc-queue-row'),desc=el('div','rc-queue-description');
   desc.append(el('strong','',foundTitle.slice(0,160)),
    el('small','','Needs validation · Not an authorized job'));
   card.append(desc,el('span','rc-queue-tag','Review'));
   if(/^https:\/\/github\.com\/maloney2323\/Reality\/(issues|pull|actions\/runs)\/[1-9][0-9]*$/.test(href))
    card.append(a('Source',href,'rc-source-link'));
   queueRows.append(card);
  }
 }
 const observer=new MutationObserver(paint);
 for(const n of [econStatus,signals,signalNote,receipts,money,hours,
   shiftNow,shiftNext,plan,teamStatus,sourceStatus,sourceList].filter(Boolean))
  observer.observe(n,{childList:true,characterData:true,subtree:true});
 if(auth)observer.observe(auth,{attributes:true,attributeFilter:['style']});
 paint();
})();
