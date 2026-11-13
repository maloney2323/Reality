// Cross-type final-receipt projection for an already-authorized employee
// shift. Read only. New native and PR originals coexist with the older Universe
// original-claim ledger; an empty legacy claims table must not erase them.
// Never claims that all selected source observations are finished, that a
// shift ended, or that human time or cash was saved.
export const REALITY_MIXED_SHIFT_RECEIPTS_VERSION='reality-mixed-shift-receipts-v1';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const WORK=/^work:[a-f0-9]{32}$/;
const DIGEST=/^sha256:[a-f0-9]{64}$/;
const ISSUE=/^https:\/\/github\.com\/maloney2323\/Reality\/issues\/[1-9]\d*$/;
const PR=/^https:\/\/github\.com\/maloney2323\/Reality\/pull\/[1-9]\d*$/;
const RECEIPT_PR=/^supabase:riley_pr_review_originals_v1:[a-f0-9-]{36}$/i;
const RECEIPT_NATIVE=/^supabase:riley_native_independent_final_receipts_v1:[a-f0-9-]{36}$/i;
const fail=x=>{throw Error('REALITY_MIXED_SHIFT_RECEIPTS_'+x)};
export function reconcileRealityMixedShiftReceipts(shift,{
 prReadback=null,repairReadback=null
}={}){
 if(!UUID.test(shift?.shift_id||'')||
  !Array.isArray(shift.steps)||shift.steps.length!==8||
  shift.steps.some((s,i)=>s?.step_index!==i+1))
  fail('EXACT_SHIFT_SOURCE_REQUIRED');
 const selected=new Map();
 for(const step of shift.steps.slice(1,5)){
  if(typeof step.source_ref!=='string'||
    !(ISSUE.test(step.source_ref)||PR.test(step.source_ref))||
    !['SOURCE_CHECKED','BLOCKED_PROVIDER'].includes(step.state)||
    selected.has(step.source_ref))
   fail('SOURCE_SCOPE_MUST_BE_FROZEN_AND_UNIQUE');
  selected.set(step.source_ref,step);
 }
 const receipts=[],seenWork=new Set(),seenSource=new Set();
 const record=(job,kind,expected)=>{
  if(seenWork.has(job.original_work_id)||seenSource.has(job.source_ref)||
     !WORK.test(job.original_work_id||'')||
     !expected.test(job.source_ref||'')||
     job.shift_id!==shift.shift_id||
     job.phase!=='SETTLED'||job.original_job_completed!==true||
     job.production_changed!==false)
   fail('DUPLICATE_OR_UNSETTLED_ORIGINAL');
  const source=selected.get(job.source_ref);
  if(!source||source.state!=='SOURCE_CHECKED'||
     !DIGEST.test(source.proof_sha256||''))
   fail('INDEPENDENT_SOURCE_PROOF_REQUIRED');
  let finalRef;
  if(kind==='NATIVE_REPAIR'){
   if(job.source_ref!=='https://github.com/maloney2323/Reality/issues/263'||
      job.source_proof_sha256!==source.proof_sha256||
      job.code_repair_completed!==true||
      !RECEIPT_NATIVE.test(job.original_settlement_receipt_ref||'')||
      !/^[a-f0-9]{40}$/.test(job.candidate_commit_sha||'')||
      !DIGEST.test(job.candidate_artifact_sha256||'')||
      !Number.isSafeInteger(job.independent_proof_run_id)||
      job.independent_proof_run_id<=0)
    fail('NATIVE_ORIGINAL_INDEPENDENT_RECEIPT_INVALID');
   finalRef=job.original_settlement_receipt_ref;
  }else{
   if(source.source_status!=='OPEN_PULL_REQUEST'||
      job.source_review_job_only!==true||
      job.source_code_repaired!==false||
      job.installation_authorized!==false||
      !RECEIPT_PR.test(job.settlement_receipt_ref||'')||
      !new RegExp('^'+job.source_ref.replace('/pull/','/(?:issues|pull)/')+
       '#issuecomment-[1-9]\\d*$').test(job.provider_comment_url||''))
    fail('PR_ORIGINAL_INDEPENDENT_RECEIPT_INVALID');
   finalRef=job.settlement_receipt_ref;
  }
  seenWork.add(job.original_work_id);seenSource.add(job.source_ref);
  receipts.push(Object.freeze({
   original_work_id:job.original_work_id,
   source_ref:job.source_ref,source_step_index:source.step_index,
   source_proof_sha256:source.proof_sha256,
   kind,final_receipt_ref:finalRef,
   independently_settled:true,
   installation_authorized_by_this_read:false,
   work_replayed_by_this_read:false,
   human_hours_saved:null,automation_cost_usd:null
  }));
 };
 if(prReadback!==null){
  if(prReadback?.status!=='OWNER_PR_REVIEW_ORIGINAL_READBACK'||
    prReadback.production_changed!==false||
    !Array.isArray(prReadback.jobs)||prReadback.jobs.length>10)
   fail('PR_OWNER_SCOPE_READBACK_UNVERIFIED');
  for(const j of prReadback.jobs){
   if(j.shift_id===shift.shift_id&&j.phase==='SETTLED')
    record(j,'PR_REVIEW',PR);
  }
 }
 if(repairReadback!==null){
  if(repairReadback?.status!=='OWNER_SCOPED_UNATTENDED_REPAIR_ORIGINAL_READBACK'||
    repairReadback.production_changed!==false||
    repairReadback.does_not_authorize_new_work!==true||
    !Array.isArray(repairReadback.jobs)||repairReadback.jobs.length>6)
   fail('NATIVE_OWNER_SCOPE_READBACK_UNVERIFIED');
  for(const j of repairReadback.jobs){
   if(j.shift_id===shift.shift_id&&j.phase==='SETTLED')
    record(j,'NATIVE_REPAIR',ISSUE);
  }
 }
 receipts.sort((a,b)=>a.source_step_index-b.source_step_index);
 const remaining=[...selected.keys()].filter(ref=>!seenSource.has(ref));
 return Object.freeze({
  version:REALITY_MIXED_SHIFT_RECEIPTS_VERSION,
  status:receipts.length?
   'SOURCE_NATIVE_RECEIPTS_VERIFIED_SHIFT_NOT_FINAL':
   'NO_SOURCE_NATIVE_FINAL_RECEIPTS_VERIFIED',
  shift_id:shift.shift_id,
  source_items_in_authorized_scope:selected.size,
  independently_settled_original_jobs:receipts.length,
  completed_original_receipts:Object.freeze(receipts),
  source_items_without_verified_final_receipt:Object.freeze(remaining),
  current_shift_complete:false,
  work_dispatched_by_projection:false,
  installation_authorized:false,
  any_new_original_created:false,
  production_changed:false,
  measured_human_hours_saved:null,
  measured_net_cash_savings_usd:null,
  read_only:true
 });
}
