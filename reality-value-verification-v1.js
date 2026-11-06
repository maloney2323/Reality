/* Value Verification is an evidence view, not a second ledger.
   Reuse the exact source-owned nodes; never duplicate IDs, approvals,
   installed capability claims, or fabricate cost/labor observations. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const page=$('realityValueVerification');
if(!page||document.body?.dataset?.realityRoute!=='value')return;
page.hidden=false;
function relocate(source,target){
 const original=source.startsWith('#')?$(source.slice(1)):document.querySelector(source);
 const destination=$(target);
 if(!original||!destination)throw Error('VALUE_SOURCE_NODE_UNAVAILABLE');
 destination.appendChild(original);
 if(original.tagName==='DETAILS')original.open=false; // Detailed source records are an explicit user drill-down.
 return original;
}
try{
 relocate('#realityHomeCategories','rvCategories');
 relocate('#realityPublishedRepairEvidence','rvPublishedSource');
 relocate('#realityHomePlanning','rvPotentialPlanning');
 relocate('.reality-home-proof','rvReceiptEvidence');
 relocate('#realityHomeFinance','rvMeasuredInputs');
}catch{
 $('rvSourceStatus').textContent=
  'A source evidence panel could not be loaded. Some details are unavailable; no savings inferred.';
}
// The published cards are rendered by the existing authenticated evidence
// functions. This page mirrors only their current text, not its own estimates.
const sources=[
 ['realityEconSignals','rvSignals'],
 ['realityEconSettled','rvSettled'],
 ['realityEconReceipts','rvReceipts'],
 ['realityEconCapacity','rvCapacity']
];
const NOT_READY=new Set(['','—','Unverified','Checking…','Loading','Checking']);
function strictCount(text){
 const value=String(text||'').trim();
 return /^(?:0|[1-9][0-9]{0,6})$/.test(value)?value:null;
}
function copyEvidence(source,target){
 const text=$(source)?.textContent?.trim()||'';
 $(target).textContent=text&&!NOT_READY.has(text)?text:'Not verified';
}
function update(){
 for(const [source,target] of sources)copyEvidence(source,target);
 const isSignedIn=$('privateReady')?.style?.display==='block';
 const ownerText=$('realityCategoryOwnerStatus')?.textContent||'';
 // These owner-only values come from the existing category readbacks.
 // An owner status message can use either the old or current wording.
 const findings=isSignedIn?(strictCount($('realityCategoryOwnerCount')?.textContent)||
  /\b([0-9]{1,5})\s+(?:tracked|saved current owner intake record)/i.exec(ownerText)?.[1]):null;
 const candidates=isSignedIn?(strictCount($('realityCategoryVerifiedRepairs')?.textContent)||
  /\b([0-9]{1,5})\s+(?:verified implementation defect|independently tested existing-code repair)/i.exec(ownerText)?.[1]):null;
 $('rvFindings').textContent=findings||'Not verified';
 $('rvCandidates').textContent=candidates||'Not verified';
 const observations=strictCount($('realityEconSignals')?.textContent);
 const sourceReceiptText=String($('realityEconReceipts')?.textContent||'').trim();
 const receipts=strictCount(sourceReceiptText)||
  /^([1-9][0-9]{0,6}) independently reconciled$/.exec(sourceReceiptText)?.[1]||null;
 const settled=strictCount($('realityEconSettled')?.textContent);
 const authenticatedEvidence=isSignedIn&&!!receipts&&!!settled;
 // Mirror only current source-backed evidence; never infer or add gross dollar scenarios.
 const trustedText=(id,pattern)=> {
  const value=String($(id)?.textContent||'').trim();
  return isSignedIn&&value.length<=75&&pattern.test(value)?value:null;
 };
 const financialRange=/^\$[0-9,]+(?:\.[0-9]{2})?\s*[–-]\s*\$[0-9,]+(?:\.[0-9]{2})?$/;
 const hourRange=/^[0-9,]+(?:\.[0-9]{1,2})?\s*[–-]\s*[0-9,]+(?:\.[0-9]{1,2})?\s*hrs?$/i;
 const reviewWhatIf=trustedText('realityCategoryReviewValue',financialRange);
 const issueWhatIf=trustedText('realityAutoBacklogDollars',financialRange);
 const assumedHours=trustedText('realityAutoBacklogHours',hourRange);
 const modeledIssues=trustedText('realityAutoBacklogCount',/^(?:0|[1-9][0-9]{0,5})$/);
 const baselineText=String($('realityAutoBacklogCalibrated')?.textContent||'').trim();
 const modeledBaseline=/^0 accepted baselines$/i.test(baselineText)?'0 accepted task baselines':'no independently calibrated task count confirmed';
 // This receipt count is extracted from the original source, not from a pre-rendered badge.
 const finalizedReceipts=receipts||null;
 const present=(id,value,fallback='Not verified')=>{
  const node=$(id);if(node)node.textContent=value||fallback;
 };
 // A PRE-automation brief mirrors existing source readbacks. No claim of
 // accepted jobs, actual avoided effort, or probable company savings.
 present('rvPreShiftPotential',isSignedIn&&observations?
  observations+' observations available to investigate':
  'Source-backed opportunity scope is not yet verified',
  'Source-backed opportunity scope is not yet verified');
 present('rvPreShiftReviewValue',reviewWhatIf,'Not available');
 present('rvPreShiftIssueHours',assumedHours,'Not available');
 present('rvPreShiftNarrative',isSignedIn&&observations?
  'Reality has identified work signals'+
  (findings?' and '+findings+' separately recorded owner capability findings':'')+
  (candidates?', including '+candidates+' tested repair candidate(s)':'')+
  '. These records can overlap. No missing capabilities, projected cost savings, or human hours saved are inferred from this inventory.':
  'Sign in to inspect source-backed work signals. Automation is not required to see discovery evidence.');
 present('rvOverviewSignals',isSignedIn?observations:null);
 present('rvOverviewReviewWhatIf',reviewWhatIf,'Not available');
 present('rvOverviewReceipts',isSignedIn?finalizedReceipts:null);
 present('rvOpportunitySignals',isSignedIn?observations:null);
 present('rvOpportunityFindings',findings);
 present('rvOpportunityCandidates',candidates);
 present('rvPotentialReviewValue',reviewWhatIf,'Not available');
 present('rvPotentialIssueValue',issueWhatIf,'Not available');
 present('rvPotentialHours',assumedHours,'Not available');
 present('rvPotentialCoverage',modeledIssues&&isSignedIn?
  modeledIssues+' source-linked open issue(s) modeled · '+modeledBaseline+'. Assumptions only, not a commitment to execute.':
  'Open-issue scenario is unavailable until its source-backed model loads.');
 present('rvResultsSettled',isSignedIn?settled:null);
 present('rvResultsReceipts',isSignedIn?finalizedReceipts:null);
 present('rvResultsHours',isSignedIn?$('realityEconCapacity')?.textContent?.trim():null,'Not measured');
 present('rvResultsMeaning',isSignedIn&&settled&&finalizedReceipts?
  settled+' original-job settlement(s) recorded in isolation; '+finalizedReceipts+
  ' independently reconciled final receipt(s). These totals are not necessarily the same jobs, and no verified human labor reduction has been established.':
  'Owner-scoped original-job results are not yet independently available.');
 present('rvGovernanceSignals',isSignedIn?observations:null);
 present('rvGovernanceCandidates',candidates);
 present('rvGovernanceReceipts',isSignedIn?finalizedReceipts:null);
 // KPI remains compact on phones; the verified status is in its own label.
 present('rvReceipts',isSignedIn?finalizedReceipts:null);
 $('rvSourceStatus').textContent=authenticatedEvidence?
  'Evidence verified for this view · '+(observations||'Unverified')+
   ' signals · '+settled+' isolated settlements · '+receipts+
   ' final receipts. Cash savings not measured.':
  isSignedIn?'Evidence still loading or incomplete. Unknown values remain unverified.':
  'Read-only evidence · Sign in for owner-protected results.';
}
// One focused evidence section is visible at a time; original source nodes
// remain mounted and continue receiving authenticated readback updates.
const VIEWS=[
 ['overview','rvTabOverview','rvPanelOverview'],
 ['opportunities','rvTabOpportunities','rvPanelOpportunities'],
 ['potential','rvTabPotential','rvPanelPotential'],
 ['results','rvTabResults','rvPanelResults'],
 ['governance','rvTabGovernance','rvPanelGovernance']
];
function selectView(view,{focus=false}={}){
 if(!VIEWS.some(([name])=>name===view))return false;
 for(const [name,tabId,panelId] of VIEWS){
  const tab=$(tabId),panel=$(panelId),selected=name===view;
  if(tab){
   tab.setAttribute('aria-selected',String(selected));
   tab.tabIndex=selected?0:-1;
  }
  if(panel)panel.hidden=!selected;
 }
 const active=VIEWS.find(([name])=>name===view);
 const tab=$(active[1]);
 if(focus&&tab?.focus)tab.focus({preventScroll:true});
 return true;
}
for(let i=0;i<VIEWS.length;i++){
 const [view,tabId]=VIEWS[i],tab=$(tabId);
 if(!tab?.addEventListener)continue;
 tab.addEventListener('click',()=>selectView(view));
 tab.addEventListener('keydown',event=>{
  let next=null;
  if(event.key==='ArrowRight')next=(i+1)%VIEWS.length;
  else if(event.key==='ArrowLeft')next=(i+VIEWS.length-1)%VIEWS.length;
  else if(event.key==='Home')next=0;
  else if(event.key==='End')next=VIEWS.length-1;
  if(next===null)return;
  event.preventDefault();
  selectView(VIEWS[next][0],{focus:true});
 });
}
if(typeof document.querySelectorAll==='function')
 for(const shortcut of document.querySelectorAll('#realityValueVerification [data-rv-show]')){
  shortcut.addEventListener('click',()=>{
   const target=shortcut.getAttribute('data-rv-show');
   if(selectView(target,{focus:true}))
    $('rvViewNav')?.scrollIntoView?.({block:'nearest',behavior:'smooth'});
  });
 }
selectView('overview');

const watched=['realityEconSignals','realityEconSettled','realityEconReceipts',
 'realityEconCapacity','privateReady','realityCategoryOwnerStatus',
 'realityCategoryOwnerCount','realityCategoryVerifiedRepairs',
 'realityCategoryReviewValue','realityAutoBacklogDollars',
 'realityAutoBacklogHours','realityAutoBacklogCount','realityAutoBacklogCalibrated'];
let queued=false;
function schedule(){
 if(queued)return;queued=true;
 Promise.resolve().then(()=>{queued=false;update()});
}
if(typeof MutationObserver==='function'){
 const observer=new MutationObserver(schedule);
 for(const id of watched){
  const node=$(id);
  if(node)observer.observe(node,{childList:true,characterData:true,
   subtree:true,attributes:id==='privateReady',attributeFilter:id==='privateReady'?['style']:undefined});
 }
 if(typeof window.addEventListener==='function')
  window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
}
update();
})();