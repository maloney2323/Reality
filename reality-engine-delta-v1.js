// Engine Delta: Reality's intelligence/control-plane distinction backed by
// existing owner-authenticated read-only evidence, not generic LLM comparisons.
// All technical and economic claims remain evidence-bound. No execution,
// approvals, installation, telemetry fabrication or financial estimates.
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const root=$('realityEngineDelta'),auth=$('privateReady');
 const status=$('realityEngineDeltaStatus');
 const linkSlot=$('realityEngineReceiptLink');
 if(!root||!auth||!status||!linkSlot)return;
 const WORK=/^work:[a-f0-9]{32}$/;
 const HASH=/^[a-f0-9]{64}$/;
 const SHA256=/^sha256:[a-f0-9]{64}$/;
 const safeInt=n=>Number.isSafeInteger(n)&&n>=0;
 const signed=()=>auth.style.display==='block';
 const set=(id,value)=>{const n=$(id);if(n)n.textContent=value;};
 let epoch=0;
 const reset=(message)=>{
  ++epoch;
  for(const id of ['realityEngineSignals','realityEngineOwnerFindings',
   'realityEngineTestedRepairs','realityEngineFinalReceipts'])set(id,'—');
  set('realityEngineSignalsNote','Provider observations · not verified defects');
  set('realityEngineDeltaProofNote',
   'Evidence links appear after verified readback.');
  linkSlot.replaceChildren();
  status.textContent=message;
 };
 const validDiscovery=d=>{
  const c=d?.counts;
  return d?.ok===true&&d.read_only===true&&
   d.source_scope==='REALITY_GITHUB_REPOSITORY_ONLY'&&
   d.phase==='DISCOVERY_AND_PRIORITIZATION_ONLY_NOT_AN_EXECUTED_WORKDAY'&&
   d.evidence_status==='SOURCE_BACKED_OBSERVATIONS_NOT_INDEPENDENTLY_CONFIRMED_DEFECTS'&&
   ['SOURCE_BACKED_DISCOVERY_OBSERVED',
    'SOURCE_BACKED_DISCOVERY_PARTIAL'].includes(d.status)&&
   d.job_started===false&&d.installation_authorized===false&&
   d.production_changed===false&&d.shift_completed===false&&
   safeInt(c?.source_backed_opportunities)&&safeInt(c?.open_issues)&&
   safeInt(c?.open_pull_requests)&&safeInt(c?.historical_failure_signals)&&
   c.source_backed_opportunities===c.open_issues+
    c.open_pull_requests+c.historical_failure_signals&&
   c.verified_current_defects===0&&
   c.completed_customer_jobs_from_this_report===0&&
   d.value_measurement?.financial_roi_verified===false&&
   d.value_measurement?.verified_cash_savings_usd===null&&
   Array.isArray(d.items)&&d.items.length<=25&&
   d.items.length<=c.source_backed_opportunities&&
   d.items.every(x=>x.verified_current_defect===false&&
    x.authorized_execution===false);
 };
 const validOwner=d=>{
  if(d?.ok!==true||d.status!=='OWNER_GAP_INTAKE_RECONCILED'||
   d.source_basis!=='PERSISTED_OWNER_EVIDENCE_NO_PROVIDER_LIVE_REFRESH'||
   d.read_only!==true||d.installation_authorized!==false||
   d.work_started!==false||d.production_changed!==false||
   !safeInt(d.counts?.current_candidates)||
   !safeInt(d.counts?.verified_current_gaps)||
   !safeInt(d.counts?.verified_implementation_defects)||
   !safeInt(d.counts?.independently_tested_research_repairs)||
   d.counts.verified_implementation_defects!==
    d.counts.independently_tested_research_repairs||
   !Array.isArray(d.items)||d.items.length>30||
   d.items.length!==d.counts.current_candidates||
   d.counts.verified_current_gaps!==
    d.items.filter(x=>x.verified_missing_capability===true).length||
   d.counts.verified_implementation_defects!==
    d.items.filter(x=>
     x.repair_proof?.status==='FROZEN_RED_TO_GREEN_CANDIDATE_VERIFIED').length||
   new Set(d.items.map(x=>x.key)).size!==d.items.length)return false;
  return d.items.every(item=>
   /^(?:research|ci|candidate|queue):[a-f0-9-]{32,64}$/.test(String(item.key||''))&&
   item.installation_authorized===false&&
   item.executable_job===false&&
   typeof item.verified_missing_capability==='boolean'&&
   (!item.repair_proof||
    (item.kind==='RESEARCH_OPPORTUNITY'&&
     item.repair_proof.status==='FROZEN_RED_TO_GREEN_CANDIDATE_VERIFIED'&&
     item.repair_proof.proof_kind==='EXISTING_CAPABILITY_IMPLEMENTATION_DEFECT'&&
     item.repair_proof.owner_install_authorized===false&&
     item.repair_proof.installed===false&&
     item.repair_proof.fresh_original_work_verified===false)));
 };
 const validLoop=d=>
  d?.ok===true&&d.status==='OWNER_GOVERNED_LOOP_READBACK'&&
  d.owner_installation_authorized_by_read===false&&
  d.external_action_performed===false&&
  d.production_changed===false&&
  d.full_loop_proof_not_inferred_from_settlement===true&&
  Array.isArray(d.jobs)&&d.jobs.length<=12&&
  Array.isArray(d.independent_final_receipts)&&
  d.independent_final_receipts.length<=12&&
  new Set(d.jobs.map(j=>j.original_work_id)).size===d.jobs.length&&
  d.jobs.every(j=>WORK.test(j?.original_work_id)&&
   typeof j.independently_settled==='boolean'&&
   typeof j.universe_settlement_verified==='boolean'&&
   typeof j.full_loop_independently_verified==='boolean')&&
  d.independent_final_receipts.every(r=>
   r.status==='FULL_LOOP_INDEPENDENTLY_VERIFIED'&&
   WORK.test(r.original_work_id)&&r.production_changed===false&&
   HASH.test(String(r.artifact_sha256||''))&&
   SHA256.test(String(r.verifier_artifact_digest||'')));
 function reconcileReceipts(loop){
  const jobs=new Map(loop.jobs.map(j=>[j.original_work_id,j]));
  const proof=new Map();
  for(const receipt of loop.independent_final_receipts){
   const job=jobs.get(receipt.original_work_id);
   if(job?.independently_settled===true&&
    job.universe_settlement_verified===true&&
    job.full_loop_independently_verified===true)
    proof.set(receipt.original_work_id,receipt);
  }
  return proof;
 }
 async function read(url){
  const response=await fetch(url,{
   method:'GET',cache:'no-store',credentials:'same-origin'
  });
  if(!response.ok)throw Error('OWNER_READ_UNAVAILABLE');
  const data=await response.json();
  if(data?.ok!==true)throw Error('OWNER_READ_NOT_VERIFIED');
  return data;
 }
 async function load(){
  if(!signed()){
   reset('Sign in to compare foundation intelligence with Reality\'s independently evidenced work.');
   return;
  }
  const token=++epoch;
  status.textContent='Reading discovery, owner capability, and independent original-job proof…';
  const responses=await Promise.allSettled([
   read('/api/reality/workday-opportunities'),
   read('/api/reality/personal-gap-intake'),
   read('/api/reality/personal-genuine-loop-status')
  ]);
  if(token!==epoch||!signed())return;
  // A failed source remains Unknown; never infer zero or convert a test
  // artifact into evidence of customer savings or general production readiness.
  reset('Checking source integrity…');
  const discovery=responses[0].status==='fulfilled'&&validDiscovery(responses[0].value)?
   responses[0].value:null;
  const owner=responses[1].status==='fulfilled'&&validOwner(responses[1].value)?
   responses[1].value:null;
  const loop=responses[2].status==='fulfilled'&&validLoop(responses[2].value)?
   responses[2].value:null;
  if(discovery){
   set('realityEngineSignals',String(discovery.counts.source_backed_opportunities));
   set('realityEngineSignalsNote',
    discovery.status==='SOURCE_BACKED_DISCOVERY_PARTIAL'?
     'Partial source coverage · not verified defects':
     'Provider observations · not verified defects');
  }
  if(owner){
   set('realityEngineOwnerFindings',String(owner.counts.current_candidates));
   set('realityEngineTestedRepairs',String(owner.counts.verified_implementation_defects));
  }
  if(loop){
   const receipts=reconcileReceipts(loop);
   set('realityEngineFinalReceipts',String(receipts.size));
   if(receipts.size){
    const workId=receipts.keys().next().value;
    const link=document.createElement('a');
    link.href='/api/reality/personal-genuine-final-receipt-pdf?work_id='+
     encodeURIComponent(workId);
    link.target='_blank';
    link.rel='noopener noreferrer';
    link.textContent='Open an independently verified final receipt';
    linkSlot.append(link);
    set('realityEngineDeltaProofNote',
     'Independent final-loop receipts match exact original jobs in the isolated ledger. This is not a claim of production-wide readiness.');
   }else set('realityEngineDeltaProofNote',
    'No exact matching final-loop receipt in the current owner readback; completion is not inferred from ledger phase.');
  }
  const checked=[discovery,owner,loop].filter(Boolean).length;
  status.textContent=checked===3?
   '3/3 owner-scoped evidence sources validated · No work started · No installation authorized.':
   checked?
    checked+'/3 sources validated · Missing evidence remains unknown, not zero.':
    'Evidence readback unavailable · Nothing presented as verified operational results.';
 }
 if(typeof MutationObserver==='function')new MutationObserver(()=>{
  if(!signed())reset('Sign in to inspect owner-scoped Engine Delta evidence.');
  else void load();
 }).observe(auth,{attributes:true,attributeFilter:['style']});
 if(typeof document.addEventListener==='function')
  document.addEventListener('visibilitychange',()=>{
   if(document.visibilityState==='visible'&&signed())void load();
  });
 if(typeof window!=='undefined'&&typeof window.addEventListener==='function')
  window.addEventListener('focus',()=>{if(signed())void load()});
 // Refresh only while visibly in use; never poll provider records anonymously.
 if(typeof setInterval==='function')setInterval(()=>{
  if(signed()&&
   (typeof document.visibilityState!=='string'||
    document.visibilityState==='visible'))void load();
 },180000);
 void load();
})();
