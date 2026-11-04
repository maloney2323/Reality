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
 if(original.tagName==='DETAILS')original.open=true;
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
 const findings=/\b([0-9]{1,5})\s+tracked\b/i.exec(ownerText);
 const candidates=/\b([0-9]{1,5})\s+verified implementation defect/i.exec(ownerText);
 $('rvFindings').textContent=isSignedIn&&findings?findings[1]:'Not verified';
 $('rvCandidates').textContent=isSignedIn&&candidates?candidates[1]:'Not verified';
 const observations=strictCount($('realityEconSignals')?.textContent);
 const receipts=strictCount($('realityEconReceipts')?.textContent);
 const settled=strictCount($('realityEconSettled')?.textContent);
 const authenticatedEvidence=isSignedIn&&!!receipts&&!!settled;
 $('rvSourceStatus').textContent=authenticatedEvidence?
  'Owner evidence received. '+(observations||'Unverified')+
   ' source-backed observations; '+settled+' isolated settlements and '+
   receipts+' independently verified final receipts. No cash savings inferred.':
  isSignedIn?'Evidence still loading or incomplete. Unknown values remain unverified.':
  'Source observations are read-only. Sign in to see owner-protected jobs, receipts, and economic evidence.';
}
const watched=['realityEconSignals','realityEconSettled','realityEconReceipts',
 'realityEconCapacity','privateReady','realityCategoryOwnerStatus'];
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